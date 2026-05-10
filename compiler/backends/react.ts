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
  Each,
  ConditionalNode,
} from '../parser/ast'
import { ANIMATION_KEYFRAMES_CSS } from './animations'
import {
  collectNamedInstances,
  containsAnimUsage,
  containsChartInstance,
  containsIconInstance,
} from './react/ops/layout'
import { MIRROR_CHART_COMPONENT } from './react/ops/chart'
import { MIRROR_ICON_COMPONENT } from './react/ops/icon'
import { dataAttributesToJSObject } from './react/ops/attributes'
import type { ReactStateContext } from './react/ops/style'
import { generateConditionalJSX, generateEachJSX, generateJSX } from './react/ops/jsx'

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
        // DatePicker is the only Zag component left in Mirror (every
        // other former Zag component is now a Pure-Mirror template).
        // Pre-2026-05-10 React simply emitted a `not supported` comment,
        // making DatePicker invisible in any React export. Surface it as
        // a native `<input type="date">` with the documented attributes
        // mapped — placeholder, defaultValue, min/max, readOnly, disabled.
        // Range mode falls through to the comment placeholder for now.
        // Range mode (`DatePicker selectionMode range`) parses as
        // `initialState: "range"` due to a parser quirk — fall through
        // to the placeholder for now since range needs two inputs.
        const isRangeMode =
          (instance as { initialState?: string }).initialState === 'range' ||
          ((instance as { properties?: Property[] }).properties ?? []).some(
            p => p.name === 'selectionMode' && p.values[0] === 'range'
          )
        if (
          (instance as { type?: string }).type === 'ZagComponent' &&
          (instance as { machine?: string }).machine === 'date-picker' &&
          !isRangeMode
        ) {
          const props = (instance as { properties?: Property[] }).properties ?? []
          const attrs: string[] = ['type="date"']
          for (const p of props) {
            const v = typeof p.values[0] === 'string' ? p.values[0] : null
            if (v == null) {
              if (p.name === 'disabled') attrs.push('disabled')
              else if (p.name === 'readOnly' || p.name === 'readonly') attrs.push('readOnly')
              continue
            }
            if (p.name === 'placeholder') attrs.push(`placeholder=${JSON.stringify(v)}`)
            else if (p.name === 'min') attrs.push(`min=${JSON.stringify(v)}`)
            else if (p.name === 'max') attrs.push(`max=${JSON.stringify(v)}`)
            else if (p.name === 'value' || p.name === 'defaultValue')
              attrs.push(`defaultValue=${JSON.stringify(v)}`)
          }
          attrs.push('data-component="DatePicker"')
          attrs.push('data-mirror-name="DatePicker"')
          rootItems.push({
            kind: 'jsx',
            code: `      <input ${attrs.join(' ')} />`,
          })
          continue
        }
        const skipped = (instance as { type?: string }).type ?? 'Unknown'
        rootItems.push({
          kind: 'comment',
          code: `      {/* ${skipped} not supported in React backend */}`,
        })
        continue
      }
      const code = generateJSX(
        instance as Instance,
        componentMap,
        program.tokens || [],
        propertySetMap,
        rootItems.length === 0 && program.instances.length === 1 ? '    ' : '      ',
        { type: null },
        stateContext
      )
      // Visible-when wrap (`{cond ? <jsx /> : null}`) makes the root
      // item a JS expression, not a plain JSX element. Mark accordingly
      // so the top-level Fragment wrap kicks in — `return ({cond ? ... :
      // null})` is invalid otherwise.
      const startsWithExpr = /^\s*\{/.test(code)
      rootItems.push({ kind: startsWithExpr ? 'expr' : 'jsx', code })
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
