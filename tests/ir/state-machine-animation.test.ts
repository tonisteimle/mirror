/**
 * Tests for state machine animation in IR
 *
 * Verifies that animation data is correctly transformed from AST to IR
 */

import { describe, it, expect } from 'vitest'
import { parse, toIR } from '../../src'
import type { IRStateMachine, IRStateAnimation } from '../../src/ir/types'

describe('State Machine Animation IR', () => {
  describe('Transition animations', () => {
    it('should include animation preset in transition', () => {
      const source = `
Button
  selected onclick: bounce
    bg #3B82F6
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.transitions).toHaveLength(1)
      expect(sm.transitions[0].animation).toEqual({ preset: 'bounce' })
    })

    it('should include duration in transition', () => {
      const source = `
Card
  highlighted onclick 0.2s:
    scale 1.02
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.transitions[0].animation).toEqual({ duration: 0.2 })
    })

    it('should include duration and easing in transition', () => {
      const source = `
Card
  selected onclick 0.3s ease-out:
    bg #3B82F6
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.transitions[0].animation).toEqual({
        duration: 0.3,
        easing: 'ease-out',
      })
    })

    it('should include duration and preset in transition', () => {
      const source = `
Button
  selected onclick 0.2s: bounce
    bg #3B82F6
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.transitions[0].animation).toEqual({
        duration: 0.2,
        preset: 'bounce',
      })
    })

    it('should include animation in when-based transition', () => {
      const source = `
Backdrop
  visible when Menu open 0.3s:
    opacity 0.5
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.transitions[0].when).toBeDefined()
      expect(sm.transitions[0].animation).toEqual({ duration: 0.3 })
    })
  })

  describe('State enter/exit animations', () => {
    it('should include enter animation in state definition', () => {
      const source = `
Modal
  open onclick:
    enter: scale-in
    visible
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.states['open'].enter).toEqual({ preset: 'scale-in' })
    })

    it('should include exit animation in state definition', () => {
      const source = `
Modal
  open onclick:
    exit: fade-out
    visible
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.states['open'].exit).toEqual({ preset: 'fade-out' })
    })

    it('should include both enter and exit animations', () => {
      const source = `
Panel
  open onclick:
    enter: slide-in
    exit: slide-out
    visible
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.states['open'].enter).toEqual({ preset: 'slide-in' })
      expect(sm.states['open'].exit).toEqual({ preset: 'slide-out' })
    })

    it('should include enter with duration and easing', () => {
      const source = `
Panel
  visible onclick:
    enter: bounce 0.5s ease-out
    opacity 1
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.states['visible'].enter).toEqual({
        preset: 'bounce',
        duration: 0.5,
        easing: 'ease-out',
      })
    })
  })

  describe('Combined transition and state animations', () => {
    it('should have transition animation and enter/exit in same state', () => {
      const source = `
Modal
  open onclick: scale-in
    enter: slide-in
    exit: fade-out
    visible
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      // Transition has inline animation
      expect(sm.transitions[0].animation).toEqual({ preset: 'scale-in' })

      // State has enter/exit
      expect(sm.states['open'].enter).toEqual({ preset: 'slide-in' })
      expect(sm.states['open'].exit).toEqual({ preset: 'fade-out' })
    })
  })

  describe('States without animation', () => {
    it('should not have animation when not specified', () => {
      const source = `
Button
  selected onclick:
    bg #3B82F6
`
      const ast = parse(source)
      const ir = toIR(ast)
      const node = ir.nodes[0]
      const sm = node.stateMachine!

      expect(sm.transitions[0].animation).toBeUndefined()
      expect(sm.states['selected'].enter).toBeUndefined()
      expect(sm.states['selected'].exit).toBeUndefined()
    })
  })
})
