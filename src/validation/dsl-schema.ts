/**
 * DSL Schema - Single Source of Truth
 *
 * Extrahiert aus docs/reference.json
 * Definiert ALLE gültigen Properties, Events, Actions, etc.
 */

// =============================================================================
// Schema Types
// =============================================================================

export interface DSLSchema {
  properties: PropertySchema
  directions: Set<string>
  directionCombos: Set<string>
  events: Set<string>
  segmentEvents: Set<string>
  keyModifiers: Set<string>
  timingModifiers: Set<string>
  actions: ActionSchema
  targets: Set<string>
  animations: Set<string>
  positions: Set<string>
  keywords: Set<string>
  primitives: Set<string>
  valueConstraints: ValueConstraints
  borderStyles: Set<string>
}

export interface PropertySchema {
  layout: Set<string>
  alignment: Set<string>
  sizing: Set<string>
  spacing: Set<string>
  colors: Set<string>
  border: Set<string>
  typography: Set<string>
  visual: Set<string>
  scroll: Set<string>
  hover: Set<string>
  icon: Set<string>
  form: Set<string>
  segment: Set<string>
  image: Set<string>
  link: Set<string>
  data: Set<string>
}

export interface ActionSchema {
  visibility: Set<string>
  state: Set<string>
  selection: Set<string>
  navigation: Set<string>
  form: Set<string>
}

export interface ValueConstraints {
  opacity: { min: number; max: number }
  shadow: Set<string>
  cursor: Set<string>
  fit: Set<string>
  pattern: Set<string>
  align: Set<string>
  inputType: Set<string>
  linkTarget: Set<string>
}

// =============================================================================
// Schema Definition (from reference.json)
// =============================================================================

