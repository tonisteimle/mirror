/**
 * Style Validator
 *
 * Validates that UI elements render exactly as expected by comparing
 * IR-defined styles with actual DOM styles.
 *
 * The IR is the source of truth - it contains what SHOULD be rendered.
 * The DOM is the reality - it contains what WAS rendered.
 * This module compares the two and reports any discrepancies.
 */

import type {
  StyleMismatch,
  ElementValidation,
  ValidationResult,
  ValidationOptions,
  RenderContext,
} from './types'
import { getBaseStyles, getStateStyles, stylesToRecord, getDefinedStates } from './types'
import {
  getElementByNodeId,
  getElementBaseStyles,
  getElementStateStyles,
  getIRNodeById,
  getAllIRNodes,
} from './render'
import type { IRNode, SourcePosition } from '../ir/types'

// =============================================================================
// STYLE COMPARISON
// =============================================================================

/**
 * Default properties to ignore during validation.
 * These are often browser-specific or computed values.
 */
const DEFAULT_IGNORE_PROPERTIES = [
  // Browser-specific
  '-webkit-',
  '-moz-',
  '-ms-',
  // Often computed differently
  'line-height',
]

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '')

  // Handle 3-char and 6-char hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  }

  if (hex.length !== 6) return null

  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)

  if (isNaN(r) || isNaN(g) || isNaN(b)) return null

  return { r, g, b }
}

/**
 * Normalize a color value to a standard format for comparison.
 * Converts both hex and rgb() to a normalized rgb() format.
 */
function normalizeColor(value: string): string {
  // Handle hex colors
  const hexMatch = value.match(/^#([0-9a-fA-F]{3,8})$/)
  if (hexMatch) {
    const rgb = hexToRgb(hexMatch[0])
    if (rgb) {
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    }
  }

  // Handle rgb/rgba - normalize spacing
  const rgbMatch = value.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgbMatch) {
    return `rgb(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]})`
  }

  return value
}

/**
 * Normalize a CSS value for comparison
 */
function normalizeValue(value: string, options: ValidationOptions): string {
  let normalized = value.trim()

  // Normalize colors if requested
  if (options.normalizeColors !== false) {
    normalized = normalizeColor(normalized)
  }

  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, ' ')

  return normalized
}

/**
 * Check if two values match within tolerance
 */
function valuesMatch(expected: string, actual: string, options: ValidationOptions): boolean {
  const normalizedExpected = normalizeValue(expected, options)
  const normalizedActual = normalizeValue(actual, options)

  // Exact match
  if (normalizedExpected === normalizedActual) {
    return true
  }

  // Numeric tolerance check
  if (options.numericTolerance && options.numericTolerance > 0) {
    const numExpected = parseFloat(normalizedExpected)
    const numActual = parseFloat(normalizedActual)
    if (!isNaN(numExpected) && !isNaN(numActual)) {
      return Math.abs(numExpected - numActual) <= options.numericTolerance
    }
  }

  return false
}

/**
 * Check if a property should be ignored
 */
function shouldIgnore(property: string, options: ValidationOptions): boolean {
  const ignoreList = options.ignoreProperties || DEFAULT_IGNORE_PROPERTIES

  for (const ignore of ignoreList) {
    if (ignore.endsWith('-')) {
      // Prefix match (e.g., '-webkit-')
      if (property.startsWith(ignore)) return true
    } else {
      // Exact match
      if (property === ignore) return true
    }
  }

  return false
}

// =============================================================================
// ELEMENT VALIDATION
// =============================================================================

/**
 * Validate a single element's styles
 */
export function validateElement(
  irNode: IRNode,
  domElement: HTMLElement,
  options: ValidationOptions = {}
): ElementValidation {
  const mismatches: StyleMismatch[] = []

  // Get expected styles from IR (base state)
  const expectedIRStyles = getBaseStyles(irNode)
  const expectedStyles = stylesToRecord(expectedIRStyles)

  // Get actual styles from DOM
  const actualStyles = getElementBaseStyles(domElement)

  // Compare each expected style
  for (const [property, expectedValue] of Object.entries(expectedStyles)) {
    if (shouldIgnore(property, options)) continue

    const actualValue = actualStyles[property]

    if (actualValue === undefined) {
      // Style not set in DOM
      mismatches.push({
        property,
        expected: expectedValue,
        actual: '(not set)',
        sourcePosition: getPropertySourcePosition(irNode, property),
      })
    } else if (!valuesMatch(expectedValue, actualValue, options)) {
      // Style value mismatch
      mismatches.push({
        property,
        expected: expectedValue,
        actual: actualValue,
        sourcePosition: getPropertySourcePosition(irNode, property),
      })
    }
  }

  return {
    passed: mismatches.length === 0,
    nodeId: irNode.id,
    componentName: irNode.name,
    sourcePosition: irNode.sourcePosition,
    expectedStyles,
    actualStyles,
    mismatches,
  }
}

