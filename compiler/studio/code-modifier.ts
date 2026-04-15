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

import type { SourceMap, NodeMapping } from '../ir/source-map'
import type { SourcePosition } from '../ir/types'
import { logCodeModifier as log } from '../utils/logger'
// SemanticZone type for insertWithWrapper
type SemanticZone =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'
import {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
  getCanonicalName,
  isSameProperty,
  type ParsedLine,
} from './line-property-parser'
import { adjustTemplateIndentation } from '../schema/component-templates'

/**
 * Result of a code modification
 */
export interface CodeChange {
  from: number // Start position (character offset)
  to: number // End position (character offset)
  insert: string // Text to insert
}

/**
 * Result of a code modification operation
 */
export interface ModificationResult {
  success: boolean
  newSource: string
  change: CodeChange
  error?: string
  /** True if the operation succeeded but made no changes (e.g., position unchanged) */
  noChange?: boolean
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
 * Snapshot of CodeModifier state for rollback
 */
interface StateSnapshot {
  source: string
  lines: string[]
}

/**
 * CodeModifier class
 *
 * @deprecated Since v2.0. Use CodeModifierV2 from './code-modifier-v2' instead.
 * CodeModifierV2 uses hexagonal architecture with ports for better testability.
 * This class will be removed in v3.0.
 */
export class CodeModifier {
  private source: string
  private sourceMap: SourceMap
  private lines: string[]
  private snapshot: StateSnapshot | null = null

  constructor(source: string, sourceMap: SourceMap) {
    this.source = source
    this.sourceMap = sourceMap
    this.lines = source.split('\n')
  }

  /**
   * Create a snapshot of current state for potential rollback
   * Use before multi-step operations that might fail mid-way
   */
  createSnapshot(): void {
    this.snapshot = {
      source: this.source,
      lines: [...this.lines],
    }
  }

