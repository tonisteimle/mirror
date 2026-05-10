/**
 * Mirror React Backend
 *
 * Generates clean React/JSX code from Mirror AST.
 * Used for:
 * 1. Exporting Mirror designs to React projects
 * 2. Providing LLM context for consistent code generation
 */

import type {
  AST,
  Program,
  Instance,
  ComponentDefinition,
  Property,
  TokenDefinition,
  Each,
  LoopVarReference,
  DataAttribute,
  Conditional,
  ConditionalNode,
  Event as EventNode,
  Action,
} from '../parser/ast'
import { expandPropertySets } from '../ir/transformers/property-set-expander'
import { resolveComponent } from '../ir/transformers/component-resolver'
import { mergeSlotPropertiesIntoFiller } from '../ir/transformers/slot-utils'
import { ANIMATION_KEYFRAMES_CSS, animationShorthand } from './animations'
import { getDevicePreset } from '../schema/dsl'
import { isContainer as isContainerPrimitive } from '../schema/layout-defaults'
import { isLayoutPrimitive } from '../schema/dsl'
import { getHtmlTag as schemaGetHtmlTag, isKnownPrimitive } from '../schema/ir-helpers'
import {
  nineZoneToFlex,
  resolveNineZoneAlias,
  singleAxisCenterToFlex,
} from '../schema/layout-defaults'
import { getTokenSuffix } from '../schema/token-suffixes'

export interface ReactExportOptions {
  /** Include token values as CSS variables */
  includeTokens?: boolean
  /** Generate separate components or inline everything */
  separateComponents?: boolean
}

/**
 * Generate React component code from Mirror AST
 */
export function generateReact(ast: AST, options: ReactExportOptions = {}): string {
  const program = ast as Program
  const lines: string[] = []
  const { includeTokens = true } = options

  // Header
  lines.push(`import React from 'react'`)
  lines.push(``)

  // Generate CSS variables from tokens. Skip property-sets — they have
  // `.properties` set instead of `.value`, get expanded inline at every
  // use site, and don't need to live in the `tokens` object. Pre-fix
  // they emitted as `'cardstyle': undefined`, which is noise.
  const valueTokens = (program.tokens ?? []).filter(
    t =>
      // Keep value tokens (`name: "Max"`, `primary.bg: #2271C1`)
      t.value !== undefined ||
      // Keep data tokens (nested `attributes`)
      (t.attributes && t.attributes.length > 0)
  )
  if (includeTokens && valueTokens.length > 0) {
    lines.push(`// Design Tokens`)
    lines.push(`const tokens = {`)
    for (const token of valueTokens) {
      // Data tokens (`tasks:` block with nested entries) carry `attributes`
      // instead of a flat `value` — emit as a JS object so `each task in
      // $tasks` can iterate `Object.values(tokens.tasks)` at render time.
      if (token.attributes && token.attributes.length > 0) {
        lines.push(
          `  ${JSON.stringify(token.name)}: ${dataAttributesToJSObject(token.attributes)},`
        )
        continue
      }
      const value = typeof token.value === 'string' ? `'${token.value}'` : token.value
      lines.push(`  '${token.name}': ${value},`)
    }
    lines.push(`}`)
    lines.push(``)
  }

  // Build component lookup for resolving properties
  const componentMap = new Map<string, ComponentDefinition>()
  if (program.components) {
    for (const comp of program.components) {
      componentMap.set(comp.name, comp)
    }
  }

  // Build property-set lookup so `Frame $cardstyle`-style references can
  // expand on the React side too. Property-sets are TokenDefinitions whose
  // `.properties` is set (vs single-value tokens which carry `.value`).
  const propertySetMap = new Map<string, Property[]>()
  for (const token of program.tokens || []) {
    if (token.properties && token.properties.length > 0) {
      propertySetMap.set(token.name, token.properties)
    }
  }

  // Walk the instance tree once to find every `Element name X` — those
  // get a callback ref that registers into `_elements` so cross-element
  // state references (`MenuBtn.open: visible`) can reach the node from
  // any handler without a DOM query. Mirrors the DOM backend's
  // `_elements['X'] = node_N` registry. Slice 1 Phase B.4.
  const namedInstances = collectNamedInstances(program.instances ?? [])
  const hasNamedInstances = namedInstances.length > 0

  // Slice 50 V-2: Pre-scan for Icon usage so we know whether to emit
  // the MirrorIcon component definition. Pre-Slice-50 the React backend
  // mapped Icon → 'span' without further logic, so `Icon "check"` produced
  // `<span>{"check"}</span>` (literal text, no SVG). Now: every Icon
  // becomes `<MirrorIcon name=... />` and the MirrorIcon component is
  // emitted once at the top of the file (only when needed).
  const hasIcon = containsIconInstance(program.instances ?? [])

  // Detect any `anim X` / `animation: X` usage so we know whether to emit
  // the shared keyframes block. Mirrors the DOM backend's behavior — it
  // unconditionally emits all keyframes once per stylesheet — but for
  // React we conditionally emit only when needed to keep simple programs
  // lean.
  const hasAnimation = containsAnimUsage(program.instances ?? [])

  // Charts: gate the MirrorChart component + Chart.js CDN loader on
  // actual usage. Programs without charts stay free of the runtime.
  const hasChart = containsChartInstance(program.instances ?? [])

  // Slice 50 V-2: emit MirrorIcon helper component only when used.
  // Strategy: runtime-fetch from Lucide CDN (mirrors DOM backend's
  // `_runtime.loadIcon`). useEffect + fetch + sanitize. Same fallback
  // SVG as `compiler/runtime/icons.ts:FALLBACK_ICON` so cross-backend
  // unknown-icon behavior is identical.
  if (hasChart) {
    lines.push(MIRROR_CHART_COMPONENT)
    lines.push(``)
  }

  if (hasIcon) {
    lines.push(MIRROR_ICON_COMPONENT)
    lines.push(``)
    // Slice 51 V-1: populate the Custom-Icon-Registry baked into the
    // MirrorIcon component template. Mirrors DOM backend's
    // `_runtime.registerIcon` calls (see compiler/backends/dom/ops/emit-static.ts).
    const customIcons =
      (program as Program & { icons?: Array<{ name: string; path: string; viewBox?: string }> })
        .icons ?? []
    if (customIcons.length > 0) {
      lines.push(`// Slice 51 V-1: Custom-Icon-Registry (from $icons:)`)
      for (const icon of customIcons) {
        const escapedPath = icon.path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
        const viewBox = icon.viewBox || '0 0 24 24'
        lines.push(
          `_MIRROR_CUSTOM_ICONS[${JSON.stringify(icon.name)}] = { path: "${escapedPath}", viewBox: ${JSON.stringify(viewBox)} }`
        )
      }
      lines.push(``)
    }
  }

  // Generate main App component
  lines.push(`export default function App() {`)
  if (hasNamedInstances) {
    lines.push(`  // Mirror element registry — populated via callback refs as nodes mount.`)
    lines.push(`  // Mirrors the DOM backend's _elements lookup so cross-element state refs`)
    lines.push(`  // (e.g. \`MenuBtn.open: visible\`) work identically across both backends.`)
    lines.push(`  const _elements = React.useRef<Record<string, HTMLElement | null>>({})`)
    lines.push(``)
  }
  // Collect renderable root items first so we can decide on a Fragment
  // wrapper. A top-level `each` block expands to `{tokens.map(...)}` (a
  // naked JSX expression) — illegal as a sole `return (...)` body, and
  // multiple roots also need a wrapper.
  type RootItem = { kind: 'jsx' | 'expr' | 'comment'; code: string }
  const rootItems: RootItem[] = []

  // Pseudo-class state-rule accumulator. Populated as `generateJSX` walks
  // each instance with hover/focus/active/disabled state-blocks or shorthand
  // props; emitted as a `<style>` block at the top of `App()`.
  const stateContext: ReactStateContext = { rules: [], counter: { value: 0 } }

  // Animations: emit a single `<style>` block carrying every Mirror
  // keyframe rule when at least one descendant uses `anim`. The shared
  // CSS (`compiler/backends/animations.ts`) is the single source of truth
  // — DOM emits the same set into its stylesheet, so cross-backend
  // animation timing matches by construction.
  if (hasAnimation) {
    rootItems.push({
      kind: 'jsx',
      code: `      <style>{${JSON.stringify(ANIMATION_KEYFRAMES_CSS.join('\n'))}}</style>`,
    })
  }
  if (program.instances && program.instances.length > 0) {
    for (const instance of program.instances) {
      // Skip Slot primitives in React output (they're only for visual editor)
      if (instance.type === 'Slot') continue
      // Skip Table for now - not yet supported in React backend
      if (instance.type === 'Table') continue
      // Top-level `each task in $tasks` → emits a naked `{...}.map(...)`
      // expression; same renderer used inside Instance.children.
      if ((instance as { type: string }).type === 'Each') {
        rootItems.push({
          kind: 'expr',
          code: generateEachJSX(
            instance as unknown as Each,
            componentMap,
            program.tokens || [],
            propertySetMap,
            '      ',
            { type: null },
            stateContext
          ),
        })
        continue
      }
      // Top-level `if cond / else` → render as JSX expression. Same
      // shape used inside Instance.children.
      if ((instance as { type: string }).type === 'Conditional') {
        rootItems.push({
          kind: 'expr',
          code: generateConditionalJSX(
            instance as unknown as ConditionalNode,
            componentMap,
            program.tokens || [],
            propertySetMap,
            '      ',
            { type: null },
            stateContext
          ),
        })
        continue
      }
      // Skip ZagComponent / etc. — the static React backend supports plain
      // Instance + Each + Conditional trees. Without this guard, generateJSX
      // would try to read `.properties` on a node that doesn't have it and
      // throw TypeError.
      if ((instance as { type: string }).type !== 'Instance') {
        const skipped = (instance as { type?: string }).type ?? 'Unknown'
        rootItems.push({
          kind: 'comment',
          code: `      {/* ${skipped} not supported in React backend */}`,
        })
        continue
      }
      rootItems.push({
        kind: 'jsx',
        code: generateJSX(
          instance as Instance,
          componentMap,
          program.tokens || [],
          propertySetMap,
          rootItems.length === 0 && program.instances.length === 1 ? '    ' : '      ',
          { type: null },
          stateContext
        ),
      })
    }
  }

  // Prepend the state-rule `<style>` block as the first root item if any
  // pseudo-class rules were collected during the walk. We unshift here
  // (not when `stateContext` was created) because we need to know the
  // accumulated rules first; this also forces a Fragment wrap, which the
  // existing `needsFragment` path handles transparently.
  if (stateContext.rules.length > 0) {
    rootItems.unshift({
      kind: 'jsx',
      code: `      <style>{${JSON.stringify(stateContext.rules.join('\n'))}}</style>`,
    })
  }

  // Wrap in `<>...</>` when:
  //   - 0 items (nothing to render — emit `<div />` placeholder, no wrap)
  //   - 1 plain JSX element → no wrap (the Instance is its own root)
  //   - anything else (multi-root, top-level Each, comments) → Fragment
  const needsFragment =
    rootItems.length > 1 || (rootItems.length === 1 && rootItems[0].kind !== 'jsx')

  lines.push(`  return (`)
  if (rootItems.length === 0) {
    lines.push(`    <div />`)
  } else if (needsFragment) {
    lines.push(`    <>`)
    for (const item of rootItems) lines.push(item.code)
    lines.push(`    </>`)
  } else {
    lines.push(rootItems[0].code)
  }
  lines.push(`  )`)
  lines.push(`}`)
  lines.push(``)

  return lines.join('\n')
}

/**
 * Slice 50 V-2: Walk the instance tree to detect any `Icon` usage.
 * If none present we skip emitting the MirrorIcon component definition
 * (keeps simple Mirror programs lean).
 */
function containsIconInstance(instances: ReadonlyArray<unknown>): boolean {
  for (const inst of instances) {
    const node = inst as { type?: string; component?: string; children?: unknown[] }
    if (node.type === 'Instance' && node.component === 'Icon') return true
    if (node.children && containsIconInstance(node.children)) return true
  }
  return false
}

const CHART_PRIMITIVE_NAMES: ReadonlySet<string> = new Set([
  'Chart',
  'Line',
  'Bar',
  'Pie',
  'Donut',
  'Doughnut',
  'Area',
  'Scatter',
  'Radar',
])

/**
 * Walk for any Chart-primitive instance (`Line`, `Bar`, `Pie`, `Donut`,
 * `Area`, `Scatter`, `Radar`, or unified `Chart`). Used to gate emission
 * of the MirrorChart component definition + Chart.js CDN loader.
 */
function containsChartInstance(nodes: ReadonlyArray<unknown>): boolean {
  for (const n of nodes) {
    const node = n as {
      type?: string
      component?: string
      children?: unknown[]
      then?: unknown[]
      else?: unknown[]
    }
    if (node.type === 'Instance' && node.component && CHART_PRIMITIVE_NAMES.has(node.component)) {
      return true
    }
    if (node.children && containsChartInstance(node.children)) return true
    if (node.then && containsChartInstance(node.then)) return true
    if (node.else && containsChartInstance(node.else)) return true
  }
  return false
}

/**
 * Walk the AST tree for any `anim X` / `animation: X` property. Includes
 * Conditional and Each branches so animations inside `if`/`each` blocks
 * still trigger the keyframes emit.
 */
function containsAnimUsage(nodes: ReadonlyArray<unknown>): boolean {
  for (const n of nodes) {
    const node = n as {
      type?: string
      properties?: Array<{ name?: string }>
      children?: unknown[]
      then?: unknown[]
      else?: unknown[]
    }
    if (node.properties) {
      for (const p of node.properties) {
        if (p.name === 'anim' || p.name === 'animation') return true
      }
    }
    if (node.children && containsAnimUsage(node.children)) return true
    if (node.then && containsAnimUsage(node.then)) return true
    if (node.else && containsAnimUsage(node.else)) return true
  }
  return false
}

