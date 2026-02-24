/**
 * Roundtrip Tests: State Preservation
 *
 * Tests that state definitions are preserved through the pipeline.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

/** Parse and get states */
function getStates(code: string) {
  const result = parse(code)
  if (result.errors.length > 0) {
    throw new Error(`Parse errors: ${result.errors.join(', ')}`)
  }
  return result.nodes[0]?.states || []
}

describe('System State Preservation', () => {
  it('hover state preserves properties', () => {
    const states = getStates(`Button
  hover
    bg #555
    col #FFF`)
    const hover = states.find((s) => s.name === 'hover')
    expect(hover).toBeDefined()
    expect(hover?.properties.bg).toBe('#555')
    expect(hover?.properties.col).toBe('#FFF')
  })

  it('focus state preserves properties', () => {
    const states = getStates(`Input
  focus
    boc #3B82F6
    shadow sm`)
    const focus = states.find((s) => s.name === 'focus')
    expect(focus).toBeDefined()
    expect(focus?.properties.boc).toBe('#3B82F6')
  })

  it('active state preserves properties', () => {
    const states = getStates(`Button
  active
    bg #1D4ED8`)
    const active = states.find((s) => s.name === 'active')
    expect(active).toBeDefined()
    expect(active?.properties.bg).toBe('#1D4ED8')
  })
})

describe('Behavior State Preservation', () => {
  it('selected state preserves', () => {
    const states = getStates(`Tab
  state selected
    bg #3B82F6
    col #FFF`)
    const selected = states.find((s) => s.name === 'selected')
    expect(selected).toBeDefined()
    expect(selected?.properties.bg).toBe('#3B82F6')
  })

  it('highlighted state preserves', () => {
    const states = getStates(`Item
  state highlighted
    bg #333`)
    const highlighted = states.find((s) => s.name === 'highlighted')
    expect(highlighted).toBeDefined()
    expect(highlighted?.properties.bg).toBe('#333')
  })

  it('expanded/collapsed states preserve', () => {
    const states = getStates(`Accordion
  state expanded
    Icon "chevron-down"
  state collapsed
    Icon "chevron-right"`)
    expect(states.find((s) => s.name === 'expanded')).toBeDefined()
    expect(states.find((s) => s.name === 'collapsed')).toBeDefined()
  })
})

describe('Multiple States Preservation', () => {
  it('system + behavior states together', () => {
    const states = getStates(`Item
  hover
    bg #333
  state selected
    bg #3B82F6
  state highlighted
    bg #555`)
    expect(states.length).toBeGreaterThanOrEqual(3)
    expect(states.find((s) => s.name === 'hover')).toBeDefined()
    expect(states.find((s) => s.name === 'selected')).toBeDefined()
    expect(states.find((s) => s.name === 'highlighted')).toBeDefined()
  })
})

describe('State in Component Definition', () => {
  it('states in definition are preserved', () => {
    const result = parse(`Button: pad 12, bg #3B82F6
  hover
    bg #2563EB

Button "Click"`)

    // Definition should have states
    const template = result.registry.get('Button')
    const hover = template?.states?.find((s) => s.name === 'hover')
    expect(hover).toBeDefined()
    expect(hover?.properties.bg).toBe('#2563EB')
  })

  it('inherited states are preserved', () => {
    const result = parse(`Button: pad 12, bg #3B82F6
  hover
    bg #2563EB

DangerButton: Button bg #EF4444

DangerButton "Delete"`)

    // DangerButton should inherit hover from Button
    const template = result.registry.get('DangerButton')
    const hover = template?.states?.find((s) => s.name === 'hover')
    expect(hover).toBeDefined()
  })
})
