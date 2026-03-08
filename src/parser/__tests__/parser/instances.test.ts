/**
 * Parser Instance Tests
 *
 * Tests parsing of component instances (usage without colon)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser'

// ============================================================================
// BASIC INSTANCES
// ============================================================================

describe('Parser: Basic Instances', () => {
  it('parses simple instance', () => {
    const ast = parse('Button')
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].component).toBe('Button')
    expect(ast.instances[0].type).toBe('Instance')
  })

  it('parses instance with string content', () => {
    const ast = parse('Button "Click me"')
    expect(ast.instances[0].component).toBe('Button')
    const content = ast.instances[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Click me')
  })

  it('parses instance with property', () => {
    const ast = parse('Button pad 8')
    expect(ast.instances[0].properties.length).toBe(1)
    expect(ast.instances[0].properties[0].name).toBe('pad')
  })

  it('parses instance with multiple properties', () => {
    const ast = parse('Button pad 8, bg primary')
    expect(ast.instances[0].properties.length).toBe(2)
  })

  it('parses instance with content and properties', () => {
    const ast = parse('Button "Click", pad 8, bg blue')
    expect(ast.instances[0].properties.length).toBe(3)
  })

  it('parses multiple instances', () => {
    const ast = parse(`Button "Save"
Button "Cancel"
Button "Delete"`)
    expect(ast.instances.length).toBe(3)
  })
})

// ============================================================================
// NAMED INSTANCES
// ============================================================================

describe('Parser: Named Instances', () => {
  it('parses named instance', () => {
    const ast = parse('Button named saveBtn')
    expect(ast.instances[0].name).toBe('saveBtn')
    expect(ast.instances[0].component).toBe('Button')
  })

  it('parses named instance with content', () => {
    const ast = parse('Button named saveBtn "Save"')
    expect(ast.instances[0].name).toBe('saveBtn')
    const content = ast.instances[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Save')
  })

  it('parses named instance with properties', () => {
    const ast = parse('Button named saveBtn pad 8')
    expect(ast.instances[0].name).toBe('saveBtn')
    expect(ast.instances[0].properties.length).toBe(1)
  })

  it('parses named instance with content and properties', () => {
    const ast = parse('Button named saveBtn "Save", pad 8, bg primary')
    expect(ast.instances[0].name).toBe('saveBtn')
    expect(ast.instances[0].properties.length).toBe(3)
  })

  it('parses multiple named instances', () => {
    const ast = parse(`Button named saveBtn "Save"
Button named cancelBtn "Cancel"`)
    expect(ast.instances.length).toBe(2)
    expect(ast.instances[0].name).toBe('saveBtn')
    expect(ast.instances[1].name).toBe('cancelBtn')
  })

  it('unnamed instance has null name', () => {
    const ast = parse('Button "Click"')
    expect(ast.instances[0].name).toBeNull()
  })
})

// ============================================================================
// NESTED INSTANCES (CHILDREN)
// ============================================================================

describe('Parser: Nested Instances', () => {
  it('parses instance with one child', () => {
    const ast = parse(`Card
  Text "Hello"`)
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].children.length).toBe(1)
    expect(ast.instances[0].children[0].component).toBe('Text')
  })

  it('parses instance with multiple children', () => {
    const ast = parse(`Card
  Title "Hello"
  Content "World"
  Button "OK"`)
    expect(ast.instances[0].children.length).toBe(3)
  })

  it('parses deeply nested instances', () => {
    const ast = parse(`App
  Header
    Logo
      Icon "home"`)
    expect(ast.instances[0].children.length).toBe(1)
    expect(ast.instances[0].children[0].component).toBe('Header')
    expect(ast.instances[0].children[0].children.length).toBe(1)
    expect(ast.instances[0].children[0].children[0].component).toBe('Logo')
  })

  it('parses siblings at same level', () => {
    const ast = parse(`Card
  A
  B
  C`)
    expect(ast.instances[0].children.length).toBe(3)
    expect(ast.instances[0].children[0].component).toBe('A')
    expect(ast.instances[0].children[1].component).toBe('B')
    expect(ast.instances[0].children[2].component).toBe('C')
  })

  it('child can have properties', () => {
    const ast = parse(`Card
  Text "Hello", col red`)
    const child = ast.instances[0].children[0]
    expect(child.properties.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// INSTANCE POSITION
// ============================================================================

describe('Parser: Instance Position', () => {
  it('tracks line number', () => {
    const ast = parse(`
Button "Click"`)
    expect(ast.instances[0].line).toBe(2)
  })

  it('child has correct line number', () => {
    const ast = parse(`Card
  Text "Line 2"
  Button "Line 3"`)
    expect(ast.instances[0].children[0].line).toBe(2)
    expect(ast.instances[0].children[1].line).toBe(3)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Instance Edge Cases', () => {
  it('instance with hyphenated component name', () => {
    const ast = parse('my-button "Click"')
    expect(ast.instances[0].component).toBe('my-button')
  })

  it('instance after component definition', () => {
    const ast = parse(`Card as frame:
  pad 16

Card
  Text "Hello"`)
    expect(ast.components.length).toBe(1)
    expect(ast.instances.length).toBe(1)
  })

  it('multiple top-level instances', () => {
    const ast = parse(`Header
  Logo
Content
  Main
Footer
  Copyright`)
    expect(ast.instances.length).toBe(3)
  })

  it('empty string content', () => {
    const ast = parse('Text ""')
    const content = ast.instances[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('')
  })

  it('instance with only whitespace around', () => {
    const ast = parse('  Button  ')
    expect(ast.instances.length).toBe(1)
  })
})