/**
 * Validate element's state-specific styles
 */
export function validateElementState(
  irNode: IRNode,
  domElement: HTMLElement,
  state: string,
  options: ValidationOptions = {}
): ElementValidation {
  const mismatches: StyleMismatch[] = []

  // Get expected styles from IR for this state
  const expectedIRStyles = getStateStyles(irNode, state)
  const expectedStyles = stylesToRecord(expectedIRStyles)

  // Get actual styles from DOM for this state
  const actualStyles = getElementStateStyles(domElement, state)

  // Compare each expected style
  for (const [property, expectedValue] of Object.entries(expectedStyles)) {
    if (shouldIgnore(property, options)) continue

    const actualValue = actualStyles[property]

    if (actualValue === undefined) {
      mismatches.push({
        property,
        expected: expectedValue,
        actual: '(not set)',
        sourcePosition: getPropertySourcePosition(irNode, property),
      })
    } else if (!valuesMatch(expectedValue, actualValue, options)) {
      mismatches.push({
        property,
        expected: expectedValue,
        actual: actualValue,
        sourcePosition: getPropertySourcePosition(irNode, property),
      })
    }
  }

  return {
    passed: mismatches.length === 0,
    nodeId: irNode.id,
    componentName: irNode.name,
    sourcePosition: irNode.sourcePosition,
    expectedStyles,
    actualStyles,
    mismatches,
    state,
  }
}

/**
 * Get source position for a specific property
 */
function getPropertySourcePosition(node: IRNode, propertyName: string): SourcePosition | undefined {
  if (!node.propertySourceMaps) return undefined

  const mapping = node.propertySourceMaps.find(m => m.name === propertyName)
  return mapping?.position
}

// =============================================================================
// FULL VALIDATION
// =============================================================================

/**
 * Validate all elements in a render context
 */
export function validateAll(
  ctx: RenderContext,
  options: ValidationOptions = {}
): ValidationResult {
  const elementValidations: ElementValidation[] = []
  let totalProperties = 0
  let matchedProperties = 0

  // Get all IR nodes
  const irNodes = getAllIRNodes(ctx.ir)

  for (const irNode of irNodes) {
    // Skip definitions (only validate instances)
    if (irNode.isDefinition) continue

    // Find corresponding DOM element
    const domElement = getElementByNodeId(ctx, irNode.id)
    if (!domElement) {
      // Element not found in DOM - this is a validation failure
      elementValidations.push({
        passed: false,
        nodeId: irNode.id,
        componentName: irNode.name,
        sourcePosition: irNode.sourcePosition,
        expectedStyles: stylesToRecord(getBaseStyles(irNode)),
        actualStyles: {},
        mismatches: [{
          property: '(element)',
          expected: 'present in DOM',
          actual: 'not found',
          sourcePosition: irNode.sourcePosition,
        }],
      })
      continue
    }

    // Validate base styles
    const baseValidation = validateElement(irNode, domElement, options)
    elementValidations.push(baseValidation)
    totalProperties += Object.keys(baseValidation.expectedStyles).length
    matchedProperties += Object.keys(baseValidation.expectedStyles).length - baseValidation.mismatches.length

    // Validate state styles if requested
    if (options.validateStates !== false) {
      const states = options.states || getDefinedStates(irNode)

      for (const state of states) {
        const stateValidation = validateElementState(irNode, domElement, state, options)
        elementValidations.push(stateValidation)
        totalProperties += Object.keys(stateValidation.expectedStyles).length
        matchedProperties += Object.keys(stateValidation.expectedStyles).length - stateValidation.mismatches.length
      }
    }
  }

  const failures = elementValidations.filter(v => !v.passed)

  return {
    passed: failures.length === 0,
    totalElements: elementValidations.length,
    passedElements: elementValidations.length - failures.length,
    failedElements: failures.length,
    totalProperties,
    matchedProperties,
    elements: elementValidations,
    failures,
  }
}

