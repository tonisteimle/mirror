/**
 * Single source of truth for DSL properties
 * Used by lexer, validator, and linter
 *
 * PROPERTY NAMING CONVENTIONS:
 * ----------------------------
 * PRIMARY: Full, readable names (natural language):
 *   padding, margin, color, background, radius, border, border-color
 *   width, height, horizontal, vertical, center, opacity
 *
 * SHORTCUTS: Short forms accepted for fast typing, auto-expanded to long forms:
 *   pad → padding, mar → margin, col → color, bg → background
 *   rad → radius, bor → border, boc → border-color
 *   w → width, h → height, hor → horizontal, ver → vertical
 *   opa → opacity, cen → center
 *
 * DIRECTIONS: Full names for readability:
 *   top, bottom, left, right (shortcuts: u/t, d/b, l, r)
 *   Combinations: left-right, top-bottom (shortcuts: l-r, u-d, t-b)
 *
 * The editor auto-completes shortcuts to full forms for readable code.
 */

// ============================================
// Property Name Mappings (Short → Long)
// ============================================

// Maps short property names to their full, readable forms
export const PROPERTY_LONG_FORMS: Record<string, string> = {
  // Layout
  'hor': 'horizontal',
  'ver': 'vertical',
  'cen': 'center',
  // Sizing
  'w': 'width',
  'h': 'height',
  'minw': 'min-width',
  'maxw': 'max-width',
  'minh': 'min-height',
  'maxh': 'max-height',
  // Spacing
  'pad': 'padding',
  'mar': 'margin',
  // Colors
  'col': 'color',
  'bg': 'background',
  'boc': 'border-color',
  // Border
  'rad': 'radius',
  'bor': 'border',
  // Visuals
  'opa': 'opacity',
  'op': 'opacity',
  // Hover states
  'hover-col': 'hover-color',
  'hover-bg': 'hover-background',
  'hover-boc': 'hover-border-color',
  'hover-bor': 'hover-border',
  'hover-rad': 'hover-radius',
}

// Reverse mapping: Long → Short (for internal storage compatibility)
export const PROPERTY_SHORT_FORMS: Record<string, string> = Object.fromEntries(
  Object.entries(PROPERTY_LONG_FORMS).map(([short, long]) => [long, short])
)

// Direction mappings (Short → Long)
export const DIRECTION_LONG_FORMS: Record<string, string> = {
  'u': 'top',
  't': 'top',
  'd': 'bottom',
  'b': 'bottom',
  'l': 'left',
  'r': 'right',
}

// Reverse mapping: Long direction → Short (for internal storage)
export const DIRECTION_SHORT_FORMS: Record<string, string> = {
  'top': 'u',
  'bottom': 'd',
  'left': 'l',
  'right': 'r',
}

// All known properties (both short and long forms accepted)
// Editor expands shortcuts to long forms for readability
export const PROPERTIES = new Set([
  // Layout - both forms
  // Note: 'center' is NOT included here to allow it to be tokenized as COMPONENT_NAME
  // for overlay position keywords. Use 'cen' shorthand for layout centering.
  'hor', 'horizontal', 'ver', 'vertical', 'cen',
  'gap', 'gap-col', 'gap-row', 'between', 'wrap', 'grow', 'shrink', 'fill', 'grid', 'rows', 'stacked',
  // Data binding
  'data',
  // Alignment - both forms
  'hor-l', 'horizontal-left', 'hor-cen', 'horizontal-center', 'hor-r', 'horizontal-right',
  'ver-t', 'vertical-top', 'ver-cen', 'vertical-center', 'ver-b', 'vertical-bottom',
  // Sizing - both forms
  'w', 'width', 'h', 'height',
  'minw', 'min-width', 'maxw', 'max-width', 'minh', 'min-height', 'maxh', 'max-height',
  'full',
  // Spacing - both forms
  'pad', 'padding', 'mar', 'margin',
  // Colors - both forms
  'col', 'color', 'bg', 'background', 'boc', 'border-color',
  // Border - both forms
  'rad', 'radius', 'bor', 'border',
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
  // Visuals - both forms
  'opa', 'op', 'opacity',
  'icon', 'src', 'alt', 'fit', 'shadow', 'cursor', 'pointer', 'z', 'hidden', 'shortcut',
  // Transform (note: 'scale' is in ANIMATION_KEYWORDS, so not listed here)
  'rotate', 'translate',
  // Overflow / Scroll - both forms
  'scroll', 'scroll-ver', 'scroll-vertical', 'scroll-hor', 'scroll-horizontal', 'scroll-both', 'snap', 'clip',
  // Hover states - both forms
  'hover-col', 'hover-color', 'hover-bg', 'hover-background',
  'hover-boc', 'hover-border-color', 'hover-bor', 'hover-border',
  'hover-rad', 'hover-radius', 'hover-opa', 'hover-opacity', 'hover-scale',
])

