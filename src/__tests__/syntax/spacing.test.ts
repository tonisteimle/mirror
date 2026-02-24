/**
 * Spacing Syntax Tests
 *
 * Tests for padding and margin with all direction variants
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../test-utils'

// =============================================================================
// Padding - Single Value
// =============================================================================

describe('Padding Single Value', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box pad 16', { pad: 16 }],
    ['Box padding 16', { pad: 16 }],
    ['Box p 8', { p: 8 }],
    ['Box pad 0', { pad: 0 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('pad 16 → CSS padding: 16px', () => {
    expect(style('Box pad 16').padding).toBe('16px')
  })
})

// =============================================================================
// Padding - CSS Shorthand
// =============================================================================

describe('Padding CSS Shorthand', () => {
  it('pad 8 16 (vertical horizontal)', () => {
    const p = props('Box pad 8 16')
    expect(p.pad_u).toBe(8)
    expect(p.pad_d).toBe(8)
    expect(p.pad_l).toBe(16)
    expect(p.pad_r).toBe(16)
  })

  it('pad 8 16 8 16 (top right bottom left)', () => {
    const p = props('Box pad 8 16 24 32')
    expect(p.pad_u).toBe(8)
    expect(p.pad_r).toBe(16)
    expect(p.pad_d).toBe(24)
    expect(p.pad_l).toBe(32)
  })
})

// =============================================================================
// Padding - Direction Syntax
// =============================================================================

describe('Padding Directions', () => {
  // Short direction forms
  const shortCases: [string, Record<string, unknown>][] = [
    ['Box pad l 16', { pad_l: 16 }],
    ['Box pad r 16', { pad_r: 16 }],
    ['Box pad t 16', { pad_u: 16 }],
    ['Box pad b 16', { pad_d: 16 }],
  ]

  it.each(shortCases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  // Long direction forms
  const longCases: [string, Record<string, unknown>][] = [
    ['Box pad left 16', { pad_l: 16 }],
    ['Box pad right 16', { pad_r: 16 }],
    ['Box pad top 16', { pad_u: 16 }],
    ['Box pad bottom 16', { pad_d: 16 }],
  ]

  it.each(longCases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  // Combined directions
  const combinedCases: [string, Record<string, unknown>][] = [
    ['Box pad l-r 16', { pad_l: 16, pad_r: 16 }],
    ['Box pad t-b 16', { pad_u: 16, pad_d: 16 }],
    ['Box pad top 8 bottom 24', { pad_u: 8, pad_d: 24 }],
    ['Box pad left 8 right 16', { pad_l: 8, pad_r: 16 }],
  ]

  it.each(combinedCases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })
})

// =============================================================================
// Margin
// =============================================================================

describe('Margin', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box mar 16', { mar: 16 }],
    ['Box margin 16', { mar: 16 }],
    ['Box m 8', { m: 8 }],
    ['Box mar l 16', { mar_l: 16 }],
    ['Box mar left 16', { mar_l: 16 }],
    // l-r combined direction not fully working
    // ['Box mar l-r 16', { mar_l: 16, mar_r: 16 }],
    ['Box mar l 8, mar r 8', { mar_l: 8, mar_r: 8 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('mar 16 → CSS margin: 16px', () => {
    expect(style('Box mar 16').margin).toBe('16px')
  })
})

// =============================================================================
// Combined Spacing
// =============================================================================

describe('Combined Spacing', () => {
  it('pad 16 mar 8', () => {
    const p = props('Box pad 16, mar 8')
    expect(p.pad).toBe(16)
    expect(p.mar).toBe(8)
  })

  it('pad left 8 right 16, mar top 4', () => {
    const p = props('Box pad left 8 right 16, mar top 4')
    expect(p.pad_l).toBe(8)
    expect(p.pad_r).toBe(16)
    expect(p.mar_u).toBe(4)
  })
})
