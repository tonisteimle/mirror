/**
 * CSS Fixes Tests
 *
 * Tests for Phase 0 (CSS Cleanup) and Phase 1 (Color/Value) fixes.
 */

import { describe, it, expect } from 'vitest'
import {
  removeImportant,
  removeCssTransitions,
  removeCalcExpressions,
  fixCssNoneValues,
  removePxSuffix,
  removeUnsupportedUnits,
  removePropertyColons,
  // Newly tested
  convertCssPropertyNames,
  convertCamelCaseProperties,
  convertPercentageToFull,
} from '../../lib/self-healing/fixes/css-fixes'

import {
  convertRgbaToHex,
  convertNamedColorsToHex,
  convertCssShadowToSize,
  fixOpacityRange,
  fixBorderShorthand,
  fixBorderColorOnly,
  colorValueFixes,
  // Newly tested
  convertHslToHex,
  expandShortHex,
  addMissingHashToHex,
} from '../../lib/self-healing/fixes/color-fixes'

describe('CSS Cleanup Fixes (Phase 0)', () => {
  describe('removeImportant', () => {
    it('removes !important declarations', () => {
      expect(removeImportant('Box bg #F00 !important')).toBe('Box bg #F00')
      expect(removeImportant('color #333 !important')).toBe('color #333')
    })

    it('handles multiple !important', () => {
      expect(removeImportant('bg #F00 !important color #333 !important'))
        .toBe('bg #F00 color #333')
    })
  })

  describe('removeCssTransitions', () => {
    it('removes transition properties', () => {
      expect(removeCssTransitions('Box transition all 0.2s ease'))
        .toBe('Box ')
      expect(removeCssTransitions('Button transition background 0.3s'))
        .toBe('Button ')
    })
  })

  describe('removeCalcExpressions', () => {
    it('simplifies calc() to first number', () => {
      expect(removeCalcExpressions('width calc(100% - 32px)'))
        .toBe('width 100')
      expect(removeCalcExpressions('height calc(50vh - 16px)'))
        .toBe('height 50')
    })

    it('handles nested parentheses', () => {
      expect(removeCalcExpressions('width calc(100% - (16px + 16px))'))
        .toBe('width 100')
    })
  })

  describe('fixCssNoneValues', () => {
    it('converts border none to border 0', () => {
      expect(fixCssNoneValues('Box border none')).toBe('Box border 0')
    })

    it('removes outline none', () => {
      expect(fixCssNoneValues('Box outline none bg #F00')).toBe('Box bg #F00')
    })

    it('removes box-shadow none', () => {
      expect(fixCssNoneValues('Card box-shadow none')).toBe('Card')
    })
  })
})

