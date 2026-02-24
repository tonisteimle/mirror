/**
 * Border & Radius Syntax Tests
 *
 * Tests for border properties: width, style, color, directions
 * Tests for radius properties: corners, directions
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../test-utils'

// =============================================================================
// Border Width
// =============================================================================

describe('Border Width', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box bor 1', { bor: 1 }],
    ['Box border 2', { bor: 2 }],
    ['Box bor 0', { bor: 0 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('bor 1 → CSS border contains 1px', () => {
    const s = style('Box bor 1')
    expect(s.border).toContain('1px')
  })
})

// =============================================================================
// Border with Color
// =============================================================================

describe('Border with Color', () => {
  it('bor 1 #333', () => {
    const p = props('Box bor 1 #333')
    expect(p.bor).toBe(1)
    expect(p.bor_color).toBe('#333')
  })

  it('bor 2 #FF0000', () => {
    const p = props('Box bor 2 #FF0000')
    expect(p.bor).toBe(2)
    expect(p.bor_color).toBe('#FF0000')
  })
})

// =============================================================================
// Border with Style
// =============================================================================

describe('Border with Style', () => {
  it('bor 1 solid', () => {
    const p = props('Box bor 1 solid')
    expect(p.bor).toBe(1)
    expect(p.bor_style).toBe('solid')
  })

  it('bor 2 dashed #333', () => {
    const p = props('Box bor 2 dashed #333')
    expect(p.bor).toBe(2)
    expect(p.bor_style).toBe('dashed')
    expect(p.bor_color).toBe('#333')
  })

  it('bor 1 dotted #FF0000', () => {
    const p = props('Box bor 1 dotted #FF0000')
    expect(p.bor).toBe(1)
    expect(p.bor_style).toBe('dotted')
    expect(p.bor_color).toBe('#FF0000')
  })
})

// =============================================================================
// Border Directions
// =============================================================================

describe('Border Directions', () => {
  const cases: [string, Record<string, unknown>][] = [
    // Single direction short form
    ['Box bor t 1', { bor_u: 1 }],
    ['Box bor b 1', { bor_d: 1 }],
    ['Box bor l 1', { bor_l: 1 }],
    ['Box bor r 1', { bor_r: 1 }],

    // With color
    ['Box bor b 1 #333', { bor_d: 1, bor_d_color: '#333' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })
})

// =============================================================================
// Radius
// =============================================================================

describe('Radius', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box rad 8', { rad: 8 }],
    ['Box radius 16', { rad: 16 }],
    ['Box rad 0', { rad: 0 }],
    // TODO: Parser currently strips % suffix - should preserve as string
    ['Box rad 50%', { rad: 50 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('rad 8 → CSS borderRadius: 8px', () => {
    expect(style('Box rad 8').borderRadius).toBe('8px')
  })
})

// =============================================================================
// Radius Corners
// =============================================================================

describe('Radius Corners', () => {
  const cases: [string, Record<string, unknown>][] = [
    // Single corner
    ['Box rad tl 8', { rad_tl: 8 }],
    ['Box rad tr 8', { rad_tr: 8 }],
    ['Box rad bl 8', { rad_bl: 8 }],
    ['Box rad br 8', { rad_br: 8 }],

    // Multiple corners
    ['Box rad tl 8 br 8', { rad_tl: 8, rad_br: 8 }],

    // Top/bottom shortcuts
    ['Box rad t 8', { rad_tl: 8, rad_tr: 8 }],
    ['Box rad b 8', { rad_bl: 8, rad_br: 8 }],

    // Left/right shortcuts
    ['Box rad l 8', { rad_tl: 8, rad_bl: 8 }],
    ['Box rad r 8', { rad_tr: 8, rad_br: 8 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })
})

// =============================================================================
// Combined Border & Radius
// =============================================================================

describe('Combined Border & Radius', () => {
  it('bor 1 #333, rad 8', () => {
    const p = props('Box bor 1 #333, rad 8')
    expect(p.bor).toBe(1)
    expect(p.bor_color).toBe('#333')
    expect(p.rad).toBe(8)
  })

  it('full card style', () => {
    const p = props('Card bg #1E1E2E, bor 1 #333, rad 12')
    expect(p.bg).toBe('#1E1E2E')
    expect(p.bor).toBe(1)
    expect(p.bor_color).toBe('#333')
    expect(p.rad).toBe(12)
  })
})