  /**
   * Restore state from snapshot
   * Call this if a multi-step operation fails and needs to be rolled back
   */
  restoreSnapshot(): boolean {
    if (!this.snapshot) {
      return false
    }
    this.source = this.snapshot.source
    this.lines = this.snapshot.lines
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

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newLines

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

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newLines

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

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newLines

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
    const newSource =
      this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newSource.split('\n')

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
   *
   * Used for complex components like Tabs, Carousel, etc. that need children.
   * The template should use relative indentation (2 spaces per level).
   *
   * @param parentId - The parent node to insert into
   * @param templateCode - Multi-line template code with relative indentation
   * @param options - Insertion options (position)
   */
  addChildWithTemplate(
    parentId: string,
    templateCode: string,
    options: Pick<AddChildOptions, 'position'> = {}
  ): ModificationResult {
    const { position = 'last' } = options

    // Get parent node mapping
    const parentMapping = this.sourceMap.getNodeById(parentId)
    if (!parentMapping) {
      return this.errorResult(`Parent node not found: ${parentId}`)
    }

    // Get existing children
    const children = this.sourceMap.getChildren(parentId)

    // Calculate insertion point and indentation
    const insertionInfo = this.calculateChildInsertionPoint(parentMapping, children, position)

    // Adjust template indentation
    const adjustedTemplate = adjustTemplateIndentation(templateCode, insertionInfo.indent)

    // Create the change
    const insertText = `\n${adjustedTemplate}`
    const insertPosition = insertionInfo.charOffset

    // Apply the change
    const newSource =
      this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newSource.split('\n')

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
   * Add a child relative to a sibling using a multi-line template
   */
  addChildWithTemplateRelativeTo(
    siblingId: string,
    templateCode: string,
    placement: 'before' | 'after'
  ): ModificationResult {
    // Get sibling node mapping
    const siblingMapping = this.sourceMap.getNodeById(siblingId)
    if (!siblingMapping) {
      return this.errorResult(`Sibling node not found: ${siblingId}`)
    }

    // Validate line position
    const lineIndex = siblingMapping.position.line - 1
    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      log.error('Invalid line position in addChildWithTemplateRelativeTo', {
        siblingId,
        line: siblingMapping.position.line,
        lineIndex,
        totalLines: this.lines.length,
      })
      return this.errorResult(
        `Invalid line position for sibling: ${siblingId} (line ${siblingMapping.position.line})`
      )
    }

    // Get sibling's line to determine indentation
    const siblingLine = this.lines[lineIndex]
    const indent = this.getLineIndent(siblingLine)

    // Adjust template indentation
    const adjustedTemplate = adjustTemplateIndentation(templateCode, indent)

    let insertPosition: number
    let insertText: string

    if (placement === 'before') {
      // Insert before sibling's line
      insertPosition = this.getCharacterOffset(siblingMapping.position.line, 1)
      insertText = `${adjustedTemplate}\n`
    } else {
      // Insert after sibling (at end of sibling's block)
      // Use getBlockEndLine to find actual end including all children
      const siblingEndLine = this.getBlockEndLine(siblingMapping.position.line)
      const endLineContent = this.lines[siblingEndLine - 1]
      insertPosition = this.getCharacterOffset(siblingEndLine, endLineContent.length + 1)
      insertText = `\n${adjustedTemplate}`
    }

    // Apply the change
    const newSource =
      this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newSource.split('\n')

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

    // Validate line position
    const lineIndex = siblingMapping.position.line - 1
    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      log.error('Invalid line position in addChildRelativeTo', {
        siblingId,
        line: siblingMapping.position.line,
        lineIndex,
        totalLines: this.lines.length,
      })
      return this.errorResult(
        `Invalid line position for sibling: ${siblingId} (line ${siblingMapping.position.line})`
      )
    }

    // Get sibling's line to determine indentation
    const siblingLine = this.lines[lineIndex]
    const indent = this.getLineIndent(siblingLine)

    // Build the new component line
    const componentLine = this.buildComponentLine(componentName, properties, textContent, indent)

    let insertPosition: number
    let insertText: string

    if (placement === 'before') {
      // Insert before sibling's line
      insertPosition = this.getCharacterOffset(siblingMapping.position.line, 1)
      insertText = `${componentLine}\n`
    } else {
      // Insert after sibling (at end of sibling's block)
      // Use getBlockEndLine to find actual end including all children
      const siblingEndLine = this.getBlockEndLine(siblingMapping.position.line)
      const endLineContent = this.lines[siblingEndLine - 1]
      insertPosition = this.getCharacterOffset(siblingEndLine, endLineContent.length + 1)
      insertText = `\n${componentLine}`
    }

    // Apply the change
    const newSource =
      this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newSource.split('\n')

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

    // Get the full block span (node line to actual endLine including children)
    const startLine = nodeMapping.position.line
    const endLine = this.getBlockEndLine(startLine)

    // Calculate character offsets for the entire block
    const startOffset = this.getCharacterOffset(startLine, 1)
    const endLineContent = this.lines[endLine - 1]
    const endOffset = this.getCharacterOffset(endLine, endLineContent.length + 1)

    // Determine what to remove:
    // We need to remove exactly ONE newline (either before or after the block)
    // to avoid merging adjacent lines or leaving double newlines

    let adjustedStartOffset = startOffset
    let adjustedEndOffset = endOffset

    if (startLine === 1 && endLine === this.lines.length) {
      // Removing everything - no newline adjustment needed
    } else if (endLine < this.lines.length) {
      // There's a line after - remove the newline AFTER the block
      adjustedEndOffset = endOffset + 1
    } else if (startLine > 1) {
      // No line after, but there's a line before - remove the newline BEFORE the block
      adjustedStartOffset = startOffset - 1
    }

    // Build the new source
    const newSource =
      this.source.substring(0, adjustedStartOffset) + this.source.substring(adjustedEndOffset)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

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
   * Replace a Slot with a component, transferring Slot's properties
   *
   * When dropping onto a Slot, the Slot is replaced by the new component.
   * The Slot's layout properties (w, h, etc.) are transferred to the new component.
   *
   * @param slotNodeId - The node ID of the Slot to replace
   * @param componentName - The name of the component to insert
   * @param options - Properties and text content for the new component
   */
  replaceSlot(
    slotNodeId: string,
    componentName: string,
    options: AddChildOptions = {}
  ): ModificationResult {
    const slotMapping = this.sourceMap.getNodeById(slotNodeId)
    if (!slotMapping) {
      return this.errorResult(`Slot not found: ${slotNodeId}`)
    }

    // Get the slot's line content to extract properties
    const slotLine = this.lines[slotMapping.position.line - 1]
    const slotIndent = slotLine.match(/^(\s*)/)?.[1] || ''

    // Extract properties from the slot line (everything after "Slot "Label"")
    // Pattern: Slot "Label", w full, h 100 → properties: "w full, h 100"
    const slotMatch = slotLine.match(/^\s*Slot\s+"[^"]*"(?:,?\s*(.+))?$/)
    const slotProperties = slotMatch?.[1]?.trim() || ''

    // Merge slot properties with new component properties
    let mergedProperties = options.properties || ''
    if (slotProperties) {
      // Slot properties that should be transferred (layout properties)
      const transferProps = ['w', 'h', 'minw', 'maxw', 'minh', 'maxh', 'pad', 'margin']

      // Parse slot properties
      const slotPropParts = slotProperties
        .split(',')
        .map(p => p.trim())
        .filter(Boolean)

      // Only transfer layout properties that aren't already in the new component
      for (const prop of slotPropParts) {
        const propName = prop.split(/\s+/)[0]
        if (transferProps.some(tp => propName.startsWith(tp))) {
          // Check if this property is not already in merged
          if (!mergedProperties.includes(propName)) {
            mergedProperties = mergedProperties ? `${mergedProperties}, ${prop}` : prop
          }
        }
      }
    }

    // Build the new component line
    let newLine = `${slotIndent}${componentName}`
    if (options.textContent) {
      newLine += ` "${options.textContent}"`
    }
    if (mergedProperties) {
      newLine += `, ${mergedProperties}`
    }

    // Calculate the replacement range
    const startOffset = this.getCharacterOffset(slotMapping.position.line, 1)
    const endLineContent = this.lines[slotMapping.position.line - 1]
    let endOffset = this.getCharacterOffset(slotMapping.position.line, endLineContent.length + 1)

    // Include the newline if replacing mid-file
    if (slotMapping.position.line < this.lines.length) {
      endOffset += 1
    }

    // Build new source
    const newSource =
      this.source.substring(0, startOffset) + newLine + '\n' + this.source.substring(endOffset)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    return {
      success: true,
      newSource,
      change: {
        from: startOffset,
        to: endOffset,
        insert: newLine + '\n',
      },
    }
  }

  /**
   * Move a node to a new location relative to another node
   * @param insertionIndex - For 'inside' placement: position among siblings (0 = first)
   * @param options - Optional: properties to add to the moved element
   */
  moveNode(
    sourceNodeId: string,
    targetId: string,
    placement: 'before' | 'after' | 'inside',
    insertionIndex?: number,
    options?: { properties?: string }
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

    // Extract the source block text (including all children)
    const startLine = sourceMapping.position.line
    const endLine = this.getBlockEndLine(startLine)
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
    let reindentedBlock = this.reindentBlock(sourceBlock, sourceIndent, targetIndent)

    // If properties are specified, update or add them to the first line of the block
    // This properly replaces existing properties (e.g., x, y) instead of appending duplicates
    if (options?.properties) {
      const blockLines = reindentedBlock.split('\n')
      if (blockLines.length > 0) {
        let firstLine = blockLines[0]

        // Parse the properties to update (format: "x 0, y 84")
        // Use a dummy component prefix to parse the properties string
        const propsToUpdate = parseLine('Dummy ' + options.properties)

        // Parse the existing first line
        let parsedFirstLine = parseLine(firstLine)

        // Update or add each property
        for (const prop of propsToUpdate.properties) {
          // updatePropertyInLine handles both update (if exists) and add (if not)
          firstLine = updatePropertyInLine(parsedFirstLine, prop.name, prop.value)
          // Re-parse after each modification to get correct positions for next property
          parsedFirstLine = parseLine(firstLine)
        }

        blockLines[0] = firstLine
        reindentedBlock = blockLines.join('\n')
      }
    }

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
      // Insert as child of target
      const children = this.sourceMap
        .getChildren(targetId)
        // Filter out the source node if it's already a child (prevents self-reference issues)
        .filter(c => c.nodeId !== sourceNodeId)
        // Sort by line number for correct ordering
        .sort((a, b) => a.position.line - b.position.line)

      if (children.length > 0) {
        // Check if insertionIndex specifies a valid position
        const validIndex =
          typeof insertionIndex === 'number' &&
          Number.isFinite(insertionIndex) &&
          insertionIndex >= 0 &&
          insertionIndex < children.length
        if (validIndex) {
          // Insert before the child at insertionIndex
          const targetChild = children[insertionIndex]
          insertPosition = this.getCharacterOffset(targetChild.position.line, 1) - 1
          if (insertPosition < 0) insertPosition = 0
        } else {
          // After last child (default)
          const lastChild = children.reduce((a, b) =>
            a.position.endLine > b.position.endLine ? a : b
          )
          const lastChildEndLine = lastChild.position.endLine
          const lastChildLineContent = this.lines[lastChildEndLine - 1]
          insertPosition = this.getCharacterOffset(
            lastChildEndLine,
            lastChildLineContent.length + 1
          )
        }
      } else {
        // After parent line (no children yet)
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
      // After target - use getBlockEndLine to find actual end including all children
      const targetEndLine = this.getBlockEndLine(targetMapping.position.line)
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
    newSource =
      newSource.substring(0, insertPosition) + insertText + newSource.substring(insertPosition)

    // Save old source length before persisting (needed for CodeMirror change)
    const oldSourceLength = this.source.length

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    // For move operations, replace the entire document since we have both remove and insert
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
   * Duplicate a node to a new location (copy without removing original)
   */
  duplicateNode(
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

    // Extract the source block text (including all children)
    const startLine = sourceMapping.position.line
    const endLine = this.getBlockEndLine(startLine)
    const sourceLines = this.lines.slice(startLine - 1, endLine)
    const sourceBlock = sourceLines.join('\n')

    // Get the source indentation
    const sourceIndent = this.getLineIndent(sourceLines[0])

    // Calculate target indentation
    let targetIndent: string
    if (placement === 'inside') {
      const targetLine = this.lines[targetMapping.position.line - 1]
      targetIndent = this.getLineIndent(targetLine) + '  '
    } else {
      const targetLine = this.lines[targetMapping.position.line - 1]
      targetIndent = this.getLineIndent(targetLine)
    }

    // Re-indent the source block
    const reindentedBlock = this.reindentBlock(sourceBlock, sourceIndent, targetIndent)

    // Calculate insertion position
    let insertPosition: number
    let insertText: string

    if (placement === 'inside') {
      const children = this.sourceMap.getChildren(targetId)
      if (children.length > 0) {
        const lastChild = children.reduce((a, b) =>
          a.position.endLine > b.position.endLine ? a : b
        )
        const lastChildEndLine = lastChild.position.endLine
        const lastChildLineContent = this.lines[lastChildEndLine - 1]
        insertPosition = this.getCharacterOffset(lastChildEndLine, lastChildLineContent.length + 1)
      } else {
        const parentLine = targetMapping.position.line
        const parentLineContent = this.lines[parentLine - 1]
        insertPosition = this.getCharacterOffset(parentLine, parentLineContent.length + 1)
      }
      insertText = `\n${reindentedBlock}`
    } else if (placement === 'before') {
      insertPosition = this.getCharacterOffset(targetMapping.position.line, 1) - 1
      if (insertPosition < 0) insertPosition = 0
      insertText = `\n${reindentedBlock}`
    } else {
      // After target - use getBlockEndLine to find actual end including all children
      const targetEndLine = this.getBlockEndLine(targetMapping.position.line)
      const targetEndContent = this.lines[targetEndLine - 1]
      insertPosition = this.getCharacterOffset(targetEndLine, targetEndContent.length + 1)
      insertText = `\n${reindentedBlock}`
    }

    // Insert without removing original
    const newSource =
      this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

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
    return block
      .split('\n')
      .map((line, index) => {
        if (index === 0) return newIndent + line.substring(oldIndent.length)
        if (line.startsWith(oldIndent)) return newIndent + line.substring(oldIndent.length)
        return line
      })
      .join('\n')
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
    const sortedChildren = [...children].sort((a, b) => a.position.line - b.position.line)

    if (sortedChildren.length === 0) {
      // No children yet - insert after parent line
      const parentEndLine = parentMapping.position.line
      const lineContent = this.lines[parentEndLine - 1]
      return {
        charOffset: this.getCharacterOffset(parentEndLine, lineContent.length + 1),
        indent: childIndent,
      }
    }

    // Handle position 0 as 'first'
    if (position === 'first' || position === 0) {
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
      // Validate position: must be finite and positive (0 is handled above as 'first')
      if (typeof position === 'number' && Number.isFinite(position) && position > 0) {
        // position 1 = after first child (targetIndex 0)
        // position 2 = after second child (targetIndex 1)
        targetIndex = Math.min(position - 1, sortedChildren.length - 1)
      }

      const targetChild = sortedChildren[targetIndex]
      // Use getBlockEndLine to find the actual end of the child including all its children
      const targetEndLine = this.getBlockEndLine(targetChild.position.line)
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

    // Mirror DSL syntax: textContent comes BEFORE properties
    // e.g., Button "Click me", bg #2271C1  or  Icon "star", is 24
    if (textContent) {
      // Add text content (with quotes if not already quoted)
      const quotedText = textContent.startsWith('"') ? textContent : `"${textContent}"`
      line += ` ${quotedText}`
    }

    if (properties) {
      if (textContent) {
        line += `, ${properties}`
      } else {
        line += ` ${properties}`
      }
    }

    return line
  }

  /**
   * Get the indentation of a line (leading whitespace)
   */
  private getLineIndent(line: string | undefined): string {
    if (!line) return ''
    const match = line.match(/^(\s*)/)
    return match ? match[1] : ''
  }

  /**
   * Find the actual end line of a block (including all children)
   * by looking at indentation levels.
   *
   * @param startLine - 1-based line number where the block starts
   * @returns 1-based line number where the block ends
   */
  private getBlockEndLine(startLine: number): number {
    const lineIndex = startLine - 1
    if (lineIndex < 0 || lineIndex >= this.lines.length) {
      return startLine
    }

    const blockLine = this.lines[lineIndex]
    const blockIndent = this.getLineIndent(blockLine).length

    // Walk through subsequent lines
    let endLine = startLine
    for (let i = lineIndex + 1; i < this.lines.length; i++) {
      const line = this.lines[i]
      const trimmed = line.trim()

      // Empty lines: only include if followed by more indented content
      if (trimmed === '') {
        // Don't include empty line yet - peek ahead to see what follows
        continue
      }

      // For comments and code, check indentation
      const lineIndent = this.getLineIndent(line).length
      if (lineIndent <= blockIndent) {
        // This line is at same or lower indentation - block ended before this
        break
      }

      // This line is more indented - it's part of the block
      // Also include any skipped empty lines
      endLine = i + 1
    }

    return endLine
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
      .map(p => (p.isBoolean ? p.name : `${p.name} ${p.value}`))
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
    // Note: use this.source.length BEFORE persisting (old length for CodeMirror)
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

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = currentLines

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
      // Convert to 0-based index for array access
      const startIndex = startLine - 1

      for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i]
        if (line.trim() === '') continue

        const currentIndent = line.match(/^(\s*)/)?.[1].length || 0
        if (currentIndent <= baseIndent && i > startIndex) {
          break
        }
        endLine = i + 1 // Convert back to 1-based for getCharacterOffset
      }

      const from = this.getCharacterOffset(startLine, 1)
      const toOffset = this.getCharacterOffset(endLine, lines[endLine - 1].length + 1)

      const newSource = this.source.substring(0, from) + dsl + this.source.substring(toOffset)

      // Persist changes for subsequent operations
      this.source = newSource
      this.lines = newSource.split('\n')

      return {
        success: true,
        newSource,
        change: { from, to: toOffset, insert: dsl },
      }
    } else {
      // Create new animation - insert at top of file after tokens
      const insertPosition = this.findAnimationInsertPosition()
      const newSource =
        this.source.substring(0, insertPosition) +
        dsl +
        '\n\n' +
        this.source.substring(insertPosition)

      // Persist changes for subsequent operations
      this.source = newSource
      this.lines = newSource.split('\n')

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
    // Convert to 0-based index for array access
    const startIndex = startLine - 1

    // Find position to insert (sorted by time)
    // insertLine is 1-based (for getCharacterOffset)
    // Default to right after the animation definition line
    let insertLine = startLine + 1
    let lastKeyframeLine = startLine

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i]
      if (line.trim() === '') continue

      const currentIndent = line.match(/^(\s*)/)?.[1].length || 0
      if (currentIndent <= baseIndent && i > startIndex) {
        break // Reached end of animation block
      }

      // Track last line of animation block for fallback insert position
      lastKeyframeLine = i + 1 // 1-based

      // Check if this line is a keyframe (starts with a time value)
      const keyframeMatch = line.match(/^\s*([\d.]+)\s+/)
      if (keyframeMatch) {
        const lineTime = parseFloat(keyframeMatch[1])
        if (lineTime < time) {
          // Insert after this keyframe (sorted by time)
          insertLine = i + 2 // i is 0-based, +1 for 1-based, +1 for "after"
        }
      }
    }

    // Ensure insertLine doesn't exceed document bounds
    insertLine = Math.min(insertLine, this.lines.length + 1)

    // Build the new keyframe line
    const propsStr = properties.map(p => `${p.property} ${p.value}`).join(', ')
    const newLine = `${keyframeIndent}${time.toFixed(2)} ${propsStr}`

    // insertLine is already 1-based
    const insertPosition = this.getCharacterOffset(insertLine, 1)
    const newSource =
      this.source.substring(0, insertPosition) +
      newLine +
      '\n' +
      this.source.substring(insertPosition)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    return {
      success: true,
      newSource,
      change: { from: insertPosition, to: insertPosition, insert: newLine + '\n' },
    }
  }