/**
 * Slice 50 V-2: MirrorIcon runtime component, embedded once per React
 * file when any `Icon` instance is used. Mirrors `compiler/runtime/icons.ts`
 * — same Lucide CDN, same SVG sanitization (DOMParser, strip script tags
 * and event handlers), same fallback icon, same default 24/2/currentColor.
 *
 * Why useEffect+fetch (vs `lucide-react` peer-dep or compile-time inline-
 * SVG): keeps the React export self-contained, mirrors the DOM backend
 * exactly so cross-backend differential tests round-trip cleanly, no
 * peer-dep needed.
 */
const MIRROR_ICON_COMPONENT = `// Mirror Icon component (Slice 50 V-2).
// Mirrors compiler/runtime/icons.ts: Lucide CDN fetch, SVG sanitize,
// default size 24, default stroke-width 2.
const _MIRROR_LUCIDE_CDN = 'https://unpkg.com/lucide-static/icons'
const _MIRROR_FALLBACK_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>'

function _mirrorSanitizeIconName(name) {
  if (!name || typeof name !== 'string') return null
  if (name.startsWith('__loopVar:') || name.startsWith('__conditional:')) return null
  if (!/^[a-z0-9\\-]+$/.test(name)) return null
  if (name.length > 50) return null
  return name
}

function _mirrorSanitizeSVG(svgText) {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')
    if (doc.querySelector('parsererror')) return null
    const svg = doc.documentElement
    if (svg.tagName.toLowerCase() !== 'svg') return null
    for (const tag of ['script','foreignObject','use','image','a','style','defs','metadata','animate','set']) {
      svg.querySelectorAll(tag).forEach(el => el.remove())
    }
    const dangerous = /^(on|href|xlink:href|src|data|formaction)/i
    for (const el of svg.querySelectorAll('*')) {
      for (const attr of Array.from(el.attributes)) {
        if (dangerous.test(attr.name) || attr.value.includes('javascript:')) {
          el.removeAttribute(attr.name)
        }
      }
    }
    return svg.outerHTML
  } catch {
    return null
  }
}

const _mirrorIconCache = new Map()

// Slice 51 V-1: Custom-Icon-Registry. Populated at compile-time from
// dollar-icons declarations (see compiler/backends/react.ts).
// MirrorIcon checks here first before falling through to Lucide-CDN.
const _MIRROR_CUSTOM_ICONS = {}

function _mirrorBuildCustomSvg(pathData, viewBox) {
  const paths = String(pathData).split(/[\\n|]/).map(p => p.trim()).filter(p => p.length > 0)
    .map(p => '<path d="' + p + '"/>').join('')
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + (viewBox || '0 0 24 24') +
    '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>'
}

function MirrorIcon({ name, size, color, strokeWidth, fill, style: extraStyle }) {
  const [svg, setSvg] = React.useState(_mirrorIconCache.get(name) ?? '')
  React.useEffect(() => {
    // Slice 51 V-1: Custom-Icon-Registry takes precedence over Lucide-CDN.
    // Mirrors compiler/runtime/icons.ts:getIconSvg semantics.
    const custom = _MIRROR_CUSTOM_ICONS[name]
    if (custom) {
      setSvg(_mirrorBuildCustomSvg(custom.path, custom.viewBox))
      return
    }
    const safe = _mirrorSanitizeIconName(name)
    if (!safe) { setSvg(_MIRROR_FALLBACK_ICON); return }
    if (_mirrorIconCache.has(safe)) { setSvg(_mirrorIconCache.get(safe)); return }
    let cancelled = false
    fetch(_MIRROR_LUCIDE_CDN + '/' + safe + '.svg')
      .then(r => r.ok ? r.text() : null)
      .then(text => {
        if (cancelled) return
        const sanitized = text ? _mirrorSanitizeSVG(text) : null
        const final = sanitized ?? _MIRROR_FALLBACK_ICON
        _mirrorIconCache.set(safe, final)
        setSvg(final)
      })
      .catch(() => { if (!cancelled) setSvg(_MIRROR_FALLBACK_ICON) })
    return () => { cancelled = true }
  }, [name])
  // Apply size/color/stroke-width/fill to the inner SVG via inline style
  // and dangerouslySetInnerHTML — mirror the DOM backend's
  // applyIconToElement behavior. SVG inherits color via currentColor.
  const px = (v) => {
    if (v == null) return undefined
    const s = String(v)
    return /^\\d+(\\.\\d+)?$/.test(s) ? s + 'px' : s
  }
  const wrapStyle = {
    display: 'inline-flex',
    width: px(size) ?? '24px',
    height: px(size) ?? '24px',
    color: color ?? 'currentColor',
    flexShrink: 0,
  }
  // Post-process the cached SVG so size/stroke-width/fill apply uniformly.
  const dressed = React.useMemo(() => {
    if (!svg) return ''
    let out = svg
    const sw = strokeWidth != null ? String(strokeWidth) : '2'
    if (fill) {
      out = out.replace(/<svg([^>]*)>/, '<svg$1 fill="currentColor" stroke="none">')
    } else {
      out = out.replace(/stroke-width="[^"]*"/, 'stroke-width="' + sw + '"')
    }
    return out
  }, [svg, strokeWidth, fill])
  return React.createElement('span', {
    'data-component': 'Icon',
    'data-mirror-name': 'Icon',
    style: extraStyle ? Object.assign({}, wrapStyle, extraStyle) : wrapStyle,
    dangerouslySetInnerHTML: { __html: dressed },
  })
}`

/**
 * MirrorChart runtime component, embedded once per React file when any
 * Chart instance (`Line`/`Bar`/`Pie`/`Donut`/`Area`) is used. Mirrors
 * `compiler/runtime/charts.ts` — same Chart.js CDN, same data parsing
 * (key-value object → labels + values), same pie/doughnut handling.
 *
 * Why useEffect+CDN-load (vs `chart.js` peer-dep): keeps the React
 * export self-contained, no peer-dep, no build step. Single
 * module-level promise dedupes parallel chart mounts.
 */
const MIRROR_CHART_COMPONENT = `// Mirror Chart component
const _MIRROR_CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
const _MIRROR_CHART_COLORS = ['#2271C1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']
let _mirrorChartPromise = null

function _mirrorLoadChartJs() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.Chart) return Promise.resolve(window.Chart)
  if (_mirrorChartPromise) return _mirrorChartPromise
  _mirrorChartPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = _MIRROR_CHART_CDN
    script.onload = () => resolve(window.Chart)
    script.onerror = () => reject(new Error('Chart.js failed to load'))
    document.head.appendChild(script)
  })
  return _mirrorChartPromise
}

function _mirrorParseChartData(data) {
  if (data == null) return { labels: [], values: [] }
  if (Array.isArray(data) && typeof data[0] === 'number') {
    return { labels: data.map((_, i) => String(i + 1)), values: data }
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    return { labels: entries.map(([k]) => k), values: entries.map(([, v]) => Number(v) || 0) }
  }
  return { labels: [], values: [] }
}

function MirrorChart({ chartType, data, fill, tension, title, xLabel, yLabel, min, max, colors, style: extraStyle }) {
  const canvasRef = React.useRef(null)
  React.useEffect(() => {
    let chart = null
    let cancelled = false
    _mirrorLoadChartJs().then((Chart) => {
      if (cancelled || !Chart || !canvasRef.current) return
      const { labels, values } = _mirrorParseChartData(data)
      const isPie = chartType === 'pie' || chartType === 'doughnut'
      const palette = colors || _MIRROR_CHART_COLORS
      chart = new Chart(canvasRef.current.getContext('2d'), {
        type: chartType === 'doughnut' || chartType === 'donut' ? 'doughnut' : chartType,
        data: {
          labels,
          datasets: [{
            label: title || '',
            data: values,
            backgroundColor: isPie ? palette : palette[0],
            borderColor: palette[0],
            fill: fill !== false,
            tension: tension ?? 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: isPie } },
          scales: isPie ? undefined : {
            x: { title: { display: !!xLabel, text: xLabel } },
            y: { title: { display: !!yLabel, text: yLabel }, min, max },
          },
        },
      })
    }).catch(() => { /* CDN unavailable — silent */ })
    return () => { cancelled = true; if (chart) chart.destroy() }
  }, [chartType, data, fill, tension, title, xLabel, yLabel, min, max, colors])
  const wrapStyle = Object.assign({ position: 'relative' }, extraStyle || {})
  return React.createElement('div', { 'data-component': 'Chart', 'data-mirror-name': 'Chart', style: wrapStyle },
    React.createElement('canvas', { ref: canvasRef })
  )
}`

/**
 * Layout-context for grid-vs-flex parent discrimination.
 *
 * Slice 6 V-2: Mirror's `x`/`y`/`w`/`h` semantics depend on whether the
 * parent is a CSS-Grid or a flex container. The DOM backend gets this
 * via the IR's `parentLayoutContext` (see `property-transformer.ts:394`);
 * the React backend bypasses the IR, so we walk the JSX tree manually
 * and pass the parent's layout-type down to children.
 */
type ParentLayoutContext = {
  type: 'grid' | 'flex' | null
  /**
   * Loop-variable names in scope at this nesting level (the inner `t` of
   * `each t in $tasks`). Children rendered under this context get to
   * resolve `$t.title`-shaped interpolations against the loop variable
   * instead of the (missing) `tokens.t` token.
   */
  loopVars?: ReadonlySet<string>
}

/**
 * Detect a Frame's own layout-type from its properties — used to inform
 * its CHILDREN about their parent's layout context. Same heuristic as
 * the IR layout-transformer: `grid` property = grid container; `hor`/
 * `ver`/`wrap`/`spread`/`center`/etc = flex container; otherwise the
 * default flex-column kicks in via `withLayoutDefaults`.
 */
function detectLayoutContext(props: Property[]): ParentLayoutContext {
  for (const p of props) {
    if (p.name === 'grid') return { type: 'grid' }
  }
  return { type: 'flex' } // Frame default is flex; children inherit flex-context
}

