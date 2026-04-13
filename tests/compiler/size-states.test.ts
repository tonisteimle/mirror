/**
 * Size States Tests
 *
 * Tests for CSS Container Queries-based responsive components.
 * Size-states respond to the element's own width, not the viewport.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

function compileToIR(code: string) {
  const ast = parse(code)
  return toIR(ast)
}

function compileToDOM(code: string) {
  const ast = parse(code)
  return generateDOM(ast)
}

describe('Size States', () => {
  describe('IR Transformation', () => {
    it('should mark styles with sizeState instead of state for built-in size-states', () => {
      // Use Frame primitive directly (not a component definition)
      const ir = compileToIR(`
Frame bg #1a1a1a, pad 16
  compact:
    pad 8
      `)

      const frameNode = ir.nodes[0]
      const sizeStateStyles = frameNode.styles.filter(s => s.sizeState)
      const stateStyles = frameNode.styles.filter(s => s.state)

      expect(sizeStateStyles).toHaveLength(1)
      expect(sizeStateStyles[0].sizeState).toBe('compact')
      expect(sizeStateStyles[0].property).toBe('padding')
      expect(sizeStateStyles[0].value).toBe('8px')

      // No regular state styles for compact
      expect(stateStyles.filter(s => s.state === 'compact')).toHaveLength(0)
    })

    it('should set needsContainer flag when size-states are used', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a
  compact:
    bg #333
      `)

      expect(ir.nodes[0].needsContainer).toBe(true)
    })

    it('should not set needsContainer when no size-states are used', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a
  hover:
    bg #333
      `)

      expect(ir.nodes[0].needsContainer).toBeUndefined()
    })

    it('should handle multiple size-states', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a, pad 16
  compact:
    pad 8
  wide:
    pad 24
      `)

      const frameNode = ir.nodes[0]
      const sizeStateStyles = frameNode.styles.filter(s => s.sizeState)

      expect(sizeStateStyles).toHaveLength(2)
      expect(sizeStateStyles.map(s => s.sizeState)).toContain('compact')
      expect(sizeStateStyles.map(s => s.sizeState)).toContain('wide')
    })

    it('should handle regular state mixed with size-state', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a
  hover:
    bg #333
  compact:
    bg #222
      `)

      const frameNode = ir.nodes[0]
      const sizeStateStyles = frameNode.styles.filter(s => s.sizeState)
      const regularStateStyles = frameNode.styles.filter(s => s.state === 'hover')

      expect(sizeStateStyles).toHaveLength(1)
      expect(sizeStateStyles[0].sizeState).toBe('compact')
      expect(regularStateStyles).toHaveLength(1)
      expect(regularStateStyles[0].state).toBe('hover')
    })

    it('should recognize custom size-states defined via tokens', () => {
      const ir = compileToIR(`
tiny.max: 200

Frame bg #1a1a1a
  tiny:
    pad 4
      `)

      const frameNode = ir.nodes[0]
      const sizeStateStyles = frameNode.styles.filter(s => s.sizeState)

      expect(sizeStateStyles).toHaveLength(1)
      expect(sizeStateStyles[0].sizeState).toBe('tiny')
    })

    it('should work with component instances', () => {
      const ir = compileToIR(`
Card: bg #1a1a1a, pad 16
  compact:
    pad 8

Card
      `)

      // The instance should inherit the size-state
      const cardNode = ir.nodes[0]
      const sizeStateStyles = cardNode.styles.filter(s => s.sizeState)

      expect(sizeStateStyles).toHaveLength(1)
      expect(sizeStateStyles[0].sizeState).toBe('compact')
      expect(cardNode.needsContainer).toBe(true)
    })
  })

  describe('DOM Generation', () => {
    it('should generate @container query for compact size-state', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  compact:
    pad 8
      `)

      expect(code).toContain('@container')
      expect(code).toContain('max-width: 400px')
      expect(code).toContain('padding: 8px')
    })

    it('should generate @container query for wide size-state', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  wide:
    pad 24
      `)

      expect(code).toContain('@container')
      expect(code).toContain('min-width: 800px')
    })

    it('should generate @container query for regular size-state (range)', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  regular:
    pad 16
      `)

      expect(code).toContain('@container')
      expect(code).toContain('min-width: 400px')
      expect(code).toContain('max-width: 800px')
    })

    it('should set container-type: inline-size on element', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  compact:
    pad 8
      `)

      expect(code).toContain("containerType = 'inline-size'")
    })

    it('should use custom threshold from token', () => {
      const code = compileToDOM(`
compact.max: 300

Frame bg #1a1a1a
  compact:
    pad 8
      `)

      expect(code).toContain('max-width: 300px')
    })

    it('should handle custom size-state with thresholds', () => {
      const code = compileToDOM(`
tiny.max: 200
tiny.min: 0

Frame bg #1a1a1a
  tiny:
    pad 4
      `)

      expect(code).toContain('@container')
      expect(code).toContain('max-width: 200px')
    })

    it('should generate container queries for component instances', () => {
      const code = compileToDOM(`
Card: bg #1a1a1a, pad 16
  compact:
    pad 8, bg #222

Card
      `)

      expect(code).toContain('@container')
      expect(code).toContain('max-width: 400px')
      expect(code).toContain("containerType = 'inline-size'")
    })
  })

  describe('Edge Cases', () => {
    it('should handle size-states with child elements', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a, pad 16
  compact:
    pad 8
  Text "Content", col white
      `)

      const frameNode = ir.nodes[0]
      expect(frameNode.needsContainer).toBe(true)
      expect(frameNode.children).toHaveLength(1)
      expect(frameNode.children[0].name).toBe('Text')
    })

    it('should handle nested elements with independent size-states', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a
  compact:
    pad 8
  Frame bg #333
    wide:
      pad 24
      `)

      const outerFrame = ir.nodes[0]
      const innerFrame = outerFrame.children[0]

      expect(outerFrame.needsContainer).toBe(true)
      expect(innerFrame.needsContainer).toBe(true)
    })

    it('should preserve size-states when combined with system states', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a
  hover:
    bg #333
  focus:
    boc #2271C1
  compact:
    pad 8
  wide:
    pad 24
      `)

      const frameNode = ir.nodes[0]
      const sizeStateStyles = frameNode.styles.filter(s => s.sizeState)
      const hoverStyles = frameNode.styles.filter(s => s.state === 'hover')
      const focusStyles = frameNode.styles.filter(s => s.state === 'focus')

      expect(sizeStateStyles).toHaveLength(2)
      expect(hoverStyles).toHaveLength(1)
      expect(focusStyles).toHaveLength(1)
      expect(frameNode.needsContainer).toBe(true)
    })

    it('should handle only-min threshold (wide)', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  wide:
    pad 32
      `)

      expect(code).toContain('@container (min-width: 800px)')
      expect(code).not.toContain('max-width: 800px')
    })

    it('should handle only-max threshold (compact)', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  compact:
    pad 8
      `)

      expect(code).toContain('@container (max-width: 400px)')
      expect(code).not.toContain('min-width: 400px')
    })

    it('should handle custom token overriding default threshold', () => {
      const code = compileToDOM(`
wide.min: 1200

Frame bg #1a1a1a
  wide:
    pad 48
      `)

      expect(code).toContain('min-width: 1200px')
    })

    it('should handle multiple size-state styles on same element', () => {
      const code = compileToDOM(`
Frame bg #1a1a1a
  compact:
    pad 8
    fs 12
    gap 4
      `)

      expect(code).toContain('@container (max-width: 400px)')
      expect(code).toContain('padding: 8px')
      expect(code).toContain('font-size: 12px')
      expect(code).toContain('gap: 4px')
    })

    it('should not affect elements without size-states', () => {
      const ir = compileToIR(`
Frame bg #1a1a1a
  compact:
    pad 8
  Text "No size state", col white
    hover:
      col #888
      `)

      const frameNode = ir.nodes[0]
      const textNode = frameNode.children[0]

      expect(frameNode.needsContainer).toBe(true)
      expect(textNode.needsContainer).toBeUndefined()
    })
  })
})
