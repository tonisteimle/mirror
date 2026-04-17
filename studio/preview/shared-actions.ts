/**
 * SharedActions - Common actions for keyboard shortcuts and context menu
 *
 * Eliminates code duplication between KeyboardHandler and ContextMenu.
 */

import { state, actions, executor, events } from '../core'
import {
  WrapNodesCommand,
  UnwrapNodeCommand,
  DeleteNodeCommand,
  SetPropertyCommand,
  RemovePropertyCommand,
  BatchCommand,
} from '../core/commands'

export interface ActionResult {
  success: boolean
  message?: string
  error?: string
}

/**
 * Group selected elements into a Box container
 *
 * @param container - The preview container element (for detecting layout direction)
 * @returns ActionResult with success/failure info
 */
export function executeGroup(container: HTMLElement): ActionResult {
  const multiSelection = state.get().multiSelection

  if (multiSelection.length < 2) {
    return {
      success: false,
      error: 'Select at least 2 elements to group (Shift+Click)',
    }
  }

  const sourceMap = state.get().sourceMap
  if (!sourceMap) {
    return { success: false, error: 'No source map available' }
  }

  // Validate: all nodes must have the same parent
  const nodes = multiSelection.map(id => sourceMap.getNodeById(id))
  const parents = nodes.map(n => n?.parentId)
  if (new Set(parents).size !== 1 || !parents[0]) {
    return {
      success: false,
      error: 'Selected elements must be siblings (same parent)',
    }
  }

  const firstNode = sourceMap.getNodeById(multiSelection[0])
  if (!firstNode?.parentId) {
    return { success: false, error: 'Cannot group root elements' }
  }

  // Detect parent's layout direction
  const parentEl = container.querySelector(
    `[data-mirror-id="${firstNode.parentId}"]`
  ) as HTMLElement | null

  let wrapperProps = 'ver' // Default to vertical
  if (parentEl) {
    const style = window.getComputedStyle(parentEl)
    const isHorizontal = style.flexDirection === 'row' || style.flexDirection === 'row-reverse'
    wrapperProps = isHorizontal ? 'hor' : 'ver'
  }

  // Execute wrap command
  const result = executor.execute(
    new WrapNodesCommand({
      nodeIds: multiSelection,
      wrapperName: 'Box',
      wrapperProps,
    })
  )

  if (result.success) {
    actions.clearMultiSelection()
    return {
      success: true,
      message: `Grouped ${multiSelection.length} elements`,
    }
  }

  return { success: false, error: result.error || 'Failed to group elements' }
}

/**
 * Ungroup a container, promoting its children to the parent level
 *
 * @returns ActionResult with success/failure info
 */
export function executeUngroup(): ActionResult {
  const selection = state.get().selection
  if (!selection?.nodeId) {
    return { success: false, error: 'Select a container element to ungroup' }
  }

  const sourceMap = state.get().sourceMap
  if (!sourceMap) {
    return { success: false, error: 'No source map available' }
  }

  const node = sourceMap.getNodeById(selection.nodeId)
  if (!node) {
    return { success: false, error: 'Selected node not found' }
  }

  // Check if node has children (is a container)
  const children = sourceMap.getChildren(selection.nodeId)
  if (children.length === 0) {
    return { success: false, error: 'Selected element has no children to unwrap' }
  }

  // Check if node has a parent (can't unwrap root)
  if (!node.parentId) {
    return { success: false, error: 'Cannot ungroup root element' }
  }

  // Execute unwrap command
  const result = executor.execute(
    new UnwrapNodeCommand({
      nodeId: selection.nodeId,
    })
  )

  if (result.success) {
    return {
      success: true,
      message: `Ungrouped ${children.length} elements`,
    }
  }

  return { success: false, error: result.error || 'Failed to ungroup elements' }
}

/**
 * Duplicate the selected element
 *
 * @returns ActionResult with success/failure info
 */
