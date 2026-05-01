/**
 * Validation Configuration
 *
 * Static configuration objects for the validator.
 * These define known properties, layout conflicts, required properties, and ranges.
 */

/**
 * Known extra properties valid in state blocks (style overrides)
 * Consolidated from multiple locations to ensure consistency
 */
export const KNOWN_STATE_STYLE_EXTRAS = new Set([
  'bg',
  'col',
  'color',
  'opacity',
  'opa',
  'o',
  'scale',
  'bor',
  'border',
  'boc',
  'rad',
  'radius',
  'pad',
  'padding',
  'margin',
  'w',
  'h',
  'fs',
  'weight',
])

/**
 * Known actions that aren't (yet) registered in DSL.actions but are
 * documented in the tutorial / used by built-in templates. Treat these as
 * valid to avoid false-positive E300 errors. Long-term these should be
 * lifted into compiler/schema/dsl.ts; this set is the pragmatic bridge.
 */
export const KNOWN_NON_SCHEMA_ACTIONS = new Set([
  // Feedback / UI
  'toast',
  // Navigation
  'back',
  'forward',
  'openUrl',
  // Form / input control
  'clear',
  'setError',
  'clearError',
  // List / collection mutation
  'add',
  'remove',
  // List-navigation helpers (Select, Dropdown, …)
  'highlightNext',
  'highlightPrev',
  'selectHighlighted',
  // Custom-state cycling helpers
  'exclusive',
])

/**
 * Known non-schema properties (HTML attributes, icon props, hover states, animation)
 */
export const KNOWN_NON_SCHEMA_PROPERTIES = new Set([
  'content',
  'href',
  'src',
  'placeholder',
  'value',
  'type',
  'name',
  'id',
  'icon',
  'icon-size',
  'is',
  'icon-color',
  'ic',
  'icon-weight',
  'iw',
  'fill',
  'animation',
  'anim',
  'hover-bg',
  'hover-col',
  'hover-opacity',
  'hover-opa',
  'hover-scale',
  'hover-bor',
  'hover-border',
  'hover-boc',
  'hover-border-color',
  'hover-rad',
  'hover-radius',
  // Internal markers produced by the parser
  'propset', // Property-set token reference (Frame $cardstyle)
  // Input
  'mask', // Input mask pattern
  'bind', // Two-way data binding
  'checked', // Checkbox/Switch initial state
  // Zag DatePicker props (and shared by other Zag primitives)
  'defaultValue',
  'selectionMode',
  'fixedWeeks',
  'startOfWeek',
  'closeOnSelect',
  'positioning',
  'readOnly',
  'min',
  'max',
  'locale',
  'disabled',
  // Component-template props (Tabs, Dialog, Select, …)
  'open',
  'show',
  'badge',
  // Chart properties (Line, Bar, Pie, Donut, Area)
  'colors',
  'x',
  'y',
  'where',
  // Chart slot inline shortcuts
  'title',
  'legend',
  'axes',
])

/**
 * Layout conflict pairs - these should not be used together
 */
export const LAYOUT_CONFLICTS: [string[], string][] = [
  // Direction conflicts
  [['hor', 'horizontal', 'ver', 'vertical'], 'Cannot use both horizontal and vertical layout'],
  // Alignment conflicts
  [['center', 'cen', 'spread'], 'Cannot use both center and spread'],
  // Grid vs Flex conflicts
  [['grid', 'hor', 'horizontal'], 'Cannot combine grid with horizontal flex'],
  [['grid', 'ver', 'vertical'], 'Cannot combine grid with vertical flex'],
  // 9-zone alignment conflicts (only one can be active)
  [
    [
      'tl',
      'top-left',
      'tc',
      'top-center',
      'tr',
      'top-right',
      'cl',
      'center-left',
      'cr',
      'center-right',
      'bl',
      'bottom-left',
      'bc',
      'bottom-center',
      'br',
      'bottom-right',
    ],
    'Cannot use multiple position alignments',
  ],
]

/**
 * Required properties per component type
 */
export const REQUIRED_PROPERTIES: Record<string, string[]> = {
  image: ['src'],
  img: ['src'],
  link: ['href'],
  a: ['href'],
}

/**
 * Property value range definitions
 */
export interface PropertyRange {
  min?: number
  max?: number
  description: string
}

/**
 * Property value ranges for numeric validation
 */
export const PROPERTY_RANGES: Record<string, PropertyRange> = {
  opacity: { min: 0, max: 1, description: 'between 0 and 1' },
  opa: { min: 0, max: 1, description: 'between 0 and 1' },
  o: { min: 0, max: 1, description: 'between 0 and 1' },
  scale: { min: 0, description: 'greater than 0' },
  // Animation-related properties
  threshold: { min: 0, max: 1, description: 'between 0 and 1' },
  stagger: { min: 0, description: 'greater than or equal to 0' },
  // Scroll properties (any number allowed - can be negative for parallax)
  'scroll-y': { description: 'any number' },
  'scroll-x': { description: 'any number' },
}

/**
 * 9-zone alignment property names
 */
export const ZONE_ALIGNMENT_PROPS = [
  'tl',
  'top-left',
  'tc',
  'top-center',
  'tr',
  'top-right',
  'cl',
  'center-left',
  'center',
  'cen',
  'cr',
  'center-right',
  'bl',
  'bottom-left',
  'bc',
  'bottom-center',
  'br',
  'bottom-right',
]
