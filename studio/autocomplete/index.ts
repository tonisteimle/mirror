/**
 * Autocomplete Engine - Context-aware completions for Mirror DSL
 */

import { state } from '../core'

export interface Completion {
  label: string
  detail?: string
  type: 'property' | 'value' | 'component' | 'token' | 'state' | 'keyword' | 'constant'
  boost?: number
  info?: string
}

export interface AutocompleteRequest {
  lineText: string
  cursorColumn: number
  fullSource?: string
  explicit?: boolean
}

export interface AutocompleteResult {
  completions: Completion[]
  from: number
  to: number
  context: AutocompleteContext
}

export type AutocompleteContext =
  | 'property'     // After comma, component name, or colon
  | 'value'        // After property name
  | 'state'        // After "state "
  | 'slot'         // Indented with capital letter
  | 'action'       // After event: (onclick:, onhover:, etc.)
  | 'target'       // After action (show, hide, toggle, etc.)
  | 'duration'     // After transition property
  | 'easing'       // After transition duration
  | 'none'

// Priority properties (common ones shown first)
export const PRIORITY_PROPERTIES = new Set([
  'bg', 'background', 'col', 'color', 'pad', 'padding', 'gap', 'g',
  'rad', 'radius', 'bor', 'border', 'width', 'w', 'height', 'h',
  'hor', 'horizontal', 'ver', 'vertical', 'center', 'cen',
  'font-size', 'fs', 'weight', 'opacity', 'o', 'shadow',
  'hover-bg', 'hover-col', 'cursor', 'hidden', 'visible'
])

// State names
export const STATE_NAMES: Completion[] = [
  { label: 'hover', detail: 'Mouse over element', type: 'state' },
  { label: 'focus', detail: 'Element has focus', type: 'state' },
  { label: 'active', detail: 'Element is active/pressed', type: 'state' },
  { label: 'disabled', detail: 'Element is disabled', type: 'state' },
  { label: 'filled', detail: 'Input has value', type: 'state' },
  { label: 'highlighted', detail: 'Element is highlighted', type: 'state' },
  { label: 'selected', detail: 'Element is selected', type: 'state' },
  { label: 'expanded', detail: 'Element is expanded', type: 'state' },
  { label: 'collapsed', detail: 'Element is collapsed', type: 'state' },
  { label: 'valid', detail: 'Input is valid', type: 'state' },
  { label: 'invalid', detail: 'Input is invalid', type: 'state' },
  { label: 'on', detail: 'Toggle is on', type: 'state' },
  { label: 'off', detail: 'Toggle is off', type: 'state' },
  { label: 'default', detail: 'Default state', type: 'state' },
  { label: 'inactive', detail: 'Element is inactive', type: 'state' },
]

// Actions (for after events like onclick:)
export const ACTION_COMPLETIONS: Completion[] = [
  { label: 'show', detail: 'show element', type: 'keyword' },
  { label: 'hide', detail: 'hide element', type: 'keyword' },
  { label: 'toggle', detail: 'toggle visibility', type: 'keyword' },
  { label: 'open', detail: 'open overlay/dialog', type: 'keyword' },
  { label: 'close', detail: 'close overlay/dialog', type: 'keyword' },
  { label: 'select', detail: 'select element', type: 'keyword' },
  { label: 'deselect', detail: 'deselect element', type: 'keyword' },
  { label: 'highlight', detail: 'highlight element', type: 'keyword' },
  { label: 'activate', detail: 'activate element', type: 'keyword' },
  { label: 'deactivate', detail: 'deactivate element', type: 'keyword' },
  { label: 'deactivate-siblings', detail: 'deactivate siblings', type: 'keyword' },
  { label: 'toggle-state', detail: 'toggle custom state', type: 'keyword' },
  { label: 'page', detail: 'navigate to page', type: 'keyword' },
  { label: 'focus', detail: 'focus element', type: 'keyword' },
  { label: 'call', detail: 'call JS function', type: 'keyword' },
  { label: 'assign', detail: 'assign value', type: 'keyword' },
  { label: 'filter', detail: 'filter list', type: 'keyword' },
  { label: 'clear-selection', detail: 'clear all selections', type: 'keyword' },
  { label: 'validate', detail: 'validate form', type: 'keyword' },
  { label: 'reset', detail: 'reset form', type: 'keyword' },
  { label: 'alert', detail: 'show alert', type: 'keyword' },
]

