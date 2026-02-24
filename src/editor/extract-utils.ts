/**
 * Extract Utils Module
 *
 * Utility functions for extracting properties and components from the editor.
 * Used by EditorPanel for refactoring features:
 * - Extract to Token: Extract property value to a design token
 * - Extract Component: Create component definition from inline usage
 * - Extract Component Tree: Extract component with all children
 */
import type { EditorView } from '@codemirror/view'

/**
 * Property suffix mapping for token generation.
 * Maps property names to appropriate token suffixes.
 */
const PROPERTY_SUFFIX_MAP: Record<string, string> = {
  // Color properties
  background: '-background',
  bg: '-background',
  color: '-color',
  col: '-color',
  'border-color': '-border-color',
  boc: '-border-color',

  // Spacing properties
  padding: '-padding',
  p: '-padding',
  pad: '-padding',
  margin: '-margin',
  m: '-margin',
  mar: '-margin',
  gap: '-gap',
  g: '-gap',

  // Size properties
  radius: '-radius',
  rad: '-radius',
  border: '-border',
  bor: '-border',

  // Typography
  size: '-size',
  weight: '-weight',
  'font-size': '-size',
  'font-weight': '-weight',

  // Visual
  opacity: '-opacity',
  o: '-opacity',
  opa: '-opacity',
  shadow: '-shadow',
  z: '-z',
}

/**
 * Information about a property found at cursor position.
 */
export interface PropertyInfo {
  property: string       // Property name (e.g., 'background')
  value: string          // Property value (e.g., '#3B82F6')
  propertyStart: number  // Start position of property name
  propertyEnd: number    // End position of property name
  valueStart: number     // Start position of value
  valueEnd: number       // End position of value
  fullStart: number      // Start of property-value pair
  fullEnd: number        // End of property-value pair
}

/**
 * Information about a component found in a line.
 */
export interface ComponentInfo {
  name: string           // Component name (e.g., 'Button')
  nameStart: number      // Start position of name in line
  nameEnd: number        // End position of name in line
  properties: string     // Properties string (without text content)
  textContent: string    // Text content (if any)
  indent: number         // Leading spaces
}

/**
 * Information about a component block (component + children).
 */
export interface ComponentBlockInfo {
  startLine: number      // Line number where block starts (1-indexed)
  endLine: number        // Line number where block ends (1-indexed)
  lines: string[]        // All lines in the block
  componentInfo: ComponentInfo | null
}

/**
 * Get the indentation level (number of leading spaces) of a line.
 */
function getIndentLevel(line: string): number {
  const match = line.match(/^(\s*)/)
  return match ? match[1].length : 0
}

/**
 * Find the property-value pair at the cursor position.
 * Supports property: value syntax.
 * Returns null if cursor is not on a property.
 */
export function getPropertyAtCursor(view: EditorView): PropertyInfo | null {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  const lineText = line.text
  const posInLine = pos - line.from

  // Find all property-value pairs in the line
  // Syntax: property: value (with colon)
  // Match: property followed by colon+space or just space, then value
  const propValueRegex = /([a-z][-a-z]*)(?::\s*|\s+)(#[0-9a-fA-F]{3,8}|\$[a-zA-Z0-9_-]+|-?\d+\.?\d*%?|"[^"]*")/g
  let match: RegExpExecArray | null

  while ((match = propValueRegex.exec(lineText)) !== null) {
    const fullStart = match.index
    const fullEnd = fullStart + match[0].length
    const property = match[1]
    const value = match[2]

    // Calculate positions
    const propertyStart = fullStart
    const propertyEnd = propertyStart + property.length
    const valueStart = lineText.indexOf(value, propertyEnd)
    const valueEnd = valueStart + value.length

    // Check if cursor is within this property-value pair
    if (posInLine >= fullStart && posInLine <= fullEnd) {
      return {
        property,
        value,
        propertyStart: line.from + propertyStart,
        propertyEnd: line.from + propertyEnd,
        valueStart: line.from + valueStart,
        valueEnd: line.from + valueEnd,
        fullStart: line.from + fullStart,
        fullEnd: line.from + fullEnd,
      }
    }
  }

  return null
}

/**
 * Extract component information from a line.
 * Returns null if line doesn't start with a component (uppercase letter).
 */
export function getComponentAtLine(lineText: string): ComponentInfo | null {
  // Match: indent + ComponentName + optional content
  const match = lineText.match(/^(\s*)([A-Z][a-zA-Z0-9]*)(.*)$/)
  if (!match) return null

  const indent = match[1].length
  const name = match[2]
  const rest = match[3].trim()

  // Extract text content (last quoted string)
  let properties = rest
  let textContent = ''

  // Find text content at the end (inside quotes)
  const textMatch = rest.match(/\s*"([^"]*)"(\s*)$/)
  if (textMatch) {
    textContent = textMatch[1]
    // Remove text content from properties
    properties = rest.slice(0, rest.lastIndexOf('"' + textContent + '"')).trim()
  }

  return {
    name,
    nameStart: indent,
    nameEnd: indent + name.length,
    properties,
    textContent,
    indent,
  }
}

/**
 * Get the complete component block (component + all indented children).
 * Uses indentation to determine block boundaries.
 */
