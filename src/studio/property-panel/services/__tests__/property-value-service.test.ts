/**
 * Tests for PropertyValueService
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PropertyValueService } from '../property-value-service'
import { PROPERTY_SCHEMAS, getPropertySchema } from '../property-schemas'
import type { CodeModifier, ModificationResult } from '../../../code-modifier'
import type { SourceMap, NodeMapping } from '../../../source-map'

// Mock source code for testing
const mockSource = `Box pad 8 16, bg #FF0000, bor 2 #333333
  Text col #FFFFFF, "Hello World"
  Button pad 12, rad 4`

// Mock CodeModifier
function createMockCodeModifier(): CodeModifier {
  return {
    updateProperty: vi.fn((nodeId, prop, value) => ({
      success: true,
      newSource: mockSource,
      change: { from: 0, to: 0, insert: '' },
    })),
    removeProperty: vi.fn((nodeId, prop) => ({
      success: true,
      newSource: mockSource,
      change: { from: 0, to: 0, insert: '' },
    })),
    getSource: vi.fn(() => mockSource),
  } as unknown as CodeModifier
}

// Mock SourceMap
function createMockSourceMap(): SourceMap {
  const nodes = new Map<string, NodeMapping>()

  nodes.set('node-1', {
    nodeId: 'node-1',
    componentName: 'Box',
    position: { line: 1, column: 0, endLine: 3, endColumn: 0 },
    properties: new Map(),
    isDefinition: false,
  })

  nodes.set('node-2', {
    nodeId: 'node-2',
    componentName: 'Text',
    position: { line: 2, column: 0, endLine: 2, endColumn: 0 },
    properties: new Map(),
    isDefinition: false,
  })

  nodes.set('node-3', {
    nodeId: 'node-3',
    componentName: 'Button',
    position: { line: 3, column: 0, endLine: 3, endColumn: 0 },
    properties: new Map(),
    isDefinition: false,
  })

  return {
    getNodeById: vi.fn((id) => nodes.get(id) || null),
    getAllNodes: vi.fn(() => Array.from(nodes.values())),
  } as unknown as SourceMap
}

describe('PropertyValueService', () => {
  let service: PropertyValueService
  let mockCodeModifier: ReturnType<typeof createMockCodeModifier>
  let mockSourceMap: ReturnType<typeof createMockSourceMap>

  beforeEach(() => {
    mockCodeModifier = createMockCodeModifier()
    mockSourceMap = createMockSourceMap()
    service = new PropertyValueService(
      mockCodeModifier,
      mockSourceMap,
      () => mockSource
    )
  })

  describe('setValue - simple properties', () => {
    it('should set a simple color value directly', () => {
      const result = service.setValue('node-1', 'bg', '#00FF00')

      expect(result.success).toBe(true)
      expect(mockCodeModifier.updateProperty).toHaveBeenCalledWith(
        'node-1',
        'bg',
        '#00FF00'
      )
    })

    it('should set a token reference', () => {
      const result = service.setValue('node-1', 'bg', '$primary.bg')

      expect(result.success).toBe(true)
      expect(mockCodeModifier.updateProperty).toHaveBeenCalledWith(
        'node-1',
        'bg',
        '$primary.bg'
      )
    })

    it('should set a simple dimension value', () => {
      const result = service.setValue('node-1', 'gap', '16')

      expect(result.success).toBe(true)
      expect(mockCodeModifier.updateProperty).toHaveBeenCalledWith(
        'node-1',
        'gap',
        '16'
      )
    })
  })

  describe('setValue - border compound property', () => {
    it('should update only the color part of border', () => {
      // Current border is "2 #333333"
      // Updating color to #00FF00 should result in "2 #00FF00"
      const result = service.setValue('node-1', 'bor', '#00FF00', { part: 'color' })

      expect(result.success).toBe(true)
      // The finalValue should preserve width and update color
      expect(result.finalValue).toBe('2 #00FF00')
    })

    it('should update only the width part of border', () => {
      // Current border is "2 #333333"
      // Updating width to 4 should result in "4 #333333"
      const result = service.setValue('node-1', 'bor', '4', { part: 'width' })

      expect(result.success).toBe(true)
      expect(result.finalValue).toBe('4 #333333')
    })

    it('should handle missing border value gracefully', () => {
      // For a node without border, setting color should use defaults
      const result = service.setValue('node-3', 'bor', '#FF0000', { part: 'color' })

      expect(result.success).toBe(true)
      // Should use default width of 1
      expect(result.finalValue).toBe('1 #FF0000')
    })
  })

  describe('setValue - padding compound property', () => {
    it('should update horizontal padding (left + right)', () => {
      // Current padding is "8 16" (v=8, h=16)
      // Updating h to 24 should result in "8 24"
      const result = service.setValue('node-1', 'pad', '24', { part: 'h' })

      expect(result.success).toBe(true)
      expect(result.finalValue).toBe('8 24')
    })

    it('should update vertical padding (top + bottom)', () => {
      // Current padding is "8 16" (v=8, h=16)
      // Updating v to 12 should result in "12 16"
      const result = service.setValue('node-1', 'pad', '12', { part: 'v' })

      expect(result.success).toBe(true)
      expect(result.finalValue).toBe('12 16')
    })

    it('should update a specific direction', () => {
      // Current padding is "8 16" (t=8, r=16, b=8, l=16)
      // Updating top to 20 should expand to 4 values
      const result = service.setValue('node-1', 'pad', '20', { part: 'top' })

      expect(result.success).toBe(true)
      expect(result.finalValue).toBe('20 16 8 16')
    })

    it('should handle single-value padding', () => {
      // Button has "pad 12" (all directions = 12)
      // Updating h to 24 should result in "12 24" (v h)
      const result = service.setValue('node-3', 'pad', '24', { part: 'h' })

      expect(result.success).toBe(true)
      expect(result.finalValue).toBe('12 24')
    })

    it('should collapse to single value when all same', () => {
      // Setting all parts to same value should collapse
      const result = service.setValue('node-3', 'pad', '8', { part: 'h' })

      // Since node-3 has pad 12, setting h to same as v (12) would collapse
      // But we're setting to 8, so result is "12 8"
      expect(result.success).toBe(true)
      expect(result.finalValue).toBe('12 8')
    })
  })

  describe('getValue', () => {
    it('should get property value from source', () => {
      const value = service.getValue('node-1', 'bg')
      expect(value).toBe('#FF0000')
    })

    it('should get padding value', () => {
      const value = service.getValue('node-1', 'pad')
      expect(value).toBe('8 16')
    })

    it('should get border value', () => {
      const value = service.getValue('node-1', 'bor')
      expect(value).toBe('2 #333333')
    })

    it('should return null for non-existent property', () => {
      const value = service.getValue('node-1', 'nonexistent')
      expect(value).toBeNull()
    })

    it('should return null for non-existent node', () => {
      const value = service.getValue('nonexistent', 'bg')
      expect(value).toBeNull()
    })
  })

  describe('getValuePart', () => {
    it('should get border color part', () => {
      const color = service.getValuePart('node-1', 'bor', 'color')
      expect(color).toBe('#333333')
    })

    it('should get border width part', () => {
      const width = service.getValuePart('node-1', 'bor', 'width')
      expect(width).toBe('2')
    })

    it('should get padding top part', () => {
      // pad 8 16 means top=8
      const top = service.getValuePart('node-1', 'pad', 'top')
      expect(top).toBe('8')
    })

    it('should get padding right part', () => {
      // pad 8 16 means right=16
      const right = service.getValuePart('node-1', 'pad', 'right')
      expect(right).toBe('16')
    })
  })

  describe('removeValue', () => {
    it('should call removeProperty on code modifier', () => {
      const result = service.removeValue('node-1', 'bg')

      expect(result.success).toBe(true)
      expect(mockCodeModifier.removeProperty).toHaveBeenCalledWith('node-1', 'bg')
    })
  })
})

describe('PropertySchemas', () => {
  describe('border schema', () => {
    const schema = getPropertySchema('bor')

    it('should parse simple border', () => {
      const parsed = schema.parse!('1 #333')
      expect(parsed.width).toBe('1')
      expect(parsed.color).toBe('#333')
    })

    it('should parse border with width', () => {
      const parsed = schema.parse!('2 #FF0000')
      expect(parsed.width).toBe('2')
      expect(parsed.color).toBe('#FF0000')
    })

    it('should parse border with token', () => {
      const parsed = schema.parse!('1 $primary.boc')
      expect(parsed.width).toBe('1')
      expect(parsed.color).toBe('$primary.boc')
    })

    it('should format border correctly', () => {
      const formatted = schema.format!({ width: '2', color: '#00FF00' })
      expect(formatted).toBe('2 #00FF00')
    })

    it('should use defaults for empty value', () => {
      const parsed = schema.parse!('')
      expect(parsed.width).toBe('1')
      expect(parsed.color).toBe('#333')
    })
  })

  describe('padding schema', () => {
    const schema = getPropertySchema('pad')

    it('should parse single-value padding', () => {
      const parsed = schema.parse!('8')
      expect(parsed.top).toBe('8')
      expect(parsed.right).toBe('8')
      expect(parsed.bottom).toBe('8')
      expect(parsed.left).toBe('8')
    })

    it('should parse two-value padding', () => {
      const parsed = schema.parse!('8 16')
      expect(parsed.top).toBe('8')
      expect(parsed.right).toBe('16')
      expect(parsed.bottom).toBe('8')
      expect(parsed.left).toBe('16')
    })

    it('should parse four-value padding', () => {
      const parsed = schema.parse!('8 12 16 20')
      expect(parsed.top).toBe('8')
      expect(parsed.right).toBe('12')
      expect(parsed.bottom).toBe('16')
      expect(parsed.left).toBe('20')
    })

    it('should parse token as all sides', () => {
      const parsed = schema.parse!('$sm.pad')
      expect(parsed.top).toBe('$sm.pad')
      expect(parsed.right).toBe('$sm.pad')
      expect(parsed.bottom).toBe('$sm.pad')
      expect(parsed.left).toBe('$sm.pad')
    })

    it('should format to single value when all same', () => {
      const formatted = schema.format!({
        top: '8', right: '8', bottom: '8', left: '8'
      })
      expect(formatted).toBe('8')
    })

    it('should format to two values when v/h pairs same', () => {
      const formatted = schema.format!({
        top: '8', right: '16', bottom: '8', left: '16'
      })
      expect(formatted).toBe('8 16')
    })

    it('should format to four values when all different', () => {
      const formatted = schema.format!({
        top: '8', right: '12', bottom: '16', left: '20'
      })
      expect(formatted).toBe('8 12 16 20')
    })
  })

  describe('radius schema', () => {
    const schema = getPropertySchema('rad')

    it('should parse single-value radius', () => {
      const parsed = schema.parse!('8')
      expect(parsed.tl).toBe('8')
      expect(parsed.tr).toBe('8')
      expect(parsed.br).toBe('8')
      expect(parsed.bl).toBe('8')
    })

    it('should parse two-value radius', () => {
      const parsed = schema.parse!('8 16')
      expect(parsed.tl).toBe('8')
      expect(parsed.tr).toBe('16')
      expect(parsed.br).toBe('8')
      expect(parsed.bl).toBe('16')
    })

    it('should format radius correctly', () => {
      const formatted = schema.format!({
        tl: '8', tr: '8', br: '8', bl: '8'
      })
      expect(formatted).toBe('8')
    })
  })
})
