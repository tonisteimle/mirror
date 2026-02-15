/**
 * Property Corrector Tests
 *
 * Tests for the property correction module that fixes
 * typos and CSS syntax in Mirror DSL code.
 *
 * CRITICAL: Tests ensure that bg and col are NOT confused!
 * - bg/background = background color
 * - col/color = text color
 */

import { describe, it, expect } from 'vitest'
import { correctProperty } from '../../validation/correctors/property-corrector'

// ============================================================================
// Critical: No Color Confusion Tests
// ============================================================================

describe('property-corrector: color property handling', () => {
  describe('should NOT confuse background and color properties', () => {
    it('should NOT convert bg to col', () => {
      const result = correctProperty('bg')
      expect(result.corrected).not.toBe('col')
      expect(result.corrected).not.toBe('color')
      // bg is already valid, should return as-is
      expect(result.corrected).toBe('bg')
      expect(result.method).toBe('exact')
    })

    it('should NOT convert background to col', () => {
      const result = correctProperty('background')
      expect(result.corrected).not.toBe('col')
      expect(result.corrected).not.toBe('color')
      // background is already valid, should return as-is
      expect(result.corrected).toBe('background')
      expect(result.method).toBe('exact')
    })

    it('should NOT convert col to bg', () => {
      const result = correctProperty('col')
      expect(result.corrected).not.toBe('bg')
      expect(result.corrected).not.toBe('background')
      // col is already valid, should return as-is
      expect(result.corrected).toBe('col')
      expect(result.method).toBe('exact')
    })

    it('should NOT convert color to bg', () => {
      const result = correctProperty('color')
      expect(result.corrected).not.toBe('bg')
      expect(result.corrected).not.toBe('background')
      // color is already valid, should return as-is
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('exact')
    })
  })

  describe('should correctly map background typos to background', () => {
    it('should correct backgrnd to background', () => {
      const result = correctProperty('backgrnd')
      expect(result.corrected).toBe('background')
      expect(result.method).toBe('typo')
    })

    it('should correct backgr to background', () => {
      const result = correctProperty('backgr')
      expect(result.corrected).toBe('background')
      expect(result.method).toBe('typo')
    })

    it('should correct bckgrnd to background', () => {
      const result = correctProperty('bckgrnd')
      expect(result.corrected).toBe('background')
      expect(result.method).toBe('typo')
    })

    it('should correct bgcolor to background', () => {
      const result = correctProperty('bgcolor')
      expect(result.corrected).toBe('background')
      expect(result.method).toBe('typo')
    })
  })

  describe('should correctly map text color typos to color', () => {
    it('should correct colour to color', () => {
      const result = correctProperty('colour')
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('typo')
    })

    it('should correct clr to color', () => {
      const result = correctProperty('clr')
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('typo')
    })

    it('should correct colr to color', () => {
      const result = correctProperty('colr')
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('typo')
    })

    it('should correct txt to color', () => {
      const result = correctProperty('txt')
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('typo')
    })

    it('should correct textcolor to color', () => {
      const result = correctProperty('textcolor')
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('typo')
    })

    it('should correct text-color to color', () => {
      const result = correctProperty('text-color')
      expect(result.corrected).toBe('color')
      expect(result.method).toBe('typo')
    })
  })
})

// ============================================================================
// CSS to DSL Mapping Tests
// ============================================================================

describe('property-corrector: CSS to DSL mappings', () => {
  it('should convert background-color to background', () => {
    const result = correctProperty('background-color')
    expect(result.corrected).toBe('background')
    expect(result.method).toBe('css')
  })

  it('should convert border-radius to radius', () => {
    const result = correctProperty('border-radius')
    expect(result.corrected).toBe('radius')
    expect(result.method).toBe('css')
  })

  it('should convert font-size to size', () => {
    const result = correctProperty('font-size')
    expect(result.corrected).toBe('size')
    expect(result.method).toBe('css')
  })

  it('should convert font-weight to weight', () => {
    const result = correctProperty('font-weight')
    expect(result.corrected).toBe('weight')
    expect(result.method).toBe('css')
  })

  it('should convert flex-wrap to wrap', () => {
    const result = correctProperty('flex-wrap')
    expect(result.corrected).toBe('wrap')
    expect(result.method).toBe('css')
  })

  it('should convert row to horizontal', () => {
    const result = correctProperty('row')
    expect(result.corrected).toBe('horizontal')
    expect(result.method).toBe('css')
  })

  it('should convert column to vertical', () => {
    const result = correctProperty('column')
    expect(result.corrected).toBe('vertical')
    expect(result.method).toBe('css')
  })
})

