/**
 * JavaScript Builder → Mirror DSL Transformer
 *
 * Transforms the output of the JS Builder API into Mirror DSL code.
 * This is a deterministic transformation - no AI involved.
 */

import type { JsNode, JsAction, JsState, JsDefinition, JsToken } from './js-builder'

const INDENT = '  '

// =============================================================================
// MAIN TRANSFORMER
// =============================================================================

export interface TransformOptions {
  /** Include comments in output */
  comments?: boolean
  /** Use long property names (padding vs pad) */
  longNames?: boolean
}

/**
 * Transform JS Builder output to Mirror DSL
 */
export function jsToMirror(
  input: JsNode | JsNode[] | JsDefinition | JsDefinition[] | JsToken[] | (JsNode | JsDefinition | JsToken)[],
  options: TransformOptions = {}
): string {
  const lines: string[] = []

  // Handle tokens first
  if (Array.isArray(input) && input.length > 0 && (input[0] as JsToken)._type === 'token') {
    for (const token of input as JsToken[]) {
      lines.push(tokenToMirror(token))
    }
    return lines.join('\n')
  }

  // Handle definitions
  if (!Array.isArray(input) && (input as JsDefinition)._type === 'definition') {
    return definitionToMirror(input as JsDefinition, options)
  }

  if (Array.isArray(input) && input.length > 0 && (input[0] as JsDefinition)._type === 'definition') {
    for (const def of input as JsDefinition[]) {
      lines.push(definitionToMirror(def, options))
    }
    return lines.join('\n\n')
  }

  // Handle components
  const nodes = Array.isArray(input) ? input as JsNode[] : [input as JsNode]
  for (const node of nodes) {
    lines.push(nodeToMirror(node, 0, options))
  }

  return lines.join('\n')
}

// =============================================================================
// NODE TRANSFORMER
// =============================================================================

function nodeToMirror(node: JsNode, depth: number, options: TransformOptions): string {
  const indent = INDENT.repeat(depth)
  const lines: string[] = []

  // Handle special nodes
  if (node.name === '_conditional') {
    return conditionalToMirror(node, depth, options)
  }
  if (node.name === '_iterator') {
    return iteratorToMirror(node, depth, options)
  }

  // Auto-inject 'hor' for Row components (Row = horizontal layout)
  if (node.name === 'Row' && !node.props.hor && !node.props.horizontal) {
    node.props.hor = true
  }

  // Build main line with v1 inline syntax
  let mainLine = indent

  // List item prefix
  if (node.props._isListItem) {
    mainLine += '- '
  }

  // Component name
  mainLine += node.name

  // Named instance (comes right after component name)
  if (node.props.named && typeof node.props.named === 'string') {
    mainLine += ` named ${node.props.named}`
  }

  // Check if we have any content to put in the block
  const propsToRender = { ...node.props }
  delete propsToRender._isListItem
  delete propsToRender.states
  delete propsToRender.named

  const hasProps = Object.keys(propsToRender).length > 0
  const hasContent = !!node.content
  const hasChildren = node.children.length > 0
  const hasStates = node.props.states && Array.isArray(node.props.states) && (node.props.states as JsState[]).length > 0

  // V1 syntax: properties on same line, children indented below
  const propsStr = propsToMirror(propsToRender, options)

  // Build main line: ComponentName props "content"
  if (propsStr) {
    mainLine += ' ' + propsStr
  }

  // Inline content (on same line if no children and no states)
  if (hasContent && !hasChildren && !hasStates) {
    mainLine += ` "${escapeString(node.content!)}"`
  }

  lines.push(mainLine)

  // States (indented below component)
  if (node.props.states && Array.isArray(node.props.states)) {
    for (const s of node.props.states as JsState[]) {
      lines.push(stateToMirror(s, depth + 1, options))
    }
  }

  // Content as child (if has children or states that require multi-line)
  if (hasContent && (hasChildren || hasStates)) {
    lines.push(`${INDENT.repeat(depth + 1)}"${escapeString(node.content!)}"`)
  }

  // Children (indented below component)
  for (const child of node.children) {
    if (typeof child === 'string') {
      // Bare string child
      lines.push(`${INDENT.repeat(depth + 1)}"${escapeString(child)}"`)
    } else {
      lines.push(nodeToMirror(child, depth + 1, options))
    }
  }

  return lines.join('\n')
}

