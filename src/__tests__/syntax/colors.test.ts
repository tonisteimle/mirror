/**
 * Color Syntax Tests
 *
 * Tests for color properties: background, text color, border color
 */

import { describe, it, expect } from 'vitest'
import { parse, props, style } from '../test-utils'

// =============================================================================
// Background Color
// =============================================================================

describe('Background Color', () => {
  const cases: [string, Record<string, unknown>][] = [
    // Hex colors
    ['Box bg #FF0000', { bg: '#FF0000' }],
    ['Box bg #ff0000', { bg: '#ff0000' }],
    ['Box bg #F00', { bg: '#F00' }],
    ['Box background #333', { bg: '#333' }],

    // Hex with alpha
    ['Box bg #FF000080', { bg: '#FF000080' }],

    // CSS color keywords
    ['Box bg transparent', { bg: 'transparent' }],
    ['Box bg white', { bg: 'white' }],
    ['Box bg black', { bg: 'black' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('bg #FF0000 → CSS backgroundColor', () => {
    expect(style('Box bg #FF0000').backgroundColor).toBe('#FF0000')
  })
})

// =============================================================================
// Text Color
// =============================================================================

describe('Text Color', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box col #FFFFFF', { col: '#FFFFFF' }],
    ['Box color #333', { col: '#333' }],
    // Note: 'c' is stored as 'c', not normalized to 'col' (it's an undocumented alias)
    ['Box c #000', { c: '#000' }],
    ['Text col white', { col: 'white' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('col #FFFFFF → CSS color', () => {
    expect(style('Box col #FFFFFF').color).toBe('#FFFFFF')
  })
})

// =============================================================================
// Border Color
// =============================================================================

describe('Border Color', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box boc #333', { boc: '#333' }],
    ['Box border-color #FF0000', { boc: '#FF0000' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('boc #333 → CSS borderColor', () => {
    expect(style('Box boc #333').borderColor).toBe('#333')
  })
})

// =============================================================================
// Bare Color (Sugar Syntax)
// =============================================================================

describe('Bare Color Sugar', () => {
  it('bare hex color on Text → col', () => {
    expect(props('Text #FFFFFF').col).toBe('#FFFFFF')
  })
})

// =============================================================================
// Token References for Colors
// =============================================================================

describe('Color Token References', () => {
  it('bg with token reference', () => {
    const result = parse(`
$primary: #3B82F6
Box bg $primary
`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
  })

  it('col with token reference', () => {
    const result = parse(`
$text-color: #FFFFFF
Text col $text-color
`)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.col).toBe('#FFFFFF')
  })
})

// =============================================================================
// Combined Colors
// =============================================================================

describe('Combined Color Properties', () => {
  it('bg and col together', () => {
    const p = props('Box bg #333, col #FFF')
    expect(p.bg).toBe('#333')
    expect(p.col).toBe('#FFF')
  })

  it('bg, col, and boc together', () => {
    const p = props('Box bg #333, col #FFF, boc #666')
    expect(p.bg).toBe('#333')
    expect(p.col).toBe('#FFF')
    expect(p.boc).toBe('#666')
  })
})
