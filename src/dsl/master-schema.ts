/**
 * @module dsl/master-schema
 * @description Single Source of Truth für die gesamte Mirror DSL
 *
 * Dieses Schema definiert ALLE DSL-Elemente:
 * - Properties (200+)
 * - Events (15+)
 * - Actions (25+)
 * - States (System + Behavior)
 * - Animations (Transition + Continuous)
 * - Keywords (Control, Timing, Targets)
 * - Autocomplete-Daten
 *
 * Aus diesem Schema wird generiert:
 * - Validator
 * - Dokumentation (reference.json, CLAUDE.md)
 * - LLM-Prompts
 * - Autocomplete
 *
 * @version 2.0
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export type PropertyCategory =
  | 'layout'
  | 'alignment'
  | 'sizing'
  | 'spacing'
  | 'color'
  | 'border'
  | 'typography'
  | 'icon'
  | 'visual'
  | 'scroll'
  | 'hover'
  | 'form'
  | 'image'
  | 'link'
  | 'data'

export type ValueType =
  | 'boolean'     // Standalone property (e.g., horizontal, wrap)
  | 'number'      // Numeric value (e.g., padding 12)
  | 'color'       // Color value (e.g., #333, $token)
  | 'string'      // String value (e.g., font "Inter")
  | 'enum'        // One of predefined values (e.g., cursor pointer)
  | 'compound'    // Multiple components (e.g., border 1 dashed #333)
  | 'keyword'     // Keyword value (e.g., width full)
  | 'mixed'       // Can accept multiple types

export type AcceptedValue =
  | 'number'
  | 'percentage'
  | 'token'
  | 'color-hex'
  | 'color-name'
  | 'keyword'

export interface DirectionSupport {
  supported: boolean
  forms: string[]          // ['left', 'right', 'top', 'bottom']
  shortForms: string[]     // ['l', 'r', 'u', 'd']
  combos: string[]         // ['left-right', 'top-bottom']
  shortCombos: string[]    // ['l-r', 'u-d', 'lr', 'ud']
}

export interface CornerSupport {
  supported: boolean
  forms: string[]          // ['top-left', 'top-right', 'bottom-left', 'bottom-right']
  shortForms: string[]     // ['tl', 'tr', 'bl', 'br']
  edges: string[]          // ['t', 'b', 'l', 'r'] - edge shortcuts
}

export interface CssShorthand {
  minValues: number
  maxValues: number
  expansion: 'padding' | 'radius'  // Which expansion pattern
}

export interface CompoundComponent {
  name: string
  type: 'number' | 'color' | 'enum' | 'string'
  required?: boolean
  values?: string[]        // For enum type
  default?: string | number
}

export interface CompoundDefinition {
  components: CompoundComponent[]
  order: 'any' | 'strict'  // Can components appear in any order?
}

export interface PropertyDefinition {
  // Identification
  name: string                      // Long form = canonical (e.g., 'padding')
  shortForms: string[]              // Short aliases (e.g., ['pad', 'p'])
  category: PropertyCategory

  // Value Type
  valueType: ValueType
  accepts?: AcceptedValue[]
  enumValues?: string[]             // For enum type
  range?: { min?: number; max?: number }
  keywords?: string[]               // Valid keyword values (e.g., 'full', 'hug')

  // Direction Support (padding, margin, border)
  directions?: DirectionSupport

  // Corner Support (radius)
  corners?: CornerSupport

  // CSS Shorthand (1-4 values)
  cssShorthand?: CssShorthand

  // Compound Property (border)
  compound?: CompoundDefinition

  // Documentation
  description: string
  examples: string[]

  // Autocomplete
  autocomplete?: {
    syntax: string
    keywords: string[]              // German + English + synonyms for search
    valuePicker?: 'color' | 'spacing' | 'font' | 'icon' | 'shadow' | 'weight' | 'value' | 'none'
  }
}

export interface EventDefinition {
  name: string
  description: string
  keyModifiers?: string[]           // For onkeydown/onkeyup: ['escape', 'enter', ...]
  supportsTiming?: boolean          // Can use debounce/delay
  examples: string[]
}

export interface ActionDefinition {
  name: string
  description: string
  validTargets?: string[]           // ['self', 'next', 'prev', ...]
  supportsAnimation?: boolean
  supportsPosition?: boolean
  syntax: string                    // e.g., "open Target [position] [animation]"
  examples: string[]
}

export interface StateDefinition {
  name: string
  type: 'system' | 'behavior'
  description: string
  triggeredBy?: string              // Which action triggers this state
  cssMapping?: string               // CSS pseudo-class (for system states)
}

export interface AnimationDefinition {
  name: string
  type: 'transition' | 'continuous'
  description: string
  defaultDuration?: number
  examples: string[]
}

export interface KeywordDefinition {
  name: string
  category: 'control' | 'timing' | 'target' | 'position' | 'syntax'
  description: string
}

// =============================================================================
// COMPONENT DEFINITIONS
// =============================================================================

export interface ComponentDefinition {
  name: string
  aliases: string[]
  // Welche Property-Kategorien sind erlaubt?
  allowedCategories: PropertyCategory[]
  // Zusätzlich explizit erlaubte Properties (auch wenn Kategorie nicht erlaubt)
  allowedProperties?: string[]
  // Verbotene Properties mit Korrekturvorschlag
  forbiddenProperties?: Record<string, string>
  // Pflicht-Properties?
  requiredProperties?: string[]
  // Akzeptiert Text-Content?
  acceptsTextContent: boolean
  // Akzeptiert Kinder?
  acceptsChildren: boolean
  // Beschreibung für Dokumentation
  description: string
}

// =============================================================================
// CORE COMPONENT DEFINITIONS (Built-in Templates)
// =============================================================================

export type CoreComponentCategory = 'navigation' | 'form' | 'button' | 'data' | 'feedback'

export interface SlotDefinition {
  name: string
  description: string
  type: 'Icon' | 'Text' | 'Box' | 'custom'
  defaultProperties?: Record<string, unknown>
}

export interface CoreStateDefinition {
  name: string
  description: string
  properties?: Record<string, unknown>
  childOverrides?: Array<{ slot: string; properties: Record<string, unknown> }>
}

export interface CoreComponentDefinition {
  name: string
  category: CoreComponentCategory
  description: string

  // Default Properties
  properties: Record<string, unknown>

  // Slots (named children)
  slots: SlotDefinition[]

  // States (hover, active, expanded, etc.)
  states: CoreStateDefinition[]

  // Event Handlers
  events?: Array<{
    event: string
    target?: string
    actions: string[]
  }>

  // Animations
  showAnimation?: string
  hideAnimation?: string

  // Documentation
  usage: string[]
  examples: string[]

  // Tokens this component uses
  tokens?: string[]
}

// =============================================================================
// DIRECTION & CORNER DEFINITIONS
// =============================================================================

export const STANDARD_DIRECTIONS: DirectionSupport = {
  supported: true,
  forms: ['left', 'right', 'top', 'bottom'],
  shortForms: ['l', 'r', 'u', 'd'],
  combos: ['left-right', 'top-bottom'],
  shortCombos: ['l-r', 'u-d', 'lr', 'ud', 't-b', 'tb'],
}

export const STANDARD_CORNERS: CornerSupport = {
  supported: true,
  forms: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
  shortForms: ['tl', 'tr', 'bl', 'br'],
  edges: ['t', 'b', 'l', 'r'],
}

// =============================================================================
// MASTER SCHEMA
// =============================================================================

export const MIRROR_SCHEMA = {
  version: '2.0',

  // ---------------------------------------------------------------------------
  // COMPONENTS
  // ---------------------------------------------------------------------------
  components: {
    // =========================================================================
    // CONTAINER COMPONENTS
    // =========================================================================
    Box: {
      name: 'Box',
      aliases: ['Container', 'Row', 'Col', 'Stack', 'Wrapper', 'Frame'],
      allowedCategories: ['layout', 'alignment', 'sizing', 'spacing', 'color', 'border', 'visual', 'scroll', 'hover'],
      acceptsTextContent: false,
      acceptsChildren: true,
      description: 'Basis-Container für Layout',
    } as ComponentDefinition,

    // =========================================================================
    // TEXT COMPONENTS
    // =========================================================================
    Text: {
      name: 'Text',
      aliases: ['Label', 'Title', 'Heading', 'Paragraph', 'Span'],
      allowedCategories: ['typography', 'color', 'spacing', 'visual', 'hover'],
      forbiddenProperties: {
        'icon-size': 'Text verwendet "font-size", nicht "icon-size"',
        'icon-weight': 'Text verwendet "font-weight" oder "weight", nicht "icon-weight"',
        'icon-color': 'Text verwendet "color", nicht "icon-color"',
        'fill': '"fill" ist nur für Icons. Verwende "background" für Text.',
        'material': '"material" ist nur für Icons verfügbar.',
      },
      acceptsTextContent: true,
      acceptsChildren: false,
      description: 'Textanzeige',
    } as ComponentDefinition,

    // =========================================================================
    // ICON COMPONENT
    // =========================================================================
    Icon: {
      name: 'Icon',
      aliases: [],
      allowedCategories: ['icon', 'color', 'visual', 'hover'],
      allowedProperties: ['color', 'opacity', 'rotate', 'hidden', 'visible', 'cursor'],
      forbiddenProperties: {
        'size': 'Für Icons verwende "icon-size" statt "size"',
        'font-size': 'Für Icons verwende "icon-size" statt "font-size"',
        'weight': 'Für Icons verwende "icon-weight" statt "weight"',
        'font-weight': 'Für Icons verwende "icon-weight" statt "font-weight"',
      },
      acceptsTextContent: true, // Icon "name"
      acceptsChildren: false,
      description: 'Icon-Anzeige (Lucide oder Material)',
    } as ComponentDefinition,

    // =========================================================================
    // FORM COMPONENTS
    // =========================================================================
    Input: {
      name: 'Input',
      aliases: ['TextField', 'TextInput'],
      allowedCategories: ['form', 'typography', 'color', 'border', 'spacing', 'sizing', 'visual', 'hover'],
      acceptsTextContent: true, // placeholder
      acceptsChildren: false,
      description: 'Eingabefeld',
    } as ComponentDefinition,

    Textarea: {
      name: 'Textarea',
      aliases: ['TextArea', 'MultilineInput'],
      allowedCategories: ['form', 'typography', 'color', 'border', 'spacing', 'sizing', 'visual', 'scroll', 'hover'],
      acceptsTextContent: true, // placeholder
      acceptsChildren: false,
      description: 'Mehrzeiliges Eingabefeld',
    } as ComponentDefinition,

    Button: {
      name: 'Button',
      aliases: ['Btn'],
      allowedCategories: ['typography', 'color', 'border', 'spacing', 'sizing', 'visual', 'hover', 'layout'],
      acceptsTextContent: true, // label
      acceptsChildren: true, // kann Icon + Text enthalten
      description: 'Interaktiver Button',
    } as ComponentDefinition,

    Segment: {
      name: 'Segment',
      aliases: ['SegmentedInput', 'CodeInput'],
      allowedCategories: ['form', 'typography', 'color', 'border', 'spacing', 'sizing', 'visual'],
      acceptsTextContent: false,
      acceptsChildren: false,
      description: 'Segmentiertes Eingabefeld (z.B. für Codes)',
    } as ComponentDefinition,

    // =========================================================================
    // MEDIA COMPONENTS
    // =========================================================================
    Image: {
      name: 'Image',
      aliases: ['Img', 'Picture', 'Photo'],
      allowedCategories: ['sizing', 'border', 'visual', 'spacing'],
      allowedProperties: ['src', 'alt', 'object-fit', 'radius'],
      forbiddenProperties: {
        'color': 'Image hat keine Textfarbe. Meinst du einen Filter?',
        'font-size': 'Image hat keine Schriftgröße. Verwende width/height.',
      },
      acceptsTextContent: true, // src URL
      acceptsChildren: false,
      description: 'Bildanzeige',
    } as ComponentDefinition,

    // =========================================================================
    // NAVIGATION COMPONENTS
    // =========================================================================
    Link: {
      name: 'Link',
      aliases: ['Anchor', 'A'],
      allowedCategories: ['typography', 'color', 'spacing', 'visual', 'hover'],
      allowedProperties: ['href', 'target'],
      acceptsTextContent: true, // label
      acceptsChildren: true,
      description: 'Hyperlink',
    } as ComponentDefinition,
  } as Record<string, ComponentDefinition>,

  // ---------------------------------------------------------------------------
  // CORE COMPONENTS (Built-in Templates)
  // ---------------------------------------------------------------------------
  // These are complete component templates that are part of the language.
  // Users can use them directly without defining them first.
  // They can be themed via tokens and extended with `from`.
  coreComponents: {
    // =========================================================================
    // NAVIGATION COMPONENTS
    // =========================================================================

    Nav: {
      name: 'Nav',
      category: 'navigation' as CoreComponentCategory,
      description: 'Navigation Container. Enthält NavItems und kann collapsed/expanded werden.',
      properties: {
        width: 240,
        _layout: 'vertical',
        gap: 4,
        padding: 8,
        background: '$nav.bg',
      },
      slots: [],
      states: [
        { name: 'expanded', description: 'Volle Breite', properties: { width: 240 } },
        { name: 'collapsed', description: 'Minimierte Breite', properties: { width: 64 } },
      ],
      tokens: ['$nav.bg'],
      usage: [
        'Nav als Container für Navigation verwenden',
        'Mit expanded/collapsed States für collapsible Sidebar',
      ],
      examples: [
        'Nav\n  NavItem Icon "home"; Label "Dashboard"\n  NavItem Icon "settings"; Label "Settings"',
        'Nav expanded\n  NavItem Icon "home"; Label "Home"',
        'myNav as Nav, width 280',
      ],
    } as CoreComponentDefinition,

    NavItem: {
      name: 'NavItem',
      category: 'navigation' as CoreComponentCategory,
      description: 'Navigations-Element mit Icon und Label. Unterstützt hover und active States.',
      properties: {
        _layout: 'horizontal',
        _align: 'ver-center',
        gap: 12,
        'padding-vertical': 8,
        'padding-horizontal': 16,
        radius: 4,
        cursor: 'pointer',
      },
      slots: [
        { name: 'Icon', description: 'Navigations-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
        { name: 'Label', description: 'Navigations-Text', type: 'Text', defaultProperties: { color: '$nav.text', truncate: true } },
      ],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$nav.hover' } },
        { name: 'active', description: 'Aktives Element', properties: { background: '$nav.active' } },
      ],
      tokens: ['$nav.muted', '$nav.text', '$nav.hover', '$nav.active'],
      usage: [
        'NavItem Icon "name"; Label "Text" für Standard-Navigation',
        'NavItem active, ... für aktives Element',
      ],
      examples: [
        'NavItem Icon "home"; Label "Dashboard"',
        'NavItem active, Icon "settings"; Label "Settings"',
        'NavItem Icon "user"; Label "Profile"',
      ],
    } as CoreComponentDefinition,

    NavItemBadge: {
      name: 'NavItemBadge',
      category: 'navigation' as CoreComponentCategory,
      description: 'Navigations-Element mit Icon, Label und Badge-Counter.',
      properties: {
        _layout: 'horizontal',
        _align: 'ver-center',
        gap: 12,
        'padding-vertical': 8,
        'padding-horizontal': 16,
        radius: 4,
        cursor: 'pointer',
      },
      slots: [
        { name: 'Icon', description: 'Navigations-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
        { name: 'Label', description: 'Navigations-Text', type: 'Text', defaultProperties: { color: '$nav.text', width: 'full', truncate: true } },
        { name: 'Badge', description: 'Counter-Badge', type: 'Text', defaultProperties: { background: '$nav.badge', color: '$nav.text', 'font-size': 11, radius: 999, 'min-width': 20, height: 18 } },
      ],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$nav.hover' } },
        { name: 'active', description: 'Aktives Element', properties: { background: '$nav.active' } },
      ],
      tokens: ['$nav.muted', '$nav.text', '$nav.hover', '$nav.active', '$nav.badge'],
      usage: [
        'NavItemBadge für Items mit Notification-Counter',
      ],
      examples: [
        'NavItemBadge Icon "inbox"; Label "Messages"; Badge "12"',
        'NavItemBadge Icon "bell"; Label "Notifications"; Badge "3"',
      ],
    } as CoreComponentDefinition,

    NavSection: {
      name: 'NavSection',
      category: 'navigation' as CoreComponentCategory,
      description: 'Gruppen-Header für Navigation-Sections.',
      properties: {},
      slots: [
        { name: 'Label', description: 'Section-Titel', type: 'Text', defaultProperties: { color: '$nav.muted', 'font-size': 11, uppercase: true, 'padding-vertical': 8, 'padding-horizontal': 16 } },
      ],
      states: [],
      tokens: ['$nav.muted'],
      usage: [
        'NavSection Label "Admin" für Gruppen-Header',
      ],
      examples: [
        'NavSection Label "Admin"',
        'NavSection Label "Settings"',
      ],
    } as CoreComponentDefinition,

    ToggleNav: {
      name: 'ToggleNav',
      category: 'navigation' as CoreComponentCategory,
      description: 'Collapse/Expand Toggle-Button für Navigation.',
      properties: {
        _layout: 'horizontal',
        _align: 'right',
        width: 'full',
        'padding-vertical': 8,
        'padding-horizontal': 16,
        cursor: 'pointer',
      },
      slots: [
        { name: 'Arrow', description: 'Pfeil-Icon', type: 'Icon', defaultProperties: { content: 'chevron-left', color: '$nav.muted', 'icon-size': 18 } },
      ],
      states: [
        { name: 'expanded', description: 'Navigation offen', childOverrides: [{ slot: 'Arrow', properties: { content: 'chevron-left' } }] },
        { name: 'collapsed', description: 'Navigation zu', childOverrides: [{ slot: 'Arrow', properties: { content: 'chevron-right' } }] },
      ],
      events: [
        { event: 'onclick', actions: ['toggle-state self'] },
      ],
      tokens: ['$nav.muted'],
      usage: [
        'ToggleNav am Ende der Nav für Collapse-Funktion',
      ],
      examples: [
        'ToggleNav expanded',
        'ToggleNav collapsed',
      ],
    } as CoreComponentDefinition,

    TreeItem: {
      name: 'TreeItem',
      category: 'navigation' as CoreComponentCategory,
      description: 'Expandierbares Tree-Navigation-Element mit Chevron, Icon und Label.',
      properties: {
        _layout: 'vertical',
      },
      slots: [
        { name: 'TreeHeader', description: 'Klickbarer Header', type: 'Box', defaultProperties: { _layout: 'horizontal', _align: 'ver-center', gap: 8, 'padding-vertical': 8, 'padding-horizontal': 16, radius: 4, cursor: 'pointer' } },
        { name: 'Chevron', description: 'Expand-Icon', type: 'Icon', defaultProperties: { content: 'chevron-right', 'icon-size': 14, color: '$nav.muted' } },
        { name: 'Icon', description: 'Item-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
        { name: 'Label', description: 'Item-Text', type: 'Text', defaultProperties: { color: '$nav.text' } },
        { name: 'TreeChildren', description: 'Nested Items', type: 'Box', defaultProperties: { _layout: 'vertical', 'padding-left': 16, hidden: true } },
      ],
      states: [
        { name: 'expanded', description: 'Kinder sichtbar', childOverrides: [{ slot: 'Chevron', properties: { rotate: 90 } }, { slot: 'TreeChildren', properties: { hidden: false, visible: true } }] },
        { name: 'active', description: 'Aktives Element', childOverrides: [{ slot: 'TreeHeader', properties: { background: '$nav.active' } }] },
      ],
      events: [
        { event: 'onclick', actions: ['toggle-state self'] },
      ],
      tokens: ['$nav.muted', '$nav.text', '$nav.active'],
      usage: [
        'TreeItem für hierarchische Navigation',
      ],
      examples: [
        'TreeItem Icon "folder"; Label "Documents"\n  TreeChildren\n    TreeLeaf Icon "file"; Label "Report.pdf"',
      ],
    } as CoreComponentDefinition,

    TreeLeaf: {
      name: 'TreeLeaf',
      category: 'navigation' as CoreComponentCategory,
      description: 'Nicht-expandierbares Tree-Element (Blatt).',
      properties: {
        _layout: 'horizontal',
        _align: 'ver-center',
        gap: 8,
        'padding-vertical': 8,
        'padding-horizontal': 16,
        'padding-left': 30,
        radius: 4,
        cursor: 'pointer',
      },
      slots: [
        { name: 'Icon', description: 'Item-Icon', type: 'Icon', defaultProperties: { color: '$nav.muted', 'icon-size': 20 } },
        { name: 'Label', description: 'Item-Text', type: 'Text', defaultProperties: { color: '$nav.text' } },
      ],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$nav.hover' } },
        { name: 'active', description: 'Aktives Element', properties: { background: '$nav.active' } },
      ],
      tokens: ['$nav.muted', '$nav.text', '$nav.hover', '$nav.active'],
      usage: [
        'TreeLeaf als Blatt-Element in TreeItem',
      ],
      examples: [
        'TreeLeaf Icon "file"; Label "Document.pdf"',
        'TreeLeaf active, Icon "image"; Label "Photo.jpg"',
      ],
    } as CoreComponentDefinition,

    DrawerNav: {
      name: 'DrawerNav',
      category: 'navigation' as CoreComponentCategory,
      description: 'Mobile Drawer-Navigation (von links einfahrend).',
      properties: {
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 240,
        background: '$nav.bg',
        shadow: 'lg',
        z: 101,
        hidden: true,
      },
      slots: [],
      states: [],
      showAnimation: 'slide-right 200',
      hideAnimation: 'slide-left 150',
      tokens: ['$nav.bg'],
      usage: [
        'DrawerNav für mobile Navigation',
        'Mit MenuButton kombinieren',
      ],
      examples: [
        'DrawerNav\n  NavItem Icon "home"; Label "Home"',
      ],
    } as CoreComponentDefinition,

    DrawerBackdrop: {
      name: 'DrawerBackdrop',
      category: 'navigation' as CoreComponentCategory,
      description: 'Overlay-Backdrop für Drawer (abdunkelt Hintergrund).',
      properties: {
        position: 'fixed',
        inset: 0,
        background: '#00000080',
        z: 100,
        hidden: true,
      },
      slots: [],
      states: [],
      events: [
        { event: 'onclick', actions: ['hide DrawerNav', 'hide self'] },
      ],
      showAnimation: 'fade 150',
      hideAnimation: 'fade 100',
      tokens: [],
      usage: [
        'DrawerBackdrop hinter DrawerNav für Klick-zum-Schließen',
      ],
      examples: [
        'DrawerBackdrop',
      ],
    } as CoreComponentDefinition,

    MenuButton: {
      name: 'MenuButton',
      category: 'navigation' as CoreComponentCategory,
      description: 'Hamburger-Menu-Button zum Öffnen des Drawers.',
      properties: {},
      slots: [
        { name: 'Icon', description: 'Menu-Icon', type: 'Icon', defaultProperties: { content: 'menu', padding: 8, color: '$nav.text', cursor: 'pointer' } },
      ],
      states: [],
      events: [
        { event: 'onclick', actions: ['show DrawerNav', 'show DrawerBackdrop'] },
      ],
      tokens: ['$nav.text'],
      usage: [
        'MenuButton in Header für mobile Navigation',
      ],
      examples: [
        'MenuButton',
      ],
    } as CoreComponentDefinition,

    // =========================================================================
    // FORM COMPONENTS
    // =========================================================================

    Field: {
      name: 'Field',
      category: 'form' as CoreComponentCategory,
      description: 'Form-Feld Container mit Label, Input, Helper und Error Slots.',
      properties: {
        _layout: 'vertical',
        gap: 4,
      },
      slots: [
        { name: 'Label', description: 'Feld-Label', type: 'Text', defaultProperties: { color: '$form.label', 'font-size': 13 } },
        { name: 'Input', description: 'Eingabefeld', type: 'Input', defaultProperties: { height: 36, 'padding-horizontal': 12, background: '$form.input', 'border-width': 1, 'border-color': '$form.border', radius: 4, color: '$form.text', width: 'full' } },
        { name: 'Helper', description: 'Hilfe-Text (optional)', type: 'Text', defaultProperties: { color: '$form.muted', 'font-size': 12, hidden: true } },
        { name: 'Error', description: 'Fehler-Meldung', type: 'Text', defaultProperties: { color: '$form.error', 'font-size': 12, hidden: true } },
      ],
      states: [
        { name: 'focused', description: 'Input hat Fokus', childOverrides: [{ slot: 'Input', properties: { 'border-color': '$form.focus' } }] },
        { name: 'invalid', description: 'Validierung fehlgeschlagen', childOverrides: [{ slot: 'Input', properties: { 'border-color': '$form.error' } }, { slot: 'Error', properties: { hidden: false, visible: true } }] },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, 'pointer-events': 'none' } },
      ],
      tokens: ['$form.label', '$form.input', '$form.border', '$form.text', '$form.muted', '$form.error', '$form.focus'],
      usage: [
        'Field Label "E-Mail"; Input placeholder "name@example.com"',
        'Field invalid, ... für Validierungsfehler',
      ],
      examples: [
        'Field Label "E-Mail"; Input placeholder "name@example.com"',
        'Field Label "Passwort"; Input type password; Helper "Min. 8 Zeichen"',
        'Field invalid, Label "Name"; Error "Pflichtfeld"',
      ],
    } as CoreComponentDefinition,

    TextInput: {
      name: 'TextInput',
      category: 'form' as CoreComponentCategory,
      description: 'Einfaches Text-Eingabefeld mit Hover und Focus States.',
      properties: {
        _primitiveType: 'Input',
        height: 36,
        'padding-horizontal': 12,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        radius: 4,
        color: '$form.text',
      },
      slots: [],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
        { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
      ],
      tokens: ['$form.input', '$form.border', '$form.text', '$form.muted', '$form.focus'],
      usage: [
        'TextInput placeholder "Text eingeben..."',
      ],
      examples: [
        'TextInput placeholder "Enter text..."',
        'TextInput "Default value"',
      ],
    } as CoreComponentDefinition,

    IconInput: {
      name: 'IconInput',
      category: 'form' as CoreComponentCategory,
      description: 'Text-Eingabefeld mit führendem Icon.',
      properties: {
        _layout: 'horizontal',
        _align: 'ver-center',
        height: 36,
        'padding-horizontal': 12,
        gap: 8,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        radius: 4,
      },
      slots: [
        { name: 'Icon', description: 'Führendes Icon', type: 'Icon', defaultProperties: { color: '$form.muted', 'icon-size': 18 } },
        { name: 'Input', description: 'Eingabefeld', type: 'Input', defaultProperties: { background: 'transparent', border: 'none', color: '$form.text', width: 'full' } },
      ],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
        { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
      ],
      tokens: ['$form.input', '$form.border', '$form.muted', '$form.text', '$form.focus'],
      usage: [
        'IconInput Icon "search"; Input placeholder "Suchen..."',
      ],
      examples: [
        'IconInput Icon "search"; Input placeholder "Search..."',
        'IconInput Icon "mail"; Input placeholder "Email"',
      ],
    } as CoreComponentDefinition,

    PasswordInput: {
      name: 'PasswordInput',
      category: 'form' as CoreComponentCategory,
      description: 'Passwort-Eingabefeld mit Sichtbarkeits-Toggle.',
      properties: {
        _layout: 'horizontal',
        _align: 'ver-center',
        height: 36,
        'padding-horizontal': 12,
        gap: 8,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        radius: 4,
      },
      slots: [
        { name: 'Input', description: 'Passwort-Feld', type: 'Input', defaultProperties: { inputType: 'password', background: 'transparent', border: 'none', color: '$form.text', width: 'full' } },
        { name: 'Toggle', description: 'Sichtbarkeits-Toggle', type: 'Icon', defaultProperties: { content: 'eye-off', color: '$form.muted', 'icon-size': 18, cursor: 'pointer' } },
      ],
      states: [
        { name: 'visible', description: 'Passwort sichtbar', childOverrides: [{ slot: 'Input', properties: { inputType: 'text' } }, { slot: 'Toggle', properties: { content: 'eye' } }] },
        { name: 'hidden', description: 'Passwort versteckt', childOverrides: [{ slot: 'Input', properties: { inputType: 'password' } }, { slot: 'Toggle', properties: { content: 'eye-off' } }] },
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
        { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
      ],
      events: [
        { event: 'onclick', target: 'Toggle', actions: ['toggle-state self'] },
      ],
      tokens: ['$form.input', '$form.border', '$form.muted', '$form.text', '$form.focus'],
      usage: [
        'PasswordInput placeholder "Passwort..."',
        'Klick auf Auge-Icon wechselt Sichtbarkeit',
      ],
      examples: [
        'PasswordInput placeholder "Enter password..."',
      ],
    } as CoreComponentDefinition,

    TextareaInput: {
      name: 'TextareaInput',
      category: 'form' as CoreComponentCategory,
      description: 'Mehrzeiliges Text-Eingabefeld.',
      properties: {
        _primitiveType: 'Textarea',
        'min-height': 80,
        padding: 12,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        radius: 4,
        color: '$form.text',
      },
      slots: [],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
        { name: 'focus', description: 'Hat Fokus', properties: { 'border-color': '$form.focus' } },
      ],
      tokens: ['$form.input', '$form.border', '$form.text', '$form.muted', '$form.focus'],
      usage: [
        'TextareaInput placeholder "Beschreibung..."',
      ],
      examples: [
        'TextareaInput placeholder "Enter description..."',
        'TextareaInput rows 5, placeholder "Message"',
      ],
    } as CoreComponentDefinition,

    SelectInput: {
      name: 'SelectInput',
      category: 'form' as CoreComponentCategory,
      description: 'Dropdown-Auswahl-Feld.',
      properties: {
        _layout: 'horizontal',
        _align: 'ver-center',
        _justify: 'space-between',
        height: 36,
        'padding-horizontal': 12,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        radius: 4,
        cursor: 'pointer',
      },
      slots: [
        { name: 'Value', description: 'Aktueller Wert', type: 'Text', defaultProperties: { color: '$form.text' } },
        { name: 'Chevron', description: 'Dropdown-Indikator', type: 'Icon', defaultProperties: { content: 'chevron-down', color: '$form.muted', 'icon-size': 18 } },
      ],
      states: [
        { name: 'expanded', description: 'Dropdown offen', childOverrides: [{ slot: 'Chevron', properties: { rotate: 180 } }] },
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
      ],
      events: [
        { event: 'onclick', actions: ['toggle-state self'] },
      ],
      tokens: ['$form.input', '$form.border', '$form.text', '$form.muted'],
      usage: [
        'SelectInput Value "Option wählen..."',
      ],
      examples: [
        'SelectInput Value "Select option..."',
      ],
    } as CoreComponentDefinition,

    // =========================================================================
    // BUTTON COMPONENTS
    // =========================================================================

    PrimaryButton: {
      name: 'PrimaryButton',
      category: 'button' as CoreComponentCategory,
      description: 'Haupt-Aktions-Button.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        gap: 8,
        height: 36,
        'padding-horizontal': 16,
        radius: 4,
        background: '$primary.bg',
        color: '$primary.text',
        cursor: 'pointer',
      },
      slots: [],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$primary.hover' } },
        { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
      ],
      tokens: ['$primary.bg', '$primary.text', '$primary.hover'],
      usage: [
        'PrimaryButton "Speichern" für Haupt-Aktionen',
      ],
      examples: [
        'PrimaryButton "Save"',
        'PrimaryButton Icon "save"; "Save Changes"',
      ],
    } as CoreComponentDefinition,

    SecondaryButton: {
      name: 'SecondaryButton',
      category: 'button' as CoreComponentCategory,
      description: 'Sekundärer Aktions-Button.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        gap: 8,
        height: 36,
        'padding-horizontal': 16,
        radius: 4,
        background: '$secondary.bg',
        color: '$form.text',
        cursor: 'pointer',
      },
      slots: [],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$secondary.hover' } },
        { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
      ],
      tokens: ['$secondary.bg', '$secondary.hover', '$form.text'],
      usage: [
        'SecondaryButton "Abbrechen" für sekundäre Aktionen',
      ],
      examples: [
        'SecondaryButton "Cancel"',
      ],
    } as CoreComponentDefinition,

    GhostButton: {
      name: 'GhostButton',
      category: 'button' as CoreComponentCategory,
      description: 'Transparenter Button mit Rahmen.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        gap: 8,
        height: 36,
        'padding-horizontal': 16,
        radius: 4,
        background: 'transparent',
        'border-width': 1,
        'border-color': '$form.border',
        color: '$form.text',
        cursor: 'pointer',
      },
      slots: [],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$form.input' } },
        { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
      ],
      tokens: ['$form.border', '$form.text', '$form.input'],
      usage: [
        'GhostButton "Mehr erfahren" für dezente Aktionen',
      ],
      examples: [
        'GhostButton "Learn More"',
      ],
    } as CoreComponentDefinition,

    DangerButton: {
      name: 'DangerButton',
      category: 'button' as CoreComponentCategory,
      description: 'Button für destruktive Aktionen.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        gap: 8,
        height: 36,
        'padding-horizontal': 16,
        radius: 4,
        background: '$danger.bg',
        color: '#FFFFFF',
        cursor: 'pointer',
      },
      slots: [],
      states: [
        { name: 'hover', description: 'Mouse-Over', properties: { background: '$danger.hover' } },
        { name: 'active', description: 'Gedrückt', properties: { transform: 'scale(0.98)' } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed', 'pointer-events': 'none' } },
      ],
      tokens: ['$danger.bg', '$danger.hover'],
      usage: [
        'DangerButton "Löschen" für destruktive Aktionen',
      ],
      examples: [
        'DangerButton "Delete"',
      ],
    } as CoreComponentDefinition,

    // =========================================================================
    // CHECKBOX / RADIO / SWITCH
    // =========================================================================

    CheckboxInput: {
      name: 'CheckboxInput',
      category: 'form' as CoreComponentCategory,
      description: 'Checkbox-Eingabefeld mit checked/unchecked State.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        width: 18,
        height: 18,
        radius: 4,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        cursor: 'pointer',
      },
      slots: [
        { name: 'Checkmark', description: 'Haken-Icon', type: 'Icon', defaultProperties: { content: 'check', color: 'white', 'icon-size': 14, hidden: true } },
      ],
      states: [
        { name: 'checked', description: 'Ausgewählt', properties: { background: '$primary.bg', 'border-color': '$primary.bg' }, childOverrides: [{ slot: 'Checkmark', properties: { hidden: false, visible: true } }] },
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed' } },
      ],
      events: [
        { event: 'onclick', actions: ['toggle-state self'] },
      ],
      tokens: ['$form.input', '$form.border', '$form.muted', '$primary.bg'],
      usage: [
        'CheckboxInput für einzelne An/Aus-Auswahl',
      ],
      examples: [
        'CheckboxInput',
        'CheckboxInput checked',
      ],
    } as CoreComponentDefinition,

    RadioInput: {
      name: 'RadioInput',
      category: 'form' as CoreComponentCategory,
      description: 'Radio-Button für Einfachauswahl in Gruppen.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        width: 18,
        height: 18,
        radius: 9,
        background: '$form.input',
        'border-width': 1,
        'border-color': '$form.border',
        cursor: 'pointer',
      },
      slots: [
        { name: 'Dot', description: 'Auswahl-Punkt', type: 'Box', defaultProperties: { width: 8, height: 8, radius: 4, background: 'white', hidden: true } },
      ],
      states: [
        { name: 'checked', description: 'Ausgewählt', properties: { background: '$primary.bg', 'border-color': '$primary.bg' }, childOverrides: [{ slot: 'Dot', properties: { hidden: false, visible: true } }] },
        { name: 'hover', description: 'Mouse-Over', properties: { 'border-color': '$form.muted' } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed' } },
      ],
      events: [
        { event: 'onclick', actions: ['activate self', 'deactivate-siblings'] },
      ],
      tokens: ['$form.input', '$form.border', '$form.muted', '$primary.bg'],
      usage: [
        'RadioInput in Gruppen für Einfachauswahl',
      ],
      examples: [
        'RadioInput',
        'RadioInput checked',
      ],
    } as CoreComponentDefinition,

    SwitchInput: {
      name: 'SwitchInput',
      category: 'form' as CoreComponentCategory,
      description: 'Toggle-Switch für An/Aus-Einstellungen.',
      properties: {
        _layout: 'horizontal',
        _align: 'center',
        width: 40,
        height: 22,
        radius: 11,
        background: '$form.border',
        cursor: 'pointer',
        padding: 2,
      },
      slots: [
        { name: 'Thumb', description: 'Schieberegler', type: 'Box', defaultProperties: { width: 18, height: 18, radius: 9, background: 'white' } },
      ],
      states: [
        { name: 'on', description: 'Eingeschaltet', properties: { background: '$primary.bg' }, childOverrides: [{ slot: 'Thumb', properties: { 'margin-left': 18 } }] },
        { name: 'off', description: 'Ausgeschaltet', properties: { background: '$form.border' }, childOverrides: [{ slot: 'Thumb', properties: { 'margin-left': 0 } }] },
        { name: 'hover', description: 'Mouse-Over', properties: { opacity: 0.9 } },
        { name: 'disabled', description: 'Deaktiviert', properties: { opacity: 0.5, cursor: 'not-allowed' } },
      ],
      events: [
        { event: 'onclick', actions: ['toggle-state self'] },
      ],
      tokens: ['$form.border', '$primary.bg'],
      usage: [
        'SwitchInput für Einstellungs-Toggles',
      ],
      examples: [
        'SwitchInput',
        'SwitchInput on',
      ],
    } as CoreComponentDefinition,

  } as Record<string, CoreComponentDefinition>,

  // ---------------------------------------------------------------------------
  // CORE TOKENS (Design Variables for Core Components)
  // ---------------------------------------------------------------------------
  coreTokens: {
    // Navigation Tokens
    '$nav.bg': { value: '#18181B', description: 'Navigation Hintergrund' },
    '$nav.hover': { value: '#27272A', description: 'Navigation Hover-Hintergrund' },
    '$nav.active': { value: '#3F3F46', description: 'Navigation Aktiv-Hintergrund' },
    '$nav.text': { value: '#D4D4D8', description: 'Navigation Text' },
    '$nav.muted': { value: '#71717A', description: 'Navigation gedämpfter Text/Icons' },
    '$nav.badge': { value: '#3F3F46', description: 'Navigation Badge-Hintergrund' },

    // Form Tokens
    '$form.bg': { value: '#18181B', description: 'Form Hintergrund' },
    '$form.input': { value: '#27272A', description: 'Input Hintergrund' },
    '$form.border': { value: '#3F3F46', description: 'Input Border' },
    '$form.focus': { value: '#3B82F6', description: 'Focus-Ring Farbe' },
    '$form.error': { value: '#EF4444', description: 'Fehler-Farbe' },
    '$form.success': { value: '#22C55E', description: 'Erfolgs-Farbe' },
    '$form.text': { value: '#D4D4D8', description: 'Form Text' },
    '$form.muted': { value: '#71717A', description: 'Form Placeholder/Helper' },
    '$form.label': { value: '#A1A1AA', description: 'Form Label Text' },
    '$form.placeholder': { value: '#52525B', description: 'Input Placeholder Text' },

    // Button Tokens
    '$primary.bg': { value: '#3B82F6', description: 'Primary Button Hintergrund' },
    '$primary.hover': { value: '#2563EB', description: 'Primary Button Hover' },
    '$primary.text': { value: '#FFFFFF', description: 'Primary Button Text' },
    '$secondary.bg': { value: '#27272A', description: 'Secondary Button Hintergrund' },
    '$secondary.hover': { value: '#3F3F46', description: 'Secondary Button Hover' },
    '$danger.bg': { value: '#EF4444', description: 'Danger Button Hintergrund' },
    '$danger.hover': { value: '#DC2626', description: 'Danger Button Hover' },
  } as Record<string, { value: string; description: string }>,

  // ---------------------------------------------------------------------------
  // PROPERTIES
  // ---------------------------------------------------------------------------
  properties: {
    // =========================================================================
    // LAYOUT PROPERTIES
    // =========================================================================
    horizontal: {
      name: 'horizontal',
      shortForms: ['hor'],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Horizontale Anordnung (row)',
      examples: ['horizontal', 'hor'],
      autocomplete: {
        syntax: 'horizontal',
        keywords: [
          'horizontal', 'nebeneinander', 'zeile', 'reihe', 'waagerecht', 'seitlich',
          'x-achse', 'row', 'inline', 'side by side', 'flex-row', 'hor', 'horz',
        ],
      },
    },

    vertical: {
      name: 'vertical',
      shortForms: ['ver', 'vert'],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Vertikale Anordnung (column) - Default',
      examples: ['vertical', 'ver'],
      autocomplete: {
        syntax: 'vertical',
        keywords: [
          'vertikal', 'untereinander', 'spalte', 'stapel', 'senkrecht', 'y-achse',
          'vertical', 'column', 'stack', 'top to bottom', 'flex-column', 'ver', 'vert',
        ],
      },
    },

    center: {
      name: 'center',
      shortForms: ['cen'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Beide Achsen zentrieren. In stacked-Layout: Kind zentriert positionieren.',
      examples: ['center', 'cen', 'Modal center  // In stacked-Parent'],
      notes: [
        'Normal: Zentriert Kinder horizontal und vertikal (justifyContent + alignItems)',
        'In stacked-Parent: Positioniert das Element selbst zentriert (justifySelf + alignSelf)',
      ],
      autocomplete: {
        syntax: 'center',
        keywords: [
          'zentrieren', 'mitte', 'mittig', 'zentriert', 'center', 'centered', 'middle',
        ],
      },
    },

    gap: {
      name: 'gap',
      shortForms: ['g'],
      category: 'layout' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Abstand zwischen Kindern',
      examples: ['gap 16', 'g 8'],
      autocomplete: {
        syntax: 'gap ',
        keywords: [
          'abstand', 'zwischenraum', 'lücke', 'spacing', 'gutter', 'space',
          'gap', 'row-gap', 'column-gap', 'g',
        ],
        valuePicker: 'spacing',
      },
    },

    spread: {
      name: 'spread',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Space-between Distribution',
      examples: ['spread'],
      autocomplete: {
        syntax: 'spread',
        keywords: [
          'verteilen', 'gleichmässig', 'auseinander', 'space between', 'justify',
        ],
      },
    },

    between: {
      name: 'between',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Space-between Distribution (Alias für spread)',
      examples: ['between'],
      autocomplete: {
        syntax: 'between',
        keywords: ['between', 'space-between', 'justify-between'],
      },
    },

    grow: {
      name: 'grow',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Flex-grow aktivieren',
      examples: ['grow'],
      autocomplete: {
        syntax: 'grow',
        keywords: [
          'wachsen', 'ausdehnen', 'füllen', 'expand', 'fill', 'stretch', 'flex-grow',
        ],
      },
    },

    shrink: {
      name: 'shrink',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Flex-shrink Wert',
      examples: ['shrink 0', 'shrink 1'],
      autocomplete: {
        syntax: 'shrink 0',
        keywords: ['schrumpfen', 'verkleinern', 'shrink', 'no shrink', 'flex-shrink'],
      },
    },

    'gap-col': {
      name: 'gap-col',
      shortForms: ['gap-x'],
      category: 'layout' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Horizontaler Spaltenabstand',
      examples: ['gap-col 16', 'gap-x 8'],
    },

    'gap-row': {
      name: 'gap-row',
      shortForms: ['gap-y'],
      category: 'layout' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Vertikaler Zeilenabstand',
      examples: ['gap-row 16', 'gap-y 8'],
    },

    wrap: {
      name: 'wrap',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Erlaubt Umbruch',
      examples: ['wrap'],
      autocomplete: {
        syntax: 'wrap',
        keywords: [
          'umbruch', 'umbrechen', 'mehrzeilig', 'wrap', 'multiline', 'flex-wrap',
        ],
      },
    },

    stacked: {
      name: 'stacked',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Layer-Layout: Kinder werden übereinander gestapelt wie transparente Folien. Ermöglicht intuitive Overlay-Patterns ohne Position-Hacks.',
      examples: [
        // Grundlegendes Beispiel
        'Box stacked\\n  Background\\n  Content',
        // Overlay-Pattern
        'App stacked\\n  MainContent width full, height full\\n  Overlay hidden, center',
        // Drawer-Pattern (Sidebar links)
        'App stacked, h 400\\n  MainContent ver, width full, height full\\n    Header\\n    Content\\n  Drawer hidden, stacked, width full, height full\\n    Backdrop width full, height full, bg #000, o 0.5\\n      onclick hide Drawer\\n    Sidebar left, ver, w 240, h full, bg #1a1a1a',
        // Modal-Pattern (zentriert)
        'App stacked\\n  Content\\n  Modal hidden, center\\n    Card pad 24, bg white, shadow lg',
        // Toast-Pattern (unten rechts)
        'App stacked\\n  Content\\n  Toast hidden, right, bottom\\n    Card pad 12, bg #333, col white',
      ],
      notes: [
        'Konzept: Stacked öffnet eine neue Layout-Schicht - wie transparente Folien übereinander',
        'Kinder-Positionierung: left/right/top/bottom positionieren das Kind innerhalb der Schicht',
        'left = Kind links, right = Kind rechts, top = Kind oben, bottom = Kind unten',
        'center = Kind zentriert (horizontal + vertikal)',
        'Kombinationen: "left, top" = oben links, "right, bottom" = unten rechts',
        'Verschachtelung: Innerhalb der Schicht kann wieder normales Flex-Layout verwendet werden',
        'Technisch: CSS Grid mit gridArea: "1 / 1" für alle Kinder',
        'Use Cases: Overlays, Modals, Drawers, Sidebars, Toasts, Tooltips, Backdrops',
      ],
      autocomplete: {
        syntax: 'stacked',
        keywords: [
          'stacked', 'layer', 'schicht', 'übereinander', 'overlay', 'drawer',
          'modal', 'dialog', 'popup', 'z-index', 'z-layers', 'backdrop',
        ],
      },
    },

    grid: {
      name: 'grid',
      shortForms: [],
      category: 'layout' as PropertyCategory,
      valueType: 'mixed' as ValueType,
      accepts: ['number', 'percentage', 'keyword'],
      keywords: ['auto'],
      description: 'Grid-Layout für Spalten',
      examples: ['grid 3', 'grid auto 250', 'grid 30% 70%'],
    },

    // =========================================================================
    // ALIGNMENT PROPERTIES
    // =========================================================================
    'horizontal-left': {
      name: 'horizontal-left',
      shortForms: ['hor-l', 'left'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Links ausrichten. In stacked-Layout: Kind links positionieren.',
      examples: ['left', 'horizontal-left', 'hor-l', 'Sidebar left, w 240  // In stacked-Parent'],
      notes: [
        'Normal: Richtet Kinder links aus (justifyContent/alignItems)',
        'In stacked-Parent: Positioniert das Element selbst links (justifySelf)',
      ],
      autocomplete: {
        syntax: 'hor-l',
        keywords: [
          'links', 'linksbündig', 'left', 'align left', 'justify-start', 'hor-l',
        ],
      },
    },

    'horizontal-center': {
      name: 'horizontal-center',
      shortForms: ['hor-cen', 'hor-center'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Horizontal zentrieren',
      examples: ['hor-center', 'horizontal-center'],
      autocomplete: {
        syntax: 'hor-cen',
        keywords: [
          'zentrieren', 'mitte', 'center', 'horizontal center', 'justify-center',
        ],
      },
    },

    'horizontal-right': {
      name: 'horizontal-right',
      shortForms: ['hor-r', 'right'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Rechts ausrichten. In stacked-Layout: Kind rechts positionieren.',
      examples: ['right', 'horizontal-right', 'hor-r', 'Toast right, bottom  // In stacked-Parent'],
      notes: [
        'Normal: Richtet Kinder rechts aus (justifyContent/alignItems)',
        'In stacked-Parent: Positioniert das Element selbst rechts (justifySelf)',
      ],
      autocomplete: {
        syntax: 'hor-r',
        keywords: [
          'rechts', 'rechtsbündig', 'right', 'align right', 'justify-end', 'hor-r',
        ],
      },
    },

    'vertical-top': {
      name: 'vertical-top',
      shortForms: ['ver-t', 'top'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Oben ausrichten. In stacked-Layout: Kind oben positionieren.',
      examples: ['top', 'vertical-top', 'ver-t', 'Banner top, width full  // In stacked-Parent'],
      notes: [
        'Normal: Richtet Kinder oben aus (alignItems)',
        'In stacked-Parent: Positioniert das Element selbst oben (alignSelf)',
      ],
      autocomplete: {
        syntax: 'ver-t',
        keywords: [
          'oben', 'obenbündig', 'top', 'align top', 'items-start', 'ver-t',
        ],
      },
    },

    'vertical-center': {
      name: 'vertical-center',
      shortForms: ['ver-cen', 'ver-center'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Vertikal zentrieren',
      examples: ['ver-center', 'vertical-center'],
      autocomplete: {
        syntax: 'ver-cen',
        keywords: [
          'vertikal zentrieren', 'vertical center', 'items-center', 'ver-cen',
        ],
      },
    },

    'vertical-bottom': {
      name: 'vertical-bottom',
      shortForms: ['ver-b', 'bottom'],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Unten ausrichten. In stacked-Layout: Kind unten positionieren.',
      examples: ['bottom', 'vertical-bottom', 'ver-b', 'Footer bottom, width full  // In stacked-Parent'],
      notes: [
        'Normal: Richtet Kinder unten aus (alignItems)',
        'In stacked-Parent: Positioniert das Element selbst unten (alignSelf)',
      ],
      autocomplete: {
        syntax: 'ver-b',
        keywords: [
          'unten', 'untenbündig', 'bottom', 'align bottom', 'items-end', 'ver-b',
        ],
      },
    },

    centered: {
      name: 'centered',
      shortForms: [],
      category: 'alignment' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Horizontale Zentrierung (margin auto)',
      examples: ['centered'],
    },

    // =========================================================================
    // SIZING PROPERTIES
    // =========================================================================
    width: {
      name: 'width',
      shortForms: ['w'],
      category: 'sizing' as PropertyCategory,
      valueType: 'mixed' as ValueType,
      accepts: ['number', 'percentage', 'keyword'],
      keywords: ['hug', 'full', 'min', 'max'],
      description: 'Breite',
      examples: ['width 300', 'width hug', 'width full', 'w 200'],
      autocomplete: {
        syntax: 'width ',
        keywords: [
          'breite', 'breit', 'width', 'horizontal size', 'wide', 'w',
        ],
      },
    },

    height: {
      name: 'height',
      shortForms: ['h'],
      category: 'sizing' as PropertyCategory,
      valueType: 'mixed' as ValueType,
      accepts: ['number', 'percentage', 'keyword'],
      keywords: ['hug', 'full', 'min', 'max'],
      description: 'Höhe',
      examples: ['height 400', 'height hug', 'height full', 'h 200'],
      autocomplete: {
        syntax: 'height ',
        keywords: [
          'höhe', 'hoch', 'height', 'vertical size', 'tall', 'h',
        ],
      },
    },

    size: {
      name: 'size',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'mixed' as ValueType,
      accepts: ['number', 'keyword'],
      keywords: ['hug', 'full'],
      description: 'Kombinierte Dimension (width height)',
      examples: ['size hug 32', 'size 100 200', 'size full'],
    },

    'min-width': {
      name: 'min-width',
      shortForms: ['minw'],
      category: 'sizing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'percentage'],
      description: 'Minimale Breite',
      examples: ['min-width 200', 'minw 100'],
      autocomplete: {
        syntax: 'min-width ',
        keywords: [
          'mindestbreite', 'min breite', 'minimum width', 'min width', 'minw',
        ],
      },
    },

    'max-width': {
      name: 'max-width',
      shortForms: ['maxw'],
      category: 'sizing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'percentage'],
      description: 'Maximale Breite',
      examples: ['max-width 800', 'maxw 600'],
      autocomplete: {
        syntax: 'max-width ',
        keywords: [
          'maximalbreite', 'max breite', 'maximum width', 'max width', 'maxw',
        ],
      },
    },

    'min-height': {
      name: 'min-height',
      shortForms: ['minh'],
      category: 'sizing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'percentage'],
      description: 'Minimale Höhe',
      examples: ['min-height 100', 'minh 50'],
      autocomplete: {
        syntax: 'min-height ',
        keywords: [
          'mindesthöhe', 'min höhe', 'minimum height', 'min height', 'minh',
        ],
      },
    },

    'max-height': {
      name: 'max-height',
      shortForms: ['maxh'],
      category: 'sizing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'percentage'],
      description: 'Maximale Höhe',
      examples: ['max-height 600', 'maxh 400'],
      autocomplete: {
        syntax: 'max-height ',
        keywords: [
          'maximalhöhe', 'max höhe', 'maximum height', 'max height', 'maxh',
        ],
      },
    },

    hug: {
      name: 'hug',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Fit-content (Standalone)',
      examples: ['hug'],
    },

    full: {
      name: 'full',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: '100% + flex-grow (Standalone)',
      examples: ['full'],
      autocomplete: {
        syntax: 'full',
        keywords: [
          'voll', 'vollständig', 'ausfüllen', 'full', 'full size', 'fill', 'stretch',
          '100%', 'w-full', 'h-full',
        ],
      },
    },

    'w-min': {
      name: 'w-min',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Width fit-content',
      examples: ['w-min'],
    },

    'w-max': {
      name: 'w-max',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Width 100% + flex-grow',
      examples: ['w-max'],
    },

    'h-min': {
      name: 'h-min',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Height fit-content',
      examples: ['h-min'],
    },

    'h-max': {
      name: 'h-max',
      shortForms: [],
      category: 'sizing' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Height 100% + flex-grow',
      examples: ['h-max'],
    },

    // =========================================================================
    // SPACING PROPERTIES
    // =========================================================================
    padding: {
      name: 'padding',
      shortForms: ['pad', 'p'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      directions: STANDARD_DIRECTIONS,
      cssShorthand: { minValues: 1, maxValues: 4, expansion: 'padding' },
      description: 'Innenabstand',
      examples: [
        'padding 16',
        'padding 16 12',
        'padding 16 12 8 4',
        'padding left 16',
        'padding top 8 bottom 24',
        'pad 12',
        'p 8',
      ],
      autocomplete: {
        syntax: 'padding ',
        keywords: [
          'padding', 'innenabstand', 'polster', 'inner space', 'internal spacing',
          'pad', 'p',
        ],
        valuePicker: 'spacing',
      },
    },

    'padding-top': {
      name: 'padding-top',
      shortForms: ['pt'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Padding oben',
      examples: ['padding-top 8', 'pt 16'],
      autocomplete: {
        syntax: 'padding top ',
        keywords: ['padding oben', 'padding top', 'top padding', 'pt'],
        valuePicker: 'spacing',
      },
    },

    'padding-bottom': {
      name: 'padding-bottom',
      shortForms: ['pb'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Padding unten',
      examples: ['padding-bottom 8', 'pb 16'],
      autocomplete: {
        syntax: 'padding bottom ',
        keywords: ['padding unten', 'padding bottom', 'bottom padding', 'pb'],
        valuePicker: 'spacing',
      },
    },

    'padding-left': {
      name: 'padding-left',
      shortForms: ['pl'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Padding links',
      examples: ['padding-left 8', 'pl 16'],
      autocomplete: {
        syntax: 'padding left ',
        keywords: ['padding links', 'padding left', 'left padding', 'pl'],
        valuePicker: 'spacing',
      },
    },

    'padding-right': {
      name: 'padding-right',
      shortForms: ['pr'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Padding rechts',
      examples: ['padding-right 8', 'pr 16'],
      autocomplete: {
        syntax: 'padding right ',
        keywords: ['padding rechts', 'padding right', 'right padding', 'pr'],
        valuePicker: 'spacing',
      },
    },

    margin: {
      name: 'margin',
      shortForms: ['mar', 'm'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      directions: STANDARD_DIRECTIONS,
      cssShorthand: { minValues: 1, maxValues: 4, expansion: 'padding' },
      description: 'Außenabstand',
      examples: [
        'margin 16',
        'margin top 8',
        'margin left-right 24',
        'mar 12',
        'm 8',
      ],
      autocomplete: {
        syntax: 'margin ',
        keywords: [
          'margin', 'aussenabstand', 'rand', 'outer space', 'external spacing',
          'mar', 'm',
        ],
        valuePicker: 'spacing',
      },
    },

    'margin-top': {
      name: 'margin-top',
      shortForms: ['mt'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Margin oben',
      examples: ['margin-top 8', 'mt 16'],
      autocomplete: {
        syntax: 'margin top ',
        keywords: ['margin oben', 'margin top', 'top margin', 'mt'],
        valuePicker: 'spacing',
      },
    },

    'margin-bottom': {
      name: 'margin-bottom',
      shortForms: ['mb'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Margin unten',
      examples: ['margin-bottom 8', 'mb 16'],
      autocomplete: {
        syntax: 'margin bottom ',
        keywords: ['margin unten', 'margin bottom', 'bottom margin', 'mb'],
        valuePicker: 'spacing',
      },
    },

    'margin-left': {
      name: 'margin-left',
      shortForms: ['ml'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Margin links',
      examples: ['margin-left 8', 'ml 16'],
      autocomplete: {
        syntax: 'margin left ',
        keywords: ['margin links', 'margin left', 'left margin', 'ml'],
        valuePicker: 'spacing',
      },
    },

    'margin-right': {
      name: 'margin-right',
      shortForms: ['mr'],
      category: 'spacing' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Margin rechts',
      examples: ['margin-right 8', 'mr 16'],
      autocomplete: {
        syntax: 'margin right ',
        keywords: ['margin rechts', 'margin right', 'right margin', 'mr'],
        valuePicker: 'spacing',
      },
    },

    // =========================================================================
    // COLOR PROPERTIES
    // =========================================================================
    color: {
      name: 'color',
      shortForms: ['col', 'c'],
      category: 'color' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token'],
      description: 'Textfarbe',
      examples: ['color #333', 'color $primary.col', 'col #FFF'],
      autocomplete: {
        syntax: 'color ',
        keywords: [
          'farbe', 'textfarbe', 'schriftfarbe', 'color', 'text color', 'font color',
          'foreground', 'col', 'c',
        ],
        valuePicker: 'color',
      },
    },

    background: {
      name: 'background',
      shortForms: ['bg'],
      category: 'color' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token', 'keyword'],
      keywords: ['transparent'],
      description: 'Hintergrundfarbe',
      examples: ['background #3B82F6', 'background $primary.bg', 'bg #333'],
      autocomplete: {
        syntax: 'background ',
        keywords: [
          'hintergrund', 'hintergrundfarbe', 'background', 'background color',
          'fill', 'backdrop', 'surface', 'bg',
        ],
        valuePicker: 'color',
      },
    },

    'border-color': {
      name: 'border-color',
      shortForms: ['boc'],
      category: 'color' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token'],
      description: 'Rahmenfarbe',
      examples: ['border-color #555', 'boc $grey-700'],
      autocomplete: {
        syntax: 'border-color ',
        keywords: [
          'rahmenfarbe', 'randfarbe', 'border color', 'stroke', 'boc',
        ],
        valuePicker: 'color',
      },
    },

    // =========================================================================
    // BORDER PROPERTIES
    // =========================================================================
    border: {
      name: 'border',
      shortForms: ['bor'],
      category: 'border' as PropertyCategory,
      valueType: 'compound' as ValueType,
      compound: {
        components: [
          { name: 'width', type: 'number', required: false, default: 1 },
          { name: 'style', type: 'enum', values: ['solid', 'dashed', 'dotted'], default: 'solid' },
          { name: 'color', type: 'color', required: false },
        ],
        order: 'any',
      },
      directions: STANDARD_DIRECTIONS,
      description: 'Rahmen',
      examples: [
        'border 1',
        'border 1 #333',
        'border 2 dashed #3B82F6',
        'border left 1',
        'border top 1 #555',
        'bor 1',
      ],
      autocomplete: {
        syntax: 'border ',
        keywords: [
          'rahmen', 'rand', 'linie', 'umrandung', 'border', 'outline', 'stroke',
          'bor',
        ],
      },
    },

    radius: {
      name: 'radius',
      shortForms: ['rad'],
      category: 'border' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      corners: STANDARD_CORNERS,
      cssShorthand: { minValues: 1, maxValues: 4, expansion: 'radius' },
      description: 'Eckenradius',
      examples: [
        'radius 8',
        'radius tl 8 br 8',
        'radius top-left 12',
        'rad 4',
      ],
      autocomplete: {
        syntax: 'radius ',
        keywords: [
          'radius', 'ecken', 'abrunden', 'rund', 'abgerundet', 'rounded', 'corner',
          'border-radius', 'rad',
        ],
        valuePicker: 'value',
      },
    },

    // =========================================================================
    // TYPOGRAPHY PROPERTIES
    // =========================================================================
    'text-size': {
      name: 'text-size',
      shortForms: ['fs', 'ts', 'font-size'],
      category: 'typography' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Schriftgröße (px)',
      examples: ['text-size 14', 'ts 12'],
      autocomplete: {
        syntax: 'size ',
        keywords: [
          'schriftgrösse', 'textgrösse', 'grösse', 'font size', 'text size',
          'fs', 'ts',
        ],
        valuePicker: 'value',
      },
    },

    'font-weight': {
      name: 'font-weight',
      shortForms: ['weight'],
      category: 'typography' as PropertyCategory,
      valueType: 'mixed' as ValueType,
      accepts: ['number', 'keyword'],
      keywords: ['bold', 'normal', 'light'],
      range: { min: 100, max: 900 },
      description: 'Schriftstärke',
      examples: ['font-weight 600', 'font-weight bold', 'weight bold'],
      autocomplete: {
        syntax: 'font-weight ',
        keywords: [
          'schriftstärke', 'fett', 'gewicht', 'font weight', 'bold', 'thickness',
        ],
        valuePicker: 'weight',
      },
    },

    'line-height': {
      name: 'line-height',
      shortForms: ['line'],
      category: 'typography' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Zeilenhöhe',
      examples: ['line-height 1.5', 'line-height 24', 'line 1.5'],
      autocomplete: {
        syntax: 'line-height ',
        keywords: [
          'zeilenhöhe', 'zeilenabstand', 'line height', 'line spacing', 'leading',
        ],
        valuePicker: 'value',
      },
    },

    'font-family': {
      name: 'font-family',
      shortForms: ['font'],
      category: 'typography' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Schriftart',
      examples: ['font-family "Inter"', 'font "SF Pro"'],
      autocomplete: {
        syntax: 'font-family ',
        keywords: [
          'schriftart', 'schrift', 'font', 'font family', 'typeface',
          'inter', 'roboto', 'helvetica', 'arial',
        ],
        valuePicker: 'font',
      },
    },

    'text-align': {
      name: 'text-align',
      shortForms: ['align'],
      category: 'typography' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['left', 'center', 'right', 'justify'],
      description: 'Textausrichtung',
      examples: ['text-align center', 'align right'],
    },

    italic: {
      name: 'italic',
      shortForms: [],
      category: 'typography' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Kursiv',
      examples: ['italic'],
    },

    underline: {
      name: 'underline',
      shortForms: [],
      category: 'typography' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Unterstrichen',
      examples: ['underline'],
    },

    truncate: {
      name: 'truncate',
      shortForms: [],
      category: 'typography' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Abschneiden mit Ellipsis',
      examples: ['truncate'],
      autocomplete: {
        syntax: 'truncate',
        keywords: [
          'abschneiden', 'kürzen', 'überlauf', 'truncate', 'ellipsis', 'dots',
        ],
      },
    },

    uppercase: {
      name: 'uppercase',
      shortForms: [],
      category: 'typography' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Großbuchstaben',
      examples: ['uppercase'],
      autocomplete: {
        syntax: 'uppercase',
        keywords: [
          'grossbuchstaben', 'versalien', 'uppercase', 'caps', 'capital',
        ],
      },
    },

    lowercase: {
      name: 'lowercase',
      shortForms: [],
      category: 'typography' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Kleinbuchstaben',
      examples: ['lowercase'],
    },

    // =========================================================================
    // ICON PROPERTIES
    // =========================================================================
    'icon-size': {
      name: 'icon-size',
      shortForms: ['is'],
      category: 'icon' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Icon-Größe (px)',
      examples: ['icon-size 20', 'is 24'],
    },

    'icon-weight': {
      name: 'icon-weight',
      shortForms: ['iw'],
      category: 'icon' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      range: { min: 100, max: 700 },
      description: 'Icon-Strichstärke (100-700, Standard: 400)',
      examples: ['icon-weight 300', 'iw 600'],
    },

    'icon-color': {
      name: 'icon-color',
      shortForms: ['ic'],
      category: 'icon' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token'],
      description: 'Icon-Farbe (überschreibt color)',
      examples: ['icon-color #3B82F6', 'ic $primary.col'],
    },

    fill: {
      name: 'fill',
      shortForms: [],
      category: 'icon' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Icon gefüllt (Material only)',
      examples: ['fill'],
    },

    material: {
      name: 'material',
      shortForms: [],
      category: 'icon' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Material Icons verwenden',
      examples: ['material'],
    },

    phosphor: {
      name: 'phosphor',
      shortForms: [],
      category: 'icon' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Phosphor Icons verwenden',
      examples: ['phosphor'],
    },

    // =========================================================================
    // VISUAL PROPERTIES
    // =========================================================================
    opacity: {
      name: 'opacity',
      shortForms: ['o', 'opa', 'op'],
      category: 'visual' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      range: { min: 0, max: 1 },
      description: 'Transparenz (0-1)',
      examples: ['opacity 0.5', 'o 0.8'],
      autocomplete: {
        syntax: 'opacity ',
        keywords: [
          'transparenz', 'durchsichtigkeit', 'opacity', 'transparent', 'alpha',
          'o', 'opa',
        ],
        valuePicker: 'value',
      },
    },

    shadow: {
      name: 'shadow',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'none'],
      description: 'Schatten',
      examples: ['shadow md', 'shadow lg'],
      autocomplete: {
        syntax: 'shadow ',
        keywords: [
          'schatten', 'schlagschatten', 'tiefe', 'shadow', 'drop shadow', 'elevation',
        ],
        valuePicker: 'shadow',
      },
    },

    cursor: {
      name: 'cursor',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
      description: 'Cursor-Stil',
      examples: ['cursor pointer', 'cursor grab'],
    },

    z: {
      name: 'z',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Z-Index',
      examples: ['z 10', 'z 100'],
    },

    hidden: {
      name: 'hidden',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Versteckt starten',
      examples: ['hidden'],
    },

    visible: {
      name: 'visible',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Sichtbarkeit',
      examples: ['visible'],
    },

    disabled: {
      name: 'disabled',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Deaktiviert',
      examples: ['disabled'],
    },

    rotate: {
      name: 'rotate',
      shortForms: ['rot'],
      category: 'visual' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Rotation in Grad',
      examples: ['rotate 45', 'rot 90'],
    },

    translate: {
      name: 'translate',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'compound' as ValueType,
      compound: {
        components: [
          { name: 'x', type: 'number', required: true },
          { name: 'y', type: 'number', required: false },
        ],
        order: 'strict',
      },
      description: 'X Y Verschiebung',
      examples: ['translate 10 20', 'translate 50'],
    },

    scale: {
      name: 'scale',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Skalierung (1 = normal)',
      examples: ['scale 0.98', 'scale 1.05'],
    },

    shortcut: {
      name: 'shortcut',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Keyboard Shortcut',
      examples: ['shortcut "cmd+s"', 'shortcut "ctrl+enter"'],
    },

    // =========================================================================
    // SCROLL PROPERTIES
    // =========================================================================
    scroll: {
      name: 'scroll',
      shortForms: [],
      category: 'scroll' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Vertikales Scrollen',
      examples: ['scroll'],
      autocomplete: {
        syntax: 'scroll',
        keywords: [
          'scrollen', 'scrollbar', 'überlauf', 'scroll', 'scrollable',
        ],
      },
    },

    'scroll-vertical': {
      name: 'scroll-vertical',
      shortForms: ['scroll-ver'],
      category: 'scroll' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Vertikales Scrollen',
      examples: ['scroll-vertical', 'scroll-ver'],
      autocomplete: {
        syntax: 'scroll-ver',
        keywords: [
          'vertikal scrollen', 'scroll vertical', 'vertical scroll', 'y scroll',
        ],
      },
    },

    'scroll-horizontal': {
      name: 'scroll-horizontal',
      shortForms: ['scroll-hor'],
      category: 'scroll' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Horizontales Scrollen',
      examples: ['scroll-horizontal', 'scroll-hor'],
      autocomplete: {
        syntax: 'scroll-hor',
        keywords: [
          'horizontal scrollen', 'scroll horizontal', 'horizontal scroll', 'x scroll',
        ],
      },
    },

    'scroll-both': {
      name: 'scroll-both',
      shortForms: [],
      category: 'scroll' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Beide Richtungen scrollen',
      examples: ['scroll-both'],
      autocomplete: {
        syntax: 'scroll-both',
        keywords: [
          'beide richtungen', 'scroll both', 'both directions',
        ],
      },
    },

    clip: {
      name: 'clip',
      shortForms: [],
      category: 'scroll' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Overflow hidden',
      examples: ['clip'],
      autocomplete: {
        syntax: 'clip',
        keywords: [
          'abschneiden', 'verstecken', 'clip', 'hidden', 'hide overflow',
        ],
      },
    },

    snap: {
      name: 'snap',
      shortForms: [],
      category: 'scroll' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Scroll Snapping aktivieren',
      examples: ['snap'],
      autocomplete: {
        syntax: 'snap',
        keywords: [
          'einrasten', 'snap', 'karussell', 'scroll snap', 'carousel',
        ],
      },
    },

    // =========================================================================
    // HOVER PROPERTIES
    // =========================================================================
    'hover-background': {
      name: 'hover-background',
      shortForms: ['hover-bg'],
      category: 'hover' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token'],
      description: 'Hover Hintergrund',
      examples: ['hover-background #555', 'hover-bg $primary.hover.bg'],
      autocomplete: {
        syntax: 'hover-background ',
        keywords: [
          'hover hintergrund', 'hover background', 'background on hover', 'hover-bg',
        ],
        valuePicker: 'color',
      },
    },

    'hover-color': {
      name: 'hover-color',
      shortForms: ['hover-col'],
      category: 'hover' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token'],
      description: 'Hover Textfarbe',
      examples: ['hover-color #FFF', 'hover-col $primary.col'],
      autocomplete: {
        syntax: 'hover-color ',
        keywords: [
          'hover textfarbe', 'hover text color', 'text on hover', 'hover-col',
        ],
        valuePicker: 'color',
      },
    },

    'hover-opacity': {
      name: 'hover-opacity',
      shortForms: ['hover-opa'],
      category: 'hover' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      range: { min: 0, max: 1 },
      description: 'Hover Transparenz',
      examples: ['hover-opacity 0.8', 'hover-opa 0.5'],
    },

    'hover-scale': {
      name: 'hover-scale',
      shortForms: [],
      category: 'hover' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Hover Skalierung',
      examples: ['hover-scale 1.05', 'hover-scale 1.1'],
    },

    'hover-border': {
      name: 'hover-border',
      shortForms: ['hover-bor'],
      category: 'hover' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Hover Rahmen',
      examples: ['hover-border 2', 'hover-bor 1'],
      autocomplete: {
        syntax: 'hover-border ',
        keywords: [
          'hover rahmen', 'hover border width', 'border on hover', 'hover-bor',
        ],
      },
    },

    'hover-border-color': {
      name: 'hover-border-color',
      shortForms: ['hover-boc'],
      category: 'hover' as PropertyCategory,
      valueType: 'color' as ValueType,
      accepts: ['color-hex', 'token'],
      description: 'Hover Rahmenfarbe',
      examples: ['hover-border-color #3B82F6', 'hover-boc $primary.col'],
      autocomplete: {
        syntax: 'hover-border-color ',
        keywords: [
          'hover rahmenfarbe', 'hover border color', 'hover-boc',
        ],
        valuePicker: 'color',
      },
    },

    'hover-radius': {
      name: 'hover-radius',
      shortForms: ['hover-rad'],
      category: 'hover' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number', 'token'],
      description: 'Hover Eckenradius',
      examples: ['hover-radius 12', 'hover-rad 8'],
    },

    // =========================================================================
    // FORM PROPERTIES
    // =========================================================================
    placeholder: {
      name: 'placeholder',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Platzhaltertext',
      examples: ['placeholder "Enter email..."'],
    },

    type: {
      name: 'type',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local'],
      description: 'Eingabetyp',
      examples: ['type email', 'type password'],
    },

    value: {
      name: 'value',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'mixed' as ValueType,
      accepts: ['number', 'token'],
      description: 'Wert',
      examples: ['value 50', 'value $item.count'],
    },

    min: {
      name: 'min',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Minimalwert',
      examples: ['min 0', 'min 1'],
    },

    max: {
      name: 'max',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Maximalwert',
      examples: ['max 100', 'max 10'],
    },

    step: {
      name: 'step',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Schrittweite',
      examples: ['step 1', 'step 0.1'],
    },

    rows: {
      name: 'rows',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Anzahl Zeilen (Textarea)',
      examples: ['rows 4', 'rows 10'],
    },

    segments: {
      name: 'segments',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Anzahl Segmente',
      examples: ['segments 4', 'segments 6'],
    },

    length: {
      name: 'length',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'number' as ValueType,
      accepts: ['number'],
      description: 'Länge (für Segment-Input)',
      examples: ['length 4', 'length 6'],
    },

    pattern: {
      name: 'pattern',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Input-Pattern (für Segment)',
      examples: ['pattern digits', 'pattern alpha'],
    },

    mask: {
      name: 'mask',
      shortForms: [],
      category: 'form' as PropertyCategory,
      valueType: 'boolean' as ValueType,
      description: 'Maskiert (versteckt Zeichen)',
      examples: ['mask'],
    },

    // =========================================================================
    // IMAGE PROPERTIES
    // =========================================================================
    src: {
      name: 'src',
      shortForms: [],
      category: 'image' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Bild-URL',
      examples: ['src "https://example.com/image.jpg"'],
      autocomplete: {
        syntax: 'src "',
        keywords: [
          'bild', 'quelle', 'bildquelle', 'image', 'source', 'url', 'picture',
        ],
      },
    },

    alt: {
      name: 'alt',
      shortForms: [],
      category: 'image' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Alternativtext',
      examples: ['alt "Description"'],
      autocomplete: {
        syntax: 'alt "',
        keywords: [
          'alternativtext', 'beschreibung', 'alt', 'alt text', 'accessibility',
        ],
      },
    },

    fit: {
      name: 'fit',
      shortForms: [],
      category: 'image' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['cover', 'contain', 'fill', 'none', 'scale-down'],
      description: 'Bild-Anpassung',
      examples: ['fit cover', 'fit contain'],
      autocomplete: {
        syntax: 'fit ',
        keywords: [
          'einpassen', 'skalieren', 'anpassen', 'fit', 'object fit', 'cover', 'contain',
        ],
        valuePicker: 'value',
      },
    },

    // =========================================================================
    // LINK PROPERTIES
    // =========================================================================
    href: {
      name: 'href',
      shortForms: [],
      category: 'link' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Link-URL',
      examples: ['href "/about"', 'href "https://example.com"'],
    },

    target: {
      name: 'target',
      shortForms: [],
      category: 'link' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['_blank', '_self', '_parent', '_top'],
      description: 'Link-Ziel',
      examples: ['target _blank'],
    },

    // =========================================================================
    // DATA PROPERTIES
    // =========================================================================
    data: {
      name: 'data',
      shortForms: [],
      category: 'data' as PropertyCategory,
      valueType: 'string' as ValueType,
      description: 'Data Binding an Collection',
      examples: ['data Tasks', 'data Tasks where done == false'],
    },

    pointer: {
      name: 'pointer',
      shortForms: [],
      category: 'visual' as PropertyCategory,
      valueType: 'enum' as ValueType,
      enumValues: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
      description: 'Pointer-Stil (alternative zu cursor)',
      examples: ['pointer pointer', 'pointer grab'],
    },
  } as Record<string, PropertyDefinition>,

  // ---------------------------------------------------------------------------
  // EVENTS
  // ---------------------------------------------------------------------------
  events: {
    onclick: {
      name: 'onclick',
      description: 'Klick-Event',
      supportsTiming: false,
      examples: ['onclick toggle', 'onclick show Modal'],
    },
    'onclick-outside': {
      name: 'onclick-outside',
      description: 'Klick außerhalb des Elements',
      supportsTiming: false,
      examples: ['onclick-outside close'],
    },
    'onclick-inside': {
      name: 'onclick-inside',
      description: 'Klick innerhalb des Elements',
      supportsTiming: false,
      examples: ['onclick-inside activate'],
    },
    onhover: {
      name: 'onhover',
      description: 'Hover-Event',
      supportsTiming: false,
      examples: ['onhover show Tooltip'],
    },
    onchange: {
      name: 'onchange',
      description: 'Wert geändert (nach Blur)',
      supportsTiming: true,
      examples: ['onchange validate'],
    },
    oninput: {
      name: 'oninput',
      description: 'Während Eingabe',
      supportsTiming: true,
      examples: ['oninput debounce 300 filter Results'],
    },
    onload: {
      name: 'onload',
      description: 'Komponente geladen',
      supportsTiming: false,
      examples: ['onload activate'],
    },
    onfocus: {
      name: 'onfocus',
      description: 'Fokus erhalten',
      supportsTiming: false,
      examples: ['onfocus show Hint'],
    },
    onblur: {
      name: 'onblur',
      description: 'Fokus verloren',
      supportsTiming: true,
      examples: ['onblur delay 200 hide Results'],
    },
    onkeydown: {
      name: 'onkeydown',
      description: 'Taste gedrückt',
      keyModifiers: [
        'escape', 'enter', 'tab', 'space',
        'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
        'backspace', 'delete', 'home', 'end',
      ],
      supportsTiming: false,
      examples: [
        'onkeydown escape: close',
        'onkeydown enter: select highlighted',
        'onkeydown arrow-down: highlight next',
      ],
    },
    onkeyup: {
      name: 'onkeyup',
      description: 'Taste losgelassen',
      keyModifiers: [
        'escape', 'enter', 'tab', 'space',
        'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
        'backspace', 'delete', 'home', 'end',
      ],
      supportsTiming: false,
      examples: ['onkeyup enter: submit'],
    },
    onsubmit: {
      name: 'onsubmit',
      description: 'Formular absenden',
      supportsTiming: false,
      examples: ['onsubmit validate'],
    },
    onopen: {
      name: 'onopen',
      description: 'Overlay/Dialog geöffnet',
      supportsTiming: false,
      examples: ['onopen focus SearchInput'],
    },
    onclose: {
      name: 'onclose',
      description: 'Overlay/Dialog geschlossen',
      supportsTiming: false,
      examples: ['onclose reset'],
    },
    onfill: {
      name: 'onfill',
      description: 'Segment gefüllt',
      supportsTiming: false,
      examples: ['onfill focus next'],
    },
    oncomplete: {
      name: 'oncomplete',
      description: 'Alle Segmente gefüllt',
      supportsTiming: false,
      examples: ['oncomplete validate'],
    },
    onempty: {
      name: 'onempty',
      description: 'Segment geleert',
      supportsTiming: false,
      examples: ['onempty focus prev'],
    },
  } as Record<string, EventDefinition>,

  // ---------------------------------------------------------------------------
  // ACTIONS
  // ---------------------------------------------------------------------------
  actions: {
    // Visibility
    toggle: {
      name: 'toggle',
      description: 'Toggle-State wechseln',
      syntax: 'toggle',
      examples: ['onclick toggle'],
    },
    show: {
      name: 'show',
      description: 'Element anzeigen',
      validTargets: ['self', 'named'],
      supportsAnimation: true,
      syntax: 'show Target [animation]',
      examples: ['show Modal', 'show Dropdown fade'],
    },
    hide: {
      name: 'hide',
      description: 'Element verstecken',
      validTargets: ['self', 'named'],
      supportsAnimation: true,
      syntax: 'hide Target [animation]',
      examples: ['hide Modal', 'hide Tooltip fade'],
    },
    open: {
      name: 'open',
      description: 'Overlay öffnen (relativ zu Referenz-Element)',
      validTargets: ['named'],
      supportsAnimation: true,
      supportsPosition: true,
      syntax: 'open Target position-of Reference [animation] [duration]',
      examples: [
        'open Dropdown below-of self',
        'open Tooltip above-of EmailInput',
        'open Modal center fade 300',
        'open Submenu right-of MenuItem slide-right',
      ],
    },
    close: {
      name: 'close',
      description: 'Overlay schließen',
      supportsAnimation: true,
      syntax: 'close [animation]',
      examples: ['close', 'close fade'],
    },
    page: {
      name: 'page',
      description: 'Zu Seite wechseln',
      validTargets: ['named'],
      syntax: 'page PageName',
      examples: ['page Home', 'page Settings'],
    },

    // State Changes
    change: {
      name: 'change',
      description: 'State ändern',
      syntax: 'change self to State',
      examples: ['change self to active', 'change self to expanded'],
    },
    activate: {
      name: 'activate',
      description: 'Element aktivieren',
      validTargets: ['self', 'named'],
      syntax: 'activate [Target]',
      examples: ['activate', 'activate Tab1'],
    },
    deactivate: {
      name: 'deactivate',
      description: 'Element deaktivieren',
      validTargets: ['self', 'named'],
      syntax: 'deactivate [Target]',
      examples: ['deactivate', 'deactivate Tab1'],
    },
    'deactivate-siblings': {
      name: 'deactivate-siblings',
      description: 'Geschwister deaktivieren',
      syntax: 'deactivate-siblings',
      examples: ['onclick activate, deactivate-siblings'],
    },
    'toggle-state': {
      name: 'toggle-state',
      description: 'State umschalten',
      syntax: 'toggle-state',
      examples: ['onclick toggle-state'],
    },

    // Selection & Highlight
    highlight: {
      name: 'highlight',
      description: 'Element hervorheben',
      validTargets: ['self', 'next', 'prev', 'first', 'last', 'self-and-before', 'none'],
      syntax: 'highlight Target',
      examples: [
        'highlight next',
        'highlight prev',
        'highlight first',
        'highlight self-and-before',
      ],
    },
    select: {
      name: 'select',
      description: 'Element auswählen',
      validTargets: ['self', 'highlighted', 'all'],
      syntax: 'select Target',
      examples: ['select highlighted', 'select self'],
    },
    deselect: {
      name: 'deselect',
      description: 'Auswahl aufheben',
      validTargets: ['self', 'all'],
      syntax: 'deselect [Target]',
      examples: ['deselect', 'deselect all'],
    },
    'deselect-siblings': {
      name: 'deselect-siblings',
      description: 'Geschwister deselektieren',
      syntax: 'deselect-siblings',
      examples: ['onclick select, deselect-siblings'],
    },
    'clear-selection': {
      name: 'clear-selection',
      description: 'Alle Auswahlen löschen',
      syntax: 'clear-selection',
      examples: ['clear-selection'],
    },
    filter: {
      name: 'filter',
      description: 'Liste filtern',
      validTargets: ['named'],
      syntax: 'filter Target',
      examples: ['oninput debounce 300 filter Results'],
    },

    // Assignments & Forms
    assign: {
      name: 'assign',
      description: 'Variable zuweisen',
      syntax: 'assign $var to expr',
      examples: [
        'assign $selected to $item',
        'assign $count to $count + 1',
      ],
    },
    validate: {
      name: 'validate',
      description: 'Formular validieren',
      validTargets: ['self', 'named'],
      syntax: 'validate [Target]',
      examples: ['validate', 'validate Form'],
    },
    reset: {
      name: 'reset',
      description: 'Formular zurücksetzen',
      validTargets: ['self', 'named'],
      syntax: 'reset [Target]',
      examples: ['reset', 'reset Form'],
    },
    focus: {
      name: 'focus',
      description: 'Fokus setzen',
      validTargets: ['self', 'named', 'next', 'prev', 'first', 'first-empty'],
      syntax: 'focus Target',
      examples: ['focus SearchInput', 'focus next', 'focus first-empty'],
    },
    alert: {
      name: 'alert',
      description: 'Alert anzeigen',
      syntax: 'alert "message"',
      examples: ['alert "Saved successfully"'],
    },

    // JavaScript Integration
    call: {
      name: 'call',
      description: 'Externe JavaScript-Funktion aufrufen',
      syntax: 'call functionName',
      examples: ['onclick call handleLogin'],
    },

    // Syntax keywords used with actions (included for ACTION_KEYWORDS compatibility)
    to: {
      name: 'to',
      description: 'Zuweisungsziel (verwendet mit change/assign)',
      syntax: 'change self to State / assign $var to value',
      examples: ['change self to active', 'assign $selected to $item'],
    },
  } as Record<string, ActionDefinition>,

  // ---------------------------------------------------------------------------
  // STATES
  // ---------------------------------------------------------------------------
  states: {
    // System States - automatically bound to browser pseudo-classes
    hover: {
      name: 'hover',
      type: 'system' as const,
      description: 'Maus über Element',
      cssMapping: ':hover',
    },
    focus: {
      name: 'focus',
      type: 'system' as const,
      description: 'Element hat Fokus',
      cssMapping: ':focus',
    },
    active: {
      name: 'active',
      type: 'system' as const,
      description: 'Element ist aktiv (gedrückt)',
      cssMapping: ':active',
    },
    disabled: {
      name: 'disabled',
      type: 'system' as const,
      description: 'Element ist deaktiviert',
      cssMapping: ':disabled',
    },

    // Behavior States - activated by actions
    highlighted: {
      name: 'highlighted',
      type: 'behavior' as const,
      description: 'Hervorgehoben (via highlight)',
      triggeredBy: 'highlight',
    },
    selected: {
      name: 'selected',
      type: 'behavior' as const,
      description: 'Ausgewählt (via select)',
      triggeredBy: 'select',
    },
    // Note: 'active' is also a system state, but can be used as behavior state
    'active-behavior': {
      name: 'active',
      type: 'behavior' as const,
      description: 'Aktiv (via activate)',
      triggeredBy: 'activate',
    },
    inactive: {
      name: 'inactive',
      type: 'behavior' as const,
      description: 'Inaktiv',
      triggeredBy: 'deactivate',
    },
    expanded: {
      name: 'expanded',
      type: 'behavior' as const,
      description: 'Ausgeklappt',
      triggeredBy: 'change',
    },
    collapsed: {
      name: 'collapsed',
      type: 'behavior' as const,
      description: 'Eingeklappt',
      triggeredBy: 'change',
    },
    valid: {
      name: 'valid',
      type: 'behavior' as const,
      description: 'Eingabe valide',
      triggeredBy: 'validate',
    },
    invalid: {
      name: 'invalid',
      type: 'behavior' as const,
      description: 'Eingabe invalide',
      triggeredBy: 'validate',
    },
    default: {
      name: 'default',
      type: 'behavior' as const,
      description: 'Initialzustand',
    },
    on: {
      name: 'on',
      type: 'behavior' as const,
      description: 'Toggle an',
      triggeredBy: 'toggle',
    },
    off: {
      name: 'off',
      type: 'behavior' as const,
      description: 'Toggle aus',
      triggeredBy: 'toggle',
    },
  } as Record<string, StateDefinition>,

  // ---------------------------------------------------------------------------
  // ANIMATIONS
  // ---------------------------------------------------------------------------
  animations: {
    // Transition Animations
    fade: {
      name: 'fade',
      type: 'transition' as const,
      description: 'Ein-/Ausblenden (opacity)',
      defaultDuration: 200,
      examples: ['show fade', 'hide fade 150'],
    },
    scale: {
      name: 'scale',
      type: 'transition' as const,
      description: 'Skalieren',
      defaultDuration: 200,
      examples: ['show scale', 'hide scale 150'],
    },
    'slide-up': {
      name: 'slide-up',
      type: 'transition' as const,
      description: 'Von unten einblenden',
      defaultDuration: 200,
      examples: ['show slide-up', 'open Modal slide-up 300'],
    },
    'slide-down': {
      name: 'slide-down',
      type: 'transition' as const,
      description: 'Von oben einblenden',
      defaultDuration: 200,
      examples: ['show slide-down'],
    },
    'slide-left': {
      name: 'slide-left',
      type: 'transition' as const,
      description: 'Von rechts einblenden',
      defaultDuration: 200,
      examples: ['show slide-left'],
    },
    'slide-right': {
      name: 'slide-right',
      type: 'transition' as const,
      description: 'Von links einblenden',
      defaultDuration: 200,
      examples: ['show slide-right'],
    },
    none: {
      name: 'none',
      type: 'transition' as const,
      description: 'Keine Animation',
      defaultDuration: 0,
      examples: ['show none'],
    },

    // Continuous Animations
    spin: {
      name: 'spin',
      type: 'continuous' as const,
      description: 'Rotation (kontinuierlich)',
      defaultDuration: 1000,
      examples: ['animate spin 1000'],
    },
    pulse: {
      name: 'pulse',
      type: 'continuous' as const,
      description: 'Pulsieren',
      defaultDuration: 800,
      examples: ['animate pulse 800'],
    },
    bounce: {
      name: 'bounce',
      type: 'continuous' as const,
      description: 'Hüpfen',
      defaultDuration: 800,
      examples: ['animate bounce'],
    },
  } as Record<string, AnimationDefinition>,

  // ---------------------------------------------------------------------------
  // KEYWORDS
  // ---------------------------------------------------------------------------
  keywords: {
    // Control Flow
    if: { name: 'if', category: 'control' as const, description: 'Bedingung' },
    then: { name: 'then', category: 'control' as const, description: 'Dann-Zweig' },
    else: { name: 'else', category: 'control' as const, description: 'Sonst-Zweig' },
    not: { name: 'not', category: 'control' as const, description: 'Negation' },
    and: { name: 'and', category: 'control' as const, description: 'Logisches UND' },
    or: { name: 'or', category: 'control' as const, description: 'Logisches ODER' },
    each: { name: 'each', category: 'control' as const, description: 'Iterator' },
    in: { name: 'in', category: 'control' as const, description: 'In Collection' },
    where: { name: 'where', category: 'control' as const, description: 'Filter-Bedingung' },

    // Timing
    debounce: { name: 'debounce', category: 'timing' as const, description: 'Verzögert bis N ms nach letztem Event' },
    delay: { name: 'delay', category: 'timing' as const, description: 'Verzögert um N ms' },

    // Targets
    self: { name: 'self', category: 'target' as const, description: 'Das aktuelle Element' },
    next: { name: 'next', category: 'target' as const, description: 'Nächstes Element' },
    prev: { name: 'prev', category: 'target' as const, description: 'Vorheriges Element' },
    first: { name: 'first', category: 'target' as const, description: 'Erstes Element' },
    last: { name: 'last', category: 'target' as const, description: 'Letztes Element' },
    'first-empty': { name: 'first-empty', category: 'target' as const, description: 'Erstes leeres Element' },
    highlighted: { name: 'highlighted', category: 'target' as const, description: 'Hervorgehobenes Element' },
    selected: { name: 'selected', category: 'target' as const, description: 'Ausgewähltes Element' },
    'self-and-before': { name: 'self-and-before', category: 'target' as const, description: 'Selbst und alle davor' },
    all: { name: 'all', category: 'target' as const, description: 'Alle Elemente' },
    'none': { name: 'none', category: 'target' as const, description: 'Kein Element' },

    // Positions (Trigger-relative with -of suffix)
    'below-of': { name: 'below-of', category: 'position' as const, description: 'Unterhalb des Referenz-Elements (open Dropdown below-of self)' },
    'above-of': { name: 'above-of', category: 'position' as const, description: 'Oberhalb des Referenz-Elements (open Tooltip above-of Input)' },
    'left-of': { name: 'left-of', category: 'position' as const, description: 'Links vom Referenz-Element (open Submenu left-of MenuItem)' },
    'right-of': { name: 'right-of', category: 'position' as const, description: 'Rechts vom Referenz-Element (open Submenu right-of MenuItem)' },
    center: { name: 'center', category: 'position' as const, description: 'Zentriert im Viewport (Modal-Style)' },
    // Legacy forms (deprecated, use -of suffix instead)
    below: { name: 'below', category: 'position' as const, description: '[Deprecated: use below-of] Unterhalb des Triggers' },
    above: { name: 'above', category: 'position' as const, description: '[Deprecated: use above-of] Oberhalb des Triggers' },
    left: { name: 'left', category: 'position' as const, description: '[Deprecated: use left-of] Links vom Trigger' },
    right: { name: 'right', category: 'position' as const, description: '[Deprecated: use right-of] Rechts vom Trigger' },
    cen: { name: 'cen', category: 'position' as const, description: 'Zentriert (Kurzform für center)' },

    // Syntax
    from: { name: 'from', category: 'syntax' as const, description: 'Vererbung' },
    as: { name: 'as', category: 'syntax' as const, description: 'Inline Define + Render' },
    named: { name: 'named', category: 'syntax' as const, description: 'Benannte Instanz' },
    state: { name: 'state', category: 'syntax' as const, description: 'State-Block' },
    events: { name: 'events', category: 'syntax' as const, description: 'Events-Block' },
    to: { name: 'to', category: 'syntax' as const, description: 'Zuweisungsziel' },
  } as Record<string, KeywordDefinition>,

  // ---------------------------------------------------------------------------
  // SYNTAX PATTERNS (Advanced Instance Syntax)
  // ---------------------------------------------------------------------------
  syntaxPatterns: {
    // State Activation on Instances
    stateActivation: {
      description: 'Behavior States können direkt auf Instanzen aktiviert werden',
      syntax: 'Component stateName',
      examples: [
        'ToggleNav expanded     // Startet im expanded State',
        'Toggle on              // Startet im on State',
        'Card selected          // Startet im selected State',
      ],
      notes: [
        'Nur Behavior States (expanded, collapsed, on, off, selected, etc.)',
        'System States (hover, focus, disabled) werden NICHT unterstützt',
        'Die Komponente muss den State definiert haben',
      ],
    },
    // Named Children for State Overrides
    namedChildren: {
      description: 'Named Children ermöglichen State-Overrides für Kind-Elemente',
      syntax: 'Component named Name, properties',
      examples: [
        'Icon named Arrow, "chevron-left"    // Named child in Definition',
        'state expanded\\n  Arrow "chevron-left"  // Override in State',
        'state collapsed\\n  Arrow "chevron-right"',
      ],
      notes: [
        'Nur direkte Kinder können in States überschrieben werden',
        'named gibt dem Kind einen referenzierbaren Namen',
        'In States wird der Name ohne "Icon" verwendet (nur "Arrow")',
      ],
    },
    // Child Overrides via Semicolon
    childOverrides: {
      description: 'Semicolon-Syntax für Kind-Overrides auf Instanzen',
      syntax: 'Component childName "content"; childName2 property',
      examples: [
        'NavItem Icon "home"; Label "Dashboard"',
        'Button icon "check"; label "Save"',
      ],
      notes: [
        'Semikolon trennt Kind-Overrides',
        'Funktioniert für Slots und Named Children',
      ],
    },
  },

  // ---------------------------------------------------------------------------
  // PRIMITIVES
  // ---------------------------------------------------------------------------
  primitives: [
    'Input',
    'Textarea',
    'Image',
    'Link',
    'Button',
    'Segment',
    'Icon',
  ],

  // ---------------------------------------------------------------------------
  // BORDER STYLES
  // ---------------------------------------------------------------------------
  borderStyles: ['solid', 'dashed', 'dotted'],

  // ---------------------------------------------------------------------------
  // CATEGORY ORDER (for autocomplete display)
  // ---------------------------------------------------------------------------
  categoryOrder: [
    'Layout',
    'Alignment',
    'Spacing',
    'Size',
    'Colors',
    'Border',
    'Typography',
    'Image',
    'Overflow',
    'Hover',
    'Icon',
    'Effects',
  ],
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get property definition by canonical (long) name only.
 * Use this in the Parser - it only accepts normalized names.
 */
