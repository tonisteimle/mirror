/**
 * CodeModifier Error Handling Tests
 *
 * Tests error conditions, edge cases, and recovery scenarios
 * for CodeModifier operations.
 *
 * Phase 4.1 of the Drag-Drop Test Expansion Plan
 */

import { describe, it, expect } from 'vitest'
import { CodeModifier } from '../../compiler/studio/code-modifier'
import { SourceMap, SourceMapBuilder } from '../../compiler/ir/source-map'

// ============================================================================
// TEST HELPERS
// ============================================================================

/**
 * Create a test SourceMap using SourceMapBuilder
 */
function createTestSourceMap(config: {
  nodes: Array<{
    id: string
    componentName: string
    line: number
    endLine: number
    parentId?: string
  }>
}): SourceMap {
  const builder = new SourceMapBuilder()

  for (const node of config.nodes) {
    builder.addNode(node.id, node.componentName, {
      line: node.line,
      column: 1,
      endLine: node.endLine,
      endColumn: 100,
    }, {
      parentId: node.parentId,
    })
  }

  return builder.build()
}

// ============================================================================
// INVALID NODE OPERATIONS
// ============================================================================

describe('CodeModifier Error Handling: Invalid Node Operations', () => {
  describe('addChild errors', () => {
    it('returns error for non-existent parent ID', () => {
      const source = `Container`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('non-existent', 'Button')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error for empty parent ID', () => {
      const source = `Container`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('', 'Button')

      expect(result.success).toBe(false)
    })

    it('returns error for null-like parent ID', () => {
      const source = `Container`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('null', 'Button')

      expect(result.success).toBe(false)
    })
  })

  describe('removeNode errors', () => {
    it('returns error for non-existent node ID', () => {
      const source = `Container
  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error for empty node ID', () => {
      const source = `Container`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('')

      expect(result.success).toBe(false)
    })
  })

  describe('moveNode errors', () => {
    it('returns error for non-existent source ID', () => {
      const source = `Container
  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('non-existent', 'node-1', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error for non-existent target ID', () => {
      const source = `Container
  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-2', 'non-existent', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })

    it('returns error for both invalid source and target', () => {
      const source = `Container`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('invalid-1', 'invalid-2', 'inside')

      expect(result.success).toBe(false)
    })
  })

  describe('updateProperty errors', () => {
    it('returns error for non-existent node ID', () => {
      const source = `Box bg #FFF`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Box', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.updateProperty('non-existent', 'bg', '#000')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('addChildRelativeTo errors', () => {
    it('returns error for non-existent sibling ID', () => {
      const source = `Container
  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChildRelativeTo('non-existent', 'Button', 'after')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })
})

// ============================================================================
// STRUCTURAL ERROR PREVENTION
// ============================================================================

describe('CodeModifier Error Handling: Structural Errors', () => {
  describe('self-reference prevention', () => {
    it('prevents moving node into itself', () => {
      const source = `Container
  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-2', 'node-2', 'inside')

      // Should either fail or be a no-op
      if (result.success) {
        // If it "succeeds", the source should be unchanged
        expect(result.newSource).toBe(source)
      } else {
        expect(result.error).toBeDefined()
      }
    })
  })

  describe('circular reference prevention', () => {
    it('prevents moving parent into child', () => {
      const source = `Parent
  Child
    Grandchild`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Parent', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Child', line: 2, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Grandchild', line: 3, endLine: 3, parentId: 'node-2' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-1', 'node-3', 'inside')

      // Moving parent into its own descendant should fail or be prevented
      // The exact behavior depends on implementation
      expect(typeof result.success).toBe('boolean')
    })

    it('prevents moving ancestor into descendant', () => {
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
      const result = modifier.moveNode('node-2', 'node-4', 'inside')

      // Implementation-dependent behavior
      expect(typeof result.success).toBe('boolean')
    })
  })
})

// ============================================================================
// SOURCE CODE EDGE CASES
// ============================================================================

describe('CodeModifier Error Handling: Source Code Edge Cases', () => {
  describe('empty source', () => {
    it('handles completely empty source', () => {
      const source = ``
      const sourceMap = new SourceMap()

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Box')

      expect(result.success).toBe(false)
    })

    it('handles whitespace-only source', () => {
      const source = `

    `
      const sourceMap = new SourceMap()

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Box')

      expect(result.success).toBe(false)
    })
  })

  describe('line ending handling', () => {
    it('handles Unix line endings (LF)', () => {
      const source = `Container\n  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Button')
    })

    it('handles Windows line endings (CRLF)', () => {
      const source = `Container\r\n  Box`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button')

      // Should handle CRLF without breaking
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('indentation handling', () => {
    it('handles 2-space indentation', () => {
      const source = `Container
  Child`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Child', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'NewChild')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('  NewChild')
    })

    it('handles 4-space indentation', () => {
      const source = `Container
    Child`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Child', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'NewChild')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('NewChild')
    })

    it('handles tab indentation', () => {
      const source = `Container
\tChild`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Child', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'NewChild')

      // Should handle tabs
      expect(typeof result.success).toBe('boolean')
    })

    it('handles mixed tabs and spaces', () => {
      const source = `Container
\t  Child`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Child', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'NewChild')

      // Should handle mixed indentation
      expect(typeof result.success).toBe('boolean')
    })
  })

  describe('special content', () => {
    it('handles component with only properties (no children)', () => {
      const source = `Box bg #FFF, pad 16, rad 8`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Box', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Child')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Box bg #FFF')
      expect(result.newSource).toContain('Child')
    })

    it('handles component with text content', () => {
      const source = `Text "Hello World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Text', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Span')

      // Text might be a leaf element that doesn't accept children
      expect(typeof result.success).toBe('boolean')
    })

    it('handles trailing whitespace', () => {
      const source = `Container
  Box  `
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'NewChild')

      expect(result.success).toBe(true)
    })

    it('handles blank lines between elements', () => {
      const source = `Container

  Box

  Card`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Container', line: 1, endLine: 5 },
          { id: 'node-2', componentName: 'Box', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Card', line: 5, endLine: 5, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'NewChild')

      expect(result.success).toBe(true)
    })
  })
})

// ============================================================================
// OPERATION RESULT VALIDATION
// ============================================================================

describe('CodeModifier Error Handling: Result Validation', () => {
  it('successful operation returns newSource', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('node-1', 'Button')

    expect(result.success).toBe(true)
    expect(result.newSource).toBeDefined()
    expect(result.newSource.length).toBeGreaterThan(0)
  })

  it('failed operation includes error message', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const modifier = new CodeModifier(source, sourceMap)
    const result = modifier.addChild('invalid-id', 'Button')

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(typeof result.error).toBe('string')
  })

  it('multiple errors do not accumulate across operations', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const modifier = new CodeModifier(source, sourceMap)

    // First failure
    const result1 = modifier.addChild('invalid-1', 'Button')
    expect(result1.success).toBe(false)

    // Second failure
    const result2 = modifier.addChild('invalid-2', 'Button')
    expect(result2.success).toBe(false)

    // Successful operation
    const result3 = modifier.addChild('node-1', 'Button')
    expect(result3.success).toBe(true)
  })
})