describe('Color/Value Fixes (Phase 1)', () => {
  describe('convertRgbaToHex', () => {
    it('converts rgba to hex with alpha', () => {
      expect(convertRgbaToHex('bg rgba(0, 0, 0, 0.3)'))
        .toBe('bg #0000004D')
    })

    it('converts rgb to hex', () => {
      expect(convertRgbaToHex('bg rgb(255, 0, 0)'))
        .toBe('bg #FF0000')
    })

    it('converts rgba with full opacity to 6-char hex', () => {
      expect(convertRgbaToHex('bg rgba(30, 30, 46, 1)'))
        .toBe('bg #1E1E2E')
    })
  })

  describe('convertNamedColorsToHex', () => {
    it('converts common color names', () => {
      expect(convertNamedColorsToHex('bg white')).toBe('bg #FFFFFF')
      expect(convertNamedColorsToHex('color black')).toBe('color #000000')
      expect(convertNamedColorsToHex('bg red')).toBe('bg #FF0000')
    })

    it('only converts after color properties', () => {
      expect(convertNamedColorsToHex('Box white')).toBe('Box white')
      expect(convertNamedColorsToHex('Text "white"')).toBe('Text "white"')
    })

    it('handles transparent', () => {
      expect(convertNamedColorsToHex('bg transparent')).toBe('bg transparent')
    })
  })

  describe('convertCssShadowToSize', () => {
    it('converts CSS shadow to size keyword', () => {
      // blur ≤3 → sm, ≤8 → md, ≤15 → lg, >15 → xl
      expect(convertCssShadowToSize('shadow 0 2 3 #00000033')).toBe('shadow sm')
      expect(convertCssShadowToSize('shadow 0 4 8 #00000033')).toBe('shadow md')
      expect(convertCssShadowToSize('shadow 0 10 15 #00000033')).toBe('shadow lg')
      expect(convertCssShadowToSize('shadow 0 20 25 #00000033')).toBe('shadow xl')
    })

    it('handles px suffix in shadow values', () => {
      expect(convertCssShadowToSize('shadow 0px 4px 8px rgba(0,0,0,0.1)')).toBe('shadow md')
    })
  })

  describe('removePxSuffix', () => {
    it('removes px from numbers', () => {
      expect(removePxSuffix('width 200px height 100px')).toBe('width 200 height 100')
      expect(removePxSuffix('pad 16px')).toBe('pad 16')
    })

    it('preserves px inside strings', () => {
      expect(removePxSuffix('Text "16px wide"')).toBe('Text "16px wide"')
    })
  })

  describe('removeUnsupportedUnits', () => {
    it('converts rem to px', () => {
      expect(removeUnsupportedUnits('pad 1rem')).toBe('pad 16')
      expect(removeUnsupportedUnits('gap 0.5rem')).toBe('gap 8')
    })

    it('converts em to px', () => {
      expect(removeUnsupportedUnits('pad 1em')).toBe('pad 16')
    })

    it('converts vh/vw to percentage', () => {
      expect(removeUnsupportedUnits('height 100vh')).toBe('height 100%')
      expect(removeUnsupportedUnits('width 50vw')).toBe('width 50%')
    })
  })

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
  })

  describe('fixBorderShorthand', () => {
    it('fixes CSS border shorthand', () => {
      expect(fixBorderShorthand('border 1px solid #333'))
        .toBe('border 1 solid #333')
    })

    it('handles dashed borders', () => {
      expect(fixBorderShorthand('border 2px dashed #F00'))
        .toBe('border 2 dashed #F00')
    })
  })

  describe('fixBorderColorOnly', () => {
    it('converts border $token to border-color', () => {
      expect(fixBorderColorOnly('border $primary'))
        .toBe('border-color $primary')
    })

    it('converts border #color to border-color', () => {
      expect(fixBorderColorOnly('border #333'))
        .toBe('border-color #333')
    })

    it('leaves complete borders unchanged', () => {
      expect(fixBorderColorOnly('border 1 #333'))
        .toBe('border 1 #333')
    })
  })

  describe('removePropertyColons', () => {
    it('removes colons after properties', () => {
      expect(removePropertyColons('Box padding: 16')).toBe('Box padding 16')
      expect(removePropertyColons('Box bg: #F00')).toBe('Box bg #F00')
    })

    it('preserves component definition colons', () => {
      expect(removePropertyColons('Button: pad 16')).toBe('Button: pad 16')
    })
  })

  // =========================================================================
  // Additional CSS Fixes Tests
  // =========================================================================

  describe('convertCssPropertyNames', () => {
    it('converts background-color to bg', () => {
      expect(convertCssPropertyNames('Box background-color: #F00')).toBe('Box bg #F00')
    })

    it('converts font-size to fs', () => {
      expect(convertCssPropertyNames('Text font-size: 16')).toBe('Text fs 16')
    })

    it('converts border-radius to rad', () => {
      expect(convertCssPropertyNames('Card border-radius: 8')).toBe('Card rad 8')
    })

    it('converts padding-left to pad left', () => {
      expect(convertCssPropertyNames('Box padding-left: 16')).toBe('Box pad left 16')
    })

    it('converts font-weight to weight', () => {
      expect(convertCssPropertyNames('Text font-weight: bold')).toBe('Text weight bold')
    })
  })

  describe('convertCamelCaseProperties', () => {
    it('converts backgroundColor to bg', () => {
      expect(convertCamelCaseProperties('Box backgroundColor= #F00')).toBe('Box bg #F00')
    })

    it('converts borderRadius to rad', () => {
      expect(convertCamelCaseProperties('Card borderRadius: 8')).toBe('Card rad 8')
    })

    it('converts fontSize to fs', () => {
      expect(convertCamelCaseProperties('Text fontSize: 16')).toBe('Text fs 16')
    })

    it('removes flexDirection', () => {
      expect(convertCamelCaseProperties('Box flexDirection: row')).toBe('Box ')
    })

    it('converts flexGrow to width full', () => {
      expect(convertCamelCaseProperties('Box flexGrow: 1')).toBe('Box width full 1')
    })
  })

  describe('convertPercentageToFull', () => {
    it('converts width 100% to width full', () => {
      expect(convertPercentageToFull('Box width 100%')).toBe('Box width full')
    })

    it('converts height 100% to height full', () => {
      expect(convertPercentageToFull('Box height 100%')).toBe('Box height full')
    })

    it('converts width 100vw to width full', () => {
      expect(convertPercentageToFull('Box width 100vw')).toBe('Box width full')
    })

    it('converts height 100vh to height full', () => {
      expect(convertPercentageToFull('Box height 100vh')).toBe('Box height full')
    })

    it('preserves other percentages', () => {
      expect(convertPercentageToFull('Box width 50%')).toBe('Box width 50%')
    })
  })
})

describe('Color Fixes (Additional)', () => {
  describe('convertHslToHex', () => {
    it('converts hsl to hex', () => {
      // hsl(0, 100%, 50%) = red
      expect(convertHslToHex('bg hsl(0, 100%, 50%)')).toBe('bg #FF0000')
    })

    it('converts hsla with alpha', () => {
      expect(convertHslToHex('bg hsla(0, 100%, 50%, 0.5)')).toBe('bg #FF000080')
    })

    it('handles blue hsl', () => {
      // hsl(240, 100%, 50%) = blue
      expect(convertHslToHex('bg hsl(240, 100%, 50%)')).toBe('bg #0000FF')
    })
  })

  describe('expandShortHex', () => {
    it('expands 3-char hex to 6-char', () => {
      expect(expandShortHex('bg #F00')).toBe('bg #FF0000')
      expect(expandShortHex('bg #ABC')).toBe('bg #AABBCC')
    })

    it('preserves 6-char hex', () => {
      expect(expandShortHex('bg #FF0000')).toBe('bg #FF0000')
    })

    it('handles lowercase', () => {
      expect(expandShortHex('bg #abc')).toBe('bg #AABBCC')
    })
  })

  describe('addMissingHashToHex', () => {
    it('adds hash to 6-char hex', () => {
      expect(addMissingHashToHex('bg FF0000')).toBe('bg #FF0000')
    })

    it('adds hash to 3-char hex', () => {
      expect(addMissingHashToHex('bg F00')).toBe('bg #F00')
    })

    it('preserves existing hash', () => {
      expect(addMissingHashToHex('bg #FF0000')).toBe('bg #FF0000')
    })

    it('only adds to color properties', () => {
      expect(addMissingHashToHex('Box 300')).toBe('Box 300')
    })
  })
})
