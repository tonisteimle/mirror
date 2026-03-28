/**
 * Parser Child Override Tests
 *
 * Tests parsing of child override syntax:
 * - Instance: NavItem Icon "home"; Label "Home"
 * - State: state filled { Value col $text }
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'

// ============================================================================
// INSTANCE CHILD OVERRIDES
// ============================================================================

describe('Parser: Instance Child Overrides', () => {
  it('parses single child override', () => {
    const ast = parse('NavItem Icon "home"; Label "Home"')
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].childOverrides).toBeDefined()
    expect(ast.instances[0].childOverrides?.length).toBe(2)
  })

  it('parses first child override correctly', () => {
    const ast = parse('NavItem Icon "home"; Label "Home"')
    const overrides = ast.instances[0].childOverrides!
    expect(overrides[0].childName).toBe('Icon')
    const content = overrides[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('home')
  })

  it('parses second child override correctly', () => {
    const ast = parse('NavItem Icon "home"; Label "Home"')
    const overrides = ast.instances[0].childOverrides!
    expect(overrides[1].childName).toBe('Label')
    const content = overrides[1].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Home')
  })

  it('parses child override with property', () => {
    // Note: Child names must be PascalCase to distinguish from property separators
    const ast = parse('Button Icon visible; Label hidden')
    const overrides = ast.instances[0].childOverrides!
    expect(overrides.length).toBe(2)
    expect(overrides[0].childName).toBe('Icon')
    expect(overrides[0].properties[0].name).toBe('visible')
    expect(overrides[1].childName).toBe('Label')
    expect(overrides[1].properties[0].name).toBe('hidden')
  })

  it('parses child override with multiple properties', () => {
    const ast = parse('Card Title "Hello", col red; Content "World"')
    const overrides = ast.instances[0].childOverrides!
    expect(overrides.length).toBe(2)
    expect(overrides[0].childName).toBe('Title')
    expect(overrides[0].properties.length).toBe(2) // content + col
    expect(overrides[1].childName).toBe('Content')
  })

  it('no child overrides when no semicolon', () => {
    const ast = parse('Button pad 12, bg blue')
    expect(ast.instances[0].childOverrides).toBeUndefined()
    expect(ast.instances[0].properties.length).toBeGreaterThan(0)
  })

  it('parses three child overrides', () => {
    const ast = parse('CustomMenu Item1 "File"; Item2 "Edit"; Item3 "View"')
    const overrides = ast.instances[0].childOverrides!
    expect(overrides.length).toBe(3)
    expect(overrides[0].childName).toBe('Item1')
    expect(overrides[1].childName).toBe('Item2')
    expect(overrides[2].childName).toBe('Item3')
  })
})

// ============================================================================
// COMPONENT DEFINITION CHILD OVERRIDES (in inheritance)
// ============================================================================

describe('Parser: Inheritance Child Overrides', () => {
  it('parses inheritance with child overrides', () => {
    const ast = parse('IconButton extends Button: icon visible; label hidden')
    expect(ast.components.length).toBe(1)
    // Note: For inheritance, the child overrides would be in a different place
    // This test documents the current behavior
    const component = ast.components[0]
    expect(component.extends).toBe('Button')
  })
})

// ============================================================================
// STATE CHILD OVERRIDES
// ============================================================================

describe('Parser: State Child Overrides', () => {
  it('parses state with child override', () => {
    const ast = parse(`Input:
  Placeholder col #888
  state filled
    Value col #fff`)
    expect(ast.components.length).toBe(1)
    const input = ast.components[0]
    expect(input.states.length).toBe(1)
    expect(input.states[0].name).toBe('filled')
    expect(input.states[0].childOverrides.length).toBe(1)
    expect(input.states[0].childOverrides[0].childName).toBe('Value')
  })

  it('parses child override property in state', () => {
    const ast = parse(`Input:
  state filled
    Value col $text`)
    const state = ast.components[0].states[0]
    const override = state.childOverrides[0]
    expect(override.childName).toBe('Value')
    expect(override.properties[0].name).toBe('col')
  })

  it('parses multiple child overrides in state', () => {
    const ast = parse(`Input:
  state filled
    Value col #fff
    Placeholder hidden`)
    const state = ast.components[0].states[0]
    expect(state.childOverrides.length).toBe(2)
    expect(state.childOverrides[0].childName).toBe('Value')
    expect(state.childOverrides[1].childName).toBe('Placeholder')
  })

  it('mixes properties and child overrides in state', () => {
    const ast = parse(`Input:
  state filled
    bg #333
    Value col #fff`)
    const state = ast.components[0].states[0]
    // bg #333 is a property (lowercase), Value is a child override (uppercase)
    expect(state.properties.length).toBe(1)
    expect(state.properties[0].name).toBe('bg')
    expect(state.childOverrides.length).toBe(1)
    expect(state.childOverrides[0].childName).toBe('Value')
  })

  it('parses inline state without child overrides', () => {
    const ast = parse(`Button:
  state highlighted bg elevated`)
    const state = ast.components[0].states[0]
    expect(state.name).toBe('highlighted')
    expect(state.properties.length).toBeGreaterThan(0)
    expect(state.childOverrides.length).toBe(0)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: Child Override Edge Cases', () => {
  it('trailing semicolon without second override is treated as properties', () => {
    // Design limitation: Without a second PascalCase identifier after the semicolon,
    // the parser cannot distinguish child override syntax from property syntax
    const ast = parse('NavItem Icon "home";')
    // This is parsed as properties, not child overrides
    expect(ast.instances[0].childOverrides).toBeUndefined()
    expect(ast.instances[0].properties.length).toBeGreaterThan(0)
  })

  it('lowercase names are treated as properties, not child overrides', () => {
    // Design decision: Only PascalCase names after semicolon trigger child override syntax
    // This allows semicolons to work as property separators: Frame bg #f00; w 100
    const ast = parse('Component icon "check"; label "OK"')
    expect(ast.instances[0].childOverrides).toBeUndefined()
    // Instead, these are parsed as properties
    const props = ast.instances[0].properties
    expect(props.some(p => p.name === 'icon')).toBe(true)
    expect(props.some(p => p.name === 'label')).toBe(true)
  })

  it('child overrides work with named instances', () => {
    const ast = parse('NavItem named homeNav Icon "home"; Label "Home"')
    expect(ast.instances[0].name).toBe('homeNav')
    expect(ast.instances[0].childOverrides?.length).toBe(2)
  })
})