// Target keywords (special targets after actions)
export const TARGET_KEYWORDS: Completion[] = [
  { label: 'self', detail: 'current element', type: 'keyword' },
  { label: 'next', detail: 'next element', type: 'keyword' },
  { label: 'prev', detail: 'previous element', type: 'keyword' },
  { label: 'first', detail: 'first element', type: 'keyword' },
  { label: 'last', detail: 'last element', type: 'keyword' },
  { label: 'first-empty', detail: 'first empty element', type: 'keyword' },
  { label: 'highlighted', detail: 'highlighted element', type: 'keyword' },
  { label: 'selected', detail: 'selected element', type: 'keyword' },
  { label: 'all', detail: 'all elements', type: 'keyword' },
  { label: 'none', detail: 'no element', type: 'keyword' },
]

// Duration values for transitions
export const DURATION_COMPLETIONS: Completion[] = [
  { label: '100', detail: '100ms - fast', type: 'constant' },
  { label: '150', detail: '150ms - quick', type: 'constant' },
  { label: '200', detail: '200ms - normal', type: 'constant' },
  { label: '300', detail: '300ms - smooth', type: 'constant' },
  { label: '500', detail: '500ms - slow', type: 'constant' },
]

// Easing functions for transitions
export const EASING_COMPLETIONS: Completion[] = [
  { label: 'ease', detail: 'default easing', type: 'constant' },
  { label: 'ease-in', detail: 'slow start', type: 'constant' },
  { label: 'ease-out', detail: 'slow end', type: 'constant' },
  { label: 'ease-in-out', detail: 'slow start and end', type: 'constant' },
  { label: 'linear', detail: 'constant speed', type: 'constant' },
]

// Event names that trigger action context
export const EVENT_NAMES = [
  'onclick', 'onclick-outside', 'onhover', 'onfocus', 'onblur',
  'onchange', 'oninput', 'onload', 'onkeydown', 'onkeyup'
]

// Actions that expect a target
export const ACTIONS_WITH_TARGET = [
  'show', 'hide', 'toggle', 'open', 'close', 'select', 'deselect',
  'highlight', 'activate', 'deactivate', 'focus', 'page'
]

// Transition properties
export const TRANSITION_PROPERTIES = [
  'all', 'bg', 'background', 'col', 'color', 'opacity', 'transform',
  'pad', 'padding', 'margin', 'w', 'width', 'h', 'height', 'rad', 'radius'
]

