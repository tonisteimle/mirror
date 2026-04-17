/**
 * Types for LLM-Guided Image Analysis
 */

// =============================================================================
// LLM Response Types
// =============================================================================

export interface ElementHint {
  type: 'button' | 'text' | 'icon' | 'input' | 'checkbox' | 'select' | 'container' | 'image'
  description: string
  position:
    | 'center'
    | 'top'
    | 'bottom'
    | 'left'
    | 'right'
    | 'top-left'
    | 'top-right'
    | 'bottom-left'
    | 'bottom-right'
  text?: string // Erkannter Text
  iconName?: string // Erkanntes Icon
  children?: ElementHint[] // Für Container
}

export interface LayoutHint {
  direction: 'horizontal' | 'vertical'
  gap?: 'none' | 'small' | 'medium' | 'large'
  alignment?: 'start' | 'center' | 'end' | 'spread'
}

export interface LLMAnalysis {
  description: string // Natürlichsprachige Beschreibung
  elements: ElementHint[] // Erkannte Elemente
  layout?: LayoutHint // Layout-Vermutung
  componentType?: string // Zag-Komponente (Button, Select, Checkbox, Tabs, etc.)
  needsRecursion?: boolean // Soll tiefer analysiert werden?
}

// =============================================================================
// Precise Detection Result (from Pixel Analysis)
// =============================================================================

export interface DetectedElement {
  type: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  color?: string
  backgroundColor?: string
  text?: string
  iconName?: string
  fontSize?: number
  fontWeight?: string
  radius?: number
  border?: {
    width: number
    color: string
  }
  padding?: {
    top: number
    right: number
    bottom: number
    left: number
  }
  children?: DetectedElement[]
}

// =============================================================================
// LLM Interface (for mocking and real implementation)
// =============================================================================

export interface LLMInterface {
  analyze(imageBuffer: Buffer, context?: string): Promise<LLMAnalysis>
}
