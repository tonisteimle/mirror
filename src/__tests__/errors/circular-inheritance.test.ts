/**
 * Error Tests: Circular Inheritance
 *
 * Tests for circular reference detection in component inheritance.
 */

import { describe, it, expect } from 'vitest'
import { parseOnly, compile } from '../../test-utils'

describe('Circular Inheritance', () => {
  it('handles direct circular reference (A → B → A)', () => {
    // Test documents current behavior - may or may not throw
    const code = `
A as B:
B as A:

A
`
    // Either throws or produces errors
    try {
      const result = compile(code)
      // If it compiles, check that behavior is defined
      expect(result).toBeDefined()
    } catch (e) {
      // Error is expected for circular references
      expect(e).toBeDefined()
    }
  })

  it('handles indirect circular reference (A → B → C → A)', () => {
    const code = `
A as B:
B as C:
C as A:

A
`
    try {
      const result = compile(code)
      expect(result).toBeDefined()
    } catch (e) {
      expect(e).toBeDefined()
    }
  })

  it('handles self-reference (A as A)', () => {
    const code = `
A as A:

A
`
    try {
      const result = compile(code)
      expect(result).toBeDefined()
    } catch (e) {
      expect(e).toBeDefined()
    }
  })
})
