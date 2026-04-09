/**
 * Motion One IR Transformation Tests
 *
 * Tests the IR transformation of Motion One properties:
 * - in-view (scroll reveal)
 * - scroll-y / scroll-x (scroll-linked animations)
 * - spring (spring physics)
 * - stagger (staggered animations)
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { toIR } from '../../compiler/ir'

describe('Motion One IR Transformation', () => {
  describe('in-view property', () => {
    it('should transform standalone in-view', () => {
      const code = `Card in-view`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].inView).toBeDefined()
      expect(ir.nodes[0].inView?.animations).toEqual(['fade-in', 'slide-up']) // defaults
      expect(ir.nodes[0].inView?.once).toBe(true)
    })

    it('should transform in-view with animation presets', () => {
      const code = `Card in-view fade-in scale-in`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].inView).toBeDefined()
      expect(ir.nodes[0].inView?.animations).toContain('fade-in')
      expect(ir.nodes[0].inView?.animations).toContain('scale-in')
    })

    it('should transform in-view with threshold', () => {
      const code = `Card in-view fade-in, threshold 0.5`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].inView).toBeDefined()
      expect(ir.nodes[0].inView?.threshold).toBe(0.5)
    })

    it('should transform in-view with stagger', () => {
      const code = `Frame in-view, stagger 0.1`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].inView).toBeDefined()
      expect(ir.nodes[0].inView?.stagger).toBe(0.1)
    })
  })

  describe('scroll-y property', () => {
    it('should transform scroll-y with from/to values', () => {
      const code = `Image scroll-y 0 -100`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].scrollLinked).toBeDefined()
      expect(ir.nodes[0].scrollLinked?.axis).toBe('y')
      expect(ir.nodes[0].scrollLinked?.from).toBe(0)
      expect(ir.nodes[0].scrollLinked?.to).toBe(-100)
      expect(ir.nodes[0].scrollLinked?.property).toBe('transform')
    })
  })

  describe('scroll-x property', () => {
    it('should transform scroll-x with from/to values', () => {
      const code = `Frame scroll-x 0 50`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].scrollLinked).toBeDefined()
      expect(ir.nodes[0].scrollLinked?.axis).toBe('x')
      expect(ir.nodes[0].scrollLinked?.from).toBe(0)
      expect(ir.nodes[0].scrollLinked?.to).toBe(50)
    })
  })

  describe('spring property', () => {
    it('should transform standalone spring (default preset)', () => {
      const code = `Modal spring`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].spring).toBeDefined()
      expect(ir.nodes[0].spring?.preset).toBe('default')
    })

    it('should transform spring with preset', () => {
      const code = `Modal spring bouncy`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].spring).toBeDefined()
      expect(ir.nodes[0].spring?.preset).toBe('bouncy')
    })

    it('should transform spring gentle preset', () => {
      const code = `Card spring gentle`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].spring?.preset).toBe('gentle')
    })
  })

  describe('stagger property', () => {
    it('should transform stagger with delay value', () => {
      const code = `Frame stagger 0.1`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].stagger).toBe(0.1)
    })

    it('should transform stagger with larger delay', () => {
      const code = `List stagger 0.05`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].stagger).toBe(0.05)
    })
  })

  describe('combinations', () => {
    it('should handle in-view with spring', () => {
      const code = `Card in-view fade-in, spring bouncy`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].inView).toBeDefined()
      expect(ir.nodes[0].spring).toBeDefined()
      expect(ir.nodes[0].spring?.preset).toBe('bouncy')
    })

    it('should handle scroll-y with other properties', () => {
      const code = `Image scroll-y 0 -50, w 200, h 300`
      const ast = parse(code)
      const ir = toIR(ast)

      expect(ir.nodes[0].scrollLinked).toBeDefined()
      expect(ir.nodes[0].scrollLinked?.axis).toBe('y')
      // Should also have width/height styles
      expect(ir.nodes[0].styles.length).toBeGreaterThan(0)
    })
  })
})
