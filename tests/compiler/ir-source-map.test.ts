/**
 * Comprehensive Tests for SourceMap
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  SourceMap,
  SourceMapBuilder,
  calculateSourcePosition,
  calculatePropertyPosition,
  type NodeMapping,
} from '../../src/ir/source-map'

// ===========================================
// SOURCEMAP CLASS
// ===========================================

describe('SourceMap', () => {
  let sourceMap: SourceMap

  beforeEach(() => {
    sourceMap = new SourceMap()
  })

  describe('addNode / getNodeById', () => {
    it('should add and retrieve a node', () => {
      const mapping: NodeMapping = {
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      }

      sourceMap.addNode(mapping)
      const retrieved = sourceMap.getNodeById('box-1')

      expect(retrieved).not.toBeNull()
      expect(retrieved!.nodeId).toBe('box-1')
      expect(retrieved!.componentName).toBe('Box')
    })

    it('should return null for non-existent node', () => {
      const result = sourceMap.getNodeById('non-existent')
      expect(result).toBeNull()
    })

    it('should handle template instance IDs', () => {
      const mapping: NodeMapping = {
        nodeId: 'item-1',
        componentName: 'Item',
        position: { line: 5, column: 1, endLine: 5, endColumn: 20 },
        properties: new Map(),
        isDefinition: false,
        isEachTemplate: true,
      }

      sourceMap.addNode(mapping)

      // Direct lookup
      expect(sourceMap.getNodeById('item-1')).not.toBeNull()

      // Template instance lookup should fall back to template
      expect(sourceMap.getNodeById('item-1[0]')).not.toBeNull()
      expect(sourceMap.getNodeById('item-1[5]')).not.toBeNull()
    })
  })

  describe('getTemplateId', () => {
    it('should extract template ID from instance ID', () => {
      expect(sourceMap.getTemplateId('node-5[2]')).toBe('node-5')
      expect(sourceMap.getTemplateId('item-1[0]')).toBe('item-1')
      expect(sourceMap.getTemplateId('box-10[123]')).toBe('box-10')
    })

    it('should return same ID if not a template instance', () => {
      expect(sourceMap.getTemplateId('node-5')).toBe('node-5')
      expect(sourceMap.getTemplateId('box-1')).toBe('box-1')
    })
  })

  describe('isTemplateInstance', () => {
    it('should return true for template instances', () => {
      expect(sourceMap.isTemplateInstance('node-5[2]')).toBe(true)
      expect(sourceMap.isTemplateInstance('item[0]')).toBe(true)
    })

    it('should return false for non-template IDs', () => {
      expect(sourceMap.isTemplateInstance('node-5')).toBe(false)
      expect(sourceMap.isTemplateInstance('box-1')).toBe(false)
    })
  })

  describe('getPropertyPosition', () => {
    it('should return property position', () => {
      const mapping: NodeMapping = {
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 20 },
        properties: new Map([
          ['bg', { line: 1, column: 5, endLine: 1, endColumn: 15 }],
        ]),
        isDefinition: false,
      }

      sourceMap.addNode(mapping)
      const propPos = sourceMap.getPropertyPosition('box-1', 'bg')

      expect(propPos).not.toBeNull()
      expect(propPos!.column).toBe(5)
    })

    it('should return null for non-existent property', () => {
      const mapping: NodeMapping = {
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 20 },
        properties: new Map(),
        isDefinition: false,
      }

      sourceMap.addNode(mapping)
      const propPos = sourceMap.getPropertyPosition('box-1', 'nonexistent')

      expect(propPos).toBeNull()
    })

    it('should return null for non-existent node', () => {
      const propPos = sourceMap.getPropertyPosition('nonexistent', 'bg')
      expect(propPos).toBeNull()
    })
  })

  describe('getAllNodeIds', () => {
    it('should return all node IDs', () => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })
      sourceMap.addNode({
        nodeId: 'text-1',
        componentName: 'Text',
        position: { line: 2, column: 1, endLine: 2, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })

      const ids = sourceMap.getAllNodeIds()

      expect(ids).toContain('box-1')
      expect(ids).toContain('text-1')
      expect(ids.length).toBe(2)
    })

    it('should return empty array for empty map', () => {
      expect(sourceMap.getAllNodeIds()).toEqual([])
    })
  })

  describe('getNodesByComponent', () => {
    beforeEach(() => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })
      sourceMap.addNode({
        nodeId: 'box-2',
        componentName: 'Box',
        position: { line: 2, column: 1, endLine: 2, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })
      sourceMap.addNode({
        nodeId: 'text-1',
        componentName: 'Text',
        position: { line: 3, column: 1, endLine: 3, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })
    })

    it('should return all nodes with component name', () => {
      const boxes = sourceMap.getNodesByComponent('Box')
      expect(boxes.length).toBe(2)
      expect(boxes.every(n => n.componentName === 'Box')).toBe(true)
    })

    it('should return empty array for non-existent component', () => {
      const result = sourceMap.getNodesByComponent('NonExistent')
      expect(result).toEqual([])
    })
  })

  describe('getNodeByInstanceName', () => {
    it('should find node by instance name', () => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        instanceName: 'header',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })

      const node = sourceMap.getNodeByInstanceName('header')
      expect(node).not.toBeNull()
      expect(node!.nodeId).toBe('box-1')
    })

    it('should return null for non-existent instance name', () => {
      const result = sourceMap.getNodeByInstanceName('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('isTemplate', () => {
    it('should return true for each template', () => {
      sourceMap.addNode({
        nodeId: 'item-1',
        componentName: 'Item',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
        isEachTemplate: true,
      })

      expect(sourceMap.isTemplate('item-1')).toBe(true)
    })

    it('should return true for conditional', () => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
        isConditional: true,
      })

      expect(sourceMap.isTemplate('box-1')).toBe(true)
    })

    it('should return false for regular node', () => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })

      expect(sourceMap.isTemplate('box-1')).toBe(false)
    })
  })

  describe('getChildren', () => {
    beforeEach(() => {
      sourceMap.addNode({
        nodeId: 'parent',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 5, endColumn: 1 },
        properties: new Map(),
        isDefinition: false,
      })
      sourceMap.addNode({
        nodeId: 'child-1',
        componentName: 'Text',
        position: { line: 2, column: 3, endLine: 2, endColumn: 20 },
        properties: new Map(),
        isDefinition: false,
        parentId: 'parent',
      })
      sourceMap.addNode({
        nodeId: 'child-2',
        componentName: 'Button',
        position: { line: 3, column: 3, endLine: 3, endColumn: 20 },
        properties: new Map(),
        isDefinition: false,
        parentId: 'parent',
      })
    })

    it('should return children of a node', () => {
      const children = sourceMap.getChildren('parent')
      expect(children.length).toBe(2)
      expect(children.map(c => c.nodeId)).toContain('child-1')
      expect(children.map(c => c.nodeId)).toContain('child-2')
    })

    it('should return empty array for node with no children', () => {
      const children = sourceMap.getChildren('child-1')
      expect(children).toEqual([])
    })
  })

  describe('getNodeAtLine', () => {
    beforeEach(() => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 5, endColumn: 1 },
        properties: new Map(),
        isDefinition: false,
      })
      sourceMap.addNode({
        nodeId: 'text-1',
        componentName: 'Text',
        position: { line: 2, column: 3, endLine: 2, endColumn: 20 },
        properties: new Map(),
        isDefinition: false,
        parentId: 'box-1',
      })
      sourceMap.addNode({
        nodeId: 'def-1',
        componentName: 'MyComponent',
        position: { line: 2, column: 3, endLine: 2, endColumn: 20 },
        properties: new Map(),
        isDefinition: true,
      })
    })

    it('should find most specific node at line', () => {
      // Line 2 has both box-1 (range 1-5) and text-1 (range 2-2)
      // Should return text-1 as it's more specific
      const node = sourceMap.getNodeAtLine(2)
      expect(node?.nodeId).toBe('text-1')
    })

    it('should skip definition nodes', () => {
      const node = sourceMap.getNodeAtLine(2)
      expect(node?.isDefinition).toBe(false)
    })

    it('should return null for line outside all nodes', () => {
      const node = sourceMap.getNodeAtLine(10)
      expect(node).toBeNull()
    })
  })

  describe('getNodesStartingAtLine', () => {
    beforeEach(() => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 5, endColumn: 1 },
        properties: new Map(),
        isDefinition: false,
      })
      sourceMap.addNode({
        nodeId: 'text-1',
        componentName: 'Text',
        position: { line: 1, column: 10, endLine: 1, endColumn: 20 },
        properties: new Map(),
        isDefinition: false,
      })
    })

    it('should return all nodes starting at line', () => {
      const nodes = sourceMap.getNodesStartingAtLine(1)
      expect(nodes.length).toBe(2)
    })

    it('should return empty for line with no nodes', () => {
      const nodes = sourceMap.getNodesStartingAtLine(10)
      expect(nodes).toEqual([])
    })
  })

  describe('clear', () => {
    it('should clear all nodes', () => {
      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })

      sourceMap.clear()

      expect(sourceMap.size).toBe(0)
      expect(sourceMap.getNodeById('box-1')).toBeNull()
    })
  })

  describe('size', () => {
    it('should return correct size', () => {
      expect(sourceMap.size).toBe(0)

      sourceMap.addNode({
        nodeId: 'box-1',
        componentName: 'Box',
        position: { line: 1, column: 1, endLine: 1, endColumn: 10 },
        properties: new Map(),
        isDefinition: false,
      })

      expect(sourceMap.size).toBe(1)
    })
  })
})

// ===========================================
// SOURCEMAP BUILDER
// ===========================================

describe('SourceMapBuilder', () => {
  let builder: SourceMapBuilder

  beforeEach(() => {
    builder = new SourceMapBuilder()
  })

  describe('addNode', () => {
    it('should add node with minimal options', () => {
      builder.addNode('box-1', 'Box', { line: 1, column: 1, endLine: 1, endColumn: 10 })

      const map = builder.build()
      const node = map.getNodeById('box-1')

      expect(node).not.toBeNull()
      expect(node!.componentName).toBe('Box')
    })

    it('should add node with all options', () => {
      builder.addNode('box-1', 'Box', { line: 1, column: 1, endLine: 1, endColumn: 10 }, {
        instanceName: 'header',
        isDefinition: false,
        isEachTemplate: true,
        isConditional: false,
        parentId: 'parent-1',
      })

      const map = builder.build()
      const node = map.getNodeById('box-1')

      expect(node!.instanceName).toBe('header')
      expect(node!.isEachTemplate).toBe(true)
      expect(node!.parentId).toBe('parent-1')
    })
  })

  describe('addPropertyPosition', () => {
    it('should add property position to existing node', () => {
      builder.addNode('box-1', 'Box', { line: 1, column: 1, endLine: 1, endColumn: 20 })
      builder.addPropertyPosition('box-1', 'bg', { line: 1, column: 5, endLine: 1, endColumn: 15 })

      const map = builder.build()
      const propPos = map.getPropertyPosition('box-1', 'bg')

      expect(propPos).not.toBeNull()
      expect(propPos!.column).toBe(5)
    })

    it('should handle non-existent node gracefully', () => {
      // Should not throw
      builder.addPropertyPosition('nonexistent', 'bg', { line: 1, column: 5, endLine: 1, endColumn: 15 })

      const map = builder.build()
      expect(map.size).toBe(0)
    })
  })

  describe('build', () => {
    it('should return SourceMap instance', () => {
      builder.addNode('box-1', 'Box', { line: 1, column: 1, endLine: 1, endColumn: 10 })
      const map = builder.build()

      expect(map).toBeInstanceOf(SourceMap)
    })
  })

  describe('getMap', () => {
    it('should return same map as build', () => {
      builder.addNode('box-1', 'Box', { line: 1, column: 1, endLine: 1, endColumn: 10 })

      const map1 = builder.getMap()
      const map2 = builder.build()

      expect(map1).toBe(map2)
    })
  })
})

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

describe('calculateSourcePosition', () => {
  it('should calculate position without content', () => {
    const pos = calculateSourcePosition(5, 10)

    expect(pos.line).toBe(5)
    expect(pos.column).toBe(10)
    expect(pos.endLine).toBe(5)
    expect(pos.endColumn).toBe(11)
  })

  it('should calculate position with single-line content', () => {
    const pos = calculateSourcePosition(5, 10, 'Box pad 10')

    expect(pos.line).toBe(5)
    expect(pos.column).toBe(10)
    expect(pos.endLine).toBe(5)
    expect(pos.endColumn).toBe(20) // 10 + 'Box pad 10'.length
  })

  it('should calculate position with multi-line content', () => {
    const content = 'Box pad 10\n  Text "Hello"'
    const pos = calculateSourcePosition(5, 1, content)

    expect(pos.line).toBe(5)
    expect(pos.column).toBe(1)
    expect(pos.endLine).toBe(6)
    expect(pos.endColumn).toBe('  Text "Hello"'.length)
  })

  it('should handle empty content', () => {
    const pos = calculateSourcePosition(1, 1, '')

    expect(pos.line).toBe(1)
    expect(pos.endLine).toBe(1)
  })
})

describe('calculatePropertyPosition', () => {
  it('should find property position in line', () => {
    const pos = calculatePropertyPosition('Box bg #FF0000, pad 10', 1, 'bg', '#FF0000')

    expect(pos).not.toBeNull()
    expect(pos!.line).toBe(1)
  })

  it('should find property at start of properties', () => {
    const pos = calculatePropertyPosition('Box pad 10, bg #FFF', 1, 'pad', '10')

    expect(pos).not.toBeNull()
  })

  it('should return null for non-existent property', () => {
    const pos = calculatePropertyPosition('Box pad 10', 1, 'bg', '#FFF')

    expect(pos).toBeNull()
  })

  it('should handle property without value', () => {
    const pos = calculatePropertyPosition('Box hidden', 1, 'hidden', '')

    expect(pos).not.toBeNull()
  })
})

// ===========================================
// INTEGRATION SCENARIOS
// ===========================================

describe('Integration Scenarios', () => {
  it('should build map and query nodes correctly', () => {
    const builder = new SourceMapBuilder()

    // Build a simple tree: Box > Text, Button
    builder.addNode('box-1', 'Box', { line: 1, column: 1, endLine: 4, endColumn: 1 })
    builder.addNode('text-1', 'Text', { line: 2, column: 3, endLine: 2, endColumn: 20 }, { parentId: 'box-1' })
    builder.addNode('button-1', 'Button', { line: 3, column: 3, endLine: 3, endColumn: 25 }, { parentId: 'box-1' })

    // Add property positions
    builder.addPropertyPosition('box-1', 'pad', { line: 1, column: 5, endLine: 1, endColumn: 11 })
    builder.addPropertyPosition('box-1', 'bg', { line: 1, column: 13, endLine: 1, endColumn: 23 })

    const map = builder.build()

    // Verify tree structure
    expect(map.getChildren('box-1').length).toBe(2)

    // Verify property lookup
    expect(map.getPropertyPosition('box-1', 'pad')).not.toBeNull()
    expect(map.getPropertyPosition('box-1', 'bg')).not.toBeNull()

    // Verify line lookup
    expect(map.getNodeAtLine(2)?.nodeId).toBe('text-1')
    expect(map.getNodeAtLine(3)?.nodeId).toBe('button-1')
  })

  it('should handle definition and instance correctly', () => {
    const builder = new SourceMapBuilder()

    // Definition
    builder.addNode('def-1', 'MyButton', { line: 1, column: 1, endLine: 3, endColumn: 1 }, {
      isDefinition: true,
    })

    // Instances
    builder.addNode('instance-1', 'MyButton', { line: 5, column: 1, endLine: 5, endColumn: 20 })
    builder.addNode('instance-2', 'MyButton', { line: 6, column: 1, endLine: 6, endColumn: 20 })

    const map = builder.build()

    // getNodeAtLine should prefer instances
    expect(map.getNodeAtLine(1)).toBeNull() // Definition is skipped
    expect(map.getNodeAtLine(5)?.nodeId).toBe('instance-1')

    // getNodesByComponent should return all
    const allMyButtons = map.getNodesByComponent('MyButton')
    expect(allMyButtons.length).toBe(3)
  })
})