// ============================================================================
// Valid Properties (Exact Match) Tests
// ============================================================================

describe('property-corrector: valid properties', () => {
  describe('should recognize short forms as valid', () => {
    const shortForms = ['pad', 'mar', 'col', 'bg', 'rad', 'bor', 'hor', 'ver', 'w', 'h', 'opa']

    shortForms.forEach((prop) => {
      it(`should recognize "${prop}" as valid`, () => {
        const result = correctProperty(prop)
        expect(result.corrected).toBe(prop)
        expect(result.method).toBe('exact')
        expect(result.confidence).toBe(1)
      })
    })
  })

  describe('should recognize long forms as valid', () => {
    const longForms = ['padding', 'margin', 'color', 'background', 'radius', 'border', 'horizontal', 'vertical', 'width', 'height', 'opacity']

    longForms.forEach((prop) => {
      it(`should recognize "${prop}" as valid`, () => {
        const result = correctProperty(prop)
        expect(result.corrected).toBe(prop)
        expect(result.method).toBe('exact')
        expect(result.confidence).toBe(1)
      })
    })
  })
})

// ============================================================================
// Common Typo Tests
// ============================================================================

describe('property-corrector: common typos', () => {
  it('should correct horizonal to horizontal', () => {
    const result = correctProperty('horizonal')
    expect(result.corrected).toBe('horizontal')
    expect(result.method).toBe('typo')
  })

  it('should correct verticle to vertical', () => {
    const result = correctProperty('verticle')
    expect(result.corrected).toBe('vertical')
    expect(result.method).toBe('typo')
  })

  it('should correct padd to padding', () => {
    const result = correctProperty('padd')
    expect(result.corrected).toBe('padding')
    expect(result.method).toBe('typo')
  })

  it('should correct marg to margin', () => {
    const result = correctProperty('marg')
    expect(result.corrected).toBe('margin')
    expect(result.method).toBe('typo')
  })

  it('should correct round to radius', () => {
    const result = correctProperty('round')
    expect(result.corrected).toBe('radius')
    expect(result.method).toBe('typo')
  })

  it('should correct rounded to radius', () => {
    const result = correctProperty('rounded')
    expect(result.corrected).toBe('radius')
    expect(result.method).toBe('typo')
  })

  it('should correct widt to width', () => {
    const result = correctProperty('widt')
    expect(result.corrected).toBe('width')
    expect(result.method).toBe('typo')
  })

  it('should correct heigh to height', () => {
    const result = correctProperty('heigh')
    expect(result.corrected).toBe('height')
    expect(result.method).toBe('typo')
  })

  it('should correct spacing to gap', () => {
    const result = correctProperty('spacing')
    expect(result.corrected).toBe('gap')
    expect(result.method).toBe('typo')
  })

  it('should correct opac to opacity', () => {
    const result = correctProperty('opac')
    expect(result.corrected).toBe('opacity')
    expect(result.method).toBe('typo')
  })
})

// ============================================================================
// Unknown Property Tests
// ============================================================================

describe('property-corrector: unknown properties', () => {
  it('should return null for completely unknown properties', () => {
    const result = correctProperty('xyzabc123')
    expect(result.corrected).toBeNull()
    expect(result.method).toBe('none')
    expect(result.confidence).toBe(0)
  })

  it('should use fuzzy matching for close typos', () => {
    // 'paddin' is close to 'padding' (1 char difference)
    const result = correctProperty('paddin')
    expect(result.corrected).not.toBeNull()
    expect(result.method).toBe('fuzzy')
  })
})
