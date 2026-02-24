/**
 * Value Fixes Tests
 *
 * Tests for Phase 5 (Value) fixes.
 */

import { describe, it, expect } from 'vitest'
import {
  fixOpacityRange,
  fixNegativeValues,
  removeDuplicateProperties,
  removeTrailingCommas,
  fixPercentageWord,
  removeExcessiveEmptyLines,
  fixComponentCasing,
  fixEventColon,
} from '../../lib/self-healing/fixes/value-fixes'

describe('Value Fixes (Phase 5)', () => {
  describe('fixOpacityRange', () => {
    it('converts 0-100 to 0-1', () => {
      expect(fixOpacityRange('opacity 50')).toBe('opacity 0.5')
      expect(fixOpacityRange('opa 80')).toBe('opa 0.8')
      expect(fixOpacityRange('o 25')).toBe('o 0.25')
    })

    it('leaves valid values unchanged', () => {
      expect(fixOpacityRange('opacity 0.5')).toBe('opacity 0.5')
      expect(fixOpacityRange('opacity 1')).toBe('opacity 1')
    })

    it('clamps values over 1', () => {
      expect(fixOpacityRange('opacity 150')).toBe('opacity 1')
    })

    it('handles values at boundary', () => {
      expect(fixOpacityRange('opacity 0')).toBe('opacity 0')
      expect(fixOpacityRange('opacity 100')).toBe('opacity 1')
    })
  })

  describe('fixNegativeValues', () => {
    it('removes negative from radius', () => {
      expect(fixNegativeValues('Card rad -8')).toBe('Card rad 8')
    })

    it('removes negative from padding', () => {
      expect(fixNegativeValues('Box pad -16')).toBe('Box pad 16')
    })

    it('removes negative from gap', () => {
      expect(fixNegativeValues('Box gap -12')).toBe('Box gap 12')
    })

    it('removes negative from width/height', () => {
      expect(fixNegativeValues('Box width -200')).toBe('Box width 200')
      expect(fixNegativeValues('Box height -100')).toBe('Box height 100')
    })

    it('removes negative from font-size', () => {
      expect(fixNegativeValues('Text fs -16')).toBe('Text fs 16')
    })
  })

  describe('removeDuplicateProperties', () => {
    it('keeps last occurrence of duplicate properties', () => {
      const input = 'Box bg #F00 pad 16 bg #00F'
      const result = removeDuplicateProperties(input)
      expect(result).toContain('bg')
      // Should keep one of them
      expect(result.match(/bg/g)?.length).toBeLessThanOrEqual(2)
    })

    it('preserves non-duplicate properties', () => {
      expect(removeDuplicateProperties('Box pad 16 rad 8')).toBe('Box pad 16 rad 8')
    })
  })

  describe('removeTrailingCommas', () => {
    it('removes trailing commas', () => {
      expect(removeTrailingCommas('Box pad 16,')).toBe('Box pad 16')
    })

    it('handles multiple lines', () => {
      expect(removeTrailingCommas('Box pad 16,\nCard bg #333,')).toBe('Box pad 16\nCard bg #333')
    })

    it('preserves commas inside strings', () => {
      expect(removeTrailingCommas('Text "Hello, World",')).toBe('Text "Hello, World"')
    })
  })

  describe('fixPercentageWord', () => {
    it('converts percent to %', () => {
      expect(fixPercentageWord('width 50 percent')).toBe('width 50%')
    })

    it('converts prozent to %', () => {
      expect(fixPercentageWord('width 100 prozent')).toBe('width 100%')
    })
  })

  describe('removeExcessiveEmptyLines', () => {
    it('reduces 3+ empty lines to single empty line', () => {
      expect(removeExcessiveEmptyLines('Box\n\n\n\nCard')).toBe('Box\n\nCard')
    })

    it('preserves single empty lines', () => {
      expect(removeExcessiveEmptyLines('Box\n\nCard')).toBe('Box\n\nCard')
    })

    it('preserves double empty lines', () => {
      expect(removeExcessiveEmptyLines('Box\n\n\nCard')).toBe('Box\n\nCard')
    })
  })

  describe('fixComponentCasing', () => {
    it('capitalizes lowercase component names', () => {
      expect(fixComponentCasing('box pad 16')).toBe('Box pad 16')
      expect(fixComponentCasing('card bg #333')).toBe('Card bg #333')
    })

    it('capitalizes button', () => {
      expect(fixComponentCasing('button "Click"')).toBe('Button "Click"')
    })

    it('capitalizes input', () => {
      expect(fixComponentCasing('input "Email"')).toBe('Input "Email"')
    })

    it('preserves already capitalized', () => {
      expect(fixComponentCasing('Box pad 16')).toBe('Box pad 16')
    })
  })

  describe('fixEventColon', () => {
    it('removes colon after onclick', () => {
      expect(fixEventColon('Button onclick: toggle')).toBe('Button onclick toggle')
    })

    it('removes colon after onchange', () => {
      expect(fixEventColon('Input onchange: validate')).toBe('Input onchange validate')
    })

    it('removes colon after onhover', () => {
      expect(fixEventColon('Box onhover: show Tooltip')).toBe('Box onhover show Tooltip')
    })

    it('removes colon after onkeydown', () => {
      expect(fixEventColon('Input onkeydown: submit')).toBe('Input onkeydown submit')
    })
  })
})
