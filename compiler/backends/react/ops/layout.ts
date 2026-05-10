/**
 * React backend — Layout & Component cluster (Slice 1 of react-backend-decomp).
 *
 * Pure tree-walks and tag/layout-resolution helpers. No JSX emission, no
 * style emission — just observers / classifiers that the rest of the
 * backend consults before deciding what to render.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-identical
 * to the pre-extraction call sites; only the file location moves.
 */

import type { ComponentDefinition, Property } from '../../../parser/ast'
import { isContainer as isContainerPrimitive } from '../../../schema/layout-defaults'
import { getHtmlTag as schemaGetHtmlTag, isKnownPrimitive } from '../../../schema/ir-helpers'
import { matchesCanonical } from '../../../schema/parser-helpers'

/**
 * Tracks the layout context a child should inherit from its parent. The
 * React backend bypasses the IR, so we walk the JSX tree manually and
 * pass the parent's layout-type down to children. The DOM/Framework
 * backends get the same effect through the IR layout-transformer.
 */
export type ParentLayoutContext = {
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
 * Chart-primitive component names recognised by the React backend.
 * Used both by the icon/chart presence walks (to gate emission of the
 * MirrorChart runtime component) and by `generateJSX` (to dispatch into
 * `generateChartJSX`).
 */
export const CHART_PRIMITIVE_NAMES: ReadonlySet<string> = new Set([
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
 * Slice 50 V-2: Walk the instance tree to detect any `Icon` usage.
 * If none present we skip emitting the MirrorIcon component definition
 * (keeps simple Mirror programs lean).
 */
export function containsIconInstance(instances: ReadonlyArray<unknown>): boolean {
  for (const inst of instances) {
    const node = inst as { type?: string; component?: string; children?: unknown[] }
    if (node.type === 'Instance' && node.component === 'Icon') return true
    if (node.children && containsIconInstance(node.children)) return true
  }
  return false
}

/**
 * Walk for any Chart-primitive instance (`Line`, `Bar`, `Pie`, `Donut`,
 * `Area`, `Scatter`, `Radar`, or unified `Chart`). Used to gate emission
 * of the MirrorChart component definition + Chart.js CDN loader.
 */
export function containsChartInstance(nodes: ReadonlyArray<unknown>): boolean {
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
export function containsAnimUsage(nodes: ReadonlyArray<unknown>): boolean {
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
        if (p.name && matchesCanonical(p.name, 'animation')) return true
      }
    }
    if (node.children && containsAnimUsage(node.children)) return true
    if (node.then && containsAnimUsage(node.then)) return true
    if (node.else && containsAnimUsage(node.else)) return true
  }
  return false
}

/**
 * Detect a Frame's own layout-type from its properties — used to inform
 * its CHILDREN about their parent's layout context. Same heuristic as
 * the IR layout-transformer: `grid` property = grid container; `hor`/
 * `ver`/`wrap`/`spread`/`center`/etc = flex container; otherwise the
 * default flex-column kicks in via `withLayoutDefaults`.
 */
export function detectLayoutContext(props: Property[]): ParentLayoutContext {
  for (const p of props) {
    if (p.name === 'grid') return { type: 'grid' }
  }
  return { type: 'flex' } // Frame default is flex; children inherit flex-context
}

/**
 * Resolve the HTML tag a Mirror component should compile to. Three cascading
 * rules:
 *   1. `Btn as Button: ...` — compDef.primitive carries the explicit tag.
 *   2. Direct primitive name (`Frame`, `Icon`, `H1`, …) — DSL schema lookup.
 *   3. Semantic-name heuristic for user components without `as` (`Sidebar`
 *      → `<aside>`, `MyHeader` → `<header>`).
 */
export function getHtmlTag(componentName: string, compDef?: ComponentDefinition): string {
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
 * Walk the instance tree and collect every `Instance.name` (instance name
 * set via `Element name X` in the DSL). Used by `generateReact` to decide
 * whether to declare the `_elements` registry useRef at the top of the
 * generated App component. Slice 1 Phase B.4.
 */
export function collectNamedInstances(roots: ReadonlyArray<unknown>): string[] {
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
export function withLayoutDefaults(
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