export function getPropertyDefinition(name: string): PropertyDefinition | undefined {
  return MIRROR_SCHEMA.properties[name]
}

/**
 * Resolve a property name (short or long) to its canonical long form.
 * Use this in the Preprocessor to normalize short forms.
 * Returns undefined if not a valid property name.
 */
export function resolvePropertyName(name: string): string | undefined {
  // Direct match = already canonical
  if (MIRROR_SCHEMA.properties[name]) {
    return name
  }
  // Search in short forms
  for (const [longName, propDef] of Object.entries(MIRROR_SCHEMA.properties)) {
    if (propDef.shortForms.includes(name)) {
      return longName
    }
  }
  return undefined
}

/**
 * Get property definition by short or long name.
 * Use this only where both forms need to be recognized (e.g., validation, autocomplete).
 */
export function getPropertyDefinitionByAnyName(name: string): PropertyDefinition | undefined {
  const canonical = resolvePropertyName(name)
  return canonical ? MIRROR_SCHEMA.properties[canonical] : undefined
}

/**
 * Normalize property name to canonical (long) form
 */
export function normalizePropertyName(name: string): string {
  const def = getPropertyDefinition(name)
  return def ? def.name : name
}

/**
 * Build a mapping from short forms to canonical (long) names
 */
export function buildShortToLongMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [name, def] of Object.entries(MIRROR_SCHEMA.properties)) {
    for (const short of def.shortForms) {
      map.set(short, name)
    }
  }
  return map
}

