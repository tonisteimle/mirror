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
DangerButton: Button bg #EF4444
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
