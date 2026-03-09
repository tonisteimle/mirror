/**
 * CodeModifier - Modifies Mirror source code at exact positions
 *
 * Handles:
 * - Updating existing property values
 * - Adding new properties
 * - Removing properties
 * - Adding children to components (for drag-and-drop)
 * - Returns changes in CodeMirror-compatible format
 *
 * Uses LinePropertyParser for robust line analysis with:
 * - Property alias support (bg → background)
 * - Multi-value properties (pad 16 12)
 * - Correct property boundary detection
 */

import type { SourceMap, NodeMapping } from './source-map'
import type { SourcePosition } from '../ir/types'
import {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  getCanonicalName,
  isSameProperty,
} from './line-property-parser'

/**
 * Result of a code modification
 */
export interface CodeChange {
  from: number       // Start position (character offset)
  to: number         // End position (character offset)
  insert: string     // Text to insert
}

/**
 * Result of a code modification operation
 */
export interface ModificationResult {
  success: boolean
  newSource: string
  change: CodeChange
  error?: string
}

/**
 * Options for property modification
 */
export interface ModifyPropertyOptions {
  /** Preserve token references (don't expand $tokens) */
  preserveTokens?: boolean
}

/**
 * Interface for accessing multiple files (for cross-file operations)
 */
export interface FilesAccess {
  getFile: (path: string) => string | undefined
  setFile: (path: string, content: string) => void
  getCurrentFile: () => string
}

/**
 * Result of extracting a component to a file
 */
export interface ExtractToComponentResult {
  success: boolean
  currentFileChange: CodeChange
  componentFileChange: { path: string; content: string }
  importAdded: boolean
  error?: string
}

/**
 * Options for adding a child component
 */
export interface AddChildOptions {
  /** Position to insert: 'first', 'last', or numeric index */
  position?: 'first' | 'last' | number
  /** Properties to add to the new component */
  properties?: string
  /** Text content for the component */
  textContent?: string
}

/**
 * CodeModifier class
 */
export class CodeModifier {
  private source: string
  private sourceMap: SourceMap
  private lines: string[]

  constructor(source: string, sourceMap: SourceMap) {
    this.source = source
    this.sourceMap = sourceMap
    this.lines = source.split('\n')
  }

  /**
   * Get the current source
   */
  getSource(): string {
    return this.source
  }

  /**
   * Get the current source map
   */
  getSourceMap(): SourceMap {
    return this.sourceMap
  }

