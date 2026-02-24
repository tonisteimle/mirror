/**
 * V1 Syntax Tests: Properties
 *
 * Tests for property parsing (padding, margin, colors, etc.)
 */

import { describe, it, expect } from 'vitest'
import { props } from '../test-utils'

describe('Spacing Properties', () => {
  it('parses padding with single value', () => {
    expect(props('Box pad 16').pad).toBe(16)
  })

  it('parses margin with single value', () => {
    expect(props('Box mar 8').mar).toBe(8)
  })

  it('parses gap', () => {
    expect(props('Box gap 12').g).toBe(12)
  })
})

describe('Color Properties', () => {
  it('parses background color', () => {
    expect(props('Box bg #FF0000').bg).toBe('#FF0000')
  })

  it('parses text color', () => {
    expect(props('Box col #FFFFFF').col).toBe('#FFFFFF')
  })
})

describe('Size Properties', () => {
  it('parses width', () => {
    expect(props('Box w 200').w).toBe(200)
  })

  it('parses height', () => {
    expect(props('Box h 100').h).toBe(100)
  })

  it('parses dimension shorthand (width only)', () => {
    expect(props('Box 200').w).toBe(200)
  })

  it('parses dimension shorthand (width and height)', () => {
    const p = props('Box 200 100')
    expect(p.w).toBe(200)
    expect(p.h).toBe(100)
  })
})

describe('Layout Properties', () => {
  it('parses horizontal', () => {
    expect(props('Box hor').hor).toBe(true)
  })

  it('parses vertical', () => {
    expect(props('Box ver').ver).toBe(true)
  })

  it('parses center', () => {
    const p = props('Box cen')
    expect(p.align_main).toBe('cen')
    expect(p.align_cross).toBe('cen')
  })

  it('parses between', () => {
    expect(props('Box between').between).toBe(true)
  })
})

describe('Border Properties', () => {
  it('parses border width', () => {
    expect(props('Box bor 1').bor).toBe(1)
  })

  it('parses border radius', () => {
    expect(props('Box rad 8').rad).toBe(8)
  })

  it('parses border color', () => {
    expect(props('Box boc #333').boc).toBe('#333')
  })
})