export const DSL_SCHEMA: DSLSchema = {
  // ---------------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------------
  properties: {
    // Layout
    layout: new Set([
      'horizontal', 'hor',
      'vertical', 'ver',
      'gap', 'g',
      'gap-col', 'gap-row',
      'between',
      'wrap',
      'grow', 'fill',
      'shrink',
      'stacked',
      'grid',
      'rows',  // for grid
    ]),

    // Alignment
    alignment: new Set([
      'horizontal-left', 'hor-l',
      'horizontal-center', 'hor-cen',
      'horizontal-right', 'hor-r',
      'vertical-top', 'ver-t',
      'vertical-center', 'ver-cen',
      'vertical-bottom', 'ver-b',
      'center', 'cen',
    ]),

    // Sizing
    sizing: new Set([
      'width', 'w',
      'height', 'h',
      'min-width', 'minw',
      'max-width', 'maxw',
      'min-height', 'minh',
      'max-height', 'maxh',
      'full',
    ]),

    // Spacing
    spacing: new Set([
      'padding', 'p', 'pad',
      'margin', 'm', 'mar',
    ]),

    // Colors
    colors: new Set([
      'background', 'bg',
      'color', 'c', 'col',
      'border-color', 'boc',
    ]),

    // Border
    border: new Set([
      'border', 'bor',
      'radius', 'rad',
    ]),

    // Typography
    typography: new Set([
      'size',
      'weight',
      'font',
      'line',
      'align',
      'italic',
      'underline',
      'uppercase',
      'lowercase',
      'truncate',
    ]),

    // Visual
    visual: new Set([
      'opacity', 'o', 'opa', 'op',
      'shadow',
      'cursor',
      'z',
      'hidden',
      'visible',
      'disabled',
      'rotate',
      'translate',
      'shortcut',
    ]),

    // Scroll
    scroll: new Set([
      'scroll',
      'scroll-ver', 'scroll-vertical',
      'scroll-hor', 'scroll-horizontal',
      'scroll-both',
      'snap',
      'clip',
    ]),

    // Hover
    hover: new Set([
      'hover-background', 'hover-bg',
      'hover-color', 'hover-col',
      'hover-border-color', 'hover-boc',
      'hover-border', 'hover-bor',
      'hover-radius', 'hover-rad',
      'hover-opacity', 'hover-opa',
      'hover-scale',
    ]),

    // Icon
    icon: new Set(['icon']),

    // Form inputs
    form: new Set([
      'type',
      'placeholder',
      'value',
      'min', 'max', 'step',
    ]),

    // Segment (masked input)
    segment: new Set([
      'segments',
      'length',
      'pattern',
      'mask',
    ]),

    // Image
    image: new Set([
      'src',
      'alt',
      'fit',
    ]),

    // Link
    link: new Set([
      'href',
      'target',
    ]),

    // Data binding
    data: new Set(['data']),
  },

  // ---------------------------------------------------------------------------
  // Directions (for padding, margin, border)
  // ---------------------------------------------------------------------------
  directions: new Set([
    'l', 'left',
    'r', 'right',
    't', 'top', 'u',  // u = up = top
    'b', 'bottom', 'd',  // d = down = bottom
  ]),

  directionCombos: new Set([
    'l-r', 'left-right',
    'u-d', 't-b', 'top-bottom',
    'lr', 'ud', 'tb',  // without hyphen
  ]),

  // ---------------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------------
  events: new Set([
    'onclick',
    'onclick-outside',
    'onclick-inside',
    'onhover',
    'onchange',
    'oninput',
    'onfocus',
    'onblur',
    'onkeydown',
    'onkeyup',
    'onload',
  ]),

  segmentEvents: new Set([
    'onfill',
    'oncomplete',
    'onempty',
  ]),

  // ---------------------------------------------------------------------------
  // Key Modifiers (for onkeydown/onkeyup)
  // ---------------------------------------------------------------------------
  keyModifiers: new Set([
    'escape',
    'enter',
    'tab',
    'space',
    'arrow-up',
    'arrow-down',
    'arrow-left',
    'arrow-right',
    'backspace',
    'delete',
    'home',
    'end',
  ]),

  // ---------------------------------------------------------------------------
  // Timing Modifiers
  // ---------------------------------------------------------------------------
  timingModifiers: new Set([
    'debounce',
    'delay',
  ]),

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  actions: {
    visibility: new Set([
      'show',
      'hide',
      'toggle',
      'open',
      'close',
    ]),

    state: new Set([
      'change',
      'toggle-state',
      'activate',
      'deactivate',
      'deactivate-siblings',
    ]),

    selection: new Set([
      'highlight',
      'select',
      'deselect',
      'clear-selection',
      'filter',
    ]),

    navigation: new Set([
      'page',
      'assign',
      'alert',
    ]),

    form: new Set([
      'focus',
      'validate',
      'reset',
    ]),
  },

  // ---------------------------------------------------------------------------
  // Action Targets
  // ---------------------------------------------------------------------------
  targets: new Set([
    'self',
    'next',
    'prev',
    'first',
    'last',
    'first-empty',
    'highlighted',
    'selected',
    'self-and-before',
    'all',
    'none',
  ]),

  // ---------------------------------------------------------------------------
  // Animations
  // ---------------------------------------------------------------------------
  animations: new Set([
    'fade',
    'scale',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'none',
    // Continuous (NOT fully implemented!)
    'spin',
    'pulse',
    'bounce',
  ]),

  // ---------------------------------------------------------------------------
  // Positions (for open action)
  // ---------------------------------------------------------------------------
  positions: new Set([
    'below',
    'above',
    'left',
    'right',
    'center',
  ]),

  // ---------------------------------------------------------------------------
  // Keywords
  // ---------------------------------------------------------------------------
  keywords: new Set([
    'from',
    'as',
    'named',
    'state',
    'events',
    'if',
    'then',
    'else',
    'each',
    'in',
    'where',
    'and',
    'or',
    'not',
    'to',
    'show',  // also animation block
    'hide',  // also animation block
    'animate',
  ]),

  // ---------------------------------------------------------------------------
  // Primitives (HTML elements)
  // ---------------------------------------------------------------------------
  primitives: new Set([
    'Input',
    'Textarea',
    'Image',
    'Link',
    'Button',
    'Segment',
    'Icon',
  ]),

  // ---------------------------------------------------------------------------
  // Border Styles
  // ---------------------------------------------------------------------------
  borderStyles: new Set([
    'solid',
    'dashed',
    'dotted',
  ]),

  // ---------------------------------------------------------------------------
  // Value Constraints
  // ---------------------------------------------------------------------------
  valueConstraints: {
    // Opacity: 0-1 (NOT 0-100!)
    opacity: { min: 0, max: 1 },

    // Shadow sizes
    shadow: new Set(['sm', 'md', 'lg', 'xl', 'xs', '2xl', '3xl', 'none']),

    // Cursor values (NO HYPHENS - lexer splits on hyphens!)
    cursor: new Set([
      'pointer',
      'default',
      'text',
      'move',
      'grab',
      'grabbing',
      'wait',
      'crosshair',
      // Note: 'not-allowed' does NOT work due to lexer!
    ]),

    // Image fit values
    fit: new Set(['cover', 'contain', 'fill', 'none', 'scale-down']),

    // Segment pattern values
    pattern: new Set(['digits', 'alpha', 'alphanumeric']),

    // Text align values
    align: new Set(['left', 'center', 'right', 'justify']),

    // Input type values
    inputType: new Set([
      'email',
      'password',
      'text',
      'number',
      'tel',
      'url',
      'search',
      'date',
      'time',
      'datetime-local',
    ]),

    // Link target values
    linkTarget: new Set(['_blank', '_self', '_parent', '_top']),
  },
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get all valid properties as a flat set
 */
export function getAllProperties(): Set<string> {
  const all = new Set<string>()
  for (const category of Object.values(DSL_SCHEMA.properties)) {
    for (const prop of category) {
      all.add(prop)
    }
  }
  return all
}

/**
 * Get all valid events (including segment events)
 */
export function getAllEvents(): Set<string> {
  return new Set([
    ...DSL_SCHEMA.events,
    ...DSL_SCHEMA.segmentEvents,
  ])
}

/**
 * Get all valid actions as a flat set
 */
export function getAllActions(): Set<string> {
  const all = new Set<string>()
  for (const category of Object.values(DSL_SCHEMA.actions)) {
    for (const action of category) {
      all.add(action)
    }
  }
  return all
}

/**
 * Check if a property is valid
 */
export function isValidProperty(name: string): boolean {
  return getAllProperties().has(name)
}

/**
 * Check if an event is valid
 */
export function isValidEvent(name: string): boolean {
  return getAllEvents().has(name)
}

/**
 * Check if an action is valid
 */
export function isValidAction(name: string): boolean {
  return getAllActions().has(name)
}

/**
 * Check if a target is valid
 */
export function isValidTarget(name: string): boolean {
  return DSL_SCHEMA.targets.has(name)
}

/**
 * Check if an animation is valid
 */
export function isValidAnimation(name: string): boolean {
  return DSL_SCHEMA.animations.has(name)
}

/**
 * Check if a position is valid
 */
export function isValidPosition(name: string): boolean {
  return DSL_SCHEMA.positions.has(name)
}

/**
 * Check if a direction is valid
 */
export function isValidDirection(name: string): boolean {
  return DSL_SCHEMA.directions.has(name) || DSL_SCHEMA.directionCombos.has(name)
}

/**
 * Check if a keyword is valid
 */
export function isValidKeyword(name: string): boolean {
  return DSL_SCHEMA.keywords.has(name)
}

/**
 * Check if a primitive is valid
 */
export function isValidPrimitive(name: string): boolean {
  return DSL_SCHEMA.primitives.has(name)
}

/**
 * Validate opacity value (must be 0-1)
 */
export function isValidOpacity(value: number): boolean {
  const { min, max } = DSL_SCHEMA.valueConstraints.opacity
  return value >= min && value <= max
}

/**
 * Get property category
 */
export function getPropertyCategory(name: string): string | null {
  for (const [category, props] of Object.entries(DSL_SCHEMA.properties)) {
    if (props.has(name)) {
      return category
    }
  }
  return null
}

/**
 * Get action category
 */
export function getActionCategory(name: string): string | null {
  for (const [category, actions] of Object.entries(DSL_SCHEMA.actions)) {
    if (actions.has(name)) {
      return category
    }
  }
  return null
}