// Property values by property name
export const PROPERTY_VALUES: Record<string, Completion[]> = {
  'width': [
    { label: 'hug', detail: 'fit-content', type: 'value' },
    { label: 'full', detail: '100% + flex-grow', type: 'value' },
  ],
  'w': [
    { label: 'hug', detail: 'fit-content', type: 'value' },
    { label: 'full', detail: '100% + flex-grow', type: 'value' },
  ],
  'height': [
    { label: 'hug', detail: 'fit-content', type: 'value' },
    { label: 'full', detail: '100% + flex-grow', type: 'value' },
  ],
  'h': [
    { label: 'hug', detail: 'fit-content', type: 'value' },
    { label: 'full', detail: '100% + flex-grow', type: 'value' },
  ],
  'cursor': [
    { label: 'pointer', detail: 'pointer cursor', type: 'value' },
    { label: 'default', detail: 'default cursor', type: 'value' },
    { label: 'move', detail: 'move cursor', type: 'value' },
    { label: 'text', detail: 'text cursor', type: 'value' },
    { label: 'grab', detail: 'grab cursor', type: 'value' },
    { label: 'grabbing', detail: 'grabbing cursor', type: 'value' },
    { label: 'not-allowed', detail: 'not allowed', type: 'value' },
  ],
  'text-align': [
    { label: 'left', detail: 'align left', type: 'value' },
    { label: 'center', detail: 'align center', type: 'value' },
    { label: 'right', detail: 'align right', type: 'value' },
  ],
  'position': [
    { label: 'relative', detail: 'relative positioning', type: 'value' },
    { label: 'absolute', detail: 'absolute positioning', type: 'value' },
    { label: 'fixed', detail: 'fixed positioning', type: 'value' },
    { label: 'sticky', detail: 'sticky positioning', type: 'value' },
  ],
  'overflow': [
    { label: 'hidden', detail: 'hide overflow', type: 'value' },
    { label: 'auto', detail: 'auto scrollbars', type: 'value' },
    { label: 'scroll', detail: 'always show scrollbars', type: 'value' },
    { label: 'visible', detail: 'show overflow', type: 'value' },
  ],
  'weight': [
    { label: 'normal', detail: '400', type: 'value' },
    { label: 'medium', detail: '500', type: 'value' },
    { label: 'semibold', detail: '600', type: 'value' },
    { label: 'bold', detail: '700', type: 'value' },
    { label: '400', detail: 'normal', type: 'value' },
    { label: '500', detail: 'medium', type: 'value' },
    { label: '600', detail: 'semi-bold', type: 'value' },
    { label: '700', detail: 'bold', type: 'value' },
  ],
  'size': [
    { label: 'hug', detail: 'fit-content', type: 'value' },
    { label: 'full', detail: '100% + flex-grow', type: 'value' },
  ],
  'align': [
    { label: 'top', detail: 'align top', type: 'value' },
    { label: 'bottom', detail: 'align bottom', type: 'value' },
    { label: 'left', detail: 'align left', type: 'value' },
    { label: 'right', detail: 'align right', type: 'value' },
    { label: 'center', detail: 'align center', type: 'value' },
    { label: 'ver-center', detail: 'vertical center', type: 'value' },
    { label: 'hor-center', detail: 'horizontal center', type: 'value' },
  ],
  'shadow': [
    { label: 'sm', detail: 'small shadow', type: 'value' },
    { label: 'md', detail: 'medium shadow', type: 'value' },
    { label: 'lg', detail: 'large shadow', type: 'value' },
  ],
  'font': [
    { label: 'monospace', detail: 'monospace font', type: 'value' },
    { label: 'sans-serif', detail: 'sans-serif font', type: 'value' },
    { label: 'serif', detail: 'serif font', type: 'value' },
  ],
  'bor': [
    { label: 'solid', detail: 'solid line', type: 'value' },
    { label: 'dashed', detail: 'dashed line', type: 'value' },
    { label: 'dotted', detail: 'dotted line', type: 'value' },
  ],
  'border': [
    { label: 'solid', detail: 'solid line', type: 'value' },
    { label: 'dashed', detail: 'dashed line', type: 'value' },
    { label: 'dotted', detail: 'dotted line', type: 'value' },
  ],
}

