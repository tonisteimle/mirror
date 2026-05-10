/**
 * React backend — JSX cluster (Slice 7 of react-backend-decomp).
 *
 * The JSX builder: walks the AST tree and emits a JSX string per node.
 *
 * Exports:
 *   generateJSX           — main per-instance builder. Dispatches Icon/
 *                           Chart primitives to their cluster emitters,
 *                           merges property-sets + state-init + slot-
 *                           fills, generates inline-style + state-block
 *                           rules, and recurses into children.
 *   generateEachJSX       — `each task in $tasks` → JSX `.map()` with
 *                           Array.isArray/Object.values coercion, filter,
 *                           orderBy, named-index.
 *   generateConditionalJSX — `if cond` / `else` → JSX `{cond ? (…) : (…)}`.
 *   wrapWithVisibility    — wrap a JSX block with `{cond ? (jsx) : null}`
 *                           when the source carries a `visibleWhen`.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type {
  Instance,
  ComponentDefinition,
  Property,
  TokenDefinition,
  Each,
  ConditionalNode,
} from '../../../parser/ast'
import { isText } from '../../../parser/ast'
import { expandPropertySets } from '../../../ir/transformers/property-set-expander'
import { resolveComponent } from '../../../ir/transformers/component-resolver'
import { mergeSlotPropertiesIntoFiller } from '../../../ir/transformers/slot-utils'
import { isLayoutPrimitive } from '../../../schema/dsl'
import {
  type ParentLayoutContext,
  CHART_PRIMITIVE_NAMES,
  detectLayoutContext,
  getHtmlTag,
  withLayoutDefaults,
} from './layout'
import { generateEventHandlers } from './events'
import { generateChartJSX } from './chart'
import { generateIconJSX } from './icon'
import {
  generateBindAttribute,
  generateHtmlAttributes,
  generateMirrorAttributes,
} from './attributes'
import { getTextContent, renderTextSlot, rewriteIdentifiersToTokens } from './text'
import {
  type ReactStateContext,
  collectStateGroups,
  formatStyleAsCSS,
  formatStyleObject,
  generateStyles,
} from './style'

export function generateJSX(
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

  // HTML attributes from properties (placeholder, type, href, src, etc.)
  const attrStr =
    generateHtmlAttributes(allProps, tokens, parentContext.loopVars) +
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
  // Transition-spec collected from any state with timing — emitted on
  // the BASE element style so the hover/focus/active/disabled
  // transitions are smooth. Mirror's `hover 0.2s ease-out:` shape sits
  // on `state.animation` in the AST.
  let transitionSpec: string | null = null
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
        // First state with timing wins for the base-element transition.
        // DOM does the same thing via the IR transition emit.
        if (!transitionSpec && group.animation && (group.animation.duration ?? 0) > 0) {
          const duration = group.animation.duration!
          const easing = group.animation.easing ?? 'ease'
          // Pick the property name(s) to transition. Use 'all' as a safe
          // default — Mirror's hover blocks usually animate one or two
          // props and `all` covers them without needing a per-prop list.
          // (DOM emits `transition: background 200ms ease-out` for a
          // single-prop case; we use `all` because deriving the prop
          // name list from `group.properties` requires re-doing the
          // CSS-key mapping.)
          transitionSpec = `all ${duration}s ${easing}`
        }
      }
    }
  }

  // Apply state-driven transition to the base element's style. Without
  // this the React render shows an instant pop on hover (no smoothing)
  // even when the user wrote `hover 0.2s:`.
  if (transitionSpec) style.transition = transitionSpec
  const styleStr = Object.keys(style).length > 0 ? ` style={${formatStyleObject(style)}}` : ''

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
  // Two sources of visible-when conditions:
  //   1. `instance.visibleWhen` — set by the parser when an `if/else`
  //      block inside a parent gets desugared to per-child conditions.
  //   2. `visible-when <expr>` written as an explicit property — surfaces
  //      as a regular Property in `instance.properties`.
  // Both should wrap the rendered JSX with `{cond ? jsx : null}`.
  const explicitVisibleProp = instance.properties.find(p => p.name === 'visible-when')
  const explicitVisible =
    explicitVisibleProp && typeof explicitVisibleProp.values[0] === 'string'
      ? (explicitVisibleProp.values[0] as string)
      : undefined
  const visibleWhen =
    (instance as Instance & { visibleWhen?: string }).visibleWhen ?? explicitVisible

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
export function wrapWithVisibility(
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
export function generateEachJSX(
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
    } else if (child.type === 'Conditional') {
      // `each t in $tasks\n  if t.done\n    Text "..."\n  else\n    ...`
      // Pre-2026-05-10 the each-loop renderer ignored Conditional
      // children entirely — the loop body was an empty fragment.
      childLines.push(
        generateConditionalJSX(
          child as ConditionalNode,
          components,
          tokens,
          propertySetMap,
          indent + '    ',
          childContext,
          stateContext
        )
      )
    } else if (isText(child as unknown)) {
      // each.children's static union excludes Text, but the parser can emit
      // Text nodes here for inline content (e.g. `each t in $tasks\n  Text t.title`).
      // The type-guard narrows safely at runtime.
      childLines.push(
        `${indent}    {${JSON.stringify((child as unknown as { content: string }).content)}}`
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
export function generateConditionalJSX(
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
