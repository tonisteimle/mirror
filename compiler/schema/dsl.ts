/**
 * DSL Schema - Single Source of Truth
 *
 * Diese Datei definiert ALLE Elemente der Mirror DSL:
 * - Keywords (reserved words)
 * - Primitives (built-in components)
 * - Properties (styling, layout, etc.)
 * - Events (onclick, onhover, etc.)
 * - Actions (show, hide, toggle, etc.)
 * - States (hover, focus, selected, etc.)
 * - Keys (keyboard keys for onkeydown)
 * - Zag Primitives (behavior-driven components)
 *
 * Aus ihr werden generiert:
 * - Dokumentation (docs/generated/properties.md)
 * - Autocomplete (studio/autocomplete/generated.ts)
 * - Validierungs-Tests (src/__tests__/generated/schema.test.ts)
 * - CLAUDE.md DSL-Referenz
 *
 * NICHT MANUELL EDITIEREN: Die generierten Dateien.
 * NUR HIER EDITIEREN: Diese Schema-Datei.
 */

// Import Zag primitives
import {
  ZAG_PRIMITIVES,
  SLOT_MAPPINGS,
  isZagPrimitive,
  getZagPrimitive,
  getSlotMappings,
  getSlotDef,
  isZagSlot,
  type ZagPrimitiveDef,
  type ZagSlotDef,
} from './zag-primitives'

// Import Chart primitives
import {
  CHART_PRIMITIVES,
  isChartPrimitive,
  getChartPrimitive,
  DEFAULT_CHART_COLORS,
  type ChartPrimitiveDef,
} from './chart-primitives'

// Re-export Zag primitives
export {
  ZAG_PRIMITIVES,
  SLOT_MAPPINGS,
  isZagPrimitive,
  getZagPrimitive,
  getSlotMappings,
  getSlotDef,
  isZagSlot,
  type ZagPrimitiveDef,
  type ZagSlotDef,
}

// Re-export Chart primitives
export {
  CHART_PRIMITIVES,
  isChartPrimitive,
  getChartPrimitive,
  DEFAULT_CHART_COLORS,
  type ChartPrimitiveDef,
}

// ============================================================================
// Types
// ============================================================================

export interface CSSOutput {
  property: string
  value: string
}

export interface PropertyValue {
  /** Beschreibung für Docs */
  description: string
  /** CSS-Output */
  css: CSSOutput[]
  /** Beispiel für Docs */
  example?: string
}

export interface NumericValue {
  description: string
  /** Funktion die CSS generiert */
  css: (n: number) => CSSOutput[]
  /** Unit für Docs */
  unit?: string
  example?: string
}

export interface PropertyDef {
  /** Vollständiger Name */
  name: string
  /** Kurzformen */
  aliases: string[]
  /** Kategorie für Docs */
  category:
    | 'sizing'
    | 'layout'
    | 'spacing'
    | 'color'
    | 'border'
    | 'typography'
    | 'effect'
    | 'position'
    | 'transform'
    | 'content'
    | 'input'
    | 'icon'
    | 'animation'
    | 'state-variant'
  /** Beschreibung */
  description: string
  /** Erlaubte Keyword-Werte */
  keywords?: Record<string, PropertyValue>
  /** Akzeptiert Zahlen? */
  numeric?: NumericValue
  /** Akzeptiert Farben? */
  color?: {
    description: string
    css: (color: string) => CSSOutput[]
  }
  /** Akzeptiert Tokens? */
  token?: boolean
  /** Akzeptiert Richtungen? (pad left 8, margin x 16) */
  directional?: {
    directions: string[]
    css: (dir: string, val: string) => CSSOutput[]
  }
}

export interface PrimitiveDef {
  /** HTML tag */
  html: string
  /** Aliases for this primitive */
  aliases?: string[]
  /** Description */
  description: string
}

