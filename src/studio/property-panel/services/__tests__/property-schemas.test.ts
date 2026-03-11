/**
 * Tests for PropertySchemas
 */

import { describe, it, expect } from 'vitest'
import {
  PROPERTY_SCHEMAS,
  getPropertySchema,
  getCanonicalPropertyName,
  isCompoundProperty
} from '../property-schemas'

describe('PropertySchemas', () => {
  describe('getPropertySchema', () => {
    it('should return schema for known property', () => {
      const schema = getPropertySchema('bg')
      expect(schema.name).toBe('bg')
      expect(schema.canonicalName).toBe('background')
      expect(schema.type).toBe('color')
    })

    it('should return default schema for unknown property', () => {
      const schema = getPropertySchema('unknown-prop')
      expect(schema.name).toBe('unknown-prop')
      expect(schema.canonicalName).toBe('unknown-prop')
      expect(schema.type).toBe('string')
    })

    it('should return schema for alias', () => {
      const schema = getPropertySchema('c')
      expect(schema.canonicalName).toBe('color')
    })
  })

  describe('getCanonicalPropertyName', () => {
    it('should return canonical name for alias', () => {
      expect(getCanonicalPropertyName('bg')).toBe('background')
      expect(getCanonicalPropertyName('col')).toBe('color')
      expect(getCanonicalPropertyName('c')).toBe('color')
      expect(getCanonicalPropertyName('pad')).toBe('padding')
      expect(getCanonicalPropertyName('bor')).toBe('border')
    })

    it('should return same name for canonical property', () => {
      expect(getCanonicalPropertyName('background')).toBe('background')
      expect(getCanonicalPropertyName('color')).toBe('color')
    })

    it('should return same name for unknown property', () => {
      expect(getCanonicalPropertyName('unknown')).toBe('unknown')
    })
  })

  describe('isCompoundProperty', () => {
    it('should return true for compound properties', () => {
      expect(isCompoundProperty('bor')).toBe(true)
      expect(isCompoundProperty('border')).toBe(true)
      expect(isCompoundProperty('pad')).toBe(true)
      expect(isCompoundProperty('padding')).toBe(true)
      expect(isCompoundProperty('rad')).toBe(true)
    })

    it('should return false for simple properties', () => {
      expect(isCompoundProperty('bg')).toBe(false)
      expect(isCompoundProperty('col')).toBe(false)
      expect(isCompoundProperty('gap')).toBe(false)
    })
  })

  describe('border parsing', () => {
    const schema = getPropertySchema('bor')

    it('should parse width and color', () => {
      expect(schema.parse!('1 #333')).toEqual({
        width: '1',
        color: '#333'
      })
    })

    it('should parse width 0', () => {
      expect(schema.parse!('0 #000')).toEqual({
        width: '0',
        color: '#000'
      })
    })

    it('should parse large width', () => {
      expect(schema.parse!('10 #FF0000')).toEqual({
        width: '10',
        color: '#FF0000'
      })
    })

    it('should handle token color', () => {
      expect(schema.parse!('2 $border.color')).toEqual({
        width: '2',
        color: '$border.color'
      })
    })

    it('should use defaults for empty string', () => {
      expect(schema.parse!('')).toEqual({
        width: '1',
        color: '#333'
      })
    })

    it('should handle width-only input', () => {
      expect(schema.parse!('3')).toEqual({
        width: '3',
        color: '#333'
      })
    })

    it('should handle color-only input', () => {
      expect(schema.parse!('#FF0000')).toEqual({
        width: '1',
        color: '#FF0000'
      })
    })
  })

  describe('border formatting', () => {
    const schema = getPropertySchema('bor')

    it('should format width and color', () => {
      expect(schema.format!({ width: '2', color: '#FF0000' })).toBe('2 #FF0000')
    })

    it('should use defaults', () => {
      expect(schema.format!({ width: '1', color: '#333' })).toBe('1 #333')
    })

    it('should handle token', () => {
      expect(schema.format!({ width: '1', color: '$primary.boc' })).toBe('1 $primary.boc')
    })
  })

  describe('padding parsing', () => {
    const schema = getPropertySchema('pad')

    it('should parse single value to all sides', () => {
      const result = schema.parse!('8')
      expect(result).toEqual({
        top: '8', right: '8', bottom: '8', left: '8'
      })
    })

    it('should parse two values to v/h', () => {
      const result = schema.parse!('8 16')
      expect(result).toEqual({
        top: '8', right: '16', bottom: '8', left: '16'
      })
    })

    it('should parse four values individually', () => {
      const result = schema.parse!('4 8 12 16')
      expect(result).toEqual({
        top: '4', right: '8', bottom: '12', left: '16'
      })
    })

    it('should parse token to all sides', () => {
      const result = schema.parse!('$sm.pad')
      expect(result).toEqual({
        top: '$sm.pad', right: '$sm.pad', bottom: '$sm.pad', left: '$sm.pad'
      })
    })

    it('should handle empty value', () => {
      const result = schema.parse!('')
      expect(result).toEqual({
        top: '', right: '', bottom: '', left: ''
      })
    })
  })

  describe('padding formatting', () => {
    const schema = getPropertySchema('pad')

    it('should collapse to single value when all same', () => {
      expect(schema.format!({
        top: '8', right: '8', bottom: '8', left: '8'
      })).toBe('8')
    })

    it('should collapse to two values when v/h pairs match', () => {
      expect(schema.format!({
        top: '8', right: '16', bottom: '8', left: '16'
      })).toBe('8 16')
    })

    it('should use four values when all different', () => {
      expect(schema.format!({
        top: '4', right: '8', bottom: '12', left: '16'
      })).toBe('4 8 12 16')
    })

    it('should use four values when only top differs', () => {
      expect(schema.format!({
        top: '4', right: '8', bottom: '8', left: '8'
      })).toBe('4 8 8 8')
    })

    it('should handle token', () => {
      expect(schema.format!({
        top: '$sm', right: '$sm', bottom: '$sm', left: '$sm'
      })).toBe('$sm')
    })

    it('should handle empty values', () => {
      expect(schema.format!({
        top: '', right: '', bottom: '', left: ''
      })).toBe('')
    })
  })

  describe('radius parsing', () => {
    const schema = getPropertySchema('rad')

    it('should parse single value to all corners', () => {
      const result = schema.parse!('8')
      expect(result).toEqual({
        tl: '8', tr: '8', br: '8', bl: '8'
      })
    })

    it('should parse two values diagonally', () => {
      const result = schema.parse!('8 16')
      expect(result).toEqual({
        tl: '8', tr: '16', br: '8', bl: '16'
      })
    })

    it('should parse four values individually', () => {
      const result = schema.parse!('4 8 12 16')
      expect(result).toEqual({
        tl: '4', tr: '8', br: '12', bl: '16'
      })
    })

    it('should parse special value 999', () => {
      const result = schema.parse!('999')
      expect(result).toEqual({
        tl: '999', tr: '999', br: '999', bl: '999'
      })
    })
  })

  describe('radius formatting', () => {
    const schema = getPropertySchema('rad')

    it('should collapse to single value', () => {
      expect(schema.format!({
        tl: '8', tr: '8', br: '8', bl: '8'
      })).toBe('8')
    })

    it('should collapse to two values for diagonal pairs', () => {
      expect(schema.format!({
        tl: '8', tr: '16', br: '8', bl: '16'
      })).toBe('8 16')
    })

    it('should use four values when needed', () => {
      expect(schema.format!({
        tl: '4', tr: '8', br: '12', bl: '16'
      })).toBe('4 8 12 16')
    })
  })

  describe('color validation', () => {
    const schema = getPropertySchema('bg')

    it('should validate hex colors', () => {
      expect(schema.validate!('#FFF')).toBe(true)
      expect(schema.validate!('#FFFFFF')).toBe(true)
      expect(schema.validate!('#ff0000')).toBe(true)
    })

    it('should validate token references', () => {
      expect(schema.validate!('$primary.bg')).toBe(true)
      expect(schema.validate!('$surface')).toBe(true)
    })

    it('should validate empty string', () => {
      expect(schema.validate!('')).toBe(true)
    })

    it('should reject invalid colors', () => {
      expect(schema.validate!('red')).toBe(false)
      expect(schema.validate!('rgb(255,0,0)')).toBe(false)
    })
  })

  describe('spacing validation', () => {
    const schema = getPropertySchema('pad')

    it('should validate numeric values', () => {
      expect(schema.validate!('8')).toBe(true)
      expect(schema.validate!('8 16')).toBe(true)
      expect(schema.validate!('8 16 24 32')).toBe(true)
    })

    it('should validate token values', () => {
      expect(schema.validate!('$sm.pad')).toBe(true)
    })

    it('should validate empty', () => {
      expect(schema.validate!('')).toBe(true)
    })
  })
})