// =============================================================================
// PROPERTY TRANSFORMER
// =============================================================================

// Property name mappings (JS name → Mirror name)
const PROP_MAP: Record<string, string> = {
  // Layout
  horizontal: 'hor',
  vertical: 'ver',

  // Sizing (optional long→short)
  width: 'w',
  height: 'h',

  // Spacing
  padding: 'pad',
  margin: 'mar',

  // Colors
  background: 'bg',
  color: 'col',
  borderColor: 'boc',
  'border-color': 'boc',

  // Border
  borderRadius: 'rad',
  'border-radius': 'rad',

  // Typography
  fontSize: 'size',
  'font-size': 'size',
  fontWeight: 'weight',
  'font-weight': 'weight',

  // CSS-style props → Mirror
  backgroundColor: 'bg',
  'background-color': 'bg',
}

// Properties that need quoted string values
const QUOTED_PROPS = new Set([
  'placeholder', 'type', 'src', 'alt', 'href', 'font', 'shortcut'
])

// Boolean properties (just the key, no value)
const BOOL_PROPS = new Set([
  'hor', 'ver', 'horizontal', 'vertical',
  'center', 'between', 'wrap', 'stacked',
  'hidden', 'disabled', 'italic', 'underline', 'truncate',
  'uppercase', 'lowercase', 'material',
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  'w-min', 'w-max', 'h-min', 'h-max',
  'scroll', 'scroll-ver', 'scroll-hor', 'clip'
])

// Properties that support multi-value syntax (space-separated)
const MULTI_VALUE_PROPS = new Set([
  'pad', 'padding', 'mar', 'margin', 'rad', 'radius', 'border', 'bor'
])

function propsToMirror(props: Record<string, unknown>, options: TransformOptions): string {
  const parts: string[] = []

  for (const [originalKey, value] of Object.entries(props)) {
    // Skip null/undefined
    if (value === null || value === undefined) continue

    // Map property name
    const key = options.longNames ? originalKey : (PROP_MAP[originalKey] || originalKey)

    // Handle actions (onclick, onhover, etc.)
    if (originalKey.startsWith('on') && isAction(value)) {
      parts.push(`${originalKey} ${actionToMirror(value as JsAction)}`)
      continue
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      if (value && BOOL_PROPS.has(key)) {
        parts.push(key)
      }
      continue
    }

    // Handle arrays for multi-value props (pad [12, 24] → pad 12 24)
    if (Array.isArray(value) && MULTI_VALUE_PROPS.has(key)) {
      const values = value.map(v => String(v)).join(' ')
      parts.push(`${key} ${values}`)
      continue
    }

    // Handle numbers
    if (typeof value === 'number') {
      parts.push(`${key} ${value}`)
      continue
    }

    // Handle strings
    if (typeof value === 'string') {
      // Token reference
      if (value.startsWith('$')) {
        parts.push(`${key} ${value}`)
        continue
      }

      // Color
      if (value.startsWith('#')) {
        parts.push(`${key} ${value}`)
        continue
      }

      // Quoted props
      if (QUOTED_PROPS.has(key)) {
        parts.push(`${key} "${escapeString(value)}"`)
        continue
      }

      // Simple value (no spaces/special chars)
      if (/^[a-zA-Z0-9_-]+$/.test(value)) {
        parts.push(`${key} ${value}`)
        continue
      }

      // Complex value needs quotes
      parts.push(`${key} "${escapeString(value)}"`)
    }
  }

  return parts.join(', ')
}

// =============================================================================
// ACTION TRANSFORMER
// =============================================================================

function isAction(value: unknown): value is JsAction {
  return typeof value === 'object' && value !== null && (value as JsAction)._type === 'action'
}

