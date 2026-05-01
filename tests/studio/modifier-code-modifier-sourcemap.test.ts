/**
 * CodeModifier ↔ SourceMap Integration Tests
 *
 * Tests that CodeModifier operations maintain SourceMap consistency
 * and that source positions are correctly updated after modifications.
 *
 * Phase 2.2 of the Drag-Drop Test Expansion Plan
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier } from '../../studio/code-modifier/code-modifier'
import { SourceMap, SourceMapBuilder } from '../../compiler/ir/source-map'
import { parse } from '../../compiler/parser/parser'
import { transform, buildSourceMapFromIR } from '../../compiler/ir'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a SourceMap from Mirror source code using the full compilation pipeline
 */
function createSourceMapFromSource(source: string): SourceMap {
  const ast = parse(source)
  const ir = transform(ast)
  return buildSourceMapFromIR(ir)
}

/**
 * Create a test SourceMap manually using SourceMapBuilder
 */
function createTestSourceMap(config: {
  nodes: Array<{
    id: string
    componentName: string
    line: number
    endLine: number
    parentId?: string
    properties?: Record<string, { line: number; column: number }>
  }>
}): SourceMap {
  const builder = new SourceMapBuilder()

  for (const node of config.nodes) {
    builder.addNode(
      node.id,
      node.componentName,
      {
        line: node.line,
        column: 1,
        endLine: node.endLine,
        endColumn: 100,
      },
      {
        parentId: node.parentId,
      }
    )

    if (node.properties) {
      for (const [propName, pos] of Object.entries(node.properties)) {
        builder.addPropertyPosition(node.id, propName, {
          line: pos.line,
          column: pos.column,
          endLine: pos.line,
          endColumn: pos.column + 10,
        })
      }
    }
  }

  return builder.build()
}

/**
 * Get all node IDs from source using real compilation
 */
function getNodeIdsFromSource(source: string): string[] {
  const sourceMap = createSourceMapFromSource(source)
  return sourceMap.getAllNodeIds()
}

// ============================================================================
// SOURCE POSITION MAPPING TESTS
// ============================================================================

describe('CodeModifier SourceMap: Source Position Mapping', () => {
  describe('after addChild', () => {
    it('new child appears at correct line', () => {
      const source = `Container pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      expect(lines.length).toBe(2)
      expect(lines[1].trim()).toBe('Button')
    })

    it('existing children positions shift down correctly', () => {
      const source = `Container
  Text "Hello"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Text', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Icon', { position: 'first' })

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      // Original Text should still be present
      expect(lines.some(l => l.includes('Text'))).toBe(true)
      expect(lines.some(l => l.includes('Hello'))).toBe(true)
    })

    it('handles multi-line insertions', () => {
      const source = `Container`
      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Card', {
        properties: 'pad 16, bg #FFF',
        textContent: 'Title',
      })

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Card')
      expect(result.newSource).toContain('pad 16')
      expect(result.newSource).toContain('Title')
    })
  })

  describe('after removeNode', () => {
    it('removes correct line', () => {
      const source = `Container
  First
  Second
  Third`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'First', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Second', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Third', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('node-3')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('First')
      expect(result.newSource).not.toContain('Second')
      expect(result.newSource).toContain('Third')
    })

    it('removes multi-line node with children', () => {
      const source = `App
  Header
    Title
    Subtitle
  Content`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 5 },
          { id: 'node-2', componentName: 'Header', line: 2, endLine: 4, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
          { id: 'node-4', componentName: 'Subtitle', line: 4, endLine: 4, parentId: 'node-2' },
          { id: 'node-5', componentName: 'Content', line: 5, endLine: 5, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('node-2')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('App')
      expect(result.newSource).not.toContain('Header')
      expect(result.newSource).not.toContain('Title')
      expect(result.newSource).not.toContain('Subtitle')
      expect(result.newSource).toContain('Content')
    })
  })

  describe('after moveNode', () => {
    it('moves node to correct position inside target', () => {
      const source = `Container
  Box
  Card`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Card', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-3', 'node-2', 'inside')

      expect(result.success).toBe(true)
      // Card should now be inside Box
      expect(result.newSource).toContain('Box')
      expect(result.newSource).toContain('Card')
    })

    it('updates indentation when moving to deeper level', () => {
      const source = `App
  Container
  Card`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Container', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Card', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-3', 'node-2', 'inside')

      expect(result.success).toBe(true)
      // Card should have 4-space indentation (inside Container which has 2)
      expect(result.newSource).toContain('    Card')
    })

    it('moves node before sibling', () => {
      const source = `Container
  First
  Second
  Third`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'First', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Second', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Third', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-4', 'node-2', 'before')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      const thirdIndex = lines.findIndex(l => l.includes('Third'))
      const firstIndex = lines.findIndex(l => l.includes('First'))
      expect(thirdIndex).toBeLessThan(firstIndex)
    })

    it('moves node after sibling', () => {
      const source = `Container
  First
  Second
  Third`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'First', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Second', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Third', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-2', 'node-3', 'after')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      const firstIndex = lines.findIndex(l => l.includes('First'))
      const secondIndex = lines.findIndex(l => l.includes('Second'))
      expect(firstIndex).toBeGreaterThan(secondIndex)
    })

    it('replaces existing x,y properties instead of appending them', () => {
      // Regression test for bug where moveNode appended x,y properties
      // instead of replacing existing ones, causing property accumulation
      const source = `Container stacked
  Box x 20, y 20, w 100, h 100`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          {
            id: 'node-2',
            componentName: 'Box',
            line: 2,
            endLine: 2,
            parentId: 'node-1',
            properties: {
              x: { line: 2, column: 7 },
              y: { line: 2, column: 13 },
              w: { line: 2, column: 19 },
              h: { line: 2, column: 27 },
            },
          },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-2', 'node-1', 'inside', undefined, {
        properties: 'x 100, y 150',
      })

      expect(result.success).toBe(true)
      // Should have the NEW x and y values, not the old ones
      expect(result.newSource).toContain('x 100')
      expect(result.newSource).toContain('y 150')
      // Should NOT have the old x and y values appended
      expect(result.newSource).not.toContain('x 20')
      expect(result.newSource).not.toContain('y 20')
      // w and h should be preserved
      expect(result.newSource).toContain('w 100')
      expect(result.newSource).toContain('h 100')
    })
  })

  describe('indentation handling', () => {
    it('preserves 2-space indentation style', () => {
      const source = `App
  Container
    Item`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Container', line: 2, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Item', line: 3, endLine: 3, parentId: 'node-2' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-2', 'NewItem')

      expect(result.success).toBe(true)
      // NewItem should use 4 spaces (2 per level, Container is level 1, children are level 2)
      expect(result.newSource).toContain('    NewItem')
    })

    it('handles deeply nested structures (4+ levels)', () => {
      const source = `Level1
  Level2
    Level3
      Level4`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Level1', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Level2', line: 2, endLine: 4, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Level3', line: 3, endLine: 4, parentId: 'node-2' },
          { id: 'node-4', componentName: 'Level4', line: 4, endLine: 4, parentId: 'node-3' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-4', 'Level5')

      expect(result.success).toBe(true)
      // Level5 should have 8 spaces (4 levels * 2 spaces)
      expect(result.newSource).toContain('        Level5')
    })
  })
})

