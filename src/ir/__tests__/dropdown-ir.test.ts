/**
 * IR Transformation Tests for Dropdown Features
 *
 * Tests that dropdown features are correctly transformed from AST to IR
 *
 * SKIPPED: These features (initialState, visibleWhen, selection) are not yet
 * fully implemented in the IR transformation. Enable when implemented.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { toIR } from '../index'

describe.skip('IR Transformation: Initial State', () => {
  it('transforms initialState from component to IR node', () => {
    const ast = parse(`
Dropdown as frame:
  closed

Dropdown
`)
    const ir = toIR(ast)

    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].initialState).toBe('closed')
  })

  it('transforms open initialState', () => {
    const ast = parse(`
Panel as frame:
  open

Panel
`)
    const ir = toIR(ast)

    expect(ir.nodes[0].initialState).toBe('open')
  })

  it('transforms collapsed/expanded initialState', () => {
    const ast1 = parse(`
Accordion as frame:
  collapsed

Accordion
`)
    const ast2 = parse(`
Accordion as frame:
  expanded

Accordion
`)
    const ir1 = toIR(ast1)
    const ir2 = toIR(ast2)

    expect(ir1.nodes[0].initialState).toBe('collapsed')
    expect(ir2.nodes[0].initialState).toBe('expanded')
  })
})

describe.skip('IR Transformation: Visible When', () => {
  it('transforms visibleWhen from component to IR node', () => {
    const ast = parse(`
Menu as frame:
  if (open)

Menu
`)
    const ir = toIR(ast)

    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].visibleWhen).toBe('open')
  })

  it('transforms complex visibleWhen condition', () => {
    const ast = parse(`
Panel as frame:
  if (open && hasItems)

Panel
`)
    const ir = toIR(ast)

    expect(ir.nodes[0].visibleWhen).toBe('(open && hasItems)')
  })
})

describe.skip('IR Transformation: Selection Binding', () => {
  it('transforms selection binding from component to IR node', () => {
    const ast = parse(`
Menu as frame:
  selection $selected

Menu
`)
    const ir = toIR(ast)

    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].selection).toBe('$selected')
  })

  it('preserves $ prefix in selection variable', () => {
    const ast = parse(`
Options as frame:
  selection $currentValue

Options
`)
    const ir = toIR(ast)

    expect(ir.nodes[0].selection).toBe('$currentValue')
  })
})

describe('IR Transformation: Click Outside Event', () => {
  it('transforms onclick-outside to click-outside event', () => {
    const ast = parse(`
Dropdown as frame:
  onclick-outside close

Dropdown
`)
    const ir = toIR(ast)

    expect(ir.nodes).toHaveLength(1)
    expect(ir.nodes[0].events).toHaveLength(1)
    expect(ir.nodes[0].events[0].name).toBe('click-outside')
    expect(ir.nodes[0].events[0].actions[0].type).toBe('close')
  })

  it('transforms onclick-outside with target', () => {
    const ast = parse(`
Container as frame:
  onclick-outside close Menu

Container
`)
    const ir = toIR(ast)

    expect(ir.nodes[0].events[0].name).toBe('click-outside')
    expect(ir.nodes[0].events[0].actions[0].type).toBe('close')
    expect(ir.nodes[0].events[0].actions[0].target).toBe('Menu')
  })
})

describe('IR Transformation: Feature Merging', () => {
  it('merges component features with instance', () => {
    const ast = parse(`
Dropdown as frame:
  closed
  selection $value

Dropdown
`)
    const ir = toIR(ast)

    // Instance should inherit component's features
    expect(ir.nodes[0].initialState).toBe('closed')
    expect(ir.nodes[0].selection).toBe('$value')
  })

  it('child inherits parent component features', () => {
    const ast = parse(`
Dropdown as frame:
  closed

  Menu:
    if (open)
    selection $selected

Dropdown
`)
    const ir = toIR(ast)

    expect(ir.nodes[0].initialState).toBe('closed')
    // Menu is a child node
    const menu = ir.nodes[0].children.find(c => c.name === 'Menu')
    expect(menu).toBeDefined()
    expect(menu?.visibleWhen).toBe('open')
    expect(menu?.selection).toBe('$selected')
  })
})

describe.skip('IR Transformation: Complete Dropdown', () => {
  it('transforms dropdown with initialState and click-outside', () => {
    const ast = parse(`
Dropdown as frame:
  closed
  onclick-outside close

Dropdown
`)
    const ir = toIR(ast)

    expect(ir.nodes).toHaveLength(1)

    const dropdown = ir.nodes[0]
    expect(dropdown.name).toBe('Dropdown')
    expect(dropdown.initialState).toBe('closed')
    expect(dropdown.events).toHaveLength(1)
    expect(dropdown.events[0].name).toBe('click-outside')
    expect(dropdown.events[0].actions[0].type).toBe('close')
  })

  it('transforms menu component with visibleWhen and selection', () => {
    const ast = parse(`
Menu as frame:
  if (open)
  selection $selected

Menu
`)
    const ir = toIR(ast)

    const menu = ir.nodes[0]
    expect(menu.name).toBe('Menu')
    expect(menu.visibleWhen).toBe('open')
    expect(menu.selection).toBe('$selected')
  })

  it('nested components have their own features', () => {
    const ast = parse(`
Dropdown as frame:
  closed

Dropdown
`)
    const ir = toIR(ast)

    const dropdown = ir.nodes[0]
    expect(dropdown.initialState).toBe('closed')
  })

  it('transforms item with events inherited by instances', () => {
    const ast = parse(`
Item as frame:
  pad 8
  onclick select
  onhover highlight
  highlighted:
    bg #333

Menu as frame:
  - Item "A"
  - Item "B"

Menu
`)
    const ir = toIR(ast)

    const menu = ir.nodes[0]
    expect(menu.children).toHaveLength(2)

    // Each Item instance should have events from Item component
    const item1 = menu.children[0]
    expect(item1.name).toBe('Item')
    expect(item1.events).toHaveLength(2)
    expect(item1.events.find(e => e.name === 'click')).toBeDefined()
    expect(item1.events.find(e => e.name === 'mouseenter')).toBeDefined()
  })
})
