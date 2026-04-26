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
  SetLayoutDirectionCommand,
  UpdateSourceCommand,
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
 * Wrap selected elements in a Frame with specified layout direction and calculated gap
 *
 * @param container - The preview container element (for reading element positions)
 * @param direction - Layout direction ('hor' or 'ver')
 * @returns ActionResult with success/failure info
 */
export function executeWrapWithLayout(
  container: HTMLElement,
  direction: 'hor' | 'ver'
): ActionResult {
  const multiSelection = state.get().multiSelection

  if (multiSelection.length < 2) {
    return {
      success: false,
      error: 'Select at least 2 elements (Shift+Click)',
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
    return { success: false, error: 'Cannot wrap root elements' }
  }

  // Calculate average gap between selected elements
  const gap = calculateAverageGap(container, multiSelection, direction)

  // Build wrapper properties
  let wrapperProps = direction
  if (gap > 0) {
    wrapperProps += `, gap ${gap}`
  }

  // Execute wrap command
  const result = executor.execute(
    new WrapNodesCommand({
      nodeIds: multiSelection,
      wrapperName: 'Frame',
      wrapperProps,
    })
  )

  if (result.success) {
    actions.clearMultiSelection()
    const dirLabel = direction === 'hor' ? 'horizontal' : 'vertical'
    return {
      success: true,
      message: `Wrapped ${multiSelection.length} elements (${dirLabel}, gap ${gap})`,
    }
  }

  return { success: false, error: result.error || 'Failed to wrap elements' }
}

/**
 * Calculate the average gap between elements based on their positions
 */
function calculateAverageGap(
  container: HTMLElement,
  nodeIds: string[],
  direction: 'hor' | 'ver'
): number {
  if (nodeIds.length < 2) return 8 // Default gap

  // Get element rects sorted by position
  const rects: { id: string; rect: DOMRect }[] = []
  for (const id of nodeIds) {
    const el = container.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement
    if (el) {
      rects.push({ id, rect: el.getBoundingClientRect() })
    }
  }

  if (rects.length < 2) return 8 // Default gap

  // Sort by position (left for horizontal, top for vertical)
  if (direction === 'hor') {
    rects.sort((a, b) => a.rect.left - b.rect.left)
  } else {
    rects.sort((a, b) => a.rect.top - b.rect.top)
  }

  // Calculate gaps between consecutive elements
  const gaps: number[] = []
  for (let i = 0; i < rects.length - 1; i++) {
    const current = rects[i].rect
    const next = rects[i + 1].rect

    let gap: number
    if (direction === 'hor') {
      // Gap = next.left - current.right
      gap = next.left - current.right
    } else {
      // Gap = next.top - current.bottom
      gap = next.top - current.bottom
    }

    // Only count positive gaps (elements not overlapping)
    if (gap > 0) {
      gaps.push(gap)
    }
  }

  if (gaps.length === 0) return 8 // Default gap if no valid gaps found

  // Calculate average and round to nearest 4px (design grid)
  const average = gaps.reduce((sum, g) => sum + g, 0) / gaps.length
  return Math.round(average / 4) * 4 || 8
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

  // Extract the lines for this node and compute the editor-relative
  // character range to insert *after* the node ends.
  const nodeLines = lines.slice(startLine, endLine + 1)
  const insertText = '\n' + nodeLines.join('\n')

  // Calculate insertion offset (end of the node's last line).
  let insertOffset = 0
  for (let i = 0; i <= endLine; i++) {
    insertOffset += lines[i].length
    if (i < lines.length - 1) insertOffset += 1 // account for the '\n' separator
  }

  // Route through the command pipeline so the editor doc, the source
  // store and undo/redo all stay in sync. The previous direct
  // `state.set({ source })` only updated the source store — the editor
  // kept showing the old content because the editor doc was never
  // dispatched. Same divergence pattern as the property-panel and
  // ::-extract bugs we fixed earlier today.
  const result = executor.execute(
    new UpdateSourceCommand({ from: insertOffset, to: insertOffset, insert: insertText })
  )
  if (!result.success) {
    return { success: false, error: result.error || 'UpdateSource failed' }
  }
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
 * Uses SetLayoutDirectionCommand which handles removing competing layout properties
 * (hor, ver, grid, stacked) and adding the new one in a single operation.
 *
 * @param direction - 'horizontal' or 'vertical'
 * @returns ActionResult with success/failure info
 */
export function executeSetLayoutDirection(direction: 'horizontal' | 'vertical'): ActionResult {
  const selection = state.get().selection
  if (!selection?.nodeId) {
    return { success: false, error: 'No element selected' }
  }

  // Execute the command
  const result = executor.execute(
    new SetLayoutDirectionCommand({
      nodeId: selection.nodeId,
      direction,
    })
  )

  if (result.success) {
    const label = direction === 'horizontal' ? 'Horizontal' : 'Vertical'
    return { success: true, message: `Layout: ${label}` }
  }

  return { success: false, error: result.error || 'Failed to set layout direction' }
}

/**
 * Set full dimension based on element shape
 *
 * Logic:
 * - If neither w nor h is full: analyze shape, set dominant dimension to full
 * - If one is full: set the other to full too
 *
 * @param container - The preview container element (for measuring)
 * @returns ActionResult with success/failure info
 */
export function executeSetFullDimension(container: HTMLElement): ActionResult {
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

  // Find the element in DOM to measure dimensions
  const element = container.querySelector(`[data-mirror-id="${selection.nodeId}"]`) as HTMLElement
  if (!element) {
    return { success: false, error: 'Element not found in preview' }
  }

  // Get current dimensions
  const rect = element.getBoundingClientRect()
  const width = rect.width
  const height = rect.height

  // Check current w/h properties from source
  const source = state.get().source
  const lines = source.split('\n')
  const line = lines[node.position.line - 1] || ''

  const hasWidthFull = /\bw\s+full\b/.test(line) || /\bwidth\s+full\b/.test(line)
  const hasHeightFull = /\bh\s+full\b/.test(line) || /\bheight\s+full\b/.test(line)

  let propToSet: 'w' | 'h'
  let message: string

  if (!hasWidthFull && !hasHeightFull) {
    // Neither is full - analyze shape
    if (width >= height) {
      propToSet = 'w'
      message = 'Width: full'
    } else {
      propToSet = 'h'
      message = 'Height: full'
    }
  } else if (hasWidthFull && !hasHeightFull) {
    // Width is full, set height
    propToSet = 'h'
    message = 'Height: full'
  } else if (!hasWidthFull && hasHeightFull) {
    // Height is full, set width
    propToSet = 'w'
    message = 'Width: full'
  } else {
    // Both are full already
    return { success: true, message: 'Already full size' }
  }

  // Execute the property change
  const result = executor.execute(
    new SetPropertyCommand({
      nodeId: selection.nodeId,
      property: propToSet,
      value: 'full',
    })
  )

  if (result.success) {
    return { success: true, message }
  }

  return { success: false, error: result.error || 'Failed to set dimension' }
}

/**
 * Toggle spread property on selected element
 *
 * If element has spread, removes it. If not, adds it.
 *
 * @returns ActionResult with success/failure info
 */
export function executeToggleSpread(): ActionResult {
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

  // Check if element has spread property
  const source = state.get().source
  const lines = source.split('\n')
  const line = lines[node.position.line - 1] || ''

  const hasSpread = /\bspread\b/.test(line)

  if (hasSpread) {
    // Remove spread
    const result = executor.execute(
      new RemovePropertyCommand({
        nodeId: selection.nodeId,
        property: 'spread',
      })
    )

    if (result.success) {
      return { success: true, message: 'Spread removed' }
    }
    return { success: false, error: result.error || 'Failed to remove spread' }
  } else {
    // Add spread
    const result = executor.execute(
      new SetPropertyCommand({
        nodeId: selection.nodeId,
        property: 'spread',
        value: '',
      })
    )

    if (result.success) {
      return { success: true, message: 'Spread added' }
    }
    return { success: false, error: result.error || 'Failed to add spread' }
  }
}
