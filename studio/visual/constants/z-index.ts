/**
 * Centralized Z-Index Constants for Visual Overlays
 *
 * Z-Index Layering (from bottom to top):
 *
 * 9000-9499  - Layout inference indicators
 * 9500-9999  - Smart guides
 * 10000      - Drop indicators, ghost base
 * 10001      - Ghost overlay, active indicators
 * 10002      - Distance labels, top-level overlays
 * 10100      - Resize handles (must be above all indicators)
 *
 * Design Decisions:
 * - Resize handles are highest so they're always clickable
 * - Ghosts layer above drop indicators for visibility
 * - Smart guides layer below drop indicators (less important during drag)
 */

// ============================================================================
// Z-Index Layers
// ============================================================================

/** Layout inference indicators (parenthesis, zone highlight) */
export const Z_INDEX_INFERENCE = 9500
export const Z_INDEX_INFERENCE_TEXT = 9501

/** Smart guides and alignment lines */
export const Z_INDEX_GUIDES = 9999

/** Drop indicators (lines showing where drop will occur) */
export const Z_INDEX_DROP_INDICATOR = 10000

/** Ghost element during drag */
export const Z_INDEX_GHOST = 10001

/** Active indicator overlay */
export const Z_INDEX_ACTIVE_INDICATOR = 10001

/** Distance labels and top-level overlays */
export const Z_INDEX_DISTANCE_LABEL = 10002

/** Resize handles (highest - must be clickable) */
export const Z_INDEX_RESIZE_HANDLES = 10100

// ============================================================================
// Grouped Export
// ============================================================================

export const Z_INDICES = {
  inference: Z_INDEX_INFERENCE,
  inferenceText: Z_INDEX_INFERENCE_TEXT,
  guides: Z_INDEX_GUIDES,
  dropIndicator: Z_INDEX_DROP_INDICATOR,
  ghost: Z_INDEX_GHOST,
  activeIndicator: Z_INDEX_ACTIVE_INDICATOR,
  distanceLabel: Z_INDEX_DISTANCE_LABEL,
  resizeHandles: Z_INDEX_RESIZE_HANDLES,
} as const

export type ZIndexLayer = keyof typeof Z_INDICES
