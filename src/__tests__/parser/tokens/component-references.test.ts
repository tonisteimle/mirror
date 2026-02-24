/**
 * Parser Tests: Component References
 *
 * Tests for referencing properties from other components using dot notation.
 * - Button.radius
 * - Theme.background
 * - Header.color
 */

import { describe, it, expect } from 'vitest'
import { props, parse } from '../../test-utils'

describe('Basic Component References', () => {
  it('references radius from another component', () => {
    const code = `Card: rad 12
Button rad Card.rad`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.rad).toBe(12)
  })

  it('references background from theme', () => {
    const code = `Theme: bg #1E1E2E
Panel bg Theme.bg`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
  })

  it('references color from header', () => {
    const code = `Header: col #FFFFFF
Text col Header.col`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.col).toBe('#FFFFFF')
  })
})

describe('Reference Different Property Types', () => {
  it('references padding', () => {
    const code = `Base: pad 16
Card pad Base.pad`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.pad).toBe(16)
  })

  it('references gap', () => {
    const code = `Container: g 12
List g Container.g`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.g).toBe(12)
  })
})

describe('Multiple References', () => {
  it('uses multiple references from same component', () => {
    const code = `Theme: bg #1E1E2E, col #FFFFFF, rad 8
Card bg Theme.bg, col Theme.col, rad Theme.rad`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    const p = result.nodes[0].properties
    expect(p.bg).toBe('#1E1E2E')
    expect(p.col).toBe('#FFFFFF')
    expect(p.rad).toBe(8)
  })

  it('uses references from different components', () => {
    const code = `Colors: bg #3B82F6
Spacing: pad 16
Corners: rad 8
Button bg Colors.bg, pad Spacing.pad, rad Corners.rad`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    const p = result.nodes[0].properties
    expect(p.bg).toBe('#3B82F6')
    expect(p.pad).toBe(16)
    expect(p.rad).toBe(8)
  })
})

describe('Property Name Variations', () => {
  // Test that different property name formats can be referenced
  it('references using full property name', () => {
    const code = `Base: background #333
Box bg Base.background`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.bg).toBe('#333')
  })

  it('references using shorthand', () => {
    const code = `Base: bg #333
Box bg Base.bg`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.bg).toBe('#333')
  })
})

describe('Edge Cases', () => {
  it('handles reference to non-existent component gracefully', () => {
    const code = 'Box bg Unknown.color'
    const result = parse(code)
    // Should either error or use undefined/default
    // The exact behavior depends on implementation
    expect(result.nodes).toHaveLength(1)
  })

  it('handles reference to non-existent property', () => {
    const code = `Base: pad 16
Box bg Base.nonexistent`
    const result = parse(code)
    expect(result.nodes).toHaveLength(1)
  })
})