/**
 * Build a mapping from all forms (short and long) to definitions
 */
export function buildPropertyMap(): Map<string, PropertyDefinition> {
  const map = new Map<string, PropertyDefinition>()
  for (const [name, def] of Object.entries(MIRROR_SCHEMA.properties)) {
    map.set(name, def)
    for (const short of def.shortForms) {
      map.set(short, def)
    }
  }
  return map
}

/**
 * Get all property names (long forms only)
 */
export function getAllPropertyNames(): string[] {
  return Object.keys(MIRROR_SCHEMA.properties)
}

/**
 * Get all forms (short and long) for a property
 */
export function getAllFormsForProperty(name: string): string[] {
  const def = getPropertyDefinition(name)
  if (!def) return [name]
  return [def.name, ...def.shortForms]
}

/**
 * Check if a property supports directions (accepts short forms)
 */
export function supportsDirections(name: string): boolean {
  const def = getPropertyDefinitionByAnyName(name)
  return def?.directions?.supported ?? false
}

/**
 * Check if a property supports corners (accepts short forms)
 */
export function supportsCorners(name: string): boolean {
  const def = getPropertyDefinitionByAnyName(name)
  return def?.corners?.supported ?? false
}

/**
 * Get properties by category
 */
export function getPropertiesByCategory(category: PropertyCategory): PropertyDefinition[] {
  return Object.values(MIRROR_SCHEMA.properties).filter((def) => def.category === category)
}