function generateJSX(
  instance: Instance,
  components: Map<string, ComponentDefinition>,
  tokens: TokenDefinition[],
  propertySetMap: Map<string, Property[]>,
  indent: string,
  parentContext: ParentLayoutContext = { type: null },
  stateContext: ReactStateContext | null = null
): string {
  // Slice 50 V-2: Icon-Sonderpfad. Statt `<span>{"check"}</span>` (das
  // kein Icon rendert, nur den literal Text-Namen anzeigt), emittiere
  // `<MirrorIcon name="..." size={...} color={...} strokeWidth={...} fill />`
  // — die MirrorIcon-Komponente (oben definiert) holt das SVG zur Runtime.
  if (instance.component === 'Icon') {
    return generateIconJSX(instance, indent, tokens)
  }

  // Chart primitives (`Line`, `Bar`, `Pie`, `Donut`, `Area`, …) emit as
  // <MirrorChart> with the data prop wired to a token reference. The
  // MirrorChart component (above) loads Chart.js on mount and creates
  // the actual chart inside a canvas — same wire-up the DOM runtime
  // does, no peer-dep needed.
  if (CHART_PRIMITIVE_NAMES.has(instance.component)) {
    return generateChartJSX(instance, indent, tokens)
  }

  // Resolve component definition. Walk the inheritance chain so
  // multi-level `as` chains (`Btn: Button pad 10` → `PrimaryBtn as Btn:
  // bg #2271C1` → `LoudBtn as PrimaryBtn: fs 18`) merge their properties
  // and resolve to the underlying primitive — same path the DOM/IR uses
  // via ComponentResolver.resolveComponent.
  const rawDef = components.get(instance.component)
  const compDef = rawDef ? resolveComponent(rawDef, { componentMap: components }) : undefined

  // Determine HTML tag based on component type
  const tag = getHtmlTag(instance.component, compDef)

  // Expand property-set references on both sides of the merge before joining.
  // `Btn: $btnbase, bg #f00` (component side) and `Btn $cardstyle` (instance
  // side) both need their `propset:` markers turned into the underlying
  // properties before order-merging — otherwise the markers leak through
  // generateStyles and produce no CSS.
  const primitive = tag.toLowerCase()
  const expandedComp = expandPropertySets(
    compDef?.properties || [],
    propertySetMap,
    components,
    primitive
  )
  const expandedInst = expandPropertySets(
    instance.properties,
    propertySetMap,
    components,
    primitive
  )

  // Merge properties: component defaults + instance overrides
  let allProps = [...expandedComp, ...expandedInst]

  // Initial-state merge. `Btn "Active", on` carries `instance.initialState
  // = "on"` and the component definition holds an `on:` block with the
  // properties that should be active. Without this merge the inline
  // `style={...}` reflects only the base props, so `Btn "Active", on`
  // looks identical to `Btn "Off"` until the user clicks. The DOM
  // backend handles this through its initial-state runtime hook; in
  // React we fold the state's properties into `allProps` so the inline
  // style already reflects the active state at first render.
  if (instance.initialState && compDef?.states) {
    const stateBlock = compDef.states.find(s => s.name === instance.initialState)
    if (stateBlock?.properties && stateBlock.properties.length > 0) {
      allProps = [...allProps, ...stateBlock.properties]
    }
  }

  // Slice 6 V-2: detect THIS instance's layout-context to inform its
  // children. Children of a `grid N` parent get `parentContext.type='grid'`,
  // which switches their `x`/`y`/`w`/`h` interpretation from
  // absolute/transform/numeric-px to grid-column-start/grid-row-start/
  // grid-column-end-span/grid-row-end-span.
  //
  // Loop-vars carry through unchanged: a `Name "$position.name"` slot
  // three levels deep inside `each position in $positions` still needs
  // `position` in scope. Without preserving `parentContext.loopVars`
  // here, the iterator drops out as soon as we cross a single Frame.
  const ownLayoutContext: ParentLayoutContext = {
    ...detectLayoutContext(allProps),
    loopVars: parentContext.loopVars,
  }

  // Generate style object. Layout primitives (Frame/Box and the table family)
  // get the same flex-column defaults the DOM backend's IR transformer
  // injects — without these the React render is an unstyled `<div />` while
  // the DOM render is a properly-laid-out flex container. Use the *rendered*
  // HTML tag rather than the component name so a `Btn: pad 10` whose
  // heuristic resolves to `<button>` doesn't accidentally pick up Frame
  // flex defaults — `button` is in `NON_CONTAINER_PRIMITIVES`.
  const style = withLayoutDefaults(generateStyles(allProps, tokens, parentContext), tag)
  const styleStr = Object.keys(style).length > 0 ? ` style={${formatStyleObject(style)}}` : ''

  // HTML attributes from properties (placeholder, type, href, src, etc.)
  const attrStr =
    generateHtmlAttributes(allProps) +
    generateBindAttribute(instance, allProps) +
    generateEventHandlers(instance.events)

  // Mirror data-* attributes (component, mirror-name, mirror-id, state).
  // Mirrors what the DOM backend emits via dataset.* so studio/editor
  // tooling can resolve elements identically across both targets.
  const mirrorAttrStr = generateMirrorAttributes(instance)

  // Hover/focus/active/disabled state rules. JSX `style={{ }}` can't carry
  // pseudo-selectors, so we collect rules into a `<style>` block emitted
  // at the top of `App()`. Each instance with state-bearing props gets a
  // unique `data-h="N"` selector. The DOM backend uses the same shape via
  // `[data-mirror-id="node-N"]:hover { … }` so cross-backend behavior
  // matches by construction.
  let stateAttr = ''
  if (stateContext) {
    const stateGroups = collectStateGroups(compDef, allProps)
    if (stateGroups.length > 0) {
      stateContext.counter.value += 1
      const id = String(stateContext.counter.value)
      stateAttr = ` data-h=${JSON.stringify(id)}`
      for (const group of stateGroups) {
        const stateStyle = withLayoutDefaults(
          generateStyles(group.properties, tokens, parentContext),
          ''
        )
        // `withLayoutDefaults('')` adds nothing — we only want the state
        // properties' direct CSS, not Frame-flex defaults.
        const css = formatStyleAsCSS(stateStyle)
        if (css.length > 0) {
          stateContext.rules.push(`[data-h="${id}"]:${group.state} { ${css} }`)
        }
      }
    }
  }

  // Element-Registry callback ref. Only attached when the instance has
  // an explicit `name X` — that's the only DSL form that can be the
  // target of a cross-element state reference. Plain `<div />` doesn't
  // need a ref. Slice 1 Phase B.4.
  const refStr = instance.name
    ? ` ref={(el) => { _elements.current[${JSON.stringify(instance.name)}] = el }}`
    : ''

  // Get text content. Layout primitives don't render positional content
  // (validator already warned via W112); skip the literal so the React
  // and DOM backends agree.
  const skipTextContent = isLayoutPrimitive(instance.component)
  const textContent = skipTextContent ? null : getTextContent(instance, allProps)

  // Default-children fall-through. A component definition's children
  // (`Btn: pad 10\n  Text "Save"`) act as default content when the
  // instance is used without its own children (`Btn` alone). The DOM
  // backend gets this via the IR transform; React has to read straight
  // from `compDef.children`. Skip the fallback when the instance carries
  // its own text content (covers `Btn "Custom"` overriding the default
  // text via positional content).
  //
  // Variant-children: if the instance starts in a custom state
  // (`LikeBtn, on`) and the matching state block defines its own
  // children (`on:\n  Text "Liked!"`), those replace the base children
  // — same Figma-Variants semantics the DOM runtime offers via state
  // child swapping. Without this branch the React render would always
  // show the base children even when the instance is in a state with
  // its own variant.
  let stateVariantChildren: ReadonlyArray<unknown> | undefined
  if (instance.initialState && compDef?.states) {
    const stateBlock = compDef.states.find(s => s.name === instance.initialState)
    if (stateBlock?.children && stateBlock.children.length > 0) {
      stateVariantChildren = stateBlock.children
    }
  }
  const fallbackChildren = stateVariantChildren ?? compDef?.children ?? []
  const useDefaultChildren =
    instance.children.length === 0 && !textContent && fallbackChildren.length > 0
  const effectiveChildren = useDefaultChildren
    ? (fallbackChildren as typeof instance.children)
    : instance.children

  // Has children? Includes Each blocks — they render as `.map()` output.
  const hasChildren = effectiveChildren.length > 0 || textContent

  // Parser desugars `if cond / else` blocks **inside a parent** into per-
  // instance `visibleWhen` strings (the explicit `Conditional` AST node only
  // appears at the top level). Mirror those here as a JSX `{cond ? jsx : null}`
  // wrap. Same identifier-rewrite as inline ternaries: bare names become
  // `tokens["…"]`. The else-branch sibling carries `!(cond)`, which the
  // rewriter steps through unchanged.
  const visibleWhen = (instance as Instance & { visibleWhen?: string }).visibleWhen

  if (!hasChildren) {
    const selfClosing = `${indent}<${tag}${attrStr}${mirrorAttrStr}${stateAttr}${refStr}${styleStr} />`
    return wrapWithVisibility(selfClosing, visibleWhen, tokens, indent)
  }

  const lines: string[] = []
  lines.push(`${indent}<${tag}${attrStr}${mirrorAttrStr}${stateAttr}${refStr}${styleStr}>`)

  // Add text content. Pass the in-scope loop-vars (if any) so a Text
  // inside `each t in $tasks` resolves `"$t.title"` to a JS expression
  // referring to the iterator rather than to (missing) `tokens.t`.
  if (textContent) {
    lines.push(renderTextSlot(textContent, indent + '  ', tokens, parentContext.loopVars))
  }

  // Slot-fill merge. A component definition's `children` carry slot
  // definitions like `Title: col white, fs 18`; when the instance fills
  // those slots (`Card\n  Title "Hello"`), the slot-def's properties
  // should flow into the filler. Pre-2026-05-10 the React backend
  // skipped this and emitted bare `<h2>Hello</h2>` with none of the
  // slot's typography. The DOM/IR backend uses the same
  // `mergeSlotPropertiesIntoFiller` helper.
  //
  // Skip when we're rendering the comp-def's default children (the
  // fallback path) — those ARE the slot defs already, no merge needed.
  const slotDefs: Map<string, Property[]> | null =
    !useDefaultChildren && compDef?.children
      ? new Map(
          compDef.children
            .filter((c): c is Instance => c.type === 'Instance')
            .map(slot => [slot.component, slot.properties])
        )
      : null

  // Add children. Slice 6 V-2: pass own layout-context so grid-children
  // resolve `x`/`y`/`w`/`h` to grid-positioning instead of absolute/numeric.
  for (const child of effectiveChildren) {
    if (child.type === 'Instance') {
      const slotProps = slotDefs?.get(child.component)
      const merged =
        slotProps && slotProps.length > 0
          ? (mergeSlotPropertiesIntoFiller(child, slotProps) as Instance)
          : child
      lines.push(
        generateJSX(
          merged,
          components,
          tokens,
          propertySetMap,
          indent + '  ',
          ownLayoutContext,
          stateContext
        )
      )
    } else if (child.type === 'Text') {
      lines.push(`${indent}  {${JSON.stringify(child.content)}}`)
    } else if (child.type === 'Each') {
      lines.push(
        generateEachJSX(
          child as Each,
          components,
          tokens,
          propertySetMap,
          indent + '  ',
          ownLayoutContext,
          stateContext
        )
      )
    } else if (child.type === 'Conditional') {
      lines.push(
        generateConditionalJSX(
          child as ConditionalNode,
          components,
          tokens,
          propertySetMap,
          indent + '  ',
          ownLayoutContext,
          stateContext
        )
      )
    }
  }

  lines.push(`${indent}</${tag}>`)

  return wrapWithVisibility(lines.join('\n'), visibleWhen, tokens, indent)
}

/**
 * Wrap a JSX block with `{cond ? (jsx) : null}` if the source instance
 * carries a `visibleWhen` (parser-desugared `if/else` inside a parent).
 * Returns the JSX unchanged when there's nothing to wrap.
 */
function wrapWithVisibility(
  jsx: string,
  visibleWhen: string | undefined,
  tokens: TokenDefinition[],
  indent: string
): string {
  if (!visibleWhen) return jsx
  const cond = rewriteIdentifiersToTokens(visibleWhen, tokens)
  return [`${indent}{${cond} ? (`, jsx, `${indent}) : null}`].join('\n')
}

/**
 * Render an `each task in $tasks` block as a JSX `.map()` expression.
 *
 * Coerces the collection the same way the DOM runtime does — accepts
 * arrays directly, Object.values for object-keyed collections — so a
 * data block like `tasks:\n  t1:\n    title: "A"` works without the
 * caller having to flatten it first.
 *
 * Loop-variable resolution: child instances may reference `task.title`
 * via LoopVarReference values. Those are emitted as JSX expressions
 * (`{task.title}`) by `renderTextSlot`; nothing extra is needed here
 * beyond rendering the children inside the map callback.
 *
 * Limitations (not yet wired):
 *  - No filter / orderBy / index handling
 *  - LoopVarReference in style/property values still drops to undefined
 *
 * Tests pin both the working and the unfinished surfaces.
 */
function generateEachJSX(
  each: Each,
  components: Map<string, ComponentDefinition>,
  tokens: TokenDefinition[],
  propertySetMap: Map<string, Property[]>,
  indent: string,
  parentContext: ParentLayoutContext = { type: null },
  stateContext: ReactStateContext | null = null
): string {
  // `each.collection` carries the leading `$` from the source (`$tasks`);
  // tokens are keyed without it so strip before the lookup. Inline-array
  // collections (`each x in [1, 2, 3]`) arrive as a JS-array-literal
  // string and bypass the token lookup entirely.
  const collectionRaw = each.collection
  const isInlineArray = collectionRaw.startsWith('[')
  const collection = collectionRaw.startsWith('$') ? collectionRaw.slice(1) : collectionRaw
  const item = each.item // 'task'
  // Optional named index (`each task,i in $tasks` → index = 'i').
  // Without this binding the user's `$i` reference inside the loop body
  // resolved against missing tokens and emitted literal `"$i: ..."`.
  const indexVar = (each as Each & { index?: string }).index ?? '_idx'

  // Extend the parent loop-var set with this each's iterator name so any
  // descendant text-content / property-value referencing `$<item>.X` can
  // emit a JS expression instead of a literal string. Named indexes
  // (`,i`) join the same set so `$i` resolves too.
  const loopVarsExt = new Set([...(parentContext.loopVars ?? []), item])
  if (indexVar !== '_idx') loopVarsExt.add(indexVar)
  const childContext: ParentLayoutContext = {
    ...parentContext,
    loopVars: loopVarsExt,
  }

  const childLines: string[] = []
  for (const child of each.children) {
    if (child.type === 'Instance') {
      childLines.push(
        generateJSX(
          child,
          components,
          tokens,
          propertySetMap,
          indent + '    ',
          childContext,
          stateContext
        )
      )
    } else if (child.type === 'Each') {
      childLines.push(
        generateEachJSX(
          child as Each,
          components,
          tokens,
          propertySetMap,
          indent + '    ',
          childContext,
          stateContext
        )
      )
    }
  }

  // Coerce object-keyed collections to arrays so .map() works regardless
  // of how the data was authored. Mirrors the DOM backend's runtime
  // coercion (compiler/backends/dom/ops/emit-loops.ts). Inline arrays
  // pass through verbatim — they're already JS-array literals.
  const coerced = isInlineArray
    ? collectionRaw
    : `Array.isArray(tokens[${JSON.stringify(collection)}]) ? tokens[${JSON.stringify(collection)}] : Object.values(tokens[${JSON.stringify(collection)}] || {})`

  // Optional `where` filter (`each t in $tasks where t.done`). The filter
  // expression is JS-compatible and references the loop variable directly,
  // so we can pass it through verbatim — same shape as the DOM runtime's
  // `filterFn`. Compose `.filter(t => t.done).map(...)` ahead of the map.
  const filterExpr = (each as Each & { filter?: string }).filter
  let chain: string = `(${coerced})`
  if (filterExpr) chain = `${chain}.filter((${item}) => ${filterExpr})`

  // Optional `by <key>` orderBy (`each t in $tasks by priority`). The
  // sort key names a property on the loop var. DOM uses its `_runtime.sort`
  // helper; React just needs `.slice().sort((a, b) => ...)` ahead of the
  // map so the rendered order matches the DOM output. Pre-2026-05-10
  // the React backend silently ignored the `by` clause and rendered in
  // insertion order — visible in any task list with `by priority`.
  const orderBy = (each as Each & { orderBy?: string }).orderBy
  if (orderBy) {
    const k = JSON.stringify(orderBy)
    chain = `[...${chain}].sort((a, b) => { const va = a[${k}], vb = b[${k}]; return va < vb ? -1 : va > vb ? 1 : 0 })`
  }

  const lines: string[] = []
  const mapSource = chain
  lines.push(`${indent}{${mapSource}.map((${item}, ${indexVar}) => (`)
  lines.push(`${indent}  <React.Fragment key={${indexVar}}>`)
  for (const line of childLines) lines.push(line)
  lines.push(`${indent}  </React.Fragment>`)
  lines.push(`${indent}))}`)
  return lines.join('\n')
}