  // ===========================================
  // SEMANTIC ZONE / DIRECT CONTAINER LAYOUT
  // ===========================================

  /**
   * Layout properties to apply to container based on semantic zone
   *
   * The 9-zone alignment properties map directly to zone names.
   * Each property sets display:flex + flex-direction:column + justify/align.
   *
   * center-left is the default (no property needed) because:
   * - flex-direction: column (default vertical flow)
   * - justify-content: center (centered vertically)
   * - align-items: flex-start (left-aligned)
   */
  private static readonly ZONE_CONTAINER_LAYOUT: Record<SemanticZone, string> = {
    'top-left': 'top-left',
    'top-center': 'top-center',
    'top-right': 'top-right',
    'center-left': '', // default, no layout needed
    center: 'center',
    'center-right': 'center-right',
    'bottom-left': 'bottom-left',
    'bottom-center': 'bottom-center',
    'bottom-right': 'bottom-right',
  }

  /**
   * Get layout properties for a semantic zone
   */
  getLayoutForZone(zone: SemanticZone): string {
    return CodeModifier.ZONE_CONTAINER_LAYOUT[zone]
  }

  /**
   * Check if container already has layout/alignment properties
   */
  private containerHasLayoutDirection(containerLine: string): boolean {
    const layoutProps = [
      'ver',
      'hor',
      'center',
      'spread',
      'grid',
      'left',
      'right',
      'top',
      'bottom',
      'hor-center',
      'ver-center',
      // Absolute layout properties - don't add flex layout to these containers
      'stacked',
    ]
    const parsedLine = parseLine(containerLine)
    return parsedLine.properties.some(p => layoutProps.includes(p.name))
  }