// =============================================================================
// COMPONENT HELPERS
// =============================================================================

/**
 * Get component definition by name or alias
 */
export function getComponentDefinition(name: string): ComponentDefinition | undefined {
  // Direct lookup
  if (MIRROR_SCHEMA.components[name]) {
    return MIRROR_SCHEMA.components[name]
  }
  // Search by alias
  for (const comp of Object.values(MIRROR_SCHEMA.components)) {
    if (comp.aliases.includes(name)) {
      return comp
    }
  }
  return undefined
}

/**
 * Get all known component names (including aliases)
 */
export function getAllComponentNames(): string[] {
  const names: string[] = []
  for (const comp of Object.values(MIRROR_SCHEMA.components)) {
    names.push(comp.name, ...comp.aliases)
  }
  return names
}

/**
 * Check if a property is forbidden for a component
 * Returns the error message if forbidden, undefined otherwise
 */
export function isForbiddenProperty(componentName: string, propertyName: string): string | undefined {
  const comp = getComponentDefinition(componentName)
  if (!comp || !comp.forbiddenProperties) return undefined
  return comp.forbiddenProperties[propertyName]
}

/**
 * Check if a property is allowed for a component
 */
export function isPropertyAllowedForComponent(componentName: string, propertyName: string): boolean {
  const comp = getComponentDefinition(componentName)
  if (!comp) return true // Unknown component = allow all (custom component)

  // Check if explicitly forbidden
  if (comp.forbiddenProperties && propertyName in comp.forbiddenProperties) {
    return false
  }

  // Check if explicitly allowed
  if (comp.allowedProperties?.includes(propertyName)) {
    return true
  }

  // Check by category
  const propDef = getPropertyDefinitionByAnyName(propertyName)
  if (!propDef) return true // Unknown property = will be caught elsewhere

  return comp.allowedCategories.includes(propDef.category)
}

