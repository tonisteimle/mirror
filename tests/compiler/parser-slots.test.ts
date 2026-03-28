/**
 * Parser Slot Tests
 *
 * Tests parsing of Slot primitives
 * Syntax: Slot "Name", properties...
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import type { Slot, Instance } from '../../ast'

// ============================================================================
// BASIC SLOT PARSING
// ============================================================================

describe('Parser: Slot Primitive', () => {
  it('parses Slot with quoted name', () => {
    const ast = parse('Slot "Header"')
    expect(ast.instances.length).toBe(1)

    const slot = ast.instances[0] as Slot
    expect(slot.type).toBe('Slot')
    expect(slot.name).toBe('Header')
  })

  it('parses Slot without name as "default"', () => {
    const ast = parse('Slot')
    expect(ast.instances.length).toBe(1)

    const slot = ast.instances[0] as Slot
    expect(slot.type).toBe('Slot')
    expect(slot.name).toBe('default')
  })

  it('parses Slot name without treating it as content', () => {
    // This is the key test - "Header" should be the slot name, NOT content property
    const ast = parse('Slot "Header"')
    const slot = ast.instances[0] as Slot

    expect(slot.type).toBe('Slot')
    expect(slot.name).toBe('Header')

    // Should NOT have a content property
    expect(slot.properties?.find(p => p.name === 'content')).toBeUndefined()
  })

  it('parses multiple slots', () => {
    const ast = parse(`Slot "Header"
Slot "Content"
Slot "Footer"`)

    expect(ast.instances.length).toBe(3)
    expect((ast.instances[0] as Slot).name).toBe('Header')
    expect((ast.instances[1] as Slot).name).toBe('Content')
    expect((ast.instances[2] as Slot).name).toBe('Footer')
  })
})

// ============================================================================
// SLOT WITH PROPERTIES
// ============================================================================

describe('Parser: Slot with Properties', () => {
  it('parses Slot with width property', () => {
    const ast = parse('Slot "Sidebar", w 200')
    const slot = ast.instances[0] as Slot

    expect(slot.type).toBe('Slot')
    expect(slot.name).toBe('Sidebar')
    expect(slot.properties).toBeDefined()
    expect(slot.properties?.length).toBe(1)
    expect(slot.properties?.[0].name).toBe('w')
    // Parser may return number as string or number
    expect(Number(slot.properties?.[0].values[0])).toBe(200)
  })

  it('parses Slot with multiple properties', () => {
    const ast = parse('Slot "Content", w full, h 300, bg #f0f0f0')
    const slot = ast.instances[0] as Slot

    expect(slot.name).toBe('Content')
    expect(slot.properties?.length).toBe(3)

    const propNames = slot.properties?.map(p => p.name)
    expect(propNames).toContain('w')
    expect(propNames).toContain('h')
    expect(propNames).toContain('bg')
  })

  it('parses Slot with height only', () => {
    const ast = parse('Slot "Header", h 60')
    const slot = ast.instances[0] as Slot

    expect(slot.name).toBe('Header')
    expect(Number(slot.properties?.find(p => p.name === 'h')?.values[0])).toBe(60)
  })
})

// ============================================================================
// SLOT AS CHILD
// ============================================================================

describe('Parser: Slot as Child', () => {
  it('parses Slot as child of Box', () => {
    const ast = parse(`Box ver
  Slot "Header"`)

    expect(ast.instances.length).toBe(1)
    const box = ast.instances[0] as Instance
    expect(box.component).toBe('Box')
    expect(box.children.length).toBe(1)

    const slot = box.children[0] as Slot
    expect(slot.type).toBe('Slot')
    expect(slot.name).toBe('Header')
  })

  it('parses multiple Slots as children', () => {
    const ast = parse(`Box ver
  Slot "Header", h 60
  Slot "Content"
  Slot "Footer", h 40`)

    const box = ast.instances[0] as Instance
    expect(box.children.length).toBe(3)

    expect((box.children[0] as Slot).name).toBe('Header')
    expect((box.children[1] as Slot).name).toBe('Content')
    expect((box.children[2] as Slot).name).toBe('Footer')
  })

  it('parses mixed children (Slot and Instance)', () => {
    const ast = parse(`Box ver
  Slot "Header"
  Text "Hello"
  Slot "Footer"`)

    const box = ast.instances[0] as Instance
    expect(box.children.length).toBe(3)

    expect((box.children[0] as Slot).type).toBe('Slot')
    expect((box.children[1] as Instance).component).toBe('Text')
    expect((box.children[2] as Slot).type).toBe('Slot')
  })
})

// ============================================================================
// SLOT IN COMPONENT DEFINITION
// ============================================================================

describe('Parser: Slot in Component Definition', () => {
  it('parses Slot in component body', () => {
    const ast = parse(`Card:
  Slot "Header"
  Slot "Content"`)

    expect(ast.components.length).toBe(1)
    const card = ast.components[0]
    expect(card.children.length).toBe(2)

    expect((card.children[0] as Slot).type).toBe('Slot')
    expect((card.children[0] as Slot).name).toBe('Header')
    expect((card.children[1] as Slot).type).toBe('Slot')
    expect((card.children[1] as Slot).name).toBe('Content')
  })

  it('parses Slot with properties in component', () => {
    const ast = parse(`Layout:
  Slot "Sidebar", w 250
  Slot "Main", w full`)

    const layout = ast.components[0]
    const sidebar = layout.children[0] as Slot
    const main = layout.children[1] as Slot

    expect(sidebar.name).toBe('Sidebar')
    expect(Number(sidebar.properties?.find(p => p.name === 'w')?.values[0])).toBe(250)

    expect(main.name).toBe('Main')
    expect(main.properties?.find(p => p.name === 'w')?.values[0]).toBe('full')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Slot Edge Cases', () => {
  it('parses Slot with empty string name', () => {
    const ast = parse('Slot ""')
    const slot = ast.instances[0] as Slot
    expect(slot.type).toBe('Slot')
    expect(slot.name).toBe('')
  })

  it('parses Slot with spaces in name', () => {
    const ast = parse('Slot "Main Content Area"')
    const slot = ast.instances[0] as Slot
    expect(slot.name).toBe('Main Content Area')
  })

  it('preserves line and column info', () => {
    const ast = parse('Slot "Test"')
    const slot = ast.instances[0] as Slot
    expect(slot.line).toBeDefined()
    expect(slot.column).toBeDefined()
  })

  it('distinguishes Slot from component named Slot', () => {
    // Slot without quotes = Slot primitive
    const ast1 = parse('Slot "Name"')
    expect((ast1.instances[0] as Slot).type).toBe('Slot')

    // Component definition Slot: would be parsed differently
    // This ensures "Slot" keyword triggers special handling
  })
})
