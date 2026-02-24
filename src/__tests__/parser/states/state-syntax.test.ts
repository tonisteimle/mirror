/**
 * Parser Tests: State Syntax Variations
 *
 * Tests for different state syntax forms:
 * - Implicit: hover\n  bg #555
 * - Explicit: state hover\n  bg #555
 * - Category: state selection\n  selected\n    bg #333
 */

import { describe, it, expect } from 'vitest'
import { parseOne, getState, getStatesByCategory } from '../../test-utils'

describe('Implicit State Syntax', () => {
  it('parses implicit hover state', () => {
    const node = parseOne(`Button
  hover
    bg #555`)
    const state = getState(node, 'hover')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#555')
  })

  it('parses implicit focus state', () => {
    const node = parseOne(`Input
  focus
    boc #3B82F6`)
    const state = getState(node, 'focus')
    expect(state).toBeDefined()
    expect(state?.properties.boc).toBe('#3B82F6')
  })

  it('parses implicit active state', () => {
    const node = parseOne(`Button
  active
    bg #1D4ED8`)
    const state = getState(node, 'active')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#1D4ED8')
  })

})

describe('Explicit State Syntax', () => {
  it('parses explicit state hover', () => {
    const node = parseOne(`Button
  state hover
    bg #555`)
    const state = getState(node, 'hover')
    expect(state).toBeDefined()
    expect(state?.properties.bg).toBe('#555')
  })

  it('parses explicit state highlighted', () => {
    const node = parseOne(`Item
  state highlighted
    bg #333`)
    const state = getState(node, 'highlighted')
    expect(state).toBeDefined()
  })

  it('parses explicit state selected', () => {
    const node = parseOne(`Tab
  state selected
    bg #3B82F6`)
    const state = getState(node, 'selected')
    expect(state).toBeDefined()
  })
})

describe('Mixed State Syntax', () => {
  it('combines implicit and explicit states', () => {
    const node = parseOne(`Button
  hover
    bg #555
  state selected
    bg #3B82F6`)
    expect(getState(node, 'hover')).toBeDefined()
    expect(getState(node, 'selected')).toBeDefined()
  })

  it('system and behavior states together', () => {
    const node = parseOne(`Item
  hover
    bg #333
  state highlighted
    bg #555
  state selected
    bg #3B82F6`)
    expect(getState(node, 'hover')).toBeDefined()
    expect(getState(node, 'highlighted')).toBeDefined()
    expect(getState(node, 'selected')).toBeDefined()
  })
})

describe('State with Multiple Properties', () => {
  it('state block with multiple properties', () => {
    const node = parseOne(`Button
  hover
    bg #555
    col #FFF`)
    const state = getState(node, 'hover')
    expect(state?.properties.bg).toBe('#555')
    expect(state?.properties.col).toBe('#FFF')
  })
})

describe('State Properties Override Base', () => {
  it('state properties override base', () => {
    const node = parseOne(`Button bg #333, col #FFF
  hover
    bg #555`)

    // Base properties
    expect(node.properties.bg).toBe('#333')
    expect(node.properties.col).toBe('#FFF')

    // State overrides bg
    const hover = getState(node, 'hover')
    expect(hover?.properties.bg).toBe('#555')
  })
})
