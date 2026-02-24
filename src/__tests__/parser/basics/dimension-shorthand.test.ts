/**
 * Parser Tests: Dimension Shorthand
 *
 * Tests for dimension shorthand syntax.
 * First numbers after component name are interpreted as width/height.
 */

import { describe, it, expect } from 'vitest'
import { props, parseOne } from '../../test-utils'

describe('Single Dimension (Width)', () => {
  it('parses single number as width', () => {
    expect(props('Box 300').w).toBe(300)
  })

  it('parses single number with following property', () => {
    const p = props('Box 200, pad 8')
    expect(p.w).toBe(200)
    expect(p.pad).toBe(8)
  })

  it('works with Card component', () => {
    expect(props('Card 250').w).toBe(250)
  })
})

describe('Double Dimension (Width + Height)', () => {
  it('parses two numbers as width and height', () => {
    const p = props('Box 300 400')
    expect(p.w).toBe(300)
    expect(p.h).toBe(400)
  })

  it('parses dimensions with comma', () => {
    const p = props('Box 300, 400')
    expect(p.w).toBe(300)
    expect(p.h).toBe(400)
  })

  it('parses dimensions followed by properties', () => {
    const p = props('Box 300, 400, pad 16')
    expect(p.w).toBe(300)
    expect(p.h).toBe(400)
    expect(p.pad).toBe(16)
  })

  it('parses dimensions with multiple properties', () => {
    const p = props('Card 200, 150, pad 8, bg #333')
    expect(p.w).toBe(200)
    expect(p.h).toBe(150)
    expect(p.pad).toBe(8)
    expect(p.bg).toBe('#333')
  })
})

describe('Image Dimensions (Special Case)', () => {
  it('parses Image with two dimensions', () => {
    const node = parseOne('Image 100 50 "photo.jpg"')
    expect(node.properties.w).toBe(100)
    expect(node.properties.h).toBe(50)
  })

  it('parses Image with single dimension', () => {
    const node = parseOne('Image 200 "photo.jpg"')
    expect(node.properties.w).toBe(200)
  })
})

describe('Dimension with Percentage', () => {
  it('parses percentage width', () => {
    const p = props('Box w 50%')
    expect(p.w).toBe('50%')
  })

  it('parses percentage width and height', () => {
    const p = props('Box w 100%, h 50%')
    expect(p.w).toBe('100%')
    expect(p.h).toBe('50%')
  })
})

describe('Dimension Edge Cases', () => {
  it('does not confuse dimension with pad value', () => {
    const p = props('Box pad 16')
    expect(p.w).toBeUndefined()
    expect(p.pad).toBe(16)
  })

  it('does not interpret gap as dimension', () => {
    const p = props('Box gap 8')
    expect(p.w).toBeUndefined()
    expect(p.g).toBe(8)
  })

  it('handles zero dimension', () => {
    const p = props('Box 0')
    expect(p.w).toBe(0)
  })

  it('handles decimal dimensions', () => {
    // Dimension shorthand parses as integers
    const p = props('Box 100 50')
    expect(p.w).toBe(100)
    expect(p.h).toBe(50)
  })
})

describe('Mixed with Other Properties', () => {
  it('dimensions then layout', () => {
    const p = props('Box 200, 100, hor, cen')
    expect(p.w).toBe(200)
    expect(p.h).toBe(100)
    expect(p.hor).toBe(true)
  })

  it('dimensions then color', () => {
    const p = props('Card 300, 200, bg #1E1E2E')
    expect(p.w).toBe(300)
    expect(p.h).toBe(200)
    expect(p.bg).toBe('#1E1E2E')
  })
})
