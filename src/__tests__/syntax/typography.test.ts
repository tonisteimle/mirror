/**
 * Typography Syntax Tests
 *
 * Tests for text properties: size, weight, font, alignment, decorations
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../test-utils'

// =============================================================================
// Text Size
// =============================================================================

describe('Text Size', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Text text-size 16', { 'text-size': 16 }],
    ['Text ts 14', { 'text-size': 14 }],
    ['Text font-size 18', { 'text-size': 18 }],
    ['Text fs 12', { 'text-size': 12 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('Context-dependent size on Text', () => {
    expect(props('Text size 16')['text-size']).toBe(16)
  })

  it('text-size → CSS fontSize', () => {
    expect(style('Text text-size 16').fontSize).toBe('16px')
  })
})

// =============================================================================
// Icon Size
// =============================================================================

describe('Icon Size', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Icon icon-size 24', { 'icon-size': 24 }],
    ['Icon is 20', { 'icon-size': 20 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('Context-dependent size on Icon', () => {
    expect(props('Icon size 24')['icon-size']).toBe(24)
  })
})

// =============================================================================
// Font Weight
// =============================================================================

describe('Font Weight', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Text weight 400', { weight: 400 }],
    ['Text weight 600', { weight: 600 }],
    ['Text weight 700', { weight: 700 }],
    ['Text weight bold', { weight: 700 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('weight 600 → CSS fontWeight', () => {
    expect(style('Text weight 600').fontWeight).toBe(600)
  })
})

// =============================================================================
// Font Family
// =============================================================================

describe('Font Family', () => {
  it('font with string value', () => {
    expect(props('Text font "Inter"').font).toBe('Inter')
  })

  it('font with quoted value containing spaces', () => {
    expect(props('Text font "Fira Code"').font).toBe('Fira Code')
  })
})

// =============================================================================
// Line Height
// =============================================================================

describe('Line Height', () => {
  it('line as number', () => {
    expect(props('Text line 1.5').line).toBe(1.5)
  })

  it('line as integer', () => {
    expect(props('Text line 2').line).toBe(2)
  })
})

// =============================================================================
// Text Alignment
// =============================================================================

describe('Text Alignment', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Text align left', { align: 'left' }],
    ['Text align center', { align: 'center' }],
    ['Text align right', { align: 'right' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('align center → CSS textAlign', () => {
    expect(style('Text align center').textAlign).toBe('center')
  })
})

// =============================================================================
// Text Decorations
// =============================================================================

describe('Text Decorations', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Text italic', { italic: true }],
    ['Text underline', { underline: true }],
    ['Text truncate', { truncate: true }],
    ['Text uppercase', { uppercase: true }],
    ['Text lowercase', { lowercase: true }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('italic → CSS fontStyle', () => {
    expect(style('Text italic').fontStyle).toBe('italic')
  })

  it('underline → CSS textDecoration', () => {
    expect(style('Text underline').textDecoration).toBe('underline')
  })

  it('truncate → CSS overflow/textOverflow', () => {
    const s = style('Text truncate')
    expect(s.overflow).toBe('hidden')
    expect(s.textOverflow).toBe('ellipsis')
    expect(s.whiteSpace).toBe('nowrap')
  })

  it('uppercase → CSS textTransform', () => {
    expect(style('Text uppercase').textTransform).toBe('uppercase')
  })
})

// =============================================================================
// Icon Properties
// =============================================================================

describe('Icon Properties', () => {
  it('icon-weight (normalized to iw)', () => {
    // Parser normalizes icon-weight to short form 'iw'
    expect(props('Icon icon-weight 300')['iw']).toBe(300)
  })

  it('icon-color (normalized to ic)', () => {
    // Parser normalizes icon-color to short form 'ic'
    expect(props('Icon icon-color #3B82F6')['ic']).toBe('#3B82F6')
  })

  it('fill (Material Icons)', () => {
    expect(props('Icon fill').fill).toBe(true)
  })

  it('material flag', () => {
    expect(props('Icon material').material).toBe(true)
  })
})

// =============================================================================
// Combined Typography
// =============================================================================

describe('Combined Typography', () => {
  it('size, weight, color', () => {
    const p = props('Text text-size 16, weight 600, col #333')
    expect(p['text-size']).toBe(16)
    expect(p.weight).toBe(600)
    expect(p.col).toBe('#333')
  })

  it('heading style', () => {
    const p = props('H1 text-size 32, weight bold, col #FFF')
    expect(p['text-size']).toBe(32)
    expect(p.weight).toBe(700)
    expect(p.col).toBe('#FFF')
  })
})
