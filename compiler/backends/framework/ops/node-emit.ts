/**
 * Framework backend — Node-to-M emit (Slice 5 of framework-backend-decomp).
 *
 * The recursive tree walker: converts every IR node into the matching
 * `M(...)` call. Form selection (content/props/children combinations)
 * lives here; the heavy property mapping lives in style-event.ts /
 * css-to-mirror.ts.
 *
 *   nodeToM            — main per-node emitter, dispatches Each/
 *                        Conditional to their helpers and otherwise
 *                        builds `M('<Type>', content?, props?, children?)`.
 *   eachToM            — `each x in $coll` → `M.each('x', 'coll', […])`.
 *   conditionalToM     — `if cond` → `M.if('cond', […], […])`.
 *   getNodeType        — IR node → Mirror primitive name string.
 *   getContent         — pull text content (skip on layout primitives).
 *   nodeToProps        — assemble the full props record (styles + events
 *                        + HTML props + icon/chart specifics + token-
 *                        leak guard).
 *
 * Pure — no `this` state. Indent is threaded via an explicit
 * `indent: number` parameter; helpers `currentIndent` and `indentLines`
 * are local to this module.
 *
 * Extracted from `compiler/backends/framework.ts` per
 * `docs/refactoring/framework-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import { isLayoutPrimitive } from '../../../schema/dsl'
import type { IRConditional, IREach, IRNode } from '../../../ir/types'
import { getSizeStateThresholds } from '../../../schema/parser-helpers'
import { TAG_TO_TYPE, escapeString } from './helpers'
import { propsToString } from './props'
import { eventsToProps, stylesToProps } from './style-event'

function currentIndent(indent: number): string {
  return '  '.repeat(indent)
}

function indentLines(text: string, indent: number): string {
  const pad = '  '.repeat(indent + 1)
  return text
    .split('\n')
    .map(line => pad + line)
    .join('\n')
}

/**
 * Build CSS `@container` rules for a node's size-state styles. The
 * generated CSS targets the synthetic outer-wrapper's direct child
 * (`[data-mirror-wrapper="<id>"] > *`) — the wrapper itself carries
 * `container-type: inline-size`, so `@container` queries match against
 * the wrapper's inline size and the inner element receives the state
 * styles. Returns one rule per (resolvable) size state.
 */
function buildContainerRules(node: IRNode): string[] {
  const sizeStateStyles = node.styles.filter(s => s.sizeState)
  if (sizeStateStyles.length === 0) return []

  const bySizeState = new Map<string, typeof sizeStateStyles>()
  for (const s of sizeStateStyles) {
    const list = bySizeState.get(s.sizeState!) ?? []
    list.push(s)
    bySizeState.set(s.sizeState!, list)
  }

  const rules: string[] = []
  for (const [state, styles] of bySizeState) {
    const thresholds = getSizeStateThresholds(state)
    if (!thresholds) continue
    const parts: string[] = []
    if (thresholds.min !== undefined) parts.push(`(min-width: ${thresholds.min}px)`)
    if (thresholds.max !== undefined) parts.push(`(max-width: ${thresholds.max}px)`)
    if (parts.length === 0) continue
    const css = styles.map(s => `${s.property}: ${s.value} !important;`).join(' ')
    rules.push(
      `@container ${parts.join(' and ')} { [data-mirror-wrapper="${node.id}"] > * { ${css} } }`
    )
  }
  return rules
}

/**
 * Wrap an inner M() call in a synthetic outer container so CSS
 * `@container` size-state queries match against the wrapper's
 * inline-size (per CSS spec — the element declaring `container-type`
 * is not its own query subject). Mirrors the DOM backend's
 * `emitContainerWrapper` pattern.
 */
function wrapWithContainer(innerM: string, node: IRNode, indent: number): string {
  const rules = buildContainerRules(node)
  if (rules.length === 0) return innerM
  const pad = currentIndent(indent)
  const styleStr = JSON.stringify(rules.join('\n'))
  const propsStr = `{ 'data-mirror-wrapper': '${node.id}', style: 'container-type: inline-size', _cssRules: ${styleStr} }`
  return `M('Box', ${propsStr}, [\n${indentLines(innerM, indent)}\n${pad}])`
}

/**
 * Convert IR node to M() call string.
 */
