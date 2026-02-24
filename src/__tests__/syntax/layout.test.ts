/**
 * Layout Syntax Tests
 *
 * Tests for layout properties: direction, alignment, gap, distribution
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../test-utils'

// =============================================================================
// Direction
// =============================================================================

describe('Layout Direction', () => {
  const cases: [string, Record<string, unknown>][] = [
    // Horizontal variants
    ['Box hor', { hor: true }],
    ['Box horizontal', { hor: true }],

    // Vertical variants
    ['Box ver', { ver: true }],
    ['Box vert', { ver: true }],
    ['Box vertical', { ver: true }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  // CSS output tests
  it('hor → flexDirection: row', () => {
    expect(style('Box hor').flexDirection).toBe('row')
  })

  it('ver → flexDirection: column', () => {
    expect(style('Box ver').flexDirection).toBe('column')
  })
})

// =============================================================================
// Alignment
// =============================================================================

describe('Alignment', () => {
  const cases: [string, Record<string, unknown>][] = [
    // Center (both axes)
    ['Box cen', { align_main: 'cen', align_cross: 'cen' }],
    ['Box center', { align_main: 'cen', align_cross: 'cen' }],

    // Horizontal alignment
    ['Box left', { align_main: 'l' }],
    ['Box right', { align_main: 'r' }],
    ['Box hor-center', { align_main: 'cen' }],

    // Vertical alignment (stored as u=up, d=down internally)
    ['Box top', { align_cross: 'u' }],
    ['Box bottom', { align_cross: 'd' }],
    ['Box ver-center', { align_cross: 'cen' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  // CSS output
  it('cen → justifyContent & alignItems center', () => {
    const s = style('Box cen')
    expect(s.justifyContent).toBe('center')
    expect(s.alignItems).toBe('center')
  })
})

// =============================================================================
// Gap
// =============================================================================

describe('Gap', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box gap 16', { g: 16 }],
    ['Box g 8', { g: 8 }],
    ['Box gap 0', { g: 0 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('gap 16 → CSS gap: 16px', () => {
    expect(style('Box gap 16').gap).toBe('16px')
  })
})

// =============================================================================
// Distribution
// =============================================================================

describe('Distribution', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box between', { between: true }],
    ['Box spread', { between: true }],  // spread is alias for between
    ['Box wrap', { wrap: true }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('between → justifyContent: space-between', () => {
    expect(style('Box between').justifyContent).toBe('space-between')
  })

  it('wrap → flexWrap: wrap', () => {
    expect(style('Box wrap').flexWrap).toBe('wrap')
  })
})

// =============================================================================
// Stacked (z-layers)
// =============================================================================

describe('Stacked Layout', () => {
  it('stacked sets position relative', () => {
    expect(props('Box stacked').stacked).toBe(true)
  })
})

// =============================================================================
// Grid
// =============================================================================

describe('Grid Layout', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box grid 3', { grid: 3 }],
    ['Box grid 2', { grid: 2 }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })

  it('grid 3 → CSS grid-template-columns', () => {
    const s = style('Box grid 3')
    expect(s.display).toBe('grid')
    expect(s.gridTemplateColumns).toContain('1fr')
  })
})

// =============================================================================
// Combined Layout
// =============================================================================

describe('Combined Layout Properties', () => {
  it('hor cen gap 8', () => {
    const p = props('Box hor cen gap 8')
    expect(p.hor).toBe(true)
    expect(p.align_main).toBe('cen')
    expect(p.align_cross).toBe('cen')
    expect(p.g).toBe(8)
  })

  it('ver between wrap', () => {
    const p = props('Box ver between wrap')
    expect(p.ver).toBe(true)
    expect(p.between).toBe(true)
    expect(p.wrap).toBe(true)
  })

  it('hor gap 16 pad 8', () => {
    const p = props('Box hor gap 16 pad 8')
    expect(p.hor).toBe(true)
    expect(p.g).toBe(16)
    expect(p.pad).toBe(8)
  })
})
