/**
 * Dropdown Features - Error Handling Tests
 *
 * Tests for error handling and validation of dropdown-related features
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'

describe('Parser: Invalid Initial State', () => {
  it('does not parse arbitrary words as initialState', () => {
    const ast = parse(`
Dropdown:
  invalid
  pad 8
`)
    // 'invalid' should be parsed as a property name, not initialState
    expect(ast.components[0].initialState).toBeUndefined()
    // It might be parsed as a boolean property or cause an error
  })

  it('only accepts valid initialState keywords', () => {
    const validStates = ['closed', 'open', 'collapsed', 'expanded']
    const invalidStates = ['hidden', 'visible', 'active', 'inactive', 'default']

    for (const state of validStates) {
      const ast = parse(`Comp:\n  ${state}`)
      expect(ast.components[0].initialState).toBe(state)
    }

    for (const state of invalidStates) {
      const ast = parse(`Comp:\n  ${state}`)
      expect(ast.components[0].initialState).toBeUndefined()
    }
  })
})

describe('Parser: Selection Binding Validation', () => {
  // Note: Using MyMenu instead of Menu because Menu is a Zag primitive
  it('parses selection with or without $ prefix', () => {
    const ast = parse(`
MyMenu:
  selection selected
`)
    // Parser currently accepts both with and without $
    // This documents actual behavior
    expect(ast.components[0].selection).toBeDefined()
  })

  it('parses selection with $ prefix correctly', () => {
    const ast = parse(`
MyMenu:
  selection $myVar
`)
    expect(ast.components[0].selection).toBe('$myVar')
  })

  it('handles selection with underscore variable names', () => {
    const ast = parse(`
MyMenu:
  selection $my_selected_item
`)
    expect(ast.components[0].selection).toBe('$my_selected_item')
  })
})

describe('Parser: VisibleWhen Validation', () => {
  // Note: Using MyMenu instead of Menu because Menu is a Zag primitive
  it('handles empty if condition gracefully', () => {
    // Empty condition - parser should handle this
    const ast = parse(`
MyMenu:
  if ()
  pad 8
`)
    // Should either set empty condition or not set visibleWhen
    expect(ast.errors.length === 0 || (ast.components[0] as any).visibleWhen !== undefined).toBe(true)
  })

  it('handles if without parentheses', () => {
    const ast = parse(`
MyMenu:
  if open
  pad 8
`)
    // Parser might accept this or report error
    expect(ast.components).toHaveLength(1)
  })

  it('handles unbalanced parentheses', () => {
    const ast = parse(`
MyMenu:
  if (open && (hasItems)
  pad 8
`)
    // Parser should handle unbalanced parens
    // Either reports error or captures what it can
    expect(ast.components).toHaveLength(1)
  })

  it('handles complex nested conditions', () => {
    const ast = parse(`
MyMenu:
  if ((a || (b && c)) && !d)
`)
    expect(ast.components).toHaveLength(1)
    expect((ast.components[0] as any).visibleWhen).toContain('a')
  })
})

describe('Parser: Multiple Declarations', () => {
  it('last initialState wins when multiple declared', () => {
    const ast = parse(`
Dropdown:
  closed
  open
`)
    // Second declaration should override first
    expect(ast.components[0].initialState).toBe('open')
  })

  it('handles both closed and expanded on same component', () => {
    const ast = parse(`
Panel:
  closed
  expanded
`)
    // Last one wins
    expect(ast.components[0].initialState).toBe('expanded')
  })

  it('handles multiple selection bindings', () => {
    const ast = parse(`
MyMenu:
  selection $first
  selection $second
`)
    // Last one should win
    expect(ast.components[0].selection).toBe('$second')
  })
})

describe('Parser: onclick-outside Validation', () => {
  it('parses onclick-outside without action', () => {
    const ast = parse(`
Dropdown:
  onclick-outside
`)
    // Should either have empty actions or not parse
    expect(ast.components).toHaveLength(1)
    // Event might be there but with no actions
  })

  it('parses multiple onclick-outside events', () => {
    const ast = parse(`
Dropdown:
  onclick-outside close
  onclick-outside deselect
`)
    expect(ast.components[0].events.length).toBeGreaterThanOrEqual(1)
    // Both events should be captured
  })
})

describe('Parser: Combined Feature Edge Cases', () => {
  it('handles all dropdown features with separate lines', () => {
    const ast = parse(`
Dropdown:
  closed
  pad 8
  bg #333
`)
    expect(ast.components[0].initialState).toBe('closed')
    expect(ast.components[0].properties.length).toBeGreaterThanOrEqual(2)
  })

  it('handles visibleWhen with initialState (potential conflict)', () => {
    const ast = parse(`
MyMenu:
  closed
  if (open)
`)
    // Both should be set - no conflict at parse level
    expect(ast.components[0].initialState).toBe('closed')
    expect((ast.components[0] as any).visibleWhen).toBe('open')
  })

  it('handles selection and visibleWhen together', () => {
    const ast = parse(`
MyMenu:
  if (open)
  selection $selected
  pad 8
`)
    expect((ast.components[0] as any).visibleWhen).toBe('open')
    expect(ast.components[0].selection).toBe('$selected')
    expect(ast.components[0].properties).toHaveLength(1)
  })
})
