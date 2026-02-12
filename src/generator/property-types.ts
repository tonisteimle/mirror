/**
 * Property Types Module
 *
 * Type definitions for component properties used in the DSL.
 * Provides type safety for AST node properties.
 */

/**
 * Alignment values for main and cross axis.
 */
export type AlignmentValue = 'cen' | 'l' | 'u' | 'r' | 'd' | 'between'
export type CrossAlignmentValue = 'cen' | 'l' | 'u' | 'r' | 'd'

/**
 * Object fit values for images.
 */
export type ObjectFitValue = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'

/**
 * Component properties interface.
 * Contains all possible properties that can be set on a DSL component.
 */
export interface ComponentProperties {
  // Layout
  hor?: boolean
  ver?: boolean
  gap?: number
  wrap?: boolean
  grow?: boolean
  shrink?: number
  align_main?: AlignmentValue
  align_cross?: CrossAlignmentValue

  // Absolute alignment (direction-independent)
  'hor-l'?: boolean
  'hor-cen'?: boolean
  'hor-r'?: boolean
  'ver-t'?: boolean
  'ver-cen'?: boolean
  'ver-b'?: boolean

  // Between spacing
  between?: boolean

  // Sizing
  w?: number | 'full'
  h?: number | 'full'
  minw?: number
  maxw?: number
  minh?: number
  maxh?: number
  full?: boolean

  // Spacing - Padding
  pad?: number
  pad_u?: number
  pad_d?: number
  pad_l?: number
  pad_r?: number

  // Spacing - Margin
  mar?: number
  mar_u?: number
  mar_d?: number
  mar_l?: number
  mar_r?: number

  // Colors
  col?: string
  boc?: string

  // Border
  rad?: number
  bor?: number
  bor_l?: number
  bor_r?: number
  bor_u?: number
  bor_d?: number

  // Typography
  size?: number
  weight?: number
  font?: string
  line?: number
  align?: 'left' | 'center' | 'right' | 'justify'
  italic?: boolean
  underline?: boolean
  uppercase?: boolean
  lowercase?: boolean
  truncate?: boolean

  // Images
  src?: string
  alt?: string
  fit?: ObjectFitValue

  // Icons
  icon?: string

  // Overflow
  scroll?: boolean
  'scroll-x'?: boolean
  'scroll-y'?: boolean
  clip?: boolean

  // Effects
  shadow?: string | number
  opacity?: number
  cursor?: string
  pointer?: string
  z?: number

  // Hover styles (dynamic keys for hover-*)
  'hover-col'?: string
  'hover-boc'?: string
  'hover-bor'?: number
  'hover-rad'?: number

  // Content (set via string after component name)
  content?: string

  // Display state (for interactive components)
  display?: 'none' | 'flex' | 'block'

  // Visibility (for overlays)
  hidden?: boolean

  // Allow additional hover-* properties
  [key: `hover-${string}`]: string | number | boolean | undefined
}

/**
 * Type guard to check if a property is a hover property.
 */
export function isHoverProperty(key: string): key is `hover-${string}` {
  return key.startsWith('hover-')
}

/**
 * Extract hover properties from a ComponentProperties object.
 */
export function extractHoverProperties(
  properties: ComponentProperties
): Partial<ComponentProperties> {
  const hoverProps: Partial<ComponentProperties> = {}
  for (const key of Object.keys(properties)) {
    if (isHoverProperty(key)) {
      hoverProps[key] = properties[key]
    }
  }
  return hoverProps
}