  /**
   * Apply layout properties to a container based on semantic zone
   *
   * Returns a modified source with layout properties added to the container line.
   */
  applyLayoutToContainer(containerId: string, semanticZone: SemanticZone): ModificationResult {
    const layoutProps = this.getLayoutForZone(semanticZone)

    // No layout needed for center-left (default)
    if (!layoutProps) {
      return {
        success: true,
        newSource: this.source,
        change: { from: 0, to: 0, insert: '' },
      }
    }

    const containerMapping = this.sourceMap.getNodeById(containerId)
    if (!containerMapping) {
      return this.errorResult(`Container not found: ${containerId}`)
    }

    // Get container's line
    const containerLine = this.lines[containerMapping.position.line - 1]

    // Check if container already has layout - skip if it does
    if (this.containerHasLayoutDirection(containerLine)) {
      return {
        success: true,
        newSource: this.source,
        change: { from: 0, to: 0, insert: '' },
      }
    }

    // Parse the line and add layout properties
    const parsedLine = parseLine(containerLine)

    // Add each layout property
    let newLine = containerLine
    const propsToAdd = layoutProps
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)

    for (const prop of propsToAdd) {
      // Handle boolean props (ver, hor, center, spread) vs value props
      const parts = prop.split(/\s+/)
      const propName = parts[0]
      const propValue = parts.slice(1).join(' ') || 'true'

      // Check if property already exists
      const existingProp = findPropertyInLine(parseLine(newLine), propName)
      if (!existingProp) {
        // Add the property
        const parsed = parseLine(newLine)
        if (propValue === 'true') {
          newLine = addPropertyToLine(parsed, propName, '')
        } else {
          newLine = addPropertyToLine(parsed, propName, propValue)
        }
      }
    }

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(containerMapping.position.line, 1)
    const from = lineStartOffset
    const to = lineStartOffset + containerLine.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[containerMapping.position.line - 1] = newLine
    const newSource = newLines.join('\n')

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newLines

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
   * Insert a component with layout applied to container based on semantic zone
   *
   * Instead of creating wrapper elements, this method:
   * 1. Applies layout properties directly to the container (if empty)
   * 2. Inserts the child component directly
   *
   * This ensures "Weitere Geschwister haben dann automatisch das gleiche Align Attribut"
   * (subsequent siblings automatically share the same alignment)
   */
  insertWithWrapper(
    parentId: string,
    componentName: string,
    semanticZone: SemanticZone,
    options: AddChildOptions = {}
  ): ModificationResult {
    // Get parent node mapping
    const parentMapping = this.sourceMap.getNodeById(parentId)
    if (!parentMapping) {
      return this.errorResult(`Parent node not found: ${parentId}`)
    }

    // Create snapshot for rollback if multi-step operation fails
    this.createSnapshot()

    // Check if container already has children
    const children = this.sourceMap.getChildren(parentId)

    let layoutChange: { from: number; to: number; insert: string } | null = null
    let layoutLengthDelta = 0

    if (children.length === 0) {
      // Empty container: apply layout properties based on zone
      const layoutResult = this.applyLayoutToContainer(parentId, semanticZone)

      if (!layoutResult.success) {
        this.restoreSnapshot()
        return layoutResult
      }

      // If layout was applied, update our internal state and track the change
      // Check for actual changes: either content was replaced (from !== to) or new content inserted
      const hasLayoutChange =
        layoutResult.change.from !== layoutResult.change.to || layoutResult.change.insert
      if (hasLayoutChange) {
        layoutChange = layoutResult.change
        // Calculate how much the layout change shifted positions
        layoutLengthDelta =
          layoutResult.change.insert.length - (layoutResult.change.to - layoutResult.change.from)
        this.source = layoutResult.newSource
        this.lines = this.source.split('\n')
      }
    }

    // Insert child directly (no wrapper)
    const childResult = this.addChild(parentId, componentName, options)

    if (!childResult.success) {
      // Rollback the layout change if child insert failed
      this.restoreSnapshot()
      return childResult
    }

    // Success - clear the snapshot
    this.clearSnapshot()

    // If we had a layout change, we need to combine the changes
    // The child change offsets are relative to the source AFTER layout was applied
    // We need to return a combined change relative to the ORIGINAL source
    if (layoutChange) {
      // The child insert position needs to be adjusted back to original source coordinates
      // by subtracting the length delta from the layout change
      const adjustedChildFrom = childResult.change.from - layoutLengthDelta
      const adjustedChildTo = childResult.change.to - layoutLengthDelta

      // Combine into a single change that replaces from layoutChange.from to adjustedChildTo
      // with the layout insert + child insert
      const combinedInsert = layoutChange.insert + childResult.change.insert

      return {
        success: true,
        newSource: childResult.newSource,
        change: {
          from: layoutChange.from,
          to: layoutChange.to,
          insert: combinedInsert,
        },
      }
    }

    return childResult
  }

