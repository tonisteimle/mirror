/**
 * Parser Inheritance Tests
 *
 * Tests parsing of component inheritance: Name extends Parent:
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

// ============================================================================
// BASIC INHERITANCE
// ============================================================================

describe('Parser: Component Inheritance (extends)', () => {
  it('parses simple inheritance', () => {
    const ast = parse('DangerButton extends Button:')
    expect(ast.components.length).toBe(1)
    expect(ast.components[0].name).toBe('DangerButton')
    expect(ast.components[0].extends).toBe('Button')
    expect(ast.components[0].primitive).toBeNull()
  })

  it('parses inheritance with inline property', () => {
    const ast = parse('DangerButton extends Button: bg red')
    expect(ast.components[0].extends).toBe('Button')
    expect(ast.components[0].properties.length).toBe(1)
    expect(ast.components[0].properties[0].name).toBe('bg')
  })

  it('parses inheritance with multiple inline properties', () => {
    const ast = parse('DangerButton extends Button: bg red, col white')
    expect(ast.components[0].properties.length).toBe(2)
  })

  it('parses inheritance with block', () => {
    const ast = parse(`DangerButton extends Button:
  bg danger
  col white`)
    expect(ast.components[0].extends).toBe('Button')
  })

  it('tracks position for inherited component', () => {
    const ast = parse(`
DangerButton extends Button:`)
    expect(ast.components[0].line).toBe(2)
  })
})

// ============================================================================
// MULTIPLE INHERITANCE DEFINITIONS
// ============================================================================

describe('Parser: Multiple Inheritance Variants', () => {
  it('parses multiple variants', () => {
    const ast = parse(`DangerButton extends Button:
  bg danger

GhostButton extends Button:
  bg transparent

IconButton extends Button:
  pad 8`)
    expect(ast.components.length).toBe(3)
    expect(ast.components[0].name).toBe('DangerButton')
    expect(ast.components[1].name).toBe('GhostButton')
    expect(ast.components[2].name).toBe('IconButton')
    expect(ast.components.every(c => c.extends === 'Button')).toBe(true)
  })

  it('parses chain of inheritance in same file', () => {
    const ast = parse(`Button as button:
  pad 8

DangerButton extends Button:
  bg danger

UltraDanger extends DangerButton:
  bor 2 red`)
    expect(ast.components.length).toBe(3)
    expect(ast.components[0].primitive).toBe('button')
    expect(ast.components[1].extends).toBe('Button')
    expect(ast.components[2].extends).toBe('DangerButton')
  })
})

// ============================================================================
// INHERITANCE WITH CONTENT
// ============================================================================

describe('Parser: Inheritance with Content', () => {
  it('parses inheritance with string content', () => {
    const ast = parse('ErrorMessage extends Message: "Error occurred"')
    const content = ast.components[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Error occurred')
  })

  it('parses inheritance with content and properties', () => {
    const ast = parse('ErrorMessage extends Message: "Error", col red')
    expect(ast.components[0].properties.length).toBe(2)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Inheritance Edge Cases', () => {
  it('inherits from hyphenated parent', () => {
    const ast = parse('Child extends my-parent:')
    expect(ast.components[0].extends).toBe('my-parent')
  })

  it('inherits from parent with numbers', () => {
    const ast = parse('Child extends Parent2:')
    expect(ast.components[0].extends).toBe('Parent2')
  })

  it('inheritance after regular component', () => {
    const ast = parse(`Card as frame:
  pad 16

SmallCard extends Card:
  pad 8`)
    expect(ast.components.length).toBe(2)
    expect(ast.components[0].primitive).toBe('frame')
    expect(ast.components[1].extends).toBe('Card')
  })

  it('component definition before and after inheritance', () => {
    const ast = parse(`A as frame:
B extends A:
C as frame:`)
    expect(ast.components.length).toBe(3)
    expect(ast.components[0].primitive).toBe('frame')
    expect(ast.components[1].extends).toBe('A')
    expect(ast.components[2].primitive).toBe('frame')
  })
})

// ============================================================================
// AS VS EXTENDS DISTINCTION
// ============================================================================

describe('Parser: as vs extends Distinction', () => {
  it('as sets primitive, extends is null', () => {
    const ast = parse('Card as frame:')
    expect(ast.components[0].primitive).toBe('frame')
    expect(ast.components[0].extends).toBeNull()
  })

  it('extends sets parent, primitive is null', () => {
    const ast = parse('SmallCard extends Card:')
    expect(ast.components[0].extends).toBe('Card')
    expect(ast.components[0].primitive).toBeNull()
  })

  it('both in same file are distinct', () => {
    const ast = parse(`Card as frame:
SmallCard extends Card:`)
    expect(ast.components[0].primitive).toBe('frame')
    expect(ast.components[0].extends).toBeNull()
    expect(ast.components[1].primitive).toBeNull()
    expect(ast.components[1].extends).toBe('Card')
  })
})
