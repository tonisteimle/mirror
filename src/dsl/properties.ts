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

// All known properties (short forms)
export const PROPERTIES = new Set([
  // Layout
  'hor', 'ver', 'gap', 'gap-col', 'gap-row', 'between', 'wrap', 'grow', 'fill', 'cen', 'grid', 'rows', 'stacked',
  // Data binding
  'data',
  // Alignment
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  // Sizing
  'w', 'h', 'full', 'minw', 'maxw', 'minh', 'maxh',
  // Spacing (short and long forms)
  'pad', 'padding', 'mar', 'margin',
  // Colors: col = text color, bg = background color
  'col', 'color', 'bg', 'boc',
  // Border (short and long forms)
  'rad', 'radius', 'border', 'bor',
  // Typography
  'size', 'weight', 'font', 'line', 'align', 'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  // Form inputs
  'placeholder', 'type', 'disabled', 'visible', 'rows',
  // Segment (masked input)
  'length', 'pattern', 'mask', 'segments',
  // Link attributes
  'href', 'target',
  // Slider/Range
  'min', 'max', 'step', 'value',
  // Visuals
  'icon', 'src', 'alt', 'fit', 'shadow', 'opacity', 'opa', 'op', 'cursor', 'pointer', 'z', 'hidden',
  // Overflow / Scroll
  'scroll', 'scroll-ver', 'scroll-hor', 'scroll-both', 'snap', 'clip',
  // Hover states
  'hover-col', 'hover-bg', 'hover-boc', 'hover-bor', 'hover-rad', 'hover-opacity', 'hover-scale',
])

// Border styles for compound border property
// Note: 'none' is not included - to remove a border, simply don't use bor
export const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted'])

// Properties that can take direction modifiers (l, r, u, d)
export const DIRECTIONAL_PROPERTIES = new Set(['pad', 'mar', 'bor'])

// Direction values (u/d = up/down, t/b = top/bottom are aliases)
export const DIRECTIONS = new Set(['l', 'r', 'u', 'd', 't', 'b'])

// Check if a string is a valid direction combo (e.g., 'ud', 'lr', 'u-d', 'l-r', 't-b')
export function isDirectionOrCombo(value: string): boolean {
  // Single direction
  if (DIRECTIONS.has(value)) return true
  // Combo with hyphen: u-d, l-r, t-b, u-d-l, etc.
  if (value.includes('-')) {
    const parts = value.split('-')
    return parts.every(p => DIRECTIONS.has(p))
  }
  // Combo without hyphen: ud, lr, udlr, tb
  return value.length > 0 && /^[lrudtb]+$/.test(value)
}

// Normalize direction: t→u (top→up), b→d (bottom→down)
export function normalizeDirection(dir: string): string {
  if (dir === 't') return 'u'
  if (dir === 'b') return 'd'
  return dir
}

// Split direction combo into individual directions (normalized)
export function splitDirectionCombo(value: string): string[] {
  if (value.includes('-')) {
    return value.split('-').filter(p => DIRECTIONS.has(p)).map(normalizeDirection)
  }
  return value.split('').filter(p => DIRECTIONS.has(p)).map(normalizeDirection)
}

// Properties by type
export const BOOLEAN_PROPERTIES = new Set([
  'hor', 'ver', 'full', 'between', 'wrap', 'grow', 'fill', 'cen', 'stacked',
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  'hidden', 'visible',
  'mask'  // Segment (masked input) - hide characters
])

export const COLOR_PROPERTIES = new Set([
  'col', 'bg', 'boc',
  'hover-col', 'hover-bg', 'hover-boc'
])

export const NUMBER_PROPERTIES = new Set([
  'gap', 'gap-col', 'gap-row', 'w', 'h', 'minw', 'maxw', 'minh', 'maxh',
  'pad', 'mar', 'rad', 'border', 'bor',
  'size', 'weight', 'line', 'opacity', 'opa', 'op', 'z',
  'hover-bor', 'hover-rad', 'hover-opacity', 'hover-scale',
  'min', 'max', 'step', 'value', 'rows',
  'length', 'segments'  // Segment (masked input)
])

export const STRING_PROPERTIES = new Set(['font', 'icon', 'src', 'alt', 'fit', 'align', 'cursor', 'pointer', 'shadow', 'href', 'target', 'placeholder', 'type', 'pattern'])

