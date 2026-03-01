/**
 * Tests for DSL Schema
 *
 * Verifies:
 * - Schema contains all expected properties
 * - Property definitions are correct
 * - Helper functions work properly
 */

import { describe, it, expect } from 'vitest'
import {
  DSL_SCHEMA,
  getPropertyDefinition,
  getPropertyDefinitionByAnyName,
  normalizePropertyName,
  getAllPropertyNames,
  getAllFormsForProperty,
  supportsDirections,
  supportsCorners,
  getPropertiesByCategory,
  normalizeDirectionToLong,
  normalizeDirectionComboToLong,
  normalizeCornerToLong,
  buildShortToLongMap,
  isValidValue,
  isValidDirection,
  isValidCorner,
} from '../../dsl/dsl-schema'
import { PROPERTIES, PROPERTY_LONG_FORMS } from '../../dsl/properties'

describe('DSL Schema', () => {
  describe('Schema Completeness', () => {
    it('should contain core layout properties', () => {
      expect(DSL_SCHEMA.horizontal).toBeDefined()
      expect(DSL_SCHEMA.vertical).toBeDefined()
      expect(DSL_SCHEMA.center).toBeDefined()
      expect(DSL_SCHEMA.gap).toBeDefined()
      expect(DSL_SCHEMA.wrap).toBeDefined()
      expect(DSL_SCHEMA.stacked).toBeDefined()
    })

    it('should contain core spacing properties', () => {
      expect(DSL_SCHEMA.padding).toBeDefined()
      expect(DSL_SCHEMA.margin).toBeDefined()
    })

    it('should contain core color properties', () => {
      expect(DSL_SCHEMA.color).toBeDefined()
      expect(DSL_SCHEMA.background).toBeDefined()
      expect(DSL_SCHEMA['border-color']).toBeDefined()
    })

    it('should contain core border properties', () => {
      expect(DSL_SCHEMA.border).toBeDefined()
      expect(DSL_SCHEMA.radius).toBeDefined()
    })

    it('should contain core sizing properties', () => {
      expect(DSL_SCHEMA.width).toBeDefined()
      expect(DSL_SCHEMA.height).toBeDefined()
      expect(DSL_SCHEMA['min-width']).toBeDefined()
      expect(DSL_SCHEMA['max-width']).toBeDefined()
    })

    it('should contain hover properties', () => {
      expect(DSL_SCHEMA['hover-background']).toBeDefined()
      expect(DSL_SCHEMA['hover-color']).toBeDefined()
      expect(DSL_SCHEMA['hover-opacity']).toBeDefined()
    })
  })

  describe('Property Definitions', () => {
    it('should have correct structure for padding', () => {
      const padding = DSL_SCHEMA.padding
      expect(padding.name).toBe('padding')
      expect(padding.shortForms).toContain('pad')
      expect(padding.shortForms).toContain('p')
      expect(padding.category).toBe('spacing')
      expect(padding.valueType).toBe('number')
      expect(padding.directions?.supported).toBe(true)
      expect(padding.cssShorthand?.maxValues).toBe(4)
    })

    it('should have correct structure for background', () => {
      const bg = DSL_SCHEMA.background
      expect(bg.name).toBe('background')
      expect(bg.shortForms).toContain('bg')
      expect(bg.category).toBe('color')
      expect(bg.valueType).toBe('color')
      expect(bg.directions?.supported).toBeFalsy()
    })

    it('should have correct structure for radius', () => {
      const radius = DSL_SCHEMA.radius
      expect(radius.name).toBe('radius')
      expect(radius.shortForms).toContain('rad')
      expect(radius.corners?.supported).toBe(true)
      expect(radius.corners?.shortForms).toContain('tl')
      expect(radius.cssShorthand?.expansion).toBe('radius')
    })

    it('should have correct structure for border (compound)', () => {
      const border = DSL_SCHEMA.border
      expect(border.name).toBe('border')
      expect(border.valueType).toBe('compound')
      expect(border.compound?.components).toHaveLength(3)
      expect(border.compound?.order).toBe('any')
      expect(border.directions?.supported).toBe(true)
    })

    it('should have correct structure for opacity (with range)', () => {
      const opacity = DSL_SCHEMA.opacity
      expect(opacity.name).toBe('opacity')
      expect(opacity.range?.min).toBe(0)
      expect(opacity.range?.max).toBe(1)
    })
  })

  describe('getPropertyDefinition', () => {
    it('should find property by long name', () => {
      const def = getPropertyDefinition('padding')
      expect(def?.name).toBe('padding')
    })

    it('should NOT find property by short name (use getPropertyDefinitionByAnyName)', () => {
      // getPropertyDefinition only accepts long forms (for Parser)
      const def = getPropertyDefinition('pad')
      expect(def).toBeUndefined()

      // getPropertyDefinitionByAnyName accepts both (for validation/autocomplete)
      const defAny = getPropertyDefinitionByAnyName('pad')
      expect(defAny?.name).toBe('padding')
    })

    it('should return undefined for unknown property', () => {
      const def = getPropertyDefinition('unknown-property')
      expect(def).toBeUndefined()
    })
  })

  describe('normalizePropertyName', () => {
    it('should normalize short forms to long forms', () => {
      expect(normalizePropertyName('pad')).toBe('padding')
      expect(normalizePropertyName('bg')).toBe('background')
      expect(normalizePropertyName('rad')).toBe('radius')
      expect(normalizePropertyName('bor')).toBe('border')
      expect(normalizePropertyName('col')).toBe('color')
    })

    it('should keep long forms unchanged', () => {
      expect(normalizePropertyName('padding')).toBe('padding')
      expect(normalizePropertyName('background')).toBe('background')
      expect(normalizePropertyName('radius')).toBe('radius')
    })

    it('should keep unknown properties unchanged', () => {
      expect(normalizePropertyName('unknown')).toBe('unknown')
    })
  })

  describe('getAllPropertyNames', () => {
    it('should return all schema property names', () => {
      const names = getAllPropertyNames()
      expect(names).toContain('padding')
      expect(names).toContain('background')
      expect(names).toContain('border')
      expect(names).toContain('radius')
    })

    it('should not include short forms', () => {
      const names = getAllPropertyNames()
      expect(names).not.toContain('pad')
      expect(names).not.toContain('bg')
      expect(names).not.toContain('rad')
    })
  })

  describe('getAllFormsForProperty', () => {
    it('should return all forms for a property', () => {
      const forms = getAllFormsForProperty('padding')
      expect(forms).toContain('padding')
      expect(forms).toContain('pad')
      expect(forms).toContain('p')
    })

    it('should work with short form input', () => {
      const forms = getAllFormsForProperty('pad')
      expect(forms).toContain('padding')
      expect(forms).toContain('pad')
    })
  })

  describe('supportsDirections', () => {
    it('should return true for directional properties', () => {
      expect(supportsDirections('padding')).toBe(true)
      expect(supportsDirections('margin')).toBe(true)
      expect(supportsDirections('border')).toBe(true)
    })

    it('should return false for non-directional properties', () => {
      expect(supportsDirections('background')).toBe(false)
      expect(supportsDirections('color')).toBe(false)
      expect(supportsDirections('opacity')).toBe(false)
    })

    it('should work with short forms', () => {
      expect(supportsDirections('pad')).toBe(true)
      expect(supportsDirections('bg')).toBe(false)
    })
  })

  describe('supportsCorners', () => {
    it('should return true for radius', () => {
      expect(supportsCorners('radius')).toBe(true)
      expect(supportsCorners('rad')).toBe(true)
    })

    it('should return false for other properties', () => {
      expect(supportsCorners('padding')).toBe(false)
      expect(supportsCorners('background')).toBe(false)
    })
  })

  describe('getPropertiesByCategory', () => {
    it('should return properties for layout category', () => {
      const props = getPropertiesByCategory('layout')
      expect(props.some((p) => p.name === 'horizontal')).toBe(true)
      expect(props.some((p) => p.name === 'vertical')).toBe(true)
      expect(props.some((p) => p.name === 'gap')).toBe(true)
    })

    it('should return properties for spacing category', () => {
      const props = getPropertiesByCategory('spacing')
      expect(props.some((p) => p.name === 'padding')).toBe(true)
      expect(props.some((p) => p.name === 'margin')).toBe(true)
    })
  })

  describe('Direction Normalization', () => {
    it('should normalize short directions to long', () => {
      expect(normalizeDirectionToLong('l')).toBe('left')
      expect(normalizeDirectionToLong('r')).toBe('right')
      expect(normalizeDirectionToLong('u')).toBe('top')
      expect(normalizeDirectionToLong('d')).toBe('bottom')
      expect(normalizeDirectionToLong('t')).toBe('top')
      expect(normalizeDirectionToLong('b')).toBe('bottom')
    })

    it('should keep long directions unchanged', () => {
      expect(normalizeDirectionToLong('left')).toBe('left')
      expect(normalizeDirectionToLong('right')).toBe('right')
      expect(normalizeDirectionToLong('top')).toBe('top')
      expect(normalizeDirectionToLong('bottom')).toBe('bottom')
    })

    it('should normalize direction combos', () => {
      expect(normalizeDirectionComboToLong('l-r')).toBe('left-right')
      expect(normalizeDirectionComboToLong('u-d')).toBe('top-bottom')
      expect(normalizeDirectionComboToLong('lr')).toBe('left-right')
      expect(normalizeDirectionComboToLong('ud')).toBe('top-bottom')
    })
  })

  describe('Corner Normalization', () => {
    it('should normalize short corners to long', () => {
      expect(normalizeCornerToLong('tl')).toBe('top-left')
      expect(normalizeCornerToLong('tr')).toBe('top-right')
      expect(normalizeCornerToLong('bl')).toBe('bottom-left')
      expect(normalizeCornerToLong('br')).toBe('bottom-right')
    })

    it('should keep long corners unchanged', () => {
      expect(normalizeCornerToLong('top-left')).toBe('top-left')
      expect(normalizeCornerToLong('top-right')).toBe('top-right')
    })
  })

  describe('buildShortToLongMap', () => {
    it('should create a map of all short forms', () => {
      const map = buildShortToLongMap()
      expect(map.get('pad')).toBe('padding')
      expect(map.get('p')).toBe('padding')
      expect(map.get('bg')).toBe('background')
      expect(map.get('rad')).toBe('radius')
    })
  })

  describe('Value Validation', () => {
    it('should validate number values', () => {
      expect(isValidValue('padding', 12)).toBe(true)
      expect(isValidValue('opacity', 0.5)).toBe(true)
    })

    it('should validate range constraints', () => {
      expect(isValidValue('opacity', 0)).toBe(true)
      expect(isValidValue('opacity', 1)).toBe(true)
      expect(isValidValue('opacity', 1.5)).toBe(false)
      expect(isValidValue('opacity', -0.1)).toBe(false)
    })

    it('should validate color values', () => {
      expect(isValidValue('background', '#333')).toBe(true)
      expect(isValidValue('background', '$primary')).toBe(true)
    })

    it('should validate enum values', () => {
      expect(isValidValue('cursor', 'pointer')).toBe(true)
      expect(isValidValue('cursor', 'invalid-cursor')).toBe(false)
    })
  })

  describe('Direction Validation', () => {
    it('should validate directions for padding', () => {
      expect(isValidDirection('padding', 'left')).toBe(true)
      expect(isValidDirection('padding', 'right')).toBe(true)
      expect(isValidDirection('padding', 'l')).toBe(true)
      expect(isValidDirection('padding', 'l-r')).toBe(true)
      expect(isValidDirection('padding', 'left-right')).toBe(true)
    })

    it('should reject invalid directions', () => {
      expect(isValidDirection('padding', 'diagonal')).toBe(false)
      expect(isValidDirection('padding', 'tl')).toBe(false) // Corner, not direction
    })
  })

  describe('Corner Validation', () => {
    it('should validate corners for radius', () => {
      expect(isValidCorner('radius', 'tl')).toBe(true)
      expect(isValidCorner('radius', 'top-left')).toBe(true)
      expect(isValidCorner('radius', 'br')).toBe(true)
    })

    it('should reject invalid corners', () => {
      expect(isValidCorner('radius', 'invalid')).toBe(false)
    })

    it('should reject corners for non-corner properties', () => {
      expect(isValidCorner('padding', 'tl')).toBe(false)
    })
  })

  describe('Consistency with existing properties.ts', () => {
    it('should have definitions for common properties from PROPERTY_LONG_FORMS', () => {
      // Check that schema covers the main property mappings
      const mappingsToCheck = [
        ['pad', 'padding'],
        ['bg', 'background'],
        ['col', 'color'],
        ['rad', 'radius'],
        ['bor', 'border'],
      ] as const

      for (const [short, long] of mappingsToCheck) {
        // Use getPropertyDefinitionByAnyName since we're testing short form lookup
        const def = getPropertyDefinitionByAnyName(short)
        expect(def?.name).toBe(long)
      }
    })
  })
})
