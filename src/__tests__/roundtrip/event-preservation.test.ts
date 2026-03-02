/**
 * Roundtrip Tests: Event Preservation
 *
 * Tests that event handlers are preserved through the pipeline.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

/** Parse and get event handlers */
function getHandlers(code: string) {
  const result = parse(code)
  if (result.errors.length > 0) {
    throw new Error(`Parse errors: ${result.errors.join(', ')}`)
  }
  return result.nodes[0]?.eventHandlers || []
}

describe('Basic Event Preservation', () => {
  it('onclick preserves action type', () => {
    const handlers = getHandlers('Button onclick toggle')
    const handler = handlers.find((h) => h.event === 'onclick')
    expect(handler).toBeDefined()
    expect(handler?.actions[0]).toMatchObject({ type: 'toggle' })
  })

  it('onclick preserves action target', () => {
    const handlers = getHandlers('Button onclick show Panel')
    const handler = handlers.find((h) => h.event === 'onclick')
    const action = handler?.actions[0]
    expect(action?.type).toBe('show')
    expect(action?.target).toBe('Panel')
  })
})

describe('Multiple Actions Preservation', () => {
  it('comma-separated actions preserve', () => {
    const handlers = getHandlers('Button onclick show Panel, hide Other')
    const handler = handlers.find((h) => h.event === 'onclick')
    expect(handler?.actions.length).toBeGreaterThanOrEqual(2)

    const types = handler?.actions.map((a) => a.type)
    expect(types).toContain('show')
    expect(types).toContain('hide')
  })

  it('three actions preserve', () => {
    const handlers = getHandlers('Button onclick toggle, show Panel, hide Other')
    const handler = handlers.find((h) => h.event === 'onclick')
    expect(handler?.actions.length).toBeGreaterThanOrEqual(3)
  })
})

describe('Different Event Types', () => {
  it('onhover preserves', () => {
    const handlers = getHandlers('Box onhover show Tooltip')
    expect(handlers.find((h) => h.event === 'onhover')).toBeDefined()
  })

  it('onchange preserves', () => {
    const handlers = getHandlers('Input onchange call validate')
    expect(handlers.find((h) => h.event === 'onchange')).toBeDefined()
  })

  it('oninput preserves', () => {
    const handlers = getHandlers('Input oninput filter Results')
    expect(handlers.find((h) => h.event === 'oninput')).toBeDefined()
  })

  it('onfocus preserves', () => {
    const handlers = getHandlers('Input onfocus highlight self')
    expect(handlers.find((h) => h.event === 'onfocus')).toBeDefined()
  })

  it('onblur preserves', () => {
    const handlers = getHandlers('Input onblur hide HelpText')
    expect(handlers.find((h) => h.event === 'onblur')).toBeDefined()
  })
})

describe('Keyboard Events Preservation', () => {
  it('multiple keyboard events preserve', () => {
    const result = parse(`Dropdown
  onkeydown escape: close
  onkeydown arrow-down: highlight next`)
    const handlers = result.nodes[0].eventHandlers?.filter(
      (h) => h.event === 'onkeydown'
    )
    expect(handlers?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('Action Targets Preservation', () => {
  it('self target preserves', () => {
    const handlers = getHandlers('Box onclick toggle self')
    const action = handlers[0]?.actions[0]
    expect(action?.target).toBe('self')
  })

  it('next target preserves', () => {
    const handlers = getHandlers('Box onkeydown arrow-down: highlight next')
    const action = handlers[0]?.actions[0]
    expect(action?.target).toBe('next')
  })

  it('prev target preserves', () => {
    const handlers = getHandlers('Box onkeydown arrow-up: highlight prev')
    const action = handlers[0]?.actions[0]
    expect(action?.target).toBe('prev')
  })

  it('named target preserves', () => {
    const handlers = getHandlers('Button onclick show SaveDialog')
    const action = handlers[0]?.actions[0]
    expect(action?.target).toBe('SaveDialog')
  })
})

describe('Events in Component Definition', () => {
  it('events in definition preserve', () => {
    const result = parse(`Button: pad 12, onclick toggle

Button "Click"`)

    // Definition should have event handler
    const template = result.registry.get('Button')
    expect(template?.eventHandlers?.length).toBeGreaterThan(0)
  })

  it('inherited events preserve', () => {
    const result = parse(`Button: pad 12, onclick toggle

PrimaryBtn as Button: bg #3B82F6

PrimaryBtn "Click"`)

    // PrimaryBtn should inherit onclick from Button
    const template = result.registry.get('PrimaryBtn')
    expect(template?.eventHandlers?.length).toBeGreaterThan(0)
  })
})
