/**
 * Children Operations — addChild, addChildWithTemplate,
 * addChildWithTemplateRelativeTo, addChildRelativeTo, removeNode,
 * replaceSlot, moveNode, duplicateNode, plus children-specific helpers
 * (insertAsRoot, isDescendantOf, reindentBlock, calculateChildInsertionPoint,
 * buildComponentLine, getBlockEndLine).
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type { CodeModifier, ModificationResult, AddChildOptions } from './code-modifier'
import type { NodeMapping } from '../../compiler/ir/source-map'
import {
  parseLine,
  updatePropertyInLine,
  addPropertyToLine,
  removePropertyFromLine,
  findPropertyInLine,
} from './line-property-parser'
import { logCodeModifier as log } from '../../compiler/utils/logger'
import { adjustTemplateIndentation } from '../../compiler/schema/component-templates'

/**
 * Add a child component to a parent node
 */
export function addChild(
  this: CodeModifier,
  parentId: string,
  componentName: string,
  options: AddChildOptions = {}
): ModificationResult {
  const { position = 'last', properties, textContent, parentProperty } = options

  // Get parent node mapping
  const parentMapping = this.sourceMap.getNodeById(parentId)
  if (!parentMapping) {
    // Special case: empty canvas - insert as root element
    if (this.source.trim() === '' && parentId === 'node-1') {
      return this.insertAsRoot(componentName, properties, textContent)
    }
    return this.errorResult(`Parent node not found: ${parentId}`)
  }

  // Track combined changes for when we modify parent AND add child
  let combinedFrom = -1
  let combinedTo = -1
  let combinedInsert = ''
  let parentLengthDelta = 0

  // If parentProperty is specified, add it to the parent first
  if (parentProperty) {
    const parentLine = parentMapping.position.line
    const line = this.lines[parentLine - 1]
    if (line) {
      const parsedLine = parseLine(line)
      const newLine = addPropertyToLine(parsedLine, parentProperty, '')

      // Calculate character offsets for the parent change
      const lineStartOffset = this.getCharacterOffset(parentLine, 1)
      combinedFrom = lineStartOffset
      combinedTo = lineStartOffset + line.length
      combinedInsert = newLine
      parentLengthDelta = newLine.length - line.length

      // Apply the parent property change
      const newLines = [...this.lines]
      newLines[parentLine - 1] = newLine
      this.source = newLines.join('\n')
      this.lines = newLines
    }
  }

  // Get existing children (re-fetch after potential parent modification)
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

  // Create the change for child insertion
  const insertText = `\n${componentLine}`
  // Adjust insertion position if we modified the parent line
  const insertPosition = insertionInfo.charOffset + parentLengthDelta

  // Apply the child change
  const newSource =
    this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

  // CRITICAL: Persist the changes for subsequent calls
  this.source = newSource
  this.lines = newSource.split('\n')

  // If we had a parent property change, combine the changes
  if (parentProperty && combinedFrom >= 0) {
    // The combined change starts at the parent line and ends after the child insertion
    const finalTo = insertPosition + insertText.length
    return {
      success: true,
      newSource,
      change: {
        from: combinedFrom,
        to: combinedTo,
        insert: combinedInsert + this.source.substring(combinedTo + parentLengthDelta, finalTo),
      },
    }
  }

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
 * Insert a component as root element when canvas is empty
 * Called when dropping onto an empty canvas (no code yet)
 */
export function insertAsRoot(
  this: CodeModifier,
  componentName: string,
  properties?: string,
  textContent?: string
): ModificationResult {
  // Build the component line with no indentation (root level)
  const componentLine = this.buildComponentLine(componentName, properties, textContent, '')

  // Insert at the beginning (replacing any whitespace-only content)
  const newSource = componentLine + '\n'

  // Update internal state
  this.source = newSource
  this.lines = newSource.split('\n')

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
 * Add a child using a multi-line template
 *
 * Used for complex components like Tabs, Carousel, etc. that need children.
 * The template should use relative indentation (2 spaces per level).
 *
 * @param parentId - The parent node to insert into
 * @param templateCode - Multi-line template code with relative indentation
 * @param options - Insertion options (position)
 */
export function addChildWithTemplate(
  this: CodeModifier,
  parentId: string,
  templateCode: string,
  options: Pick<AddChildOptions, 'position' | 'parentProperty'> = {}
): ModificationResult {
  const { position = 'last', parentProperty } = options

  // Get parent node mapping
  const parentMapping = this.sourceMap.getNodeById(parentId)
  if (!parentMapping) {
    return this.errorResult(`Parent node not found: ${parentId}`)
  }

  // Track combined changes for when we modify parent AND add child
  let combinedFrom = -1
  let combinedTo = -1
  let combinedInsert = ''
  let parentLengthDelta = 0

  // If parentProperty is specified, add it to the parent first
  if (parentProperty) {
    const parentLine = parentMapping.position.line
    const line = this.lines[parentLine - 1]
    if (line) {
      const parsedLine = parseLine(line)
      const newLine = addPropertyToLine(parsedLine, parentProperty, '')

      // Calculate character offsets for the parent change
      const lineStartOffset = this.getCharacterOffset(parentLine, 1)
      combinedFrom = lineStartOffset
      combinedTo = lineStartOffset + line.length
      combinedInsert = newLine
      parentLengthDelta = newLine.length - line.length

      // Apply the parent property change
      const newLines = [...this.lines]
      newLines[parentLine - 1] = newLine
      this.source = newLines.join('\n')
      this.lines = newLines
    }
  }

  // Get existing children (re-fetch after potential parent modification)
  const children = this.sourceMap.getChildren(parentId)

  // Calculate insertion point and indentation
  const insertionInfo = this.calculateChildInsertionPoint(parentMapping, children, position)

  // Adjust template indentation
  const adjustedTemplate = adjustTemplateIndentation(templateCode, insertionInfo.indent)

  // Create the change
  const insertText = `\n${adjustedTemplate}`
  // Adjust insertion position if we modified the parent line
  const insertPosition = insertionInfo.charOffset + parentLengthDelta

  // Apply the change
  const newSource =
    this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

  // CRITICAL: Persist the changes for subsequent calls
  this.source = newSource
  this.lines = newSource.split('\n')

  // If we had a parent property change, combine the changes
  if (parentProperty && combinedFrom >= 0) {
    const finalTo = insertPosition + insertText.length
    return {
      success: true,
      newSource,
      change: {
        from: combinedFrom,
        to: combinedTo,
        insert: combinedInsert + this.source.substring(combinedTo + parentLengthDelta, finalTo),
      },
    }
  }

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
export function addChildWithTemplateRelativeTo(
  this: CodeModifier,
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
export function addChildRelativeTo(
  this: CodeModifier,
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
export function removeNode(this: CodeModifier, nodeId: string): ModificationResult {
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
export function replaceSlot(
  this: CodeModifier,
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
export function moveNode(
  this: CodeModifier,
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
    // Check if source is already a child of target (same-container reorder)
    if (sourceMapping.parentId === targetId) {
      // Same container - keep the same indentation
      targetIndent = sourceIndent
    } else {
      // Different container - child of target: one level deeper
      const targetLine = this.lines[targetMapping.position.line - 1]
      targetIndent = this.getLineIndent(targetLine) + '  '
    }
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
        insertPosition = this.getCharacterOffset(lastChildEndLine, lastChildLineContent.length + 1)
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
export function duplicateNode(
  this: CodeModifier,
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
      const lastChild = children.reduce((a, b) => (a.position.endLine > b.position.endLine ? a : b))
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
export function isDescendantOf(this: CodeModifier, nodeId: string, ancestorId: string): boolean {
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
export function reindentBlock(
  this: CodeModifier,
  block: string,
  oldIndent: string,
  newIndent: string
): string {
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
export function calculateChildInsertionPoint(
  this: CodeModifier,
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
    // No children yet - insert after parent BLOCK (not just line)
    // Parent block may include state blocks, comments, etc.
    const parentEndLine = this.getBlockEndLine(parentMapping.position.line)
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

  // Fallback: after parent BLOCK
  const parentEndLine = this.getBlockEndLine(parentMapping.position.line)
  const lineContent = this.lines[parentEndLine - 1]
  return {
    charOffset: this.getCharacterOffset(parentEndLine, lineContent.length + 1),
    indent: childIndent,
  }
}

/**
 * Build a component line with indentation, properties, and optional text
 */
export function buildComponentLine(
  this: CodeModifier,
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
 * Find the actual end line of a block (including all children)
 * by looking at indentation levels.
 *
 * @param startLine - 1-based line number where the block starts
 * @returns 1-based line number where the block ends
 */
export function getBlockEndLine(this: CodeModifier, startLine: number): number {
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
