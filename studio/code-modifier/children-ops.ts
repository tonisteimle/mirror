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
 * 9-zone alignment keywords. Mutually exclusive: a single Frame can
 * carry at most one. Drop-into-zone must remove competing keywords
 * before adding the new one, otherwise the line ends up with two
 * conflicting alignments (e.g. `Frame center, tl`) and the renderer's
 * behavior is undefined.
 */
const ALIGNMENT_KEYWORDS = ['tl', 'tc', 'tr', 'cl', 'center', 'cr', 'bl', 'bc', 'br'] as const

function isAlignmentKeyword(prop: string): boolean {
  return (ALIGNMENT_KEYWORDS as readonly string[]).includes(prop)
}

/**
 * Build the new parent-line content for an alignment-zone drop:
 * strip any existing alignment keyword, then add the new one. Done
 * in one composed transformation so callers can apply a single
 * line-replacement (instead of two passes that mess up offset math
 * for the subsequent child insertion).
 */
function buildLineWithExclusiveAlignment(line: string, newKeyword: string): string {
  let result = line
  for (const kw of ALIGNMENT_KEYWORDS) {
    if (kw === newKeyword) continue
    let parsed = parseLine(result)
    while (findPropertyInLine(parsed, kw)) {
      result = removePropertyFromLine(parsed, kw)
      parsed = parseLine(result)
    }
  }
  const parsed = parseLine(result)
  return addPropertyToLine(parsed, newKeyword, '')
}

/**
 * Add a child block (single line or multi-line template) under a parent.
 *
 * Shared core for `addChild` and `addChildWithTemplate` — both compute the
 * same insertion point, share the same parentProperty injection, and
 * produce the same change shape. They only differ in how the inserted
 * text is built. `buildBlock(indent)` returns the body to insert, with
 * `indent` already applied to every line.
 */