  /**
   * Update an existing property value
   *
   * Uses LinePropertyParser for robust line analysis:
   * - Supports property aliases (bg, background, etc.)
   * - Correctly handles multi-value properties
   * - Preserves original property name used in source
   */
  updateProperty(
    nodeId: string,
    propName: string,
    newValue: string,
    options: ModifyPropertyOptions = {}
  ): ModificationResult {
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.lines[nodeLine - 1]
    if (!line) {
      return this.errorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the entire line for robust property handling
    const parsedLine = parseLine(line)

    // Check if property exists (using alias-aware lookup)
    const existingProp = findPropertyInLine(parsedLine, propName)

    if (!existingProp) {
      // Property doesn't exist - add it
      return this.addProperty(nodeId, propName, newValue, options)
    }

    // Update the property using the line parser
    const newLine = updatePropertyInLine(parsedLine, propName, newValue)

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    return {
      success: true,
      newSource,
      change: {
        from,
        to,
        insert: newLine,
      },
    }
  }

  /**
   * Add a new property to a node
   *
   * Uses LinePropertyParser for consistent line handling
   */
  addProperty(
    nodeId: string,
    propName: string,
    value: string,
    options: ModifyPropertyOptions = {}
  ): ModificationResult {
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Find the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.lines[nodeLine - 1]
    if (!line) {
      return this.errorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the line and add property
    const parsedLine = parseLine(line)
    const newLine = addPropertyToLine(parsedLine, propName, value)

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    return {
      success: true,
      newSource,
      change: {
        from,
        to,
        insert: newLine,
      },
    }
  }

  /**
   * Remove a property from a node
   *
   * Uses LinePropertyParser for alias-aware property removal
   */
  removeProperty(nodeId: string, propName: string): ModificationResult {
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.lines[nodeLine - 1]
    if (!line) {
      return this.errorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the line and check if property exists
    const parsedLine = parseLine(line)
    const existingProp = findPropertyInLine(parsedLine, propName)

    if (!existingProp) {
      return this.errorResult(`Property not found: ${propName}`)
    }

    // Remove the property using the line parser
    const newLine = removePropertyFromLine(parsedLine, propName)

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    return {
      success: true,
      newSource,
      change: {
        from,
        to,
        insert: newLine,
      },
    }
  }

  /**
   * Add a child component to a parent node
   */
  addChild(
    parentId: string,
    componentName: string,
    options: AddChildOptions = {}
  ): ModificationResult {
    const { position = 'last', properties, textContent } = options

    // Get parent node mapping
    const parentMapping = this.sourceMap.getNodeById(parentId)
    if (!parentMapping) {
      return this.errorResult(`Parent node not found: ${parentId}`)
    }

    // Get existing children
    const children = this.sourceMap.getChildren(parentId)

    // Calculate insertion point and indentation
    const insertionInfo = this.calculateChildInsertionPoint(
      parentMapping,
      children,
      position
    )

    // Build the new component line
    const componentLine = this.buildComponentLine(
      componentName,
      properties,
      textContent,
      insertionInfo.indent
    )

    // Create the change
    const insertText = `\n${componentLine}`
    const insertPosition = insertionInfo.charOffset

    // Apply the change
    const newSource =
      this.source.substring(0, insertPosition) +
      insertText +
      this.source.substring(insertPosition)

    return {
      success: true,
      newSource,
      change: {
        from: insertPosition,
        to: insertPosition,
        insert: insertText,
      },
    }
  }

  /**
   * Add a child component relative to a sibling (before or after)
   */
  addChildRelativeTo(
    siblingId: string,
    componentName: string,
    placement: 'before' | 'after',
    options: Omit<AddChildOptions, 'position'> = {}
  ): ModificationResult {
    const { properties, textContent } = options

    // Get sibling node mapping
    const siblingMapping = this.sourceMap.getNodeById(siblingId)
    if (!siblingMapping) {
      return this.errorResult(`Sibling node not found: ${siblingId}`)
    }

    // Get sibling's line to determine indentation
    const siblingLine = this.lines[siblingMapping.position.line - 1]
    const indent = this.getLineIndent(siblingLine)

    // Build the new component line
    const componentLine = this.buildComponentLine(
      componentName,
      properties,
      textContent,
      indent
    )

    let insertPosition: number
    let insertText: string

    if (placement === 'before') {
      // Insert before sibling's line
      insertPosition = this.getCharacterOffset(siblingMapping.position.line, 1)
      insertText = `${componentLine}\n`
    } else {
      // Insert after sibling (at end of sibling's block)
      const siblingEndLine = siblingMapping.position.endLine
      const endLineContent = this.lines[siblingEndLine - 1]
      insertPosition = this.getCharacterOffset(siblingEndLine, endLineContent.length + 1)
      insertText = `\n${componentLine}`
    }

    // Apply the change
    const newSource =
      this.source.substring(0, insertPosition) +
      insertText +
      this.source.substring(insertPosition)

    return {
      success: true,
      newSource,
      change: {
        from: insertPosition,
        to: insertPosition,
        insert: insertText,
      },
    }
  }

  /**
   * Remove a node and all its children from the source code
   */
  removeNode(nodeId: string): ModificationResult {
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Get the full block span (node line to endLine)
    const startLine = nodeMapping.position.line
    const endLine = nodeMapping.position.endLine

    // Calculate character offsets for the entire block
    const startOffset = this.getCharacterOffset(startLine, 1)
    // Include the newline at the end of the block
    const endLineContent = this.lines[endLine - 1]
    let endOffset = this.getCharacterOffset(endLine, endLineContent.length + 1)

    // If there's a line after, include the newline character
    if (endLine < this.lines.length) {
      endOffset += 1 // Include the \n
    }

    // Build the new source by removing the block
    let newSource: string
    if (startLine === 1 && endLine === this.lines.length) {
      // Removing everything
      newSource = ''
    } else if (startLine === 1) {
      // Removing from start
      newSource = this.source.substring(endOffset)
    } else {
      // Removing from middle or end - also remove the preceding newline
      const adjustedStartOffset = startOffset > 0 ? startOffset - 1 : startOffset
      newSource = this.source.substring(0, adjustedStartOffset) + this.source.substring(endOffset)
    }

    return {
      success: true,
      newSource,
      change: {
        from: startOffset > 0 ? startOffset - 1 : startOffset,
        to: endOffset,
        insert: '',
      },
    }
  }

  /**
   * Move a node to a new location relative to another node
   */
  moveNode(
    sourceNodeId: string,
    targetId: string,
    placement: 'before' | 'after' | 'inside'
  ): ModificationResult {
    const sourceMapping = this.sourceMap.getNodeById(sourceNodeId)
    if (!sourceMapping) {
      return this.errorResult(`Source node not found: ${sourceNodeId}`)
    }

    const targetMapping = this.sourceMap.getNodeById(targetId)
    if (!targetMapping) {
      return this.errorResult(`Target node not found: ${targetId}`)
    }

    // Prevent dropping onto self or descendants
    if (sourceNodeId === targetId) {
      return this.errorResult('Cannot move node onto itself')
    }

    if (this.isDescendantOf(targetId, sourceNodeId)) {
      return this.errorResult('Cannot move node into its own descendant')
    }

    // Extract the source block text
    const startLine = sourceMapping.position.line
    const endLine = sourceMapping.position.endLine
    const sourceLines = this.lines.slice(startLine - 1, endLine)
    const sourceBlock = sourceLines.join('\n')

    // Get the source indentation
    const sourceIndent = this.getLineIndent(sourceLines[0])

    // Calculate target indentation
    let targetIndent: string
    if (placement === 'inside') {
      // Child of target: one level deeper
      const targetLine = this.lines[targetMapping.position.line - 1]
      targetIndent = this.getLineIndent(targetLine) + '  '
    } else {
      // Sibling: same level as target
      const targetLine = this.lines[targetMapping.position.line - 1]
      targetIndent = this.getLineIndent(targetLine)
    }

    // Re-indent the source block
    const reindentedBlock = this.reindentBlock(sourceBlock, sourceIndent, targetIndent)

    // Calculate positions - we need to handle this carefully
    // Strategy: Remove first, then insert at adjusted position

    // Get source removal positions
    const removeStart = this.getCharacterOffset(startLine, 1)
    const endLineContent = this.lines[endLine - 1]
    let removeEnd = this.getCharacterOffset(endLine, endLineContent.length + 1)

    // Determine how to handle newlines around the removed block
    // We need to remove exactly ONE newline - either before or after, not both
    const hasNewlineAfter = endLine < this.lines.length
    let adjustedRemoveStart: number

    if (hasNewlineAfter) {
      // Remove the trailing newline (after the block)
      removeEnd += 1
      adjustedRemoveStart = removeStart
    } else {
      // No newline after - remove the leading newline (before the block) if it exists
      adjustedRemoveStart = removeStart > 0 ? removeStart - 1 : removeStart
    }

    // Calculate insertion position before removal
    let insertPosition: number
    let insertText: string

    if (placement === 'inside') {
      // Insert as last child of target
      const children = this.sourceMap.getChildren(targetId)
      if (children.length > 0) {
        // After last child
        const lastChild = children.reduce((a, b) =>
          a.position.endLine > b.position.endLine ? a : b
        )
        const lastChildEndLine = lastChild.position.endLine
        const lastChildLineContent = this.lines[lastChildEndLine - 1]
        insertPosition = this.getCharacterOffset(lastChildEndLine, lastChildLineContent.length + 1)
      } else {
        // After parent line
        const parentLine = targetMapping.position.line
        const parentLineContent = this.lines[parentLine - 1]
        insertPosition = this.getCharacterOffset(parentLine, parentLineContent.length + 1)
      }
      insertText = `\n${reindentedBlock}`
    } else if (placement === 'before') {
      // Insert before target line
      // Position points to newline at end of previous line, so we need newline at start of insertText
      insertPosition = this.getCharacterOffset(targetMapping.position.line, 1) - 1
      if (insertPosition < 0) insertPosition = 0
      insertText = `\n${reindentedBlock}`
    } else {
      // After target
      const targetEndLine = targetMapping.position.endLine
      const targetEndContent = this.lines[targetEndLine - 1]
      insertPosition = this.getCharacterOffset(targetEndLine, targetEndContent.length + 1)
      insertText = `\n${reindentedBlock}`
    }

    // Adjust insertion position if it's after the removal position
    if (insertPosition > removeStart) {
      const removalLength = removeEnd - adjustedRemoveStart
      insertPosition -= removalLength
    }

    // First, remove the source block
    let newSource = this.source.substring(0, adjustedRemoveStart) + this.source.substring(removeEnd)

    // Then insert at the new position
    newSource = newSource.substring(0, insertPosition) + insertText + newSource.substring(insertPosition)

    // For move operations, replace the entire document since we have both remove and insert
    return {
      success: true,
      newSource,
      change: {
        from: 0,
        to: this.source.length,
        insert: newSource,
      },
    }
  }

  /**
   * Check if a node is a descendant of another node
   */
  private isDescendantOf(nodeId: string, ancestorId: string): boolean {
    const node = this.sourceMap.getNodeById(nodeId)
    if (!node) return false

    let currentId = node.parentId
    while (currentId) {
      if (currentId === ancestorId) return true
      const parent = this.sourceMap.getNodeById(currentId)
      currentId = parent?.parentId
    }
    return false
  }

  /**
   * Re-indent a block of code to a new indentation level
   */
  private reindentBlock(block: string, oldIndent: string, newIndent: string): string {
    const lines = block.split('\n')
    return lines.map((line, index) => {
      if (index === 0) {
        // First line: replace old indent with new
        return newIndent + line.substring(oldIndent.length)
      }
      // Other lines: adjust relative indentation
      if (line.startsWith(oldIndent)) {
        const extraIndent = line.substring(oldIndent.length)
        return newIndent + extraIndent
      }
      return line
    }).join('\n')
  }

  /**
   * Calculate where to insert a child and with what indentation
   */
  private calculateChildInsertionPoint(
    parentMapping: NodeMapping,
    children: NodeMapping[],
    position: 'first' | 'last' | number
  ): { charOffset: number; indent: string } {
    // Get parent's indentation
    const parentLine = this.lines[parentMapping.position.line - 1]
    const parentIndent = this.getLineIndent(parentLine)
    const childIndent = parentIndent + '  ' // 2 spaces more than parent

    // Sort children by line number
    const sortedChildren = [...children].sort(
      (a, b) => a.position.line - b.position.line
    )

    if (sortedChildren.length === 0) {
      // No children yet - insert after parent line
      const parentEndLine = parentMapping.position.line
      const lineContent = this.lines[parentEndLine - 1]
      return {
        charOffset: this.getCharacterOffset(parentEndLine, lineContent.length + 1),
        indent: childIndent,
      }
    }

    if (position === 'first') {
      // Insert before first child
      const firstChild = sortedChildren[0]
      const charOffset = this.getCharacterOffset(firstChild.position.line, 1)
      return {
        // We need to insert at the beginning and add newline after
        charOffset: charOffset - 1, // Before the newline of the previous line
        indent: childIndent,
      }
    }

    if (position === 'last' || typeof position === 'number') {
      // Find the target child to insert after
      let targetIndex = sortedChildren.length - 1
      if (typeof position === 'number') {
        targetIndex = Math.min(position - 1, sortedChildren.length - 1)
        targetIndex = Math.max(0, targetIndex)
      }

      const targetChild = sortedChildren[targetIndex]
      const targetEndLine = targetChild.position.endLine
      const lineContent = this.lines[targetEndLine - 1]

      return {
        charOffset: this.getCharacterOffset(targetEndLine, lineContent.length + 1),
        indent: childIndent,
      }
    }

    // Fallback: after parent
    const parentEndLine = parentMapping.position.line
    const lineContent = this.lines[parentEndLine - 1]
    return {
      charOffset: this.getCharacterOffset(parentEndLine, lineContent.length + 1),
      indent: childIndent,
    }
  }

  /**
   * Build a component line with indentation, properties, and optional text
   */
  private buildComponentLine(
    componentName: string,
    properties?: string,
    textContent?: string,
    indent: string = ''
  ): string {
    let line = `${indent}${componentName}`

    if (properties) {
      line += ` ${properties}`
    }

    if (textContent) {
      // Add text content (with quotes if not already quoted)
      const quotedText = textContent.startsWith('"') ? textContent : `"${textContent}"`
      if (properties) {
        line += `, ${quotedText}`
      } else {
        line += ` ${quotedText}`
      }
    }

    return line
  }

  /**
   * Get the indentation of a line (leading whitespace)
   */
  private getLineIndent(line: string): string {
    const match = line.match(/^(\s*)/)
    return match ? match[1] : ''
  }

  /**
   * Update the source code (after external changes)
   */
  updateSource(source: string): void {
    this.source = source
    this.lines = source.split('\n')
  }

  /**
   * Update the source map
   */
  updateSourceMap(sourceMap: SourceMap): void {
    this.sourceMap = sourceMap
  }

  /**
   * Find and replace a property value in a line
   */
  private findAndReplaceProperty(
    line: string,
    propName: string,
    newValue: string,
    lineNumber: number
  ): { newLine: string; change: CodeChange } | null {
    // Patterns to match property:
    // 1. "propName value" or "propName value," or "propName value\n"
    // 2. For boolean: just "propName" or "propName,"

    // Try to match property with value
    const patterns = [
      // Property with quoted value: propName "value"
      new RegExp(`(\\b${this.escapeRegex(propName)}\\s+)("[^"]*"|'[^']*')`, 'g'),
      // Property with unquoted value: propName value (captured until comma or end)
      new RegExp(`(\\b${this.escapeRegex(propName)}\\s+)([^,\\s]+(?:\\s+[^,\\s]+)*)`, 'g'),
      // Boolean property (no value)
      new RegExp(`(\\b${this.escapeRegex(propName)})(\\b)(?=\\s*,|\\s*$)`, 'g'),
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(line)
      if (match) {
        const fullMatch = match[0]
        const prefix = match[1]
        const matchStart = match.index
        const matchEnd = matchStart + fullMatch.length

        // Format the new value
        const formattedValue = this.formatValue(propName, newValue)
        const newProp = `${prefix.trim()} ${formattedValue}`

        // Build the new line
        const newLine = line.substring(0, matchStart) + newProp + line.substring(matchEnd)

        // Calculate character offsets
        const from = this.getCharacterOffset(lineNumber, matchStart + 1)
        const to = this.getCharacterOffset(lineNumber, matchEnd + 1)

        return {
          newLine,
          change: {
            from,
            to,
            insert: newProp,
          },
        }
      }
    }

    return null
  }

  /**
   * Find and remove a property from a line
   */
  private findAndRemoveProperty(
    line: string,
    propName: string,
    lineNumber: number
  ): { newLine: string; change: CodeChange } | null {
    // Patterns to match property (including leading/trailing comma)
    const patterns = [
      // Property with comma before: ", propName value"
      new RegExp(`,\\s*\\b${this.escapeRegex(propName)}\\s+[^,\\n]+`, 'g'),
      // Property with comma after: "propName value,"
      new RegExp(`\\b${this.escapeRegex(propName)}\\s+[^,\\n]+,\\s*`, 'g'),
      // Property alone: "propName value"
      new RegExp(`\\b${this.escapeRegex(propName)}\\s+[^,\\n]+`, 'g'),
      // Boolean with comma before: ", propName"
      new RegExp(`,\\s*\\b${this.escapeRegex(propName)}\\b`, 'g'),
      // Boolean with comma after: "propName,"
      new RegExp(`\\b${this.escapeRegex(propName)}\\b,\\s*`, 'g'),
      // Boolean alone: "propName"
      new RegExp(`\\b${this.escapeRegex(propName)}\\b`, 'g'),
    ]

    for (const pattern of patterns) {
      const match = pattern.exec(line)
      if (match) {
        const matchStart = match.index
        const matchEnd = matchStart + match[0].length

        // Build the new line
        const newLine = line.substring(0, matchStart) + line.substring(matchEnd)

        // Calculate character offsets
        const from = this.getCharacterOffset(lineNumber, matchStart + 1)
        const to = this.getCharacterOffset(lineNumber, matchEnd + 1)

        return {
          newLine: newLine.trim() ? newLine : line, // Don't leave empty lines
          change: {
            from,
            to,
            insert: '',
          },
        }
      }
    }

    return null
  }

  /**
   * Format a property for insertion
   */
  private formatProperty(name: string, value: string): string {
    // Boolean properties
    if (value === 'true' || value === '') {
      return name
    }

    // Values that need quotes
    if (value.includes(' ') && !value.startsWith('$') && !value.startsWith('#')) {
      return `${name} "${value}"`
    }

    return `${name} ${value}`
  }

  /**
   * Format a value (may need quotes, etc.)
   */
  private formatValue(propName: string, value: string): string {
    // Boolean properties don't need a value
    if (value === 'true' || value === '') {
      return ''
    }

    // Token references
    if (value.startsWith('$')) {
      return value
    }

    // Color values
    if (value.startsWith('#')) {
      return value
    }

    // Numeric values
    if (/^-?\d+(\.\d+)?$/.test(value)) {
      return value
    }

    // Values with spaces need quotes
    if (value.includes(' ')) {
      return `"${value}"`
    }

    return value
  }

  /**
   * Check if a line already has properties
   */
  private lineHasProperties(line: string): boolean {
    // Look for common property patterns
    return line.includes(',') || /\s+(pad|bg|col|w|h|gap|rad|bor)\s+/.test(line)
  }

  /**
   * Get character offset from line and column
   */
  private getCharacterOffset(line: number, column: number): number {
    let offset = 0
    for (let i = 0; i < line - 1; i++) {
      offset += this.lines[i].length + 1 // +1 for newline
    }
    return offset + column - 1
  }

  /**
   * Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Extract an instance with inline properties to a component definition in components.mirror
   *
   * Takes a node that has inline properties and:
   * 1. Creates a component definition in components.mirror
   * 2. Adds "import components" to the current file if needed
   * 3. Simplifies the original line to just the instance (with text content if any)
   */
  extractToComponentFile(
    nodeId: string,
    filesAccess: FilesAccess,
    options: { componentFileName?: string } = {}
  ): ExtractToComponentResult {
    const componentFileName = options.componentFileName ?? 'components.mirror'

    // Get the node mapping
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.extractErrorResult(`Node not found: ${nodeId}`)
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.lines[nodeLine - 1]
    if (!line) {
      return this.extractErrorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the line
    const parsedLine = parseLine(line)

    // Check if there are properties to extract
    if (parsedLine.properties.length === 0) {
      return this.extractErrorResult('No properties to extract')
    }

    // Get component name from the parsed line
    const componentMatch = parsedLine.componentPart.match(/^([A-Z][a-zA-Z0-9]*)/)
    if (!componentMatch) {
      return this.extractErrorResult('Could not determine component name')
    }
    const componentName = componentMatch[1]

    // Check for "named X" pattern to preserve it
    const namedMatch = line.match(/\bnamed\s+([A-Za-z][A-Za-z0-9]*)/i)
    const namedPart = namedMatch ? ` named ${namedMatch[1]}` : ''

    // Build the component definition line
    // Format: ComponentName: prop1 val, prop2 val
    const propsString = parsedLine.properties
      .map(p => p.isBoolean ? p.name : `${p.name} ${p.value}`)
      .join(', ')
    const definitionLine = `${componentName}: ${propsString}`

    // Build the simplified instance line (just component name + optional named + optional text)
    let instanceLine = parsedLine.indent + componentName + namedPart
    if (parsedLine.textContent) {
      instanceLine += ` ${parsedLine.textContent}`
    }

    // Get or create components.mirror
    let componentFileContent = filesAccess.getFile(componentFileName) ?? ''

    // Add definition to components.mirror
    if (componentFileContent.length > 0 && !componentFileContent.endsWith('\n')) {
      componentFileContent += '\n'
    }
    componentFileContent += definitionLine + '\n'

    // Check if import is needed in current file
    const currentFile = filesAccess.getCurrentFile()
    let importAdded = false
    let currentSource = this.source

    // Get component file name without extension for import
    const importName = componentFileName.replace('.mirror', '')

    // Check if import already exists
    const importRegex = new RegExp(`^import\\s+${importName}\\s*$`, 'm')
    if (!importRegex.test(currentSource)) {
      // Add import at the beginning of the file
      currentSource = `import ${importName}\n` + currentSource
      importAdded = true
    }

    // Update lines array after potential import addition
    const currentLines = currentSource.split('\n')

    // Calculate the line number adjustment if import was added
    const lineOffset = importAdded ? 1 : 0
    const adjustedNodeLine = nodeLine + lineOffset

    // Replace the original line with simplified instance
    currentLines[adjustedNodeLine - 1] = instanceLine
    const newSource = currentLines.join('\n')

    // Calculate the change for the current file
    // If import was added, we need to describe the full change
    const change: CodeChange = importAdded
      ? {
          from: 0,
          to: this.source.length,
          insert: newSource,
        }
      : {
          from: this.getCharacterOffset(nodeLine, 1),
          to: this.getCharacterOffset(nodeLine, line.length + 1),
          insert: instanceLine,
        }

    return {
      success: true,
      currentFileChange: change,
      componentFileChange: {
        path: componentFileName,
        content: componentFileContent,
      },
      importAdded,
    }
  }

  /**
   * Create an error result for extract operation
   */
  private extractErrorResult(error: string): ExtractToComponentResult {
    return {
      success: false,
      currentFileChange: { from: 0, to: 0, insert: '' },
      componentFileChange: { path: '', content: '' },
      importAdded: false,
      error,
    }
  }

  // ============================================================================
  // ANIMATION METHODS
  // ============================================================================

  /**
   * Update or create an animation definition
   *
   * @param animationName - Name of the animation
   * @param animationData - Animation data to write
   */
  updateAnimation(
    animationName: string,
    animationData: {
      easing: string
      duration?: number
      tracks: {
        property: string
        startTime: number
        endTime: number
        fromValue: string | number
        toValue: string | number
      }[]
    }
  ): ModificationResult {
    // Find existing animation definition
    const animationPattern = new RegExp(`^(\\s*)${animationName}\\s+as\\s+animation:`, 'm')
    const match = this.source.match(animationPattern)

    // Generate animation DSL
    const dsl = this.generateAnimationDSL(animationName, animationData)

    if (match && match.index !== undefined) {
      // Update existing animation
      const startLine = this.source.substring(0, match.index).split('\n').length
      let endLine = startLine

      // Find end of animation block (next definition or end of indented block)
      const lines = this.source.split('\n')
      const baseIndent = match[1].length

      for (let i = startLine; i < lines.length; i++) {
        const line = lines[i]
        if (line.trim() === '') continue

        const currentIndent = line.match(/^(\s*)/)?.[1].length || 0
        if (currentIndent <= baseIndent && i > startLine - 1) {
          break
        }
        endLine = i + 1
      }

      const from = this.getCharacterOffset(startLine, 1)
      const toOffset = this.getCharacterOffset(endLine, lines[endLine - 1].length + 1)

      const newSource = this.source.substring(0, from) + dsl + this.source.substring(toOffset)

      return {
        success: true,
        newSource,
        change: { from, to: toOffset, insert: dsl },
      }
    } else {
      // Create new animation - insert at top of file after tokens
      const insertPosition = this.findAnimationInsertPosition()
      const newSource = this.source.substring(0, insertPosition) + dsl + '\n\n' + this.source.substring(insertPosition)

      return {
        success: true,
        newSource,
        change: { from: insertPosition, to: insertPosition, insert: dsl + '\n\n' },
      }
    }
  }

  /**
   * Generate animation DSL code from data
   */
  private generateAnimationDSL(
    name: string,
    data: {
      easing: string
      tracks: {
        property: string
        startTime: number
        endTime: number
        fromValue: string | number
        toValue: string | number
      }[]
    }
  ): string {
    const lines: string[] = []
    lines.push(`${name} as animation: ${data.easing}`)

    // Group all unique times
    const times = new Set<number>()
    for (const track of data.tracks) {
      times.add(track.startTime)
      times.add(track.endTime)
    }

    const sortedTimes = Array.from(times).sort((a, b) => a - b)

    for (const time of sortedTimes) {
      const props: string[] = []

      for (const track of data.tracks) {
        if (track.startTime === time) {
          props.push(`${track.property} ${track.fromValue}`)
        } else if (track.endTime === time) {
          props.push(`${track.property} ${track.toValue}`)
        }
      }

      if (props.length > 0) {
        lines.push(`  ${time.toFixed(2)} ${props.join(', ')}`)
      }
    }

    return lines.join('\n')
  }

  /**
   * Find position to insert new animation (after tokens, before components)
   */
  private findAnimationInsertPosition(): number {
    const lines = this.source.split('\n')
    let position = 0
    let lastTokenLine = -1
    let firstComponentLine = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      // Token definition: $name: value
      if (line.startsWith('$')) {
        lastTokenLine = i
      }

      // Component/animation definition: Name: or Name as
      if (/^[A-Z][a-zA-Z0-9]*\s*(:|as\s)/.test(line) && firstComponentLine === -1) {
        firstComponentLine = i
      }
    }

    // Insert after tokens, before components
    if (lastTokenLine >= 0) {
      // After tokens
      const targetLine = lastTokenLine + 1
      position = this.getCharacterOffset(targetLine + 1, 1)
    } else if (firstComponentLine >= 0) {
      // Before first component
      position = this.getCharacterOffset(firstComponentLine + 1, 1)
    }

    return position
  }

  /**
   * Add animation keyframe
   */
  addAnimationKeyframe(
    animationName: string,
    time: number,
    properties: { property: string; value: string | number }[]
  ): ModificationResult {
    // Find the animation definition
    const animationPattern = new RegExp(`^(\\s*)${animationName}\\s+as\\s+animation:`, 'm')
    const match = this.source.match(animationPattern)

    if (!match || match.index === undefined) {
      return this.errorResult(`Animation not found: ${animationName}`)
    }

    const startLine = this.source.substring(0, match.index).split('\n').length
    const lines = this.source.split('\n')
    const baseIndent = match[1].length
    const keyframeIndent = '  '.repeat(baseIndent / 2 + 1)

    // Find position to insert (sorted by time)
    let insertLine = startLine

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') continue

      const currentIndent = line.match(/^(\s*)/)?.[1].length || 0
      if (currentIndent <= baseIndent && i > startLine - 1) {
        break
      }

      // Check if this line is a keyframe
      const keyframeMatch = line.match(/^\s*([\d.]+)\s+/)
      if (keyframeMatch) {
        const lineTime = parseFloat(keyframeMatch[1])
        if (lineTime < time) {
          insertLine = i + 1
        }
      }

      if (i >= startLine - 1) {
        insertLine = i + 1
      }
    }

    // Build the new keyframe line
    const propsStr = properties.map(p => `${p.property} ${p.value}`).join(', ')
    const newLine = `${keyframeIndent}${time.toFixed(2)} ${propsStr}`

    const insertPosition = this.getCharacterOffset(insertLine + 1, 1)
    const newSource = this.source.substring(0, insertPosition) + newLine + '\n' + this.source.substring(insertPosition)

    return {
      success: true,
      newSource,
      change: { from: insertPosition, to: insertPosition, insert: newLine + '\n' },
    }
  }

  /**
   * Create an error result
   */
  private errorResult(error: string): ModificationResult {
    return {
      success: false,
      newSource: this.source,
      change: { from: 0, to: 0, insert: '' },
      error,
    }
  }
}

/**
 * Create a CodeModifier
 */
export function createCodeModifier(source: string, sourceMap: SourceMap): CodeModifier {
  return new CodeModifier(source, sourceMap)
}

/**
 * Apply a change to source code
 */
export function applyChange(source: string, change: CodeChange): string {
  return source.substring(0, change.from) + change.insert + source.substring(change.to)
}
