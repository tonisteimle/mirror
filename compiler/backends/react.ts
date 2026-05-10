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
} from '../parser/ast'
import { expandPropertySets } from '../ir/transformers/property-set-expander'
import { isLayoutPrimitive } from '../schema/dsl'
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

  // Generate CSS variables from tokens
  if (includeTokens && program.tokens && program.tokens.length > 0) {
    lines.push(`// Design Tokens`)
    lines.push(`const tokens = {`)
    for (const token of program.tokens) {
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

  // Generate main App component
  lines.push(`export default function App() {`)
  if (hasNamedInstances) {
    lines.push(`  // Mirror element registry — populated via callback refs as nodes mount.`)
    lines.push(`  // Mirrors the DOM backend's _elements lookup so cross-element state refs`)
    lines.push(`  // (e.g. \`MenuBtn.open: visible\`) work identically across both backends.`)
    lines.push(`  const _elements = React.useRef<Record<string, HTMLElement | null>>({})`)
    lines.push(``)
  }
  lines.push(`  return (`)

  // Generate JSX for each root instance
  if (program.instances && program.instances.length > 0) {
    for (const instance of program.instances) {
      // Skip Slot primitives in React output (they're only for visual editor)
      if (instance.type === 'Slot') continue
      // Skip Table for now - not yet supported in React backend
      if (instance.type === 'Table') continue
      // Skip Each / Conditional / ZagComponent / etc. — the static React
      // backend supports only plain Instance trees. Without this guard,
      // generateJSX would try to read `.properties` on a node that doesn't
      // have it and throw TypeError.
      if ((instance as { type: string }).type !== 'Instance') {
        // Emit a comment so the user sees what was skipped.
        const skipped = (instance as { type?: string }).type ?? 'Unknown'
        lines.push(`    {/* ${skipped} not supported in React backend */}`)
        continue
      }
      const jsx = generateJSX(
        instance as Instance,
        componentMap,
        program.tokens || [],
        propertySetMap,
        '    '
      )
      lines.push(jsx)
    }
  } else {
    lines.push(`    <div />`)
  }

  lines.push(`  )`)
  lines.push(`}`)
  lines.push(``)

  return lines.join('\n')
}

/**
 * Layout-context for grid-vs-flex parent discrimination.
 *
 * Slice 6 V-2: Mirror's `x`/`y`/`w`/`h` semantics depend on whether the
 * parent is a CSS-Grid or a flex container. The DOM backend gets this
 * via the IR's `parentLayoutContext` (see `property-transformer.ts:394`);
 * the React backend bypasses the IR, so we walk the JSX tree manually
 * and pass the parent's layout-type down to children.
 */
type ParentLayoutContext = { type: 'grid' | 'flex' | null }

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
  parentContext: ParentLayoutContext = { type: null }
): string {
  // Resolve component definition
  const compDef = components.get(instance.component)

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
  const allProps = [...expandedComp, ...expandedInst]

  // Slice 6 V-2: detect THIS instance's layout-context to inform its
  // children. Children of a `grid N` parent get `parentContext.type='grid'`,
  // which switches their `x`/`y`/`w`/`h` interpretation from
  // absolute/transform/numeric-px to grid-column-start/grid-row-start/
  // grid-column-end-span/grid-row-end-span.
  const ownLayoutContext = detectLayoutContext(allProps)

  // Generate style object. Layout primitives (Frame/Box and the table family)
  // get the same flex-column defaults the DOM backend's IR transformer
  // injects — without these the React render is an unstyled `<div />` while
  // the DOM render is a properly-laid-out flex container.
  const style = withLayoutDefaults(
    generateStyles(allProps, tokens, parentContext),
    instance.component
  )
  const styleStr = Object.keys(style).length > 0 ? ` style={${formatStyleObject(style)}}` : ''

  // HTML attributes from properties (placeholder, type, href, src, etc.)
  const attrStr = generateHtmlAttributes(allProps)

  // Mirror data-* attributes (component, mirror-name, mirror-id, state).
  // Mirrors what the DOM backend emits via dataset.* so studio/editor
  // tooling can resolve elements identically across both targets.
  const mirrorAttrStr = generateMirrorAttributes(instance)

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

  // Has children?
  const hasChildren = instance.children.length > 0 || textContent

  if (!hasChildren) {
    return `${indent}<${tag}${attrStr}${mirrorAttrStr}${refStr}${styleStr} />`
  }

  const lines: string[] = []
  lines.push(`${indent}<${tag}${attrStr}${mirrorAttrStr}${refStr}${styleStr}>`)

  // Add text content
  if (textContent) {
    // Use curly braces for JSX text to avoid escaping issues
    lines.push(`${indent}  {${JSON.stringify(textContent)}}`)
  }

  // Add children. Slice 6 V-2: pass own layout-context so grid-children
  // resolve `x`/`y`/`w`/`h` to grid-positioning instead of absolute/numeric.
  for (const child of instance.children) {
    if (child.type === 'Instance') {
      lines.push(
        generateJSX(child, components, tokens, propertySetMap, indent + '  ', ownLayoutContext)
      )
    } else if (child.type === 'Text') {
      lines.push(`${indent}  {${JSON.stringify(child.content)}}`)
    }
  }

  lines.push(`${indent}</${tag}>`)

  return lines.join('\n')
}