// Border styles for compound border property
// Note: 'none' is not included - to remove a border, simply don't use bor
export const BORDER_STYLES = new Set(['solid', 'dashed', 'dotted'])

// Properties that can take direction modifiers (both forms)
export const DIRECTIONAL_PROPERTIES = new Set([
  'pad', 'padding',
  'mar', 'margin',
  'bor', 'border'
])

// Direction values for spacing/border (short forms only as tokens)
// Long forms (left, right, top, bottom) are handled as COMPONENT_NAME
// to avoid conflicts with position keywords for overlays
export const DIRECTIONS = new Set([
  'l', 'r', 'u', 'd', 't', 'b'
])

// Short directions only (for regex matching)
export const SHORT_DIRECTIONS = new Set(['l', 'r', 'u', 'd', 't', 'b'])

// Long directions (for normalization, not tokenization)
export const LONG_DIRECTIONS = new Set(['left', 'right', 'top', 'bottom'])

// Check if a string is a valid direction or combo
// Supports: l, left, l-r, left-right, top-bottom, etc.
export function isDirectionOrCombo(value: string): boolean {
  // Single direction (short or long)
  if (DIRECTIONS.has(value)) return true

  // Combo with hyphen: u-d, l-r, t-b, left-right, top-bottom, etc.
  if (value.includes('-')) {
    const parts = value.split('-')
    return parts.every(p => DIRECTIONS.has(p))
  }

  // Combo without hyphen (short forms only): ud, lr, udlr, tb
  return value.length > 0 && /^[lrudtb]+$/.test(value)
}

// Normalize direction to internal short form for storage
// top/t → u, bottom/b → d, left → l, right → r
export function normalizeDirection(dir: string): string {
  // Long forms
  if (dir === 'top') return 'u'
  if (dir === 'bottom') return 'd'
  if (dir === 'left') return 'l'
  if (dir === 'right') return 'r'
  // Short form aliases
  if (dir === 't') return 'u'
  if (dir === 'b') return 'd'
  return dir
}

// Convert direction to long form for display
export function directionToLongForm(dir: string): string {
  const normalized = normalizeDirection(dir)
  return DIRECTION_LONG_FORMS[normalized] || dir
}

// Split direction combo into individual directions (normalized to short form)
export function splitDirectionCombo(value: string): string[] {
  if (value.includes('-')) {
    return value.split('-').filter(p => DIRECTIONS.has(p)).map(normalizeDirection)
  }
  // For short combos like 'ud', 'lr'
  if (/^[lrudtb]+$/.test(value)) {
    return value.split('').filter(p => SHORT_DIRECTIONS.has(p)).map(normalizeDirection)
  }
  // Single long direction
  if (LONG_DIRECTIONS.has(value)) {
    return [normalizeDirection(value)]
  }
  return []
}

// Convert direction combo to long form for display
// e.g., 'l-r' → 'left-right', 'u-d' → 'top-bottom'
export function directionComboToLongForm(value: string): string {
  const parts = splitDirectionCombo(value)
  return parts.map(p => DIRECTION_LONG_FORMS[p] || p).join('-')
}

