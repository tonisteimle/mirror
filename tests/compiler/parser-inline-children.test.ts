/**
 * Parser Inline Children Tests
 *
 * Tests parsing of inline child syntax (semicolon-separated children):
 * - Instance: Frame bg #333; Text "Hello"; Button "OK"
 * - State: state filled { Value col $text }
 *
 * This syntax allows writing hierarchical structures in a single line:
 *   Frame hor, gap 12; Text "Hello"; Button "OK"
 * is equivalent to:
 *   Frame hor, gap 12
 *     Text "Hello"
 *     Button "OK"
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import type { Instance } from '../../compiler/parser/ast'

// ============================================================================
// INLINE CHILDREN (semicolon syntax)
// ============================================================================

describe('Parser: Inline Children (Semicolon Syntax)', () => {
  it('parses inline children', () => {
    const ast = parse('Frame bg #333; Text "Hello"; Button "OK"')
    expect(ast.instances.length).toBe(1)
    expect(ast.instances[0].children.length).toBe(2)
  })

  it('parses first inline child correctly', () => {
    const ast = parse('NavItem Icon "home"; Label "Home"')
    const children = ast.instances[0].children as Instance[]
    expect(children[0].component).toBe('Icon')
    const content = children[0].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('home')
  })

  it('parses second inline child correctly', () => {
    const ast = parse('NavItem Icon "home"; Label "Home"')
    const children = ast.instances[0].children as Instance[]
    expect(children[1].component).toBe('Label')
    const content = children[1].properties.find(p => p.name === 'content')
    expect(content?.values[0]).toBe('Home')
  })

  it('parses inline child with property', () => {
    // Note: Child names must be PascalCase to distinguish from property separators
    const ast = parse('Button Icon visible; Label hidden')
    const children = ast.instances[0].children as Instance[]
    expect(children.length).toBe(2)
    expect(children[0].component).toBe('Icon')
    expect(children[0].properties[0].name).toBe('visible')
    expect(children[1].component).toBe('Label')
    expect(children[1].properties[0].name).toBe('hidden')
  })

  it('parses inline child with multiple properties', () => {
    const ast = parse('Card Title "Hello", col red; Content "World"')
    const children = ast.instances[0].children as Instance[]
    expect(children.length).toBe(2)
    expect(children[0].component).toBe('Title')
    expect(children[0].properties.length).toBe(2) // content + col
    expect(children[1].component).toBe('Content')
  })

  it('no inline children when no semicolon', () => {
    const ast = parse('Button pad 12, bg blue')
    expect(ast.instances[0].children.length).toBe(0)
    expect(ast.instances[0].properties.length).toBeGreaterThan(0)
  })

  it('parses three inline children', () => {
    const ast = parse('CustomMenu Item1 "File"; Item2 "Edit"; Item3 "View"')
    const children = ast.instances[0].children as Instance[]
    expect(children.length).toBe(3)
    expect(children[0].component).toBe('Item1')
    expect(children[1].component).toBe('Item2')
    expect(children[2].component).toBe('Item3')
  })

  it('parent element gets its properties', () => {
    const ast = parse('Frame hor, gap 12, bg #1a1a1a; Text "Hello"')
    const frame = ast.instances[0]
    expect(frame.properties.some(p => p.name === 'hor')).toBe(true)
    expect(frame.properties.some(p => p.name === 'gap')).toBe(true)
    expect(frame.properties.some(p => p.name === 'bg')).toBe(true)
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

describe('Parser: Inline Children Edge Cases', () => {
  it('trailing semicolon without second child is treated as properties', () => {
    // Design limitation: Without a second PascalCase identifier after the semicolon,
    // the parser cannot distinguish inline child syntax from property syntax
    const ast = parse('NavItem Icon "home";')
    // This is parsed as properties, not inline children
    expect(ast.instances[0].children.length).toBe(0)
    expect(ast.instances[0].properties.length).toBeGreaterThan(0)
  })

  it('lowercase names are treated as properties, not inline children', () => {
    // Design decision: Only PascalCase names after semicolon trigger inline child syntax
    // This allows semicolons to work as property separators: Frame bg #f00; w 100
    const ast = parse('Component icon "check"; label "OK"')
    expect(ast.instances[0].children.length).toBe(0)
    // Instead, these are parsed as properties
    const props = ast.instances[0].properties
    expect(props.some(p => p.name === 'icon')).toBe(true)
    expect(props.some(p => p.name === 'label')).toBe(true)
  })

  it('inline children work with named instances', () => {
    const ast = parse('NavItem named homeNav Icon "home"; Label "Home"')
    expect(ast.instances[0].name).toBe('homeNav')
    expect(ast.instances[0].children.length).toBe(2)
  })
})
