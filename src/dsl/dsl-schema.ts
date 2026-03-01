/**
 * @module dsl/dsl-schema
 * @description Single Source of Truth for DSL property definitions
 *
 * This schema defines:
 * - Property names (long form = canonical)
 * - Short form aliases
 * - Value types and constraints
 * - Direction/corner support
 * - CSS shorthand rules
 * - Compound property structures
 * - Documentation
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
}

// =============================================================================
// DIRECTION DEFINITIONS
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
// DSL SCHEMA
// =============================================================================

export const DSL_SCHEMA: Record<string, PropertyDefinition> = {
  // ---------------------------------------------------------------------------
  // LAYOUT PROPERTIES
  // ---------------------------------------------------------------------------
  horizontal: {
    name: 'horizontal',
    shortForms: ['hor'],
    category: 'layout',
    valueType: 'boolean',
    description: 'Horizontale Anordnung (row)',
    examples: ['horizontal', 'hor'],
  },

  vertical: {
    name: 'vertical',
    shortForms: ['ver', 'vert'],
    category: 'layout',
    valueType: 'boolean',
    description: 'Vertikale Anordnung (column) - Default',
    examples: ['vertical', 'ver'],
  },

  center: {
    name: 'center',
    shortForms: ['cen'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Beide Achsen zentrieren',
    examples: ['center', 'cen'],
  },

  gap: {
    name: 'gap',
    shortForms: ['g'],
    category: 'layout',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Abstand zwischen Kindern',
    examples: ['gap 16', 'g 8'],
  },

  spread: {
    name: 'spread',
    shortForms: [],
    category: 'layout',
    valueType: 'boolean',
    description: 'Space-between Distribution',
    examples: ['spread'],
  },

  between: {
    name: 'between',
    shortForms: [],
    category: 'layout',
    valueType: 'boolean',
    description: 'Space-between Distribution (Alias für spread)',
    examples: ['between'],
  },

  grow: {
    name: 'grow',
    shortForms: [],
    category: 'layout',
    valueType: 'boolean',
    description: 'Flex-grow aktivieren',
    examples: ['grow'],
  },

  shrink: {
    name: 'shrink',
    shortForms: [],
    category: 'layout',
    valueType: 'number',
    accepts: ['number'],
    description: 'Flex-shrink Wert',
    examples: ['shrink 0', 'shrink 1'],
  },

  'gap-col': {
    name: 'gap-col',
    shortForms: ['gap-x'],
    category: 'layout',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Horizontaler Spaltenabstand',
    examples: ['gap-col 16', 'gap-x 8'],
  },

  'gap-row': {
    name: 'gap-row',
    shortForms: ['gap-y'],
    category: 'layout',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Vertikaler Zeilenabstand',
    examples: ['gap-row 16', 'gap-y 8'],
  },

  wrap: {
    name: 'wrap',
    shortForms: [],
    category: 'layout',
    valueType: 'boolean',
    description: 'Erlaubt Umbruch',
    examples: ['wrap'],
  },

  stacked: {
    name: 'stacked',
    shortForms: [],
    category: 'layout',
    valueType: 'boolean',
    description: 'Kinder übereinander (z-layers)',
    examples: ['stacked'],
  },

  grid: {
    name: 'grid',
    shortForms: [],
    category: 'layout',
    valueType: 'mixed',
    accepts: ['number', 'percentage', 'keyword'],
    keywords: ['auto'],
    description: 'Grid-Layout für Spalten',
    examples: ['grid 3', 'grid auto 250', 'grid 30% 70%'],
  },

  // ---------------------------------------------------------------------------
  // ALIGNMENT PROPERTIES
  // ---------------------------------------------------------------------------
  'horizontal-left': {
    name: 'horizontal-left',
    shortForms: ['hor-l', 'left'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Links ausrichten (horizontal)',
    examples: ['left', 'horizontal-left', 'hor-l'],
  },

  'horizontal-center': {
    name: 'horizontal-center',
    shortForms: ['hor-cen', 'hor-center'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Horizontal zentrieren',
    examples: ['hor-center', 'horizontal-center'],
  },

  'horizontal-right': {
    name: 'horizontal-right',
    shortForms: ['hor-r', 'right'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Rechts ausrichten (horizontal)',
    examples: ['right', 'horizontal-right', 'hor-r'],
  },

  'vertical-top': {
    name: 'vertical-top',
    shortForms: ['ver-t', 'top'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Oben ausrichten (vertikal)',
    examples: ['top', 'vertical-top', 'ver-t'],
  },

  'vertical-center': {
    name: 'vertical-center',
    shortForms: ['ver-cen', 'ver-center'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Vertikal zentrieren',
    examples: ['ver-center', 'vertical-center'],
  },

  'vertical-bottom': {
    name: 'vertical-bottom',
    shortForms: ['ver-b', 'bottom'],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Unten ausrichten (vertikal)',
    examples: ['bottom', 'vertical-bottom', 'ver-b'],
  },

  // ---------------------------------------------------------------------------
  // SIZING PROPERTIES
  // ---------------------------------------------------------------------------
  width: {
    name: 'width',
    shortForms: ['w'],
    category: 'sizing',
    valueType: 'mixed',
    accepts: ['number', 'percentage', 'keyword'],
    keywords: ['hug', 'full', 'min', 'max'],
    description: 'Breite',
    examples: ['width 300', 'width hug', 'width full', 'w 200'],
  },

  height: {
    name: 'height',
    shortForms: ['h'],
    category: 'sizing',
    valueType: 'mixed',
    accepts: ['number', 'percentage', 'keyword'],
    keywords: ['hug', 'full', 'min', 'max'],
    description: 'Höhe',
    examples: ['height 400', 'height hug', 'height full', 'h 200'],
  },

  size: {
    name: 'size',
    shortForms: [],
    category: 'sizing',
    valueType: 'mixed',
    accepts: ['number', 'keyword'],
    keywords: ['hug', 'full'],
    description: 'Kombinierte Dimension (width height)',
    examples: ['size hug 32', 'size 100 200', 'size full'],
  },

  'min-width': {
    name: 'min-width',
    shortForms: ['minw'],
    category: 'sizing',
    valueType: 'number',
    accepts: ['number', 'percentage'],
    description: 'Minimale Breite',
    examples: ['min-width 200', 'minw 100'],
  },

  'max-width': {
    name: 'max-width',
    shortForms: ['maxw'],
    category: 'sizing',
    valueType: 'number',
    accepts: ['number', 'percentage'],
    description: 'Maximale Breite',
    examples: ['max-width 800', 'maxw 600'],
  },

  'min-height': {
    name: 'min-height',
    shortForms: ['minh'],
    category: 'sizing',
    valueType: 'number',
    accepts: ['number', 'percentage'],
    description: 'Minimale Höhe',
    examples: ['min-height 100', 'minh 50'],
  },

  'max-height': {
    name: 'max-height',
    shortForms: ['maxh'],
    category: 'sizing',
    valueType: 'number',
    accepts: ['number', 'percentage'],
    description: 'Maximale Höhe',
    examples: ['max-height 600', 'maxh 400'],
  },

  hug: {
    name: 'hug',
    shortForms: [],
    category: 'sizing',
    valueType: 'boolean',
    description: 'Fit-content (Standalone)',
    examples: ['hug'],
  },

  full: {
    name: 'full',
    shortForms: [],
    category: 'sizing',
    valueType: 'boolean',
    description: '100% + flex-grow (Standalone)',
    examples: ['full'],
  },

  'w-min': {
    name: 'w-min',
    shortForms: [],
    category: 'sizing',
    valueType: 'boolean',
    description: 'Width fit-content',
    examples: ['w-min'],
  },

  'w-max': {
    name: 'w-max',
    shortForms: [],
    category: 'sizing',
    valueType: 'boolean',
    description: 'Width 100% + flex-grow',
    examples: ['w-max'],
  },

  'h-min': {
    name: 'h-min',
    shortForms: [],
    category: 'sizing',
    valueType: 'boolean',
    description: 'Height fit-content',
    examples: ['h-min'],
  },

  'h-max': {
    name: 'h-max',
    shortForms: [],
    category: 'sizing',
    valueType: 'boolean',
    description: 'Height 100% + flex-grow',
    examples: ['h-max'],
  },

  centered: {
    name: 'centered',
    shortForms: [],
    category: 'alignment',
    valueType: 'boolean',
    description: 'Horizontale Zentrierung (margin auto)',
    examples: ['centered'],
  },

  // ---------------------------------------------------------------------------
  // SPACING PROPERTIES
  // ---------------------------------------------------------------------------
  padding: {
    name: 'padding',
    shortForms: ['pad', 'p'],
    category: 'spacing',
    valueType: 'number',
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
  },

  margin: {
    name: 'margin',
    shortForms: ['mar', 'm'],
    category: 'spacing',
    valueType: 'number',
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
  },

  // CSS-style directional spacing shorthands
  'padding-top': {
    name: 'padding-top',
    shortForms: ['pt'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Padding oben',
    examples: ['padding-top 8', 'pt 16'],
  },

  'padding-bottom': {
    name: 'padding-bottom',
    shortForms: ['pb'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Padding unten',
    examples: ['padding-bottom 8', 'pb 16'],
  },

  'padding-left': {
    name: 'padding-left',
    shortForms: ['pl'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Padding links',
    examples: ['padding-left 8', 'pl 16'],
  },

  'padding-right': {
    name: 'padding-right',
    shortForms: ['pr'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Padding rechts',
    examples: ['padding-right 8', 'pr 16'],
  },

  'margin-top': {
    name: 'margin-top',
    shortForms: ['mt'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Margin oben',
    examples: ['margin-top 8', 'mt 16'],
  },

  'margin-bottom': {
    name: 'margin-bottom',
    shortForms: ['mb'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Margin unten',
    examples: ['margin-bottom 8', 'mb 16'],
  },

  'margin-left': {
    name: 'margin-left',
    shortForms: ['ml'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Margin links',
    examples: ['margin-left 8', 'ml 16'],
  },

  'margin-right': {
    name: 'margin-right',
    shortForms: ['mr'],
    category: 'spacing',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Margin rechts',
    examples: ['margin-right 8', 'mr 16'],
  },

  // ---------------------------------------------------------------------------
  // COLOR PROPERTIES
  // ---------------------------------------------------------------------------
  color: {
    name: 'color',
    shortForms: ['col', 'c'],
    category: 'color',
    valueType: 'color',
    accepts: ['color-hex', 'token'],
    description: 'Textfarbe',
    examples: ['color #333', 'color $primary.col', 'col #FFF'],
  },

  background: {
    name: 'background',
    shortForms: ['bg'],
    category: 'color',
    valueType: 'color',
    accepts: ['color-hex', 'token', 'keyword'],
    keywords: ['transparent'],
    description: 'Hintergrundfarbe',
    examples: ['background #3B82F6', 'background $primary.bg', 'bg #333'],
  },

  'border-color': {
    name: 'border-color',
    shortForms: ['boc'],
    category: 'color',
    valueType: 'color',
    accepts: ['color-hex', 'token'],
    description: 'Rahmenfarbe',
    examples: ['border-color #555', 'boc $grey-700'],
  },

  // ---------------------------------------------------------------------------
  // BORDER PROPERTIES
  // ---------------------------------------------------------------------------
  border: {
    name: 'border',
    shortForms: ['bor'],
    category: 'border',
    valueType: 'compound',
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
  },

  radius: {
    name: 'radius',
    shortForms: ['rad'],
    category: 'border',
    valueType: 'number',
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
  },

  // ---------------------------------------------------------------------------
  // TYPOGRAPHY PROPERTIES
  // ---------------------------------------------------------------------------
  'text-size': {
    name: 'text-size',
    shortForms: ['fs', 'ts', 'font-size'],
    category: 'typography',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Schriftgröße (px)',
    examples: ['text-size 14', 'ts 12'],
  },

  weight: {
    name: 'weight',
    shortForms: [],
    category: 'typography',
    valueType: 'mixed',
    accepts: ['number', 'keyword'],
    keywords: ['bold', 'normal', 'light'],
    range: { min: 100, max: 900 },
    description: 'Schriftstärke',
    examples: ['weight 600', 'weight bold'],
  },

  line: {
    name: 'line',
    shortForms: [],
    category: 'typography',
    valueType: 'number',
    accepts: ['number'],
    description: 'Zeilenhöhe',
    examples: ['line 1.5', 'line 24'],
  },

  font: {
    name: 'font',
    shortForms: [],
    category: 'typography',
    valueType: 'string',
    description: 'Schriftart',
    examples: ['font "Inter"', 'font "SF Pro"'],
  },

  align: {
    name: 'align',
    shortForms: ['text-align'],
    category: 'typography',
    valueType: 'enum',
    enumValues: ['left', 'center', 'right', 'justify'],
    description: 'Textausrichtung',
    examples: ['align center', 'align right'],
  },

  italic: {
    name: 'italic',
    shortForms: [],
    category: 'typography',
    valueType: 'boolean',
    description: 'Kursiv',
    examples: ['italic'],
  },

  underline: {
    name: 'underline',
    shortForms: [],
    category: 'typography',
    valueType: 'boolean',
    description: 'Unterstrichen',
    examples: ['underline'],
  },

  truncate: {
    name: 'truncate',
    shortForms: [],
    category: 'typography',
    valueType: 'boolean',
    description: 'Abschneiden mit Ellipsis',
    examples: ['truncate'],
  },

  uppercase: {
    name: 'uppercase',
    shortForms: [],
    category: 'typography',
    valueType: 'boolean',
    description: 'Großbuchstaben',
    examples: ['uppercase'],
  },

  lowercase: {
    name: 'lowercase',
    shortForms: [],
    category: 'typography',
    valueType: 'boolean',
    description: 'Kleinbuchstaben',
    examples: ['lowercase'],
  },

  // ---------------------------------------------------------------------------
  // ICON PROPERTIES
  // ---------------------------------------------------------------------------
  'icon-size': {
    name: 'icon-size',
    shortForms: ['is'],
    category: 'icon',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Icon-Größe (px)',
    examples: ['icon-size 20', 'is 24'],
  },

  'icon-weight': {
    name: 'icon-weight',
    shortForms: ['iw'],
    category: 'icon',
    valueType: 'number',
    accepts: ['number'],
    range: { min: 100, max: 700 },
    description: 'Icon-Strichstärke (100-700, Standard: 400)',
    examples: ['icon-weight 300', 'iw 600'],
  },

  'icon-color': {
    name: 'icon-color',
    shortForms: ['ic'],
    category: 'icon',
    valueType: 'color',
    accepts: ['color-hex', 'token'],
    description: 'Icon-Farbe (überschreibt color)',
    examples: ['icon-color #3B82F6', 'ic $primary.col'],
  },

  fill: {
    name: 'fill',
    shortForms: [],
    category: 'icon',
    valueType: 'boolean',
    description: 'Icon gefüllt (Material only)',
    examples: ['fill'],
  },

  material: {
    name: 'material',
    shortForms: [],
    category: 'icon',
    valueType: 'boolean',
    description: 'Material Icons verwenden',
    examples: ['material'],
  },

  phosphor: {
    name: 'phosphor',
    shortForms: [],
    category: 'icon',
    valueType: 'boolean',
    description: 'Phosphor Icons verwenden',
    examples: ['phosphor'],
  },

  // ---------------------------------------------------------------------------
  // VISUAL PROPERTIES
  // ---------------------------------------------------------------------------
  opacity: {
    name: 'opacity',
    shortForms: ['o', 'opa', 'op'],
    category: 'visual',
    valueType: 'number',
    accepts: ['number'],
    range: { min: 0, max: 1 },
    description: 'Transparenz (0-1)',
    examples: ['opacity 0.5', 'o 0.8'],
  },

  shadow: {
    name: 'shadow',
    shortForms: [],
    category: 'visual',
    valueType: 'enum',
    enumValues: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', 'none'],
    description: 'Schatten',
    examples: ['shadow md', 'shadow lg'],
  },

  cursor: {
    name: 'cursor',
    shortForms: [],
    category: 'visual',
    valueType: 'enum',
    enumValues: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
    description: 'Cursor-Stil',
    examples: ['cursor pointer', 'cursor grab'],
  },

  z: {
    name: 'z',
    shortForms: [],
    category: 'visual',
    valueType: 'number',
    accepts: ['number'],
    description: 'Z-Index',
    examples: ['z 10', 'z 100'],
  },

  hidden: {
    name: 'hidden',
    shortForms: [],
    category: 'visual',
    valueType: 'boolean',
    description: 'Versteckt starten',
    examples: ['hidden'],
  },

  visible: {
    name: 'visible',
    shortForms: [],
    category: 'visual',
    valueType: 'boolean',
    description: 'Sichtbarkeit',
    examples: ['visible'],
  },

  disabled: {
    name: 'disabled',
    shortForms: [],
    category: 'visual',
    valueType: 'boolean',
    description: 'Deaktiviert',
    examples: ['disabled'],
  },

  debug: {
    name: 'debug',
    shortForms: [],
    category: 'visual',
    valueType: 'boolean',
    description: 'Debug-Overlay mit tatsächlichen Größen und Farben anzeigen',
    examples: ['debug'],
  },

  rotate: {
    name: 'rotate',
    shortForms: ['rot'],
    category: 'visual',
    valueType: 'number',
    accepts: ['number'],
    description: 'Rotation in Grad',
    examples: ['rotate 45', 'rot 90'],
  },

  translate: {
    name: 'translate',
    shortForms: [],
    category: 'visual',
    valueType: 'compound',
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

  // ---------------------------------------------------------------------------
  // SCROLL PROPERTIES
  // ---------------------------------------------------------------------------
  scroll: {
    name: 'scroll',
    shortForms: [],
    category: 'scroll',
    valueType: 'boolean',
    description: 'Vertikales Scrollen',
    examples: ['scroll'],
  },

  'scroll-vertical': {
    name: 'scroll-vertical',
    shortForms: ['scroll-ver'],
    category: 'scroll',
    valueType: 'boolean',
    description: 'Vertikales Scrollen',
    examples: ['scroll-vertical', 'scroll-ver'],
  },

  'scroll-horizontal': {
    name: 'scroll-horizontal',
    shortForms: ['scroll-hor'],
    category: 'scroll',
    valueType: 'boolean',
    description: 'Horizontales Scrollen',
    examples: ['scroll-horizontal', 'scroll-hor'],
  },

  'scroll-both': {
    name: 'scroll-both',
    shortForms: [],
    category: 'scroll',
    valueType: 'boolean',
    description: 'Beide Richtungen scrollen',
    examples: ['scroll-both'],
  },

  clip: {
    name: 'clip',
    shortForms: [],
    category: 'scroll',
    valueType: 'boolean',
    description: 'Overflow hidden',
    examples: ['clip'],
  },

  // ---------------------------------------------------------------------------
  // HOVER PROPERTIES
  // ---------------------------------------------------------------------------
  'hover-background': {
    name: 'hover-background',
    shortForms: ['hover-bg'],
    category: 'hover',
    valueType: 'color',
    accepts: ['color-hex', 'token'],
    description: 'Hover Hintergrund',
    examples: ['hover-background #555', 'hover-bg $primary.hover.bg'],
  },

  'hover-color': {
    name: 'hover-color',
    shortForms: ['hover-col'],
    category: 'hover',
    valueType: 'color',
    accepts: ['color-hex', 'token'],
    description: 'Hover Textfarbe',
    examples: ['hover-color #FFF', 'hover-col $primary.col'],
  },

  'hover-opacity': {
    name: 'hover-opacity',
    shortForms: ['hover-opa'],
    category: 'hover',
    valueType: 'number',
    accepts: ['number'],
    range: { min: 0, max: 1 },
    description: 'Hover Transparenz',
    examples: ['hover-opacity 0.8', 'hover-opa 0.5'],
  },

  'hover-scale': {
    name: 'hover-scale',
    shortForms: [],
    category: 'hover',
    valueType: 'number',
    accepts: ['number'],
    description: 'Hover Skalierung',
    examples: ['hover-scale 1.05', 'hover-scale 1.1'],
  },

  'hover-border': {
    name: 'hover-border',
    shortForms: ['hover-bor'],
    category: 'hover',
    valueType: 'number',
    accepts: ['number'],
    description: 'Hover Rahmen',
    examples: ['hover-border 2', 'hover-bor 1'],
  },

  'hover-border-color': {
    name: 'hover-border-color',
    shortForms: ['hover-boc'],
    category: 'hover',
    valueType: 'color',
    accepts: ['color-hex', 'token'],
    description: 'Hover Rahmenfarbe',
    examples: ['hover-border-color #3B82F6', 'hover-boc $primary.col'],
  },

  'hover-radius': {
    name: 'hover-radius',
    shortForms: ['hover-rad'],
    category: 'hover',
    valueType: 'number',
    accepts: ['number', 'token'],
    description: 'Hover Eckenradius',
    examples: ['hover-radius 12', 'hover-rad 8'],
  },

  // ---------------------------------------------------------------------------
  // FORM PROPERTIES
  // ---------------------------------------------------------------------------
  placeholder: {
    name: 'placeholder',
    shortForms: [],
    category: 'form',
    valueType: 'string',
    description: 'Platzhaltertext',
    examples: ['placeholder "Enter email..."'],
  },

  type: {
    name: 'type',
    shortForms: [],
    category: 'form',
    valueType: 'enum',
    enumValues: ['text', 'email', 'password', 'number', 'tel', 'url', 'search', 'date', 'time', 'datetime-local'],
    description: 'Eingabetyp',
    examples: ['type email', 'type password'],
  },

  value: {
    name: 'value',
    shortForms: [],
    category: 'form',
    valueType: 'mixed',
    accepts: ['number', 'token'],
    description: 'Wert',
    examples: ['value 50', 'value $item.count'],
  },

  min: {
    name: 'min',
    shortForms: [],
    category: 'form',
    valueType: 'number',
    accepts: ['number'],
    description: 'Minimalwert',
    examples: ['min 0', 'min 1'],
  },

  max: {
    name: 'max',
    shortForms: [],
    category: 'form',
    valueType: 'number',
    accepts: ['number'],
    description: 'Maximalwert',
    examples: ['max 100', 'max 10'],
  },

  step: {
    name: 'step',
    shortForms: [],
    category: 'form',
    valueType: 'number',
    accepts: ['number'],
    description: 'Schrittweite',
    examples: ['step 1', 'step 0.1'],
  },

  rows: {
    name: 'rows',
    shortForms: [],
    category: 'form',
    valueType: 'number',
    accepts: ['number'],
    description: 'Anzahl Zeilen (Textarea)',
    examples: ['rows 4', 'rows 10'],
  },

  segments: {
    name: 'segments',
    shortForms: [],
    category: 'form',
    valueType: 'number',
    accepts: ['number'],
    description: 'Anzahl Segmente',
    examples: ['segments 4', 'segments 6'],
  },

  length: {
    name: 'length',
    shortForms: [],
    category: 'form',
    valueType: 'number',
    accepts: ['number'],
    description: 'Länge (für Segment-Input)',
    examples: ['length 4', 'length 6'],
  },

  pattern: {
    name: 'pattern',
    shortForms: [],
    category: 'form',
    valueType: 'string',
    description: 'Input-Pattern (für Segment)',
    examples: ['pattern digits', 'pattern alpha'],
  },

  mask: {
    name: 'mask',
    shortForms: [],
    category: 'form',
    valueType: 'boolean',
    description: 'Maskiert (versteckt Zeichen)',
    examples: ['mask'],
  },

  // ---------------------------------------------------------------------------
  // IMAGE PROPERTIES
  // ---------------------------------------------------------------------------
  src: {
    name: 'src',
    shortForms: [],
    category: 'image',
    valueType: 'string',
    description: 'Bild-URL',
    examples: ['src "https://example.com/image.jpg"'],
  },

  alt: {
    name: 'alt',
    shortForms: [],
    category: 'image',
    valueType: 'string',
    description: 'Alternativtext',
    examples: ['alt "Description"'],
  },

  fit: {
    name: 'fit',
    shortForms: [],
    category: 'image',
    valueType: 'enum',
    enumValues: ['cover', 'contain', 'fill', 'none', 'scale-down'],
    description: 'Bild-Anpassung',
    examples: ['fit cover', 'fit contain'],
  },

  // ---------------------------------------------------------------------------
  // LINK PROPERTIES
  // ---------------------------------------------------------------------------
  href: {
    name: 'href',
    shortForms: [],
    category: 'link',
    valueType: 'string',
    description: 'Link-URL',
    examples: ['href "/about"', 'href "https://example.com"'],
  },

  target: {
    name: 'target',
    shortForms: [],
    category: 'link',
    valueType: 'enum',
    enumValues: ['_blank', '_self', '_parent', '_top'],
    description: 'Link-Ziel',
    examples: ['target _blank'],
  },

  // ---------------------------------------------------------------------------
  // DATA PROPERTIES
  // ---------------------------------------------------------------------------
  data: {
    name: 'data',
    shortForms: [],
    category: 'data',
    valueType: 'string',
    description: 'Data Binding an Collection',
    examples: ['data Tasks', 'data Tasks where done == false'],
  },

  // ---------------------------------------------------------------------------
  // ADDITIONAL VISUAL PROPERTIES
  // ---------------------------------------------------------------------------
  pointer: {
    name: 'pointer',
    shortForms: [],
    category: 'visual',
    valueType: 'enum',
    enumValues: ['pointer', 'default', 'text', 'move', 'grab', 'grabbing', 'not-allowed', 'wait', 'crosshair'],
    description: 'Pointer-Stil (alternative zu cursor)',
    examples: ['pointer pointer', 'pointer grab'],
  },

  shortcut: {
    name: 'shortcut',
    shortForms: [],
    category: 'visual',
    valueType: 'string',
    description: 'Keyboard Shortcut',
    examples: ['shortcut "cmd+s"', 'shortcut "ctrl+enter"'],
  },

  // ---------------------------------------------------------------------------
  // ADDITIONAL SCROLL PROPERTIES
  // ---------------------------------------------------------------------------
  snap: {
    name: 'snap',
    shortForms: [],
    category: 'scroll',
    valueType: 'boolean',
    description: 'Scroll Snapping aktivieren',
    examples: ['snap'],
  },
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Build a mapping from short forms to canonical (long) names
 */
