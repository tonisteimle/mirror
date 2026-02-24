/**
 * Property-Based Testing Demo
 *
 * Shows how to use fast-check to find edge cases in the parser.
 * Uses small numRuns for fast CI execution.
 */
import { describe, it, expect } from 'vitest'
import {
  fc,
  componentName,
  hexColor,
  pixelValue,
  componentWithBg,
  componentWithProps,
} from '../property-based'
import { parse } from '../../parser/parser'

// Small numRuns for fast tests - increase for thorough testing
const FAST_RUNS = 10
const NORMAL_RUNS = 20

describe('Property-Based Parser Tests', () => {
  describe('Parser Safety', () => {
    it('never throws on random string input', () => {
      fc.assert(
        fc.property(fc.string({ maxLength: 100 }), (input) => {
          expect(() => parse(input)).not.toThrow()
        }),
        { numRuns: FAST_RUNS }
      )
    })
  })

  describe('Valid Mirror Code', () => {
    it('simple components parse without errors', () => {
      fc.assert(
        fc.property(componentName, (name) => {
          const result = parse(name)
          expect(result.errors).toHaveLength(0)
          expect(result.nodes[0].name).toBe(name)
        }),
        { numRuns: FAST_RUNS }
      )
    })

    it('components with bg parse correctly', () => {
      fc.assert(
        fc.property(componentWithBg, (code) => {
          const result = parse(code)
          expect(result.errors).toHaveLength(0)
          expect(result.nodes[0].properties.bg).toMatch(/^#[0-9A-F]{6}$/i)
        }),
        { numRuns: NORMAL_RUNS }
      )
    })

    it('components with multiple props parse correctly', () => {
      fc.assert(
        fc.property(componentWithProps, (code) => {
          const result = parse(code)
          expect(result.errors).toHaveLength(0)
        }),
        { numRuns: NORMAL_RUNS }
      )
    })
  })

  describe('Parser Invariants', () => {
    it('padding values are preserved', () => {
      fc.assert(
        fc.property(componentName, pixelValue, (name, pad) => {
          const code = `${name} pad ${pad}`
          const result = parse(code)
          expect(result.nodes[0].properties.pad).toBe(pad)
        }),
        { numRuns: NORMAL_RUNS }
      )
    })

    it('hex colors are preserved', () => {
      fc.assert(
        fc.property(componentName, hexColor, (name, color) => {
          const code = `${name} bg ${color}`
          const result = parse(code)
          expect(result.nodes[0].properties.bg?.toUpperCase()).toBe(color.toUpperCase())
        }),
        { numRuns: NORMAL_RUNS }
      )
    })
  })

  describe('Edge Cases', () => {
    it('handles zero values', () => {
      fc.assert(
        fc.property(componentName, (name) => {
          const code = `${name} pad 0`
          const result = parse(code)
          expect(result.errors).toHaveLength(0)
          expect(result.nodes[0].properties.pad).toBe(0)
        }),
        { numRuns: FAST_RUNS }
      )
    })

    it('handles deeply nested structures', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 5 }), (depth) => {
          let code = 'Box'
          for (let i = 0; i < depth; i++) {
            code += '\n' + '  '.repeat(i + 1) + 'Box'
          }
          const result = parse(code)
          expect(result.errors).toHaveLength(0)
        }),
        { numRuns: FAST_RUNS }
      )
    })
  })
})
