/**
 * Parser Tests: Child Overrides
 *
 * Tests for overriding child properties inline using semicolon syntax.
 * Syntax: Child as Parent: childName property; childName2 property
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne, findNode } from '../../test-utils'

describe('Basic Child Overrides', () => {
  // Child override syntax uses semicolons to separate child modifications
  // Note: Implementation details may vary
  it('inherits from parent with overrides', () => {
    const code = `Button: pad 12, bg #3B82F6

DangerButton as Button: bg #EF4444`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const template = result.registry.get('DangerButton')
    expect(template).toBeDefined()
    expect(template?.properties.pad).toBe(12)
    expect(template?.properties.bg).toBe('#EF4444')
  })
})

describe('Multiple Child Overrides', () => {
  it('slot properties inherited from definition', () => {
    const code = `Card:
  Title: text-size 16
  Body: pad 12

Card
  Title "Hello"
  Body
    Text "Content"`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
  })
})

describe('Child Overrides with Property Values', () => {
  it('inheritance with color override', () => {
    const code = `Alert: pad 12, bg #333

SuccessAlert as Alert: bg #22C55E`

    const result = parse(code)
    const template = result.registry.get('SuccessAlert')
    expect(template?.properties.bg).toBe('#22C55E')
    expect(template?.properties.pad).toBe(12)
  })

  it('inheritance preserves structure', () => {
    const code = `Form: ver, gap 16
  Input: pad 8

Form
  Input "Placeholder"`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
  })
})

describe('Child Override Inheritance Chain', () => {
  it('multiple levels of inheritance with overrides', () => {
    const code = `Base:
  header bg #333
  content pad 16

Level1 as Base: header bg #444
Level2 as Level1: header bg #555; content pad 24`

    const result = parse(code)

    const level1 = result.registry.get('Level1')
    const level1Header = level1?.children.find((c) => c.name === 'header')
    expect(level1Header?.properties.bg).toBe('#444')

    const level2 = result.registry.get('Level2')
    const level2Header = level2?.children.find((c) => c.name === 'header')
    const level2Content = level2?.children.find((c) => c.name === 'content')
    expect(level2Header?.properties.bg).toBe('#555')
    expect(level2Content?.properties.pad).toBe(24)
  })
})

describe('Edge Cases', () => {
  it('definition with multiple properties', () => {
    const code = `Button: pad 12, bg #3B82F6, rad 8

Button "Click me"`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes[0].properties.pad).toBe(12)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    expect(result.nodes[0].properties.rad).toBe(8)
  })
})
