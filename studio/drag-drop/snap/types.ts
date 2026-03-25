/**
 * Snap Types (re-exported from main types for convenience)
 */

export type {
  Point,
  Size,
  Rect,
  SnapConfig,
  SnapGuide,
  SnapGuideType,
  SnapResult,
} from '../types'

/**
 * Default snap configuration
 */
export const DEFAULT_SNAP_CONFIG: import('../types').SnapConfig = {
  threshold: 8,
  gridSize: 0,
  snapToEdges: true,
  snapToCenter: true,
  snapToSiblings: true,
}