export function buildShortToLongMap(): Map<string, string> {
  const map = new Map<string, string>()
  for (const [name, def] of Object.entries(DSL_SCHEMA)) {
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
  for (const [name, def] of Object.entries(DSL_SCHEMA)) {
    map.set(name, def)
    for (const short of def.shortForms) {
      map.set(short, def)
    }
  }
  return map
}

/**
 * Get property definition by canonical (long) name only.
 * Use this in the Parser - it only accepts normalized names.
 */
export function getPropertyDefinition(name: string): PropertyDefinition | undefined {
  return DSL_SCHEMA[name]
}

/**
 * Resolve a property name (short or long) to its canonical long form.
 * Use this in the Preprocessor to normalize short forms.
 */
export function resolvePropertyName(name: string): string | undefined {
  if (DSL_SCHEMA[name]) return name
  for (const [longName, propDef] of Object.entries(DSL_SCHEMA)) {
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
  return canonical ? DSL_SCHEMA[canonical] : undefined
}

/**
 * Normalize property name to canonical (long) form
 */
export function normalizePropertyName(name: string): string {
  return resolvePropertyName(name) ?? name
}

/**
 * Get all property names (long forms only)
 */
export function getAllPropertyNames(): string[] {
  return Object.keys(DSL_SCHEMA)
}

/**
 * Get all forms (short and long) for a property
 * Accepts both short and long forms as input
 */
export function getAllFormsForProperty(name: string): string[] {
  const def = getPropertyDefinitionByAnyName(name)
  if (!def) return [name]
  return [def.name, ...def.shortForms]
}

/**
 * Check if a property supports directions
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
  return Object.values(DSL_SCHEMA).filter((def) => def.category === category)
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
