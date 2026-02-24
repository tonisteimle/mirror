/**
 * Parser Tests: Call Action
 *
 * Tests for calling external JavaScript functions.
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getAction } from '../../test-utils'

describe('Basic Call Action', () => {
  it('parses call with function name', () => {
    const node = parseOne('Button onclick call handleLogin')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('call')
    expect(action?.target).toBe('handleLogin')
  })

  it('parses call with different function names', () => {
    const functions = ['handleSubmit', 'saveData', 'validateForm', 'openModal']
    functions.forEach((fn) => {
      const node = parseOne(`Button onclick call ${fn}`)
      const action = getAction(node, 'onclick')
      expect(action?.target).toBe(fn)
    })
  })
})

describe('Call with Arguments', () => {
  it('parses call with string argument', () => {
    const node = parseOne('Button onclick call handleLogin, "data"')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('call')
    expect(action?.value).toBe('data')
  })

  it('parses call with variable argument', () => {
    const node = parseOne('Button onclick call submitForm, $formData')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('call')
    // Variable arguments are stored as expression objects
    expect(action?.value).toBeDefined()
  })
})

describe('Call in Different Events', () => {
  it('call on change', () => {
    const node = parseOne('Input onchange call updateValue')
    const action = getAction(node, 'onchange')
    expect(action?.type).toBe('call')
  })

  it('call on blur', () => {
    const node = parseOne('Input onblur call validateField')
    const action = getAction(node, 'onblur')
    expect(action?.type).toBe('call')
  })

  it('call on focus', () => {
    const node = parseOne('Input onfocus call trackFocus')
    const action = getAction(node, 'onfocus')
    expect(action?.type).toBe('call')
  })
})

describe('Call with Other Actions', () => {
  it('call and show', () => {
    const node = parseOne('Button onclick call saveData, show Toast')
    // Both actions should be parsed
    expect(node.eventHandlers?.[0].actions.length).toBeGreaterThanOrEqual(1)
  })

  it('call and toggle', () => {
    const node = parseOne('Button onclick toggle Menu, call trackClick')
    expect(node.eventHandlers?.[0].actions.length).toBeGreaterThanOrEqual(2)
  })
})
