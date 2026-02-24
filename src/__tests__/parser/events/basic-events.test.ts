/**
 * Parser Tests: Basic Events
 *
 * Tests for basic event handlers:
 * - onclick
 * - onhover
 * - onchange
 * - oninput
 * - onfocus
 * - onblur
 * - onload
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getHandler, getAction } from '../../test-utils'

describe('onclick Event', () => {
  it('parses onclick with action', () => {
    const node = parseOne('Button onclick toggle "Click"')
    const handler = getHandler(node, 'onclick')
    expect(handler).toBeDefined()
    expect(handler?.event).toBe('onclick')
  })

  it('parses onclick with show action', () => {
    const node = parseOne('Button onclick show Panel')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('show')
  })

  it('parses onclick with hide action', () => {
    const node = parseOne('Button onclick hide Modal')
    const action = getAction(node, 'onclick')
    expect(action?.type).toBe('hide')
  })
})

describe('onhover Event', () => {
  it('parses onhover', () => {
    const node = parseOne('Box onhover show Tooltip')
    const handler = getHandler(node, 'onhover')
    expect(handler).toBeDefined()
  })

  it('parses onhover with highlight', () => {
    const node = parseOne('Item onhover highlight self')
    const action = getAction(node, 'onhover')
    expect(action?.type).toBe('highlight')
  })
})

describe('onchange Event', () => {
  it('parses onchange', () => {
    const node = parseOne('Input onchange call validate')
    const handler = getHandler(node, 'onchange')
    expect(handler).toBeDefined()
    expect(handler?.event).toBe('onchange')
  })

  it('parses onchange with assign', () => {
    const node = parseOne('Input onchange assign $value to $event.value')
    const action = getAction(node, 'onchange')
    expect(action?.type).toBe('assign')
  })
})

describe('oninput Event', () => {
  it('parses oninput', () => {
    const node = parseOne('Input oninput filter Results')
    const handler = getHandler(node, 'oninput')
    expect(handler).toBeDefined()
    expect(handler?.event).toBe('oninput')
  })

  it('parses oninput with call', () => {
    const node = parseOne('Input oninput call handleInput')
    const action = getAction(node, 'oninput')
    expect(action?.type).toBe('call')
  })
})

describe('onfocus Event', () => {
  it('parses onfocus', () => {
    const node = parseOne('Input onfocus show HelpText')
    const handler = getHandler(node, 'onfocus')
    expect(handler).toBeDefined()
    expect(handler?.event).toBe('onfocus')
  })

  it('parses onfocus with highlight', () => {
    const node = parseOne('Input onfocus highlight self')
    const action = getAction(node, 'onfocus')
    expect(action?.type).toBe('highlight')
  })
})

describe('onblur Event', () => {
  it('parses onblur', () => {
    const node = parseOne('Input onblur validate self')
    const handler = getHandler(node, 'onblur')
    expect(handler).toBeDefined()
    expect(handler?.event).toBe('onblur')
  })

  // Dropdown requires 'as' syntax
  it('parses onblur with hide', () => {
    const node = parseOne('Box onblur hide self')
    const action = getAction(node, 'onblur')
    expect(action?.type).toBe('hide')
  })
})

describe('onload Event', () => {
  it('parses onload', () => {
    const node = parseOne('Panel onload focus FirstInput')
    const handler = getHandler(node, 'onload')
    expect(handler).toBeDefined()
    expect(handler?.event).toBe('onload')
  })

  it('parses onload with call', () => {
    const node = parseOne('App onload call initialize')
    const action = getAction(node, 'onload')
    expect(action?.type).toBe('call')
  })
})

describe('Multiple Events on Same Component', () => {
  it('parses onclick and onhover', () => {
    const node = parseOne('Button onclick toggle, onhover show Tooltip')
    expect(getHandler(node, 'onclick')).toBeDefined()
    expect(getHandler(node, 'onhover')).toBeDefined()
  })

  it('parses onfocus and onblur', () => {
    const node = parseOne('Input onfocus highlight self, onblur hide HelpText')
    expect(getHandler(node, 'onfocus')).toBeDefined()
    expect(getHandler(node, 'onblur')).toBeDefined()
  })
})

describe('Events with Properties', () => {
  it('event with component properties', () => {
    const node = parseOne('Button bg #3B82F6, pad 12, onclick toggle "Click"')
    expect(node.properties.bg).toBe('#3B82F6')
    expect(node.properties.pad).toBe(12)
    expect(getHandler(node, 'onclick')).toBeDefined()
  })

  it('event at end of property list', () => {
    const node = parseOne('Input pad 8, bor 1, onfocus show HelpText')
    expect(node.properties.pad).toBe(8)
    expect(node.properties.bor).toBe(1)
    expect(getHandler(node, 'onfocus')).toBeDefined()
  })
})
