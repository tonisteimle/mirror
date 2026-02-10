/**
 * DSL Properties Type Definitions
 *
 * Strongly typed interface for DSL properties used throughout the parser and generator.
 * Replaces loose Record<string, string | number | boolean> for better type safety.
 */

/**
 * Text alignment options
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify'

/**
 * Object fit options for images
 */
export type ObjectFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

/**
 * Shadow size presets
 */
export type ShadowSize = 'sm' | 'md' | 'lg' | 'xl' | 'none'

/**
 * DSL Properties Interface
 *
 * Defines all valid properties that can be used in Mirror DSL components.
 * Properties are grouped by category for better organization.
 */
export interface DSLProperties {
  // ============================================
  // Layout
  // ============================================
  /** Horizontal layout (flex-direction: row) */
  hor?: boolean
  /** Vertical layout (flex-direction: column) */
  ver?: boolean
  /** Gap between children */
  gap?: number
  /** Distribute children with space-between */
  between?: boolean
  /** Allow children to wrap */
  wrap?: boolean
  /** Flex grow to fill available space */
  grow?: boolean
  /** Flex shrink factor */
  shrink?: number

  // ============================================
  // Alignment
  // ============================================
  /** Align left */
  'hor-l'?: boolean
  /** Center horizontally */
  'hor-cen'?: boolean
  /** Align right */
  'hor-r'?: boolean
  /** Space between horizontal */
  'hor-between'?: boolean
  /** Align top */
  'ver-t'?: boolean
  /** Center vertically */
  'ver-cen'?: boolean
  /** Align bottom */
  'ver-b'?: boolean
  /** Space between vertical */
  'ver-between'?: boolean
  /** Main axis alignment (internal) */
  align_main?: string
  /** Cross axis alignment (internal) */
  align_cross?: string

  // ============================================
  // Sizing
  // ============================================
  /** Width in pixels or 'full' for 100% */
  w?: number | 'full'
  /** Height in pixels or 'full' for 100% */
  h?: number | 'full'
  /** Minimum width */
  minw?: number
  /** Maximum width */
  maxw?: number
  /** Minimum height */
  minh?: number
  /** Maximum height */
  maxh?: number
  /** 100% width and height */
  full?: boolean
  /** Alias for minw */
  'min-w'?: number
  /** Alias for maxw */
  'max-w'?: number
  /** Alias for minh */
  'min-h'?: number
  /** Alias for maxh */
  'max-h'?: number

  // ============================================
  // Spacing - Padding
  // ============================================
  /** Padding all sides */
  pad?: number
  /** Padding left */
  pad_l?: number
  /** Padding right */
  pad_r?: number
  /** Padding top */
  pad_u?: number
  /** Padding bottom */
  pad_d?: number

  // ============================================
  // Spacing - Margin
  // ============================================
  /** Margin all sides */
  mar?: number
  /** Margin left */
  mar_l?: number
  /** Margin right */
  mar_r?: number
  /** Margin top */
  mar_u?: number
  /** Margin bottom */
  mar_d?: number

  // ============================================
  // Colors
  // ============================================
  /** Background color */
  bg?: string
  /** Text/foreground color */
  col?: string
  /** Border color */
  boc?: string

  // ============================================
  // Border
  // ============================================
  /** Border radius */
  rad?: number
  /** Border width all sides */
  bor?: number
  /** Border width alias */
  border?: number
  /** Border left */
  bor_l?: number
  /** Border right */
  bor_r?: number
  /** Border top */
  bor_u?: number
  /** Border bottom */
  bor_d?: number

  // ============================================
  // Typography
  // ============================================
  /** Font size */
  size?: number
  /** Font weight (100-900) */
  weight?: number
  /** Font family */
  font?: string
  /** Line height */
  line?: number
  /** Text alignment */
  align?: TextAlign
  /** Transform text to uppercase */
  uppercase?: boolean
  /** Truncate text with ellipsis */
  truncate?: boolean

  // ============================================
  // Image
  // ============================================
  /** Image source URL */
  src?: string
  /** Alternative text */
  alt?: string
  /** Object fit mode */
  fit?: ObjectFit

  // ============================================
  // Overflow
  // ============================================
  /** Enable scrolling both directions */
  scroll?: boolean
  /** Enable horizontal scrolling */
  'scroll-x'?: boolean
  /** Enable vertical scrolling */
  'scroll-y'?: boolean
  /** Clip overflow content */
  clip?: boolean

  // ============================================
  // Hover States
  // ============================================
  /** Background color on hover */
  'hover-col'?: string
  /** Border color on hover */
  'hover-boc'?: string
  /** Border width on hover */
  'hover-bor'?: number

  // ============================================
  // Icon
  // ============================================
  /** Lucide icon name */
  icon?: string

  // ============================================
  // Effects
  // ============================================
  /** Box shadow size */
  shadow?: ShadowSize | string
  /** Opacity (0-1) */
  opacity?: number

  // ============================================
  // Position
  // ============================================
  /** Position type */
  pos?: 'relative' | 'absolute' | 'fixed' | 'sticky'
  /** Top position */
  top?: number
  /** Right position */
  right?: number
  /** Bottom position */
  bottom?: number
  /** Left position */
  left?: number
  /** Z-index */
  z?: number

  // ============================================
  // Input/Form Elements
  // ============================================
  /** Input placeholder */
  placeholder?: string
  /** Link href */
  href?: string
  /** Input type */
  type?: string
  /** Input value */
  value?: string | number

  // ============================================
  // Internal Properties
  // ============================================
  /** Primitive type (Input, Image, etc.) - internal use */
  _primitiveType?: string
  /** Display property override */
  display?: string

  // ============================================
  // Extensibility
  // ============================================
  /**
   * Allow additional properties for extensibility.
   * This enables forward compatibility with new properties
   * and custom user-defined properties.
   */
  [key: string]: unknown
}

/**
 * Type guard to check if a value is a valid DSLProperties object
 */
export function isDSLProperties(value: unknown): value is DSLProperties {
  return typeof value === 'object' && value !== null
}

/**
 * Strict DSL Properties without index signature.
 * Use this when you want to ensure only known properties are used.
 */
export type StrictDSLProperties = Omit<DSLProperties, keyof { [key: string]: unknown }>
