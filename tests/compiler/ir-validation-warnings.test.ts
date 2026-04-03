/**
 * Tests for IR validation warnings
 *
 * Validates that the IR transformer emits warnings for unknown properties.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { toIR, type IRResult } from '../../compiler/ir'

describe('IR Validation Warnings', () => {
  /**
   * Helper to parse code and get IR result with warnings
   */
  function getIRWithWarnings(code: string): IRResult {
    const ast = parse(code)
    return toIR(ast, true)
  }

  describe('Unknown Properties', () => {
    it('emits warning for unknown property', () => {
      const result = getIRWithWarnings('Box unknownprop 123')
      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0]).toMatchObject({
        type: 'unknown-property',
        property: 'unknownprop',
      })
    })

    it('emits warning for multiple unknown properties', () => {
      // Using unknown properties with values (standalone identifiers are parsed as initialState)
      const result = getIRWithWarnings(`
        Box foo 123
        Box bar 456
      `)
      expect(result.warnings.length).toBeGreaterThanOrEqual(2)
      const propNames = result.warnings.map(w => w.property)
      expect(propNames).toContain('foo')
      expect(propNames).toContain('bar')
    })

    it('does not emit warning for known properties', () => {
      const result = getIRWithWarnings('Box w 100 h 50 bg #333 pad 16')
      expect(result.warnings).toHaveLength(0)
    })

    it('does not emit warning for known aliases', () => {
      const result = getIRWithWarnings('Box hor gap 8 cen rad 8')
      expect(result.warnings).toHaveLength(0)
    })

    it('does not emit warning for content property', () => {
      const result = getIRWithWarnings('Text "Hello World"')
      expect(result.warnings).toHaveLength(0)
    })

    it('does not emit warning for non-CSS properties', () => {
      const result = getIRWithWarnings('Button "Click" type submit')
      // 'type' is a known non-CSS property
      expect(result.warnings.filter(w => w.property === 'type')).toHaveLength(0)
    })

    it('validates hover- prefix properties', () => {
      // hover-bg is valid (bg is known)
      const validResult = getIRWithWarnings('Box hover-bg #red')
      expect(validResult.warnings.filter(w => w.property === 'hover-bg')).toHaveLength(0)

      // hover-unknownprop is invalid
      const invalidResult = getIRWithWarnings('Box hover-unknownprop 123')
      expect(invalidResult.warnings).toHaveLength(1)
      expect(invalidResult.warnings[0].property).toBe('hover-unknownprop')
    })
  })

  describe('Valid Properties', () => {
    it('accepts all sizing properties', () => {
      const code = 'Box w 100 h 50 minw 10 maxw 200 minh 10 maxh 200 size 50'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all layout properties', () => {
      const code = 'Box hor ver gap 8 center spread wrap stacked grid 3'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all spacing properties', () => {
      const code = 'Box pad 16 margin 8 p 10 m 5'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all color properties', () => {
      const code = 'Box bg #333 col #fff boc #red'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all border properties', () => {
      const code = 'Box bor 1 #333 rad 8'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all typography properties', () => {
      const code = 'Text fs 16 weight bold line 1.5 italic underline'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all position properties', () => {
      const code = 'Box x 100 y 50 z 10 absolute fixed relative'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all transform properties', () => {
      const code = 'Box rotate 45 scale 1.2 translate 10 20'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all effect properties', () => {
      const code = 'Box opacity 0.5 shadow md cursor pointer blur 5 hidden'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })

    it('accepts all scroll properties', () => {
      const code = 'Box scroll scroll-hor scroll-both clip'
      const result = getIRWithWarnings(code)
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('Warnings Structure', () => {
    it('includes property name in warning', () => {
      const result = getIRWithWarnings('Box badprop 123')
      expect(result.warnings[0].property).toBe('badprop')
    })

    it('includes descriptive message', () => {
      const result = getIRWithWarnings('Box badprop 123')
      expect(result.warnings[0].message).toContain('badprop')
      expect(result.warnings[0].message).toContain('Unknown')
    })

    it('has correct warning type', () => {
      const result = getIRWithWarnings('Box badprop 123')
      expect(result.warnings[0].type).toBe('unknown-property')
    })

    it('avoids duplicate warnings', () => {
      // Using same unknown property twice should only emit one warning
      const result = getIRWithWarnings(`
        Box badprop 1
        Box badprop 2
      `)
      const badpropWarnings = result.warnings.filter(w => w.property === 'badprop')
      expect(badpropWarnings).toHaveLength(1)
    })
  })

  describe('Non-CSS Properties', () => {
    it('accepts data property', () => {
      const result = getIRWithWarnings('Box data tasks')
      expect(result.warnings.filter(w => w.property === 'data')).toHaveLength(0)
    })

    it('accepts src property', () => {
      const result = getIRWithWarnings('Image src "photo.jpg"')
      expect(result.warnings.filter(w => w.property === 'src')).toHaveLength(0)
    })

    it('accepts placeholder property', () => {
      const result = getIRWithWarnings('Input placeholder "Enter text"')
      expect(result.warnings.filter(w => w.property === 'placeholder')).toHaveLength(0)
    })

    it('accepts href property', () => {
      const result = getIRWithWarnings('Link href "/home"')
      expect(result.warnings.filter(w => w.property === 'href')).toHaveLength(0)
    })

    it('accepts animation properties', () => {
      const result = getIRWithWarnings('Box animation fade transition 0.3')
      const animWarnings = result.warnings.filter(w =>
        w.property === 'animation' || w.property === 'transition'
      )
      expect(animWarnings).toHaveLength(0)
    })
  })
})
