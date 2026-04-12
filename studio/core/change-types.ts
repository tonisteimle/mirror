/**
 * Change Intent Types - Shared between ChangeService and Pipeline
 *
 * All possible intents for code modifications.
 */

// ============================================================================
// INTENT TYPES
// ============================================================================

/**
 * Base intent with common fields
 */
interface BaseIntent {
  nodeId: string
}

/**
 * Set a property value
 */
export interface SetPropertyIntent extends BaseIntent {
  type: 'setProperty'
  property: string
  value: string
}

/**
 * Increment/decrement a numeric property by steps
 * Uses predefined spacing steps: [0, 4, 8, 12, 16, 24, 32, 48, 64]
 */
export interface IncrementPropertyIntent extends BaseIntent {
  type: 'incrementProperty'
  property: string
  direction: 1 | -1  // +1 = increase, -1 = decrease
  side?: 'top' | 'right' | 'bottom' | 'left'  // For padding/margin
}

/**
 * Remove a property
 */
export interface RemovePropertyIntent extends BaseIntent {
  type: 'removeProperty'
  property: string
}

/**
 * Set layout direction
 */
export interface SetDirectionIntent extends BaseIntent {
  type: 'setDirection'
  direction: 'horizontal' | 'vertical'
}

/**
 * Toggle layout direction
 */
export interface ToggleDirectionIntent extends BaseIntent {
  type: 'toggleDirection'
}

/**
 * Set alignment
 */
export interface SetAlignmentIntent extends BaseIntent {
  type: 'setAlignment'
  alignment: 'left' | 'center' | 'right' | 'top' | 'bottom' | 'spread'
}

/**
 * Set size (full/hug)
 */
export interface SetSizeIntent extends BaseIntent {
  type: 'setSize'
  size: 'full' | 'hug'
  axis?: 'width' | 'height'  // Default: width
}

/**
 * Delete a node
 */
export interface DeleteNodeIntent extends BaseIntent {
  type: 'deleteNode'
}

/**
 * Add a child (from palette)
 */
export interface AddChildIntent {
  type: 'addChild'
  parentId: string
  componentName: string
  properties?: string
  textContent?: string
  position?: 'first' | 'last' | number
}

/**
 * Move a node
 */
export interface MoveNodeIntent {
  type: 'moveNode'
  sourceId: string
  targetId: string
  placement: 'before' | 'after' | 'inside'
  insertionIndex?: number
}

/**
 * Group multiple nodes
 */
export interface GroupNodesIntent {
  type: 'groupNodes'
  nodeIds: string[]
  wrapperName?: string  // Default: 'Box'
}

/**
 * Ungroup a container
 */
export interface UngroupIntent extends BaseIntent {
  type: 'ungroup'
}

/**
 * Duplicate a node
 */
export interface DuplicateNodeIntent {
  type: 'duplicateNode'
  sourceId: string
  targetId: string
  placement: 'before' | 'after' | 'inside'
}

/**
 * Update text content
 */
export interface UpdateTextIntent extends BaseIntent {
  type: 'updateText'
  text: string
}

/**
 * Distribute multiple nodes evenly
 */
export interface DistributeIntent {
  type: 'distribute'
  nodeIds: string[]
  direction: 'horizontal' | 'vertical' | 'auto'
}

/**
 * Move multiple nodes by delta
 */
export interface MultiMoveIntent {
  type: 'multiMove'
  nodeIds: string[]
  deltaX: number
  deltaY: number
}

/**
 * Resize multiple nodes proportionally
 */
export interface MultiResizeIntent {
  type: 'multiResize'
  nodeIds: string[]
  /** Scale factor for width (1.0 = no change) */
  scaleX: number
  /** Scale factor for height (1.0 = no change) */
  scaleY: number
  /** Anchor point for resize */
  anchor?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
}

/**
 * All possible intents
 */
export type ChangeIntent =
  | SetPropertyIntent
  | IncrementPropertyIntent
  | RemovePropertyIntent
  | SetDirectionIntent
  | ToggleDirectionIntent
  | SetAlignmentIntent
  | SetSizeIntent
  | DeleteNodeIntent
  | AddChildIntent
  | MoveNodeIntent
  | GroupNodesIntent
  | UngroupIntent
  | DuplicateNodeIntent
  | UpdateTextIntent
  | DistributeIntent
  | MultiMoveIntent
  | MultiResizeIntent

// ============================================================================
// RESULT TYPE
// ============================================================================

export interface ChangeResult {
  success: boolean
  error?: string
  /** The new nodeId if a node was created */
  newNodeId?: string
}
