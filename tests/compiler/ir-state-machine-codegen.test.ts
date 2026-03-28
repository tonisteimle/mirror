/**
 * Tests for state machine code generation
 *
 * Verifies that state machines are correctly generated in the output code.
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../src'

describe('State Machine Code Generation', () => {
  it('generates state machine config for state with trigger', () => {
    const code = `
Tab
  selected onclick:
    bg #fff
`
    const output = compile(code)

    // Should contain state machine configuration
    expect(output).toContain('_stateMachine')
    expect(output).toContain("initial: 'selected'")
    expect(output).toContain("current: 'selected'")
    expect(output).toContain("'selected': {")
    expect(output).toContain("'background': '#fff'")
  })

  it('generates event listener for onclick trigger', () => {
    const code = `
Tab
  selected onclick:
    bg #fff
`
    const output = compile(code)

    // Should have click event listener
    expect(output).toContain("addEventListener('click'")
    expect(output).toContain('_runtime.transitionTo')
  })

  it('generates exclusive transition for exclusive modifier', () => {
    const code = `
Tab
  selected exclusive onclick:
    bg #fff
`
    const output = compile(code)

    expect(output).toContain("modifier: 'exclusive'")
    expect(output).toContain('_runtime.exclusiveTransition')
  })

  it('generates toggle logic for toggle modifier', () => {
    const code = `
Dropdown
  open toggle onclick:
    visible
`
    const output = compile(code)

    expect(output).toContain("modifier: 'toggle'")
    // Toggle checks current state and toggles
    expect(output).toContain("current === 'open'")
    expect(output).toContain('sm.initial')
  })

  it('generates keyboard event listener with key check', () => {
    const code = `
Modal
  closed onkeydown escape:
    hidden
`
    const output = compile(code)

    expect(output).toContain("addEventListener('keydown'")
    expect(output).toContain("e.key.toLowerCase() !== 'escape'")
    expect(output).toContain("key: 'escape'")
  })

  it('generates multiple transitions for multiple triggered states', () => {
    const code = `
Dropdown
  closed:
    hidden
  open onclick:
    visible
  closed onkeydown escape:
    hidden
`
    const output = compile(code)

    // Should have both states in state machine
    expect(output).toContain("'closed': {")
    expect(output).toContain("'open': {")

    // Should have both event listeners
    expect(output).toContain("addEventListener('click'")
    expect(output).toContain("addEventListener('keydown'")
  })

  it('sets initial state from first state defined', () => {
    const code = `
Modal
  closed:
    hidden
  open onclick:
    visible
`
    const output = compile(code)

    // Initial should be 'closed' (first defined)
    expect(output).toContain("initial: 'closed'")
    expect(output).toContain("dataset.state = 'closed'")
  })

  it('generates watchStates for when dependency', () => {
    const code = `
Backdrop
  visible when Menu open:
    opacity 0.5
`
    const output = compile(code)

    // Should have watchStates call
    expect(output).toContain('_runtime.watchStates')
    expect(output).toContain("'visible'")
    expect(output).toContain("target: 'Menu'")
    expect(output).toContain("state: 'open'")
  })

  it('generates watchStates with or condition', () => {
    const code = `
Backdrop
  visible when Menu open or Sidebar open:
    opacity 0.5
`
    const output = compile(code)

    expect(output).toContain('_runtime.watchStates')
    expect(output).toContain("'or'")
    expect(output).toContain("target: 'Menu'")
    expect(output).toContain("target: 'Sidebar'")
  })

  it('generates watchStates with and condition', () => {
    const code = `
SubmitButton
  enabled when Form valid and User loggedIn:
    opacity 1
`
    const output = compile(code)

    expect(output).toContain('_runtime.watchStates')
    expect(output).toContain("'and'")
    expect(output).toContain("target: 'Form'")
    expect(output).toContain("state: 'valid'")
    expect(output).toContain("target: 'User'")
    expect(output).toContain("state: 'loggedIn'")
  })

  it('generates transitionTo for multi-element triggers', () => {
    const code = `
MenuButton
  onclick:
    Menu open
    Backdrop visible
`
    const output = compile(code)

    // Should generate transitionTo calls for each element
    expect(output).toContain("_runtime.transitionTo(_elements['Menu'], 'open')")
    expect(output).toContain("_runtime.transitionTo(_elements['Backdrop'], 'visible')")
  })
})

// ============================================================
// EDGE CASES & KOMBINATIONEN (gemäß Teststrategie)
// ============================================================

describe('State Machine: Edge Cases', () => {
  it('handles state without trigger (passive state)', () => {
    const code = `
Card
  highlighted:
    bg #333
`
    const output = compile(code)
    // State should exist but no automatic listener
    expect(output).toContain("'highlighted': {")
    expect(output).toContain("'background': '#333'")
  })

  it('handles empty state block', () => {
    const code = `
Button
  loading:
`
    // Should not throw
    expect(() => compile(code)).not.toThrow()
  })

  it('handles state with only trigger, no styles', () => {
    const code = `
Tab
  selected onclick:
`
    const output = compile(code)
    expect(output).toContain("addEventListener('click'")
    expect(output).toContain("'selected': {")
  })

  it('handles when dependency to non-existent element (graceful)', () => {
    const code = `
Backdrop
  visible when NonExistent open:
    opacity 0.5
`
    // Should compile without error
    expect(() => compile(code)).not.toThrow()
  })
})

describe('State Machine: Kombinationen', () => {
  it('combines initial + trigger', () => {
    const code = `
Dropdown
  open initial onclick:
    visible
`
    const output = compile(code)
    expect(output).toContain("initial: 'open'")
    expect(output).toContain("addEventListener('click'")
  })

  it('combines when + multiple conditions (3+)', () => {
    const code = `
Overlay
  visible when A open or B open or C open:
    opacity 0.5
`
    const output = compile(code)
    expect(output).toContain("target: 'A'")
    expect(output).toContain("target: 'B'")
    expect(output).toContain("target: 'C'")
  })

  it('multi-element trigger with 4+ targets', () => {
    const code = `
OpenAll
  onclick:
    Dialog open
    Backdrop visible
    Menu expanded
    Sidebar open
`
    const output = compile(code)
    expect(output).toContain("_elements['Dialog']")
    expect(output).toContain("_elements['Backdrop']")
    expect(output).toContain("_elements['Menu']")
    expect(output).toContain("_elements['Sidebar']")
  })
})

describe('State Machine: Reihenfolge', () => {
  it('multiple events on same element', () => {
    const code = `
Dropdown
  onclick:
    Menu open
  onkeydown escape:
    Menu closed
`
    const output = compile(code)
    expect(output).toContain("addEventListener('click'")
    expect(output).toContain("addEventListener('keydown'")
  })

  it('state defined after trigger still works', () => {
    const code = `
Card
  selected onclick:
    bg blue
  highlighted:
    bg yellow
`
    const output = compile(code)
    expect(output).toContain("'selected': {")
    expect(output).toContain("'highlighted': {")
  })
})

describe('State Machine: Provokation (Bug-Suche)', () => {
  it('deeply nested state triggers', () => {
    const code = `
Container
  Row
    Card
      selected onclick:
        bg #3B82F6
`
    // Should not throw, event should be on Card
    expect(() => compile(code)).not.toThrow()
  })

  it('state name same as action name (open)', () => {
    const code = `
Panel
  open onclick:
    visible
`
    const output = compile(code)
    // 'open' is both state name and action - should use as state
    expect(output).toContain("'open': {")
    expect(output).toContain("transitionTo")
  })
})
