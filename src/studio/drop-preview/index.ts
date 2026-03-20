/**
 * Drop Preview Module
 *
 * Simple, focused module for drag preview rendering.
 *
 * Usage:
 * 1. At dragstart: Calculate size, call manager.setDragContext()
 * 2. At dragover: Manager shows preview at snapped position
 * 3. At dragend/drop: Call manager.clearDragContext()
 */

// Types
export type { Point, Size, GridConfig, DragContext } from './types'

// Snap calculation
export { snapToGrid, snapValue } from './snap-calculator'

// Size calculation (used at dragstart)
export { getDefaultSize, parseSize, calculateNewComponentSize } from './size-calculator'

// Renderer
export { DropPreviewRenderer, formatLabel } from './renderer'
