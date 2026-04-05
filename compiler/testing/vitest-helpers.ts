/**
 * Vitest Integration for Style Validation
 *
 * Provides convenient test helpers and custom matchers for vitest.
 */

import { expect } from 'vitest'
import type { RenderContext, ValidationOptions, ValidationResult, ElementValidation } from './types'
import { renderMirror } from './render'
import { validateAll, validateById, formatReport } from './style-validator'

// =============================================================================
// TEST WRAPPER
// =============================================================================

/**
 * Run a validation test with automatic cleanup
 *
 * @example
 * ```typescript
 * withMirror('Frame hor, gap 12', (ctx) => {
 *   expect(ctx).toPassValidation()
 * })
 * ```
 */
export function withMirror(
  code: string,
  testFn: (ctx: RenderContext) => void | Promise<void>
): void | Promise<void> {
  const ctx = renderMirror(code)
  try {
    return testFn(ctx)
  } finally {
    ctx.cleanup()
  }
}

/**
 * Async version of withMirror
 */
export async function withMirrorAsync(
  code: string,
  testFn: (ctx: RenderContext) => Promise<void>
): Promise<void> {
  const ctx = renderMirror(code)
  try {
    await testFn(ctx)
  } finally {
    ctx.cleanup()
  }
}

// =============================================================================
// EXPECTATION HELPERS
// =============================================================================

/**
 * Expect a render context to pass all validations
 */
export function expectValid(ctx: RenderContext, options?: ValidationOptions): ValidationResult {
  const result = validateAll(ctx, options)

  if (!result.passed) {
    const report = formatReport(result)
    expect.fail(`Style validation failed:\n\n${report}`)
  }

  return result
}

/**
 * Expect a specific element to pass validation
 */
export function expectElementValid(
  ctx: RenderContext,
  nodeId: string,
  options?: ValidationOptions
): ElementValidation {
  const result = validateById(ctx, nodeId, options)

  if (!result) {
    expect.fail(`Element not found: ${nodeId}`)
  }

  if (!result.passed) {
    const mismatches = result.mismatches
      .map(m => `  ${m.property}: expected "${m.expected}", got "${m.actual}"`)
      .join('\n')
    expect.fail(`Element ${nodeId} failed validation:\n${mismatches}`)
  }

  return result
}

/**
 * Expect a specific style on an element
 */
export function expectStyle(
  ctx: RenderContext,
  nodeId: string,
  property: string,
  expectedValue: string
): void {
  const result = validateById(ctx, nodeId)

  if (!result) {
    expect.fail(`Element not found: ${nodeId}`)
  }

  const actualValue = result.actualStyles[property]

  if (actualValue === undefined) {
    expect.fail(`Property "${property}" not set on element ${nodeId}`)
  }

  expect(actualValue).toBe(expectedValue)
}

/**
 * Expect multiple styles on an element
 */
export function expectStyles(
  ctx: RenderContext,
  nodeId: string,
  expectedStyles: Record<string, string>
): void {
  const result = validateById(ctx, nodeId)

  if (!result) {
    expect.fail(`Element not found: ${nodeId}`)
  }

  for (const [property, expectedValue] of Object.entries(expectedStyles)) {
    const actualValue = result.actualStyles[property]

    if (actualValue === undefined) {
      expect.fail(`Property "${property}" not set on element ${nodeId}`)
    }

    expect(actualValue, `${nodeId}.${property}`).toBe(expectedValue)
  }
}

// =============================================================================
// QUICK VALIDATORS
// =============================================================================

/**
 * Quick validation for a single code snippet
 *
 * @example
 * ```typescript
 * test('Frame hor defaults', () => {
 *   quickValidate('Frame hor')
 * })
 * ```
 */
export function quickValidate(code: string, options?: ValidationOptions): ValidationResult {
  const ctx = renderMirror(code)
  try {
    return expectValid(ctx, options)
  } finally {
    ctx.cleanup()
  }
}

/**
 * Quick style check for a single code snippet
 *
 * @example
 * ```typescript
 * test('Frame hor has flex-direction row', () => {
 *   quickExpectStyle('Frame hor', 'flex-direction', 'row')
 * })
 * ```
 */
export function quickExpectStyle(
  code: string,
  property: string,
  expectedValue: string
): void {
  const ctx = renderMirror(code)
  try {
    // Find the first element with styles
    const firstNode = ctx.ir.nodes[0]
    if (!firstNode) {
      expect.fail('No elements in rendered code')
    }
    expectStyle(ctx, firstNode.id, property, expectedValue)
  } finally {
    ctx.cleanup()
  }
}

/**
 * Quick multi-style check for a single code snippet
 *
 * @example
 * ```typescript
 * test('Frame hor, center has correct styles', () => {
 *   quickExpectStyles('Frame hor, center', {
 *     'display': 'flex',
 *     'flex-direction': 'row',
 *     'justify-content': 'center',
 *     'align-items': 'center',
 *   })
 * })
 * ```
 */
export function quickExpectStyles(
  code: string,
  expectedStyles: Record<string, string>
): void {
  const ctx = renderMirror(code)
  try {
    const firstNode = ctx.ir.nodes[0]
    if (!firstNode) {
      expect.fail('No elements in rendered code')
    }
    expectStyles(ctx, firstNode.id, expectedStyles)
  } finally {
    ctx.cleanup()
  }
}

// =============================================================================
// DEBUG HELPERS
// =============================================================================

/**
 * Log validation result to console (for debugging)
 */
export function logValidation(ctx: RenderContext, options?: ValidationOptions): void {
  const result = validateAll(ctx, options)
  console.log(formatReport(result))
}

/**
 * Log element styles to console (for debugging)
 */
export function logElementStyles(ctx: RenderContext, nodeId: string): void {
  const result = validateById(ctx, nodeId)
  if (!result) {
    console.log(`Element not found: ${nodeId}`)
    return
  }

  console.log(`\nElement: ${nodeId}${result.componentName ? ` (${result.componentName})` : ''}`)
  console.log('Expected styles (from IR):')
  for (const [prop, value] of Object.entries(result.expectedStyles)) {
    console.log(`  ${prop}: ${value}`)
  }
  console.log('Actual styles (from DOM):')
  for (const [prop, value] of Object.entries(result.actualStyles)) {
    console.log(`  ${prop}: ${value}`)
  }
}