/**
 * Find a similar component name (for typo correction)
 */
export function findSimilarComponent(name: string): string | undefined {
  const allNames = getAllComponentNames()
  const nameLower = name.toLowerCase()

  // Exact match (case-insensitive)
  const exact = allNames.find((n) => n.toLowerCase() === nameLower)
  if (exact) return exact

  // Levenshtein distance (simple implementation)
  let bestMatch: string | undefined
  let bestDistance = Infinity

  for (const candidate of allNames) {
    const distance = levenshteinDistance(nameLower, candidate.toLowerCase())
    if (distance < bestDistance && distance <= 2) {
      // Max 2 edits
      bestDistance = distance
      bestMatch = candidate
    }
  }

  return bestMatch
}

/**
 * Simple Levenshtein distance implementation
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Find a similar property name (for typo correction)
 */
export function findSimilarProperty(name: string): string | undefined {
  const allNames = getAllPropertyNames()
  const nameLower = name.toLowerCase()

  // Check for short forms
  const resolved = resolvePropertyName(name)
  if (resolved) return resolved

  // Levenshtein distance
  let bestMatch: string | undefined
  let bestDistance = Infinity

  for (const candidate of allNames) {
    const distance = levenshteinDistance(nameLower, candidate.toLowerCase())
    if (distance < bestDistance && distance <= 2) {
      bestDistance = distance
      bestMatch = candidate
    }
  }

  return bestMatch
}

