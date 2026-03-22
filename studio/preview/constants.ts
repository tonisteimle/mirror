/**
 * Preview Module Constants
 *
 * Centralized constants for data attributes and selectors
 * to avoid magic strings scattered throughout the codebase.
 */

/** Data attribute for Mirror element IDs */
export const MIRROR_ID_ATTR = 'data-mirror-id'

/** Selector for elements with Mirror ID */
export const MIRROR_ID_SELECTOR = `[${MIRROR_ID_ATTR}]`

/** Data attribute for component type */
export const COMPONENT_ATTR = 'data-component'

/** Data attribute for source line number */
export const LINE_ATTR = 'data-line'

/** Data attribute for element name */
export const NAME_ATTR = 'data-name'

/** Data attribute for layout type (e.g., 'abs' for absolute) */
export const LAYOUT_ATTR = 'data-layout'

/** Data attribute for stacked container */
export const STACKED_ATTR = 'data-mirror-stacked'

/**
 * Build a selector for a specific Mirror ID
 */
export function mirrorIdSelector(nodeId: string): string {
  return `[${MIRROR_ID_ATTR}="${nodeId}"]`
}
