/**
 * System States Tests
 *
 * Tests for predefined system states that automatically bind to browser events:
 * - state hover → onMouseEnter/Leave
 * - state focus → onFocus/onBlur
 * - state active → onMouseDown/Up
 * - state disabled → disabled attribute
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'
import { SYSTEM_STATES } from '../../dsl/properties'

// Helper to filter out warnings from errors array
function getErrors(result: ReturnType<typeof parse>) {
  return (result.errors || []).filter(
    (e: string) => !e.startsWith('Warning:')
  )
}

describe('System States', () => {
  describe('SYSTEM_STATES constant', () => {
    it('contains hover, focus, active, disabled', () => {
      expect(SYSTEM_STATES.has('hover')).toBe(true)
      expect(SYSTEM_STATES.has('focus')).toBe(true)
      expect(SYSTEM_STATES.has('active')).toBe(true)
      expect(SYSTEM_STATES.has('disabled')).toBe(true)
    })

    it('does not contain custom state names', () => {
      expect(SYSTEM_STATES.has('selected')).toBe(false)
      expect(SYSTEM_STATES.has('expanded')).toBe(false)
      expect(SYSTEM_STATES.has('custom')).toBe(false)
    })
  })

  describe('Parser - system state definitions', () => {
    it('parses state hover with properties', () => {
      const input = `
Btn
  state hover
    col #F00
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const button = result.nodes[0]
      expect(button.states).toBeDefined()
      expect(button.states).toHaveLength(1)
      expect(button.states![0].name).toBe('hover')
      expect(button.states![0].properties.col).toBe('#F00')
    })

    it('parses state focus with properties', () => {
      const input = `
Input
  state focus
    boc #00F
    shadow 4
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const input_ = result.nodes[0]
      expect(input_.states).toHaveLength(1)
      expect(input_.states![0].name).toBe('focus')
      expect(input_.states![0].properties.boc).toBe('#00F')
      expect(input_.states![0].properties.shadow).toBe(4)
    })

    it('parses state active with properties', () => {
      const input = `
Btn
  state active
    col #800
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const button = result.nodes[0]
      expect(button.states).toHaveLength(1)
      expect(button.states![0].name).toBe('active')
      expect(button.states![0].properties.col).toBe('#800')
    })

    it('parses state disabled with properties', () => {
      const input = `
Btn
  state disabled
    opa 0.5
    col #888
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const button = result.nodes[0]
      expect(button.states).toHaveLength(1)
      expect(button.states![0].name).toBe('disabled')
      expect(button.states![0].properties.opa).toBe(0.5)
    })

    it('parses multiple system states on same element', () => {
      const input = `
Btn col #00F
  state hover
    col #33F
  state active
    col #008
  state focus
    boc #FFF
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const button = result.nodes[0]
      expect(button.states).toHaveLength(3)

      const hover = button.states!.find(s => s.name === 'hover')
      expect(hover?.properties.col).toBe('#33F')

      const active = button.states!.find(s => s.name === 'active')
      expect(active?.properties.col).toBe('#008')

      const focus = button.states!.find(s => s.name === 'focus')
      expect(focus?.properties.boc).toBe('#FFF')
    })

    it('parses system states mixed with custom states', () => {
      const input = `
ToggleSwitch
  state default
    col #333
  state hover
    col #444
  state selected
    col #00F
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const toggleSwitch = result.nodes[0]
      expect(toggleSwitch.states).toHaveLength(3)

      // All three states should be parsed
      expect(toggleSwitch.states!.map(s => s.name)).toEqual(['default', 'hover', 'selected'])
    })
  })

  describe('Parser - complete button example', () => {
    it('parses realistic button with all system states', () => {
      const input = `
PrimaryBtn: pad 12 24 col #2271c1 rad 8
  state hover
    col #3388e8
  state active
    col #1a5a9e
  state focus
    boc #FFF
    shadow 2
  state disabled
    col #888
    opa 0.6
`
      const result = parse(input)
      expect(getErrors(result)).toHaveLength(0)

      const button = result.registry.get('PrimaryBtn')
      expect(button).toBeDefined()
      expect(button!.states).toHaveLength(4)

      // Base properties (pad is expanded to pad_u, pad_r, pad_d, pad_l)
      expect(button!.properties.pad_u).toBe(12)
      expect(button!.properties.col).toBe('#2271c1') // Hex colors preserve original case

      // System states
      const hover = button!.states!.find(s => s.name === 'hover')
      expect(hover?.properties.col).toBe('#3388e8')

      const active = button!.states!.find(s => s.name === 'active')
      expect(active?.properties.col).toBe('#1a5a9e')

      const focus = button!.states!.find(s => s.name === 'focus')
      expect(focus?.properties.boc).toBe('#FFF')
      expect(focus?.properties.shadow).toBe(2)

      const disabled = button!.states!.find(s => s.name === 'disabled')
      expect(disabled?.properties.col).toBe('#888')
      expect(disabled?.properties.opa).toBe(0.6)
    })
  })
})