// Common Mirror properties
export const MIRROR_PROPERTIES: Completion[] = [
  // Layout
  { label: 'hor', detail: 'horizontal layout', type: 'property' },
  { label: 'horizontal', detail: 'horizontal layout', type: 'property' },
  { label: 'ver', detail: 'vertical layout', type: 'property' },
  { label: 'vertical', detail: 'vertical layout', type: 'property' },
  { label: 'center', detail: 'center both axes', type: 'property' },
  { label: 'cen', detail: 'center both axes', type: 'property' },
  { label: 'spread', detail: 'space-between', type: 'property' },
  { label: 'wrap', detail: 'allow wrapping', type: 'property' },
  { label: 'stacked', detail: 'z-layers', type: 'property' },
  { label: 'grid', detail: 'grid layout', type: 'property' },
  // Alignment
  { label: 'hor-center', detail: 'center horizontal', type: 'property' },
  { label: 'ver-center', detail: 'center vertical', type: 'property' },
  // Spacing
  { label: 'pad', detail: 'padding', type: 'property' },
  { label: 'padding', detail: 'padding', type: 'property' },
  { label: 'p', detail: 'padding', type: 'property' },
  { label: 'margin', detail: 'margin', type: 'property' },
  { label: 'm', detail: 'margin', type: 'property' },
  { label: 'gap', detail: 'gap between children', type: 'property' },
  { label: 'g', detail: 'gap between children', type: 'property' },
  // Size
  { label: 'width', detail: 'width (hug/full/px)', type: 'property' },
  { label: 'w', detail: 'width (hug/full/px)', type: 'property' },
  { label: 'height', detail: 'height (hug/full/px)', type: 'property' },
  { label: 'h', detail: 'height (hug/full/px)', type: 'property' },
  { label: 'size', detail: 'width + height', type: 'property' },
  { label: 'min-width', detail: 'minimum width', type: 'property' },
  { label: 'minw', detail: 'minimum width', type: 'property' },
  { label: 'max-width', detail: 'maximum width', type: 'property' },
  { label: 'maxw', detail: 'maximum width', type: 'property' },
  { label: 'min-height', detail: 'minimum height', type: 'property' },
  { label: 'minh', detail: 'minimum height', type: 'property' },
  { label: 'max-height', detail: 'maximum height', type: 'property' },
  { label: 'maxh', detail: 'maximum height', type: 'property' },
  { label: 'hug', detail: 'fit content', type: 'property' },
  { label: 'full', detail: '100% + flex-grow', type: 'property' },
  // Colors
  { label: 'bg', detail: 'background color', type: 'property' },
  { label: 'background', detail: 'background color', type: 'property' },
  { label: 'col', detail: 'text color', type: 'property' },
  { label: 'color', detail: 'text color', type: 'property' },
  { label: 'c', detail: 'text color', type: 'property' },
  { label: 'boc', detail: 'border color', type: 'property' },
  { label: 'border-color', detail: 'border color', type: 'property' },
  // Border & Radius
  { label: 'bor', detail: 'border', type: 'property' },
  { label: 'border', detail: 'border', type: 'property' },
  { label: 'rad', detail: 'border radius', type: 'property' },
  { label: 'radius', detail: 'border radius', type: 'property' },
  // Typography
  { label: 'font-size', detail: 'font size', type: 'property' },
  { label: 'fs', detail: 'font size', type: 'property' },
  { label: 'weight', detail: 'font weight', type: 'property' },
  { label: 'line', detail: 'line height', type: 'property' },
  { label: 'font', detail: 'font family', type: 'property' },
  { label: 'align', detail: 'text alignment', type: 'property' },
  { label: 'text-align', detail: 'text alignment', type: 'property' },
  { label: 'italic', detail: 'italic text', type: 'property' },
  { label: 'underline', detail: 'underlined text', type: 'property' },
  { label: 'truncate', detail: 'truncate with ellipsis', type: 'property' },
  { label: 'uppercase', detail: 'uppercase text', type: 'property' },
  { label: 'lowercase', detail: 'lowercase text', type: 'property' },
  // Icons
  { label: 'icon-size', detail: 'icon size', type: 'property' },
  { label: 'is', detail: 'icon size', type: 'property' },
  { label: 'icon-weight', detail: 'icon stroke weight', type: 'property' },
  { label: 'iw', detail: 'icon stroke weight', type: 'property' },
  { label: 'icon-color', detail: 'icon color', type: 'property' },
  { label: 'ic', detail: 'icon color', type: 'property' },
  { label: 'fill', detail: 'filled icon', type: 'property' },
  // Visuals
  { label: 'opacity', detail: 'opacity 0-1', type: 'property' },
  { label: 'o', detail: 'opacity 0-1', type: 'property' },
  { label: 'shadow', detail: 'box shadow', type: 'property' },
  { label: 'cursor', detail: 'cursor style', type: 'property' },
  { label: 'z', detail: 'z-index', type: 'property' },
  { label: 'hidden', detail: 'start hidden', type: 'property' },
  { label: 'visible', detail: 'visibility', type: 'property' },
  { label: 'disabled', detail: 'disabled state', type: 'property' },
  { label: 'rotate', detail: 'rotation', type: 'property' },
  { label: 'rot', detail: 'rotation', type: 'property' },
  { label: 'translate', detail: 'translate X Y', type: 'property' },
  // Scroll
  { label: 'scroll', detail: 'vertical scroll', type: 'property' },
  { label: 'scroll-ver', detail: 'vertical scroll', type: 'property' },
  { label: 'scroll-hor', detail: 'horizontal scroll', type: 'property' },
  { label: 'scroll-both', detail: 'both directions', type: 'property' },
  { label: 'clip', detail: 'overflow hidden', type: 'property' },
  // Hover
  { label: 'hover-bg', detail: 'hover background', type: 'property' },
  { label: 'hover-background', detail: 'hover background', type: 'property' },
  { label: 'hover-col', detail: 'hover color', type: 'property' },
  { label: 'hover-color', detail: 'hover color', type: 'property' },
  { label: 'hover-opacity', detail: 'hover opacity', type: 'property' },
  { label: 'hover-opa', detail: 'hover opacity', type: 'property' },
  { label: 'hover-scale', detail: 'hover scale', type: 'property' },
  { label: 'hover-bor', detail: 'hover border', type: 'property' },
  { label: 'hover-border', detail: 'hover border', type: 'property' },
  { label: 'hover-boc', detail: 'hover border color', type: 'property' },
  { label: 'hover-border-color', detail: 'hover border color', type: 'property' },
  { label: 'hover-rad', detail: 'hover radius', type: 'property' },
  { label: 'hover-radius', detail: 'hover radius', type: 'property' },
  // Position
  { label: 'position', detail: 'positioning', type: 'property' },
  { label: 'top', detail: 'top offset', type: 'property' },
  { label: 'right', detail: 'right offset', type: 'property' },
  { label: 'bottom', detail: 'bottom offset', type: 'property' },
  { label: 'left', detail: 'left offset', type: 'property' },
  // Animation
  { label: 'show', detail: 'show animation', type: 'property' },
  { label: 'hide', detail: 'hide animation', type: 'property' },
  { label: 'animate', detail: 'continuous animation', type: 'property' },
  // Special
  { label: 'focusable', detail: 'keyboard focusable', type: 'property' },
]