export function getComponentBlock(view: EditorView, lineNum: number): ComponentBlockInfo | null {
  const doc = view.state.doc
  if (lineNum < 1 || lineNum > doc.lines) return null

  const startLine = doc.line(lineNum)
  const componentInfo = getComponentAtLine(startLine.text)

  // If not a component line, still try to get the block
  const startIndent = getIndentLevel(startLine.text)
  const lines: string[] = [startLine.text]

  // Find all lines with greater indentation (children)
  let endLineNum = lineNum
  for (let i = lineNum + 1; i <= doc.lines; i++) {
    const line = doc.line(i)
    const text = line.text

    // Skip empty lines (include them in block)
    if (!text.trim()) {
      lines.push(text)
      endLineNum = i
      continue
    }

    const indent = getIndentLevel(text)
    // Block ends when we find a line at same or lower indentation
    if (indent <= startIndent) {
      break
    }
    lines.push(text)
    endLineNum = i
  }

  // Remove trailing empty lines from the block
  while (lines.length > 1 && !lines[lines.length - 1].trim()) {
    lines.pop()
    endLineNum--
  }

  return {
    startLine: lineNum,
    endLine: endLineNum,
    lines,
    componentInfo,
  }
}

/**
 * Get the current line number (1-indexed) from the editor cursor position.
 */
export function getCurrentLineNumber(view: EditorView): number {
  const pos = view.state.selection.main.head
  return view.state.doc.lineAt(pos).number
}

/**
 * Get the current line text from the editor cursor position.
 */
export function getCurrentLineText(view: EditorView): string {
  const pos = view.state.selection.main.head
  return view.state.doc.lineAt(pos).text
}

/**
 * Generate a token name from component and property names.
 * Uses the property suffix map to create meaningful names.
 *
 * Examples:
 * - Button + background → $button-background
 * - Card + radius → $card-radius
 * - unknown property → $component-property
 */
export function generateTokenName(componentName: string, propertyName: string): string {
  const suffix = PROPERTY_SUFFIX_MAP[propertyName.toLowerCase()] || `-${propertyName.toLowerCase()}`
  return `$${componentName.toLowerCase()}${suffix}`
}

/**
 * Create a token definition line.
 * Example: $button-background: #3B82F6
 */
export function createTokenDefinition(tokenName: string, value: string): string {
  return `${tokenName}: ${value}`
}

/**
 * Create a component definition from a component line.
 * Extracts only the properties, not the text content.
 * V1 syntax: Component: property value, property value
 *
 * Input: "Button padding 12, bg #3B82F6 "Click""
 * Output: "Button: padding 12, bg #3B82F6"
 */
export function createComponentDefinition(componentInfo: ComponentInfo): string {
  const props = componentInfo.properties.trim()
  // Remove colon if already present, leading comma
  const cleanProps = props.replace(/^[,:]\s*/, '').trim()
  if (!cleanProps) {
    return `${componentInfo.name}:`
  }
  return `${componentInfo.name}: ${cleanProps}`
}

/**
 * Create a component usage line (just name and text).
 *
 * Input component info with text "Click"
 * Output: "Button "Click""
 */
export function createComponentUsage(componentInfo: ComponentInfo): string {
  if (componentInfo.textContent) {
    return `${componentInfo.name} "${componentInfo.textContent}"`
  }
  return componentInfo.name
}

/**
 * Create a component definition with children (for tree extraction).
 * V1 syntax: Component: props (children indented below)
 * The first line becomes the definition, children keep relative indentation.
 */
export function createComponentDefinitionWithChildren(blockInfo: ComponentBlockInfo): string {
  if (blockInfo.lines.length === 0) return ''

  const firstLine = blockInfo.lines[0]
  const componentInfo = getComponentAtLine(firstLine)
  if (!componentInfo) return blockInfo.lines.join('\n')

  // First line becomes definition
  const props = componentInfo.properties.trim()
  const cleanProps = props.replace(/^[,:]\s*/, '').trim()
  const defLine = cleanProps
    ? `${componentInfo.name}: ${cleanProps}`
    : `${componentInfo.name}:`

  // Children keep their relative indentation
  if (blockInfo.lines.length === 1) {
    return defLine
  }

  // Adjust children indentation to be 2 spaces under definition
  const baseIndent = componentInfo.indent
  const children = blockInfo.lines.slice(1).map(line => {
    if (!line.trim()) return ''
    const currentIndent = getIndentLevel(line)
    const relativeIndent = currentIndent - baseIndent
    // Ensure minimum 2 space indent for children
    const newIndent = Math.max(2, relativeIndent)
    return ' '.repeat(newIndent) + line.trimStart()
  })

  return [defLine, ...children].join('\n')
}

/**
 * Replace value in editor at specified range with new value.
 */
export function replaceInEditor(
  view: EditorView,
  from: number,
  to: number,
  newValue: string
): void {
  view.dispatch({
    changes: { from, to, insert: newValue }
  })
}

/**
 * Replace current line in editor with new text.
 */
export function replaceCurrentLine(view: EditorView, newText: string): void {
  const pos = view.state.selection.main.head
  const line = view.state.doc.lineAt(pos)
  view.dispatch({
    changes: { from: line.from, to: line.to, insert: newText }
  })
}

/**
 * Replace lines in editor from startLine to endLine (1-indexed).
 */
export function replaceLines(
  view: EditorView,
  startLine: number,
  endLine: number,
  newText: string
): void {
  const doc = view.state.doc
  if (startLine < 1 || endLine > doc.lines) return

  const from = doc.line(startLine).from
  const to = doc.line(endLine).to

  view.dispatch({
    changes: { from, to, insert: newText }
  })
}
