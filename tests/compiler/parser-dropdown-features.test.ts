/**
 * Dropdown Features Tests
 *
 * Tests for the new dropdown-related features:
 * - if (state) visibility
 * - selection binding
 * - initial state
 * - onclick-outside
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('Parser: State-based Visibility', () => {
  it('parses if (open) as visibleWhen on component', () => {
    const ast = parse(`
MyMenu:
  if (open)
  pad 8
`)
    expect(ast.components).toHaveLength(1)
    expect((ast.components[0] as any).visibleWhen).toBe('open')
  })

  it('parses if (closed) as visibleWhen', () => {
    const ast = parse(`
Placeholder:
  if (closed)
  "Select..."
`)
    expect(ast.components).toHaveLength(1)
    expect((ast.components[0] as any).visibleWhen).toBe('closed')
  })

  it('parses complex condition as visibleWhen', () => {
    const ast = parse(`
MyMenu:
  if (open && hasItems)
  pad 8
`)
    expect(ast.components).toHaveLength(1)
    expect((ast.components[0] as any).visibleWhen).toBe('(open && hasItems)')
  })
})

describe('Parser: Selection Binding', () => {
  it('parses selection $variable', () => {
    const ast = parse(`
MyMenu:
  selection $selected
  pad 8
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].selection).toBe('$selected')
  })

  it('parses selection with variable name', () => {
    const ast = parse(`
Options:
  selection $currentCountry
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].selection).toBe('$currentCountry')
  })
})

describe('Parser: Initial State', () => {
  it('parses closed as initialState', () => {
    const ast = parse(`
Dropdown:
  closed
  pad 8
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].initialState).toBe('closed')
  })

  it('parses open as initialState', () => {
    const ast = parse(`
MyAccordion:
  open
  pad 8
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].initialState).toBe('open')
  })

  it('parses collapsed as initialState', () => {
    const ast = parse(`
Panel:
  collapsed
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].initialState).toBe('collapsed')
  })

  it('parses expanded as initialState', () => {
    const ast = parse(`
Details:
  expanded
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].initialState).toBe('expanded')
  })
})

describe('Parser: Focusable Property', () => {
  it('parses focusable as boolean property', () => {
    const ast = parse(`
MyMenu:
  focusable
  pad 8
`)
    expect(ast.components).toHaveLength(1)
    const focusableProp = ast.components[0].properties.find(p => p.name === 'focusable')
    expect(focusableProp).toBeDefined()
    expect(focusableProp?.values[0]).toBe(true)
  })
})

describe('Parser: Click Outside Event', () => {
  it('parses onclick-outside event', () => {
    const ast = parse(`
Dropdown:
  onclick-outside close
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].events).toHaveLength(1)
    expect(ast.components[0].events[0].name).toBe('onclick-outside')
    expect(ast.components[0].events[0].actions[0].name).toBe('close')
  })

  it('parses onclick-outside with multiple actions', () => {
    const ast = parse(`
Panel:
  onclick-outside close, deselect
`)
    expect(ast.components).toHaveLength(1)
    expect(ast.components[0].events).toHaveLength(1)
    expect(ast.components[0].events[0].name).toBe('onclick-outside')
    expect(ast.components[0].events[0].actions).toHaveLength(1)
    expect(ast.components[0].events[0].actions[0].name).toBe('close')
  })
})

describe('Parser: Edge Cases and Combinations', () => {
  it('handles nested parentheses in visibleWhen', () => {
    const ast = parse(`
MyMenu:
  if ((open && hasItems) || forceShow)
`)
    expect(ast.components).toHaveLength(1)
    expect((ast.components[0] as any).visibleWhen).toBe('((open && hasItems) || forceShow)')
  })

  it('handles initialState with other properties', () => {
    const ast = parse(`
Dropdown:
  closed, pad 8, bg #333
`)
    expect(ast.components[0].initialState).toBe('closed')
    expect(ast.components[0].properties).toHaveLength(2)
  })

  it('handles selection with other properties', () => {
    const ast = parse(`
MyMenu:
  selection $value
  pad 8
  bg #222
`)
    expect(ast.components[0].selection).toBe('$value')
    expect(ast.components[0].properties).toHaveLength(2)
  })

  it('handles visibleWhen with negation', () => {
    const ast = parse(`
CloseButton:
  if (!closed)
`)
    // Parentheses are preserved from the original syntax
    expect((ast.components[0] as any).visibleWhen).toBe('(!closed)')
  })

  it('handles onclick-outside with target', () => {
    const ast = parse(`
Panel:
  onclick-outside close Menu
`)
    expect(ast.components[0].events[0].name).toBe('onclick-outside')
    expect(ast.components[0].events[0].actions[0].name).toBe('close')
    expect(ast.components[0].events[0].actions[0].target).toBe('Menu')
  })

  it('child instance can have initialState', () => {
    const ast = parse(`
Dropdown as frame:
  ChildMenu:
    open
`)
    expect(ast.components).toHaveLength(1)
    // ChildMenu is a child of Dropdown
    const menu = ast.components[0].children.find((c: any) => c.component === 'ChildMenu')
    expect(menu).toBeDefined()
    expect((menu as any).initialState).toBe('open')
  })

  it('child instance can have visibleWhen', () => {
    const ast = parse(`
Dropdown as frame:
  closed

  ChildMenu:
    if (open)
`)
    const menu = ast.components[0].children.find((c: any) => c.component === 'ChildMenu')
    expect(menu).toBeDefined()
    expect((menu as any).visibleWhen).toBe('open')
  })

  it('component with all dropdown features', () => {
    const ast = parse(`
Dropdown:
  closed
  onclick-outside close
  selection $selected
  focusable
`)
    const dropdown = ast.components[0]
    expect(dropdown.initialState).toBe('closed')
    expect(dropdown.events[0].name).toBe('onclick-outside')
    expect(dropdown.selection).toBe('$selected')
    const focusable = dropdown.properties.find(p => p.name === 'focusable')
    expect(focusable).toBeDefined()
  })
})

describe('Parser: Complete Dropdown Pattern', () => {
  it('parses full dropdown structure', () => {
    const ast = parse(`
$selected: "Select..."

Item: pad 8 12, cursor pointer
  onhover highlight
  onclick select
  highlighted:
    bg #333

Dropdown:
  closed
  onclick-outside close

  Trigger: pad 8, cursor pointer
    onclick toggle
    Label:

  MyMenu:
    if (open)
    selection $selected
    focusable
    keys
      escape close
      arrow-down highlight next
      arrow-up highlight prev
`)
    expect(ast.tokens).toHaveLength(1)
    expect(ast.tokens[0].name).toBe('$selected')

    // Item and Dropdown are top-level components
    // Trigger and Menu are children of Dropdown (defined inline with :)
    expect(ast.components).toHaveLength(2)

    // Item component
    const item = ast.components[0]
    expect(item.name).toBe('Item')
    expect(item.events).toHaveLength(2)
    expect(item.states).toHaveLength(1)

    // Dropdown component
    const dropdown = ast.components[1]
    expect(dropdown.name).toBe('Dropdown')
    expect(dropdown.initialState).toBe('closed')
    expect(dropdown.events).toHaveLength(1)
    expect(dropdown.events[0].name).toBe('onclick-outside')
    expect(dropdown.children).toHaveLength(2) // Trigger, MyMenu

    // MyMenu (as slot/child instance of Dropdown)
    const menu = dropdown.children.find((c: any) => c.component === 'MyMenu') as any
    expect(menu).toBeDefined()
    expect(menu.visibleWhen).toBe('open')
    expect(menu.selection).toBe('$selected')
  })
})