// Mirror keywords (components, events, actions, etc.)
export const MIRROR_KEYWORDS: Completion[] = [
  // Primitives
  { label: 'frame', detail: 'div container', type: 'keyword' },
  { label: 'box', detail: 'div container', type: 'keyword' },
  { label: 'text', detail: 'span element', type: 'keyword' },
  { label: 'button', detail: 'button element', type: 'keyword' },
  { label: 'input', detail: 'input element', type: 'keyword' },
  { label: 'textarea', detail: 'textarea element', type: 'keyword' },
  { label: 'image', detail: 'img element', type: 'keyword' },
  { label: 'link', detail: 'anchor element', type: 'keyword' },
  { label: 'icon', detail: 'icon element', type: 'keyword' },
  { label: 'material', detail: 'material icon type', type: 'keyword' },
  // Structure
  { label: 'as', detail: 'inherit from', type: 'keyword' },
  { label: 'extends', detail: 'inherit from', type: 'keyword' },
  { label: 'named', detail: 'named instance', type: 'keyword' },
  { label: 'import', detail: 'import file', type: 'keyword' },
  // Conditionals
  { label: 'if', detail: 'condition', type: 'keyword' },
  { label: 'else', detail: 'else branch', type: 'keyword' },
  { label: 'then', detail: 'then value', type: 'keyword' },
  // Data
  { label: 'each', detail: 'iterate', type: 'keyword' },
  { label: 'in', detail: 'in collection', type: 'keyword' },
  { label: 'where', detail: 'filter', type: 'keyword' },
  { label: 'data', detail: 'data binding', type: 'keyword' },
  { label: 'selection', detail: 'selection binding', type: 'keyword' },
  // States
  { label: 'state', detail: 'custom state', type: 'keyword' },
  // Events
  { label: 'onclick', detail: 'click event', type: 'keyword' },
  { label: 'onclick-outside', detail: 'click outside event', type: 'keyword' },
  { label: 'onhover', detail: 'hover event', type: 'keyword' },
  { label: 'onfocus', detail: 'focus event', type: 'keyword' },
  { label: 'onblur', detail: 'blur event', type: 'keyword' },
  { label: 'onchange', detail: 'change event', type: 'keyword' },
  { label: 'oninput', detail: 'input event', type: 'keyword' },
  { label: 'onload', detail: 'load event', type: 'keyword' },
  { label: 'onkeydown', detail: 'keydown event', type: 'keyword' },
  { label: 'onkeyup', detail: 'keyup event', type: 'keyword' },
  { label: 'keys', detail: 'keyboard shortcuts', type: 'keyword' },
  // Timing
  { label: 'debounce', detail: 'delay until idle', type: 'keyword' },
  { label: 'delay', detail: 'delay action', type: 'keyword' },
  // Actions
  { label: 'toggle', detail: 'toggle visibility', type: 'keyword' },
  { label: 'open', detail: 'open overlay', type: 'keyword' },
  { label: 'close', detail: 'close overlay', type: 'keyword' },
  { label: 'page', detail: 'navigate to page', type: 'keyword' },
  { label: 'select', detail: 'select item', type: 'keyword' },
  { label: 'deselect', detail: 'deselect item', type: 'keyword' },
  { label: 'clear-selection', detail: 'clear all selections', type: 'keyword' },
  { label: 'highlight', detail: 'highlight item', type: 'keyword' },
  { label: 'filter', detail: 'filter list', type: 'keyword' },
  { label: 'change', detail: 'change state', type: 'keyword' },
  { label: 'activate', detail: 'activate element', type: 'keyword' },
  { label: 'deactivate', detail: 'deactivate element', type: 'keyword' },
  { label: 'deactivate-siblings', detail: 'deactivate siblings', type: 'keyword' },
  { label: 'toggle-state', detail: 'toggle state', type: 'keyword' },
  { label: 'assign', detail: 'assign variable', type: 'keyword' },
  { label: 'validate', detail: 'validate form', type: 'keyword' },
  { label: 'reset', detail: 'reset form', type: 'keyword' },
  { label: 'focus', detail: 'focus element', type: 'keyword' },
  { label: 'alert', detail: 'show alert', type: 'keyword' },
  { label: 'call', detail: 'call JS function', type: 'keyword' },
  // Targets
  { label: 'self', detail: 'current element', type: 'keyword' },
  { label: 'next', detail: 'next element', type: 'keyword' },
  { label: 'prev', detail: 'previous element', type: 'keyword' },
  { label: 'first', detail: 'first element', type: 'keyword' },
  { label: 'last', detail: 'last element', type: 'keyword' },
  { label: 'first-empty', detail: 'first empty element', type: 'keyword' },
  { label: 'highlighted', detail: 'highlighted element', type: 'keyword' },
  { label: 'selected', detail: 'selected element', type: 'keyword' },
  { label: 'self-and-before', detail: 'self and all before', type: 'keyword' },
  { label: 'all', detail: 'all elements', type: 'keyword' },
  { label: 'none', detail: 'no element', type: 'keyword' },
  // Animation keywords
  { label: 'fade', detail: 'fade animation', type: 'keyword' },
  { label: 'scale', detail: 'scale animation', type: 'keyword' },
  { label: 'slide-up', detail: 'slide up', type: 'keyword' },
  { label: 'slide-down', detail: 'slide down', type: 'keyword' },
  { label: 'slide-left', detail: 'slide left', type: 'keyword' },
  { label: 'slide-right', detail: 'slide right', type: 'keyword' },
  { label: 'spin', detail: 'spin animation', type: 'keyword' },
  { label: 'pulse', detail: 'pulse animation', type: 'keyword' },
  { label: 'bounce', detail: 'bounce animation', type: 'keyword' },
  // Overlay positions
  { label: 'below', detail: 'position below', type: 'keyword' },
  { label: 'above', detail: 'position above', type: 'keyword' },
]