function addChildBlock(
  this: CodeModifier,
  parentId: string,
  buildBlock: (indent: string) => string,
  options: Pick<AddChildOptions, 'position' | 'parentProperty'>
): ModificationResult {
  const { position = 'last', parentProperty } = options

  const parentMapping = this.sourceMap.getNodeById(parentId)
  if (!parentMapping) {
    return this.errorResult(`Parent node not found: ${parentId}`)
  }

  // Track combined changes for when we modify parent AND add child
  let combinedFrom = -1
  let combinedTo = -1
  let combinedInsert = ''
  let parentLengthDelta = 0

  // If parentProperty is specified, add it to the parent first.
  // Special-case alignment keywords (tl/tc/tr/cl/center/cr/bl/bc/br):
  // they're mutually exclusive — strip any existing alignment keyword
  // before injecting the new one in a SINGLE line transformation, so
  // a re-aligned drop produces `Frame tl` instead of `Frame center,
  // tl`. Doing the strip-and-add as one composed step (rather than
  // two writes) keeps parentLengthDelta consistent for the downstream
  // child insertion.
  if (parentProperty) {
    const parentLine = parentMapping.position.line
    const line = this.lines[parentLine - 1]
    if (line) {
      const newLine = isAlignmentKeyword(parentProperty)
        ? buildLineWithExclusiveAlignment(line, parentProperty)
        : addPropertyToLine(parseLine(line), parentProperty, '')

      const lineStartOffset = this.getCharacterOffset(parentLine, 1)
      combinedFrom = lineStartOffset
      combinedTo = lineStartOffset + line.length
      combinedInsert = newLine
      parentLengthDelta = newLine.length - line.length

      const newLines = [...this.lines]
      newLines[parentLine - 1] = newLine
      this.source = newLines.join('\n')
      this.lines = newLines
    }
  }

  // Get existing children (re-fetch after potential parent modification)
  const children = this.sourceMap.getChildren(parentId)
  const insertionInfo = this.calculateChildInsertionPoint(parentMapping, children, position)

  const block = buildBlock(insertionInfo.indent)
  const insertText = `\n${block}`
  // calculateChildInsertionPoint reads from this.lines which is already
  // post-update (after parentProperty injection), so charOffset is in
  // post-update coordinates. Adding parentLengthDelta double-counts —
  // harmless when delta>0 because substring() clamps past-end, but
  // catastrophic when delta<0 (alignment-keyword strip shrinks the
  // parent line) because the insertion position lands MID-LINE,
  // producing `Frame ... tlutton "Button"` corruption.
  const insertPosition = insertionInfo.charOffset

  const newSource =
    this.source.substring(0, insertPosition) + insertText + this.source.substring(insertPosition)

  // CRITICAL: Persist the changes for subsequent calls
  this.source = newSource
  this.lines = newSource.split('\n')

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
 * Add a child component to a parent node
 */
export function addChild(
  this: CodeModifier,
  parentId: string,
  componentName: string,
  options: AddChildOptions = {}
): ModificationResult {
  const { properties, textContent } = options

  // Special case: empty canvas - insert as root element
  if (!this.sourceMap.getNodeById(parentId)) {
    if (this.source.trim() === '' && parentId === 'node-1') {
      return this.insertAsRoot(componentName, properties, textContent)
    }
  }

  return addChildBlock.call(
    this,
    parentId,
    indent => this.buildComponentLine(componentName, properties, textContent, indent),
    options
  )
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
  return addChildBlock.call(
    this,
    parentId,
    indent => adjustTemplateIndentation(templateCode, indent),
    options
  )
}

/**
 * Insert a block (single line or multi-line template) before/after a sibling.
 *
 * Shared core for `addChildRelativeTo` and `addChildWithTemplateRelativeTo`.
 * Both compute the same sibling position and indent; they only differ in
 * how the inserted text is built. `buildBlock(indent)` returns the body
 * with `indent` already applied to every line.
 */
function addBlockRelativeTo(
  this: CodeModifier,
  siblingId: string,
  buildBlock: (indent: string) => string,
  placement: 'before' | 'after',
  callerName: string
): ModificationResult {
  const siblingMapping = this.sourceMap.getNodeById(siblingId)
  if (!siblingMapping) {
    return this.errorResult(`Sibling node not found: ${siblingId}`)
  }

  const lineIndex = siblingMapping.position.line - 1
  if (lineIndex < 0 || lineIndex >= this.lines.length) {
    log.error(`Invalid line position in ${callerName}`, {
      siblingId,
      line: siblingMapping.position.line,
      lineIndex,
      totalLines: this.lines.length,
    })
    return this.errorResult(
      `Invalid line position for sibling: ${siblingId} (line ${siblingMapping.position.line})`
    )
  }

  const indent = this.getLineIndent(this.lines[lineIndex])
  const block = buildBlock(indent)

  let insertPosition: number
  let insertText: string

  if (placement === 'before') {
    insertPosition = this.getCharacterOffset(siblingMapping.position.line, 1)
    insertText = `${block}\n`
  } else {
    // getBlockEndLine finds the actual end including all children
    const siblingEndLine = this.getBlockEndLine(siblingMapping.position.line)
    const endLineContent = this.lines[siblingEndLine - 1]
    insertPosition = this.getCharacterOffset(siblingEndLine, endLineContent.length + 1)
    insertText = `\n${block}`
  }

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
export function addChildWithTemplateRelativeTo(
  this: CodeModifier,
  siblingId: string,
  templateCode: string,
  placement: 'before' | 'after'
): ModificationResult {
  return addBlockRelativeTo.call(
    this,
    siblingId,
    indent => adjustTemplateIndentation(templateCode, indent),
    placement,
    'addChildWithTemplateRelativeTo'
  )
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
  return addBlockRelativeTo.call(
    this,
    siblingId,
    indent => this.buildComponentLine(componentName, properties, textContent, indent),
    placement,
    'addChildRelativeTo'
  )
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
 * Move a node to a new location relative to another node.
 * @param insertionIndex - For 'inside' placement: position among siblings (0 = first)
 * @param options - Optional: properties to add/update on the moved element
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
  if (!sourceMapping) return this.errorResult(`Source node not found: ${sourceNodeId}`)

  const targetMapping = this.sourceMap.getNodeById(targetId)
  if (!targetMapping) return this.errorResult(`Target node not found: ${targetId}`)

  if (sourceNodeId === targetId) return this.errorResult('Cannot move node onto itself')
  if (this.isDescendantOf(targetId, sourceNodeId)) {
    return this.errorResult('Cannot move node into its own descendant')
  }

  // Extract the block to move + figure out which character range is removed.
  const extracted = extractAndReindent.call(this, sourceMapping, targetMapping, placement)
  const blockWithProps = applyOptionalProperties(extracted.block, options?.properties)

  // Compute insert position in the *original* source — then adjust if it
  // sits after the removed range, since removal shifts subsequent offsets.
  let insertPosition = findInsertionPosition.call(
    this,
    sourceNodeId,
    targetMapping,
    placement,
    insertionIndex
  )
  if (insertPosition > extracted.removeStart) {
    insertPosition -= extracted.removeEnd - extracted.adjustedRemoveStart
  }

  // The insert position is always end-of-previous-line / end-of-last-child,
  // never line-start, so the inserted text must lead with \n.
  const insertText = `\n${blockWithProps}`
  const afterRemoval =
    this.source.substring(0, extracted.adjustedRemoveStart) +
    this.source.substring(extracted.removeEnd)
  const newSource =
    afterRemoval.substring(0, insertPosition) + insertText + afterRemoval.substring(insertPosition)

  const oldSourceLength = this.source.length
  this.source = newSource
  this.lines = newSource.split('\n')

  // Replace the entire document — moves combine a remove and an insert,
  // so a single replace is the cleanest CodeMirror change.
  return {
    success: true,
    newSource,
    change: { from: 0, to: oldSourceLength, insert: newSource },
  }
}

interface ExtractedBlock {
  block: string
  /** Char offset of the source block's first line, column 1. */
  removeStart: number
  /** Char offset just past the last char of the source block (incl. trailing \n if present). */
  removeEnd: number
  /** removeStart adjusted to also remove a leading \n when the block has no trailing newline. */
  adjustedRemoveStart: number
}

/**
 * Extract the source block (including its children) as text, reindented for
 * the new placement. Returns the reindented block plus the character offsets
 * needed to remove the original block while leaving exactly one surrounding
 * newline (no double-blank line, no missing separator).
 */
function extractAndReindent(
  this: CodeModifier,
  sourceMapping: NodeMapping,
  targetMapping: NodeMapping,
  placement: 'before' | 'after' | 'inside'
): ExtractedBlock {
  const startLine = sourceMapping.position.line
  const endLine = this.getBlockEndLine(startLine)
  const sourceLines = this.lines.slice(startLine - 1, endLine)
  const sourceBlock = sourceLines.join('\n')
  const sourceIndent = this.getLineIndent(sourceLines[0])

  const targetIndent = computeTargetIndent.call(
    this,
    sourceMapping,
    targetMapping,
    placement,
    sourceIndent
  )
  const block = this.reindentBlock(sourceBlock, sourceIndent, targetIndent)

  // Removal range of the block in the original source.
  const removeStart = this.getCharacterOffset(startLine, 1)
  const endLineContent = this.lines[endLine - 1]
  let removeEnd = this.getCharacterOffset(endLine, endLineContent.length + 1)

  // Eat exactly one surrounding newline so the removal doesn't leave a hole.
  let adjustedRemoveStart: number
  if (endLine < this.lines.length) {
    removeEnd += 1
    adjustedRemoveStart = removeStart
  } else {
    adjustedRemoveStart = removeStart > 0 ? removeStart - 1 : removeStart
  }

  return { block, removeStart, removeEnd, adjustedRemoveStart }
}

/**
 * Indentation the moved block needs at its new home:
 * - sibling placement → match target's own indent
 * - inside, same parent (reorder) → keep source indent
 * - inside, different parent → target indent + 2 spaces
 */
function computeTargetIndent(
  this: CodeModifier,
  sourceMapping: NodeMapping,
  targetMapping: NodeMapping,
  placement: 'before' | 'after' | 'inside',
  sourceIndent: string
): string {
  if (placement !== 'inside') {
    return this.getLineIndent(this.lines[targetMapping.position.line - 1])
  }
  if (sourceMapping.parentId === targetMapping.nodeId) {
    return sourceIndent
  }
  return this.getLineIndent(this.lines[targetMapping.position.line - 1]) + '  '
}

/**
 * Apply property overrides to the first line of the block. Existing properties
 * are updated in place (e.g. `x 0` → `x 50`); missing ones are appended. Used
 * by drop handlers to set absolute coordinates on newly-moved elements.
 */
function applyOptionalProperties(block: string, properties: string | undefined): string {
  if (!properties) return block
  const blockLines = block.split('\n')
  if (blockLines.length === 0) return block

  let firstLine = blockLines[0]
  const propsToUpdate = parseLine('Dummy ' + properties)
  let parsedFirstLine = parseLine(firstLine)

  for (const prop of propsToUpdate.properties) {
    firstLine = updatePropertyInLine(parsedFirstLine, prop.name, prop.value)
    parsedFirstLine = parseLine(firstLine)
  }

  blockLines[0] = firstLine
  return blockLines.join('\n')
}

/**
 * Find the character offset where the new (reindented) block should be inserted.
 * Returned positions are based on the *original* source — caller must adjust
 * for the removed range when the insert lies past it.
 */
function findInsertionPosition(
  this: CodeModifier,
  sourceNodeId: string,
  targetMapping: NodeMapping,
  placement: 'before' | 'after' | 'inside',
  insertionIndex: number | undefined
): number {
  if (placement === 'before') {
    // End of the previous line (the \n), so the inserted "\n…" lines up correctly.
    return Math.max(0, this.getCharacterOffset(targetMapping.position.line, 1) - 1)
  }

  if (placement === 'after') {
    // End of the target's whole block (incl. its children).
    const targetEndLine = this.getBlockEndLine(targetMapping.position.line)
    const targetEndContent = this.lines[targetEndLine - 1]
    return this.getCharacterOffset(targetEndLine, targetEndContent.length + 1)
  }

  // placement === 'inside'
  const children = this.sourceMap
    .getChildren(targetMapping.nodeId)
    // Skip the source itself (same-parent reorder), otherwise we'd anchor on the very node we're removing.
    .filter(c => c.nodeId !== sourceNodeId)
    .sort((a, b) => a.position.line - b.position.line)

  if (children.length === 0) {
    // Empty target → insert immediately after the parent line.
    const parentLineContent = this.lines[targetMapping.position.line - 1]
    return this.getCharacterOffset(targetMapping.position.line, parentLineContent.length + 1)
  }

  const validIndex =
    typeof insertionIndex === 'number' &&
    Number.isFinite(insertionIndex) &&
    insertionIndex >= 0 &&
    insertionIndex < children.length

  if (validIndex) {
    const targetChild = children[insertionIndex!]
    return Math.max(0, this.getCharacterOffset(targetChild.position.line, 1) - 1)
  }

  // Default: append after the last child.
  const lastChild = children.reduce((a, b) => (a.position.endLine > b.position.endLine ? a : b))
  const lastChildLineContent = this.lines[lastChild.position.endLine - 1]
  return this.getCharacterOffset(lastChild.position.endLine, lastChildLineContent.length + 1)
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
