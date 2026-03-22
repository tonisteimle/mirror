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
  STATE_MAPPINGS,
  isZagPrimitive,
  getZagPrimitive,
  getSlotMappings,
  getSlotDef,
  isZagSlot,
  getStateSelector,
  type ZagPrimitiveDef,
  type ZagSlotDef,
} from './zag-primitives'

// Re-export Zag primitives
export {
  ZAG_PRIMITIVES,
  SLOT_MAPPINGS,
  STATE_MAPPINGS,
  isZagPrimitive,
  getZagPrimitive,
  getSlotMappings,
  getSlotDef,
  isZagSlot,
  getStateSelector,
  type ZagPrimitiveDef,
  type ZagSlotDef,
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
  category: 'sizing' | 'layout' | 'spacing' | 'color' | 'border' | 'typography' | 'effect' | 'position' | 'transform'
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

// ============================================================================
// DSL Schema Definition
// ============================================================================

export const DSL = {
  // ---------------------------------------------------------------------------
  // Reserved Keywords (Parser needs these)
  // ---------------------------------------------------------------------------
  keywords: {
    reserved: [
      'as', 'extends', 'named', 'each', 'in', 'if', 'else', 'then', 'where',
      'and', 'or', 'not', 'data', 'keys', 'selection', 'route', 'animation',
    ] as const,
  },

  // ---------------------------------------------------------------------------
  // Primitives (Parser needs these)
  // ---------------------------------------------------------------------------
  primitives: {
    // Layout primitives
    Box: { html: 'div', description: 'Generic container' },
    Frame: { html: 'div', aliases: ['Box'], description: 'Alias for Box' },
    Text: { html: 'span', description: 'Text element' },

    // Form elements
    Button: { html: 'button', description: 'Clickable button' },
    Input: { html: 'input', description: 'Text input field' },
    Textarea: { html: 'textarea', description: 'Multi-line text input' },
    Label: { html: 'label', description: 'Form label' },
    Select: { html: 'select', description: 'Dropdown select' },
    Option: { html: 'option', description: 'Select option' },
    Checkbox: { html: 'input', description: 'Checkbox input (type=checkbox)' },
    Radio: { html: 'input', description: 'Radio input (type=radio)' },

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
    onenter: { dom: 'enter', description: 'Viewport enter (IntersectionObserver)' },
    onexit: { dom: 'exit', description: 'Viewport exit (IntersectionObserver)' },
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
    highlight: { description: 'Highlight item', targets: ['next', 'prev', 'first', 'last'] },
    activate: { description: 'Activate element' },
    deactivate: { description: 'Deactivate element' },
    page: { description: 'Navigate to page' },
    call: { description: 'Call function' },
    assign: { description: 'Assign value' },
    focus: { description: 'Focus element' },
    blur: { description: 'Blur element' },
    submit: { description: 'Submit form' },
    reset: { description: 'Reset form' },
    navigate: { description: 'Navigate to route' },
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
  // Keyboard Keys (for onkeydown)
  // ---------------------------------------------------------------------------
  keys: [
    'escape', 'enter', 'space', 'tab', 'backspace', 'delete',
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'home', 'end',
  ] as const,

  // ---------------------------------------------------------------------------
  // Zag Primitives (behavior-driven components)
  // ---------------------------------------------------------------------------
  zagPrimitives: ZAG_PRIMITIVES,
}

// ============================================================================
// Properties Schema
// ============================================================================

export const SCHEMA: Record<string, PropertyDef> = {
  // ---------------------------------------------------------------------------
  // SIZING
  // ---------------------------------------------------------------------------

  width: {
    name: 'width',
    aliases: ['w'],
    category: 'sizing',
    description: 'Element width',

    keywords: {
      full: {
        description: 'Fill available space in flex container',
        css: [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-width', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ],
        example: 'Box w full',
      },
      hug: {
        description: 'Fit content (fit-content)',
        css: [{ property: 'width', value: 'fit-content' }],
        example: 'Box w hug',
      },
    },

    numeric: {
      description: 'Fixed width in pixels',
      unit: 'px',
      css: (n) => [{ property: 'width', value: `${n}px` }],
      example: 'Box w 200',
    },

    token: true,
  },

  height: {
    name: 'height',
    aliases: ['h'],
    category: 'sizing',
    description: 'Element height',

    keywords: {
      full: {
        description: 'Fill available space in flex container',
        css: [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-height', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ],
        example: 'Box h full',
      },
      hug: {
        description: 'Fit content (fit-content)',
        css: [{ property: 'height', value: 'fit-content' }],
        example: 'Box h hug',
      },
    },

    numeric: {
      description: 'Fixed height in pixels',
      unit: 'px',
      css: (n) => [{ property: 'height', value: `${n}px` }],
      example: 'Box h 200',
    },

    token: true,
  },

  size: {
    name: 'size',
    aliases: [],
    category: 'sizing',
    description: 'Width and height (square) or font-size for text',

    keywords: {
      full: {
        description: 'Fill available space',
        css: [
          { property: 'flex', value: '1 1 0%' },
          { property: 'min-width', value: '0' },
          { property: 'min-height', value: '0' },
          { property: 'align-self', value: 'stretch' },
        ],
        example: 'Box size full',
      },
      hug: {
        description: 'Fit content',
        css: [
          { property: 'width', value: 'fit-content' },
          { property: 'height', value: 'fit-content' },
        ],
        example: 'Box size hug',
      },
    },

    numeric: {
      description: 'Square size in pixels (or font-size for text)',
      unit: 'px',
      css: (n) => [
        { property: 'width', value: `${n}px` },
        { property: 'height', value: `${n}px` },
      ],
      example: 'Box size 100',
    },

    token: true,
  },

  'min-width': {
    name: 'min-width',
    aliases: ['minw'],
    category: 'sizing',
    description: 'Minimum width',

    numeric: {
      description: 'Minimum width in pixels',
      unit: 'px',
      css: (n) => [{ property: 'min-width', value: `${n}px` }],
      example: 'Box minw 100',
    },

    token: true,
  },

  'max-width': {
    name: 'max-width',
    aliases: ['maxw'],
    category: 'sizing',
    description: 'Maximum width',

    numeric: {
      description: 'Maximum width in pixels',
      unit: 'px',
      css: (n) => [{ property: 'max-width', value: `${n}px` }],
      example: 'Box maxw 500',
    },

    token: true,
  },

  'min-height': {
    name: 'min-height',
    aliases: ['minh'],
    category: 'sizing',
    description: 'Minimum height',

    numeric: {
      description: 'Minimum height in pixels',
      unit: 'px',
      css: (n) => [{ property: 'min-height', value: `${n}px` }],
      example: 'Box minh 50',
    },

    token: true,
  },

  'max-height': {
    name: 'max-height',
    aliases: ['maxh'],
    category: 'sizing',
    description: 'Maximum height',

    numeric: {
      description: 'Maximum height in pixels',
      unit: 'px',
      css: (n) => [{ property: 'max-height', value: `${n}px` }],
      example: 'Box maxh 300',
    },

    token: true,
  },

  aspect: {
    name: 'aspect',
    aliases: [],
    category: 'sizing',
    description: 'Aspect ratio',

    keywords: {
      square: {
        description: '1:1 aspect ratio',
        css: [{ property: 'aspect-ratio', value: '1' }],
        example: 'Box aspect square',
      },
      video: {
        description: '16:9 aspect ratio',
        css: [{ property: 'aspect-ratio', value: '16/9' }],
        example: 'Box aspect video',
      },
    },

    numeric: {
      description: 'Custom aspect ratio (e.g., 16/9)',
      css: (n) => [{ property: 'aspect-ratio', value: String(n) }],
      example: 'Box aspect 4/3',
    },
  },

  // ---------------------------------------------------------------------------
  // LAYOUT
  // ---------------------------------------------------------------------------

  horizontal: {
    name: 'horizontal',
    aliases: ['hor'],
    category: 'layout',
    description: 'Horizontal layout (flex-direction: row)',

    keywords: {
      _standalone: {
        description: 'Children arranged horizontally',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'row' },
        ],
        example: 'Box hor',
      },
    },
  },

  vertical: {
    name: 'vertical',
    aliases: ['ver'],
    category: 'layout',
    description: 'Vertical layout (flex-direction: column)',

    keywords: {
      _standalone: {
        description: 'Children arranged vertically (default for frame)',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
        ],
        example: 'Box ver',
      },
    },
  },

  gap: {
    name: 'gap',
    aliases: ['g'],
    category: 'layout',
    description: 'Gap between children',

    numeric: {
      description: 'Gap in pixels',
      unit: 'px',
      css: (n) => [{ property: 'gap', value: `${n}px` }],
      example: 'Box gap 16',
    },

    token: true,
  },

  center: {
    name: 'center',
    aliases: ['cen'],
    category: 'layout',
    description: 'Center children horizontally and vertically',

    keywords: {
      _standalone: {
        description: 'Center children on both axes',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box center',
      },
    },
  },

  spread: {
    name: 'spread',
    aliases: [],
    category: 'layout',
    description: 'Spread children with space between',

    keywords: {
      _standalone: {
        description: 'Space-between distribution',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'justify-content', value: 'space-between' },
        ],
        example: 'Box spread',
      },
    },
  },

  wrap: {
    name: 'wrap',
    aliases: [],
    category: 'layout',
    description: 'Allow flex items to wrap',

    keywords: {
      _standalone: {
        description: 'Enable flex wrapping',
        css: [{ property: 'flex-wrap', value: 'wrap' }],
        example: 'Box wrap',
      },
    },
  },

  pos: {
    name: 'pos',
    aliases: ['positioned'],
    category: 'layout',
    description: 'Positioned container - children are automatically absolute and can use x/y',

    keywords: {
      _standalone: {
        description: 'Children can be positioned with x/y coordinates',
        css: [{ property: 'position', value: 'relative' }],
        example: 'Box pos w 400 h 300',
      },
    },
  },

  stacked: {
    name: 'stacked',
    aliases: [],
    category: 'layout',
    description: 'Stack children on top of each other (z-layers for overlays, badges)',

    keywords: {
      _standalone: {
        description: 'Children stacked on z-axis',
        css: [{ property: 'position', value: 'relative' }],
        example: 'Box stacked size 48',
      },
    },
  },

  grid: {
    name: 'grid',
    aliases: [],
    category: 'layout',
    description: 'CSS Grid layout',

    keywords: {
      auto: {
        description: 'Auto-fill grid with minmax',
        css: [
          { property: 'display', value: 'grid' },
          { property: 'grid-template-columns', value: 'repeat(auto-fill, minmax(250px, 1fr))' },
        ],
        example: 'Box grid auto 250',
      },
    },

    numeric: {
      description: 'Number of equal columns',
      css: (n) => [
        { property: 'display', value: 'grid' },
        { property: 'grid-template-columns', value: `repeat(${n}, 1fr)` },
      ],
      example: 'Box grid 3',
    },
  },

  grow: {
    name: 'grow',
    aliases: [],
    category: 'layout',
    description: 'Flex grow',

    keywords: {
      _standalone: {
        description: 'Allow element to grow',
        css: [{ property: 'flex-grow', value: '1' }],
        example: 'Box grow',
      },
    },
  },

  shrink: {
    name: 'shrink',
    aliases: [],
    category: 'layout',
    description: 'Flex shrink',

    keywords: {
      _standalone: {
        description: 'Allow element to shrink',
        css: [{ property: 'flex-shrink', value: '1' }],
        example: 'Box shrink',
      },
    },
  },

  align: {
    name: 'align',
    aliases: [],
    category: 'layout',
    description: 'Alignment of children',

    keywords: {
      top: {
        description: 'Align to top',
        css: [{ property: 'justify-content', value: 'flex-start' }],
      },
      bottom: {
        description: 'Align to bottom',
        css: [{ property: 'justify-content', value: 'flex-end' }],
      },
      left: {
        description: 'Align to left',
        css: [{ property: 'align-items', value: 'flex-start' }],
      },
      right: {
        description: 'Align to right',
        css: [{ property: 'align-items', value: 'flex-end' }],
      },
      center: {
        description: 'Align to center',
        css: [
          { property: 'justify-content', value: 'center' },
          { property: 'align-items', value: 'center' },
        ],
      },
    },
  },

  // Alignment booleans
  left: {
    name: 'left',
    aliases: [],
    category: 'layout',
    description: 'Align children to left',

    keywords: {
      _standalone: {
        description: 'Left alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'flex-start' },
        ],
        example: 'Box left',
      },
    },
  },

  right: {
    name: 'right',
    aliases: [],
    category: 'layout',
    description: 'Align children to right',

    keywords: {
      _standalone: {
        description: 'Right alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'flex-end' },
        ],
        example: 'Box right',
      },
    },
  },

  top: {
    name: 'top',
    aliases: [],
    category: 'layout',
    description: 'Align children to top',

    keywords: {
      _standalone: {
        description: 'Top alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-start' },
        ],
        example: 'Box top',
      },
    },
  },

  bottom: {
    name: 'bottom',
    aliases: [],
    category: 'layout',
    description: 'Align children to bottom',

    keywords: {
      _standalone: {
        description: 'Bottom alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'flex-end' },
        ],
        example: 'Box bottom',
      },
    },
  },

  'hor-center': {
    name: 'hor-center',
    aliases: [],
    category: 'layout',
    description: 'Center children horizontally',

    keywords: {
      _standalone: {
        description: 'Horizontal center alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'align-items', value: 'center' },
        ],
        example: 'Box hor-center',
      },
    },
  },

  'ver-center': {
    name: 'ver-center',
    aliases: [],
    category: 'layout',
    description: 'Center children vertically',

    keywords: {
      _standalone: {
        description: 'Vertical center alignment',
        css: [
          { property: 'display', value: 'flex' },
          { property: 'flex-direction', value: 'column' },
          { property: 'justify-content', value: 'center' },
        ],
        example: 'Box ver-center',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // SPACING
  // ---------------------------------------------------------------------------

  padding: {
    name: 'padding',
    aliases: ['pad', 'p'],
    category: 'spacing',
    description: 'Inner spacing',

    numeric: {
      description: 'Padding in pixels (all sides)',
      unit: 'px',
      css: (n) => [{ property: 'padding', value: `${n}px` }],
      example: 'Box pad 16',
    },

    directional: {
      directions: ['left', 'right', 'top', 'bottom', 'x', 'y', 'l', 'r', 't', 'b'],
      css: (dir, val) => [{ property: `padding-${dir}`, value: val }],
    },

    token: true,
  },

  margin: {
    name: 'margin',
    aliases: ['m'],
    category: 'spacing',
    description: 'Outer spacing',

    numeric: {
      description: 'Margin in pixels (all sides)',
      unit: 'px',
      css: (n) => [{ property: 'margin', value: `${n}px` }],
      example: 'Box margin 16',
    },

    directional: {
      directions: ['left', 'right', 'top', 'bottom', 'x', 'y', 'l', 'r', 't', 'b'],
      css: (dir, val) => [{ property: `margin-${dir}`, value: val }],
    },

    token: true,
  },

  // ---------------------------------------------------------------------------
  // COLOR
  // ---------------------------------------------------------------------------

  background: {
    name: 'background',
    aliases: ['bg'],
    category: 'color',
    description: 'Background color',

    color: {
      description: 'Hex color or token',
      css: (c) => [{ property: 'background', value: c }],
    },

    token: true,
  },

  color: {
    name: 'color',
    aliases: ['col', 'c'],
    category: 'color',
    description: 'Text color',

    color: {
      description: 'Hex color or token',
      css: (c) => [{ property: 'color', value: c }],
    },

    token: true,
  },

  'border-color': {
    name: 'border-color',
    aliases: ['boc'],
    category: 'color',
    description: 'Border color',

    color: {
      description: 'Hex color or token',
      css: (c) => [{ property: 'border-color', value: c }],
    },

    token: true,
  },

  // ---------------------------------------------------------------------------
  // BORDER
  // ---------------------------------------------------------------------------

  border: {
    name: 'border',
    aliases: ['bor'],
    category: 'border',
    description: 'Border (width, style, color)',

    numeric: {
      description: 'Border width in pixels',
      unit: 'px',
      css: (n) => [{ property: 'border', value: `${n}px solid currentColor` }],
      example: 'Box bor 1 #333',
    },

    directional: {
      directions: ['left', 'right', 'top', 'bottom', 'x', 'y', 'l', 'r', 't', 'b'],
      css: (dir, val) => [{ property: `border-${dir}`, value: val }],
    },

    token: true,
  },

  radius: {
    name: 'radius',
    aliases: ['rad'],
    category: 'border',
    description: 'Border radius',

    numeric: {
      description: 'Radius in pixels',
      unit: 'px',
      css: (n) => [{ property: 'border-radius', value: `${n}px` }],
      example: 'Box rad 8',
    },

    directional: {
      directions: ['tl', 'tr', 'bl', 'br', 't', 'b', 'l', 'r'],
      css: (dir, val) => {
        const mapping: Record<string, string[]> = {
          'tl': ['border-top-left-radius'],
          'tr': ['border-top-right-radius'],
          'bl': ['border-bottom-left-radius'],
          'br': ['border-bottom-right-radius'],
          't': ['border-top-left-radius', 'border-top-right-radius'],
          'b': ['border-bottom-left-radius', 'border-bottom-right-radius'],
          'l': ['border-top-left-radius', 'border-bottom-left-radius'],
          'r': ['border-top-right-radius', 'border-bottom-right-radius'],
        }
        const props = mapping[dir] || []
        return props.map(p => ({ property: p, value: val }))
      },
    },

    token: true,
  },

  // ---------------------------------------------------------------------------
  // TYPOGRAPHY
  // ---------------------------------------------------------------------------

  'font-size': {
    name: 'font-size',
    aliases: ['fs'],
    category: 'typography',
    description: 'Font size',

    numeric: {
      description: 'Font size in pixels',
      unit: 'px',
      css: (n) => [{ property: 'font-size', value: `${n}px` }],
      example: 'Text fs 16',
    },

    token: true,
  },

  weight: {
    name: 'weight',
    aliases: [],
    category: 'typography',
    description: 'Font weight',

    keywords: {
      thin: { description: 'Font weight 100', css: [{ property: 'font-weight', value: '100' }] },
      light: { description: 'Font weight 300', css: [{ property: 'font-weight', value: '300' }] },
      normal: { description: 'Font weight 400', css: [{ property: 'font-weight', value: '400' }] },
      medium: { description: 'Font weight 500', css: [{ property: 'font-weight', value: '500' }] },
      semibold: { description: 'Font weight 600', css: [{ property: 'font-weight', value: '600' }] },
      bold: { description: 'Font weight 700', css: [{ property: 'font-weight', value: '700' }] },
      black: { description: 'Font weight 900', css: [{ property: 'font-weight', value: '900' }] },
    },

    numeric: {
      description: 'Font weight (100-900)',
      unit: '',  // unitless
      css: (n) => [{ property: 'font-weight', value: String(n) }],
      example: 'Text weight 600',
    },
  },

  line: {
    name: 'line',
    aliases: [],
    category: 'typography',
    description: 'Line height',

    numeric: {
      description: 'Line height (unitless or pixels)',
      css: (n) => [{ property: 'line-height', value: n > 10 ? `${n}px` : String(n) }],
      example: 'Text line 1.5',
    },

    token: true,
  },

  font: {
    name: 'font',
    aliases: [],
    category: 'typography',
    description: 'Font family',

    keywords: {
      sans: { description: 'Sans-serif font stack', css: [{ property: 'font-family', value: 'system-ui, sans-serif' }] },
      serif: { description: 'Serif font stack', css: [{ property: 'font-family', value: 'Georgia, serif' }] },
      mono: { description: 'Monospace font stack', css: [{ property: 'font-family', value: 'ui-monospace, monospace' }] },
      roboto: { description: 'Roboto font', css: [{ property: 'font-family', value: 'Roboto, system-ui, sans-serif' }] },
    },

    token: true,
  },

  'text-align': {
    name: 'text-align',
    aliases: [],
    category: 'typography',
    description: 'Text alignment',

    keywords: {
      left: { description: 'Left align', css: [{ property: 'text-align', value: 'left' }] },
      center: { description: 'Center align', css: [{ property: 'text-align', value: 'center' }] },
      right: { description: 'Right align', css: [{ property: 'text-align', value: 'right' }] },
      justify: { description: 'Justify text', css: [{ property: 'text-align', value: 'justify' }] },
    },
  },

  italic: {
    name: 'italic',
    aliases: [],
    category: 'typography',
    description: 'Italic text',

    keywords: {
      _standalone: {
        description: 'Apply italic style',
        css: [{ property: 'font-style', value: 'italic' }],
        example: 'Text italic',
      },
    },
  },

  underline: {
    name: 'underline',
    aliases: [],
    category: 'typography',
    description: 'Underlined text',

    keywords: {
      _standalone: {
        description: 'Apply underline',
        css: [{ property: 'text-decoration', value: 'underline' }],
        example: 'Text underline',
      },
    },
  },

  uppercase: {
    name: 'uppercase',
    aliases: [],
    category: 'typography',
    description: 'Uppercase text',

    keywords: {
      _standalone: {
        description: 'Transform to uppercase',
        css: [{ property: 'text-transform', value: 'uppercase' }],
        example: 'Text uppercase',
      },
    },
  },

  lowercase: {
    name: 'lowercase',
    aliases: [],
    category: 'typography',
    description: 'Lowercase text',

    keywords: {
      _standalone: {
        description: 'Transform to lowercase',
        css: [{ property: 'text-transform', value: 'lowercase' }],
        example: 'Text lowercase',
      },
    },
  },

  truncate: {
    name: 'truncate',
    aliases: [],
    category: 'typography',
    description: 'Truncate text with ellipsis',

    keywords: {
      _standalone: {
        description: 'Truncate overflowing text',
        css: [
          { property: 'overflow', value: 'hidden' },
          { property: 'text-overflow', value: 'ellipsis' },
          { property: 'white-space', value: 'nowrap' },
        ],
        example: 'Text truncate',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // POSITION
  // ---------------------------------------------------------------------------

  x: {
    name: 'x',
    aliases: [],
    category: 'position',
    description: 'X position (left) - sets position: absolute',

    numeric: {
      description: 'X position in pixels',
      unit: 'px',
      css: (n) => [
        { property: 'position', value: 'absolute' },
        { property: 'left', value: `${n}px` },
      ],
      example: 'Box x 100',
    },
  },

  y: {
    name: 'y',
    aliases: [],
    category: 'position',
    description: 'Y position (top) - sets position: absolute',

    numeric: {
      description: 'Y position in pixels',
      unit: 'px',
      css: (n) => [
        { property: 'position', value: 'absolute' },
        { property: 'top', value: `${n}px` },
      ],
      example: 'Box y 50',
    },
  },

  // ---------------------------------------------------------------------------
  // Constraint/Anchor Properties
  // ---------------------------------------------------------------------------

  'pin-left': {
    name: 'pin-left',
    aliases: ['pl'],
    category: 'position',
    description: 'Pin to left edge with offset',

    numeric: {
      description: 'Distance from left edge in pixels',
      unit: 'px',
      css: (n) => [
        { property: 'position', value: 'absolute' },
        { property: 'left', value: `${n}px` },
      ],
      example: 'Box pin-left 20',
    },
  },

  'pin-right': {
    name: 'pin-right',
    aliases: ['pr'],
    category: 'position',
    description: 'Pin to right edge with offset',

    numeric: {
      description: 'Distance from right edge in pixels',
      unit: 'px',
      css: (n) => [
        { property: 'position', value: 'absolute' },
        { property: 'right', value: `${n}px` },
      ],
      example: 'Box pin-right 20',
    },
  },

  'pin-top': {
    name: 'pin-top',
    aliases: ['pt'],
    category: 'position',
    description: 'Pin to top edge with offset',

    numeric: {
      description: 'Distance from top edge in pixels',
      unit: 'px',
      css: (n) => [
        { property: 'position', value: 'absolute' },
        { property: 'top', value: `${n}px` },
      ],
      example: 'Box pin-top 20',
    },
  },

  'pin-bottom': {
    name: 'pin-bottom',
    aliases: ['pb'],
    category: 'position',
    description: 'Pin to bottom edge with offset',

    numeric: {
      description: 'Distance from bottom edge in pixels',
      unit: 'px',
      css: (n) => [
        { property: 'position', value: 'absolute' },
        { property: 'bottom', value: `${n}px` },
      ],
      example: 'Box pin-bottom 20',
    },
  },

  'pin-center-x': {
    name: 'pin-center-x',
    aliases: ['pcx'],
    category: 'position',
    description: 'Center horizontally within parent',

    keywords: {
      _standalone: {
        description: 'Center horizontally',
        css: [
          { property: 'position', value: 'absolute' },
          { property: 'left', value: '50%' },
          { property: 'transform', value: 'translateX(-50%)' },
        ],
      },
    },
  },

  'pin-center-y': {
    name: 'pin-center-y',
    aliases: ['pcy'],
    category: 'position',
    description: 'Center vertically within parent',

    keywords: {
      _standalone: {
        description: 'Center vertically',
        css: [
          { property: 'position', value: 'absolute' },
          { property: 'top', value: '50%' },
          { property: 'transform', value: 'translateY(-50%)' },
        ],
      },
    },
  },

  'pin-center': {
    name: 'pin-center',
    aliases: ['pc'],
    category: 'position',
    description: 'Center both horizontally and vertically',

    keywords: {
      _standalone: {
        description: 'Center in both directions',
        css: [
          { property: 'position', value: 'absolute' },
          { property: 'left', value: '50%' },
          { property: 'top', value: '50%' },
          { property: 'transform', value: 'translate(-50%, -50%)' },
        ],
      },
    },
  },

  z: {
    name: 'z',
    aliases: [],
    category: 'position',
    description: 'Z-index (stacking order)',

    numeric: {
      description: 'Z-index value',
      unit: '',  // unitless
      css: (n) => [{ property: 'z-index', value: String(n) }],
      example: 'Box z 10',
    },
  },

  absolute: {
    name: 'absolute',
    aliases: ['abs'],
    category: 'position',
    description: 'Absolute positioning',

    keywords: {
      _standalone: {
        description: 'Position absolute',
        css: [{ property: 'position', value: 'absolute' }],
        example: 'Box absolute',
      },
    },
  },

  fixed: {
    name: 'fixed',
    aliases: [],
    category: 'position',
    description: 'Fixed positioning',

    keywords: {
      _standalone: {
        description: 'Position fixed',
        css: [{ property: 'position', value: 'fixed' }],
        example: 'Box fixed',
      },
    },
  },

  relative: {
    name: 'relative',
    aliases: [],
    category: 'position',
    description: 'Relative positioning',

    keywords: {
      _standalone: {
        description: 'Position relative',
        css: [{ property: 'position', value: 'relative' }],
        example: 'Box relative',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // TRANSFORM
  // ---------------------------------------------------------------------------

  rotate: {
    name: 'rotate',
    aliases: ['rot'],
    category: 'transform',
    description: 'Rotate element',

    numeric: {
      description: 'Rotation in degrees',
      unit: 'deg',
      css: (n) => [{ property: 'transform', value: `rotate(${n}deg)` }],
      example: 'Box rotate 45',
    },
  },

  scale: {
    name: 'scale',
    aliases: [],
    category: 'transform',
    description: 'Scale element',

    numeric: {
      description: 'Scale factor',
      css: (n) => [{ property: 'transform', value: `scale(${n})` }],
      example: 'Box scale 1.2',
    },
  },

  translate: {
    name: 'translate',
    aliases: [],
    category: 'transform',
    description: 'Translate element (x, y)',

    numeric: {
      description: 'Translation in pixels',
      unit: 'px',
      css: (n) => [{ property: 'transform', value: `translate(${n}px, 0)` }],
      example: 'Box translate 10 20',
    },
  },

  // ---------------------------------------------------------------------------
  // EFFECT
  // ---------------------------------------------------------------------------

  opacity: {
    name: 'opacity',
    aliases: ['o', 'opa'],
    category: 'effect',
    description: 'Element opacity',

    numeric: {
      description: 'Opacity (0-1)',
      unit: '',  // unitless
      css: (n) => [{ property: 'opacity', value: String(n) }],
      example: 'Box opacity 0.5',
    },
  },

  shadow: {
    name: 'shadow',
    aliases: [],
    category: 'effect',
    description: 'Box shadow',

    keywords: {
      sm: {
        description: 'Small shadow',
        css: [{ property: 'box-shadow', value: '0 1px 2px rgba(0,0,0,0.05)' }],
        example: 'Box shadow sm',
      },
      md: {
        description: 'Medium shadow',
        css: [{ property: 'box-shadow', value: '0 4px 6px rgba(0,0,0,0.1)' }],
        example: 'Box shadow md',
      },
      lg: {
        description: 'Large shadow',
        css: [{ property: 'box-shadow', value: '0 10px 15px rgba(0,0,0,0.1)' }],
        example: 'Box shadow lg',
      },
    },
  },

  cursor: {
    name: 'cursor',
    aliases: [],
    category: 'effect',
    description: 'Mouse cursor style',

    keywords: {
      pointer: { description: 'Pointer cursor', css: [{ property: 'cursor', value: 'pointer' }] },
      grab: { description: 'Grab cursor', css: [{ property: 'cursor', value: 'grab' }] },
      move: { description: 'Move cursor', css: [{ property: 'cursor', value: 'move' }] },
      text: { description: 'Text cursor', css: [{ property: 'cursor', value: 'text' }] },
      wait: { description: 'Wait cursor', css: [{ property: 'cursor', value: 'wait' }] },
      'not-allowed': { description: 'Not allowed cursor', css: [{ property: 'cursor', value: 'not-allowed' }] },
    },
  },

  blur: {
    name: 'blur',
    aliases: [],
    category: 'effect',
    description: 'Blur filter',

    numeric: {
      description: 'Blur radius in pixels',
      unit: 'px',
      css: (n) => [{ property: 'filter', value: `blur(${n}px)` }],
      example: 'Box blur 5',
    },
  },

  'backdrop-blur': {
    name: 'backdrop-blur',
    aliases: ['blur-bg'],
    category: 'effect',
    description: 'Backdrop blur filter',

    numeric: {
      description: 'Blur radius in pixels',
      unit: 'px',
      css: (n) => [{ property: 'backdrop-filter', value: `blur(${n}px)` }],
      example: 'Box backdrop-blur 10',
    },
  },

  hidden: {
    name: 'hidden',
    aliases: [],
    category: 'effect',
    description: 'Hide element',

    keywords: {
      _standalone: {
        description: 'Display none',
        css: [{ property: 'display', value: 'none' }],
        example: 'Box hidden',
      },
    },
  },

  visible: {
    name: 'visible',
    aliases: [],
    category: 'effect',
    description: 'Show element',

    keywords: {
      _standalone: {
        description: 'Visibility visible',
        css: [{ property: 'visibility', value: 'visible' }],
        example: 'Box visible',
      },
    },
  },

  disabled: {
    name: 'disabled',
    aliases: [],
    category: 'effect',
    description: 'Disable element',

    keywords: {
      _standalone: {
        description: 'Disable interactions',
        css: [
          { property: 'pointer-events', value: 'none' },
          { property: 'opacity', value: '0.5' },
        ],
        example: 'Button disabled',
      },
    },
  },

  // ---------------------------------------------------------------------------
  // SCROLL
  // ---------------------------------------------------------------------------

  scroll: {
    name: 'scroll',
    aliases: ['scroll-ver'],
    category: 'effect',
    description: 'Enable vertical scrolling',

    keywords: {
      _standalone: {
        description: 'Overflow-y auto',
        css: [{ property: 'overflow-y', value: 'auto' }],
        example: 'Box scroll',
      },
    },
  },

  'scroll-hor': {
    name: 'scroll-hor',
    aliases: [],
    category: 'effect',
    description: 'Enable horizontal scrolling',

    keywords: {
      _standalone: {
        description: 'Overflow-x auto',
        css: [{ property: 'overflow-x', value: 'auto' }],
        example: 'Box scroll-hor',
      },
    },
  },

  'scroll-both': {
    name: 'scroll-both',
    aliases: [],
    category: 'effect',
    description: 'Enable scrolling in both directions',

    keywords: {
      _standalone: {
        description: 'Overflow auto',
        css: [{ property: 'overflow', value: 'auto' }],
        example: 'Box scroll-both',
      },
    },
  },

  clip: {
    name: 'clip',
    aliases: [],
    category: 'effect',
    description: 'Clip overflow content',

    keywords: {
      _standalone: {
        description: 'Overflow hidden',
        css: [{ property: 'overflow', value: 'hidden' }],
        example: 'Box clip',
      },
    },
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a word is a reserved keyword
 */
export function isReservedKeyword(word: string): boolean {
  return DSL.keywords.reserved.includes(word as any)
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
  return Object.values(SCHEMA).filter((p) => p.category === category)
}

/**
 * Get keyword values for autocomplete
 */
export function getKeywordsForProperty(nameOrAlias: string): string[] {
  const prop = findProperty(nameOrAlias)
  if (!prop?.keywords) return []

  return Object.keys(prop.keywords).filter((k) => k !== '_standalone')
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
  return DSL.keys.includes(key.toLowerCase() as any)
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