  // ===========================================
  // MULTI-SELECT / WRAP NODES
  // ===========================================

  /**
   * Wrap multiple sibling nodes in a new container
   *
   * Takes 2+ nodes that share the same parent and wraps them in a Box.
   * Used for grouping selected elements via Cmd/Ctrl+G.
   */
  wrapNodes(
    nodeIds: string[],
    wrapperName: string = 'Box',
    wrapperProps?: string
  ): ModificationResult {
    if (nodeIds.length < 2) {
      return this.errorResult('Need at least 2 nodes to wrap')
    }

    // Get all node mappings
    const mappings = nodeIds.map(id => this.sourceMap.getNodeById(id))
    if (mappings.some(m => !m)) {
      return this.errorResult('Some nodes not found')
    }

    // Validate: all nodes must have the same parent
    const parents = mappings.map(m => m!.parentId)
    if (new Set(parents).size !== 1) {
      return this.errorResult('All nodes must have the same parent')
    }

    // Sort by line number
    const sortedNodes = (mappings.filter(Boolean) as NodeMapping[]).sort(
      (a, b) => a.position.line - b.position.line
    )

    const firstNode = sortedNodes[0]
    const lastNode = sortedNodes[sortedNodes.length - 1]

    // Get indentation of first node
    const firstLine = this.lines[firstNode.position.line - 1]
    const indent = this.getLineIndent(firstLine)

    // Build wrapper line
    const wrapperLine = wrapperProps
      ? `${indent}${wrapperName} ${wrapperProps}`
      : `${indent}${wrapperName}`

    // Get all lines from first to last node (including children)
    const startLine = firstNode.position.line
    const endLine = lastNode.position.endLine
    const nodeLines = this.lines.slice(startLine - 1, endLine)

    // Re-indent all lines relative to their current indentation
    // Each line gets 2 additional spaces, preserving nested structure
    const reindentedLines = nodeLines.map(line => {
      // Preserve empty lines
      if (line.trim() === '') return line
      // Add 2 spaces to existing indentation
      return '  ' + line
    })

    // Build new content
    const newContent = [wrapperLine, ...reindentedLines].join('\n')

    // Calculate character offsets
    const from = this.getCharacterOffset(startLine, 1)
    const endLineContent = this.lines[endLine - 1]
    const to = this.getCharacterOffset(endLine, endLineContent.length + 1)

    // Apply the change
    const newSource = this.source.substring(0, from) + newContent + this.source.substring(to)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    return {
      success: true,
      newSource,
      change: {
        from,
        to,
        insert: newContent,
      },
    }
  }

