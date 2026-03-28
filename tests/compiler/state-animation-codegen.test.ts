/**
 * Tests for state animation code generation
 *
 * Verifies that animation data is correctly emitted in generated code
 */

import { describe, it, expect } from 'vitest'
import { compile } from '../../src'

describe('State Animation Code Generation', () => {
  describe('State machine config with animations', () => {
    it('should include enter animation in state config', () => {
      const source = `
Modal
  open onclick:
    enter: scale-in
    visible
`
      const code = compile(source)

      // Should include enter animation in state definition
      expect(code).toContain("enter: { preset: 'scale-in' }")
    })

    it('should include exit animation in state config', () => {
      const source = `
Modal
  open onclick:
    exit: fade-out
    visible
`
      const code = compile(source)

      // Should include exit animation in state definition
      expect(code).toContain("exit: { preset: 'fade-out' }")
    })

    it('should include both enter and exit in state config', () => {
      const source = `
Panel
  open onclick:
    enter: slide-in
    exit: slide-out
    visible
`
      const code = compile(source)

      expect(code).toContain("enter: { preset: 'slide-in' }")
      expect(code).toContain("exit: { preset: 'slide-out' }")
    })

    it('should include animation with duration in state config', () => {
      const source = `
Panel
  visible onclick:
    enter: bounce 0.5s ease-out
    opacity 1
`
      const code = compile(source)

      expect(code).toContain("enter: { preset: 'bounce', duration: 0.5, easing: 'ease-out' }")
    })
  })

  describe('Transition animations', () => {
    it('should include animation preset in transition', () => {
      const source = `
Button
  selected onclick: bounce
    bg #3B82F6
`
      const code = compile(source)

      // Should include animation in transition config
      expect(code).toContain("animation: { preset: 'bounce' }")
    })

    it('should include duration in transition', () => {
      const source = `
Card
  highlighted onclick 0.2s:
    scale 1.02
`
      const code = compile(source)

      expect(code).toContain("animation: { duration: 0.2 }")
    })

    it('should include duration and easing in transition', () => {
      const source = `
Card
  selected onclick 0.3s ease-out:
    bg #3B82F6
`
      const code = compile(source)

      expect(code).toContain("animation: { duration: 0.3, easing: 'ease-out' }")
    })

    it('should include duration and preset in transition', () => {
      const source = `
Button
  selected onclick 0.2s: bounce
    bg #3B82F6
`
      const code = compile(source)

      // Order may vary, so check for both properties
      expect(code).toContain("preset: 'bounce'")
      expect(code).toContain("duration: 0.2")
    })
  })

  describe('Transition calls with animation', () => {
    it('should pass animation to transitionTo', () => {
      const source = `
Button
  selected onclick: bounce
    bg #3B82F6
`
      const code = compile(source)

      // Should pass animation arg to transitionTo
      expect(code).toContain("_runtime.transitionTo")
      expect(code).toContain("{ preset: 'bounce' }")
    })

    it('should pass animation to exclusiveTransition', () => {
      const source = `
Tab
  selected exclusive onclick: fade-in
    bg #fff
`
      const code = compile(source)

      // Should pass animation arg to exclusiveTransition
      expect(code).toContain("_runtime.exclusiveTransition")
      expect(code).toContain("{ preset: 'fade-in' }")
    })
  })

  describe('States without animation', () => {
    it('should not include animation when not specified', () => {
      const source = `
Button
  selected onclick:
    bg #3B82F6
`
      const code = compile(source)

      // Should not have enter/exit in state config
      expect(code).not.toContain("enter:")
      expect(code).not.toContain("exit:")

      // Transition should not have animation
      expect(code).toMatch(/_runtime\.transitionTo\([^,]+,\s*'selected'\s*\)/)
    })
  })
})
