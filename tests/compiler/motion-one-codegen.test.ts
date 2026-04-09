/**
 * Motion One Code Generation Tests
 *
 * Tests that the DOM backend generates correct Motion One function calls.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { generateDOM } from '../../compiler/backends/dom'

describe('Motion One Code Generation', () => {
  describe('in-view animations', () => {
    it('should generate setupInViewAnimation call', () => {
      const code = `Card in-view fade-in`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupInViewAnimation')
      expect(output).toContain('["fade-in"]')
    })

    it('should generate in-view with threshold', () => {
      const code = `Card in-view fade-in, threshold 0.5`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupInViewAnimation')
      expect(output).toContain('threshold: 0.5')
    })

    it('should generate in-view with stagger config', () => {
      const code = `Frame in-view slide-up, stagger 0.1`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupInViewAnimation')
      expect(output).toContain('stagger: 0.1')
    })
  })

  describe('scroll-linked animations', () => {
    it('should generate setupScrollAnimation call for scroll-y', () => {
      const code = `Image scroll-y 0 -100`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupScrollAnimation')
      expect(output).toContain('"transform"')
      expect(output).toContain('0')
      expect(output).toContain('-100')
      expect(output).toContain('axis: "y"')
    })

    it('should generate setupScrollAnimation call for scroll-x', () => {
      const code = `Frame scroll-x 0 50`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupScrollAnimation')
      expect(output).toContain('axis: "x"')
      expect(output).toContain('50')
    })
  })

  describe('spring physics', () => {
    it('should store spring preset in dataset', () => {
      const code = `Modal spring bouncy`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('dataset.springPreset')
      expect(output).toContain('"bouncy"')
    })

    it('should use default preset when none specified', () => {
      const code = `Modal spring`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('dataset.springPreset')
      expect(output).toContain('"default"')
    })
  })

  describe('stagger animations', () => {
    it('should generate setupStaggerAnimation for containers with children', () => {
      const code = `Frame stagger 0.1
  Card "Item 1"
  Card "Item 2"`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupStaggerAnimation')
      expect(output).toContain('staggerDelay: 0.1')
    })

    it('should not generate stagger for elements without children', () => {
      const code = `Card stagger 0.1`
      const ast = parse(code)
      const output = generateDOM(ast)

      // Should NOT call setupStaggerAnimation because no children
      // The runtime defines the function, so we check for the actual call pattern
      expect(output).not.toMatch(/_runtime\.setupStaggerAnimation\([^)]+\)/)
    })
  })

  describe('combinations', () => {
    it('should generate both in-view and spring', () => {
      const code = `Card in-view fade-in, spring bouncy`
      const ast = parse(code)
      const output = generateDOM(ast)

      expect(output).toContain('setupInViewAnimation')
      expect(output).toContain('dataset.springPreset')
      expect(output).toContain('"bouncy"')
    })
  })
})