// All completions combined
export const ALL_COMPLETIONS: Completion[] = [...MIRROR_PROPERTIES, ...MIRROR_KEYWORDS]

/**
 * Extract named elements from source code for target completion
 */
export function extractElementNames(source: string): string[] {
  const names: string[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    // Definition: Name: = Component or Name: = properties
    const defMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)\s*:\s*=/)
    if (defMatch) {
      names.push(defMatch[1])
      continue
    }

    // Instance: Name = Component
    const instMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)\s*=\s*[A-Z]/)
    if (instMatch) {
      names.push(instMatch[1])
      continue
    }

    // Named component at line start (uppercase, not a definition)
    // e.g. "Modal" on its own line or "Modal bg #fff"
    const compMatch = line.match(/^([A-Z][a-zA-Z0-9_]*)(?:\s|$)/)
    if (compMatch && !line.includes('=') && !line.includes(':')) {
      // Only add if it looks like a custom component (not Box, Text, etc.)
      const name = compMatch[1]
      if (!['Box', 'Text', 'Button', 'Input', 'Icon', 'Image', 'Link', 'Frame'].includes(name)) {
        names.push(name)
      }
    }
  }

  // Deduplicate
  return [...new Set(names)]
}

/**
 * Extract page names from source code
 */
export function extractPageNames(source: string): string[] {
  const pages: string[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    // Page definitions typically look like: PageName: = ...
    // or contain "page" in some way
    const pageMatch = line.match(/^([A-Z][a-zA-Z0-9_]*Page)\s*:\s*=/)
    if (pageMatch) {
      pages.push(pageMatch[1])
    }
  }

  return [...new Set(pages)]
}

