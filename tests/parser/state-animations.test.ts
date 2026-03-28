/**
 * Tests for state animation parsing
 *
 * Syntax forms:
 * - selected onclick: bounce        → preset after colon
 * - selected onclick 0.2s:          → duration before colon
 * - selected onclick 0.3s ease-out: → duration + easing before colon
 * - enter: slide-in                 → enter animation pseudo-property
 * - exit: fade-out                  → exit animation pseudo-property
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../src/parser'
import type { Instance, State } from '../../src/parser/ast'

describe('State Animation Parsing', () => {
  describe('Animation preset after colon', () => {
    it('should parse animation preset after trigger colon', () => {
      const source = `
Button
  selected onclick: bounce
    bg #3B82F6
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      expect(instance.states).toHaveLength(1)

      const state = instance.states![0]
      expect(state.name).toBe('selected')
      expect(state.trigger).toBe('onclick')
      expect(state.animation).toEqual({ preset: 'bounce' })
    })

    it('should parse animation preset with other properties', () => {
      const source = `
Tab
  selected onclick: fade-in
    bg #fff, opacity 1
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.animation).toEqual({ preset: 'fade-in' })
      expect(state.properties).toHaveLength(2)
    })

    it('should parse various animation presets', () => {
      const presets = ['fade-in', 'fade-out', 'slide-in', 'slide-out', 'scale-in', 'scale-out', 'bounce', 'pulse', 'shake', 'spin']

      for (const preset of presets) {
        const source = `
Button
  selected onclick: ${preset}
    bg #333
`
        const ast = parse(source)
        const instance = ast.instances[0] as Instance
        const state = instance.states![0]
        expect(state.animation?.preset).toBe(preset)
      }
    })
  })

  describe('Duration before colon', () => {
    it('should parse duration in seconds', () => {
      const source = `
Card
  highlighted onclick 0.2s:
    scale 1.02
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.name).toBe('highlighted')
      expect(state.trigger).toBe('onclick')
      expect(state.animation).toEqual({ duration: 0.2 })
    })

    it('should parse duration in milliseconds', () => {
      const source = `
Card
  highlighted onclick 200ms:
    scale 1.02
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.animation).toEqual({ duration: 0.2 })
    })

    it('should parse duration with easing', () => {
      const source = `
Card
  selected onclick 0.3s ease-out:
    bg #3B82F6
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.animation).toEqual({ duration: 0.3, easing: 'ease-out' })
    })

    it('should parse different easing functions', () => {
      const easings = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'spring', 'bounce']

      for (const easing of easings) {
        const source = `
Box
  open onclick 0.2s ${easing}:
    visible
`
        const ast = parse(source)
        const instance = ast.instances[0] as Instance
        const state = instance.states![0]
        expect(state.animation?.easing).toBe(easing)
      }
    })
  })

  describe('Enter/Exit pseudo-properties', () => {
    it('should parse enter animation', () => {
      const source = `
Modal
  open onclick:
    enter: scale-in
    visible
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.name).toBe('open')
      expect(state.enter).toEqual({ preset: 'scale-in' })
      expect(state.properties).toHaveLength(1)
      expect(state.properties[0].name).toBe('visible')
    })

    it('should parse exit animation', () => {
      const source = `
Modal
  open onclick:
    exit: fade-out
    visible
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.exit).toEqual({ preset: 'fade-out' })
    })

    it('should parse both enter and exit', () => {
      const source = `
MyModal
  open onclick:
    enter: scale-in
    exit: fade-out
    visible
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.enter).toEqual({ preset: 'scale-in' })
      expect(state.exit).toEqual({ preset: 'fade-out' })
    })

    it('should parse enter with duration', () => {
      const source = `
Panel
  visible onclick:
    enter: slide-in 0.3s
    opacity 1
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.enter).toEqual({ preset: 'slide-in', duration: 0.3 })
    })

    it('should parse enter with duration and easing', () => {
      const source = `
Panel
  visible onclick:
    enter: bounce 0.5s ease-out
    opacity 1
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.enter).toEqual({ preset: 'bounce', duration: 0.5, easing: 'ease-out' })
    })
  })

  describe('Combined animation syntax', () => {
    it('should parse duration before colon with preset after', () => {
      const source = `
Button
  selected onclick 0.2s: bounce
    bg #3B82F6
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.animation).toEqual({ duration: 0.2, preset: 'bounce' })
    })

    it('should work with when dependencies', () => {
      const source = `
Backdrop
  visible when Menu open 0.3s:
    opacity 0.5
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.name).toBe('visible')
      expect(state.when).toBeDefined()
      expect(state.when?.target).toBe('Menu')
      expect(state.when?.state).toBe('open')
      expect(state.animation).toEqual({ duration: 0.3 })
    })

    it('should work with modifiers', () => {
      const source = `
Tab
  selected exclusive onclick 0.15s: bounce
    bg #fff
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.name).toBe('selected')
      expect(state.modifier).toBe('exclusive')
      expect(state.trigger).toBe('onclick')
      expect(state.animation).toEqual({ duration: 0.15, preset: 'bounce' })
    })
  })

  describe('State without animation', () => {
    it('should parse state without animation', () => {
      const source = `
Button
  hover:
    bg #eee
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.name).toBe('hover')
      expect(state.animation).toBeUndefined()
    })

    it('should parse trigger state without animation', () => {
      const source = `
Button
  selected onclick:
    bg #fff
`
      const ast = parse(source)
      const instance = ast.instances[0] as Instance
      const state = instance.states![0]

      expect(state.trigger).toBe('onclick')
      expect(state.animation).toBeUndefined()
    })
  })
})