export function executeDuplicate(): ActionResult {
  const selection = state.get().selection
  if (!selection?.nodeId) {
    return { success: false, error: 'No element selected to duplicate' }
  }

  const sourceMap = state.get().sourceMap
  if (!sourceMap) {
    return { success: false, error: 'No source map available' }
  }

  const node = sourceMap.getNodeById(selection.nodeId)
  if (!node?.parentId) {
    return { success: false, error: 'Cannot duplicate root element' }
  }

  // Validate position data
  if (!node.position?.line || !node.position?.endLine) {
    return { success: false, error: 'Invalid node position data' }
  }

  const source = state.get().source
  if (!source) {
    return { success: false, error: 'No source available' }
  }

  const lines = source.split('\n')

  const startLine = node.position.line - 1 // 0-indexed
  const endLine = node.position.endLine - 1

  // Validate line bounds
  if (startLine < 0 || endLine >= lines.length || startLine > endLine) {
    return { success: false, error: 'Node position out of bounds' }
  }

  // Extract the lines for this node
  const nodeLines = lines.slice(startLine, endLine + 1)

  // Insert after the node's end line
  const insertIndex = endLine + 1
  const newLines = [...lines]
  newLines.splice(insertIndex, 0, ...nodeLines)

  const newSource = newLines.join('\n')

  // Apply the change directly via source update
  state.set({ source: newSource })
  events.emit('source:changed', { source: newSource, origin: 'keyboard' })
  events.emit('compile:requested', {})

  return { success: true, message: 'Element duplicated' }
}

/**
 * Delete selected element(s)
 *
 * @returns ActionResult with success/failure info
 */
export function executeDelete(): ActionResult {
  const multiSelection = state.get().multiSelection
  const selection = state.get().selection

  // Collect nodes to delete
  const nodeIds =
    multiSelection.length > 0 ? multiSelection : selection?.nodeId ? [selection.nodeId] : []

  if (nodeIds.length === 0) {
    return { success: false, error: 'No element selected to delete' }
  }

  // Delete each node
  let deletedCount = 0
  let lastError: string | undefined

  for (const nodeId of nodeIds) {
    const result = executor.execute(new DeleteNodeCommand({ nodeId }))
    if (result.success) {
      deletedCount++
    } else {
      lastError = result.error
    }
  }

  if (deletedCount > 0) {
    actions.clearMultiSelection()
    return {
      success: true,
      message: deletedCount === 1 ? 'Element deleted' : `${deletedCount} elements deleted`,
    }
  }

  return { success: false, error: lastError || 'Failed to delete elements' }
}

/**
 * Check if current selection can be grouped
 */
export function canGroup(): boolean {
  const multiSelection = state.get().multiSelection
  if (multiSelection.length < 2) return false

  const sourceMap = state.get().sourceMap
  if (!sourceMap) return false

  // Check all nodes have same parent
  const nodes = multiSelection.map(id => sourceMap.getNodeById(id))
  const parents = nodes.map(n => n?.parentId)
  return new Set(parents).size === 1 && !!parents[0]
}

/**
 * Check if current selection can be ungrouped
 */
export function canUngroup(): boolean {
  const selection = state.get().selection
  if (!selection?.nodeId) return false

  const sourceMap = state.get().sourceMap
  if (!sourceMap) return false

  const node = sourceMap.getNodeById(selection.nodeId)
  if (!node?.parentId) return false // Can't ungroup root

  const children = sourceMap.getChildren(selection.nodeId)
  return children.length > 0
}

/**
 * Set layout direction for selected element
 *
 * @param direction - 'horizontal' or 'vertical'
 * @returns ActionResult with success/failure info
 */
export function executeSetLayoutDirection(direction: 'horizontal' | 'vertical'): ActionResult {
  const selection = state.get().selection
  if (!selection?.nodeId) {
    return { success: false, error: 'No element selected' }
  }

  const sourceMap = state.get().sourceMap
  if (!sourceMap) {
    return { success: false, error: 'No source map available' }
  }

  const node = sourceMap.getNodeById(selection.nodeId)
  if (!node) {
    return { success: false, error: 'Selected node not found' }
  }

  // Layout mode properties to remove
  const layoutProps = ['hor', 'horizontal', 'ver', 'vertical', 'grid', 'stacked']
  const propToAdd = direction === 'horizontal' ? 'hor' : 'ver'

  // Build batch of commands: remove all layout props, then add the new one
  const commands: (SetPropertyCommand | RemovePropertyCommand)[] = []

  // Remove existing layout properties
  for (const prop of layoutProps) {
    commands.push(
      new RemovePropertyCommand({
        nodeId: selection.nodeId,
        property: prop,
      })
    )
  }

  // Add the new direction property (empty value = standalone flag)
  commands.push(
    new SetPropertyCommand({
      nodeId: selection.nodeId,
      property: propToAdd,
      value: '',
    })
  )

  // Execute as batch
  const result = executor.execute(new BatchCommand({ commands }))

  if (result.success) {
    const label = direction === 'horizontal' ? 'Horizontal' : 'Vertical'
    return { success: true, message: `Layout: ${label}` }
  }

  return { success: false, error: result.error || 'Failed to set layout direction' }
}
