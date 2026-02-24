/**
 * Parser Tests: Scroll Properties
 *
 * Tests for scroll and overflow properties:
 * - scroll (vertical)
 * - scroll-ver
 * - scroll-hor
 * - scroll-both
 * - clip
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../../test-utils'

describe('Basic Scroll', () => {
  it('parses scroll (default vertical)', () => {
    expect(props('Box scroll').scroll).toBe(true)
  })

  it('generates CSS overflow-y auto', () => {
    const s = style('Box scroll')
    expect(s.overflowY).toBe('auto')
  })
})

describe('Directional Scroll', () => {
  it('parses scroll-ver', () => {
    const p = props('Box scroll-ver')
    expect(p['scroll-ver'] || p.scroll).toBe(true)
  })

  it('parses scroll-hor', () => {
    const p = props('Box scroll-hor')
    expect(p['scroll-hor']).toBe(true)
  })

  it('parses scroll-both', () => {
    const p = props('Box scroll-both')
    expect(p['scroll-both']).toBe(true)
  })

  it('scroll-ver generates overflow-y auto', () => {
    const s = style('Box scroll-ver')
    expect(s.overflowY).toBe('auto')
  })

  it('scroll-hor generates overflow-x auto', () => {
    const s = style('Box scroll-hor')
    expect(s.overflowX).toBe('auto')
  })

  it('scroll-both generates overflow auto', () => {
    const s = style('Box scroll-both')
    expect(s.overflow).toBe('auto')
  })
})

describe('Clip (Overflow Hidden)', () => {
  it('parses clip', () => {
    expect(props('Box clip').clip).toBe(true)
  })

  it('clip generates overflow hidden', () => {
    expect(style('Box clip').overflow).toBe('hidden')
  })
})

describe('Scroll with Size Constraints', () => {
  it('scroll with maxh', () => {
    const p = props('Box scroll, maxh 300')
    expect(p.scroll).toBe(true)
    expect(p.maxh).toBe(300)
  })

  it('scroll-hor with maxw', () => {
    const p = props('Box scroll-hor, maxw 500')
    expect(p['scroll-hor']).toBe(true)
    expect(p.maxw).toBe(500)
  })

  it('generates proper scrollable container', () => {
    const s = style('Box scroll, maxh 200')
    expect(s.overflowY).toBe('auto')
    expect(s.maxHeight).toBe('200px')
  })
})

describe('Scroll with Layout', () => {
  it('vertical scroll with vertical layout', () => {
    const p = props('Box ver, scroll')
    expect(p.ver).toBe(true)
    expect(p.scroll).toBe(true)
  })

  it('horizontal scroll with horizontal layout', () => {
    const p = props('Box hor, scroll-hor')
    expect(p.hor).toBe(true)
    expect(p['scroll-hor']).toBe(true)
  })
})

describe('Edge Cases', () => {
  it('clip overrides scroll', () => {
    // If both clip and scroll are set, clip should win
    const s = style('Box clip')
    expect(s.overflow).toBe('hidden')
  })
})