/**
 * Render an `if cond` (with optional `else`) block as a JSX expression.
 *
 * Output shapes:
 *   then-only          → `{cond ? (<>…</>) : null}`
 *   if/else            → `{cond ? (<>…then…</>) : (<>…else…</>)}`
 *
 * The condition is rewritten the same way as inline ternaries — bare
 * identifiers that match top-level data become `tokens["…"]` lookups so
 * the React emit can evaluate them at render time without any Mirror
 * runtime. Mirror condition syntax is JS-compatible (operators,
 * comparisons), so the rest of the expression flows through verbatim.
 */
function generateConditionalJSX(
  cond: ConditionalNode,
  components: Map<string, ComponentDefinition>,
  tokens: TokenDefinition[],
  propertySetMap: Map<string, Property[]>,
  indent: string,
  parentContext: ParentLayoutContext = { type: null },
  stateContext: ReactStateContext | null = null
): string {
  const condExpr = rewriteIdentifiersToTokens(cond.condition, tokens)

  const renderBranch = (nodes: (Instance | { type: string })[], branchIndent: string): string[] => {
    const out: string[] = []
    for (const node of nodes) {
      if ((node as { type: string }).type === 'Instance') {
        out.push(
          generateJSX(
            node as Instance,
            components,
            tokens,
            propertySetMap,
            branchIndent,
            parentContext,
            stateContext
          )
        )
      } else if ((node as { type: string }).type === 'Each') {
        out.push(
          generateEachJSX(
            node as unknown as Each,
            components,
            tokens,
            propertySetMap,
            branchIndent,
            parentContext,
            stateContext
          )
        )
      } else if ((node as { type: string }).type === 'Conditional') {
        out.push(
          generateConditionalJSX(
            node as unknown as ConditionalNode,
            components,
            tokens,
            propertySetMap,
            branchIndent,
            parentContext,
            stateContext
          )
        )
      }
    }
    return out
  }

  const thenLines = renderBranch(cond.then, indent + '    ')
  const elseLines =
    cond.else && cond.else.length > 0 ? renderBranch(cond.else, indent + '    ') : []

  const lines: string[] = []
  lines.push(`${indent}{${condExpr} ? (`)
  lines.push(`${indent}  <>`)
  for (const line of thenLines) lines.push(line)
  lines.push(`${indent}  </>`)
  if (elseLines.length > 0) {
    lines.push(`${indent}) : (`)
    lines.push(`${indent}  <>`)
    for (const line of elseLines) lines.push(line)
    lines.push(`${indent}  </>`)
    lines.push(`${indent})}`)
  } else {
    lines.push(`${indent}) : null}`)
  }
  return lines.join('\n')
}

/**
 * Slice 50 V-2: Render an Icon instance as `<MirrorIcon ... />`.
 * Reads `is`/`ic`/`iw`/`fill` (and aliases) directly from the instance
 * properties — no need to thread through the full style pipeline since
 * MirrorIcon applies them itself. Token references survive as the
 * `var(--…)` strings the resolver emits, which JSX accepts as inline
 * style values.
 */
function generateIconJSX(
  instance: Instance,
  indent: string,
  tokens: TokenDefinition[] = []
): string {
  const iconName = getIconName(instance)
  const propAttrs: string[] = [`name=${JSON.stringify(iconName)}`]
  let animValue: string | null = null

  for (const p of instance.properties) {
    const v = p.values[0]
    if (p.name === 'icon-size' || p.name === 'is') {
      propAttrs.push(`size=${formatIconPropValue(v, 'is', tokens)}`)
    } else if (p.name === 'icon-color' || p.name === 'ic') {
      propAttrs.push(`color=${formatIconPropValue(v, 'ic', tokens)}`)
    } else if (p.name === 'icon-weight' || p.name === 'iw') {
      propAttrs.push(`strokeWidth=${formatIconPropValue(v, 'iw', tokens)}`)
    } else if (p.name === 'fill') {
      propAttrs.push(`fill`)
    } else if (p.name === 'anim' || p.name === 'animation') {
      animValue = animationShorthand(String(v))
    }
  }

  // Pass animations through as an inline style — MirrorIcon spreads
  // unknown props onto the rendered SVG. `Icon "loader", anim spin` is
  // the canonical usage (loading spinner) so this is the most-used path.
  if (animValue) {
    propAttrs.push(`style={{ animation: ${JSON.stringify(animValue)} }}`)
  }

  return `${indent}<MirrorIcon ${propAttrs.join(' ')} />`
}

/**
 * Emit a Mirror chart primitive (Line/Bar/Pie/…) as a `<MirrorChart>`
 * element. The chart's data binding lives in a `propset`-named property
 * (because `Line $data` parses as a property-set reference); pull the
 * token name from there and emit `data={tokens["data"]}` so the
 * MirrorChart's useEffect reads the resolved data at render time.
 */
function generateChartJSX(instance: Instance, indent: string, tokens: TokenDefinition[]): string {
  // Map Mirror chart primitive name → Chart.js type. Donut/Doughnut both
  // map to chartjs `'doughnut'`; Area renders as `'line'` with `fill`.
  const typeMap: Record<string, string> = {
    Line: 'line',
    Bar: 'bar',
    Pie: 'pie',
    Donut: 'doughnut',
    Doughnut: 'doughnut',
    Area: 'line',
    Scatter: 'scatter',
    Radar: 'radar',
  }
  const chartType = typeMap[instance.component] ?? 'line'

  const attrs: string[] = []
  attrs.push(`chartType=${JSON.stringify(chartType)}`)

  // Area defaults to fill: true (DOM runtime does the same).
  if (instance.component === 'Area') attrs.push(`fill`)

  let dataExpr = '{}'
  let widthPx: string | null = null
  let heightPx: string | null = null

  for (const prop of instance.properties) {
    const v = prop.values[0]
    // Data binding lives on a `propset`-named property when the user
    // wrote `Line $data, …` — the token reference is the value.
    if (prop.name === 'propset' || prop.name === 'data') {
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'token') {
        const tokenName = (v as { name: string }).name
        dataExpr = `tokens[${JSON.stringify(tokenName)}]`
      } else if (typeof v === 'string' && v.startsWith('$')) {
        dataExpr = `tokens[${JSON.stringify(v.slice(1))}]`
      }
    } else if (prop.name === 'w' || prop.name === 'width') {
      widthPx = `${v}px`
    } else if (prop.name === 'h' || prop.name === 'height') {
      heightPx = `${v}px`
    } else if (prop.name === 'fill') {
      // Override the Area default if explicitly set.
    } else if (prop.name === 'tension' || prop.name === 'min' || prop.name === 'max') {
      attrs.push(`${prop.name}={${Number(v)}}`)
    } else if (prop.name === 'title' || prop.name === 'xLabel' || prop.name === 'yLabel') {
      attrs.push(`${prop.name}=${JSON.stringify(String(v))}`)
    }
  }

  attrs.push(`data={${dataExpr}}`)

  const styleParts: string[] = []
  if (widthPx) styleParts.push(`width: '${widthPx}'`)
  if (heightPx) styleParts.push(`height: '${heightPx}'`)
  if (styleParts.length > 0) {
    attrs.push(`style={{ ${styleParts.join(', ')} }}`)
  }

  // Reference `tokens` once so unused-warning gates close cleanly even
  // for charts compiled from an empty token block.
  void tokens
  return `${indent}<MirrorChart ${attrs.join(' ')} />`
}

function getIconName(instance: Instance): string {
  // Icon name lives as the first string positional arg / textContent.
  // Mirror parser stores it depending on form — try both.
  for (const p of instance.properties) {
    if (p.name === 'content' || p.name === 'textContent') {
      const v = p.values[0]
      if (typeof v === 'string') return v
    }
  }
  return ''
}

/**
 * Slice 50 V-2: format a property value for the MirrorIcon JSX prop.
 *
 * `propAlias` is the short Mirror name (`is`/`ic`/`iw`) so we can apply
 * the same suffix resolution the IR token-resolver uses (`is` → `.is`,
 * `ic` → `.ic`, etc.). Without this the React backend emitted
 * `var(--iconSize)` while the DOM backend declared the CSS variable as
 * `--iconSize-is` — cross-backend variable-name mismatch, MirrorIcon
 * would silently fall back to default size.
 */
function formatIconPropValue(
  v: unknown,
  propAlias: 'is' | 'ic' | 'iw',
  tokens: TokenDefinition[] = []
): string {
  if (v == null) return '{undefined}'
  if (typeof v === 'number') return `{${v}}`
  if (typeof v === 'boolean') return `{${v}}`
  if (typeof v === 'string') {
    // Bare numeric strings → number JSX expression.
    if (/^-?\d+(\.\d+)?$/.test(v)) return `{${v}}`
    return JSON.stringify(v)
  }
  if (typeof v === 'object' && v !== null && 'kind' in v) {
    // Inline ternary on an icon prop: `Icon "check", ic done ? green : gray`.
    // Pre-2026-05-10 this fell through to `JSON.stringify(String(v))` which
    // produced `color="[object Object]"` — the React render then crashed
    // when the MirrorIcon spread that string onto the SVG. Emit a JSX
    // expression carrying the rewritten condition (token names → tokens["..."]).
    const cond = v as Conditional
    if (cond.kind === 'conditional') {
      const c = rewriteIdentifiersToTokens(cond.condition, tokens)
      const fmt = (branch: unknown) => {
        if (typeof branch === 'string') return JSON.stringify(branch)
        if (typeof branch === 'number') return String(branch)
        return JSON.stringify(String(branch))
      }
      return `{${c} ? ${fmt(cond.then)} : ${fmt(cond.else)}}`
    }
  }
  if (typeof v === 'object' && v !== null && 'name' in v) {
    // Token reference — emit as `var(--<name>-<suffix>)` string matching
    // the suffix-aware CSS variable declaration emitted by the DOM/state
    // pipeline. The suffix is the same one `compiler/schema/token-suffixes.ts`
    // uses (alias-keyed: `is`→`.is`, `ic`→`.ic`, `iw`→`.iw`).
    const tokenName = (v as { name: string }).name.replace(/^\$/, '')
    const cssVarName = `${tokenName.replace(/\./g, '-')}-${propAlias}`
    return JSON.stringify(`var(--${cssVarName})`)
  }
  return JSON.stringify(String(v))
}

function getHtmlTag(componentName: string, compDef?: ComponentDefinition): string {
  // 1) `Btn as Button: ...` → compDef.primitive='button' → <button>. Components
  // without `as`-clause carry an implicit `primitive='frame'`, which we ignore
  // here (returns 'div' from the schema) so the name-heuristic in step 3 still
  // runs. Only schema-resolutions to a non-div tag are authoritative.
  if (compDef?.primitive && isKnownPrimitive(compDef.primitive)) {
    const tag = schemaGetHtmlTag(compDef.primitive)
    if (tag !== 'div') return tag
  }

  // 2) Direct primitive name (Frame, Icon, H1, …) via DSL schema.
  if (isKnownPrimitive(componentName)) {
    return schemaGetHtmlTag(componentName)
  }

  // 3) Semantic-name heuristic for user components without `as`-clause.
  // `Sidebar` → <aside>, `MyHeader` → <header>, `Title` → <h2> for
  // accessibility/SEO without forcing the user to write `as`. Tested in
  // backend-react.test.ts § "Heuristic tag resolution".
  const name = componentName.toLowerCase()
  if (name.includes('button') || name === 'btn') return 'button'
  if (name.includes('input') || name.includes('field')) return 'input'
  if (name.includes('link')) return 'a'
  if (name.includes('heading') || name.includes('title')) return 'h2'
  if (name.includes('text') || name.includes('label') || name.includes('body')) return 'span'
  if (name.includes('nav')) return 'nav'
  if (name.includes('header')) return 'header'
  if (name.includes('footer')) return 'footer'
  if (name.includes('main')) return 'main'
  if (name.includes('section')) return 'section'
  if (name.includes('aside') || name.includes('sidebar')) return 'aside'

  return 'div'
}

/**
 * Set of property names that map directly to HTML attributes in JSX
 * (and the corresponding JSX prop names — React uses some camelCase
 * variants like className, htmlFor — but for these we map 1:1).
 */
const HTML_ATTR_PROPS: Record<string, string> = {
  placeholder: 'placeholder',
  type: 'type',
  href: 'href',
  src: 'src',
  alt: 'alt',
  name: 'name',
  value: 'defaultValue', // React uses defaultValue for uncontrolled inputs
  disabled: 'disabled',
  checked: 'defaultChecked',
  readonly: 'readOnly',
}

/**
 * Walk the instance tree and collect every `Instance.name` (instance name
 * set via `Element name X` in the DSL). Used by `generateReact` to decide
 * whether to declare the `_elements` registry useRef at the top of the
 * generated App component. Slice 1 Phase B.4.
 */
function collectNamedInstances(roots: ReadonlyArray<unknown>): string[] {
  const names: string[] = []
  const walk = (node: unknown): void => {
    if (!node || typeof node !== 'object') return
    const n = node as { type?: string; name?: string | null; children?: unknown[] }
    if (n.type === 'Instance' && typeof n.name === 'string' && n.name.length > 0) {
      names.push(n.name)
    }
    if (Array.isArray(n.children)) {
      for (const child of n.children) walk(child)
    }
  }
  for (const root of roots) walk(root)
  return names
}

