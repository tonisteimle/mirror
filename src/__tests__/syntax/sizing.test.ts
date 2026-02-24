/**
 * Sizing Syntax Tests - Table-Driven
 *
 * Tests for sizing keywords: w, h, full, hug, min, max, size
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../test-utils'

// =============================================================================
// Table-Driven Tests: Property Parsing
// =============================================================================

describe('Sizing Property Parsing', () => {
  // Format: [input DSL, expected properties]
  const cases: [string, Record<string, unknown>][] = [
    // Width shortcuts
    ['Box w 200', { w: 200 }],
    ['Box width 200', { w: 200 }],
    ['Box w 50%', { w: '50%' }],

    // Height shortcuts
    ['Box h 100', { h: 100 }],
    ['Box height 100', { h: 100 }],

    // Sizing keywords - standalone (both dimensions)
    ['Box full', { w: 'max', h: 'max' }],
    ['Box hug', { w: 'min', h: 'min' }],
    ['Box min', { w: 'min', h: 'min' }],
    ['Box max', { w: 'max', h: 'max' }],

    // Sizing keywords - sequential (width then height)
    ['Box full hug', { w: 'max', h: 'min' }],
    ['Box hug full', { w: 'min', h: 'max' }],
    ['Box full full', { w: 'max', h: 'max' }],
    ['Box hug hug', { w: 'min', h: 'min' }],
    ['Box min max', { w: 'min', h: 'max' }],
    ['Box max min', { w: 'max', h: 'min' }],

    // Width/height with keywords
    ['Box w hug', { w: 'min' }],
    ['Box w full', { w: 'max' }],
    ['Box h hug', { h: 'min' }],
    ['Box h full', { h: 'max' }],

    // Size on containers (dimensions)
    ['Box size 100', { w: 100, h: 100 }],
    ['Box size 100 200', { w: 100, h: 200 }],
    ['Box size hug', { w: 'min', h: 'min' }],
    ['Box size full', { w: 'max', h: 'max' }],
    ['Box size full hug', { w: 'max', h: 'min' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })
})

// =============================================================================
// Context-Dependent Size
// =============================================================================

describe('Context-Dependent Size', () => {
  it('Icon size → icon-size', () => {
    const p = props('Icon size 16')
    expect(p['icon-size']).toBe(16)
    expect(p.w).toBeUndefined()
  })

  it('SearchIcon (ends with Icon) size → icon-size', () => {
    const p = props('SearchIcon size 20')
    expect(p['icon-size']).toBe(20)
  })

  it('Text size → text-size', () => {
    const p = props('Text size 14')
    expect(p['text-size']).toBe(14)
    expect(p.w).toBeUndefined()
  })

  it('Label as Text size → text-size', () => {
    const p = props('Label as Text size 14')
    expect(p['text-size']).toBe(14)
    expect(p._primitiveType).toBe('Text')
  })

  it('MyIcon as Icon size → icon-size', () => {
    const p = props('MyIcon as Icon size 20')
    expect(p['icon-size']).toBe(20)
    expect(p._primitiveType).toBe('Icon')
  })

  it('Box size → dimensions (w/h)', () => {
    const p = props('Box size 100 200')
    expect(p.w).toBe(100)
    expect(p.h).toBe(200)
    expect(p['icon-size']).toBeUndefined()
    expect(p['text-size']).toBeUndefined()
  })
})

// =============================================================================
// Layout Aliases
// =============================================================================

describe('Layout Aliases', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['Box ver', { ver: true }],
    ['Box vert', { ver: true }],  // NEW: vert alias
    ['Box vertical', { ver: true }],
    ['Box hor', { hor: true }],
    ['Box horizontal', { hor: true }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const p = props(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(p[key]).toBe(value)
    }
  })
})

// =============================================================================
// CSS Output Tests
// =============================================================================

describe('Sizing CSS Output', () => {
  const cases: [string, Partial<React.CSSProperties>][] = [
    ['Box w 200', { width: '200px' }],
    ['Box h 100', { height: '100px' }],
    ['Box w 50%', { width: '50%' }],
    // Note: 'max' sizing results in width: '100%' + flexGrow: 1
    ['Box w max', { width: '100%', flexGrow: 1 }],
    // Note: 'min' sizing results in width: 'fit-content'
    ['Box w min', { width: 'fit-content' }],
  ]

  it.each(cases)('%s → %o', (dsl, expected) => {
    const s = style(dsl)
    for (const [key, value] of Object.entries(expected)) {
      expect(s[key as keyof React.CSSProperties]).toBe(value)
    }
  })
})