/**
 * Get event definition by name
 */
export function getEventDefinition(name: string): EventDefinition | undefined {
  return MIRROR_SCHEMA.events[name]
}

/**
 * Get action definition by name
 */
export function getActionDefinition(name: string): ActionDefinition | undefined {
  return MIRROR_SCHEMA.actions[name]
}

/**
 * Get state definition by name
 */
export function getStateDefinition(name: string): StateDefinition | undefined {
  return MIRROR_SCHEMA.states[name]
}

/**
 * Get animation definition by name
 */
export function getAnimationDefinition(name: string): AnimationDefinition | undefined {
  return MIRROR_SCHEMA.animations[name]
}

/**
 * Get keyword definition by name
 */
export function getKeywordDefinition(name: string): KeywordDefinition | undefined {
  return MIRROR_SCHEMA.keywords[name]
}

/**
 * Check if a name is a valid event
 */
export function isValidEvent(name: string): boolean {
  return name in MIRROR_SCHEMA.events
}

/**
 * Check if a name is a valid action
 */
export function isValidAction(name: string): boolean {
  return name in MIRROR_SCHEMA.actions
}

/**
 * Check if a name is a valid state
 */
export function isValidState(name: string): boolean {
  return name in MIRROR_SCHEMA.states
}

/**
 * Check if a name is a valid animation
 */
