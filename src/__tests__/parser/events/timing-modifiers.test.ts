/**
 * Parser Tests: Timing Modifiers
 *
 * Tests for event timing modifiers:
 * - debounce N
 * - delay N
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getHandler } from '../../test-utils'

describe('Debounce Modifier', () => {
  it('parses debounce with oninput', () => {
    const node = parseOne('Input oninput debounce 300: filter Results')
    const handler = getHandler(node, 'oninput')
    expect(handler).toBeDefined()
    expect(handler?.debounce).toBe(300)
  })

  it('parses different debounce values', () => {
    const values = [100, 200, 300, 500, 1000]
    values.forEach((ms) => {
      const node = parseOne(`Input oninput debounce ${ms}: filter Results`)
      const handler = getHandler(node, 'oninput')
      expect(handler?.debounce).toBe(ms)
    })
  })

  it('debounce with onchange', () => {
    const node = parseOne('Input onchange debounce 500: call validate')
    const handler = getHandler(node, 'onchange')
    expect(handler?.debounce).toBe(500)
  })
})

describe('Delay Modifier', () => {
  it('parses delay with onblur', () => {
    const node = parseOne('Input onblur delay 200: hide Panel')
    const handler = getHandler(node, 'onblur')
    expect(handler).toBeDefined()
    expect(handler?.delay).toBe(200)
  })

  it('parses different delay values', () => {
    const values = [50, 100, 150, 200, 500]
    values.forEach((ms) => {
      const node = parseOne(`Input onblur delay ${ms}: hide Panel`)
      const handler = getHandler(node, 'onblur')
      expect(handler?.delay).toBe(ms)
    })
  })

  it('delay with onclick', () => {
    const node = parseOne('Button onclick delay 100: show Panel')
    const handler = getHandler(node, 'onclick')
    expect(handler?.delay).toBe(100)
  })
})

describe('Timing with Different Events', () => {
  it('debounce with oninput for search', () => {
    const node = parseOne('Input oninput debounce 300: filter SearchResults')
    const handler = getHandler(node, 'oninput')
    expect(handler?.debounce).toBe(300)
    expect(handler?.actions.length).toBeGreaterThan(0)
  })

  it('delay with onhover for tooltip', () => {
    const node = parseOne('Box onhover delay 500: show Tooltip')
    const handler = getHandler(node, 'onhover')
    expect(handler?.delay).toBe(500)
  })

  it('delay with onfocus', () => {
    const node = parseOne('Input onfocus delay 100: show HelpText')
    const handler = getHandler(node, 'onfocus')
    expect(handler?.delay).toBe(100)
  })
})

describe('Timing with Actions', () => {
  it('debounced filter action', () => {
    const node = parseOne('Input oninput debounce 300: filter List')
    const handler = getHandler(node, 'oninput')
    expect(handler?.debounce).toBe(300)
    const action = handler?.actions[0]
    expect(action).toBeDefined()
  })

  it('delayed hide action', () => {
    const node = parseOne('Panel onblur delay 150: hide self')
    const handler = getHandler(node, 'onblur')
    expect(handler?.delay).toBe(150)
  })

  it('delayed toggle action', () => {
    const node = parseOne('Button onclick delay 50: toggle Menu')
    const handler = getHandler(node, 'onclick')
    expect(handler?.delay).toBe(50)
  })
})

describe('Edge Cases', () => {
  it('zero delay', () => {
    const node = parseOne('Button onclick delay 0: show Panel')
    const handler = getHandler(node, 'onclick')
    expect(handler?.delay).toBe(0)
  })

  it('large debounce value', () => {
    const node = parseOne('Input oninput debounce 5000: call save')
    const handler = getHandler(node, 'oninput')
    expect(handler?.debounce).toBe(5000)
  })
})
