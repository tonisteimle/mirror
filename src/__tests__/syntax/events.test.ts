/**
 * V1 Syntax Tests: Events
 *
 * Tests for event handlers (onclick, onhover, etc.)
 * V1 syntax: onclick action (no colon after event)
 * Events stored as: eventHandlers: [{ event, actions }]
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getHandler, getAction, getActions } from '../test-utils'

describe('Click Events', () => {
  it('parses onclick with toggle', () => {
    const node = parseOne('Button onclick toggle "Click"')
    const handler = getHandler(node, 'onclick')
    expect(handler).toBeDefined()
    expect(getAction(node, 'onclick', 0)?.type).toBe('toggle')
  })

  it('parses onclick with show', () => {
    const node = parseOne('Button onclick show Panel "Open"')
    const handler = getHandler(node, 'onclick')
    expect(handler).toBeDefined()
    expect(getAction(node, 'onclick', 0)?.type).toBe('show')
  })

  it('parses onclick with hide', () => {
    const node = parseOne('Button onclick hide Modal "Close"')
    const handler = getHandler(node, 'onclick')
    expect(handler).toBeDefined()
    expect(getAction(node, 'onclick', 0)?.type).toBe('hide')
  })
})

describe('Multiple Actions', () => {
  it('parses comma-separated actions', () => {
    const node = parseOne('Button onclick show Panel, hide Other "Action"')
    const handler = getHandler(node, 'onclick')
    expect(handler).toBeDefined()
    expect(handler?.actions.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Implicit Self', () => {
  it('defaults highlight to self', () => {
    const node = parseOne('Option onhover highlight')
    const action = getAction(node, 'onhover')
    expect(action?.type).toBe('highlight')
    expect(action?.target).toBe('self')
  })

  it('defaults select to self', () => {
    const node = parseOne('Option onclick select')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('select')
    expect(action?.target).toBe('self')
  })

  it('defaults close to self', () => {
    const node = parseOne('Menu onclick-outside close')
    const action = getAction(node, 'onclick-outside')
    expect(action?.type).toBe('close')
    expect(action?.target).toBe('self')
  })

  it('works with chained actions', () => {
    const node = parseOne('Option onclick select, close Menu')
    const actions = getActions(node, 'onclick')
    expect(actions[0]?.target).toBe('self')
    expect(actions[1]?.target).toBe('Menu')
  })

  it('explicit target overrides implicit self', () => {
    const node = parseOne('Button onclick highlight next')
    const action = getAction(node, 'onclick')
    expect(action?.target).toBe('next')
  })
})
