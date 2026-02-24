/**
 * Parser Tests: Visual Properties
 *
 * Tests for visual properties:
 * - opacity / o
 * - shadow
 * - cursor
 * - z-index
 * - hidden / visible
 * - disabled
 * - rotate
 * - translate
 */

import { describe, it, expect } from 'vitest'
import { props, style } from '../../test-utils'

describe('Opacity', () => {
  const cases: [string, number][] = [
    ['Box o 0.5', 0.5],
    ['Box o 0.8', 0.8],
    ['Box o 0', 0],
    ['Box o 1', 1],
    ['Box o 0.1', 0.1],
  ]

  it.each(cases)('%s → opacity %s', (dsl, expected) => {
    expect(props(dsl).o).toBe(expected)
  })

  it('generates CSS opacity', () => {
    expect(style('Box o 0.5').opacity).toBe(0.5)
  })
})

describe('Shadow', () => {
  const cases: [string, string][] = [
    ['Box shadow sm', 'sm'],
    ['Box shadow md', 'md'],
    ['Box shadow lg', 'lg'],
    ['Box shadow xl', 'xl'],
  ]

  it.each(cases)('%s → shadow %s', (dsl, expected) => {
    expect(props(dsl).shadow).toBe(expected)
  })

  it('generates CSS boxShadow for sm', () => {
    const s = style('Box shadow sm')
    expect(s.boxShadow).toBeDefined()
  })

  it('generates CSS boxShadow for lg', () => {
    const s = style('Box shadow lg')
    expect(s.boxShadow).toBeDefined()
  })
})

describe('Cursor', () => {
  const cases: [string, string][] = [
    ['Box cursor pointer', 'pointer'],
    ['Box cursor default', 'default'],
    ['Box cursor grab', 'grab'],
    ['Box cursor not-allowed', 'not-allowed'],
    ['Box cursor text', 'text'],
    ['Box cursor move', 'move'],
  ]

  it.each(cases)('%s → cursor %s', (dsl, expected) => {
    expect(props(dsl).cursor).toBe(expected)
  })

  it('generates CSS cursor', () => {
    expect(style('Box cursor pointer').cursor).toBe('pointer')
  })
})

describe('Z-Index', () => {
  const cases: [string, number][] = [
    ['Box z 1', 1],
    ['Box z 10', 10],
    ['Box z 100', 100],
    ['Box z 999', 999],
    ['Box z 0', 0],
  ]

  it.each(cases)('%s → z-index %s', (dsl, expected) => {
    expect(props(dsl).z).toBe(expected)
  })

  it('generates CSS zIndex', () => {
    expect(style('Box z 10').zIndex).toBe(10)
  })
})

describe('Visibility', () => {
  it('parses hidden', () => {
    expect(props('Box hidden').hidden).toBe(true)
  })

  it('hidden generates CSS display none', () => {
    expect(style('Box hidden').display).toBe('none')
  })
})

describe('Disabled', () => {
  it('parses disabled', () => {
    expect(props('Button disabled').disabled).toBe(true)
  })
})

describe('Rotate', () => {
  const cases: [string, number][] = [
    ['Box rotate 45', 45],
    ['Box rot 90', 90],
    ['Box rotate 180', 180],
    ['Box rotate 0', 0],
  ]

  it.each(cases)('%s → rotate %s', (dsl, expected) => {
    const p = props(dsl)
    expect(p.rotate || p.rot).toBe(expected)
  })

  it('generates CSS transform for rotation', () => {
    const s = style('Box rotate 45')
    expect(s.transform).toContain('rotate')
  })
})


describe('Combined Visual Properties', () => {
  it('parses multiple visual properties', () => {
    const p = props('Box o 0.8, shadow md, cursor pointer')
    expect(p.o).toBe(0.8)
    expect(p.shadow).toBe('md')
    expect(p.cursor).toBe('pointer')
  })

  it('parses visual with layout properties', () => {
    const p = props('Box pad 16, shadow sm, z 10')
    expect(p.pad).toBe(16)
    expect(p.shadow).toBe('sm')
    expect(p.z).toBe(10)
  })
})
