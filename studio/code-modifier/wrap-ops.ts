/**
 * Wrap/Unwrap Operations — insertWithWrapper, wrapNodes, unwrapNode.
 *
 * Extracted from code-modifier.ts. Functions take `this: CodeModifier` and
 * are bound on the class via class-field assignment.
 */

import type {
  CodeModifier,
  ModificationResult,
  SemanticZone,
  AddChildOptions,
} from './code-modifier'
import type { NodeMapping } from '../../compiler/ir/source-map'

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
export function insertWithWrapper(
  this: CodeModifier,
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

/**
 * Wrap multiple sibling nodes in a new container
 *
 * Takes 2+ nodes that share the same parent and wraps them in a Box.
 * Used for grouping selected elements via Cmd/Ctrl+G.
 */
export function wrapNodes(
  this: CodeModifier,
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
export function unwrapNode(this: CodeModifier, nodeId: string): ModificationResult {
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
  // Filter out empty lines that might result from the unwrap
  const filteredLines = dedentedLines.filter(line => line.trim() !== '')
  const newContent = filteredLines.join('\n')

  // Calculate character offsets
  const from = this.getCharacterOffset(startLine, 1)
  const endLineContent = this.lines[endLine - 1]
  const to = this.getCharacterOffset(endLine, endLineContent.length + 1)

  // Apply the change
  let newSource = this.source.substring(0, from) + newContent + this.source.substring(to)

  // Clean up any consecutive empty lines that might have been created
  newSource = this.cleanupEmptyLines(newSource)

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