/**
 * Merge Frame-default flex styles into the style object for layout primitives
 * that don't already carry an explicit display rule. The DOM backend gets
 * these for free via the IR transformer (see compiler/ir/transformers/
 * property-transformer.ts) — the React backend bypasses the IR, so we have
 * to prepend the same defaults here. User-component instances that resolve
 * to a layout primitive (e.g. `Btn: pad 10`) keep the defaults too, so
 * `<button>`-based components still flex-column unless they say otherwise.
 *
 * Skipped if the user has already set `display` (`hor`, `ver`, `center`,
 * `grid`, etc. all set it) — those layouts are intentional choices.
 */
function withLayoutDefaults(
  style: Record<string, string | number>,
  componentName: string
): Record<string, string | number> {
  // Same container-detection rule the DOM IR uses
  // (`compiler/schema/layout-defaults.ts:isContainer`). Pre-2026-05-10 this
  // gated on `isLayoutPrimitive` (content === false), which excluded the
  // semantic tags `Header`/`Section`/`Article`/`Main`/`Aside`/`Nav`/`Footer`
  // even though DOM treats them as flex containers — React rendered them
  // as inline-block elements without flex defaults, drifting from DOM.
  if (!isContainerPrimitive(componentName.toLowerCase())) return style
  // Slice 3 V-1: merge defaults per-key instead of skip-if-display-set.
  // The old skip-when-display-set behavior dropped `alignSelf: stretch` and
  // `alignItems: flex-start` whenever `hor`/`ver`/`grid` set display first
  // — `Frame hor` lost its container stretch/flex-start defaults that the
  // DOM/IR pipeline always emits. Now each default key only fills in if
  // the user-explicit style hasn't already chosen a value: `hor` keeps
  // flexDirection: 'row', `center` keeps alignItems: 'center', and the
  // container still gets alignSelf: 'stretch' for parent-flex-fill.
  const merged: Record<string, string | number> = { ...style }
  if (merged.display === undefined) merged.display = 'flex'
  // Slice 7 V-3 (B-4): grid containers never need `flexDirection` — DOM-IR
  // emits `grid-auto-flow` instead. Without this gate the default
  // `flexDirection: 'column'` leaked into grid containers and confused
  // computed-style assertions.
  if (merged.display !== 'grid' && merged.flexDirection === undefined) {
    merged.flexDirection = 'column'
  }
  if (merged.alignSelf === undefined) merged.alignSelf = 'stretch'
  if (merged.alignItems === undefined) merged.alignItems = 'flex-start'
  return merged
}

/**
 * Emit the Mirror data-* attributes the DOM backend writes via `dataset.*`:
 *
 *   - `data-component` — original component name (`Frame`, `Btn`, …). Lets
 *     studio tooling and the property-panel resolve user components.
 *   - `data-mirror-name` — instance name (`Frame name MyFrame`) when set,
 *     otherwise the component name. Used by `setState`/cross-element refs.
 *   - `data-state` — initial state (`Btn "X", on` → `data-state="on"`).
 *
 * `data-mirror-id` is omitted for now — React doesn't have stable per-render
 * ids without `useId()`, and the DOM backend's id (`node-1`) is generated
 * per emit. Adding it requires the same useRef plumbing as the element-
 * registry (Phase B.4); skip until then.
 */
function generateMirrorAttributes(instance: Instance): string {
  const attrs: string[] = []
  attrs.push(`data-component=${JSON.stringify(instance.component)}`)
  const finalName = instance.name ?? instance.component
  attrs.push(`data-mirror-name=${JSON.stringify(finalName)}`)
  if (instance.initialState) {
    attrs.push(`data-state=${JSON.stringify(instance.initialState)}`)
  }
  return ' ' + attrs.join(' ')
}

function generateHtmlAttributes(properties: Property[]): string {
  const attrs: string[] = []
  for (const prop of properties) {
    const jsxName = HTML_ATTR_PROPS[prop.name]
    if (!jsxName) continue
    if (prop.values.length === 0) {
      // Standalone flag — boolean attribute (e.g. `disabled`)
      attrs.push(jsxName)
      continue
    }
    const v = prop.values[0]
    if (typeof v === 'boolean') {
      if (v) attrs.push(jsxName)
    } else if (typeof v === 'string' || typeof v === 'number') {
      attrs.push(`${jsxName}=${JSON.stringify(String(v))}`)
    }
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

/**
 * `Input bind name` lives on the AST as `instance.bind` rather than as
 * a property (the parser stores it directly). Emit `defaultValue` from
 * the matching token so the initial data lands in the input, plus the
 * `data-bind` attribute that the DOM backend uses for two-way wiring —
 * any future React runtime can read it the same way. `Input bind X` on
 * a checkbox-type input maps to `defaultChecked` instead.
 */
function generateBindAttribute(instance: Instance, allProps: Property[]): string {
  const bind = (instance as Instance & { bind?: string }).bind
  if (!bind) return ''
  // Detect checkbox/radio so we use `defaultChecked` instead of `defaultValue`.
  const typeProp = allProps.find(p => p.name === 'type')
  const typeVal = typeProp?.values[0]
  const isBooleanInput = typeVal === 'checkbox' || typeVal === 'radio'
  const valueAttr = isBooleanInput ? 'defaultChecked' : 'defaultValue'
  // Drop the leading `$` if the parser preserved it (it shouldn't, but be safe).
  const tokenKey = bind.startsWith('$') ? bind.slice(1) : bind
  return ` ${valueAttr}={tokens[${JSON.stringify(tokenKey)}]} data-bind=${JSON.stringify(tokenKey)}`
}

/**
 * Map Mirror event names to React JSX event-handler attribute names.
 * Mirror's `onclick` → React's `onClick`, `onhover` (= mouseenter) →
 * `onMouseEnter`, etc. Keyboard shorthands (`onenter`, `onkeyescape`,
 * etc.) all funnel through `onKeyDown` with a key-filter inside the
 * handler body.
 */
const REACT_EVENT_NAME: Record<string, string> = {
  onclick: 'onClick',
  onhover: 'onMouseEnter',
  onfocus: 'onFocus',
  onblur: 'onBlur',
  onchange: 'onChange',
  oninput: 'onInput',
  onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp',
  onload: 'onLoad',
}

const KEY_NAME_TO_DOM_KEY: Record<string, string> = {
  enter: 'Enter',
  escape: 'Escape',
  esc: 'Escape',
  space: ' ',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  'arrow-up': 'ArrowUp',
  'arrow-down': 'ArrowDown',
  'arrow-left': 'ArrowLeft',
  'arrow-right': 'ArrowRight',
  home: 'Home',
  end: 'End',
}

/**
 * Emit a React-friendly inline-handler body for a single Action.
 *
 * Side-effect-only actions (toast, copy, openUrl, back/forward, scrollTo)
 * translate to plain browser APIs that work without any Mirror runtime.
 * State-mutating actions (increment, set, toggle, add, remove, ...) need
 * a real React state runtime to work; until that lands, we emit a no-op
 * comment so the generated code still compiles. The DOM/Framework
 * backends still wire these via their own runtimes — pinned in
 * actions.test.ts.
 */
function emitActionExpression(action: Action): string {
  const args = action.args ?? []
  const arg0 = args[0]
  const arg1 = args[1]
  const literal = (s: string) => JSON.stringify(s)
  switch (action.name) {
    case 'toast': {
      if (typeof arg0 !== 'string') return '/* toast */'
      // window.alert is the simplest cross-browser feedback channel.
      // Type/position args are ignored — there is no toast UI in the
      // generated React app.
      return `window.alert(${literal(arg0)})`
    }
    case 'copy': {
      if (typeof arg0 !== 'string') return '/* copy */'
      return `navigator.clipboard?.writeText(${literal(arg0)})`
    }
    case 'openUrl': {
      if (typeof arg0 !== 'string') return '/* openUrl */'
      const newTab = arg1 === 'true' || arg1 === undefined
      return newTab
        ? `window.open(${literal(arg0)}, '_blank')`
        : `window.location.href = ${literal(arg0)}`
    }
    case 'back':
      return 'window.history.back()'
    case 'forward':
      return 'window.history.forward()'
    case 'scrollToTop':
      return 'window.scrollTo({ top: 0, behavior: "smooth" })'
    case 'scrollToBottom':
      return 'window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" })'
    default:
      // Unsupported in React without a state runtime — emit no-op so the
      // JSX remains valid but the action is silently skipped. DOM and
      // Framework backends still wire these via their own runtimes.
      return `/* ${action.name}: no React runtime */`
  }
}

/**
 * Emit JSX event-handler attributes (`onClick={...}`, `onKeyDown={...}`,
 * etc.) for the events on this instance.
 *
 * Multiple events on the same instance with the same React event name
 * (e.g. `onkeydown(enter)` + `onkeydown(escape)`) coalesce into a single
 * handler with key-filter branches inside, so React doesn't drop one
 * binding by overwriting the JSX prop.
 */
function generateEventHandlers(events: EventNode[] | undefined): string {
  if (!events || events.length === 0) return ''
  // Group events by React JSX prop name. `onkeydown(enter)` and
  // `onkeydown(escape)` share the `onKeyDown` slot; they must merge.
  const grouped = new Map<string, EventNode[]>()
  for (const ev of events) {
    const reactName = REACT_EVENT_NAME[ev.name]
    if (!reactName) continue
    const list = grouped.get(reactName) ?? []
    list.push(ev)
    grouped.set(reactName, list)
  }
  const attrs: string[] = []
  for (const [reactName, group] of grouped) {
    const isKeyboard = reactName === 'onKeyDown' || reactName === 'onKeyUp'
    const bodies: string[] = []
    for (const ev of group) {
      const actionExprs = ev.actions.map(a => emitActionExpression(a)).join('; ')
      const key = ev.key ? (KEY_NAME_TO_DOM_KEY[ev.key.toLowerCase()] ?? ev.key) : null
      if (isKeyboard && key) {
        // Each key-filtered branch is a complete `if (...) { ... }` block;
        // adjacent blocks don't need a `;` between them.
        bodies.push(`if (e.key === ${JSON.stringify(key)}) { ${actionExprs} }`)
      } else {
        bodies.push(actionExprs)
      }
    }
    // For non-keyboard groups, multiple events on the same JSX prop must
    // be separated by `;` so two adjacent `window.alert(...)` calls don't
    // parse as a single expression. Keyboard branches are statement-form
    // already, so join with space.
    const body = isKeyboard ? bodies.join(' ') : bodies.join('; ')
    const arg = isKeyboard ? '(e)' : '()'
    attrs.push(`${reactName}={${arg} => { ${body} }}`)
  }
  return attrs.length > 0 ? ' ' + attrs.join(' ') : ''
}

function getTextContent(
  instance: Instance,
  properties: Property[]
): string | LoopVarReference | Conditional | null {
  // Check for content property
  for (const prop of properties) {
    if (prop.name === 'content' && prop.values.length > 0) {
      const v = prop.values[0]
      if (typeof v === 'string') return v
      // `each task in $tasks` puts `task.title` into a positional content
      // value as a LoopVarReference. JSX needs `{task.title}`, not the
      // literal string — return the ref so the caller emits the
      // expression form.
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'loopVar') {
        return v as LoopVarReference
      }
      // Inline ternary in Text content (`Text done ? "Ja" : "Nein"`).
      // Returned as-is so the renderer can emit a JSX `{cond ? a : b}`
      // expression with token names rewritten to `tokens["…"]`.
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'conditional') {
        return v as Conditional
      }
    }
  }
  // Check for text child
  for (const child of instance.children) {
    if (child.type === 'Text') return child.content
  }
  return null
}

/**
 * Convert a parsed data block (`tasks:\n  t1:\n    title: "A"`) to a JS
 * object literal string. Used by the React tokens emit so `each task in
 * $tasks` can iterate `Object.values(tokens.tasks)` at render time.
 */
function dataAttributesToJSObject(attrs: DataAttribute[]): string {
  if (attrs.length === 0) return '{}'
  const entries = attrs.map(attr => {
    const key = JSON.stringify(attr.key)
    if (attr.children && attr.children.length > 0) {
      return `${key}: ${dataAttributesToJSObject(attr.children)}`
    }
    return `${key}: ${JSON.stringify(attr.value ?? null)}`
  })
  return `{ ${entries.join(', ')} }`
}

/**
 * Render the textContent slot, handling literal strings, loop-variable
 * references that surface inside `each` blocks, and inline ternaries.
 */
function renderTextSlot(
  content: string | LoopVarReference | Conditional,
  indent: string,
  tokens: TokenDefinition[] = [],
  loopVars: ReadonlySet<string> | undefined = undefined
): string {
  if (typeof content === 'string') {
    // Mirror string content can carry `$name` / `$user.name` interpolations.
    // Resolve against the `tokens` object so the React emit shows the
    // actual data instead of a literal `$name`. Loop-var references
    // (`$t.title` inside `each t in …`) emit as JS expressions referring
    // to the iterator directly.
    return `${indent}${interpolateStringForJSX(content, tokens, loopVars)}`
  }
  if ('kind' in content && content.kind === 'conditional') {
    const cond = rewriteIdentifiersToTokens(content.condition, tokens)
    // Branches may themselves be ternaries (`level == 1 ? "A" : level == 2 ? "B" : "C"`
    // arrives flattened into the else string). Run the same identifier
    // rewrite so nested conditions resolve through `tokens["…"]`.
    const thenBranch = rewriteIdentifiersToTokens(ternaryBranchToJS(content.then), tokens)
    const elseBranch = rewriteIdentifiersToTokens(ternaryBranchToJS(content.else), tokens)
    return `${indent}{${cond} ? ${thenBranch} : ${elseBranch}}`
  }
  return `${indent}{${content.name}}`
}