function actionToMirror(action: JsAction): string {
  const parts = [action.action]

  if (action.target) {
    parts.push(action.target)
  }

  if (action.args) {
    parts.push(...action.args.map(String))
  }

  return parts.join(' ')
}

// =============================================================================
// STATE TRANSFORMER
// =============================================================================

function stateToMirror(state: JsState, depth: number, options: TransformOptions): string {
  const indent = INDENT.repeat(depth)
  const lines: string[] = []

  lines.push(`${indent}state ${state.name}`)

  for (const [key, value] of Object.entries(state.props)) {
    const propKey = options.longNames ? key : (PROP_MAP[key] || key)

    if (typeof value === 'string') {
      if (value.startsWith('$') || value.startsWith('#')) {
        lines.push(`${indent}${INDENT}${propKey} ${value}`)
      } else if (QUOTED_PROPS.has(propKey)) {
        lines.push(`${indent}${INDENT}${propKey} "${escapeString(value)}"`)
      } else {
        lines.push(`${indent}${INDENT}${propKey} ${value}`)
      }
    } else if (typeof value === 'number') {
      lines.push(`${indent}${INDENT}${propKey} ${value}`)
    } else if (typeof value === 'boolean' && value) {
      lines.push(`${indent}${INDENT}${propKey}`)
    }
  }

  return lines.join('\n')
}

// =============================================================================
// DEFINITION TRANSFORMER
// =============================================================================

function definitionToMirror(def: JsDefinition, options: TransformOptions): string {
  const lines: string[] = []

  // V1 syntax: Name: props (with colon after name, space-separated props)
  const propsStr = propsToMirror(def.props, options)

  // Definition line
  if (propsStr) {
    lines.push(`${def.name}: ${propsStr}`)
  } else {
    lines.push(`${def.name}:`)
  }

  // Children (indented below definition)
  for (const child of def.children) {
    if (typeof child === 'string') {
      lines.push(`${INDENT}"${escapeString(child)}"`)
    } else {
      lines.push(nodeToMirror(child, 1, options))
    }
  }

  return lines.join('\n')
}

// =============================================================================
// TOKEN TRANSFORMER
// =============================================================================

function tokenToMirror(token: JsToken): string {
  const value = typeof token.value === 'string' ? token.value : String(token.value)
  return `$${token.name}: ${value}`
}

// =============================================================================
// CONDITIONAL TRANSFORMER
// =============================================================================

function conditionalToMirror(node: JsNode, depth: number, options: TransformOptions): string {
  const indent = INDENT.repeat(depth)
  const lines: string[] = []
  const condition = node.props.condition as string

  // V1 syntax: if condition (children indented)
  lines.push(`${indent}if ${condition}`)

  // Then branch (indented)
  if (node.children[0]) {
    const thenNode = node.children[0] as JsNode
    lines.push(nodeToMirror(thenNode, depth + 1, options))
  }

  // Else branch
  if (node.props.else && node.children[1]) {
    lines.push(`${indent}else`)
    const elseNode = node.children[1] as JsNode
    lines.push(nodeToMirror(elseNode, depth + 1, options))
  }

  return lines.join('\n')
}

// =============================================================================
// ITERATOR TRANSFORMER
// =============================================================================

function iteratorToMirror(node: JsNode, depth: number, options: TransformOptions): string {
  const indent = INDENT.repeat(depth)
  const lines: string[] = []
  const itemVar = node.props.itemVar as string
  const listVar = node.props.listVar as string

  // V1 syntax: each $item in $list (children indented)
  lines.push(`${indent}each ${itemVar} in ${listVar}`)

  // Template (indented)
  if (node.children[0]) {
    const template = node.children[0] as JsNode
    lines.push(nodeToMirror(template, depth + 1, options))
  }

  return lines.join('\n')
}

// =============================================================================
// UTILITIES
// =============================================================================

function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// =============================================================================
// EXPORTS
// =============================================================================

export default jsToMirror
