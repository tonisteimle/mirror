/**
 * Complete Mirror Schema for React→Mirror Transformation
 *
 * Covers ALL Mirror DSL features for a realistic comparison experiment.
 */

// =============================================================================
// TOKEN SYSTEM (Bound Property Format)
// =============================================================================

export interface TokenDefinition {
  name: string          // Without $, e.g. "primary.bg"
  value: string | number | TokenReference
}

export interface TokenReference {
  ref: string           // Reference to another token, e.g. "$grey-800"
}

// =============================================================================
// STYLES
// =============================================================================

export interface MirrorStyles {
  // Layout Direction
  layout?: 'vertical' | 'horizontal' | 'stacked' | 'grid'
  direction?: 'row' | 'column'  // React-style alias

  // Alignment
  align?: 'start' | 'center' | 'end' | 'between' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  alignItems?: 'start' | 'center' | 'end' | 'stretch'
  justifyContent?: 'start' | 'center' | 'end' | 'between' | 'around'

  // Spacing
  gap?: number | string
  padding?: number | number[] | string
  margin?: number | number[] | string
  paddingTop?: number | string
  paddingRight?: number | string
  paddingBottom?: number | string
  paddingLeft?: number | string
  marginTop?: number | string
  marginRight?: number | string
  marginBottom?: number | string
  marginLeft?: number | string

  // Sizing
  width?: number | string | 'full' | 'hug'
  height?: number | string | 'full' | 'hug'
  minWidth?: number | string
  maxWidth?: number | string
  minHeight?: number | string
  maxHeight?: number | string
  grow?: number | boolean
  shrink?: number | boolean
  flex?: number | string
  flexGrow?: number | boolean

  // Colors (support both hex and token refs)
  background?: string
  backgroundColor?: string
  color?: string
  borderColor?: string

  // Border
  border?: number | string | [number, string] | [number, string, string]
  borderWidth?: number | string
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'none'
  borderRadius?: number | number[] | string
  radius?: number | number[] | string
  // Directional borders
  borderTop?: number | string
  borderRight?: number | string
  borderBottom?: number | string
  borderLeft?: number | string

  // Typography
  fontSize?: number | string
  fontWeight?: number | string | 'bold' | 'normal'
  fontFamily?: string
  lineHeight?: number | string
  textAlign?: 'left' | 'center' | 'right'
  fontStyle?: 'normal' | 'italic'
  textDecoration?: 'none' | 'underline' | 'line-through'
  textOverflow?: 'ellipsis' | 'clip'
  whiteSpace?: 'normal' | 'nowrap' | 'pre'

  // Visuals
  opacity?: number
  boxShadow?: string
  shadow?: 'sm' | 'md' | 'lg' | 'none'
  cursor?: string
  zIndex?: number
  visibility?: 'visible' | 'hidden'
  display?: 'flex' | 'block' | 'none' | 'grid'
  position?: 'relative' | 'absolute' | 'fixed' | 'static'
  top?: number | string
  right?: number | string
  bottom?: number | string
  left?: number | string

  // Transforms
  transform?: string
  rotate?: number
  scale?: number
  translate?: [number, number]

  // Grid
  gridTemplateColumns?: string  // e.g., 'repeat(3, 1fr)'
  gridTemplateRows?: string
  gridColumn?: string
  gridRow?: string

  // Overflow
  overflow?: 'hidden' | 'scroll' | 'auto' | 'visible'
  overflowX?: 'hidden' | 'scroll' | 'auto' | 'visible'
  overflowY?: 'hidden' | 'scroll' | 'auto' | 'visible'

  // Interactive
  pointerEvents?: 'auto' | 'none'
  userSelect?: 'auto' | 'none' | 'text'

  // Image
  objectFit?: 'cover' | 'contain' | 'fill' | 'none'

  // Boolean flags (Mirror-specific)
  hidden?: boolean
  disabled?: boolean
  wrap?: boolean
  clip?: boolean
  scroll?: boolean
  truncate?: boolean
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  lowercase?: boolean
}

// =============================================================================
// EVENTS & ACTIONS
// =============================================================================

export type ActionType =
  | 'toggle'
  | 'show'
  | 'hide'
  | 'open'
  | 'close'
  | 'page'
  | 'assign'
  | 'alert'
  | 'highlight'
  | 'select'
  | 'deselect'
  | 'clear-selection'
  | 'change'
  | 'filter'
  | 'focus'
  | 'activate'
  | 'deactivate'
  | 'deactivate-siblings'
  | 'toggle-state'
  | 'validate'
  | 'reset'
  | 'call'

export interface Action {
  action: ActionType
  target?: string           // Target component name
  variable?: string         // For assign
  expression?: string       // For assign
  toState?: string          // For change
  position?: string         // For open (below, above, left, right, center)
  animation?: string        // For open/show/hide (fade, slide-up, etc.)
  duration?: number         // Animation duration
  message?: string          // For alert
  function?: string         // For call
}

export type KeyboardKey =
  | 'escape' | 'enter' | 'tab' | 'space'
  | 'arrow-up' | 'arrow-down' | 'arrow-left' | 'arrow-right'
  | 'backspace' | 'delete' | 'home' | 'end'

