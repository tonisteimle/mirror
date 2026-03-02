/**
 * V1 Syntax Tests: Components
 *
 * Tests for component definitions, inheritance, and instances.
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne, props, hasDefinition, getTemplate, getChild } from '../test-utils'

describe('Component Definitions', () => {
  it('definition with colon does not render', () => {
    const result = parse('Button: pad 12 bg #3B82F6')
    expect(result.nodes.length).toBe(0)
    expect(hasDefinition(result, 'Button')).toBe(true)
  })

  it('stores properties in registry', () => {
    const result = parse('Button: pad 12 bg #3B82F6')
    const template = getTemplate(result, 'Button')
    expect(template?.properties.pad).toBe(12)
    expect(template?.properties.bg).toBe('#3B82F6')
  })
})

describe('Component Usage', () => {
  it('uses defined component', () => {
    const node = parseOne(`Button: pad 12 bg #3B82F6
Button "Click me"`)
    expect(node.properties.pad).toBe(12)
    expect(node.properties.bg).toBe('#3B82F6')
  })

  it('allows property override on usage', () => {
    const node = parseOne(`Button: bg #FF0000
Button bg #00FF00 "Override"`)
    expect(node.properties.bg).toBe('#00FF00')
  })
})

describe('Component Inheritance', () => {
  it('inherits properties from parent', () => {
    const btn = parseOne(`Button: pad 12 bg #3B82F6 rad 8
DangerButton as Button: bg #EF4444
DangerButton "Delete"`)
    expect(btn.properties.pad).toBe(12)
    expect(btn.properties.rad).toBe(8)
    expect(btn.properties.bg).toBe('#EF4444')
  })
})

describe('Text Content', () => {
  it('parses text at end of line', () => {
    const node = parseOne('Button "Click me"')
    expect(getChild(node, 0)?.content).toBe('Click me')
  })

  it('text after properties', () => {
    const node = parseOne('Button pad 12 bg #3B82F6 "Submit"')
    expect(getChild(node, 0)?.content).toBe('Submit')
    expect(node.properties.pad).toBe(12)
  })
})

describe('Nested Children', () => {
  it('parses children via indentation', () => {
    const node = parseOne(`Card pad 16
  Title "Welcome"
  Description "Hello"`)
    expect(node.children.length).toBeGreaterThan(0)
  })

  it('maintains proper hierarchy', () => {
    const parent = parseOne(`Parent
  Child1
    GrandChild
  Child2`)
    expect(parent.children.length).toBe(2)
    const child1 = getChild(parent, 'Child1')
    expect(child1?.children.length).toBe(1)
  })
})

describe('Definition Merging (Structure + Style)', () => {
  it('merges multiple definitions of same component', () => {
    const result = parse(`// Structure
Option:
  onclick select self
  onhover highlight self

// Styling
Option: pad 10, rad 6, cursor pointer`)
    const template = getTemplate(result, 'Option')
    // Properties from styling
    expect(template?.properties.pad).toBe(10)
    expect(template?.properties.rad).toBe(6)
    expect(template?.properties.cursor).toBe('pointer')
    // Events from structure
    expect(template?.eventHandlers?.length).toBe(2)
  })

  it('merges states from separate definitions', () => {
    const result = parse(`// Structure with behavior
Option:
  onclick select self

// Styling with states
Option:
  state highlighted bg #333
  state selected bg #3B82F6`)
    const template = getTemplate(result, 'Option')
    expect(template?.eventHandlers?.length).toBe(1)
    // States is an array
    const stateNames = template?.states?.map(s => s.name)
    expect(stateNames).toContain('highlighted')
    expect(stateNames).toContain('selected')
  })

  it('later properties override earlier ones', () => {
    const result = parse(`Button: bg #FF0000
Button: bg #00FF00`)
    const template = getTemplate(result, 'Button')
    expect(template?.properties.bg).toBe('#00FF00')
  })

  it('merges children from both definitions', () => {
    const result = parse(`Card:
  Title:

Card:
  Description:`)
    const template = getTemplate(result, 'Card')
    expect(template?.children?.length).toBe(2)
  })
})