  /**
   * Unwrap a container node, moving its children up to the parent level
   *
   * Takes a container node and removes it, promoting all children
   * to siblings of the (now removed) container.
   * Used for ungrouping elements via Shift+Cmd/Ctrl+G.
   *
   * @param nodeId - The container node to unwrap
   */
  unwrapNode(nodeId: string): ModificationResult {
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return this.errorResult(`Node not found: ${nodeId}`)
    }

    // Check that node has a parent (can't unwrap root)
    if (!nodeMapping.parentId) {
      return this.errorResult('Cannot unwrap root node')
    }

    // Get children of the node to unwrap
    const children = this.sourceMap.getChildren(nodeId)
    if (children.length === 0) {
      return this.errorResult('Cannot unwrap node with no children')
    }

    // Get the container's line to determine its indentation
    const containerLine = this.lines[nodeMapping.position.line - 1]
    const containerIndent = this.getLineIndent(containerLine)

    // Get the full block span
    const startLine = nodeMapping.position.line
    const endLine = nodeMapping.position.endLine

    // Extract children's lines (everything after the container line)
    const childrenLines = this.lines.slice(startLine, endLine)

    // Calculate the indent difference (children are indented 2 spaces more than container)
    // We need to remove those 2 spaces to bring them up to the container's level
    const dedentedLines = childrenLines.map(line => {
      // Remove exactly 2 spaces of indentation if present
      if (line.startsWith(containerIndent + '  ')) {
        return containerIndent + line.substring(containerIndent.length + 2)
      }
      // Handle lines that might have different indentation (nested children)
      if (line.startsWith('  ')) {
        return line.substring(2)
      }
      return line
    })