/**
 * Validate a specific element by node ID
 */
export function validateById(
  ctx: RenderContext,
  nodeId: string,
  options: ValidationOptions = {}
): ElementValidation | null {
  const irNode = getIRNodeById(ctx.ir, nodeId)
  if (!irNode) return null

  const domElement = getElementByNodeId(ctx, nodeId)
  if (!domElement) {
    return {
      passed: false,
      nodeId,
      componentName: irNode.name,
      sourcePosition: irNode.sourcePosition,
      expectedStyles: stylesToRecord(getBaseStyles(irNode)),
      actualStyles: {},
      mismatches: [{
        property: '(element)',
        expected: 'present in DOM',
        actual: 'not found',
        sourcePosition: irNode.sourcePosition,
      }],
    }
  }

  return validateElement(irNode, domElement, options)
}

// =============================================================================
// ASSERTION HELPERS
// =============================================================================

/**
 * Assert that all elements pass validation (throws on failure)
 */
export function assertValid(ctx: RenderContext, options: ValidationOptions = {}): void {
  const result = validateAll(ctx, options)

  if (!result.passed) {
    const messages: string[] = []
    messages.push(`Style validation failed: ${result.failedElements}/${result.totalElements} elements have mismatches`)
    messages.push('')

    for (const failure of result.failures) {
      const location = failure.sourcePosition
        ? `line ${failure.sourcePosition.line}`
        : 'unknown location'
      const state = failure.state ? ` (state: ${failure.state})` : ''

      messages.push(`  ${failure.nodeId}${failure.componentName ? ` (${failure.componentName})` : ''} at ${location}${state}:`)

      for (const mismatch of failure.mismatches) {
        messages.push(`    ${mismatch.property}: expected "${mismatch.expected}", got "${mismatch.actual}"`)
      }
    }

    throw new Error(messages.join('\n'))
  }
}

/**
 * Assert that a specific property matches
 */
export function assertStyle(
  ctx: RenderContext,
  nodeId: string,
  property: string,
  expectedValue: string,
  options: ValidationOptions = {}
): void {
  const domElement = getElementByNodeId(ctx, nodeId)
  if (!domElement) {
    throw new Error(`Element not found: ${nodeId}`)
  }

  const actualStyles = getElementBaseStyles(domElement)
  const actualValue = actualStyles[property]

  if (actualValue === undefined) {
    throw new Error(`Property "${property}" not set on element ${nodeId}`)
  }

  if (!valuesMatch(expectedValue, actualValue, options)) {
    throw new Error(
      `Style mismatch on ${nodeId}.${property}: expected "${expectedValue}", got "${actualValue}"`
    )
  }
}

// =============================================================================
// REPORTING
// =============================================================================

/**
 * Format validation result as a human-readable report
 */
export function formatReport(result: ValidationResult): string {
  const lines: string[] = []

  // Summary
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('                    STYLE VALIDATION REPORT')
  lines.push('═══════════════════════════════════════════════════════════════')
  lines.push('')
  lines.push(`Status: ${result.passed ? '✓ PASSED' : '✗ FAILED'}`)
  lines.push(`Elements: ${result.passedElements}/${result.totalElements} passed`)
  lines.push(`Properties: ${result.matchedProperties}/${result.totalProperties} matched`)
  lines.push('')

  if (result.failures.length > 0) {
    lines.push('───────────────────────────────────────────────────────────────')
    lines.push('                         FAILURES')
    lines.push('───────────────────────────────────────────────────────────────')

    for (const failure of result.failures) {
      const location = failure.sourcePosition
        ? `line ${failure.sourcePosition.line}, col ${failure.sourcePosition.column}`
        : 'unknown'
      const state = failure.state ? ` [state: ${failure.state}]` : ''

      lines.push('')
      lines.push(`► ${failure.nodeId}${failure.componentName ? ` (${failure.componentName})` : ''}${state}`)
      lines.push(`  Location: ${location}`)
      lines.push('  Mismatches:')

      for (const mismatch of failure.mismatches) {
        lines.push(`    • ${mismatch.property}`)
        lines.push(`      Expected: ${mismatch.expected}`)
        lines.push(`      Actual:   ${mismatch.actual}`)
      }
    }
  }

  lines.push('')
  lines.push('═══════════════════════════════════════════════════════════════')

  return lines.join('\n')
}