export interface EventDef {
  /** DOM event name */
  dom: string
  /** Description */
  description: string
  /** Accepts key modifier? (for onkeydown) */
  acceptsKey?: boolean
  /** Built-in key for keyboard shorthand events (onkeyenter, onkeyescape, etc.) */
  key?: string
}

export interface ActionDef {
  /** Description */
  description: string
  /** Possible targets */
  targets?: string[]
}

export interface StateDef {
  /** Description */
  description: string
  /** Is this a system state (CSS pseudo-class)? */
  system?: boolean
}

export interface SizeStateDef {
  /** Description */
  description: string
  /** Default minimum width in px (element must be >= this) */
  defaultMin?: number
  /** Default maximum width in px (element must be <= this) */
  defaultMax?: number
}

// ============================================================================
// DSL Schema Definition
// ============================================================================

export const DSL = {
  // ---------------------------------------------------------------------------
  // Reserved Keywords (Parser needs these)
  // ---------------------------------------------------------------------------
  keywords: {
    reserved: [
      'as',
      'canvas',
      'extends',
      'named',
      'each',
      'in',
      'if',
      'else',
      'then',
      'where',
      'and',
      'or',
      'not',
      'data',
      'keys',
      'selection',
      'bind', // Bind active exclusive() child content to variable
      'route', // @deprecated - use navigate() or Tab/NavItem without children instead
      'with',
      'by',
      'asc',
      'desc',
      'grouped',
      'use', // Import components: use components
    ] as const,
  },

  // ---------------------------------------------------------------------------
  // Primitives (Parser needs these)
  // ---------------------------------------------------------------------------
  primitives: {
    // Layout primitives
    Frame: {
      html: 'div',
      aliases: ['Box'],
      description: 'Container with vertical layout (default)',
    },
    Text: { html: 'span', description: 'Text element' },

    // Form elements (basic HTML - complex forms use Zag components)
    Button: { html: 'button', description: 'Clickable button' },
    Input: { html: 'input', description: 'Text input field' },
    Textarea: { html: 'textarea', description: 'Multi-line text input' },
    Label: { html: 'label', description: 'Form label' },
    // Note: Select, Checkbox, Radio are now Zag components with better UX

    // Media
    Image: { html: 'img', aliases: ['Img'], description: 'Image element' },
    Icon: { html: 'span', description: 'Icon element' },
    Link: { html: 'a', description: 'Anchor link' },

    // Structural
    Slot: { html: 'div', description: 'Slot placeholder for composition' },
    Divider: { html: 'hr', description: 'Horizontal divider line' },
    Spacer: { html: 'div', description: 'Flexible spacer element' },

    // Semantic HTML elements
    Header: { html: 'header', description: 'Page or section header' },
    Nav: { html: 'nav', description: 'Navigation section' },
    Main: { html: 'main', description: 'Main content area' },
    Section: { html: 'section', description: 'Generic section' },
    Article: { html: 'article', description: 'Self-contained article' },
    Aside: { html: 'aside', description: 'Sidebar content' },
    Footer: { html: 'footer', description: 'Page or section footer' },

    // Headings
    H1: { html: 'h1', description: 'Heading level 1' },
    H2: { html: 'h2', description: 'Heading level 2' },
    H3: { html: 'h3', description: 'Heading level 3' },
    H4: { html: 'h4', description: 'Heading level 4' },
    H5: { html: 'h5', description: 'Heading level 5' },
    H6: { html: 'h6', description: 'Heading level 6' },

    // Table primitives (now standard components, not compound)
    Table: { html: 'div', description: 'Table container' },
    TableHeader: { html: 'div', description: 'Table header row' },
    TableRow: { html: 'div', description: 'Table row' },
    TableFooter: { html: 'div', description: 'Table footer' },
    TableCell: { html: 'div', description: 'Table cell' },
    TableHeaderCell: { html: 'div', description: 'Table header cell' },
  } as Record<string, PrimitiveDef>,

  // ---------------------------------------------------------------------------
  // Events (Runtime needs these)
  // ---------------------------------------------------------------------------
  events: {
    onclick: { dom: 'click', description: 'Click event' },
    onhover: { dom: 'mouseenter', description: 'Mouse enter event' },
    onfocus: { dom: 'focus', description: 'Focus event' },
    onblur: { dom: 'blur', description: 'Blur event' },
    onchange: { dom: 'change', description: 'Change event' },
    oninput: { dom: 'input', description: 'Input event' },
    onkeydown: { dom: 'keydown', description: 'Keydown event', acceptsKey: true },
    onkeyup: { dom: 'keyup', description: 'Keyup event', acceptsKey: true },
    'onclick-outside': { dom: 'click-outside', description: 'Click outside element' },
    onload: { dom: 'load', description: 'Load event' },
    onviewenter: { dom: 'enter', description: 'Viewport enter (IntersectionObserver)' },
    onviewexit: { dom: 'exit', description: 'Viewport exit (IntersectionObserver)' },
    // Short keyboard event (Enter key) - most common use case
    onenter: { dom: 'keydown', key: 'enter', description: 'Enter key pressed' },
    // Keyboard shorthand events (expanded to onkeydown + key)
    onkeyenter: { dom: 'keydown', key: 'enter', description: 'Enter key shorthand' },
    onkeyescape: { dom: 'keydown', key: 'escape', description: 'Escape key shorthand' },
    onkeyspace: { dom: 'keydown', key: 'space', description: 'Space key shorthand' },
    // Short aliases for keyboard events (used in tutorials)
    onescape: { dom: 'keydown', key: 'escape', description: 'Escape key (alias for onkeyescape)' },
    onspace: { dom: 'keydown', key: 'space', description: 'Space key (alias for onkeyspace)' },
  } as Record<string, EventDef>,

  // ---------------------------------------------------------------------------
  // Actions (Runtime needs these)
  // ---------------------------------------------------------------------------
  actions: {
    show: { description: 'Show element' },
    hide: { description: 'Hide element' },
    toggle: { description: 'Toggle visibility' },
    open: { description: 'Open (modal, dropdown)' },
    close: { description: 'Close' },
    select: { description: 'Select item' },
    deselect: { description: 'Deselect item' },
    highlight: { description: 'Highlight item', targets: ['next', 'prev', 'first', 'last'] },
    activate: { description: 'Activate element' },
    deactivate: { description: 'Deactivate element' },
    page: { description: 'Navigate to page' },
    call: { description: 'Call function' },
    assign: { description: 'Assign value' },
    focus: { description: 'Focus element' },
    blur: { description: 'Blur element' },
    submit: { description: 'Submit form' },
    reset: { description: 'Reset token to initial value' },
    navigate: { description: 'Navigate to route' },
    // Overlay & Positioning actions
    showAt: { description: 'Show element at position relative to trigger' },
    showBelow: { description: 'Show element below trigger' },
    showAbove: { description: 'Show element above trigger' },
    showLeft: { description: 'Show element to left of trigger' },
    showRight: { description: 'Show element to right of trigger' },
    showModal: { description: 'Show element as centered modal' },
    dismiss: { description: 'Dismiss/close overlay element' },
    // Scroll actions
    scrollTo: { description: 'Scroll element into view' },
    scrollBy: { description: 'Scroll container by offset' },
    scrollToTop: { description: 'Scroll to top of element or page' },
    scrollToBottom: { description: 'Scroll to bottom of element or page' },
    // Value & Counter actions
    get: { description: 'Get token value' },
    set: { description: 'Set token to value' },
    increment: { description: 'Increment numeric token' },
    decrement: { description: 'Decrement numeric token' },
    // Clipboard actions
    copy: { description: 'Copy text to clipboard' },
    // CRUD actions
    create: {
      description: 'Create new entry and set as current',
      params: ['collection', 'initialValues?'],
    },
    save: { description: 'Save current changes to collection' },
    revert: { description: 'Discard pending changes' },
    delete: { description: 'Delete entry from collection', params: ['entry?', 'confirm?'] },
    add: { description: 'Append entry to collection', params: ['collection', 'fields'] },
    remove: { description: 'Remove entry from collection', params: ['entry'] },
    // Feedback actions
    toast: {
      description: 'Show toast notification',
      params: ['message', 'level?', 'position?'],
    },
    // Navigation actions (browser history + external)
    back: { description: 'Go back in browser history' },
    forward: { description: 'Go forward in browser history' },
    openUrl: { description: 'Open external URL', params: ['url'] },
    // Input control actions
    clear: { description: 'Clear input value', params: ['target?'] },
    setError: { description: 'Set error message on input', params: ['target', 'message'] },
    clearError: { description: 'Clear error message on input', params: ['target'] },
    // List-navigation helpers (Select / Dropdown / Combobox)
    highlightNext: { description: 'Highlight next item in list', params: ['list'] },
    highlightPrev: { description: 'Highlight previous item in list', params: ['list'] },
    selectHighlighted: { description: 'Select currently highlighted item', params: ['list'] },
    // State-cycling modifier (parallel to toggle)
    exclusive: { description: 'Cycle through exclusive states (only one active in group)' },
  } as Record<string, ActionDef>,

  // ---------------------------------------------------------------------------
  // States (Runtime needs these)
  // ---------------------------------------------------------------------------
  states: {
    // System states (CSS pseudo-classes)
    hover: { description: 'Mouse hover state', system: true },
    focus: { description: 'Focus state', system: true },
    active: { description: 'Active/pressed state', system: true },
    disabled: { description: 'Disabled state', system: true },

    // Custom states (data-state attribute)
    selected: { description: 'Selected state' },
    highlighted: { description: 'Highlighted state' },
    expanded: { description: 'Expanded state' },
    collapsed: { description: 'Collapsed state' },
    on: { description: 'On state (toggle)' },
    off: { description: 'Off state (toggle)' },
    open: { description: 'Open state' },
    closed: { description: 'Closed state' },
    filled: { description: 'Filled state (input has value)' },
    valid: { description: 'Valid state' },
    invalid: { description: 'Invalid state' },
    loading: { description: 'Loading state' },
    error: { description: 'Error state' },
  } as Record<string, StateDef>,

  // ---------------------------------------------------------------------------
  // Size States (CSS Container Queries)
  // ---------------------------------------------------------------------------
  /**
   * Size-based states using CSS Container Queries.
   * These respond to the element's own width, not the viewport.
   * Custom size states can be defined via tokens: tiny.max: 200
   */
  sizeStates: {
    compact: { description: 'Element width < 400px', defaultMax: 400 },
    regular: { description: 'Element width 400-800px', defaultMin: 400, defaultMax: 800 },
    wide: { description: 'Element width > 800px', defaultMin: 800 },
  } as Record<string, SizeStateDef>,

  // ---------------------------------------------------------------------------
  // Keyboard Keys (for onkeydown)
  // ---------------------------------------------------------------------------
  keys: [
    'escape',
    'enter',
    'space',
    'tab',
    'backspace',
    'delete',
    'arrow-up',
    'arrow-down',
    'arrow-left',
    'arrow-right',
    'home',
    'end',
  ] as const,

  // ---------------------------------------------------------------------------
  // State Block Syntax
  // ---------------------------------------------------------------------------
  // State blocks define visual states with optional triggers and animations.
  //
  // DEFINING STATES:
  //   selected:                            // state without trigger
  //     bg #2271C1
  //
  // INSTANCE WITH STATE:
  //   Btn "Normal"                         // starts in default state
  //   Btn "Active" selected                // starts in selected state
  //
  // SYNTAX WITH TRIGGER:
  //   state [modifier] [trigger] [animation]:
  //     properties
  //     [enter: animation]
  //     [exit: animation]
  //
  // EXAMPLES:
  //   selected onclick:                    // simple trigger
  //   selected exclusive onclick:          // with modifier (radio)
  //   on toggle onclick:                   // toggle behavior
  //   selected onclick: bounce             // with preset animation
  //   selected onclick 0.2s:               // with auto-transition
  //   selected onclick 0.3s ease-out:      // with duration + easing
  //   visible when Menu open 0.2s:         // when dependency + animation
  //
  // ENTER/EXIT:
  //   open onclick: scale-in               // enter = scale-in (implicit)
  //     exit: fade-out                     // exit = fade-out (explicit)
  //     visible
  //
  stateModifiers: {
    exclusive: { description: 'Only one element in group can have this state' },
    toggle: { description: 'Same trigger toggles state on/off' },
    initial: { description: 'Mark as initial state' },
  } as Record<string, { description: string }>,

  // ---------------------------------------------------------------------------
  // Animation Presets (for state transitions)
  // ---------------------------------------------------------------------------
  animationPresets: [
    'fade-in',
    'fade-out',
    'slide-in',
    'slide-out',
    'slide-up',
    'slide-down',
    'slide-left',
    'slide-right',
    'scale-in',
    'scale-out',
    'bounce',
    'pulse',
    'shake',
    'spin',
    'reveal-up',
    'reveal-scale',
    'reveal-fade',
  ] as const,

  // ---------------------------------------------------------------------------
  // Duration Presets (for transitions)
  // ---------------------------------------------------------------------------
  durations: [
    { value: '100', label: '100ms', description: 'fast' },
    { value: '150', label: '150ms', description: 'quick' },
    { value: '200', label: '200ms', description: 'normal' },
    { value: '300', label: '300ms', description: 'smooth' },
    { value: '500', label: '500ms', description: 'slow' },
  ] as const,

  // ---------------------------------------------------------------------------
  // Easing Functions
  // ---------------------------------------------------------------------------
  easingFunctions: [
    { value: 'ease', description: 'default easing' },
    { value: 'ease-in', description: 'slow start' },
    { value: 'ease-out', description: 'slow end' },
    { value: 'ease-in-out', description: 'slow start and end' },
    { value: 'linear', description: 'constant speed' },
    { value: 'bounce', description: 'bounce effect' },
  ] as const,

  // ---------------------------------------------------------------------------
  // Zag Primitives (behavior-driven components)
  // ---------------------------------------------------------------------------
  zagPrimitives: ZAG_PRIMITIVES,
}

