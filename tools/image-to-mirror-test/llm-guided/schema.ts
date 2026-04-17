/**
 * Hybrid Schema for LLM-Guided Image Analysis
 *
 * LLM outputs semantic structure, Pixel analysis adds precise values.
 */

// =============================================================================
// LLM Semantic Output (what the LLM sees)
// =============================================================================

/**
 * Element roles - semantic meaning, not visual
 */
export type ElementRole =
  | 'heading'
  | 'subheading'
  | 'description'
  | 'label'
  | 'value'
  | 'action'
  | 'submit'
  | 'cancel'
  | 'navigation'
  | 'content'
  | 'icon'
  | 'image'
  | 'divider'
  | 'spacer'

/**
 * Component types - maps to Mirror/Zag components
 */
export type ComponentType =
  | 'Button'
  | 'IconButton'
  | 'Input'
  | 'Textarea'
  | 'Checkbox'
  | 'Switch'
  | 'Select'
  | 'RadioGroup'
  | 'Slider'
  | 'Tabs'
  | 'Dialog'
  | 'Card'
  | 'Form'
  | 'FormField'
  | 'Table'
  | 'List'
  | 'ListItem'
  | 'Header'
  | 'Sidebar'
  | 'Navigation'
  | 'Container'
  | 'Text'
  | 'Icon'
  | 'Image'
  | 'Divider'

/**
 * Layout direction
 */
export type LayoutDirection = 'horizontal' | 'vertical' | 'stacked' | 'grid'

/**
 * Relative gap sizes (LLM estimates)
 */
export type GapSize = 'none' | 'tiny' | 'small' | 'medium' | 'large' | 'xlarge'

/**
 * Position hints
 */
export type Position =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

/**
 * Alignment/distribution within a container
 */
export type Alignment =
  | 'spread' // space-between
  | 'center' // both axes
  | 'hor-center' // horizontal center
  | 'ver-center' // vertical center
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'

/**
 * Single element in the semantic tree
 */
export interface SemanticElement {
  // Identity
  type: ComponentType
  role?: ElementRole

  // Content (text the LLM can read)
  text?: string
  placeholder?: string
  iconName?: string

  // Input specifics
  inputType?: 'text' | 'email' | 'password' | 'number' | 'search' | 'url' | 'tel'

  // State
  state?: 'active' | 'selected' | 'disabled' | 'checked' | 'expanded'

  // Layout
  layout?: LayoutDirection
  gap?: GapSize
  position?: Position
  alignment?: Alignment | Alignment[] // Can have multiple: ['spread', 'ver-center']
  grow?: boolean // flex-grow
  shrink?: boolean // flex-shrink

  // Children
  children?: SemanticElement[]

  // Hints for pixel analysis (approximate, not precise)
  hints?: {
    width?: 'fixed' | 'grow' | 'hug'
    height?: 'fixed' | 'grow' | 'hug'
    background?: 'dark' | 'light' | 'colored' | 'transparent'
    border?: boolean
    rounded?: boolean
    shadow?: boolean
  }
}

/**
 * Root analysis result from LLM
 */
export interface SemanticAnalysis {
  description: string
  componentType?: ComponentType
  layout?: LayoutDirection
  gap?: GapSize
  alignment?: Alignment | Alignment[]
  grow?: boolean
  children: SemanticElement[]
}

// =============================================================================
// Pixel Analysis Output (precise measurements)
// =============================================================================

export interface PixelBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface PixelElement {
  bounds: PixelBounds

  // Colors (precise hex values)
  backgroundColor?: string
  color?: string
  borderColor?: string

  // Dimensions
  padding?: { top: number; right: number; bottom: number; left: number }
  borderWidth?: number
  borderRadius?: number

  // Typography
  fontSize?: number
  fontWeight?: number | 'bold' | 'normal'
  fontFamily?: 'sans' | 'serif' | 'mono'

  // Text content (OCR or known)
  text?: string

  // Icon (if recognized)
  iconName?: string
  iconSize?: number

  // Children (nested elements)
  children?: PixelElement[]
}

// =============================================================================
// Merged Result (ready for code generation)
// =============================================================================

export interface MergedElement {
  // From LLM
  type: ComponentType
  role?: ElementRole

  // From LLM or Pixel
  text?: string
  placeholder?: string
  iconName?: string
  inputType?: string
  state?: string

  // From Pixel (precise)
  bounds: PixelBounds
  backgroundColor?: string
  color?: string
  borderColor?: string
  borderWidth?: number
  borderRadius?: number
  padding?: { top: number; right: number; bottom: number; left: number }
  fontSize?: number
  fontWeight?: number | string

  // Layout (from LLM, gap from Pixel)
  layout?: LayoutDirection
  gap?: number

  // Semantic layout hints (from LLM - can't be detected from pixels)
  alignment?: Alignment | Alignment[] // spread, center, ver-center
  grow?: boolean // flex-grow
  shrink?: boolean // flex-shrink
  position?: Position // absolute positioning hint

  // Children
  children?: MergedElement[]
}

export interface MergedAnalysis {
  description: string
  root: MergedElement
}

// =============================================================================
// Gap Size Mapping
// =============================================================================

export const GAP_SIZE_MAP: Record<GapSize, number> = {
  none: 0,
  tiny: 4,
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 24,
}

// =============================================================================
// Utility: Estimate gap from pixel value
// =============================================================================

export function estimateGapSize(pixels: number): GapSize {
  if (pixels <= 0) return 'none'
  if (pixels <= 4) return 'tiny'
  if (pixels <= 8) return 'small'
  if (pixels <= 14) return 'medium'
  if (pixels <= 20) return 'large'
  return 'xlarge'
}