export function nodeToM(node: IRNode, indent: number): string {
  // Handle each loop
  if (node.each) {
    return eachToM(node.each, indent)
  }

  // Handle conditional
  if (node.conditional) {
    return conditionalToM(node.conditional, indent)
  }

  const parts: string[] = []

  // Type
  const type = getNodeType(node)
  parts.push(`'${type}'`)

  // Content (for Text, Icon, Button, Link)
  const content = getContent(node)

  // Props
  const props = nodeToProps(node)
  const propsStr = propsToString(props)

  // Children
  const children = node.children.map(c => nodeToM(c, indent))
  const hasChildren = children.length > 0

  const pad = currentIndent(indent)

  // Build M() call
  let result: string
  if (content && propsStr && hasChildren) {
    // M('Text', 'content', { props }, [children])
    result = `M(${parts[0]}, '${escapeString(content)}', ${propsStr}, [\n${indentLines(children.join(',\n'), indent)}\n${pad}])`
  } else if (content && propsStr) {
    // M('Text', 'content', { props })
    result = `M(${parts[0]}, '${escapeString(content)}', ${propsStr})`
  } else if (content && hasChildren) {
    // M('Text', 'content', [children])
    result = `M(${parts[0]}, '${escapeString(content)}', [\n${indentLines(children.join(',\n'), indent)}\n${pad}])`
  } else if (content) {
    // M('Text', 'content')
    result = `M(${parts[0]}, '${escapeString(content)}')`
  } else if (propsStr && hasChildren) {
    // M('Box', { props }, [children])
    result = `M(${parts[0]}, ${propsStr}, [\n${indentLines(children.join(',\n'), indent)}\n${pad}])`
  } else if (propsStr) {
    // M('Box', { props })
    result = `M(${parts[0]}, ${propsStr})`
  } else if (hasChildren) {
    // M('Box', [children])
    result = `M(${parts[0]}, [\n${indentLines(children.join(',\n'), indent)}\n${pad}])`
  } else {
    // M('Box')
    result = `M(${parts[0]})`
  }

  // Synthetic outer-wrapper for size-state containers
  // (docs/refactoring/container-queries.md Lane A). Per CSS spec
  // `@container` matches the container-ancestor, not self — so a frame
  // that wants to respond to its own width needs a wrapper above it.
  return wrapWithContainer(result, node, indent)
}

export function eachToM(each: IREach, indent: number): string {
  const template = each.template.map(n => nodeToM(n, indent))
  const templateStr = `[\n${indentLines(template.join(',\n'), indent)}\n${currentIndent(indent)}]`

  if (each.filter) {
    return `M.each('${each.itemVar}', '${each.collection}', ${templateStr}, '${each.filter}')`
  }
  return `M.each('${each.itemVar}', '${each.collection}', ${templateStr})`
}

export function conditionalToM(cond: IRConditional, indent: number): string {
  const thenBranch = cond.then.map(n => nodeToM(n, indent))
  const thenStr = `[\n${indentLines(thenBranch.join(',\n'), indent)}\n${currentIndent(indent)}]`

  if (cond.else && cond.else.length > 0) {
    const elseBranch = cond.else.map(n => nodeToM(n, indent))
    const elseStr = `[\n${indentLines(elseBranch.join(',\n'), indent)}\n${currentIndent(indent)}]`
    return `M.if('${cond.condition}', ${thenStr}, ${elseStr})`
  }

  return `M.if('${cond.condition}', ${thenStr})`
}

function getNodeType(node: IRNode): string {
  if (node.name && node.name !== node.tag) return node.name
  if (node.primitive === 'icon') return 'Icon'
  return TAG_TO_TYPE[node.tag] || node.name || 'Box'
}

/**
 * Extract content from node (for Text, Icon, Button, Link).
 *
 * Layout primitives (Frame/Box, Spacer/Divider, Table family) don't
 * carry positional text content — Slice 1 W112. Skip the content here
 * so the framework backend doesn't emit `M('Frame', 'hello')` while
 * DOM and React both refuse to render the literal.
 */
function getContent(node: IRNode): string | null {
  if (node.name && isLayoutPrimitive(node.name)) return null
  const textContent = node.properties.find(p => p.name === 'textContent')
  if (textContent && typeof textContent.value === 'string') {
    return textContent.value
  }
  return null
}

/**
 * Convert node styles, events, and properties to props object.
 */
