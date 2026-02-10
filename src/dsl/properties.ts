/**
 * Single source of truth for DSL properties
 * Used by lexer, validator, and linter
 *
 * PROPERTY NAMING CONVENTIONS:
 * ----------------------------
 * - 3-letter abbreviations for common CSS properties:
 *   pad (padding), mar (margin), col (color), rad (border-radius),
 *   bor (border), boc (border-color)
 *
 * - Full names when abbreviations would be unclear or for non-CSS concepts:
 *   placeholder, icon, src, alt, fit, shadow, font, weight, size
 *
 * - Compound names with hyphen for modifications:
 *   hover-col, hover-boc, hor-cen, ver-t
 *
 * - Single letters for sizing/positioning:
 *   w (width), h (height), z (z-index)
 *
 * - Direction modifiers for spacing properties (pad, mar, bor):
 *   l (left), r (right), u (up/top), d (down/bottom)
 *   Combinations: l-r, u-d, or combined: lr, ud
 *
 * NOTE: gap does not support direction modifiers yet.
 * Future: gap l-r → columnGap, gap u-d → rowGap
 */

// All known properties
export const PROPERTIES = new Set([
  // Layout
  'hor', 'ver', 'gap', 'between', 'wrap', 'grow', 'cen',
  // Alignment
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  // Sizing
  'w', 'h', 'full', 'minw', 'maxw', 'minh', 'maxh',
  // Spacing
  'pad', 'mar',
  // Colors (bg for background, col for text/unified color, boc for border-color)
  'bg', 'col', 'boc',
  // Border
  'rad', 'border', 'bor',
  // Typography
  'size', 'weight', 'font', 'line', 'align', 'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  // Form inputs
  'placeholder', 'type', 'disabled', 'visible',
  // Visuals
  'icon', 'src', 'alt', 'fit', 'shadow', 'opacity', 'cursor', 'pointer', 'z', 'hidden',
  // Hover states
  'hover-bg', 'hover-col', 'hover-boc', 'hover-bor', 'hover-rad', 'hover-opacity', 'hover-scale',
])

// Border styles for compound border property
export const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted', 'none'])

// Container components: col → backgroundColor
export const CONTAINER_COMPONENTS = new Set([
  'Box', 'Stack', 'VStack', 'HStack', 'ZStack',
  'Button', 'Card', 'Container', 'Header', 'Footer', 'Sidebar',
  'Nav', 'Main', 'Section', 'Article', 'Aside',
  'Modal', 'Dialog', 'Drawer', 'Popover', 'Tooltip',
  'Dropdown', 'Menu', 'List', 'ListItem', 'Grid', 'Row', 'Column',
])

// Text components: col → color
export const TEXT_COMPONENTS = new Set([
  'Text', 'Label', 'Title', 'Heading', 'Paragraph', 'Span',
  'Link', 'Badge', 'Tag', 'Chip',
  '_text', // implicit text from strings
])

// Properties that can take direction modifiers (l, r, u, d)
export const DIRECTIONAL_PROPERTIES = new Set(['pad', 'mar', 'bor'])

// Direction values
export const DIRECTIONS = new Set(['l', 'r', 'u', 'd'])

// Check if a string is a valid direction combo (e.g., 'ud', 'lr', 'u-d', 'l-r')
export function isDirectionOrCombo(value: string): boolean {
  // Single direction
  if (DIRECTIONS.has(value)) return true
  // Combo with hyphen: u-d, l-r, u-d-l, etc.
  if (value.includes('-')) {
    const parts = value.split('-')
    return parts.every(p => DIRECTIONS.has(p))
  }
  // Combo without hyphen: ud, lr, udlr
  return value.length > 0 && /^[lrud]+$/.test(value)
}

// Split direction combo into individual directions
export function splitDirectionCombo(value: string): string[] {
  if (value.includes('-')) {
    return value.split('-').filter(p => DIRECTIONS.has(p))
  }
  return value.split('').filter(p => DIRECTIONS.has(p))
}

// Properties by type
export const BOOLEAN_PROPERTIES = new Set([
  'hor', 'ver', 'full', 'between', 'wrap', 'grow', 'cen',
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  'hidden'
])

export const COLOR_PROPERTIES = new Set([
  'col', 'boc',
  'hover-col', 'hover-boc'
])

export const NUMBER_PROPERTIES = new Set([
  'gap', 'w', 'h', 'minw', 'maxw', 'minh', 'maxh',
  'pad', 'mar', 'rad', 'border', 'bor',
  'size', 'weight', 'line', 'opacity', 'z',
  'hover-bor', 'hover-rad', 'hover-opacity', 'hover-scale'
])

export const STRING_PROPERTIES = new Set(['font', 'icon', 'src', 'alt', 'fit', 'align', 'cursor', 'pointer', 'shadow'])

// Keywords
export const KEYWORDS = new Set(['after', 'before', 'from'])

// Action Keywords (for state changes and interactions)
export const ACTION_KEYWORDS = new Set([
  'open', 'close', 'toggle', 'change', 'to', 'page', 'show', 'hide', 'assign'
])

// Control Flow Keywords
export const CONTROL_KEYWORDS = new Set([
  'if', 'not', 'and', 'or', 'else', 'each', 'in'
])

// Event Keywords
export const EVENT_KEYWORDS = new Set([
  'onclick', 'onhover', 'onchange', 'oninput', 'onload', 'onfocus', 'onblur', 'onkeydown', 'onkeyup'
])

// State Keyword
export const STATE_KEYWORD = 'state'

// Events Keyword (for centralized event block)
export const EVENTS_KEYWORD = 'events'

// Animation Keywords (for overlay open/close animations)
// Note: 'none' is not included because it conflicts with BORDER_STYLES
// To have no animation, simply omit the animation parameter
export const ANIMATION_KEYWORDS = new Set([
  'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'fade', 'scale'
])

// Position Keywords (for overlay positioning relative to trigger or viewport)
export const POSITION_KEYWORDS = new Set([
  'below', 'above', 'left', 'right',  // Relative to trigger element
  'center'                             // Relative to viewport (for modals)
])
