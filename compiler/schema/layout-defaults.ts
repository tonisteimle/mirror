/**
 * Layout Defaults - Single Source of Truth
 *
 * This file defines ALL layout defaults for the Mirror DSL.
 * The IR code only READS from here, never DECIDES.
 *
 * Key principles:
 * - SYMMETRIC: hor and ver are treated the same way
 * - EXPLICIT: center means the same thing everywhere
 * - NO CSS MARKERS: Sizing uses flags, not CSS properties as markers
 */

// =============================================================================
// PRIMITIVE CLASSIFICATION
// =============================================================================

/**
 * Non-container primitives that should NOT get default flex layout.
 * These are leaf elements that don't have children.
 */
export const NON_CONTAINER_PRIMITIVES = new Set([
  'text', 'span', 'input', 'textarea', 'button', 'img', 'image', 'icon',
  'label', 'link', 'a', 'option', 'divider', 'hr', 'spacer',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'checkbox', 'radio', 'slot', 'zagslot'
])

/**
 * Check if a primitive is a container (can have children with flex/grid layout)
 */
export function isContainer(primitive: string): boolean {
  return !NON_CONTAINER_PRIMITIVES.has(primitive.toLowerCase())
}

// =============================================================================
// FLEX DEFAULTS
// =============================================================================

/**
 * Flex layout defaults - SYMMETRIC for both directions.
 *
 * IMPORTANT: Both column and row have align-items: flex-start.
 * This is intentional symmetry. If you want centering, use `center` explicitly.
 */
export const FLEX_DEFAULTS = {
  column: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  row: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'flex-start',  // NOT center! Symmetric with column.
  },
} as const

/**
 * Default layout for container elements (Frame, Box, etc.)
 */
export const CONTAINER_DEFAULTS = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  width: 'fit-content',
} as const

// =============================================================================
// 9-ZONE ALIGNMENT
// =============================================================================

/**
 * 9-Zone alignment grid:
 *
 *   tl  |  tc  |  tr
 *  -----+------+-----
 *   cl  | center| cr
 *  -----+------+-----
 *   bl  |  bc  |  br
 *
 * Note: These are for COLUMN layout. In column layout:
 * - justify-content controls vertical (main axis)
 * - align-items controls horizontal (cross axis)
 */
export const NINE_ZONE = {
  tl: { justify: 'flex-start', align: 'flex-start' },
  tc: { justify: 'flex-start', align: 'center' },
  tr: { justify: 'flex-start', align: 'flex-end' },
  cl: { justify: 'center', align: 'flex-start' },
  center: { justify: 'center', align: 'center' },
  cr: { justify: 'center', align: 'flex-end' },
  bl: { justify: 'flex-end', align: 'flex-start' },
  bc: { justify: 'flex-end', align: 'center' },
  br: { justify: 'flex-end', align: 'flex-end' },
} as const

export type NineZonePosition = keyof typeof NINE_ZONE

// =============================================================================
// CENTER SEMANTICS
// =============================================================================

/**
 * Center alignment semantics - UNAMBIGUOUS.
 *
 * IMPORTANT: `center` ALWAYS means both axes.
 * Use `hor-center` or `ver-center` for single-axis centering.
 *
 * This eliminates the context-dependent behavior where `center` meant
 * different things based on other properties.
 */
export const CENTER_ALIGNMENT = {
  /** Center on BOTH axes - justify-content AND align-items */
  center: { justify: 'center', align: 'center' },
  /** Center ONLY on horizontal axis (cross-axis in column, main-axis in row) */
  'hor-center': { justify: null, align: 'center' },
  /** Center ONLY on vertical axis (main-axis in column, cross-axis in row) */
  'ver-center': { justify: 'center', align: null },
} as const

// =============================================================================
// SIZING FLAGS
// =============================================================================

/**
 * Sizing mode for width/height.
 * Used instead of CSS markers like `min-width: 0`.
 */
export type SizingMode = 'fixed' | 'hug' | 'full'

/**
 * Sizing flags attached to IR nodes.
 * This tracks HOW a dimension was sized, not just what CSS to generate.
 */
export interface SizingFlags {
  width?: SizingMode
  height?: SizingMode
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get flex defaults for a direction.
 */
export function getFlexDefaults(direction: 'column' | 'row' = 'column') {
  return FLEX_DEFAULTS[direction]
}

/**
 * Get 9-zone alignment values.
 */
export function getNineZoneAlignment(position: NineZonePosition): { justify: string; align: string } {
  return NINE_ZONE[position]
}

/**
 * Check if a value is a 9-zone position.
 */
export function isNineZonePosition(value: string): value is NineZonePosition {
  return value in NINE_ZONE
}