// Property schema is now in `./property-schema` to keep this file under 1k LOC.
// Re-exported here so existing `import { SCHEMA } from '.../dsl'` keeps working.
import { SCHEMA } from './property-schema'
export { SCHEMA }

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a word is a reserved keyword
 */
export function isReservedKeyword(word: string): boolean {
  return (DSL.keywords.reserved as readonly string[]).includes(word)
}

/**
 * Get all reserved keywords
 */
export function getReservedKeywords(): readonly string[] {
  return DSL.keywords.reserved
}

/**
 * Check if a name is a primitive
 */
export function isPrimitive(name: string): boolean {
  // Check exact match
  if (DSL.primitives[name]) return true

  // Check case-insensitive
  const upperName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  if (DSL.primitives[upperName]) return true

  // Check aliases
  for (const prim of Object.values(DSL.primitives)) {
    if (prim.aliases?.some(a => a.toLowerCase() === name.toLowerCase())) {
      return true
    }
  }

  // Check chart primitives (Line, Bar, Pie, etc.)
  if (isChartPrimitive(name)) return true

  return false
}

/**
 * Get primitive definition
 */
export function getPrimitiveDef(name: string): PrimitiveDef | undefined {
  // Normalize to PascalCase
  const normalizedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase()
  return DSL.primitives[normalizedName]
}