export class AutocompleteEngine {
  /**
   * Detect the context for autocomplete
   */
  detectContext(lineText: string, cursorColumn: number): AutocompleteContext {
    const textBefore = lineText.slice(0, cursorColumn)

    // After "state " → state names
    if (textBefore.match(/\bstate\s+$/)) {
      return 'state'
    }

    // After event + colon (onclick:, onhover:, etc.) → action context
    // Matches: onclick:, onclick: , onkeydown enter:, etc.
    const eventPattern = new RegExp(
      `\\b(${EVENT_NAMES.join('|')})(\\s+\\w+)?:\\s*$`
    )
    if (eventPattern.test(textBefore)) {
      return 'action'
    }

    // After action in chain (onclick: show, onclick: toggle, etc.) → target context
    // Also matches chained actions: onclick: show Modal,
    const actionPattern = new RegExp(
      `\\b(${EVENT_NAMES.join('|')})(\\s+\\w+)?:\\s*` +
      `(?:\\w+\\s+\\w+\\s*,\\s*)*` +  // Previous actions in chain
      `(${ACTIONS_WITH_TARGET.join('|')})\\s+$`
    )
    if (actionPattern.test(textBefore)) {
      return 'target'
    }

    // After "transition" + property → duration context
    const transitionPropPattern = new RegExp(
      `\\btransition\\s+(${TRANSITION_PROPERTIES.join('|')})\\s+$`
    )
    if (transitionPropPattern.test(textBefore)) {
      return 'duration'
    }

    // After "transition" + property + number → easing context
    const transitionDurationPattern = new RegExp(
      `\\btransition\\s+(${TRANSITION_PROPERTIES.join('|')})\\s+\\d+\\s+$`
    )
    if (transitionDurationPattern.test(textBefore)) {
      return 'easing'
    }

    // After a property name (property followed by space) → values
    if (textBefore.match(/\b([\w-]+)\s+$/)) {
      const match = textBefore.match(/\b([\w-]+)\s+$/)
      if (match && PROPERTY_VALUES[match[1].toLowerCase()]) {
        return 'value'
      }
    }

    // After comma, colon, or component name → properties
    // BUT NOT after event colon (handled above)
    if (textBefore.match(/,\s*$/) ||
        textBefore.match(/^\s+$/) ||
        textBefore.match(/^[A-Z]\w*\s+$/) ||
        textBefore.match(/^\s+[A-Z]\w*\s+$/)) {
      return 'property'
    }

    // Definition colon (Name: =) → property context
    if (textBefore.match(/:\s*$/) && !eventPattern.test(textBefore)) {
      return 'property'
    }

    return 'none'
  }

