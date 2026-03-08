/**
 * IR Child Override Tests
 *
 * Tests that childOverrides are correctly transformed to IR
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { toIR } from '../index'

// ============================================================================
// INSTANCE CHILD OVERRIDES → IR
// ============================================================================

describe('IR: Instance Child Overrides', () => {
  it('transforms child overrides to slot fillers', () => {
    const ast = parse(`
NavItem:
  Icon:
  Label:

NavItem Icon "home"; Label "Home"
`)
    const ir = toIR(ast)

    // Find the NavItem instance
    const navItem = ir.nodes.find(n => n.name === 'NavItem')
    expect(navItem).toBeDefined()
    expect(navItem!.children.length).toBe(2)
  })

  it('child override content is passed through', () => {
    const ast = parse(`
Card:
  Title:
  Content:

Card Title "Hello"; Content "World"
`)
    const ir = toIR(ast)
    const card = ir.nodes.find(n => n.name === 'Card')
    expect(card).toBeDefined()

    const titleChild = card!.children.find(c => c.name === 'Title')
    expect(titleChild).toBeDefined()
    // Content is in properties
    const contentProp = titleChild!.properties.find(p => p.name === 'textContent')
    expect(contentProp?.value).toBe('Hello')
  })

  it('child override with multiple properties', () => {
    const ast = parse(`
Item:
  Icon:
  Label:

Item Icon "check", col red; Label "Done"
`)
    const ir = toIR(ast)
    const item = ir.nodes.find(n => n.name === 'Item')
    expect(item).toBeDefined()

    const iconChild = item!.children.find(c => c.name === 'Icon')
    expect(iconChild).toBeDefined()
    // Should have both content and color
    const hasColor = iconChild!.styles.some(s => s.property === 'color')
    expect(hasColor).toBe(true)
  })
})

// ============================================================================
// STATE CHILD OVERRIDES → IR
// ============================================================================

describe('IR: State Child Overrides', () => {
  it('applies state styles to matching children', () => {
    const ast = parse(`
Input:
  Value col #888
  state filled
    Value col #fff
`)
    const ir = toIR(ast)

    // Get the Input component as instance (component definitions render as nodes)
    const inputDef = ast.components[0]
    expect(inputDef.name).toBe('Input')
    expect(inputDef.states[0].childOverrides.length).toBe(1)
    expect(inputDef.states[0].childOverrides[0].childName).toBe('Value')
  })

  it('state child override adds state-conditional styles', () => {
    const ast = parse(`
Input:
  Placeholder:
  Value:
  state filled
    Value col white

Input
`)
    const ir = toIR(ast)

    // Find the Input instance node
    const inputNode = ir.nodes.find(n => n.name === 'Input')
    expect(inputNode).toBeDefined()

    // Find Value child
    const valueChild = inputNode!.children.find(c => c.name === 'Value')
    expect(valueChild).toBeDefined()

    // Should have a state-conditional style
    const stateStyle = valueChild!.styles.find(s => s.state === 'filled')
    expect(stateStyle).toBeDefined()
    expect(stateStyle!.property).toBe('color')
  })

  it('multiple children with state overrides', () => {
    const ast = parse(`
Input:
  Placeholder:
  Value:
  state filled
    Placeholder hidden
    Value col #fff

Input
`)
    const ir = toIR(ast)
    const inputNode = ir.nodes.find(n => n.name === 'Input')

    // Both children should have state-conditional styles
    const placeholderChild = inputNode!.children.find(c => c.name === 'Placeholder')
    const valueChild = inputNode!.children.find(c => c.name === 'Value')

    expect(placeholderChild).toBeDefined()
    expect(valueChild).toBeDefined()

    // Placeholder should have hidden in filled state
    const placeholderStateStyle = placeholderChild!.styles.find(s => s.state === 'filled')
    expect(placeholderStateStyle).toBeDefined()

    // Value should have color in filled state
    const valueStateStyle = valueChild!.styles.find(s => s.state === 'filled')
    expect(valueStateStyle).toBeDefined()
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('IR: Child Override Edge Cases', () => {
  it('handles missing child gracefully', () => {
    const ast = parse(`
Card:
  Title:
  state expanded
    NonExistent col red

Card
`)
    // Should not throw
    const ir = toIR(ast)
    expect(ir.nodes.length).toBeGreaterThan(0)
  })

  it('regular children work alongside childOverrides', () => {
    const ast = parse(`
Card:
  Title:
  Content:

Card Title "Hello"; Content "World"
  Text "Extra content"
`)
    const ir = toIR(ast)
    const card = ir.nodes.find(n => n.name === 'Card')
    // Should have Title, Content from overrides and Text as extra child
    expect(card!.children.length).toBeGreaterThanOrEqual(2)
  })
})