/**
 * Convert a Mirror text-content string into a JSX-renderable expression.
 *
 * Mirror lets text reference data with `$name` / `$user.name` directly
 * inside string literals: `Text "Hi $name"` and `Text "$user.name"`. The
 * DOM backend resolves these via `$get(...)` at runtime; React has no
 * runtime, so we compile-time-resolve into either a plain string literal
 * (no refs), a single token-lookup expression (one ref, whole content),
 * or a template literal that interleaves literal segments with token
 * accesses. Identifiers not matching any token name pass through untouched
 * — same conservative rule the conditional-rewriter uses.
 *
 * Outputs (always wrapped in `{...}` for JSX):
 *   "Hello"          → `{"Hello"}`
 *   "$name"          → `{tokens["name"]}`
 *   "Hi $name"       → `` {`Hi ${tokens["name"]}`} ``
 *   "$user.name"     → `{tokens["user"]?.name}`
 */
function interpolateStringForJSX(
  content: string,
  tokens: TokenDefinition[],
  loopVars: ReadonlySet<string> | undefined = undefined
): string {
  if ((tokens.length === 0 && !loopVars) || !content.includes('$')) {
    return `{${JSON.stringify(content)}}`
  }
  const tokenNames = new Set<string>()
  for (const t of tokens) {
    const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
    tokenNames.add(n)
  }

  type Segment = { kind: 'text'; value: string } | { kind: 'expr'; code: string }
  const segments: Segment[] = []
  let i = 0
  let textBuf = ''
  while (i < content.length) {
    const ch = content[i]
    if (ch === '$') {
      // Match `$<id>(.<id>)*` — bare-identifier-with-dots. Stop on
      // anything that isn't a valid identifier char.
      const start = i + 1
      let j = start
      const isHead = (c: string) => /[A-Za-z_]/.test(c)
      const isTail = (c: string) => /[A-Za-z0-9_]/.test(c)
      if (j < content.length && isHead(content[j])) {
        while (j < content.length && isTail(content[j])) j++
        // Allow dotted access: `$user.name`, `$a.b.c`
        while (
          j < content.length &&
          content[j] === '.' &&
          j + 1 < content.length &&
          isHead(content[j + 1])
        ) {
          j++ // consume `.`
          while (j < content.length && isTail(content[j])) j++
        }
        const ref = content.slice(start, j)
        const head = ref.includes('.') ? ref.slice(0, ref.indexOf('.')) : ref
        // Loop-var lookup wins over token lookup — inside `each t in $tasks`
        // the iterator `t` shadows any (improbable) sibling token. Emit the
        // bare identifier path so it resolves against the .map callback's
        // parameter.
        const isLoopVar = loopVars?.has(head) ?? false
        if (isLoopVar || tokenNames.has(head)) {
          if (textBuf.length > 0) {
            segments.push({ kind: 'text', value: textBuf })
            textBuf = ''
          }
          // Loop-var: `t.title` (raw chain). Token: `tokens["head"]?.foo`.
          let code: string
          if (isLoopVar) {
            code = head
            if (ref.includes('.')) {
              const rest = ref.slice(head.length + 1).split('.')
              for (const part of rest) code += `.${part}`
            }
          } else {
            code = `tokens[${JSON.stringify(head)}]`
            if (ref.includes('.')) {
              const rest = ref.slice(head.length + 1).split('.')
              for (const part of rest) code += `?.${part}`
            }
          }
          segments.push({ kind: 'expr', code })
          i = j
          continue
        }
        // Not a known token or loop var — fall through, emit literal `$ref`.
      }
      textBuf += ch
      i++
      continue
    }
    textBuf += ch
    i++
  }
  if (textBuf.length > 0) segments.push({ kind: 'text', value: textBuf })

  // Pure literal (no `$ref` matched) — same shape as the no-`$` branch.
  if (segments.every(s => s.kind === 'text')) {
    return `{${JSON.stringify(segments.map(s => (s as { value: string }).value).join(''))}}`
  }
  // Single expression (e.g. just `$name`) — emit raw, no template literal.
  if (segments.length === 1 && segments[0].kind === 'expr') {
    return `{${segments[0].code}}`
  }
  // Mixed: template literal interleaves text and `${expr}` parts.
  const parts: string[] = []
  for (const seg of segments) {
    if (seg.kind === 'text') {
      // Escape backticks, backslashes, and `${` sequences for template-literal context.
      parts.push(seg.value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${'))
    } else {
      parts.push('${' + seg.code + '}')
    }
  }
  return '{`' + parts.join('') + '`}'
}

/**
 * Rewrite a Mirror condition expression for use in React-emitted JS.
 * In Mirror, bare identifiers (`done`, `count`) reference top-level data
 * that lives on the `tokens` object in the React backend's emit. Replace
 * any such identifier with `tokens["name"]` so the expression evaluates
 * against the actual data at runtime. Operators, literals, comparisons
 * stay untouched — Mirror condition syntax is JS-compatible.
 */
function rewriteIdentifiersToTokens(expr: string, tokens: TokenDefinition[]): string {
  if (tokens.length === 0) return expr
  const tokenNames = new Set<string>()
  for (const t of tokens) {
    const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
    tokenNames.add(n)
  }
  // Walk the string tracking whether we're inside a `"..."` / `'...'` /
  // `` `...` `` literal — identifiers there are content, not references.
  let out = ''
  let i = 0
  let inString: '"' | "'" | '`' | null = null
  while (i < expr.length) {
    const ch = expr[i]
    if (inString) {
      out += ch
      if (ch === '\\' && i + 1 < expr.length) {
        out += expr[i + 1]
        i += 2
        continue
      }
      if (ch === inString) inString = null
      i++
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch as '"' | "'" | '`'
      out += ch
      i++
      continue
    }
    // Identifier?
    if (/[A-Za-z_$]/.test(ch)) {
      let j = i
      while (j < expr.length && /[A-Za-z0-9_$]/.test(expr[j])) j++
      const ident = expr.slice(i, j)
      const isMember = i > 0 && expr[i - 1] === '.'
      const isKeyword =
        ident === 'true' || ident === 'false' || ident === 'null' || ident === 'undefined'
      if (!isMember && !isKeyword && tokenNames.has(ident)) {
        out += `tokens[${JSON.stringify(ident)}]`
      } else {
        out += ident
      }
      i = j
      continue
    }
    out += ch
    i++
  }
  return out
}

/**
 * Ternary branches arrive as already-quoted source strings (`"Ja"`) or
 * numbers. JS-emit them straight through — quoted literals are valid JS,
 * numbers stringify cleanly.
 */
function ternaryBranchToJS(value: string | number): string {
  return typeof value === 'number' ? String(value) : value
}

function generateStyles(
  properties: Property[],
  tokens: TokenDefinition[],
  parentContext: ParentLayoutContext = { type: null }
): Record<string, string | number> {
  const style: Record<string, string | number> = {}
  const tokenMap = new Map<string, string | number | boolean>()

  // Slice 2 V-6: chain-resolver follows `$ref` indirections recursively
  // with a visited set (cycle-safe) and an 8-hop cap. Suffix-aware:
  // when resolving `big.gap: $base`, candidates are `base.gap` first,
  // `base` as fallback — matching the DOM-cascade semantics from Slice 24.
  const resolveTokenChain = (
    ownerName: string,
    rawValue: string | number | boolean,
    visited: Set<string> = new Set()
  ): string | number | boolean => {
    if (typeof rawValue !== 'string' || !rawValue.startsWith('$')) return rawValue
    if (visited.has(ownerName) || visited.size >= 8) return rawValue
    visited.add(ownerName)
    const refName = rawValue.slice(1)
    const dotIdx = ownerName.lastIndexOf('.')
    const ownerSuffix = dotIdx >= 0 ? ownerName.slice(dotIdx) : ''
    const candidates = ownerSuffix ? [refName + ownerSuffix, refName] : [refName]
    for (const cand of candidates) {
      const found = tokens.find(t => {
        const n = t.name.startsWith('$') ? t.name.slice(1) : t.name
        return n === cand
      })
      if (found?.value !== undefined) {
        return resolveTokenChain(cand, found.value, visited)
      }
    }
    return rawValue
  }

  for (const token of tokens) {
    // Skip tokens without a value (data objects)
    if (token.value === undefined) continue

    // Store with both formats for flexible lookup
    const nameWithoutPrefix = token.name.startsWith('$') ? token.name.slice(1) : token.name
    const nameWithPrefix = '$' + nameWithoutPrefix

    // Resolve nested token references — Slice 2 V-6: full suffix-aware chain.
    // Was 1-hop without suffix; failed for `big.gap: $base` where `base.gap`
    // is the actual target. Recursive resolver follows the chain transitively.
    const resolvedValue = resolveTokenChain(nameWithoutPrefix, token.value)

    tokenMap.set(nameWithoutPrefix, resolvedValue)
    tokenMap.set(nameWithPrefix, resolvedValue)
  }

  // Helper to resolve token references
  // Converts booleans to 0/1 for CSS compatibility
  const resolveFromMap = (
    result: string | number | boolean | undefined,
    fallback: string
  ): string | number => {
    if (result === undefined) return fallback
    if (typeof result === 'boolean') return result ? 1 : 0
    return result
  }

  // Append `px` to numeric values for CSS-pixel properties (gap, pad, w, h,
  // bor, rad, fs, …). The Mirror parser hands every numeric DSL literal in
  // as a STRING (`gap 12` → values: ["12"]), so the long-standing
  // `typeof value === 'number'` check never matched and React emitted
  // `gap: '12'` — invalid CSS the browser silently dropped. Slice 2 V-1.
  // Accepts already-suffixed values (`12px`, `100%`, `var(--…)`) verbatim,
  // and only px-ifies bare numerics.
  const NUMERIC_RE = /^-?\d+(?:\.\d+)?$/
  // Slice 2 V-7: multi-value-aware. CSS shorthands like `pad 8 16` and
  // `gap 12 8` (row-gap column-gap) hand multiple bare-numeric tokens through
  // the pipeline as a space-joined string after the React loop joins
  // `prop.values`. Each numeric part gets `px`-suffixed; non-numeric parts
  // (already-suffixed `12px`, `var(--…)`, percent) pass through verbatim.
  const pxify = (v: string | number | boolean | object): string | number => {
    if (typeof v === 'number') return `${v}px`
    if (typeof v === 'string') {
      const parts = v.split(/\s+/)
      if (parts.length > 1 && parts.every(p => NUMERIC_RE.test(p))) {
        return parts.map(p => `${p}px`).join(' ')
      }
      if (NUMERIC_RE.test(v)) return `${v}px`
    }
    return v as string | number
  }
  // `propertyName` lets the resolver apply the same suffix-mapping the IR
  // does (`gap $sp` with `sp.gap: 12` → look up `sp.gap` first, fall back
  // to `sp`). Without this, React emitted the raw `$sp` literal while the
  // DOM backend correctly resolved via `var(--sp-gap)`. Slice 2 V-2.
  const lookupWithSuffix = (
    cleanName: string,
    propertyName?: string
  ): string | number | boolean | undefined => {
    if (propertyName) {
      const suffix = getTokenSuffix(propertyName)
      if (suffix) {
        const suffixed = cleanName + suffix
        const hit = tokenMap.get(suffixed) ?? tokenMap.get('$' + suffixed)
        if (hit !== undefined) return hit
      }
    }
    return tokenMap.get(cleanName) ?? tokenMap.get('$' + cleanName)
  }
  const resolve = (
    value: string | number | boolean | object,
    propertyName?: string
  ): string | number => {
    // Handle TokenReference objects
    if (typeof value === 'object' && value !== null && 'name' in value) {
      const tokenName = (value as { name: string }).name
      const cleanName = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
      return resolveFromMap(lookupWithSuffix(cleanName, propertyName), `$${cleanName}`)
    }
    // Handle string token references
    if (typeof value === 'string' && value.startsWith('$')) {
      const cleanName = value.slice(1)
      return resolveFromMap(lookupWithSuffix(cleanName, propertyName), value)
    }
    if (typeof value === 'boolean') return value ? 1 : 0
    return value as string | number
  }

  // Slice 4 V-1: pre-scan for explicit `hor`/`ver` direction so 9-zone
  // aliases can be mapped direction-aware. The IR layout-transformer does
  // the same in two passes (collect direction first, then resolve
  // alignment); single-pass with a pre-scan keeps the React output cross-
  // backend-equivalent without restructuring the whole switch.
  const layoutDirection: 'row' | 'column' = (() => {
    for (const p of properties) {
      if (p.values.length === 0 || (p.values.length === 1 && p.values[0] === true)) {
        if (p.name === 'hor' || p.name === 'horizontal') return 'row'
        if (p.name === 'ver' || p.name === 'vertical') return 'column'
      }
    }
    return 'column'
  })()

  for (const prop of properties) {
    // Handle flag properties (no values) first
    if (prop.values.length === 0) {
      // Slice 4 V-1: 9-zone aliases (`tl`/`tc`/`tr`/`cl`/`cr`/`bl`/`bc`/`br`
      // + long forms `top-left`…`bottom-right` + `cen` alias for center).
      // Lookup-driven via `nineZoneToFlex` so the 18 aliases share the same
      // schema-side single-source-of-truth as the IR layout-transformer.
      const zoneFlex = nineZoneToFlex(prop.name, layoutDirection)
      if (zoneFlex) {
        style.display = 'flex'
        style.justifyContent = zoneFlex.justifyContent
        style.alignItems = zoneFlex.alignItems
        continue
      }
      // Slice 5 V-2: single-axis center keywords (`hor-center`/`ver-center`)
      // are direction-aware and pin EXACTLY ONE axis. Previously the React
      // backend had no case for them and silently dropped both keywords.
      const singleAxisFlex = singleAxisCenterToFlex(prop.name, layoutDirection)
      if (singleAxisFlex) {
        style.display = 'flex'
        style[singleAxisFlex.property] = singleAxisFlex.value
        continue
      }
      if (applyFlagProperty(prop.name, style)) continue
    }

    // Inline ternaries on style props (`Frame bg active ? #2271C1 : #333`)
    // arrive as Conditional objects in `values[0]`. React has no Mirror
    // runtime, so we statically resolve the branch using the
    // compile-time `tokens` map. Bare-identifier conditions look up the
    // token's truthiness; unresolvable conditions drop the property
    // (better than emitting `[object Object]` into the style sheet).
    // Skip `content` — text-content ternaries are rendered as JSX
    // expressions by `renderTextSlot` and read directly from `getTextContent`.
    const firstVal = prop.values[0] as unknown
    let effectiveValues = prop.values as unknown[]
    if (
      prop.name !== 'content' &&
      typeof firstVal === 'object' &&
      firstVal !== null &&
      'kind' in firstVal &&
      (firstVal as { kind?: string }).kind === 'conditional'
    ) {
      const cond = firstVal as unknown as {
        condition: string
        then: string | number
        else: string | number
      }
      const condId = cond.condition.trim()
      // Only static-resolve when the condition is a single bare identifier
      // pointing at a known data token (`active: true`).
      if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(condId) && tokenMap.has(condId)) {
        effectiveValues = [tokenMap.get(condId) ? cond.then : cond.else]
      } else {
        // Complex condition — drop the property silently. DOM resolves it
        // through its runtime; React would need eval to do the same.
        continue
      }
    }

    // Computed expressions (`w $project.progress + "%"`) carry a multi-part
    // Expression node. They typically reference loop variables or runtime
    // data the React backend can't statically evaluate. Drop the property
    // silently — better than `width: [object Object]` in the inline style.
    if (
      typeof firstVal === 'object' &&
      firstVal !== null &&
      'kind' in firstVal &&
      (firstVal as { kind?: string }).kind === 'expression'
    ) {
      continue
    }

    // Token references with dotted names that don't resolve (typically loop
    // variables: `bg $project.color` inside `each project in $projects`).
    // Without this guard, `resolve()` falls back to the literal source string,
    // producing `'$project.color'` as the CSS value. DOM resolves them at
    // runtime via `$get`; React has no runtime for loop scope, so drop them.
    //
    // Suffix-aware: a `gap $sp` reference may resolve via `sp.gap`. Treat
    // any token whose name starts with `<head>.` as a match too — only the
    // truly-orphaned head names are loop variables we can't statically
    // evaluate.
    if (
      typeof firstVal === 'object' &&
      firstVal !== null &&
      'kind' in firstVal &&
      (firstVal as { kind?: string }).kind === 'token'
    ) {
      const tokenName = (firstVal as unknown as { name: string }).name
      const head = tokenName.includes('.') ? tokenName.slice(0, tokenName.indexOf('.')) : tokenName
      const headExists = tokenMap.has(head) || tokenMap.has('$' + head)
      const suffixExists =
        !headExists &&
        Array.from(tokenMap.keys()).some(k => {
          const stripped = typeof k === 'string' && k.startsWith('$') ? k.slice(1) : k
          return typeof stripped === 'string' && stripped.startsWith(head + '.')
        })
      if (!headExists && !suffixExists) {
        continue
      }
    }

    // Gradient shorthand on bg / col: `bg grad #2271C1 #7c3aed`,
    // `bg grad-ver #f59e0b #ef4444`, `bg grad 45 #10b981 #2271C1`.
    // The IR's property-transformer handles this for the DOM backend;
    // React bypasses IR so we re-derive the same `linear-gradient(...)`
    // CSS here. Mirrors `compiler/ir/transformers/property-transformer.ts:118`.
    if (
      (prop.name === 'bg' ||
        prop.name === 'background' ||
        prop.name === 'col' ||
        prop.name === 'color' ||
        prop.name === 'c') &&
      effectiveValues.length >= 2 &&
      typeof effectiveValues[0] === 'string' &&
      (effectiveValues[0] === 'grad' || (effectiveValues[0] as string).startsWith('grad-'))
    ) {
      const gradType = effectiveValues[0] as string
      let angle = '90deg'
      let colorStart = 1
      if (gradType === 'grad-ver') {
        angle = '180deg'
      } else if (gradType === 'grad') {
        const maybeAngle = String(effectiveValues[1])
        if (/^\d+$/.test(maybeAngle)) {
          angle = `${maybeAngle}deg`
          colorStart = 2
        }
      }
      // Each color slot may be a literal hex (`#2271C1`), a TokenReference
      // (`$primary`), or a `$primary` source string. Resolve via the same
      // `resolve()` helper the rest of the switch uses so token-typed
      // gradient stops don't leak `[object Object]` into the CSS.
      const colors = effectiveValues
        .slice(colorStart)
        .map(v => String(resolve(v as string | number | boolean | object, prop.name)))
      if (colors.length >= 2) {
        const gradientValue = `linear-gradient(${angle}, ${colors.join(', ')})`
        const isTextGradient = prop.name === 'col' || prop.name === 'color' || prop.name === 'c'
        if (isTextGradient) {
          // Text-gradient pattern: paint via background, clip-to-text,
          // hide foreground color. Same fallback the DOM IR uses.
          style.background = gradientValue
          ;(style as Record<string, string | number>)['WebkitBackgroundClip'] = 'text'
          ;(style as Record<string, string | number>)['backgroundClip'] = 'text'
          style.color = 'transparent'
        } else {
          style.background = gradientValue
        }
        continue
      }
    }

    // Slice 2 V-7: multi-value-shorthand support — `pad 8 16` / `gap 12 8`
    // arrive as `values: ["8", "16"]` / `["12", "8"]`; join them as a single
    // space-separated string so `pxify` can multi-px-ify. Single values pass
    // through unchanged (no array wrapping). Token references and the like
    // are non-string objects — those bypass the join (only one value).
    const allBareStrings =
      effectiveValues.length > 1 && effectiveValues.every(v => typeof v === 'string')
    const rawValue = allBareStrings ? effectiveValues.join(' ') : effectiveValues[0]
    const value = resolve(rawValue as string | number | boolean | object, prop.name)

    // Slice 4 V-1: 9-zone aliases reach here as `values: [true]` (the parser
    // packs boolean flags this way). Same schema-side lookup as the
    // values.length===0 branch above so all 18 aliases share one path.
    if (prop.values.length === 1 && prop.values[0] === true) {
      const zoneFlex = nineZoneToFlex(prop.name, layoutDirection)
      if (zoneFlex) {
        style.display = 'flex'
        style.justifyContent = zoneFlex.justifyContent
        style.alignItems = zoneFlex.alignItems
        continue
      }
      // Slice 5 V-2: single-axis center keywords (mirror of the
      // values.length===0 branch).
      const singleAxisFlex = singleAxisCenterToFlex(prop.name, layoutDirection)
      if (singleAxisFlex) {
        style.display = 'flex'
        style[singleAxisFlex.property] = singleAxisFlex.value
        continue
      }
      // Most other flags reach here too — `italic`, `underline`, `truncate`,
      // `absolute`, `fixed`, `relative`, etc. The parser packs them as
      // `[true]` rather than empty values; route through the same dispatch
      // so layout/typography/position flags share one source of truth.
      if (applyFlagProperty(prop.name, style)) continue
    }

    switch (prop.name) {
      // Layout (with values - less common)
      case 'hor':
      case 'horizontal':
        style.display = 'flex'
        style.flexDirection = 'row'
        break
      case 'ver':
      case 'vertical':
        style.display = 'flex'
        style.flexDirection = 'column'
        break
      case 'wrap':
        style.flexWrap = 'wrap'
        break
      case 'spread':
        style.justifyContent = 'space-between'
        break

      // Alignment
      case 'left':
        style.justifyContent = 'flex-start'
        break
      case 'right':
        style.justifyContent = 'flex-end'
        break
      case 'top':
        style.alignItems = 'flex-start'
        break
      case 'bottom':
        style.alignItems = 'flex-end'
        break

      // Spacing
      case 'gap':
      case 'g':
        style.gap = pxify(value)
        break
      // Slice 2 V-5: gap-x/gap-y were previously dropped silently — DOM
      // emitted column-gap/row-gap correctly via the IR layout-transformer,
      // React's switch-case had no entry. Designers writing `Frame hor,
      // gap-x 16` saw the right preview in Studio (DOM) but the React
      // export lost the property. Now both axes emit independently;
      // CSS handles the merge with unified `gap` correctly (column-gap
      // / row-gap override the unified gap per axis).
      case 'gap-x':
      case 'gx':
        style.columnGap = pxify(value)
        break
      case 'gap-y':
      case 'gy':
        style.rowGap = pxify(value)
        break
      case 'pad':
      case 'padding':
      case 'p':
        style.padding = pxify(value)
        break
      case 'margin':
      case 'mar':
      case 'm':
        style.margin = pxify(value)
        break

      // Directional padding/margin shortcuts. Mirror exposes -x, -y plus
      // -t/-r/-b/-l aliases (CLAUDE.md: `pad-x N` = horizontal,
      // `pad-y N` = vertical, `pad-t` etc.). Schema-side longhand names
      // (`pad-top`, `padding-top`, …) are not in the DSL — only the
      // 4-character abbreviations.
      case 'pad-x':
      case 'px':
        style.paddingLeft = pxify(value)
        style.paddingRight = pxify(value)
        break
      case 'pad-y':
      case 'py':
        style.paddingTop = pxify(value)
        style.paddingBottom = pxify(value)
        break
      case 'pad-t':
      case 'pt':
        style.paddingTop = pxify(value)
        break
      case 'pad-r':
      case 'pr':
        style.paddingRight = pxify(value)
        break
      case 'pad-b':
      case 'pb':
        style.paddingBottom = pxify(value)
        break
      case 'pad-l':
      case 'pl':
        style.paddingLeft = pxify(value)
        break
      case 'mar-x':
      case 'mx':
        style.marginLeft = pxify(value)
        style.marginRight = pxify(value)
        break
      case 'mar-y':
      case 'my':
        style.marginTop = pxify(value)
        style.marginBottom = pxify(value)
        break
      case 'mar-t':
      case 'mt':
        style.marginTop = pxify(value)
        break
      case 'mar-r':
      case 'mr':
        style.marginRight = pxify(value)
        break
      case 'mar-b':
      case 'mb':
        style.marginBottom = pxify(value)
        break
      case 'mar-l':
      case 'ml':
        style.marginLeft = pxify(value)
        break

      // Slice 6 V-1: CSS Grid container. `Frame grid 12` → display: grid +
      // grid-template-columns: repeat(12, 1fr). Mirror's `grid auto N` shape
      // (`Frame grid auto 250`) compiles to `repeat(auto-fill, minmax(Npx,
      // 1fr))` — but the React parser hands those as separate values
      // (`['auto', '250']`); only the resolved number lands in `value`
      // here, so we look at the raw `prop.values` to detect the form.
      case 'grid': {
        style.display = 'grid'
        const v0 = prop.values[0]
        const v1 = prop.values[1]
        if (typeof v0 === 'string' && v0 === 'auto') {
          if (typeof v1 === 'string' && /^\d+$/.test(v1)) {
            style.gridTemplateColumns = `repeat(auto-fill, minmax(${v1}px, 1fr))`
          }
          // Bare `grid auto` without size → display only (matches DOM)
        } else {
          // Numeric form: `grid 12` → repeat(12, 1fr).
          const numStr = String(value)
          if (/^\d+$/.test(numStr) && Number(numStr) > 0) {
            style.gridTemplateColumns = `repeat(${value}, 1fr)`
          } else if (typeof value === 'string' && value.startsWith('var(')) {
            // Token already resolved to var(--foo-grid). Wrap in repeat()
            // so the CSS-var carries the column count.
            style.gridTemplateColumns = `repeat(${value}, 1fr)`
          }
        }
        break
      }
      // Slice 6 V-1: row-height for grid auto-rows.
      case 'row-height':
      case 'rh':
        style.gridAutoRows = pxify(value)
        break
      // Slice 6 V-1: dense packing for grid-auto-flow.
      case 'dense':
        style.gridAutoFlow = 'dense'
        break

      // Size. Slice 6 V-2: in grid-parent context, numeric `w`/`h` are
      // column/row spans, not pixel widths. Mirrors the IR's
      // `parentLayoutContext?.type === 'grid'` branch in
      // `compiler/ir/transformers/property-transformer.ts:431-454`.
      case 'w':
      case 'width':
        if (value === 'full') {
          style.width = '100%'
        } else if (value === 'hug') {
          style.width = 'fit-content'
        } else if (
          parentContext.type === 'grid' &&
          /^\d+$/.test(String(value)) &&
          Number(value) > 0
        ) {
          style.gridColumnEnd = `span ${value}`
          style.width = '100%'
        } else {
          style.width = pxify(value)
        }
        break
      case 'h':
      case 'height':
        if (value === 'full') {
          style.height = '100%'
        } else if (value === 'hug') {
          style.height = 'fit-content'
        } else if (
          parentContext.type === 'grid' &&
          /^\d+$/.test(String(value)) &&
          Number(value) > 0
        ) {
          style.gridRowEnd = `span ${value}`
          style.height = '100%'
        } else {
          style.height = pxify(value)
        }
        break
      // Slice 6 V-2: `x N` and `y N` are context-dependent. Inside a grid
      // parent → grid-column-start / grid-row-start. Outside grid → absolute
      // positioning with left/top (matches DOM-IR
      // property-transformer.ts:394-424).
      case 'x':
        if (parentContext.type === 'grid' && /^-?\d+$/.test(String(value))) {
          style.gridColumnStart = String(value)
        } else {
          style.position = 'absolute'
          style.left = pxify(value)
        }
        break
      case 'y':
        if (parentContext.type === 'grid' && /^-?\d+$/.test(String(value))) {
          style.gridRowStart = String(value)
        } else {
          style.position = 'absolute'
          style.top = pxify(value)
        }
        break

      case 'minw':
      case 'min-width':
        style.minWidth = pxify(value)
        break
      case 'maxw':
      case 'max-width':
        style.maxWidth = pxify(value)
        break
      case 'minh':
      case 'min-height':
        style.minHeight = pxify(value)
        break
      case 'maxh':
      case 'max-height':
        style.maxHeight = pxify(value)
        break

      // Colors
      case 'col':
      case 'color':
      case 'c':
        style.color = String(value)
        break
      case 'bg':
      case 'background':
        style.backgroundColor = String(value)
        break

      // Border
      case 'bor':
      case 'border':
        // bor wants `<n>px solid` — pxify alone wouldn't add the solid keyword.
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.border = `${value}px solid`
        } else {
          style.border = String(value)
        }
        break
      case 'boc':
      case 'border-color':
        style.borderColor = String(value)
        break

      // Directional border-width shortcuts. `bor-t 2` → border-top-width: 2px
      // + a `solid` style so the rule renders without `border-style`. The DOM
      // IR uses individual `border-{side}-width` + global `border-style`;
      // we mirror that by setting `borderTopStyle: 'solid'` (etc.) too.
      case 'bor-t':
      case 'bort':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderTopWidth = `${value}px`
          style.borderTopStyle = 'solid'
        }
        break
      case 'bor-r':
      case 'borr':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderRightWidth = `${value}px`
          style.borderRightStyle = 'solid'
        }
        break
      case 'bor-b':
      case 'borb':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderBottomWidth = `${value}px`
          style.borderBottomStyle = 'solid'
        }
        break
      case 'bor-l':
      case 'borl':
        if (typeof value === 'number' || (typeof value === 'string' && NUMERIC_RE.test(value))) {
          style.borderLeftWidth = `${value}px`
          style.borderLeftStyle = 'solid'
        }
        break

      case 'rad':
      case 'radius':
        style.borderRadius = pxify(value)
        break

      // Typography
      case 'font-size':
      case 'fs':
        style.fontSize = pxify(value)
        break
      case 'weight':
        style.fontWeight = value
        break
      case 'font':
        style.fontFamily = String(value)
        break
      case 'line':
      case 'line-height':
        style.lineHeight = value
        break

      // Visual
      case 'opacity':
      case 'o':
        style.opacity = value
        break
      case 'cursor':
        style.cursor = String(value)
        break
      case 'overflow':
        style.overflow = String(value)
        break
      case 'scroll':
        style.overflowY = 'auto'
        break
      case 'hidden':
        style.display = 'none'
        break

      // Device size presets: `Frame device mobile` → 375×812. Mirrors the
      // IR's properties-ops.ts `getDevicePreset` expansion. An explicit
      // `w`/`h` after `device` still wins because it gets emitted later
      // in the switch and overwrites the values set here.
      case 'device': {
        const preset = getDevicePreset(String(value))
        if (preset) {
          style.width = `${preset.width}px`
          style.height = `${preset.height}px`
        }
        break
      }

      // Animations: `Frame anim spin` → `animation: 'mirror-spin …'`.
      // The corresponding `@keyframes mirror-spin` rules are emitted as
      // a single `<style>` block at the top of App() — see
      // `containsAnimUsage` + `MIRROR_ANIMATION_STYLE_BLOCK`.
      case 'anim':
      case 'animation':
        style.animation = animationShorthand(String(value))
        break

      // Transforms: combine when multiple are present so `Frame rotate 45,
      // scale 1.2` emits `transform: rotate(45deg) scale(1.2)`. Mirrors the
      // DOM IR's TransformAccumulator semantics — single `transform` value
      // with all parts space-joined in declaration order.
      case 'rotate':
      case 'rot': {
        const deg = String(value)
        const part = `rotate(${deg}deg)`
        style.transform = style.transform ? `${style.transform} ${part}` : part
        break
      }
      case 'scale': {
        const part = `scale(${String(value)})`
        style.transform = style.transform ? `${style.transform} ${part}` : part
        break
      }

      // Aspect ratio: keywords `square`/`video` plus raw `N/M` or `N`.
      // Mirrors the DOM IR's aspect-ratio handling.
      case 'aspect': {
        const map: Record<string, string> = { square: '1', video: '16/9' }
        const v = String(value)
        style.aspectRatio = map[v] ?? v
        break
      }

      // Blur effects: numeric values get `px`; pre-suffixed strings pass through.
      case 'blur': {
        const v = String(value)
        const px = /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v
        style.filter = `blur(${px})`
        break
      }
      case 'backdrop-blur':
      case 'blur-bg': {
        const v = String(value)
        const px = /^\d+(\.\d+)?$/.test(v) ? `${v}px` : v
        style.backdropFilter = `blur(${px})`
        ;(style as Record<string, string | number>)['WebkitBackdropFilter'] = `blur(${px})`
        break
      }

      // Box-shadow keyword presets: sm / md / lg map to standard depths.
      case 'shadow': {
        const v = String(value)
        const presets: Record<string, string> = {
          sm: '0 1px 2px rgba(0,0,0,0.1)',
          md: '0 4px 6px rgba(0,0,0,0.15)',
          lg: '0 10px 25px rgba(0,0,0,0.2)',
        }
        style.boxShadow = presets[v] ?? v
        break
      }

      // Stack order.
      case 'z':
      case 'z-index':
        style.zIndex = value
        break

      // Text alignment + decoration values.
      case 'text-align':
      case 'align-text':
        style.textAlign = String(value)
        break
    }
  }

  // Slice 7 V-3 (B-4): when both `grid` and `hor`/`ver` are set on a
  // container, the switch-cases above both write `display`. The
  // outcome depends on property order — either case leaves an
  // inconsistent style object: `display: flex + gridTemplateColumns`
  // (grid CSS without grid display, ignored by browser) or
  // `display: grid + flexDirection` (flex axis ignored). Force grid to
  // win when both signals are present: DOM-IR (layout-transformer.ts)
  // already emits `grid-auto-flow: row/column` instead of
  // `flexDirection`, and Validator E110 catches the conflict —
  // defensive React output keeps backends symmetric when validation is
  // skipped.
  if (style.gridTemplateColumns) {
    style.display = 'grid'
    if (style.flexDirection === 'row') style.gridAutoFlow = 'row'
    else if (style.flexDirection === 'column') style.gridAutoFlow = 'column'
    delete style.flexDirection
  }

  // Token-leak guard. If a style value is still a literal `$token` string,
  // that means the suffix-aware lookup couldn't resolve it (e.g.
  // `boc $accent` when only `accent.bg` and `accent.col` are defined —
  // `accent.boc` doesn't exist, and there's no plain `accent` value
  // either). The DOM backend silently drops such props because there's
  // no `var(--accent-boc)` either. Mirror that here instead of leaking
  // the literal `'$accent'` into the inline style — that string would
  // render as an invalid CSS value the browser ignores anyway, and it
  // confuses anyone reading the generated React.
  for (const k of Object.keys(style)) {
    const v = style[k]
    if (typeof v === 'string' && v.startsWith('$')) delete style[k]
  }

  return style
}