    // Build new content (just the dedented children, no wrapper)
    const newContent = dedentedLines.join('\n')

    // Calculate character offsets
    const from = this.getCharacterOffset(startLine, 1)
    const endLineContent = this.lines[endLine - 1]
    const to = this.getCharacterOffset(endLine, endLineContent.length + 1)

    // Apply the change
    const newSource = this.source.substring(0, from) + newContent + this.source.substring(to)

    // Persist changes for subsequent operations
    this.source = newSource
    this.lines = newSource.split('\n')

    return {
      success: true,
      newSource,
      change: {
        from,
        to,
        insert: newContent,
      },
    }
  }

  // ===========================================
  // TEXT CONTENT MODIFICATION
  // ===========================================

  /**
   * Update text content of a text element
   *
   * Handles:
   * - Button "Old" → Button "New"
   * - Text "Hello" → Text "World"
   * - H1 "Title" → H1 "New Title"
   *
   * Preserves all properties on the same line.
   *
   * @returns ModificationResult with oldText for undo support
   */
  updateTextContent(nodeId: string, newText: string): ModificationResult & { oldText?: string } {
    const nodeMapping = this.sourceMap.getNodeById(nodeId)
    if (!nodeMapping) {
      return { ...this.errorResult(`Node not found: ${nodeId}`), oldText: undefined }
    }

    // Get the node's line
    const nodeLine = nodeMapping.position.line
    const line = this.lines[nodeLine - 1]
    if (!line) {
      return { ...this.errorResult(`Line not found: ${nodeLine}`), oldText: undefined }
    }

    // Parse the line
    const parsedLine = parseLine(line)

    // Get old text content
    const oldText = parsedLine.textContent
      ? parsedLine.textContent.replace(/^["']|["']$/g, '') // Remove quotes
      : ''

    // Escape quotes in new text
    const escapedNewText = newText.replace(/"/g, '\\"')

    // Build the new line
    let newLine: string

    if (parsedLine.textContent) {
      // Replace existing text content
      // Find the FIRST text content position after the component name
      // Using indexOf instead of lastIndexOf to avoid matching duplicate text in properties
      const componentEndApprox = parsedLine.indent.length + (parsedLine.componentPart?.length || 0)
      const textStart = line.indexOf(parsedLine.textContent, componentEndApprox)
      if (textStart !== -1) {
        newLine =
          line.substring(0, textStart) +
          `"${escapedNewText}"` +
          line.substring(textStart + parsedLine.textContent.length)
      } else {
        // Fallback: rebuild line
        newLine = this.rebuildLineWithText(parsedLine, escapedNewText)
      }
    } else {
      // Add text content after component name
      // Insert before first property or at end
      if (parsedLine.properties.length > 0) {
        // Insert text content before first property
        const firstProp = parsedLine.properties[0]
        const beforeProps = line.substring(0, firstProp.startIndex)
        const afterProps = line.substring(firstProp.startIndex)
        // Check if there's a comma separator or not
        const needsComma = afterProps.trim().startsWith(',') ? '' : ','
        newLine = `${beforeProps.trimEnd()} "${escapedNewText}"${needsComma} ${afterProps.trimStart()}`
      } else {
        // No properties, just append text content
        newLine = `${line.trimEnd()} "${escapedNewText}"`
      }
    }

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    // CRITICAL: Persist the changes for subsequent calls
    this.source = newSource
    this.lines = newLines

    return {
      success: true,
      newSource,
      change: {
        from,
        to,
        insert: newLine,
      },
      oldText,
    }
  }

  /**
   * Rebuild a line with new text content
   */
  private rebuildLineWithText(parsedLine: ParsedLine, newText: string): string {
    let line = parsedLine.indent + parsedLine.componentPart
    if (newText) line += ` "${newText}"`
    if (parsedLine.properties.length > 0) {
      line += `, ${parsedLine.properties.map(p => (p.isBoolean ? p.name : `${p.name} ${p.value}`)).join(', ')}`
    }
    return line
  }

  // ===========================================
  // EVENT METHODS
  // ===========================================

  /**
   * Format an event string for code insertion
   *
   * Examples:
   * - formatEventString('onclick', 'toggle') → 'onclick toggle()'
   * - formatEventString('onclick', 'show', 'Menu') → 'onclick show(Menu)'
   * - formatEventString('onkeydown', 'toggle', undefined, 'escape') → 'onkeydown escape toggle()'
   */
  private formatEventString(
    eventName: string,
    actionName: string,
    target?: string,
    key?: string
  ): string {
    return (
      eventName +
      (key ? ` ${key}` : '') +
      (target ? ` ${actionName}(${target})` : ` ${actionName}()`)
    )
  }

  /**
   * Parse events from a line to find their positions
   * Returns array of { eventStr, startIndex, endIndex }
   */
  private findEventsInLine(line: string): Array<{
    eventStr: string
    startIndex: number
    endIndex: number
    eventName: string
    key?: string
  }> {
    const events: Array<{
      eventStr: string
      startIndex: number
      endIndex: number
      eventName: string
      key?: string
    }> = []

    // Event pattern: onevent [key] action([target])
    // Match: onclick toggle(), onclick show(Menu), onkeydown escape toggle()
    const eventPattern = /\b(on[a-z-]+)(?:\s+([a-z-]+))?\s+([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]*)\)/g
    let match

    while ((match = eventPattern.exec(line)) !== null) {
      const eventName = match[1]
      const key = match[2]
      const startIndex = match.index
      const endIndex = match.index + match[0].length

      events.push({
        eventStr: match[0],
        startIndex,
        endIndex,
        eventName,
        key,
      })
    }

    return events
  }

  /**
   * Add an event to a node
   *
   * Adds an event handler to the node's line.
   * Example: Button "Click", pad 12 → Button "Click", pad 12, onclick toggle()
   *
   * @param nodeId - The node to add the event to
   * @param eventName - Event name (onclick, onhover, onkeydown, etc.)
   * @param actionName - Action to perform (toggle, show, hide, navigate, etc.)
   * @param target - Optional target element for the action
   * @param key - Optional key for keyboard events (escape, enter, etc.)
   */
  addEvent(
    nodeId: string,
    eventName: string,
    actionName: string,
    target?: string,
    key?: string
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

    // Format the event string
    const eventStr = this.formatEventString(eventName, actionName, target, key)

    // Check if line already has content (properties, text, etc.)
    const trimmedLine = line.trimEnd()

    // Add event after existing content
    let newLine: string
    if (trimmedLine.includes(',')) {
      // Has properties - add with comma
      newLine = `${trimmedLine}, ${eventStr}`
    } else {
      // Check if it's just the component name or has text
      const hasTextOrProps = /\s/.test(trimmedLine.substring(trimmedLine.search(/[A-Z]/)))
      if (hasTextOrProps) {
        newLine = `${trimmedLine}, ${eventStr}`
      } else {
        // Just component name
        newLine = `${trimmedLine} ${eventStr}`
      }
    }

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    // Persist the changes
    this.source = newSource
    this.lines = newLines

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
   * Remove an event from a node
   *
   * Removes an event handler from the node's line.
   *
   * @param nodeId - The node to remove the event from
   * @param eventName - Event name to remove (onclick, onhover, etc.)
   * @param key - Optional key to match (for keyboard events)
   */
  removeEvent(nodeId: string, eventName: string, key?: string): ModificationResult {
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

    // Find all events in the line
    const events = this.findEventsInLine(line)

    // Find the event to remove
    const eventToRemove = events.find(e => {
      if (e.eventName !== eventName) return false
      if (key && e.key !== key) return false
      if (!key && e.key) return false
      return true
    })

    if (!eventToRemove) {
      return this.errorResult(`Event not found: ${eventName}${key ? ' ' + key : ''}`)
    }

    // Remove the event from the line
    // Handle comma before or after the event
    const startIdx = eventToRemove.startIndex
    const endIdx = eventToRemove.endIndex

    // Check for leading comma and space
    const beforeEvent = line.substring(0, startIdx)
    const afterEvent = line.substring(endIdx)

    let newLine: string

    if (beforeEvent.trimEnd().endsWith(',')) {
      // Remove trailing comma and space before event
      const commaIdx = beforeEvent.lastIndexOf(',')
      newLine = line.substring(0, commaIdx) + afterEvent
    } else if (afterEvent.trimStart().startsWith(',')) {
      // Remove leading comma and space after event
      const afterComma = afterEvent.replace(/^\s*,\s*/, '')
      newLine = beforeEvent + afterComma
    } else {
      // Just remove the event
      newLine = beforeEvent + afterEvent
    }

    // Clean up any double spaces
    newLine = newLine.replace(/\s{2,}/g, ' ').trimEnd()

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    // Persist the changes
    this.source = newSource
    this.lines = newLines

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
   * Update an event on a node
   *
   * Replaces an existing event with new event/action/target.
   *
   * @param nodeId - The node containing the event
   * @param oldEventName - Current event name to replace
   * @param oldKey - Current key to match (for keyboard events)
   * @param newEventName - New event name
   * @param newActionName - New action name
   * @param newTarget - New target (optional)
   * @param newKey - New key for keyboard events (optional)
   */
  updateEvent(
    nodeId: string,
    oldEventName: string,
    oldKey: string | undefined,
    newEventName: string,
    newActionName: string,
    newTarget?: string,
    newKey?: string
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

    // Find all events in the line
    const events = this.findEventsInLine(line)

    // Find the event to update
    const eventToUpdate = events.find(e => {
      if (e.eventName !== oldEventName) return false
      if (oldKey && e.key !== oldKey) return false
      if (!oldKey && e.key) return false
      return true
    })

    if (!eventToUpdate) {
      return this.errorResult(`Event not found: ${oldEventName}${oldKey ? ' ' + oldKey : ''}`)
    }

    // Format the new event string
    const newEventStr = this.formatEventString(newEventName, newActionName, newTarget, newKey)

    // Replace the old event with the new one
    const newLine =
      line.substring(0, eventToUpdate.startIndex) +
      newEventStr +
      line.substring(eventToUpdate.endIndex)

    // Calculate character offsets for the change
    const lineStartOffset = this.getCharacterOffset(nodeLine, 1)
    const from = lineStartOffset
    const to = lineStartOffset + line.length

    // Apply the change
    const newLines = [...this.lines]
    newLines[nodeLine - 1] = newLine
    const newSource = newLines.join('\n')

    // Persist the changes
    this.source = newSource
    this.lines = newLines

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
   * Create an error result
   */
  private errorResult(error: string): ModificationResult {
    log.warn('Operation failed:', error)
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
