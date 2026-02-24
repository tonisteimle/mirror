/**
 * V1 Syntax Tests: States
 *
 * Tests for state definitions (hover, focus, custom states).
 * V1 uses indented blocks, not curly braces.
 * States are stored as array: states: [{ name, properties }]
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getState } from '../test-utils'

describe('Hover State', () => {
  it('parses hover with indented properties', () => {
    const btn = parseOne(`Button bg #333
  hover
    bg #555`)
    expect(btn.states).toBeDefined()
    expect(getState(btn, 'hover')).toBeDefined()
  })

  it('hover changes background', () => {
    const node = parseOne(`Box bg #333
  hover
    bg #555`)
    const hoverState = getState(node, 'hover')
    expect(hoverState?.properties.bg).toBe('#555')
  })
})

describe('Focus State', () => {
  it('parses focus state', () => {
    // Using separate bor and boc properties (inline border syntax not working)
    const node = parseOne(`Input bor 1, boc #333
  focus
    bor 2
    boc #3B82F6`)
    expect(getState(node, 'focus')).toBeDefined()
  })
})

describe('Custom States', () => {
  it('parses active state', () => {
    const node = parseOne(`Tab bg #333
  state active
    bg #3B82F6`)
    expect(getState(node, 'active')).toBeDefined()
  })

  it('parses selected state', () => {
    const node = parseOne(`Item bg transparent
  state selected
    bg #3B82F6`)
    expect(getState(node, 'selected')).toBeDefined()
  })
})