// Property keyword values - valid keyword values for certain properties
// These are accepted as COMPONENT_NAME tokens but should be consumed as property values
export const PROPERTY_KEYWORD_VALUES = new Set([
  // Shadow sizes
  'sm', 'md', 'lg', 'xl', 'xs', '2xl', '3xl', 'none',
  // Fit values (for Image)
  'cover', 'contain', 'fill', 'none', 'scale-down',
  // Cursor values
  'pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair',
  // Align values
  'left', 'center', 'right', 'justify',
  // Input types
  'email', 'password', 'text', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local',
  // Segment types (for masked input)
  'digits', 'alpha', 'alphanumeric',
  // Link targets
  '_blank', '_self', '_parent', '_top'
])

// Keywords
export const KEYWORDS = new Set(['after', 'before', 'from', 'as', 'named'])

// Type Keywords - REMOVED
// Previously contained 'box' and 'text' but these were never used
// and conflicted with common component names

// Action Keywords (for state changes and interactions)
export const ACTION_KEYWORDS = new Set([
  'open', 'close', 'toggle', 'change', 'to', 'page', 'show', 'hide', 'assign', 'alert',
  // Behavior actions (for dropdowns, lists, etc.)
  'highlight', 'select', 'filter',
  // Selection management
  'deselect', 'clear-selection',
  // Activation (for tabs, toggle groups)
  'activate', 'deactivate', 'deactivate-siblings',
  // State toggle (for accordions)
  'toggle-state',
  // Validation
  'validate', 'reset',
  // Focus management (for segments/forms)
  'focus'
])

// Special targets for behavior actions
export const BEHAVIOR_TARGETS = new Set([
  'self',           // Target the current element
  'next',           // highlight next in list
  'prev',           // highlight prev in list
  'first',          // highlight first in list
  'last',           // highlight last in list
  'first-empty',    // focus first empty segment
  'highlighted',    // select highlighted item
  'selected',       // the currently selected item
  'self-and-before', // highlight/select self and all before (Rating pattern)
  'all',            // all items in container
  'none'            // clear all highlights/selections
])

// Control Flow Keywords
export const CONTROL_KEYWORDS = new Set([
  'if', 'then', 'not', 'and', 'or', 'else', 'each', 'in',
  'where'  // For data binding filter: data Tasks where done == false
])

// Event Keywords
export const EVENT_KEYWORDS = new Set([
  'onclick', 'onhover', 'onchange', 'oninput', 'onload', 'onfocus', 'onblur', 'onkeydown', 'onkeyup',
  // Behavior events (click outside, key-specific)
  'onclick-outside', 'onclick-inside',
  // Segment events (for masked input)
  'onfill', 'oncomplete', 'onempty'
])

// Timing Modifiers for events and actions
export const TIMING_MODIFIERS = new Set([
  'debounce',  // Debounce event: oninput debounce 300 filter Results
  'delay'      // Delay action: onblur delay 200 hide Results
])

// Key Modifiers for onkeydown/onkeyup events
export const KEY_MODIFIERS = new Set([
  'escape', 'enter', 'tab', 'space',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
  'backspace', 'delete', 'home', 'end'
])

// State Keyword
export const STATE_KEYWORD = 'state'

// Behavior State Keywords - these can be used as state block names
// The keyword IS the state name: `highlight` block defines the `highlight` state
// Used by behavior actions: `highlight next` applies the `highlight` state
export const BEHAVIOR_STATE_KEYWORDS = new Set([
  'highlight',  // highlight next/prev/self
  'select'      // select highlighted/self
])

// System States - automatically bound to browser pseudo-classes
// These states don't need explicit event handlers
export const SYSTEM_STATES = new Set([
  'hover',    // Bound to onMouseEnter/Leave
  'focus',    // Bound to onFocus/onBlur
  'active',   // Bound to onMouseDown/Up
  'disabled', // Bound to disabled attribute
])

// Events Keyword (for centralized event block)
export const EVENTS_KEYWORD = 'events'

// Animation Keywords (for overlay open/close animations)
// Note: 'none' also exists in BORDER_STYLES, but the parser handles context
export const ANIMATION_KEYWORDS = new Set([
  'slide-up', 'slide-down', 'slide-left', 'slide-right',
  'fade', 'scale', 'none',
  // Continuous animations
  'spin', 'pulse', 'bounce'
])

// Animation Action Keywords (for element show/hide/animate blocks)
export const ANIMATION_ACTION_KEYWORDS = new Set([
  'show',     // Entrance animation: show fade slide-up 300
  'hide',     // Exit animation: hide fade 200
  'animate'   // Continuous animation: animate spin 1000
])

// Position Keywords (for overlay positioning relative to trigger or viewport)
export const POSITION_KEYWORDS = new Set([
  'below', 'above', 'left', 'right',  // Relative to trigger element
  'center'                             // Relative to viewport (for modals)
])
