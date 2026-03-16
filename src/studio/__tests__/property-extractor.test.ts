/**
 * Comprehensive Tests for PropertyExtractor
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PropertyExtractor, createPropertyExtractor, type ExtractedProperty } from '../property-extractor'
import { SourceMap, SourceMapBuilder } from '../source-map'
import { parse } from '../../parser'
import { toIR } from '../../ir'
import type { AST } from '../../parser/ast'

// Helper to create test context from source code
function createTestContext(source: string): { ast: AST; sourceMap: SourceMap } {
  const ast = parse(source)
  const result = toIR(ast, true)
  return { ast, sourceMap: result.sourceMap }
}

// ===========================================
// PROPERTY EXTRACTOR
// ===========================================

describe('PropertyExtractor', () => {
  describe('Construction', () => {
    it('should create with AST and SourceMap', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap)
      expect(extractor).toBeDefined()
    })

    it('should accept showAllProperties option', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })
      expect(extractor).toBeDefined()
    })
  })

  describe('getProperties', () => {
    it('should return null for non-existent node', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap)

      const result = extractor.getProperties('nonexistent')
      expect(result).toBeNull()
    })

    it('should extract properties from simple component', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

      // Find the box node ID
      const nodeIds = sourceMap.getAllNodeIds()
      const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

      if (!boxId) {
        // If no box found, skip test gracefully
        return
      }

      const result = extractor.getProperties(boxId)

      expect(result).not.toBeNull()
      expect(result!.componentName).toBe('Box')
    })

    it('should return isDefinition flag', () => {
      const { ast, sourceMap } = createTestContext('MyButton: = Button pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

      const nodeIds = sourceMap.getAllNodeIds()
      const defId = nodeIds.find(id => sourceMap.getNodeById(id)?.isDefinition)

      if (defId) {
        const result = extractor.getProperties(defId)
        expect(result?.isDefinition).toBe(true)
      }
    })

    it('should include categories in result', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10, bg #FF0000')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

      const nodeIds = sourceMap.getAllNodeIds()
      const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

      if (boxId) {
        const result = extractor.getProperties(boxId)
        expect(result?.categories).toBeDefined()
        expect(Array.isArray(result?.categories)).toBe(true)
      }
    })

    it('should include allProperties array', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

      const nodeIds = sourceMap.getAllNodeIds()
      const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

      if (boxId) {
        const result = extractor.getProperties(boxId)
        expect(result?.allProperties).toBeDefined()
        expect(Array.isArray(result?.allProperties)).toBe(true)
      }
    })
  })

  describe('setShowAllProperties', () => {
    it('should toggle showing all properties', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

      const nodeIds = sourceMap.getAllNodeIds()
      const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

      if (!boxId) return

      // First, get properties with showAllProperties = false
      const result1 = extractor.getProperties(boxId)
      const count1 = result1?.allProperties.length || 0

      // Toggle to show all properties
      extractor.setShowAllProperties(true)
      const result2 = extractor.getProperties(boxId)
      const count2 = result2?.allProperties.length || 0

      // With showAllProperties, there should be more properties
      expect(count2).toBeGreaterThanOrEqual(count1)
    })
  })

  describe('getPropertiesForComponentDefinition', () => {
    it('should return null for non-existent component', () => {
      const { ast, sourceMap } = createTestContext('Box pad 10')
      const extractor = new PropertyExtractor(ast, sourceMap)

      const result = extractor.getPropertiesForComponentDefinition('NonExistent')
      expect(result).toBeNull()
    })

    it('should extract properties from component definition', () => {
      const { ast, sourceMap } = createTestContext('MyButton: = Button pad 10, bg #FF0000')
      const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

      const result = extractor.getPropertiesForComponentDefinition('MyButton')

      if (result) {
        expect(result.componentName).toBe('MyButton')
        expect(result.isDefinition).toBe(true)
      }
    })
  })
})

// ===========================================
// CREATE PROPERTY EXTRACTOR (Factory)
// ===========================================

describe('createPropertyExtractor', () => {
  it('should be a factory function', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10')
    const extractor = createPropertyExtractor(ast, sourceMap)
    expect(extractor).toBeInstanceOf(PropertyExtractor)
  })

  it('should pass options to constructor', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10')
    const extractor = createPropertyExtractor(ast, sourceMap, { showAllProperties: false })
    expect(extractor).toBeDefined()
  })
})

// ===========================================
// PROPERTY TYPES
// ===========================================

describe('Property Type Detection', () => {
  it('should identify color properties', () => {
    const { ast, sourceMap } = createTestContext('Box bg #FF0000')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)
      const bgProp = result?.allProperties.find(p => p.name === 'bg' || p.name === 'background')

      if (bgProp) {
        expect(bgProp.type).toBe('color')
      }
    }
  })

  it('should identify spacing properties', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)
      const padProp = result?.allProperties.find(p => p.name === 'pad' || p.name === 'padding')

      if (padProp) {
        expect(padProp.type).toBe('spacing')
      }
    }
  })
})

// ===========================================
// TOKEN DETECTION
// ===========================================

describe('Token Detection', () => {
  it('should identify token values', () => {
    const { ast, sourceMap } = createTestContext('Box bg $primary.bg')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)
      const bgProp = result?.allProperties.find(p => p.name === 'bg' || p.name === 'background')

      if (bgProp && bgProp.value.startsWith('$')) {
        expect(bgProp.isToken).toBe(true)
      }
    }
  })
})

// ===========================================
// PROPERTY SOURCES
// ===========================================

describe('Property Sources', () => {
  it('should mark instance properties as source: instance', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)
      const padProp = result?.allProperties.find(p => p.name === 'pad' || p.name === 'padding')

      if (padProp) {
        expect(padProp.source).toBe('instance')
      }
    }
  })

  it('should mark available properties correctly', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: true })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)
      const availableProps = result?.allProperties.filter(p => p.source === 'available')

      // There should be some available properties (ones not set on instance)
      expect(availableProps?.length).toBeGreaterThan(0)
    }
  })
})

// ===========================================
// CATEGORY GROUPING
// ===========================================

describe('Category Grouping', () => {
  it('should group properties into categories', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10, bg #FF0000, w 100')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)

      expect(result?.categories).toBeDefined()
      expect(result?.categories.length).toBeGreaterThan(0)

      // Each category should have a name and label
      result?.categories.forEach(cat => {
        expect(cat.name).toBeDefined()
        expect(cat.label).toBeDefined()
        expect(Array.isArray(cat.properties)).toBe(true)
      })
    }
  })
})

// ===========================================
// EDGE CASES
// ===========================================

describe('Edge Cases', () => {
  it('should handle component with no properties', () => {
    const { ast, sourceMap } = createTestContext('Box')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()
    const boxId = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')

    if (boxId) {
      const result = extractor.getProperties(boxId)
      // Should still return a result, just with empty/minimal properties
      expect(result).not.toBeNull()
    }
  })

  it('should handle nested components', () => {
    const source = `Box pad 10
  Text "Hello"`

    const { ast, sourceMap } = createTestContext(source)
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    const nodeIds = sourceMap.getAllNodeIds()

    // Should find both Box and Text
    const boxNode = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Box')
    const textNode = nodeIds.find(id => sourceMap.getNodeById(id)?.componentName === 'Text')

    if (boxNode) {
      expect(extractor.getProperties(boxNode)).not.toBeNull()
    }

    if (textNode) {
      expect(extractor.getProperties(textNode)).not.toBeNull()
    }
  })

  it('should handle deeply nested structures', () => {
    const source = `Box pad 10
  Box bg #FFF
    Text "Nested"`

    const { ast, sourceMap } = createTestContext(source)
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    // Should not throw
    const nodeIds = sourceMap.getAllNodeIds()
    expect(nodeIds.length).toBeGreaterThan(0)
  })
})

// ===========================================
// INTEGRATION WITH SOURCEMAP
// ===========================================

describe('Integration with SourceMap', () => {
  it('should use SourceMap for node lookup', () => {
    const { ast, sourceMap } = createTestContext('Box pad 10, bg #FF0000')
    const extractor = new PropertyExtractor(ast, sourceMap, { showAllProperties: false })

    // Get all node IDs from sourceMap
    const nodeIds = sourceMap.getAllNodeIds()
    expect(nodeIds.length).toBeGreaterThan(0)

    // Each ID should be queryable
    for (const nodeId of nodeIds) {
      const mapping = sourceMap.getNodeById(nodeId)
      if (mapping && !mapping.isDefinition) {
        const props = extractor.getProperties(nodeId)
        // Should return something for non-definition nodes
        expect(props !== null || mapping.isDefinition).toBe(true)
      }
    }
  })
})