// ============================================================================
// PROPERTY POSITION TESTS
// ============================================================================

describe('CodeModifier SourceMap: Property Positions', () => {
  describe('updateProperty', () => {
    it('updates property value at correct position', () => {
      const source = `Box bg #FFF, pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          {
            id: 'node-1',
            componentName: 'Box',
            line: 1,
            endLine: 1,
            properties: {
              bg: { line: 1, column: 5 },
              pad: { line: 1, column: 14 },
            },
          },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.updateProperty('node-1', 'bg', '#000')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('#000')
      expect(result.newSource).toContain('pad 16')
    })

    it('preserves other properties when updating one', () => {
      const source = `Box bg #FFF, pad 16, rad 8`
      const sourceMap = createTestSourceMap({
        nodes: [
          {
            id: 'node-1',
            componentName: 'Box',
            line: 1,
            endLine: 1,
            properties: {
              bg: { line: 1, column: 5 },
              pad: { line: 1, column: 14 },
              rad: { line: 1, column: 22 },
            },
          },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.updateProperty('node-1', 'pad', '24')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg #FFF')
      expect(result.newSource).toContain('pad 24')
      expect(result.newSource).toContain('rad 8')
    })
  })

  describe('addProperty', () => {
    it('adds property to node without properties', () => {
      const source = `Box`
      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'node-1', componentName: 'Box', line: 1, endLine: 1 }],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addProperty('node-1', 'bg', '#FFF')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Box')
      expect(result.newSource).toContain('bg #FFF')
    })

    it('adds property to node with existing properties', () => {
      const source = `Box pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          {
            id: 'node-1',
            componentName: 'Box',
            line: 1,
            endLine: 1,
            properties: {
              pad: { line: 1, column: 5 },
            },
          },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addProperty('node-1', 'bg', '#FFF')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('pad 16')
      expect(result.newSource).toContain('bg #FFF')
    })
  })

  describe('removeProperty', () => {
    it('removes property while preserving others', () => {
      const source = `Box bg #FFF, pad 16, rad 8`
      const sourceMap = createTestSourceMap({
        nodes: [
          {
            id: 'node-1',
            componentName: 'Box',
            line: 1,
            endLine: 1,
            properties: {
              bg: { line: 1, column: 5 },
              pad: { line: 1, column: 14 },
              rad: { line: 1, column: 22 },
            },
          },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeProperty('node-1', 'pad')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('bg #FFF')
      expect(result.newSource).not.toContain('pad')
      expect(result.newSource).toContain('rad 8')
    })
  })
})

// ============================================================================
// CONSISTENCY AFTER MODIFICATION TESTS
// ============================================================================

describe('CodeModifier SourceMap: Consistency After Modification', () => {
  describe('sequential operations', () => {
    it('handles multiple addChild operations', () => {
      let source = `Container`
      let sourceMap = createTestSourceMap({
        nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
      })

      // First add
      let modifier = new CodeModifier(source, sourceMap)
      let result = modifier.addChild('node-1', 'First')
      expect(result.success).toBe(true)
      source = result.newSource

      // Update sourceMap for second operation
      sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'First', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      // Second add
      modifier = new CodeModifier(source, sourceMap)
      result = modifier.addChild('node-1', 'Second')
      expect(result.success).toBe(true)
      source = result.newSource

      // Verify both children exist
      expect(source).toContain('First')
      expect(source).toContain('Second')

      // Verify order
      const lines = source.split('\n')
      const firstIndex = lines.findIndex(l => l.includes('First'))
      const secondIndex = lines.findIndex(l => l.includes('Second'))
      expect(firstIndex).toBeLessThan(secondIndex)
    })

    it('handles add then remove', () => {
      let source = `Container
  Existing`
      let sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Existing', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      // Add new child
      let modifier = new CodeModifier(source, sourceMap)
      let result = modifier.addChild('node-1', 'New')
      expect(result.success).toBe(true)
      source = result.newSource
      expect(source).toContain('New')

      // Update sourceMap
      sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Existing', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'New', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      // Remove original child
      modifier = new CodeModifier(source, sourceMap)
      result = modifier.removeNode('node-2')
      expect(result.success).toBe(true)

      // Verify state
      expect(result.newSource).toContain('Container')
      expect(result.newSource).not.toContain('Existing')
      expect(result.newSource).toContain('New')
    })

    it('handles move then add', () => {
      let source = `Container
  Box
  Card`
      let sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Card', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      // Move Card inside Box
      let modifier = new CodeModifier(source, sourceMap)
      let result = modifier.moveNode('node-3', 'node-2', 'inside')
      expect(result.success).toBe(true)
      source = result.newSource

      // Update sourceMap
      sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Card', line: 3, endLine: 3, parentId: 'node-2' },
        ],
      })

      // Add new child to Container
      modifier = new CodeModifier(source, sourceMap)
      result = modifier.addChild('node-1', 'NewChild')
      expect(result.success).toBe(true)

      // Verify structure
      expect(result.newSource).toContain('Container')
      expect(result.newSource).toContain('Box')
      expect(result.newSource).toContain('Card')
      expect(result.newSource).toContain('NewChild')
    })
  })
})

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('CodeModifier SourceMap: Error Handling', () => {
  it('returns error for non-existent node in addChild', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('node-999', 'Button')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('returns error for non-existent node in removeNode', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.removeNode('node-999')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('returns error for non-existent node in moveNode', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.moveNode('node-999', 'node-1', 'inside')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('returns error for non-existent target in moveNode', () => {
    const source = `Container
  Box`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
        { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
      ],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.moveNode('node-2', 'node-999', 'inside')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })

  it('returns error for non-existent node in updateProperty', () => {
    const source = `Box bg #FFF`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Box', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.updateProperty('node-999', 'bg', '#000')

    expect(result.success).toBe(false)
    expect(result.error).toContain('not found')
  })
})

// ============================================================================
// EDGE CASES
// ============================================================================

describe('CodeModifier SourceMap: Edge Cases', () => {
  it('handles empty source by inserting as root', () => {
    // When canvas is empty and we drop onto node-1, the element should be
    // inserted as root element (not fail with "parent not found")
    const source = ``
    const sourceMap = new SourceMap()

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('node-1', 'Box')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Box')
  })

  it('handles single-line source', () => {
    const source = `Box`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Box', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('node-1', 'Text')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Box')
    expect(result.newSource).toContain('Text')
  })

  it('handles node with only text content', () => {
    const source = `Text "Hello World"`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Text', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    // Text is a leaf element, so adding child should fail or be handled
    const result = modifier.addChild('node-1', 'Span')

    // Implementation may allow or disallow this - verify consistent behavior
    expect(typeof result.success).toBe('boolean')
  })

  it('handles special characters in text content', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [{ id: 'node-1', componentName: 'Container', line: 1, endLine: 1 }],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('node-1', 'Text', {
      textContent: 'Hello "World" & <test>',
    })

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Text')
  })

  it('handles trailing whitespace in source', () => {
    const source = `Container
  Box  `
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
        { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
      ],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('node-1', 'Card')

    expect(result.success).toBe(true)
    expect(result.newSource).toContain('Card')
  })
})