/**
 * Find a property by name or alias
 */
export function findProperty(nameOrAlias: string): PropertyDef | undefined {
  // Direct match
  if (SCHEMA[nameOrAlias]) {
    return SCHEMA[nameOrAlias]
  }

  // Search by alias
  for (const prop of Object.values(SCHEMA)) {
    if (prop.aliases.includes(nameOrAlias)) {
      return prop
    }
  }

  return undefined
}

/**
 * Get all properties by category
 */
export function getPropertiesByCategory(category: PropertyDef['category']): PropertyDef[] {
  return Object.values(SCHEMA).filter(p => p.category === category)
}

/**
 * Get keyword values for autocomplete
 */
export function getKeywordsForProperty(nameOrAlias: string): string[] {
  const prop = findProperty(nameOrAlias)
  if (!prop?.keywords) return []

  return Object.keys(prop.keywords).filter(k => k !== '_standalone')
}

/**
 * Get all property names and aliases
 */
export function getAllPropertyNames(): string[] {
  const names = new Set<string>()

  for (const prop of Object.values(SCHEMA)) {
    names.add(prop.name)
    for (const alias of prop.aliases) {
      names.add(alias)
    }
  }

  return Array.from(names)
}

/**
 * Check whether `name` is a known device-size preset
 * (mobile / tablet / desktop). Sourced from the `device` property's
 * keywords map so that adding a preset there is sufficient — no
 * separate registration here.
 */
