/**
 * CodeModifierV2 - Hexagonal Architecture Version
 *
 * Modifies Mirror source code at exact positions using port-based dependencies.
 * This version is fully testable without real SourceMap or DOM dependencies.
 *
 * Handles:
 * - Updating existing property values
 * - Adding new properties
 * - Removing properties
 * - Adding children to components (for drag-and-drop)
 * - Moving and duplicating nodes
 * - Returns changes in CodeMirror-compatible format
 */

import type {
  CodeModifierPorts,
  NodeMapping,
  ModificationResult,
  CodeChange,
  ModifyPropertyOptions,
  AddChildOptions,
} from './code-modifier-ports'

/**
 * Snapshot of CodeModifier state for rollback
 */
interface StateSnapshot {
  source: string
}

/**
 * CodeModifierV2 class - Hexagonal Architecture
 *
 * All external dependencies are injected via ports:
 * - sourceMap: Node lookups and parent-child relationships
 * - lineParser: Line parsing and property manipulation
 * - template: Template indentation utilities
 * - document: Source code access and manipulation
 */
export class CodeModifierV2 {
  private snapshot: StateSnapshot | null = null

  constructor(private ports: CodeModifierPorts) {}

  // ============================================
  // Snapshot Management
  // ============================================

  /**
   * Create a snapshot of current state for potential rollback
   */
  createSnapshot(): void {
    this.snapshot = {
      source: this.ports.document.getSource(),
    }
  }

  /**
   * Restore state from snapshot
   */
  restoreSnapshot(): boolean {
    if (!this.snapshot) return false

    // Update source via document port (if it supports it)
    this.ports.document.setSource?.(this.snapshot.source)

    this.snapshot = null
    return true
  }

  /**
   * Clear snapshot after successful operation
   */
  clearSnapshot(): void {
    this.snapshot = null
  }

  /**
   * Check if a snapshot exists
   */
  hasSnapshot(): boolean {
    return this.snapshot !== null
  }

  // ============================================
  // Getters
  // ============================================

  /**
   * Get the current source
   */
  getSource(): string {
    return this.ports.document.getSource()
  }

  // ============================================
  // Property Operations
  // ============================================

