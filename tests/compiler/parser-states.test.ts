/**
 * Parser State Tests
 *
 * Tests parsing of component states: hover:, focus:, custom states
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

// ============================================================================
// SYSTEM STATES
// ============================================================================

describe('Parser: System States', () => {
  it('parses hover state', () => {
    const ast = parse(`Button as button:
  hover:
    bg primary`)
    expect(ast.components[0].states.length).toBe(1)
    expect(ast.components[0].states[0].name).toBe('hover')
  })

  it('parses focus state', () => {
    const ast = parse(`Input as input:
  focus:
    bor 1 primary`)
    expect(ast.components[0].states[0].name).toBe('focus')
  })

  it('parses active state', () => {
    const ast = parse(`Button as button:
  active:
    scale 0.98`)
    expect(ast.components[0].states[0].name).toBe('active')
  })

  it('parses disabled state', () => {
    const ast = parse(`Button as button:
  disabled:
    opacity 0.5`)
    expect(ast.components[0].states[0].name).toBe('disabled')
  })

  it('parses multiple system states', () => {
    const ast = parse(`Button as button:
  hover:
    bg light
  focus:
    bor 1 blue
  active:
    scale 0.98
  disabled:
    opacity 0.5`)
    expect(ast.components[0].states.length).toBe(4)
  })
})

// ============================================================================
// CUSTOM STATES
// ============================================================================

describe('Parser: Custom States', () => {
  it('parses highlighted state', () => {
    const ast = parse(`Item as frame:
  highlighted:
    bg surface`)
    expect(ast.components[0].states[0].name).toBe('highlighted')
  })

  it('parses selected state', () => {
    const ast = parse(`Item as frame:
  selected:
    bg primary`)
    expect(ast.components[0].states[0].name).toBe('selected')
  })

  it('parses expanded state', () => {
    const ast = parse(`Accordion as frame:
  expanded:
    height auto`)
    expect(ast.components[0].states[0].name).toBe('expanded')
  })

  it('parses collapsed state', () => {
    const ast = parse(`Accordion as frame:
  collapsed:
    height 0`)
    expect(ast.components[0].states[0].name).toBe('collapsed')
  })

  it('parses on/off states', () => {
    const ast = parse(`Toggle as frame:
  on:
    bg primary
  off:
    bg muted`)
    expect(ast.components[0].states.length).toBe(2)
    expect(ast.components[0].states[0].name).toBe('on')
    expect(ast.components[0].states[1].name).toBe('off')
  })

  it('parses filled state (for inputs)', () => {
    const ast = parse(`Input as input:
  filled:
    col text`)
    expect(ast.components[0].states[0].name).toBe('filled')
  })
})

// ============================================================================
// INLINE STATES
// ============================================================================

describe('Parser: Inline States', () => {
  it('parses inline state with single property', () => {
    const ast = parse(`Button as button:
  hover: bg primary`)
    expect(ast.components[0].states.length).toBe(1)
    expect(ast.components[0].states[0].name).toBe('hover')
    expect(ast.components[0].states[0].properties.length).toBeGreaterThan(0)
  })

  it('parses inline state with multiple properties', () => {
    const ast = parse(`Button as button:
  hover: bg primary, col white`)
    const state = ast.components[0].states[0]
    expect(state.properties.length).toBeGreaterThan(0)
  })

  it('parses multiple inline states', () => {
    const ast = parse(`Button as button:
  hover: bg light
  active: scale 0.98`)
    expect(ast.components[0].states.length).toBe(2)
  })
})

// ============================================================================
// STATE PROPERTIES
// ============================================================================

describe('Parser: State Properties', () => {
  it('state has properties', () => {
    const ast = parse(`Button as button:
  hover:
    bg primary
    col white
    scale 1.02`)
    const state = ast.components[0].states[0]
    expect(state.properties.length).toBeGreaterThan(0)
  })

  it('state property has correct name and value', () => {
    const ast = parse(`Button as button:
  hover:
    bg primary`)
    const state = ast.components[0].states[0]
    expect(state.properties[0].name).toBe('bg')
    expect(state.properties[0].values).toContain('primary')
  })
})

// ============================================================================
// STATE POSITION
// ============================================================================

describe('Parser: State Position', () => {
  it('state has correct line number', () => {
    const ast = parse(`Button as button:
  pad 8
  hover:
    bg light`)
    const state = ast.components[0].states[0]
    expect(state.line).toBe(3)
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('Parser: State Edge Cases', () => {
  it('state with no properties (empty block)', () => {
    const ast = parse(`Button as button:
  hover:`)
    // Should create state even if empty
    expect(ast.components[0].states.length).toBe(1)
  })

  it('state after properties in body', () => {
    const ast = parse(`Button as button:
  pad 8
  bg blue
  hover:
    bg light`)
    // Note: Inline properties (pad, bg) in body become states with same name
    // This is current parser behavior - body items with : are states
    // The actual properties are only from inline (after colon on definition line)
    expect(ast.components[0].states.length).toBeGreaterThan(0)
    expect(ast.components[0].states.some(s => s.name === 'hover')).toBe(true)
  })

  it('mixed states and events', () => {
    const ast = parse(`Button as button:
  hover:
    bg light
  onclick toggle()`)
    expect(ast.components[0].states.length).toBe(1)
    expect(ast.components[0].events.length).toBe(1)
  })

  it('custom state with hyphenated name', () => {
    const ast = parse(`Item as frame:
  not-selected:
    opacity 0.5`)
    expect(ast.components[0].states[0].name).toBe('not-selected')
  })
})

// ============================================================================
// STATE CHILD OVERRIDES
// ============================================================================

describe('Parser: State Child Overrides', () => {
  // Note: This tests the AST structure - actual child override parsing
  // may need additional implementation

  it('state has childOverrides array', () => {
    const ast = parse(`Button as button:
  hover:
    bg light`)
    expect(ast.components[0].states[0].childOverrides).toBeDefined()
    expect(Array.isArray(ast.components[0].states[0].childOverrides)).toBe(true)
  })
})
