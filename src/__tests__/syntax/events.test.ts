/**
 * V1 Syntax Tests: Events
 *
 * Tests for event handlers (onclick, onhover, etc.)
 * V1 syntax: onclick action (no colon after event)
 * Events stored as: eventHandlers: [{ event, actions }]
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getHandler, getAction } from '../test-utils'

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
