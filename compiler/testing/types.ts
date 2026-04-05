/**
 * Style Validation Types
 *
 * Types for validating that UI elements render exactly as expected.
 */

import type { SourcePosition, IRNode, IRStyle } from '../ir/types'

// =============================================================================
// VALIDATION RESULT TYPES
// =============================================================================

/**
 * A single style mismatch between expected and actual
 */
export interface StyleMismatch {
  /** CSS property name */
  property: string
  /** Expected value from IR */
  expected: string
  /** Actual value from DOM */
  actual: string
  /** Source position of the property (if available) */
  sourcePosition?: SourcePosition
}

/**
 * Result of validating a single element
 */
export interface ElementValidation {
  /** Whether the element passed validation */
  passed: boolean
  /** IR node ID */
  nodeId: string
  /** Component name (if any) */
  componentName?: string
  /** Source position of the element */
  sourcePosition?: SourcePosition
  /** Expected styles from IR */
  expectedStyles: Record<string, string>
  /** Actual styles from DOM */
  actualStyles: Record<string, string>
  /** List of mismatches (empty if passed) */
  mismatches: StyleMismatch[]
  /** State being validated (undefined = base state) */
  state?: string
}

/**
 * Result of validating all elements in a render
 */
export interface ValidationResult {
  /** Whether all elements passed validation */
  passed: boolean
  /** Total number of elements validated */
  totalElements: number
  /** Number of elements that passed */
  passedElements: number
  /** Number of elements that failed */
  failedElements: number
  /** Total number of style properties checked */
  totalProperties: number
  /** Number of properties that matched */
  matchedProperties: number
  /** Individual element validations */
  elements: ElementValidation[]
  /** Only failed validations (for quick access) */
  failures: ElementValidation[]
}

// =============================================================================
// VALIDATION OPTIONS
// =============================================================================

/**
 * Options for style validation
 */
export interface ValidationOptions {
  /**
   * Properties to ignore during validation.
   * Useful for browser-specific properties or computed values.
   */
  ignoreProperties?: string[]

  /**
   * Whether to validate computed styles (getComputedStyle)
   * instead of inline styles. Default: false (validate inline styles)
   */
  useComputedStyles?: boolean

  /**
   * Whether to validate state styles in addition to base styles.
   * Default: true
   */
  validateStates?: boolean

  /**
   * Specific states to validate. If not provided, validates all states.
   */
  states?: string[]

  /**
   * Tolerance for numeric values (e.g., for rounding differences).
   * Default: 0 (exact match)
   */
  numericTolerance?: number

  /**
   * Whether to normalize color values for comparison.
   * Default: true
   */
  normalizeColors?: boolean
}

// =============================================================================
// RENDER CONTEXT
// =============================================================================

/**
 * Context for a rendered Mirror component
 */
export interface RenderContext {
  /** The root DOM element */
  root: HTMLElement
  /** All rendered elements with their IR node IDs */
  elements: Map<string, HTMLElement>
  /** The IR used for rendering */
  ir: import('../ir/types').IR
  /** Source map for bidirectional editing */
  sourceMap: import('../ir').SourceMap
  /** Cleanup function to remove rendered elements */
  cleanup: () => void
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Expected style definition for assertions
 */
export interface ExpectedStyle {
  /** CSS property */
  property: string
  /** Expected value */
  value: string
  /** State context (undefined = base state) */
  state?: string
}

/**
 * Assertion options for expect-style API
 */
export interface AssertionOptions {
  /** Custom error message prefix */
  message?: string
  /** Source file reference for error reporting */
  sourceRef?: string
}

// =============================================================================
// IR STYLE HELPERS
// =============================================================================

/**
 * Extract base styles (no state) from IR node
 */
export function getBaseStyles(node: IRNode): IRStyle[] {
  return node.styles.filter(s => !s.state)
}

/**
 * Extract state-specific styles from IR node
 */
export function getStateStyles(node: IRNode, state: string): IRStyle[] {
  return node.styles.filter(s => s.state === state)
}

/**
 * Get all unique states defined on an IR node
 */
export function getDefinedStates(node: IRNode): string[] {
  const states = new Set<string>()
  for (const style of node.styles) {
    if (style.state) {
      states.add(style.state)
    }
  }
  return Array.from(states)
}

/**
 * Convert IR styles array to Record for easier comparison
 */
export function stylesToRecord(styles: IRStyle[]): Record<string, string> {
  const record: Record<string, string> = {}
  for (const style of styles) {
    record[style.property] = style.value
  }
  return record
}
