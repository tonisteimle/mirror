/**
 * Intent Schema
 *
 * Ein strukturiertes Format das:
 * - LLM leicht verstehen/modifizieren kann
 * - Bidirektional mit Mirror Code konvertierbar ist
 * - Sauberen, token-basierten Code garantiert
 */

// =============================================================================
// Tokens
// =============================================================================

export interface TokenDefinitions {
  colors?: Record<string, string>      // $primary: #3B82F6
  spacing?: Record<string, number>     // $spacing-md: 16
  radii?: Record<string, number>       // $radius-md: 8
  sizes?: Record<string, number>       // $text-lg: 18
}

// =============================================================================
// Component Definitions
// =============================================================================

export interface ComponentStyle {
  // ===================
  // Layout Direction
  // ===================
  direction?: 'horizontal' | 'vertical'
  gap?: string | number               // $spacing-md oder 16

  // ===================
  // Alignment
  // ===================
  alignHorizontal?: 'left' | 'center' | 'right'
  alignVertical?: 'top' | 'center' | 'bottom'
  center?: boolean                    // Shorthand: center both

  // ===================
  // Flex Properties
  // ===================
  grow?: boolean | number
  shrink?: number
  wrap?: boolean
  between?: boolean                   // space-between
  stacked?: boolean                   // z-stacking (position: relative)

  // ===================
  // Spacing
  // ===================
  padding?: string | number | number[]
  margin?: string | number | number[]

  // ===================
  // Sizing
  // ===================
  width?: string | number
  height?: string | number
  minWidth?: string | number
  maxWidth?: string | number
  minHeight?: string | number
  maxHeight?: string | number
  full?: boolean                      // 100% width + height

  // ===================
  // Colors
  // ===================
  background?: string                 // Token-Referenz oder Hex
  color?: string                      // Text color
  borderColor?: string

  // ===================
  // Border
  // ===================
  radius?: string | number | number[] // Single, or [tl, tr, br, bl]
  border?: number | {
    width?: number
    style?: 'solid' | 'dashed' | 'dotted'
    color?: string
  }
  // Directional borders
  borderTop?: number
  borderRight?: number
  borderBottom?: number
  borderLeft?: number

  // ===================
  // Typography
  // ===================
  fontSize?: string | number
  fontWeight?: number | string
  fontFamily?: string
  lineHeight?: number
  textAlign?: 'left' | 'center' | 'right'
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  lowercase?: boolean
  truncate?: boolean                  // text-overflow: ellipsis

  // ===================
  // Visual Effects
  // ===================
  shadow?: 'sm' | 'md' | 'lg' | number
  opacity?: number
  cursor?: string

  // ===================
  // Scroll
  // ===================
  scroll?: 'vertical' | 'horizontal' | 'both'
  clip?: boolean                      // overflow: hidden

  // ===================
  // Position
  // ===================
  position?: 'relative' | 'absolute' | 'fixed'
  top?: number
  right?: number
  bottom?: number
  left?: number
  zIndex?: number

  // ===================
  // Grid
  // ===================
  grid?: number | string[]            // Columns: 3 or ['30%', '70%']
  gridGap?: string | number

  // ===================
  // Visibility
  // ===================
  hidden?: boolean
  disabled?: boolean

  // ===================
  // Hover States (Shorthand)
  // ===================
  hoverBackground?: string
  hoverColor?: string
  hoverScale?: number
  hoverOpacity?: number
  hoverBorderColor?: string

  // ===================
  // Icons
  // ===================
  icon?: string                       // Lucide icon name
}

export interface ComponentDefinition {
  name: string
  base?: string                        // extends: "Button"
  style: ComponentStyle
  slots?: string[]                     // ["Title", "Content", "Actions"]
  states?: Record<string, ComponentStyle>  // { hover: { background: "$primary-dark" } }
}

// =============================================================================
// Conditions
// =============================================================================