function nodeToProps(node: IRNode): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  // Instance name
  if (node.instanceName) {
    props.named = node.instanceName
  }

  // Initial state
  if (node.initialState) {
    props.state = node.initialState
  }

  // Visible when
  if (node.visibleWhen) {
    props['visible-when'] = node.visibleWhen
  }

  // Route
  if (node.route) {
    props.route = node.route
  }

  // Selection
  if (node.selection) {
    props.selection = node.selection
  }

  // Convert IR styles to props
  stylesToProps(node.styles, props)

  // Convert IR events to props
  eventsToProps(node.events, props)

  // Add HTML properties (except textContent which is handled as content)
  for (const prop of node.properties) {
    if (prop.name !== 'textContent') {
      if (
        prop.name === 'placeholder' ||
        prop.name === 'href' ||
        prop.name === 'src' ||
        prop.name === 'type'
      ) {
        props[prop.name] = prop.value
      } else if (prop.name === 'hidden' || prop.name === 'disabled') {
        props[prop.name] = true
      } else if (prop.name.startsWith('data-icon-')) {
        // Convert data-icon-* to icon properties
        const iconProp = prop.name.replace('data-icon-', '')
        if (iconProp === 'size') props.is = prop.value
        else if (iconProp === 'color') props.ic = prop.value
        else if (iconProp === 'weight') props.iw = prop.value
        else if (iconProp === 'fill') props.fill = prop.value === 'true' || prop.value === true
      } else if (
        // Chart-specific properties carry the data binding + render
        // hints (`chartType`, `data`, `fill`, `tension`, `title`,
        // `xLabel`, `yLabel`, `min`/`max`, `step`, `colors`). The
        // Mirror runtime needs them on the M-prop bag to wire up
        // Chart.js. Pre-fix every chart compiled to
        // `M('Line', { w: 350, h: 180 })` with no data — the runtime
        // had nothing to bind.
        node.primitive === 'chart' &&
        (prop.name === 'chartType' ||
          prop.name === 'data' ||
          prop.name === 'fill' ||
          prop.name === 'tension' ||
          prop.name === 'title' ||
          prop.name === 'xLabel' ||
          prop.name === 'yLabel' ||
          prop.name === 'min' ||
          prop.name === 'max' ||
          prop.name === 'step' ||
          prop.name === 'colors')
      ) {
        props[prop.name] = prop.value
      }
    }
  }

  // Slice 50 V-3: Icon-Reverse-Map Suppression. Wenn Icon UND data-icon-*
  // Attribute vorhanden sind, sind die korrespondierenden CSS-Reverses
  // (`width→w`, `height→h`, `color→col`) Doubletten — der User hat
  // ursprünglich `is`/`ic`/`iw`/`fill` geschrieben, nicht beide Wege.
  // Pre-fix emittierte Framework `{ w: 24, h: 24, col: '#f00', is: '24',
  // ic: '#f00' }` — round-trip-lossy weil Re-Compile beide Wege liest.
  if (node.primitive === 'icon') {
    if (props.is !== undefined) {
      delete props.w
      delete props.h
    }
    if (props.ic !== undefined) {
      delete props.col
    }
    if (props.iw !== undefined) {
      // V-4 hat font-weight CSS-Emit unterdrückt — diese Suppression ist
      // defensiv für Pfade die das doch noch durchlassen würden.
      delete props.weight
    }
  }

  // Token-leak guard. Some IR-paths (icon-color `ic $accent`, state-
  // block `selected: { boc: $accent }`, `col $primary` when
  // `primary.col` is undefined) pass an unresolved `$...` literal
  // through to this Framework prop bag. The DOM backend silently
  // drops the corresponding CSS rule; mirror that here by stripping
  // *style-shaped* props whose value is a raw `$<id>` literal.
  //
  // Style-shaped means CSS color/size/border/etc. — the props that
  // round-trip through `cssPropToMirrorProp`. Runtime-data bindings
  // (chart `data: '$data'`, route, `visible-when`, named-instance,
  // event handlers, M.each collection refs) intentionally carry
  // `$ref` strings the mirror-runtime resolves at render time and
  // must NOT be stripped.
  const STYLE_PROPS_TO_GUARD = new Set([
    'bg',
    'col',
    'boc',
    'ic',
    'iw',
    'fs',
    'gap',
    'rad',
    'pad',
    'mar',
    'w',
    'h',
    'minw',
    'minh',
    'maxw',
    'maxh',
    'opacity',
    'shadow',
  ])
  const isUnresolvedToken = (v: unknown): v is string =>
    typeof v === 'string' && /^\$[A-Za-z_][\w.-]*$/.test(v)
  for (const k of Object.keys(props)) {
    if (STYLE_PROPS_TO_GUARD.has(k) && isUnresolvedToken(props[k])) {
      delete props[k]
    }
  }
  if (props.states && typeof props.states === 'object') {
    for (const stateName of Object.keys(props.states)) {
      const stateProps = (props.states as Record<string, unknown>)[stateName] as Record<
        string,
        unknown
      >
      if (stateProps && typeof stateProps === 'object') {
        for (const k of Object.keys(stateProps)) {
          if (STYLE_PROPS_TO_GUARD.has(k) && isUnresolvedToken(stateProps[k])) {
            delete stateProps[k]
          }
        }
        if (Object.keys(stateProps).length === 0) {
          delete (props.states as Record<string, unknown>)[stateName]
        }
      }
    }
    if (Object.keys(props.states as Record<string, unknown>).length === 0) delete props.states
  }

  return props
}