export interface EventHandlers {
  onClick?: Action | Action[]
  onClickOutside?: Action | Action[]
  onHover?: Action | Action[]
  onChange?: Action | Action[]
  onInput?: Action | Action[]
  onFocus?: Action | Action[]
  onBlur?: Action | Action[]
  onLoad?: Action | Action[]
  onKeyDown?: Record<KeyboardKey, Action | Action[]>
  onKeyUp?: Record<KeyboardKey, Action | Action[]>
}

// =============================================================================
// STATES
// =============================================================================

export type SystemState = 'hover' | 'focus' | 'active' | 'disabled'

export type BehaviorState =
  | 'highlighted' | 'selected' | 'expanded' | 'collapsed'
  | 'valid' | 'invalid' | 'on' | 'off' | 'default'

export interface StateDefinition {
  name: string | SystemState | BehaviorState
  styles: Partial<MirrorStyles>
}

// =============================================================================
// CONDITIONALS
// =============================================================================

export interface Conditional {
  type: 'conditional'
  condition: string         // e.g. "$isLoggedIn", "$count > 0"
  then: ComponentInstance | ComponentInstance[]
  else?: ComponentInstance | ComponentInstance[]
}

export interface InlineConditional {
  condition: string
  thenValue: string | number
  elseValue?: string | number
}

// =============================================================================
// ITERATORS
// =============================================================================

export interface Iterator {
  type: 'iterator'
  itemVar: string           // e.g. "$item"
  listVar: string           // e.g. "$tasks"
  template: ComponentInstance
}

export interface DataBinding {
  collection: string        // e.g. "Tasks"
  where?: {
    field: string
    operator: '==' | '!=' | '>' | '<' | '>=' | '<='
    value: string | number | boolean
  }
}

// =============================================================================
// COMPONENT DEFINITION
// =============================================================================

export interface SlotDefinition {
  name: string
  defaultContent?: ComponentInstance | string
}

export interface ComponentDefinition {
  name: string
  extends?: string          // Parent component name
  styles: MirrorStyles
  states?: StateDefinition[]
  events?: EventHandlers
  slots?: SlotDefinition[]
  children?: (ComponentInstance | SlotDefinition | string)[]
  // Animations
  showAnimation?: { type: string; duration: number }
  hideAnimation?: { type: string; duration: number }
  animate?: { type: 'spin' | 'pulse' | 'bounce'; duration: number }
}

// =============================================================================
// COMPONENT INSTANCE
// =============================================================================

export interface ComponentInstance {
  type: 'instance'
  component: string         // Component name or primitive (Box, Text, etc.)
  name?: string             // Named instance (for "Component named Name")
  as?: string               // Inline define (for "Name as Type")
  isListItem?: boolean      // Prefix with - in Mirror
  props?: Partial<MirrorStyles> & {
    // Input-specific
    placeholder?: string
    inputType?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
    value?: string
    // Image-specific
    src?: string
    alt?: string
    // Link-specific
    href?: string
    // Icon-specific
    icon?: string
    material?: boolean
    iconSize?: number
    iconWeight?: number
    iconColor?: string
    fill?: boolean
    // Content
    text?: string
  }
  events?: EventHandlers
  states?: StateDefinition[]
  children?: (ComponentInstance | Conditional | Iterator | string)[]
  // Slot overrides (for "child1 prop; child2 prop" syntax)
  slotOverrides?: Record<string, Partial<MirrorStyles> & { text?: string }>
  // Data binding
  data?: DataBinding
  // Inline conditional properties
  conditionalProps?: Record<string, InlineConditional>
}

// =============================================================================
// DOCUMENT STRUCTURE
// =============================================================================

export interface MirrorDocument {
  // Token definitions (two-layer system)
  tokens: {
    palette: TokenDefinition[]      // Base colors: $grey-800, $blue-500
    semantic: TokenDefinition[]     // Semantic: $primary.bg, $muted.col
  }

  // Component definitions
  definitions: ComponentDefinition[]

  // Layout instances
  layout: (ComponentInstance | Conditional | Iterator)[]

  // Centralized events block
  events?: Record<string, EventHandlers>

  // Variables for state
  variables?: Record<string, string | number | boolean | null>
}

// =============================================================================
// PRIMITIVE COMPONENTS
// =============================================================================

export const PRIMITIVES = [
  // Layout
  'Box', 'Row', 'Col', 'Column', 'Stack', 'Grid',
  // Content
  'Text', 'Title', 'Label', 'Paragraph',
  // Interactive
  'Button', 'Link', 'Input', 'Textarea', 'Checkbox', 'Select', 'Dropdown',
  // Media
  'Image', 'Icon', 'Avatar',
  // Containers
  'Card', 'Panel', 'Section', 'Header', 'Footer', 'Sidebar', 'Nav', 'Menu',
  // Overlays
  'Dialog', 'Modal', 'Tooltip', 'Popup', 'Toast',
  // Feedback
  'Alert', 'Badge', 'Tag',
  // Data
  'List', 'Item', 'Table', 'TableRow', 'TableHeader',
  // Structure
  'App', 'Page', 'Main', 'Spacer', 'Divider',
  // Form
  'Form', 'FormField',
] as const

export type PrimitiveComponent = typeof PRIMITIVES[number]