// Properties by type (both short and long forms)
export const BOOLEAN_PROPERTIES = new Set([
  // Short forms
  'hor', 'ver', 'cen',
  'hor-l', 'hor-cen', 'hor-r', 'ver-t', 'ver-cen', 'ver-b',
  // Long forms
  'horizontal', 'vertical', 'center',
  'horizontal-left', 'horizontal-center', 'horizontal-right',
  'vertical-top', 'vertical-center', 'vertical-bottom',
  // Common
  'full', 'between', 'wrap', 'grow', 'fill', 'stacked',
  'italic', 'underline', 'lowercase', 'uppercase', 'truncate',
  'hidden', 'visible',
  'mask'  // Segment (masked input) - hide characters
])

export const COLOR_PROPERTIES = new Set([
  // Short forms
  'col', 'bg', 'boc',
  'hover-col', 'hover-bg', 'hover-boc',
  // Long forms
  'color', 'background', 'border-color',
  'hover-color', 'hover-background', 'hover-border-color'
])

export const NUMBER_PROPERTIES = new Set([
  // Short forms
  'w', 'h', 'minw', 'maxw', 'minh', 'maxh',
  'pad', 'mar', 'rad', 'bor',
  'opa', 'op',
  'hover-bor', 'hover-rad',
  // Long forms
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'padding', 'margin', 'radius', 'border',
  'opacity',
  'hover-border', 'hover-radius',
  // Common
  'gap', 'gap-col', 'gap-row', 'shrink',
  'size', 'weight', 'line', 'z',
  'hover-opa', 'hover-opacity', 'hover-scale',
  'min', 'max', 'step', 'value', 'rows',
  'length', 'segments'  // Segment (masked input)
])

export const STRING_PROPERTIES = new Set(['font', 'icon', 'src', 'alt', 'fit', 'align', 'cursor', 'pointer', 'shadow', 'href', 'target', 'placeholder', 'type', 'pattern', 'shortcut'])

// ============================================
// Property Normalization Functions
// ============================================

/**
 * Normalize a property name to its short form for internal storage.
 * This ensures backward compatibility with existing code.
 * e.g., 'padding' → 'pad', 'horizontal' → 'hor'
 */
export function normalizePropertyToShort(prop: string): string {
  return PROPERTY_SHORT_FORMS[prop] || prop
}

/**
 * Convert a property name to its long, readable form for display.
 * e.g., 'pad' → 'padding', 'hor' → 'horizontal'
 */
export function propertyToLongForm(prop: string): string {
  return PROPERTY_LONG_FORMS[prop] || prop
}

/**
 * Normalize a full property with direction to short form.
 * e.g., 'padding top' → 'pad_u', 'margin left-right' → 'mar_l-r'
 */
export function normalizePropertyWithDirection(prop: string, direction?: string): string {
  const shortProp = normalizePropertyToShort(prop)
  if (!direction) return shortProp

  // Normalize direction(s)
  const dirs = splitDirectionCombo(direction)
  if (dirs.length === 0) return shortProp

  return `${shortProp}_${dirs.join('-')}`
}

/**
 * Convert a property_direction to long form for display.
 * e.g., 'pad_u' → 'padding top', 'mar_l-r' → 'margin left-right'
 */
export function propertyWithDirectionToLongForm(prop: string): string {
  // Check for underscore-separated direction
  const underscoreIndex = prop.indexOf('_')
  if (underscoreIndex === -1) {
    return propertyToLongForm(prop)
  }

  const baseProp = prop.substring(0, underscoreIndex)
  const direction = prop.substring(underscoreIndex + 1)

  const longProp = propertyToLongForm(baseProp)
  const longDir = directionComboToLongForm(direction)

  return `${longProp} ${longDir}`
}

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

// Behavior States - activated by actions like highlight, select, etc.
// These require explicit event handlers
export const BEHAVIOR_STATES = new Set([
  'highlighted',
  'selected',
  'active',     // Can also be a behavior state
  'inactive',
  'expanded',
  'collapsed',
  'valid',
  'invalid',
  'default',    // Initial state
  'on',         // Toggle states
  'off',
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
// Note: includes both long and short forms since normalizer may convert center->cen
export const POSITION_KEYWORDS = new Set([
  'below', 'above', 'left', 'right',  // Relative to trigger element
  'center', 'cen'                      // Relative to viewport (for modals)
])