export function isDevicePreset(name: string): boolean {
  const dev = SCHEMA.device
  if (!dev?.keywords) return false
  return Object.prototype.hasOwnProperty.call(dev.keywords, name.toLowerCase())
}

/**
 * Resolve a device-preset name to its width/height (in pixels).
 * Reads the dimensions out of the keyword's `css` array — the existing
 * structure already encodes the values, so no duplication.
 *
 * Returns undefined if `name` isn't a known preset, or if its css array
 * doesn't contain both width and height entries.
 */
export function getDevicePreset(name: string): { width: number; height: number } | undefined {
  const dev = SCHEMA.device
  if (!dev?.keywords) return undefined
  const kw = dev.keywords[name.toLowerCase()]
  if (!kw?.css) return undefined
  let width: number | undefined
  let height: number | undefined
  for (const entry of kw.css) {
    if (entry.property === 'width') width = parsePixelValue(entry.value)
    if (entry.property === 'height') height = parsePixelValue(entry.value)
  }
  if (width === undefined || height === undefined) return undefined
  return { width, height }
}

function parsePixelValue(v: string): number | undefined {
  const m = /^(\d+)px$/.exec(v.trim())
  if (!m) return undefined
  return Number(m[1])
}

/**
 * Get event definition
 */
export function getEvent(name: string): EventDef | undefined {
  return DSL.events[name.toLowerCase()]
}

/**
 * Get action definition
 */
export function getAction(name: string): ActionDef | undefined {
  return DSL.actions[name.toLowerCase()]
}

/**
 * Get state definition
 */
export function getState(name: string): StateDef | undefined {
  return DSL.states[name.toLowerCase()]
}

/**
 * Check if a key is valid for onkeydown
 */
export function isValidKey(key: string): boolean {
  return (DSL.keys as readonly string[]).includes(key.toLowerCase())
}

/**
 * Get all events
 */
export function getAllEvents(): string[] {
  return Object.keys(DSL.events)
}

/**
 * Get all actions
 */
export function getAllActions(): string[] {
  return Object.keys(DSL.actions)
}

/**
 * Get all states (system and custom)
 */
export function getAllStates(): string[] {
  return Object.keys(DSL.states)
}

/**
 * Get system states only
 */
export function getSystemStates(): string[] {
  return Object.entries(DSL.states)
    .filter(([_, def]) => def.system)
    .map(([name]) => name)
}

/**
 * Get custom states only
 */
export function getCustomStates(): string[] {
  return Object.entries(DSL.states)
    .filter(([_, def]) => !def.system)
    .map(([name]) => name)
}