export interface Condition {
  type: 'var' | 'not' | 'and' | 'or' | 'comparison'
  variable?: string                    // For type='var': "$isLoggedIn"
  operand?: Condition                  // For type='not': condition to negate
  left?: Condition                     // For 'and', 'or', 'comparison'
  right?: Condition                    // For 'and', 'or', 'comparison'
  operator?: '==' | '!=' | '>' | '<' | '>=' | '<='  // For comparison
  value?: string | number | boolean    // For comparison right-hand side
}

export interface ConditionalStyle {
  condition: Condition
  then: ComponentStyle
  else?: ComponentStyle
}

// =============================================================================
// Iterators
// =============================================================================

export interface Iterator {
  itemVariable: string    // "$item" - the loop variable
  source: string          // "$items" - the collection to iterate
  sourcePath?: string[]   // For nested access: $data.items -> ['data', 'items']
}

// =============================================================================
// Data Binding
// =============================================================================

export interface DataBinding {
  typeName: string        // Schema name: "Tasks", "Users", etc.
  filter?: Condition      // Optional where clause: done == false
}

// =============================================================================
// Animations
// =============================================================================

export interface Animation {
  types: string[]         // ['fade', 'slide-up'] - can combine multiple
  duration?: number       // Duration in ms
}

export interface ElementAnimations {
  show?: Animation        // show fade slide-up 300
  hide?: Animation        // hide fade 200
  continuous?: Animation  // animate spin 1000
}

// =============================================================================
// Layout Instances
// =============================================================================

export interface LayoutNode {
  component: string                    // "Card", "PrimaryButton", etc.
  id?: string                          // optional name for referencing
  text?: string                        // "Click me"
  style?: ComponentStyle               // inline overrides
  children?: LayoutNode[]

  // Slots (alternative zu children)
  slots?: Record<string, LayoutNode | LayoutNode[] | string>

  // Events
  events?: Record<string, EventAction[]>

  // Conditional rendering: if $isLoggedIn
  condition?: Condition

  // Else branch for conditional rendering
  elseChildren?: LayoutNode[]

  // Conditional styles: if $active then bg #F00 else bg #333
  conditionalStyle?: ConditionalStyle[]

  // List items (new instances with - prefix)
  isListItem?: boolean

  // Iterator: each $item in $items
  iterator?: Iterator

  // Animations: show/hide/continuous
  animations?: ElementAnimations

  // Data binding: data Tasks where done == false
  dataBinding?: DataBinding

  // ===================
  // Primitive-specific properties
  // ===================

  // Input/Textarea
  inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'time'
  placeholder?: string
  rows?: number           // For textarea

  // Image
  src?: string
  alt?: string
  fit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

  // Link
  href?: string
  target?: '_blank' | '_self' | '_parent' | '_top'

  // Slider/Range
  min?: number
  max?: number
  step?: number
  value?: string | number
}

export interface EventAction {
  action:
    // Navigation
    | 'navigate' | 'page'
    // Visibility
    | 'toggle' | 'show' | 'hide' | 'open' | 'close'
    // State manipulation
    | 'assign' | 'change'
    // Selection behavior
    | 'highlight' | 'select' | 'deselect' | 'clear-selection'
    // Activation behavior
    | 'activate' | 'deactivate' | 'deactivate-siblings' | 'toggle-state'
    // Form behavior
    | 'filter' | 'focus' | 'validate' | 'reset'
  target?: string
  value?: string
  // For open/show
  position?: 'below' | 'above' | 'left' | 'right' | 'center'
  animation?: string
  duration?: number
  // Conditional action
  condition?: Condition
}

// =============================================================================
// Full Intent Document
// =============================================================================

export interface Intent {
  tokens: TokenDefinitions
  components: ComponentDefinition[]
  layout: LayoutNode[]
}

// =============================================================================
// Default/Empty Intent
// =============================================================================

export function createEmptyIntent(): Intent {
  return {
    tokens: {
      colors: {},
      spacing: {},
      radii: {},
      sizes: {},
    },
    components: [],
    layout: [],
  }
}
