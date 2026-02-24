/**
 * Parser Tests: Hover Properties
 *
 * Tests for inline hover-style properties:
 * - hover-bg / hover-background
 * - hover-col / hover-color
 * - hover-opa / hover-opacity
 * - hover-scale
 * - hover-bor / hover-border
 * - hover-boc / hover-border-color
 * - hover-rad / hover-radius
 */

import { describe, it, expect } from 'vitest'
import { props, parseOne, getState } from '../../test-utils'

describe('Hover Background', () => {
  it('parses hover-bg', () => {
    expect(props('Button hover-bg #555')['hover-bg']).toBe('#555')
  })

  it('parses hover-background', () => {
    expect(props('Button hover-background #444')['hover-bg']).toBe('#444')
  })
})

describe('Hover Color', () => {
  it('parses hover-col', () => {
    expect(props('Button hover-col #FFF')['hover-col']).toBe('#FFF')
  })

  it('parses hover-color', () => {
    expect(props('Text hover-color #3B82F6')['hover-col']).toBe('#3B82F6')
  })
})

describe('Hover Opacity', () => {
  it('parses hover-opa', () => {
    expect(props('Box hover-opa 0.8')['hover-opa']).toBe(0.8)
  })

  it('parses hover-opacity', () => {
    expect(props('Card hover-opacity 0.9')['hover-opa']).toBe(0.9)
  })
})

describe('Hover Scale', () => {
  it('parses hover-scale', () => {
    expect(props('Button hover-scale 1.05')['hover-scale']).toBe(1.05)
  })

  it('parses scale down', () => {
    expect(props('Card hover-scale 0.95')['hover-scale']).toBe(0.95)
  })
})

describe('Hover Border', () => {
  it('parses hover-bor', () => {
    expect(props('Input hover-bor 2')['hover-bor']).toBe(2)
  })

  it('parses hover-boc', () => {
    expect(props('Input hover-boc #3B82F6')['hover-boc']).toBe('#3B82F6')
  })

  it('parses hover-border-color', () => {
    expect(props('Button hover-border-color #22C55E')['hover-boc']).toBe('#22C55E')
  })
})

describe('Hover Radius', () => {
  it('parses hover-rad', () => {
    expect(props('Card hover-rad 12')['hover-rad']).toBe(12)
  })

  it('parses hover-radius', () => {
    expect(props('Button hover-radius 8')['hover-rad']).toBe(8)
  })
})

describe('Combined Hover Properties', () => {
  it('parses multiple hover properties', () => {
    const p = props('Button hover-bg #555, hover-col #FFF, hover-scale 1.02')
    expect(p['hover-bg']).toBe('#555')
    expect(p['hover-col']).toBe('#FFF')
    expect(p['hover-scale']).toBe(1.02)
  })

  it('parses hover with regular properties', () => {
    const p = props('Button bg #333, col #FFF, hover-bg #555')
    expect(p.bg).toBe('#333')
    expect(p.col).toBe('#FFF')
    expect(p['hover-bg']).toBe('#555')
  })
})

describe('Hover vs State Hover', () => {
  it('hover properties are shorthand for state hover', () => {
    const node = parseOne('Button hover-bg #555')
    // hover-bg should create equivalent hover state
    expect(node.properties['hover-bg']).toBe('#555')
  })

  it('explicit state hover works', () => {
    const node = parseOne(`Button
  hover
    bg #555`)
    const hoverState = getState(node, 'hover')
    expect(hoverState?.properties.bg).toBe('#555')
  })
})

describe('Interactive Component Examples', () => {
  it('button with full hover effect', () => {
    const p = props('Button bg #3B82F6, col #FFF, pad 12, hover-bg #2563EB, hover-scale 1.02')
    expect(p.bg).toBe('#3B82F6')
    expect(p['hover-bg']).toBe('#2563EB')
    expect(p['hover-scale']).toBe(1.02)
  })

  it('card with hover shadow and opacity', () => {
    const p = props('Card bg #1E1E2E, shadow sm, hover-opa 0.95')
    expect(p.shadow).toBe('sm')
    expect(p['hover-opa']).toBe(0.95)
  })

  it('input with hover border', () => {
    const p = props('Input bor 1, boc #333, hover-boc #3B82F6')
    expect(p.bor).toBe(1)
    expect(p.boc).toBe('#333')
    expect(p['hover-boc']).toBe('#3B82F6')
  })
})
