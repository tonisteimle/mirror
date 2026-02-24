/**
 * Parser Tests: Behavior States
 *
 * Tests for behavior states activated by actions:
 * - highlighted
 * - selected
 * - active / inactive
 * - expanded / collapsed
 * - valid / invalid
 * - default
 * - on / off
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getState } from '../../test-utils'

describe('Highlighted State', () => {
  it('parses state highlighted', () => {
    const node = parseOne(`Item
  state highlighted
    bg #333`)
    const state = getState(node, 'highlighted')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#333')
  })

  it('highlighted with multiple properties', () => {
    const node = parseOne(`Item
  state highlighted
    bg #3B82F6
    col #FFF`)
    const state = getState(node, 'highlighted')
    expect(state?.properties.bg).toBe('#3B82F6')
    expect(state?.properties.col).toBe('#FFF')
  })
})

describe('Selected State', () => {
  it('parses state selected', () => {
    const node = parseOne(`Tab
  state selected
    bg #3B82F6
    col #FFF`)
    const state = getState(node, 'selected')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#3B82F6')
  })
})

describe('Active/Inactive States', () => {
  it('parses state active', () => {
    const node = parseOne(`Button
  state active
    bg #2563EB`)
    const state = getState(node, 'active')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#2563EB')
  })

  it('parses state inactive', () => {
    const node = parseOne(`Tab
  state inactive
    o 0.5`)
    const state = getState(node, 'inactive')
    expect(state).toBeDefined()
    expect(state?.properties.o).toBe(0.5)
  })
})

describe('Expanded/Collapsed States', () => {
  it('parses state expanded', () => {
    const node = parseOne(`Accordion
  state expanded
    Icon "chevron-down"`)
    const state = getState(node, 'expanded')
    expect(state).toBeDefined()
  })

  it('parses state collapsed', () => {
    const node = parseOne(`Accordion
  state collapsed
    Icon "chevron-right"`)
    const state = getState(node, 'collapsed')
    expect(state).toBeDefined()
  })
})

describe('Valid/Invalid States', () => {
  it('parses state valid', () => {
    const node = parseOne(`Input
  state valid
    boc #22C55E`)
    const state = getState(node, 'valid')
    expect(state).toBeDefined()
    expect(state?.properties.boc).toBe('#22C55E')
  })

  it('parses state invalid', () => {
    const node = parseOne(`Input
  state invalid
    boc #EF4444`)
    const state = getState(node, 'invalid')
    expect(state).toBeDefined()
    expect(state?.properties.boc).toBe('#EF4444')
  })
})

describe('On/Off States', () => {
  it('parses state on', () => {
    const node = parseOne(`Toggle
  state on
    bg #3B82F6`)
    const state = getState(node, 'on')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#3B82F6')
  })

  it('parses state off', () => {
    const node = parseOne(`Toggle
  state off
    bg #333`)
    const state = getState(node, 'off')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#333')
  })
})

describe('Default State', () => {
  it('parses state default', () => {
    const node = parseOne(`Button
  state default
    bg #3B82F6`)
    const state = getState(node, 'default')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#3B82F6')
  })
})

describe('Multiple Behavior States', () => {
  it('parses multiple states on same component', () => {
    const node = parseOne(`Item
  state highlighted
    bg #333
  state selected
    bg #3B82F6`)
    expect(getState(node, 'highlighted')).toBeDefined()
    expect(getState(node, 'selected')).toBeDefined()
  })
})
