/**
 * Style Composer Tests
 *
 * Tests for style composition utilities:
 * - Conditional style composition
 * - Final style merging
 * - Highlight styles for inspect mode
 */

import { describe, it, expect } from 'vitest'
import {
  composeConditionalStyles,
  composeFinalStyle,
  createHighlightStyle,
} from '../../../generator/styles/style-composer'
import { varCondition, compareCondition } from '../../kit/ast-builders'
import type { ConditionalProperty } from '../../../parser/parser'

describe('style-composer', () => {
  describe('composeConditionalStyles', () => {
    it('returns empty object for undefined conditionalProperties', () => {
      const result = composeConditionalStyles(undefined, {})
      expect(result).toEqual({})
    })

    it('returns empty object for empty conditionalProperties', () => {
      const result = composeConditionalStyles([], {})
      expect(result).toEqual({})
    })

    it('applies thenProperties when condition is true', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('isActive'),
        thenProperties: { bg: '#00F' },
        elseProperties: { bg: '#888' },
      }]

      const result = composeConditionalStyles(conditionalProps, { isActive: true })

      expect(result).toEqual({ backgroundColor: '#00F' })
    })

    it('applies elseProperties when condition is false', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('isActive'),
        thenProperties: { bg: '#00F' },
        elseProperties: { bg: '#888' },
      }]

      const result = composeConditionalStyles(conditionalProps, { isActive: false })

      expect(result).toEqual({ backgroundColor: '#888' })
    })

    it('returns empty when condition false and no elseProperties', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('isActive'),
        thenProperties: { bg: '#00F' },
      }]

      const result = composeConditionalStyles(conditionalProps, { isActive: false })

      expect(result).toEqual({})
    })

    it('converts bg to backgroundColor', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { bg: 'red' },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.backgroundColor).toBe('red')
    })

    it('converts col to color', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { col: 'blue' },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.color).toBe('blue')
    })

    it('converts w to width with px', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { w: 200 },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.width).toBe('200px')
    })

    it('converts h to height with px', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { h: 100 },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.height).toBe('100px')
    })

    it('converts pad to padding with px', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { pad: 16 },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.padding).toBe('16px')
    })

    it('converts rad to borderRadius with px', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { rad: 8 },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.borderRadius).toBe('8px')
    })

    it('converts border to border string', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { border: '1px solid red' },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.border).toBe('1px solid red')
    })

    it('converts op to opacity', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { op: 0.5 },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.opacity).toBe(0.5)
    })

    it('converts shadow to boxShadow', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { shadow: 4 },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.boxShadow).toBe('0 4px 8px rgba(0,0,0,0.15)')
    })

    it('handles multiple conditional properties', () => {
      const conditionalProps: ConditionalProperty[] = [
        {
          condition: varCondition('isActive'),
          thenProperties: { bg: 'blue' },
        },
        {
          condition: varCondition('isLarge'),
          thenProperties: { w: 300 },
        },
      ]

      const result = composeConditionalStyles(conditionalProps, {
        isActive: true,
        isLarge: true,
      })

      expect(result).toEqual({
        backgroundColor: 'blue',
        width: '300px',
      })
    })

    it('handles comparison conditions', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: compareCondition(varCondition('count'), '>', 10),
        thenProperties: { bg: 'green' },
        elseProperties: { bg: 'red' },
      }]

      const resultHigh = composeConditionalStyles(conditionalProps, { count: 15 })
      expect(resultHigh.backgroundColor).toBe('green')

      const resultLow = composeConditionalStyles(conditionalProps, { count: 5 })
      expect(resultLow.backgroundColor).toBe('red')
    })

    it('handles string values for width/height', () => {
      const conditionalProps: ConditionalProperty[] = [{
        condition: varCondition('show'),
        thenProperties: { w: '100%' },
      }]

      const result = composeConditionalStyles(conditionalProps, { show: true })

      expect(result.width).toBe('100%')
    })
  })

  describe('composeFinalStyle', () => {
    it('merges all style sources', () => {
      const highlightStyle = { outline: '2px solid blue' }
      const stateStyle = { backgroundColor: 'red' }
      const conditionalStyle = { opacity: 0.8 }
      const hoverStyle = { transform: 'scale(1.1)' }

      const result = composeFinalStyle(
        highlightStyle,
        stateStyle,
        conditionalStyle,
        hoverStyle,
        false
      )

      expect(result).toEqual({
        outline: '2px solid blue',
        backgroundColor: 'red',
        opacity: 0.8,
      })
    })

    it('includes hover styles when hovered', () => {
      const highlightStyle = {}
      const stateStyle = { color: 'black' }
      const conditionalStyle = {}
      const hoverStyle = { color: 'blue', textDecoration: 'underline' }

      const result = composeFinalStyle(
        highlightStyle,
        stateStyle,
        conditionalStyle,
        hoverStyle,
        true
      )

      expect(result).toEqual({
        color: 'blue',
        textDecoration: 'underline',
      })
    })

    it('does not include hover styles when not hovered', () => {
      const hoverStyle = { color: 'blue' }

      const result = composeFinalStyle({}, {}, {}, hoverStyle, false)

      expect(result.color).toBeUndefined()
    })

    it('does not apply empty hover styles even when hovered', () => {
      const baseStyle = { padding: '10px' }

      const result = composeFinalStyle(baseStyle, {}, {}, {}, true)

      expect(result).toEqual({ padding: '10px' })
    })

    it('later styles override earlier ones', () => {
      const highlightStyle = { color: 'red' }
      const stateStyle = { color: 'green' }
      const conditionalStyle = { color: 'blue' }

      const result = composeFinalStyle(
        highlightStyle,
        stateStyle,
        conditionalStyle,
        {},
        false
      )

      expect(result.color).toBe('blue')
    })

    it('hover styles override all others when hovered', () => {
      const highlightStyle = { color: 'red' }
      const stateStyle = { color: 'green' }
      const conditionalStyle = { color: 'blue' }
      const hoverStyle = { color: 'purple' }

      const result = composeFinalStyle(
        highlightStyle,
        stateStyle,
        conditionalStyle,
        hoverStyle,
        true
      )

      expect(result.color).toBe('purple')
    })
  })

  describe('createHighlightStyle', () => {
    it('returns base style when not hovered or selected', () => {
      const baseStyle = { padding: '8px', background: 'white' }

      const result = createHighlightStyle(baseStyle, false, false)

      expect(result).toEqual({
        padding: '8px',
        background: 'white',
        outline: undefined,
        outlineOffset: undefined,
        cursor: undefined,
      })
    })

    it('adds blue outline when hovered', () => {
      const baseStyle = { padding: '8px' }

      const result = createHighlightStyle(baseStyle, true, false)

      expect(result.outline).toBe('2px solid #3B82F6')
      expect(result.outlineOffset).toBe('2px')
    })

    it('adds green outline when selected', () => {
      const baseStyle = { padding: '8px' }

      const result = createHighlightStyle(baseStyle, false, true)

      expect(result.outline).toBe('2px solid #10B981')
      expect(result.outlineOffset).toBe('2px')
    })

    it('hovered takes precedence over selected', () => {
      const baseStyle = {}

      const result = createHighlightStyle(baseStyle, true, true)

      expect(result.outline).toBe('2px solid #3B82F6')
    })

    it('adds pointer cursor when in inspect mode', () => {
      const baseStyle = {}

      const result = createHighlightStyle(baseStyle, false, false, true)

      expect(result.cursor).toBe('pointer')
    })

    it('does not add cursor when not in inspect mode', () => {
      const baseStyle = {}

      const result = createHighlightStyle(baseStyle, false, false, false)

      expect(result.cursor).toBeUndefined()
    })

    it('preserves all base style properties', () => {
      const baseStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '8px',
        backgroundColor: '#fff',
      }

      const result = createHighlightStyle(baseStyle, true, false)

      expect(result.display).toBe('flex')
      expect(result.flexDirection).toBe('column')
      expect(result.gap).toBe('8px')
      expect(result.backgroundColor).toBe('#fff')
    })
  })
})