/**
 * Single-source-of-truth for flag-style Mirror properties (no value, or
 * `[true]`). Returns true when the name was recognized and a style was
 * applied so the caller can `continue` past the value-bearing pipeline.
 *
 * The parser produces both empty-values and `[true]`-values shapes for
 * flags depending on context, so the calling switch in `generateStyles`
 * routes both forms through here to keep one definition per CSS effect.
 * 9-zone and single-axis-center aliases stay at the call site since they
 * need the layout-direction context that flows from a sibling `hor`/`ver`.
 */
function applyFlagProperty(name: string, style: Record<string, string | number>): boolean {
  switch (name) {
    case 'hor':
    case 'horizontal':
      style.display = 'flex'
      style.flexDirection = 'row'
      return true
    case 'ver':
    case 'vertical':
      style.display = 'flex'
      style.flexDirection = 'column'
      return true
    case 'spread':
      style.justifyContent = 'space-between'
      return true
    case 'wrap':
      style.flexWrap = 'wrap'
      return true

    // Overflow.
    case 'scroll':
    case 'scroll-ver':
      style.overflowY = 'auto'
      return true
    case 'scroll-hor':
      style.overflowX = 'auto'
      return true
    case 'scroll-both':
      style.overflow = 'auto'
      return true
    case 'clip':
      style.overflow = 'hidden'
      return true

    // Visibility.
    case 'hidden':
      style.display = 'none'
      return true
    case 'visible':
      style.display = 'flex'
      return true

    // Position.
    case 'absolute':
    case 'abs':
      style.position = 'absolute'
      return true
    case 'fixed':
      style.position = 'fixed'
      return true
    case 'relative':
      style.position = 'relative'
      return true

    // Stacked overlay container — children with `x`/`y`/`abs` anchor
    // against this Frame. DOM IR emits `position: relative` for the
    // same reason; without it, absolute children jump to the viewport.
    case 'stacked':
      style.position = 'relative'
      return true

    // Typography flags.
    case 'italic':
      style.fontStyle = 'italic'
      return true
    case 'underline':
      style.textDecoration = 'underline'
      return true
    case 'uppercase':
      style.textTransform = 'uppercase'
      return true
    case 'lowercase':
      style.textTransform = 'lowercase'
      return true
    case 'truncate':
      // Triplet matches DOM IR's ellipsis-truncation output.
      style.overflow = 'hidden'
      style.textOverflow = 'ellipsis'
      style.whiteSpace = 'nowrap'
      return true

    // Flex-child shorthand flags.
    case 'grow':
      style.flexGrow = 1
      return true
    case 'shrink':
      style.flexShrink = 1
      return true

    default:
      return false
  }
}