  /**
   * Get completions based on context
   */
  getCompletions(request: AutocompleteRequest): AutocompleteResult {
    const { lineText, cursorColumn, fullSource, explicit } = request

    // Find word at cursor
    const textBefore = lineText.slice(0, cursorColumn)
    const wordMatch = textBefore.match(/[\w-]*$/)
    const typed = wordMatch ? wordMatch[0].toLowerCase() : ''
    const from = cursorColumn - (wordMatch ? wordMatch[0].length : 0)

    const context = this.detectContext(lineText, from)

    // State context
    if (context === 'state') {
      let completions = STATE_NAMES
      if (typed) {
        completions = completions.filter(c => c.label.startsWith(typed))
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Action context (after onclick:, onhover:, etc.)
    if (context === 'action') {
      let completions = ACTION_COMPLETIONS
      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Target context (after show, hide, toggle, etc.)
    if (context === 'target') {
      // Start with keyword targets
      let completions: Completion[] = [...TARGET_KEYWORDS]

      // Add element names from source
      if (fullSource) {
        const elementNames = extractElementNames(fullSource)
        const elementCompletions: Completion[] = elementNames.map(name => ({
          label: name,
          detail: 'element',
          type: 'component' as const
        }))
        completions = [...elementCompletions, ...completions]
      }

      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Duration context (after transition property)
    if (context === 'duration') {
      let completions = DURATION_COMPLETIONS
      if (typed) {
        completions = completions.filter(c =>
          c.label.startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Easing context (after transition duration)
    if (context === 'easing') {
      let completions = EASING_COMPLETIONS
      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed)
        )
      }
      return { completions, from, to: cursorColumn, context }
    }

    // Value context
    if (context === 'value') {
      const propMatch = lineText.slice(0, from).match(/\b([\w-]+)\s*$/)
      if (propMatch) {
        const propName = propMatch[1].toLowerCase()
        let values = PROPERTY_VALUES[propName] || []
        if (typed) {
          values = values.filter(v => v.label.toLowerCase().startsWith(typed))
        }
        if (values.length > 0) {
          return { completions: values, from, to: cursorColumn, context }
        }
      }
    }

    // Property context (includes keywords for explicit trigger)
    if (context === 'property' || explicit) {
      let completions = [...ALL_COMPLETIONS]

      if (typed) {
        completions = completions.filter(c =>
          c.label.toLowerCase().startsWith(typed) ||
          c.label.toLowerCase().includes(typed)
        )
        // Sort: prefix matches first
        completions.sort((a, b) => {
          const aStarts = a.label.toLowerCase().startsWith(typed)
          const bStarts = b.label.toLowerCase().startsWith(typed)
          if (aStarts && !bStarts) return -1
          if (!aStarts && bStarts) return 1
          return a.label.localeCompare(b.label)
        })
      } else {
        // Priority properties first
        completions.sort((a, b) => {
          const aPriority = PRIORITY_PROPERTIES.has(a.label)
          const bPriority = PRIORITY_PROPERTIES.has(b.label)
          if (aPriority && !bPriority) return -1
          if (!aPriority && bPriority) return 1
          return a.label.localeCompare(b.label)
        })
      }

      return { completions: completions.slice(0, 50), from, to: cursorColumn, context }
    }

    return { completions: [], from, to: cursorColumn, context: 'none' }
  }

  /**
   * Get completions for a specific property's values
   */
  getPropertyValues(propertyName: string): Completion[] {
    return PROPERTY_VALUES[propertyName.toLowerCase()] || []
  }

  /**
   * Get all state names
   */
  getStateNames(): Completion[] {
    return STATE_NAMES
  }

  /**
   * Get all properties
   */
  getProperties(): Completion[] {
    return MIRROR_PROPERTIES
  }

  /**
   * Get all keywords
   */
  getKeywords(): Completion[] {
    return MIRROR_KEYWORDS
  }

  /**
   * Get all completions
   */
  getAllCompletions(): Completion[] {
    return ALL_COMPLETIONS
  }

  /**
   * Get action completions (for after events)
   */
  getActionCompletions(): Completion[] {
    return ACTION_COMPLETIONS
  }

  /**
   * Get target completions (for after actions)
   */
  getTargetCompletions(source?: string): Completion[] {
    const completions = [...TARGET_KEYWORDS]
    if (source) {
      const elementNames = extractElementNames(source)
      const elementCompletions: Completion[] = elementNames.map(name => ({
        label: name,
        detail: 'element',
        type: 'component' as const
      }))
      return [...elementCompletions, ...completions]
    }
    return completions
  }

  /**
   * Get duration completions (for transitions)
   */
  getDurationCompletions(): Completion[] {
    return DURATION_COMPLETIONS
  }

  /**
   * Get easing completions (for transitions)
   */
  getEasingCompletions(): Completion[] {
    return EASING_COMPLETIONS
  }
}

export function createAutocompleteEngine(): AutocompleteEngine {
  return new AutocompleteEngine()
}

let globalEngine: AutocompleteEngine | null = null

export function getAutocompleteEngine(): AutocompleteEngine {
  if (!globalEngine) globalEngine = createAutocompleteEngine()
  return globalEngine
}

// Re-export CodeMirror integration
export { mirrorCompletions, createSlotCompletions } from './codemirror'
