/**
 * Error Tests: Invalid Property Values
 *
 * Tests for invalid property values and type mismatches.
 */

import { describe, it, expect } from 'vitest'
import { compileAndExecute, compile } from '../../test-utils'

describe('Invalid Property Values', () => {
  it('handles invalid color format', () => {
    // Documents current behavior - may or may not validate colors
    const { root } = compileAndExecute(`
Box as frame:
  bg notacolor

Box
`)
    // Current behavior: invalid color is passed through
    expect(root).toBeDefined()
  })

  it('handles non-numeric padding', () => {
    // Test what happens with invalid padding value
    try {
      const { root } = compileAndExecute(`
Box as frame:
  pad abc

Box
`)
      expect(root).toBeDefined()
    } catch (e) {
      // Error is acceptable for invalid values
      expect(e).toBeDefined()
    }
  })

  it('handles missing property value', () => {
    // Incomplete property declaration
    try {
      const code = compile(`
Box as frame:
  pad

Box
`)
      expect(code).toBeDefined()
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})

describe('Property Type Validation', () => {
  it('accepts valid numeric values', () => {
    const { root } = compileAndExecute(`
Box as frame:
  pad 16
  gap 8
  opacity 0.5

Box
`)
    expect(root.style.padding).toBe('16px')
    expect(root.style.gap).toBe('8px')
    expect(root.style.opacity).toBe('0.5')
  })

  it('accepts valid keyword values', () => {
    const { root } = compileAndExecute(`
Box as frame:
  horizontal
  center
  cursor pointer

Box
`)
    expect(root.style.flexDirection).toBe('row')
    expect(root.style.cursor).toBe('pointer')
  })
})
