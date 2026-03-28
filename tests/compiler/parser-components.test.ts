/**
 * Parser Component Definition Tests
 *
 * Tests parsing of component definitions: Name as primitive:
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'

// ============================================================================
// BASIC COMPONENT DEFINITIONS
// ============================================================================

describe('Parser: Component Definitions (as)', () => {
  it('parses minimal component', () => {
    const ast = parse('Card as frame:')
    expect(ast.components.length).toBe(1)
    expect(ast.components[0].name).toBe('Card')
    expect(ast.components[0].primitive).toBe('frame')
    expect(ast.components[0].extends).toBeNull()
  })

  it('parses component with text primitive', () => {
    const ast = parse('Label as text:')
    expect(ast.components[0].primitive).toBe('text')
  })

  it('parses component with button primitive', () => {
    const ast = parse('Button as button:')
    expect(ast.components[0].primitive).toBe('button')
  })

  it('parses component with input primitive', () => {
    const ast = parse('TextField as input:')
    expect(ast.components[0].primitive).toBe('input')
  })

  it('parses component with image primitive', () => {
    const ast = parse('Avatar as image:')
    expect(ast.components[0].primitive).toBe('image')
  })

  it('parses component with link primitive', () => {
    const ast = parse('NavLink as link:')
    expect(ast.components[0].primitive).toBe('link')
  })

  it('parses component with icon primitive', () => {
    const ast = parse('IconBtn as icon:')
    expect(ast.components[0].primitive).toBe('icon')
  })

  it('parses multiple components', () => {
    const ast = parse(`Card as frame:
Button as button:
Text as text:`)
    expect(ast.components.length).toBe(3)
    expect(ast.components[0].name).toBe('Card')
    expect(ast.components[1].name).toBe('Button')
    expect(ast.components[2].name).toBe('Text')
  })
})

// ============================================================================
// COMPONENT WITH INLINE PROPERTIES
// ============================================================================

describe('Parser: Component Inline Properties', () => {
  it('parses single inline property', () => {
    const ast = parse('Card as frame: pad 16')
    expect(ast.components[0].properties.length).toBe(1)
    expect(ast.components[0].properties[0].name).toBe('pad')
    expect(ast.components[0].properties[0].values).toContain('16')
  })

  it('parses multiple inline properties with comma', () => {
    const ast = parse('Card as frame: pad 16, bg #FFF')
    expect(ast.components[0].properties.length).toBe(2)
    expect(ast.components[0].properties[0].name).toBe('pad')
    expect(ast.components[0].properties[1].name).toBe('bg')
  })

  it('parses property with multiple values', () => {
    const ast = parse('Card as frame: pad 8 16')
    const prop = ast.components[0].properties[0]
    expect(prop.values.length).toBe(2)
    expect(prop.values).toContain('8')
    expect(prop.values).toContain('16')
  })

  it('parses string content as property', () => {
    const ast = parse('Button as button: "Click me"')
    const prop = ast.components[0].properties.find(p => p.name === 'content')
    expect(prop).toBeDefined()
    expect(prop?.values[0]).toBe('Click me')
  })

  it('parses mixed properties and content', () => {
    const ast = parse('Button as button: pad 8, "Click", bg blue')
    expect(ast.components[0].properties.length).toBe(3)
  })
})

// ============================================================================
// COMPONENT WITH BLOCK PROPERTIES
// ============================================================================

describe('Parser: Component Block Properties', () => {
  it('parses properties in block', () => {
    const ast = parse(`Card as frame:
  pad 16
  bg surface`)
    expect(ast.components[0].properties.length).toBe(2)
    expect(ast.components[0].properties[0].name).toBe('pad')
    expect(ast.components[0].properties[1].name).toBe('bg')
  })

  it('parses inline + block properties', () => {
    const ast = parse(`Card as frame: rad 8
  pad 16
  bg surface`)
    expect(ast.components[0].properties.length).toBe(3)
    expect(ast.components[0].properties[0].name).toBe('rad')
    expect(ast.components[0].properties[1].name).toBe('pad')
    expect(ast.components[0].properties[2].name).toBe('bg')
  })
})

// ============================================================================
// COMPONENT POSITION
// ============================================================================

describe('Parser: Component Position', () => {
  it('tracks line number', () => {
    const ast = parse(`
Card as frame:
  pad 16`)
    expect(ast.components[0].line).toBe(2)
  })

  it('tracks column number', () => {
    const ast = parse('Card as frame:')
    expect(ast.components[0].column).toBeGreaterThan(0)
  })

  it('multiple components have different lines', () => {
    const ast = parse(`A as frame:
B as frame:
C as frame:`)
    expect(ast.components[0].line).toBe(1)
    expect(ast.components[1].line).toBe(2)
    expect(ast.components[2].line).toBe(3)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Component Edge Cases', () => {
  it('component after section header', () => {
    const ast = parse(`--- Components ---
Card as frame:`)
    expect(ast.components.length).toBe(1)
  })

  it('component after comment', () => {
    const ast = parse(`// This is a component
Card as frame:`)
    expect(ast.components.length).toBe(1)
  })

  it('component with hyphenated name', () => {
    const ast = parse('my-card as frame:')
    expect(ast.components[0].name).toBe('my-card')
  })

  it('component with numbers in name', () => {
    const ast = parse('Card2 as frame:')
    expect(ast.components[0].name).toBe('Card2')
  })

  it('component with underscore in name', () => {
    const ast = parse('my_card as frame:')
    expect(ast.components[0].name).toBe('my_card')
  })

  it('empty lines between components', () => {
    const ast = parse(`A as frame:

B as frame:`)
    expect(ast.components.length).toBe(2)
  })
})