export function isValidAnimation(name: string): boolean {
  return name in MIRROR_SCHEMA.animations
}

/**
 * Check if a name is a valid keyword
 */
export function isValidKeyword(name: string): boolean {
  return name in MIRROR_SCHEMA.keywords
}

/**
 * Check if a name is a valid property (long or short form)
 */
export function isValidProperty(name: string): boolean {
  return getPropertyDefinition(name) !== undefined
}

/**
 * Check if a name is a system state
 */
export function isSystemState(name: string): boolean {
  const state = MIRROR_SCHEMA.states[name]
  return state?.type === 'system'
}

/**
 * Check if a name is a behavior state
 */
export function isBehaviorState(name: string): boolean {
  const state = MIRROR_SCHEMA.states[name]
  return state?.type === 'behavior'
}

/**
 * Get all system states
 */
export function getSystemStates(): string[] {
  return Object.entries(MIRROR_SCHEMA.states)
    .filter(([, def]) => def.type === 'system')
    .map(([name]) => name)
}

/**
 * Get all behavior states
 */
export function getBehaviorStates(): string[] {
  return Object.entries(MIRROR_SCHEMA.states)
    .filter(([, def]) => def.type === 'behavior')
    .map(([, def]) => def.name)  // Use name field, not key (for 'active-behavior' -> 'active')
}