function formatStyleObject(style: Record<string, string | number>): string {
  const entries = Object.entries(style)
  if (entries.length === 0) return '{}'

  const parts = entries.map(([key, value]) => {
    const formattedValue = typeof value === 'string' ? `'${value}'` : value
    return `${key}: ${formattedValue}`
  })

  return `{ ${parts.join(', ')} }`
}

/**
 * Convert a JS-style record (`{ backgroundColor: '#555', fontSize: 18 }`) to
 * a CSS declaration string (`background-color: #555; font-size: 18;`).
 * Used to emit pseudo-class state rules (`:hover`, `:focus`, …) in a real
 * stylesheet — JSX `style={{ }}` doesn't support pseudo-selectors. Numeric
 * values flow through unchanged; React's px-conversion already happened
 * upstream in `generateStyles`.
 */
function formatStyleAsCSS(style: Record<string, string | number>): string {
  const parts: string[] = []
  for (const [key, value] of Object.entries(style)) {
    // camelCase → kebab-case, but keep `--custom-prop` intact.
    let cssKey: string
    if (key.startsWith('--')) {
      cssKey = key
    } else if (key.startsWith('Webkit') || key.startsWith('Moz') || key.startsWith('Ms')) {
      // Vendor prefixes: Webkit → -webkit-
      cssKey =
        '-' + key[0].toLowerCase() + key.slice(1).replace(/[A-Z]/g, m => '-' + m.toLowerCase())
    } else {
      cssKey = key.replace(/[A-Z]/g, m => '-' + m.toLowerCase())
    }
    parts.push(`${cssKey}: ${value}`)
  }
  return parts.join('; ')
}

/**
 * Accumulator for pseudo-class CSS rules emitted during the React tree
 * walk. `[data-h="N"]:hover { … }` rules need to live in a stylesheet
 * (JSX inline `style` can't carry pseudo-selectors), so we collect them
 * as we walk and emit a single `<style>` block at the top of `App()`.
 */
interface ReactStateContext {
  rules: string[]
  counter: { value: number }
}

/**
 * Detect system-state blocks (`hover:`, `focus:`, `active:`, `disabled:`)
 * on a resolved component, plus shorthand `hover-X` / `focus-X` /
 * `active-X` / `disabled-X` properties on the instance/component. Returns
 * a per-state property list; empty if there's nothing to emit.
 */
function collectStateGroups(
  compDef: ComponentDefinition | undefined,
  allProps: Property[]
): Array<{ state: string; properties: Property[] }> {
  const SYSTEM_STATES = ['hover', 'focus', 'active', 'disabled'] as const
  const groups: Record<string, Property[]> = {}

  // 1) State blocks from the component definition (`hover: bg #555`).
  for (const s of compDef?.states ?? []) {
    if (!SYSTEM_STATES.includes(s.name as (typeof SYSTEM_STATES)[number])) continue
    if (s.properties && s.properties.length > 0) {
      ;(groups[s.name] ??= []).push(...s.properties)
    }
  }

  // 2) Shorthand props on the instance/component (`hover-bg #555`,
  //    `focus-boc #2271C1`, `active-opacity 0.8`, `disabled-opa 0.5`).
  for (const p of allProps) {
    for (const state of SYSTEM_STATES) {
      const prefix = `${state}-`
      if (p.name.startsWith(prefix)) {
        const stripped = p.name.slice(prefix.length)
        ;(groups[state] ??= []).push({
          ...p,
          name: stripped,
        } as Property)
        break
      }
    }
  }

  return Object.entries(groups)
    .filter(([, props]) => props.length > 0)
    .map(([state, properties]) => ({ state, properties }))
}
