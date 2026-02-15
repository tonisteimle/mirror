/**
 * DSL State Tests
 *
 * Tests for state parsing:
 * - System states (hover, focus, active, disabled)
 * - Behavior states (highlighted, selected, expanded, etc.)
 * - State blocks
 * - Hover shorthand properties
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'
import { generate, getStyle } from '../../test-utils'

// ============================================
// System States
// ============================================

// Helper to find a state by name in the states array
const findState = (states: Array<{ name: string; properties: Record<string, unknown> }> | undefined, name: string) =>
  states?.find(s => s.name === name)

describe('System States', () => {
  describe('hover state', () => {
    it('parses hover state block', () => {
      const dsl = `Button
  state hover
    bg #4B92F7`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'hover')).toBeDefined()
    })
  })

  describe('focus state', () => {
    it('parses focus state block', () => {
      const dsl = `Input
  state focus
    bor 2 #3B82F6`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'focus')).toBeDefined()
    })
  })

  describe('active state', () => {
    it('parses active state block', () => {
      const dsl = `Button
  state active
    bg #2B62C6`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'active')).toBeDefined()
    })
  })

  describe('disabled state', () => {
    it('parses disabled state block', () => {
      const dsl = `Button
  state disabled
    bg #666
    opacity 0.5`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'disabled')).toBeDefined()
    })
  })
})

// ============================================
// Behavior States
// ============================================

describe('Behavior States', () => {
  describe('highlighted state', () => {
    it('parses highlighted state', () => {
      const dsl = `Item
  state default
    bg transparent
  state highlighted
    bg #333`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'default')).toBeDefined()
      expect(findState(result.nodes[0].states, 'highlighted')).toBeDefined()
    })
  })

  describe('selected state', () => {
    it('parses selected state', () => {
      const dsl = `Option
  state default
    bg transparent
  state selected
    bg #3B82F6`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'selected')).toBeDefined()
    })
  })

  describe('expanded/collapsed states', () => {
    it('parses expanded state', () => {
      const dsl = `Accordion
  state expanded
    maxh 500
  state collapsed
    maxh 0`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'expanded')).toBeDefined()
      expect(findState(result.nodes[0].states, 'collapsed')).toBeDefined()
    })
  })

  describe('valid/invalid states', () => {
    it('parses valid state', () => {
      const dsl = `Input
  state valid
    boc #10B981
  state invalid
    boc #EF4444`
      const result = parse(dsl)
      expect(findState(result.nodes[0].states, 'valid')).toBeDefined()
      expect(findState(result.nodes[0].states, 'invalid')).toBeDefined()
    })
  })
})

// ============================================
// State Blocks with Properties
// ============================================

describe('State Blocks with Properties', () => {
  it('stores properties in state', () => {
    const dsl = `Toggle: w 52 h 28 rad 14
  state off
    bg #333
  state on
    bg #3B82F6`
    const result = parse(dsl)
    const template = result.registry.get('Toggle')
    // States are stored as arrays with { name, properties, children }
    expect(findState(template?.states, 'off')?.properties.bg).toBe('#333')
    expect(findState(template?.states, 'on')?.properties.bg).toBe('#3B82F6')
  })

  it('multiple properties in state', () => {
    const dsl = `Button
  state default
    bg #3B82F6
    col #FFFFFF
  state hover
    bg #4B92F7
    col #FFFFFF`
    const result = parse(dsl)
    // States are stored as arrays with { name, properties, children }
    const defaultState = findState(result.nodes[0].states, 'default')
    expect(defaultState?.properties).toMatchObject({
      bg: '#3B82F6',
      col: '#FFFFFF',
    })
  })
})

// ============================================
// Hover Shorthand Properties
// ============================================

describe('Hover Shorthand Properties', () => {
  // NOTE: Long-form properties are normalized to short-forms during parsing
  // e.g., hover-background → hover-bg, hover-opacity → hover-opa

  describe('hover-background', () => {
    it('parses hover-background (normalized to hover-bg)', () => {
      const result = parse('Button hover-background #4B92F7')
      expect(result.nodes[0].properties['hover-bg']).toBe('#4B92F7')
    })

    it('parses hover-bg shorthand', () => {
      const result = parse('Button hover-bg #4B92F7')
      expect(result.nodes[0].properties['hover-bg']).toBe('#4B92F7')
    })
  })

  describe('hover-color', () => {
    it('parses hover-color (normalized to hover-col)', () => {
      const result = parse('Link hover-color #3B82F6')
      expect(result.nodes[0].properties['hover-col']).toBe('#3B82F6')
    })

    it('parses hover-col shorthand', () => {
      const result = parse('Link hover-col #3B82F6')
      expect(result.nodes[0].properties['hover-col']).toBe('#3B82F6')
    })
  })

  describe('hover-border-color', () => {
    it('parses hover-border-color (normalized to hover-boc)', () => {
      const result = parse('Input hover-border-color #3B82F6')
      expect(result.nodes[0].properties['hover-boc']).toBe('#3B82F6')
    })
  })

  describe('hover-opacity', () => {
    it('parses hover-opacity (normalized to hover-opa)', () => {
      const result = parse('Card hover-opacity 0.8')
      expect(result.nodes[0].properties['hover-opa']).toBe(0.8)
    })
  })

  describe('hover-scale', () => {
    it('parses hover-scale', () => {
      const result = parse('Button hover-scale 1.05')
      expect(result.nodes[0].properties['hover-scale']).toBe(1.05)
    })
  })

  describe('hover-radius', () => {
    it('parses hover-radius (normalized to hover-rad)', () => {
      const result = parse('Card hover-radius 16')
      expect(result.nodes[0].properties['hover-rad']).toBe(16)
    })
  })

  describe('multiple hover properties', () => {
    it('parses multiple hover properties', () => {
      // NOTE: Long-form properties are normalized to short-forms
      const result = parse('Button hover-background #4B92F7 hover-color #FFF hover-scale 1.05')
      expect(result.nodes[0].properties['hover-bg']).toBe('#4B92F7')
      expect(result.nodes[0].properties['hover-col']).toBe('#FFF')
      expect(result.nodes[0].properties['hover-scale']).toBe(1.05)
    })
  })
})

// ============================================
// States with Events
// ============================================

describe('States with Events', () => {
  it('state with onhover highlight', () => {
    const dsl = `Item: pad 12 cursor pointer
  state default
    bg transparent
  state highlighted
    bg #333
  onhover highlight self`
    const result = parse(dsl)
    const template = result.registry.get('Item')
    // States are stored as arrays, use findState helper
    expect(findState(template?.states, 'highlighted')).toBeDefined()
    expect(template?.eventHandlers?.length).toBeGreaterThan(0)
  })

  it('state with onclick select', () => {
    const dsl = `Option
  state default
    bg transparent
  state selected
    bg #3B82F6
  onclick select self`
    const result = parse(dsl)
    // States are stored as arrays, use findState helper
    expect(findState(result.nodes[0].states, 'selected')).toBeDefined()
    expect(result.nodes[0].eventHandlers[0].actions[0].type).toBe('select')
  })
})
