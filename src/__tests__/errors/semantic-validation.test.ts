/**
 * Error Tests: Semantic Validation
 *
 * Tests for semantic errors and validation.
 */

import { describe, it, expect } from 'vitest'
import { parseOnly, compile, compileAndExecute } from '../../test-utils'

describe('Semantic Validation', () => {
  it('validates component definition syntax', () => {
    const ast = parseOnly(`
ValidComponent as frame:
  pad 16
`)
    expect(ast.errors.length).toBe(0)
  })

  it('handles empty component body', () => {
    const { root } = compileAndExecute(`
Empty as frame:

Empty
`)
    expect(root).toBeDefined()
    expect(root.tagName.toLowerCase()).toBe('div')
  })

  it('handles duplicate property definitions', () => {
    // Documents current behavior - last value wins
    const { root } = compileAndExecute(`
Box as frame:
  pad 8
  pad 16

Box
`)
    // Should use last defined value
    expect(root.style.padding).toBe('16px')
  })
})

describe('Action Target Validation', () => {
  it('handles action without target', () => {
    // onclick toggle without target toggles self
    const { root } = compileAndExecute(`
Toggle as frame:
  closed
  onclick toggle

Toggle
`)
    expect(root.dataset.state).toBe('closed')
    root.click()
    expect(root.dataset.state).toBe('open')
  })

  it('generates code for action with target', () => {
    const { jsCode } = compileAndExecute(`
Button as button:
  onclick show Modal

Modal as frame:
  hidden

Button "Click"
Modal
`)
    expect(jsCode).toContain('show')
    expect(jsCode).toContain('Modal')
  })
})

describe('State Validation', () => {
  it('accepts valid state names', () => {
    const { root } = compileAndExecute(`
Panel as frame:
  closed

Panel
`)
    expect(root.dataset.state).toBe('closed')
  })

  it('handles state transitions', () => {
    const { root } = compileAndExecute(`
Accordion as frame:
  collapsed
  onclick toggle

Accordion
`)
    expect(root.dataset.state).toBe('collapsed')
    root.click()
    expect(root.dataset.state).toBe('expanded')
  })
})