/**
 * Get all transition animations
 */
export function getTransitionAnimations(): string[] {
  return Object.entries(MIRROR_SCHEMA.animations)
    .filter(([, def]) => def.type === 'transition')
    .map(([name]) => name)
}

/**
 * Get all continuous animations
 */
export function getContinuousAnimations(): string[] {
  return Object.entries(MIRROR_SCHEMA.animations)
    .filter(([, def]) => def.type === 'continuous')
    .map(([name]) => name)
}

/**
 * Get all keywords by category
 */
export function getKeywordsByCategory(category: KeywordDefinition['category']): string[] {
  return Object.entries(MIRROR_SCHEMA.keywords)
    .filter(([, def]) => def.category === category)
    .map(([name]) => name)
}

/**
 * Get all valid targets for actions
 */
export function getAllActionTargets(): string[] {
  return getKeywordsByCategory('target')
}

/**
 * Get all valid positions for overlays
 */
export function getAllPositions(): string[] {
  return getKeywordsByCategory('position')
}

// =============================================================================
// CORE COMPONENT HELPERS
// =============================================================================

/**
 * Get a core component definition by name
 */
export function getCoreComponentDefinition(name: string): CoreComponentDefinition | undefined {
  return MIRROR_SCHEMA.coreComponents[name]
}

/**
 * Get all core component names
 */
export function getAllCoreComponentNames(): string[] {
  return Object.keys(MIRROR_SCHEMA.coreComponents)
}

/**
 * Get core components by category
 */
export function getCoreComponentsByCategory(category: CoreComponentCategory): CoreComponentDefinition[] {
  return Object.values(MIRROR_SCHEMA.coreComponents)
    .filter(def => def.category === category)
}

/**
 * Check if a name is a core component
 */
export function isCoreComponent(name: string): boolean {
  return name in MIRROR_SCHEMA.coreComponents
}

/**
 * Get all core tokens
 */
export function getAllCoreTokens(): Record<string, { value: string; description: string }> {
  return MIRROR_SCHEMA.coreTokens
}

/**
 * Get core tokens used by a specific component
 */
export function getCoreTokensForComponent(componentName: string): string[] {
  const def = getCoreComponentDefinition(componentName)
  return def?.tokens || []
}

// =============================================================================
// DIRECTION NORMALIZATION
// =============================================================================

const DIRECTION_SHORT_TO_LONG: Record<string, string> = {
  l: 'left',
  r: 'right',
  u: 'top',
  d: 'bottom',
  t: 'top',
  b: 'bottom',
}

const DIRECTION_LONG_TO_SHORT: Record<string, string> = {
  left: 'l',
  right: 'r',
  top: 'u',
  bottom: 'd',
}

/**
 * Normalize a direction to long form
 */
export function normalizeDirectionToLong(dir: string): string {
  return DIRECTION_SHORT_TO_LONG[dir] ?? dir
}

/**
 * Normalize a direction to short form
 */
export function normalizeDirectionToShort(dir: string): string {
  return DIRECTION_LONG_TO_SHORT[dir] ?? dir
}

/**
 * Normalize a direction combo to long form
 * e.g., 'l-r' -> 'left-right', 'ud' -> 'top-bottom'
 */
export function normalizeDirectionComboToLong(combo: string): string {
  // Handle hyphenated combos
  if (combo.includes('-')) {
    return combo
      .split('-')
      .map(normalizeDirectionToLong)
      .join('-')
  }
  // Handle concatenated short forms (e.g., 'lr', 'ud')
  if (/^[lrudtb]+$/.test(combo) && combo.length > 1) {
    return combo
      .split('')
      .map(normalizeDirectionToLong)
      .join('-')
  }
  return normalizeDirectionToLong(combo)
}

// =============================================================================
// CORNER NORMALIZATION
// =============================================================================

const CORNER_SHORT_TO_LONG: Record<string, string> = {
  tl: 'top-left',
  tr: 'top-right',
  bl: 'bottom-left',
  br: 'bottom-right',
}

const CORNER_LONG_TO_SHORT: Record<string, string> = {
  'top-left': 'tl',
  'top-right': 'tr',
  'bottom-left': 'bl',
  'bottom-right': 'br',
}

/**
 * Normalize a corner to long form
 */
export function normalizeCornerToLong(corner: string): string {
  return CORNER_SHORT_TO_LONG[corner] ?? corner
}

/**
 * Normalize a corner to short form
 */
export function normalizeCornerToShort(corner: string): string {
  return CORNER_LONG_TO_SHORT[corner] ?? corner
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if a value is valid for a property
 */
export function isValidValue(propertyName: string, value: unknown): boolean {
  const def = getPropertyDefinition(propertyName)
  if (!def) return true // Unknown property, allow

  switch (def.valueType) {
    case 'boolean':
      return value === true || value === undefined
    case 'number':
      if (typeof value !== 'number') return false
      if (def.range) {
        if (def.range.min !== undefined && value < def.range.min) return false
        if (def.range.max !== undefined && value > def.range.max) return false
      }
      return true
    case 'color':
      return typeof value === 'string' && (value.startsWith('#') || value.startsWith('$'))
    case 'string':
      return typeof value === 'string'
    case 'enum':
      return typeof value === 'string' && (def.enumValues?.includes(value) ?? false)
    case 'keyword':
      return typeof value === 'string' && (def.keywords?.includes(value) ?? false)
    case 'mixed':
    case 'compound':
      return true // Complex validation needed
    default:
      return true
  }
}

/**
 * Check if a direction is valid for a property
 */
export function isValidDirection(propertyName: string, direction: string): boolean {
  const def = getPropertyDefinition(propertyName)
  if (!def?.directions?.supported) return false

  const normalizedDir = normalizeDirectionToLong(direction)
  const dirs = def.directions

  // Check single directions
  if (dirs.forms.includes(normalizedDir)) return true
  if (dirs.shortForms.includes(direction)) return true

  // Check combos
  const normalizedCombo = normalizeDirectionComboToLong(direction)
  if (dirs.combos.includes(normalizedCombo)) return true
  if (dirs.shortCombos.includes(direction)) return true

  return false
}

/**
 * Check if a corner is valid for a property
 */
export function isValidCorner(propertyName: string, corner: string): boolean {
  const def = getPropertyDefinition(propertyName)
  if (!def?.corners?.supported) return false

  const corners = def.corners

  // Check corners
  if (corners.forms.includes(corner)) return true
  if (corners.shortForms.includes(corner)) return true

  // Check edges (e.g., 't' for top-left + top-right)
  if (corners.edges.includes(corner)) return true

  return false
}

/**
 * Check if a key modifier is valid for keyboard events
 */
export function isValidKeyModifier(modifier: string): boolean {
  const keydownEvent = MIRROR_SCHEMA.events.onkeydown
  return keydownEvent.keyModifiers?.includes(modifier) ?? false
}

/**
 * Check if a target is valid for an action
 */
export function isValidActionTarget(actionName: string, target: string): boolean {
  const action = getActionDefinition(actionName)
  if (!action) return false
  if (!action.validTargets) return true // No restrictions
  return action.validTargets.includes(target)
}

// =============================================================================
// EXPORT SETS (for backwards compatibility)
// =============================================================================

export const EVENT_KEYWORDS = new Set(Object.keys(MIRROR_SCHEMA.events))
export const ACTION_KEYWORDS = new Set(Object.keys(MIRROR_SCHEMA.actions))
export const SYSTEM_STATES = new Set(getSystemStates())
export const BEHAVIOR_STATES = new Set(getBehaviorStates())
export const ANIMATION_KEYWORDS = new Set(Object.keys(MIRROR_SCHEMA.animations))
export const POSITION_KEYWORDS = new Set(getAllPositions())
export const BEHAVIOR_TARGETS = new Set(getAllActionTargets())
export const KEY_MODIFIERS = new Set(MIRROR_SCHEMA.events.onkeydown.keyModifiers)
export const TIMING_MODIFIERS = new Set(['debounce', 'delay'])
export const CONTROL_KEYWORDS = new Set(getKeywordsByCategory('control'))
export const PRIMITIVES = new Set(MIRROR_SCHEMA.primitives)
export const BORDER_STYLES = new Set(MIRROR_SCHEMA.borderStyles)
// Binding components (Select, DatePicker, etc.) - defined inline since bindings aren't in schema yet
export const BINDING_COMPONENTS = new Set([
  'Select', 'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectOption', 'SelectDivider',
  'DatePicker', 'DatePickerInput', 'Calendar', 'CalendarDay',
  'Autocomplete', 'AutocompleteInput', 'AutocompleteListbox', 'AutocompleteOption', 'AutocompleteGroup',
  'MaskedInput', 'PhoneInput', 'CreditCardInput', 'IBANInput',
])
export const CORE_COMPONENT_NAMES = new Set(getAllCoreComponentNames())
export const CORE_TOKENS = new Set(Object.keys(MIRROR_SCHEMA.coreTokens))

// All DSL keywords combined
export const ALL_DSL_KEYWORDS = new Set([
  ...Object.keys(MIRROR_SCHEMA.properties),
  ...Object.values(MIRROR_SCHEMA.properties).flatMap(p => p.shortForms),
  ...Object.keys(MIRROR_SCHEMA.events),
  ...Object.keys(MIRROR_SCHEMA.actions),
  ...Object.keys(MIRROR_SCHEMA.states),
  ...Object.keys(MIRROR_SCHEMA.animations),
  ...Object.keys(MIRROR_SCHEMA.keywords),
  ...getAllCoreComponentNames(),
])
