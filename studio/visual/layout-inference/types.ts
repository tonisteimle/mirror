/**
 * Layout Inference Types
 *
 * Types for the layout inference system that detects aligned
 * absolutely positioned elements and suggests layout conversions.
 */

export type AlignmentType = 'horizontal' | 'vertical'

/**
 * Bounds information for an element in the preview
 */
export interface ElementBounds {
  nodeId: string
  element: HTMLElement
  rect: DOMRect
  centerX: number
  centerY: number
}

/**
 * A group of elements that are aligned and could be converted to a layout container
 */
export interface AlignmentGroup {
  id: string
  type: AlignmentType
  elements: ElementBounds[]
  /** Inferred gap between elements (rounded to 4px grid) */
  inferredGap: number
  /** Suggested DSL properties for the wrapper, e.g., "hor, gap 16" */
  suggestedDSL: string
}

/**
 * Result of alignment detection
 */
export interface AlignmentDetectionResult {
  /** Groups of aligned elements */
  groups: AlignmentGroup[]
  /** Timestamp of detection */
  timestamp: number
}

/**
 * Configuration for the alignment detector
 */
export interface AlignmentDetectorConfig {
  /** Container element to search for aligned elements */
  container: HTMLElement
  /** Tolerance in pixels for alignment detection (default: 10) */
  tolerance?: number
  /** Minimum number of elements to form a group (default: 2) */
  minGroupSize?: number
  /** Node ID attribute name (default: 'data-mirror-id') */
  nodeIdAttribute?: string
}

/**
 * Configuration for the inference indicator
 */
export interface InferenceIndicatorConfig {
  /** Container element for overlay rendering */
  container: HTMLElement
  /** Color for the indicator (default: #10B981 - emerald) */
  color?: string
  /** Callback when an indicator is clicked */
  onConvert?: (group: AlignmentGroup) => void
}

/**
 * Configuration for the layout converter
 */
export interface LayoutConverterConfig {
  /** Function to get the current source code */
  getSource: () => string
  /** Function to get the current source map */
  getSourceMap: () => any
  /** Callback after conversion with new source */
  onSourceChange: (newSource: string) => void
}

/**
 * Configuration for the layout inference manager
 */
export interface LayoutInferenceManagerConfig {
  /** Container element (preview container) */
  container: HTMLElement
  /** Function to get the current source map */
  getSourceMap: () => any
  /** Function to get the current source code */
  getSource: () => string
  /** Callback after conversion with new source */
  onSourceChange: (newSource: string) => void
  /** Debounce delay in ms (default: 500) */
  debounceDelay?: number
}