function getHtmlTag(componentName: string, compDef?: ComponentDefinition): string {
  // Direct primitive name lookup (when used as instance without component def)
  const primitiveTagMap: Record<string, string> = {
    Frame: 'div',
    Box: 'div',
    Text: 'span',
    Button: 'button',
    Input: 'input',
    Textarea: 'textarea',
    Image: 'img',
    Img: 'img',
    Icon: 'span',
    Link: 'a',
    Divider: 'hr',
    Spacer: 'div',
    Header: 'header',
    Nav: 'nav',
    Main: 'main',
    Section: 'section',
    Article: 'article',
    Aside: 'aside',
    Footer: 'footer',
    H1: 'h1',
    H2: 'h2',
    H3: 'h3',
    H4: 'h4',
    H5: 'h5',
    H6: 'h6',
  }
  if (primitiveTagMap[componentName]) return primitiveTagMap[componentName]

  // Check primitive type from component definition
  const primitive = compDef?.primitive?.toLowerCase()

  if (primitive === 'button') return 'button'
  if (primitive === 'input') return 'input'
  if (primitive === 'textarea') return 'textarea'
  if (primitive === 'image') return 'img'
  if (primitive === 'link') return 'a'
  if (primitive === 'text') return 'span'

  // Default based on common names
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
  if (!isLayoutPrimitive(componentName)) return style
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
  if (merged.flexDirection === undefined) merged.flexDirection = 'column'
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

function getTextContent(instance: Instance, properties: Property[]): string | null {
  // Check for content property
  for (const prop of properties) {
    if (prop.name === 'content' && prop.values.length > 0 && typeof prop.values[0] === 'string')
      return prop.values[0]
  }
  // Check for text child
  for (const child of instance.children) {
    if (child.type === 'Text') return child.content
  }
  return null
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
      switch (prop.name) {
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
        case 'spread':
          style.justifyContent = 'space-between'
          break
        case 'wrap':
          style.flexWrap = 'wrap'
          break
        case 'scroll':
          style.overflowY = 'auto'
          break
        case 'hidden':
          style.display = 'none'
          break
      }
      continue
    }

    // Slice 2 V-7: multi-value-shorthand support — `pad 8 16` / `gap 12 8`
    // arrive as `values: ["8", "16"]` / `["12", "8"]`; join them as a single
    // space-separated string so `pxify` can multi-px-ify. Single values pass
    // through unchanged (no array wrapping). Token references and the like
    // are non-string objects — those bypass the join (only one value).
    const allBareStrings = prop.values.length > 1 && prop.values.every(v => typeof v === 'string')
    const rawValue = allBareStrings ? prop.values.join(' ') : prop.values[0]
    const value = resolve(rawValue, prop.name)

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
    }
  }

  return style
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