  /**
   * Update an existing property value
   */
  updateProperty(
    nodeId: string,
    propName: string,
    newValue: string,
    _options: ModifyPropertyOptions = {}
  ): ModificationResult {
    const nodeMapping = this.ports.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.ports.document.getLine(nodeLine)
    if (!line) {
      return this.errorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the line
    const parsedLine = this.ports.lineParser.parseLine(line)

    // Check if property exists
    const existingProp = this.ports.lineParser.findProperty(parsedLine, propName)

    if (!existingProp) {
      // Property doesn't exist - add it
      return this.addProperty(nodeId, propName, newValue)
    }

    // Update the property
    const newLine = this.ports.lineParser.updateProperty(parsedLine, propName, newValue)

    // Calculate character offsets
    const lineStartOffset = this.ports.document.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newSource = this.ports.document.applyChange(from, to, newLine)

    return {
      success: true,
      newSource,
      change: { from, to, insert: newLine },
    }
  }

  /**
   * Add a new property to a node
   */
  addProperty(
    nodeId: string,
    propName: string,
    value: string,
    _options: ModifyPropertyOptions = {}
  ): ModificationResult {
    const nodeMapping = this.ports.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.ports.document.getLine(nodeLine)
    if (!line) {
      return this.errorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the line and add property
    const parsedLine = this.ports.lineParser.parseLine(line)
    const newLine = this.ports.lineParser.addProperty(parsedLine, propName, value)

    // Calculate character offsets
    const lineStartOffset = this.ports.document.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newSource = this.ports.document.applyChange(from, to, newLine)

    return {
      success: true,
      newSource,
      change: { from, to, insert: newLine },
    }
  }

  /**
   * Remove a property from a node
   */
  removeProperty(nodeId: string, propName: string): ModificationResult {
    const nodeMapping = this.ports.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.ports.document.getLine(nodeLine)
    if (!line) {
      return this.errorResult(`Line not found: ${nodeLine}`)
    }

    // Parse the line and check if property exists
    const parsedLine = this.ports.lineParser.parseLine(line)
    const existingProp = this.ports.lineParser.findProperty(parsedLine, propName)

    if (!existingProp) {
      return this.errorResult(`Property not found: ${propName}`)
    }

    // Remove the property
    const newLine = this.ports.lineParser.removeProperty(parsedLine, propName)

    // Calculate character offsets
    const lineStartOffset = this.ports.document.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newSource = this.ports.document.applyChange(from, to, newLine)

    return {
      success: true,
      newSource,
      change: { from, to, insert: newLine },
    }
  }

  // ============================================
  // Child Operations
  // ============================================

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
    const parentMapping = this.ports.sourceMap.getNodeById(parentId)
    if (!parentMapping) {
      return this.errorResult(`Parent node not found: ${parentId}`)
    }

    // Get existing children
    const children = this.ports.sourceMap.getChildren(parentId)

    // Calculate insertion point and indentation
    const insertionInfo = this.calculateChildInsertionPoint(parentMapping, children, position)

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
    const currentSource = this.ports.document.getSource()
    const newSource =
      currentSource.substring(0, insertPosition) +
      insertText +
      currentSource.substring(insertPosition)

    // Update document via applyChange
    this.ports.document.setSource?.(newSource)

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
   * Add a child using a multi-line template
   */
  addChildWithTemplate(
    parentId: string,
    templateCode: string,
    options: Pick<AddChildOptions, 'position'> = {}
  ): ModificationResult {
    const { position = 'last' } = options

    // Get parent node mapping
    const parentMapping = this.ports.sourceMap.getNodeById(parentId)
    if (!parentMapping) {
      return this.errorResult(`Parent node not found: ${parentId}`)
    }

    // Get existing children
    const children = this.ports.sourceMap.getChildren(parentId)

    // Calculate insertion point and indentation
    const insertionInfo = this.calculateChildInsertionPoint(parentMapping, children, position)

    // Adjust template indentation
    const adjustedTemplate = this.ports.template.adjustIndentation(
      templateCode,
      insertionInfo.indent
    )

    // Create the change
    const insertText = `\n${adjustedTemplate}`
    const insertPosition = insertionInfo.charOffset

    // Apply the change
    const currentSource = this.ports.document.getSource()
    const newSource =
      currentSource.substring(0, insertPosition) +
      insertText +
      currentSource.substring(insertPosition)

    // Update document
    this.ports.document.setSource?.(newSource)

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
   * Add a child relative to a sibling (before or after)
   */
  addChildRelativeTo(
    siblingId: string,
    componentName: string,
    placement: 'before' | 'after',
    options: Omit<AddChildOptions, 'position'> = {}
  ): ModificationResult {
    const { properties, textContent } = options

    // Get sibling node mapping
    const siblingMapping = this.ports.sourceMap.getNodeById(siblingId)
    if (!siblingMapping) {
      return this.errorResult(`Sibling node not found: ${siblingId}`)
    }

    const lines = this.ports.document.getLines()

    // Validate line position
    const lineIndex = siblingMapping.position.line - 1
    if (lineIndex < 0 || lineIndex >= lines.length) {
      return this.errorResult(`Invalid line position for sibling: ${siblingId}`)
    }

    // Get sibling's line to determine indentation
    const siblingLine = lines[lineIndex]
    const indent = this.ports.document.getLineIndent(siblingLine)

    // Build the new component line
    const componentLine = this.buildComponentLine(componentName, properties, textContent, indent)

    let insertPosition: number
    let insertText: string

    if (placement === 'before') {
      // Insert before sibling's line
      insertPosition = this.ports.document.getCharacterOffset(siblingMapping.position.line, 1)
      insertText = `${componentLine}\n`
    } else {
      // Insert after sibling (at end of sibling's block)
      const siblingEndLine = this.getBlockEndLine(siblingMapping.position.line)
      const endLineContent = lines[siblingEndLine - 1]
      insertPosition = this.ports.document.getCharacterOffset(
        siblingEndLine,
        endLineContent.length + 1
      )
      insertText = `\n${componentLine}`
    }

    // Apply the change
    const currentSource = this.ports.document.getSource()
    const newSource =
      currentSource.substring(0, insertPosition) +
      insertText +
      currentSource.substring(insertPosition)

    // Update document
    this.ports.document.setSource?.(newSource)

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

  // ============================================
  // Node Operations
  // ============================================

  /**
   * Remove a node and all its children
   */
  removeNode(nodeId: string): ModificationResult {
    const nodeMapping = this.ports.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    const lines = this.ports.document.getLines()

    // Get the full block span
    const startLine = nodeMapping.position.line
    const endLine = this.getBlockEndLine(startLine)

    // Calculate character offsets
    const startOffset = this.ports.document.getCharacterOffset(startLine, 1)
    const endLineContent = lines[endLine - 1]
    const endOffset = this.ports.document.getCharacterOffset(endLine, endLineContent.length + 1)

    // Handle newlines
    let adjustedStartOffset = startOffset
    let adjustedEndOffset = endOffset

    if (startLine === 1 && endLine === lines.length) {
      // Removing everything
    } else if (endLine < lines.length) {
      // Remove newline AFTER
      adjustedEndOffset = endOffset + 1
    } else if (startLine > 1) {
      // Remove newline BEFORE
      adjustedStartOffset = startOffset - 1
    }

    // Apply the change
    const currentSource = this.ports.document.getSource()
    const newSource =
      currentSource.substring(0, adjustedStartOffset) + currentSource.substring(adjustedEndOffset)

    // Update document
    this.ports.document.setSource?.(newSource)

    return {
      success: true,
      newSource,
      change: {
        from: adjustedStartOffset,
        to: adjustedEndOffset,
        insert: '',
      },
    }
  }

  /**
   * Move a node to a new location
   */
  moveNode(
    sourceNodeId: string,
    targetId: string,
    placement: 'before' | 'after' | 'inside',
    insertionIndex?: number,
    options?: { properties?: string }
  ): ModificationResult {
    const sourceMapping = this.ports.sourceMap.getNodeById(sourceNodeId)
    if (!sourceMapping) {
      return this.errorResult(`Source node not found: ${sourceNodeId}`)
    }

    const targetMapping = this.ports.sourceMap.getNodeById(targetId)
    if (!targetMapping) {
      return this.errorResult(`Target node not found: ${targetId}`)
    }

    // Prevent dropping onto self or descendants
    if (sourceNodeId === targetId) {
      return this.errorResult('Cannot move node onto itself')
    }

    if (this.ports.sourceMap.isDescendantOf(targetId, sourceNodeId)) {
      return this.errorResult('Cannot move node into its own descendant')
    }

    const lines = this.ports.document.getLines()

    // Extract the source block
    const startLine = sourceMapping.position.line
    const endLine = this.getBlockEndLine(startLine)
    const sourceLines = Array.from(lines).slice(startLine - 1, endLine)
    const sourceBlock = sourceLines.join('\n')

    // Get source indentation
    const sourceIndent = this.ports.document.getLineIndent(sourceLines[0])

    // Calculate target indentation
    let targetIndent: string
    if (placement === 'inside') {
      const targetLine = lines[targetMapping.position.line - 1]
      targetIndent = this.ports.document.getLineIndent(targetLine) + '  '
    } else {
      const targetLine = lines[targetMapping.position.line - 1]
      targetIndent = this.ports.document.getLineIndent(targetLine)
    }

    // Re-indent the source block
    let reindentedBlock = this.reindentBlock(sourceBlock, sourceIndent, targetIndent)

    // Add properties if specified
    if (options?.properties) {
      const blockLines = reindentedBlock.split('\n')
      if (blockLines.length > 0) {
        blockLines[0] = blockLines[0].trimEnd() + ', ' + options.properties
        reindentedBlock = blockLines.join('\n')
      }
    }

    // Calculate remove positions
    const removeStart = this.ports.document.getCharacterOffset(startLine, 1)
    const endLineContent = lines[endLine - 1]
    let removeEnd = this.ports.document.getCharacterOffset(endLine, endLineContent.length + 1)

    // Handle newlines
    const hasNewlineAfter = endLine < lines.length
    let adjustedRemoveStart: number

    if (hasNewlineAfter) {
      removeEnd += 1
      adjustedRemoveStart = removeStart
    } else {
      adjustedRemoveStart = removeStart > 0 ? removeStart - 1 : removeStart
    }

    // Calculate insertion position
    let insertPosition: number
    let insertText: string

    if (placement === 'inside') {
      const children = this.ports.sourceMap
        .getChildren(targetId)
        .filter(c => c.nodeId !== sourceNodeId)
        .sort((a, b) => a.position.line - b.position.line)

      if (children.length > 0) {
        const validIndex =
          typeof insertionIndex === 'number' &&
          Number.isFinite(insertionIndex) &&
          insertionIndex >= 0 &&
          insertionIndex < children.length

        if (validIndex) {
          const targetChild = children[insertionIndex]
          insertPosition = this.ports.document.getCharacterOffset(targetChild.position.line, 1) - 1
          if (insertPosition < 0) insertPosition = 0
        } else {
          const lastChild = children.reduce((a, b) =>
            (a.position.endLine ?? a.position.line) > (b.position.endLine ?? b.position.line)
              ? a
              : b
          )
          const lastChildEndLine = lastChild.position.endLine ?? lastChild.position.line
          const lastChildLineContent = lines[lastChildEndLine - 1]
          insertPosition = this.ports.document.getCharacterOffset(
            lastChildEndLine,
            lastChildLineContent.length + 1
          )
        }
      } else {
        const parentLine = targetMapping.position.line
        const parentLineContent = lines[parentLine - 1]
        insertPosition = this.ports.document.getCharacterOffset(
          parentLine,
          parentLineContent.length + 1
        )
      }
      insertText = `\n${reindentedBlock}`
    } else if (placement === 'before') {
      insertPosition = this.ports.document.getCharacterOffset(targetMapping.position.line, 1) - 1
      if (insertPosition < 0) insertPosition = 0
      insertText = `\n${reindentedBlock}`
    } else {
      const targetEndLine = this.getBlockEndLine(targetMapping.position.line)
      const targetEndContent = lines[targetEndLine - 1]
      insertPosition = this.ports.document.getCharacterOffset(
        targetEndLine,
        targetEndContent.length + 1
      )
      insertText = `\n${reindentedBlock}`
    }

    // Adjust insertion position if it's after removal
    if (insertPosition > removeStart) {
      const removalLength = removeEnd - adjustedRemoveStart
      insertPosition -= removalLength
    }

    // Apply changes
    const currentSource = this.ports.document.getSource()
    const oldSourceLength = currentSource.length

    // First remove, then insert
    let newSource =
      currentSource.substring(0, adjustedRemoveStart) + currentSource.substring(removeEnd)
    newSource =
      newSource.substring(0, insertPosition) + insertText + newSource.substring(insertPosition)

    // Update document
    this.ports.document.setSource?.(newSource)

    return {
      success: true,
      newSource,
      change: {
        from: 0,
        to: oldSourceLength,
        insert: newSource,
      },
    }
  }

  /**
   * Duplicate a node to a new location
   */
  duplicateNode(
    sourceNodeId: string,
    targetId: string,
    placement: 'before' | 'after' | 'inside'
  ): ModificationResult {
    const sourceMapping = this.ports.sourceMap.getNodeById(sourceNodeId)
    if (!sourceMapping) {
      return this.errorResult(`Source node not found: ${sourceNodeId}`)
    }

    const targetMapping = this.ports.sourceMap.getNodeById(targetId)
    if (!targetMapping) {
      return this.errorResult(`Target node not found: ${targetId}`)
    }

    const lines = this.ports.document.getLines()

    // Extract the source block
    const startLine = sourceMapping.position.line
    const endLine = this.getBlockEndLine(startLine)
    const sourceLines = Array.from(lines).slice(startLine - 1, endLine)
    const sourceBlock = sourceLines.join('\n')

    // Get source indentation
    const sourceIndent = this.ports.document.getLineIndent(sourceLines[0])

    // Calculate target indentation
    let targetIndent: string
    if (placement === 'inside') {
      const targetLine = lines[targetMapping.position.line - 1]
      targetIndent = this.ports.document.getLineIndent(targetLine) + '  '
    } else {
      const targetLine = lines[targetMapping.position.line - 1]
      targetIndent = this.ports.document.getLineIndent(targetLine)
    }

    // Re-indent the source block
    const reindentedBlock = this.reindentBlock(sourceBlock, sourceIndent, targetIndent)

    // Calculate insertion position
    let insertPosition: number
    let insertText: string

    if (placement === 'inside') {
      const children = this.ports.sourceMap.getChildren(targetId)
      if (children.length > 0) {
        const lastChild = children.reduce((a, b) =>
          (a.position.endLine ?? a.position.line) > (b.position.endLine ?? b.position.line) ? a : b
        )
        const lastChildEndLine = lastChild.position.endLine ?? lastChild.position.line
        const lastChildLineContent = lines[lastChildEndLine - 1]
        insertPosition = this.ports.document.getCharacterOffset(
          lastChildEndLine,
          lastChildLineContent.length + 1
        )
      } else {
        const parentLine = targetMapping.position.line
        const parentLineContent = lines[parentLine - 1]
        insertPosition = this.ports.document.getCharacterOffset(
          parentLine,
          parentLineContent.length + 1
        )
      }
      insertText = `\n${reindentedBlock}`
    } else if (placement === 'before') {
      insertPosition = this.ports.document.getCharacterOffset(targetMapping.position.line, 1) - 1
      if (insertPosition < 0) insertPosition = 0
      insertText = `\n${reindentedBlock}`
    } else {
      const targetEndLine = this.getBlockEndLine(targetMapping.position.line)
      const targetEndContent = lines[targetEndLine - 1]
      insertPosition = this.ports.document.getCharacterOffset(
        targetEndLine,
        targetEndContent.length + 1
      )
      insertText = `\n${reindentedBlock}`
    }

    // Apply the change (insert only, no removal)
    const currentSource = this.ports.document.getSource()
    const newSource =
      currentSource.substring(0, insertPosition) +
      insertText +
      currentSource.substring(insertPosition)

    // Update document
    this.ports.document.setSource?.(newSource)

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

  // ============================================
  // Private Helper Methods
  // ============================================

  /**
   * Create an error result
   */
  private errorResult(error: string): ModificationResult {
    return {
      success: false,
      newSource: this.ports.document.getSource(),
      change: { from: 0, to: 0, insert: '' },
      error,
    }
  }

  /**
   * Calculate child insertion point
   */
  private calculateChildInsertionPoint(
    parentMapping: NodeMapping,
    children: NodeMapping[],
    position: 'first' | 'last' | number
  ): { charOffset: number; indent: string } {
    const lines = this.ports.document.getLines()
    const parentLine = lines[parentMapping.position.line - 1]
    const parentIndent = this.ports.document.getLineIndent(parentLine)
    const childIndent = parentIndent + '  '

    // Sort children by line number
    const sortedChildren = [...children].sort((a, b) => a.position.line - b.position.line)

    if (sortedChildren.length === 0) {
      // No children - insert after parent
      const lineContent = lines[parentMapping.position.line - 1]
      return {
        charOffset: this.ports.document.getCharacterOffset(
          parentMapping.position.line,
          lineContent.length + 1
        ),
        indent: childIndent,
      }
    }

    if (position === 'first') {
      const firstChild = sortedChildren[0]
      const charOffset = this.ports.document.getCharacterOffset(firstChild.position.line, 1) - 1
      return {
        charOffset: Math.max(0, charOffset),
        indent: childIndent,
      }
    }

    // Default to 'last' or numeric position
    let targetIndex = sortedChildren.length - 1
    if (typeof position === 'number' && Number.isFinite(position) && position >= 0) {
      targetIndex = Math.min(position - 1, sortedChildren.length - 1)
      targetIndex = Math.max(0, targetIndex)
    }

    const targetChild = sortedChildren[targetIndex]
    const targetEndLine = targetChild.position.endLine ?? targetChild.position.line
    const lineContent = lines[targetEndLine - 1]

    return {
      charOffset: this.ports.document.getCharacterOffset(targetEndLine, lineContent.length + 1),
      indent: childIndent,
    }
  }

  /**
   * Build a component line
   */
  private buildComponentLine(
    componentName: string,
    properties?: string,
    textContent?: string,
    indent: string = ''
  ): string {
    let line = `${indent}${componentName}`

    if (textContent) {
      const quotedText = textContent.startsWith('"') ? textContent : `"${textContent}"`
      line += ` ${quotedText}`
    }

    if (properties) {
      line += textContent ? `, ${properties}` : ` ${properties}`
    }

    return line
  }

  /**
   * Get the end line of a block (including children)
   */
  private getBlockEndLine(startLine: number): number {
    const lines = this.ports.document.getLines()
    const lineIndex = startLine - 1

    if (lineIndex < 0 || lineIndex >= lines.length) {
      return startLine
    }

    const blockLine = lines[lineIndex]
    const blockIndent = this.ports.document.getLineIndent(blockLine).length

    let endLine = startLine
    for (let i = lineIndex + 1; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      if (trimmed === '') continue

      const lineIndent = this.ports.document.getLineIndent(line).length
      if (lineIndent <= blockIndent) break

      endLine = i + 1
    }

    return endLine
  }

  /**
   * Re-indent a block of code
   */
  private reindentBlock(block: string, oldIndent: string, newIndent: string): string {
    const lines = block.split('\n')
    return lines
      .map((line, index) => {
        if (index === 0) {
          return newIndent + line.substring(oldIndent.length)
        }
        if (line.startsWith(oldIndent)) {
          const extraIndent = line.substring(oldIndent.length)
          return newIndent + extraIndent
        }
        return line
      })
      .join('\n')
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a CodeModifierV2 instance with the given ports
 */
export function createCodeModifierV2(ports: CodeModifierPorts): CodeModifierV2 {
  return new CodeModifierV2(ports)
}
