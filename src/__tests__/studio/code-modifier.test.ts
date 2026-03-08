import { describe, it, expect } from 'vitest'
import { CodeModifier, applyChange } from '../../studio/code-modifier'
import { SourceMap, SourceMapBuilder } from '../../studio/source-map'

/**
 * Helper to create a simple SourceMap for testing
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
    builder.addNode(node.id, node.componentName, {
      line: node.line,
      column: 1,
      endLine: node.endLine,
      endColumn: 100,
    }, {
      parentId: node.parentId,
    })

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

describe('CodeModifier', () => {
  describe('addChild', () => {
    it('adds child to empty parent', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`Card pad 16
  Button`)
    })

    it('adds child with properties', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button', {
        properties: 'bg #3B82F6, pad 12',
      })

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`Card pad 16
  Button bg #3B82F6, pad 12`)
    })

    it('adds child with text content', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button', {
        textContent: 'Click me',
      })

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`Card pad 16
  Button "Click me"`)
    })

    it('adds child with properties and text', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button', {
        properties: 'bg #3B82F6',
        textContent: 'Click me',
      })

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`Card pad 16
  Button bg #3B82F6, "Click me"`)
    })

    it('adds child after existing children (position: last)', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button', { position: 'last' })

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`Card pad 16
  Title "Hello"
  Description "World"
  Button`)
    })

    it('adds child before existing children (position: first)', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Icon', { position: 'first' })

      expect(result.success).toBe(true)
      // Note: position 'first' inserts before first child
      expect(result.newSource).toContain('Icon')
      expect(result.newSource).toContain('Title "Hello"')
    })

    it('preserves nested indentation', () => {
      const source = `App
  Card pad 16
    Title "Hello"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Card', line: 2, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-2', 'Button')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`App
  Card pad 16
    Title "Hello"
    Button`)
    })

    it('returns error for non-existent parent', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-999', 'Button')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('addChildRelativeTo', () => {
    it('adds component before sibling', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChildRelativeTo('node-3', 'Divider', 'before')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Divider')
      // Divider should appear before Description
      const lines = result.newSource.split('\n')
      const dividerIndex = lines.findIndex(l => l.includes('Divider'))
      const descIndex = lines.findIndex(l => l.includes('Description'))
      expect(dividerIndex).toBeLessThan(descIndex)
    })

    it('adds component after sibling', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChildRelativeTo('node-2', 'Subtitle', 'after')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Subtitle')
      // Subtitle should appear after Title but before Description
      const lines = result.newSource.split('\n')
      const titleIndex = lines.findIndex(l => l.includes('Title'))
      const subtitleIndex = lines.findIndex(l => l.includes('Subtitle'))
      const descIndex = lines.findIndex(l => l.includes('Description'))
      expect(subtitleIndex).toBeGreaterThan(titleIndex)
      expect(subtitleIndex).toBeLessThan(descIndex)
    })

    it('preserves sibling indentation', () => {
      const source = `App
  Card pad 16
    Title "Hello"
    Description "World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Card', line: 2, endLine: 4, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
          { id: 'node-4', componentName: 'Description', line: 4, endLine: 4, parentId: 'node-2' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChildRelativeTo('node-3', 'Icon', 'after')

      expect(result.success).toBe(true)
      // Icon should have same indentation as Title (4 spaces)
      expect(result.newSource).toContain('    Icon')
    })

    it('returns error for non-existent sibling', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChildRelativeTo('node-999', 'Button', 'after')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('removeNode', () => {
    it('removes a single node', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('node-2')

      expect(result.success).toBe(true)
      expect(result.newSource).not.toContain('Title')
      expect(result.newSource).toContain('Description')
    })

    it('removes a node with children', () => {
      const source = `App
  Card pad 16
    Title "Hello"
    Description "World"
  Footer`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 5 },
          { id: 'node-2', componentName: 'Card', line: 2, endLine: 4, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
          { id: 'node-4', componentName: 'Description', line: 4, endLine: 4, parentId: 'node-2' },
          { id: 'node-5', componentName: 'Footer', line: 5, endLine: 5, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('node-2')

      expect(result.success).toBe(true)
      expect(result.newSource).not.toContain('Card')
      expect(result.newSource).not.toContain('Title')
      expect(result.newSource).not.toContain('Description')
      expect(result.newSource).toContain('Footer')
    })

    it('returns error for non-existent node', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.removeNode('node-999')

      expect(result.success).toBe(false)
      expect(result.error).toContain('not found')
    })
  })

  describe('moveNode', () => {
    it('moves node before another sibling', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"
  Button "Click"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Button', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move Button before Title
      const result = modifier.moveNode('node-4', 'node-2', 'before')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      const buttonIndex = lines.findIndex(l => l.includes('Button'))
      const titleIndex = lines.findIndex(l => l.includes('Title'))
      expect(buttonIndex).toBeLessThan(titleIndex)
    })

    it('moves node after another sibling', () => {
      const source = `Card pad 16
  Title "Hello"
  Description "World"
  Button "Click"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Description', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Button', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move Title after Description
      const result = modifier.moveNode('node-2', 'node-3', 'after')

      expect(result.success).toBe(true)
      const lines = result.newSource.split('\n')
      const titleIndex = lines.findIndex(l => l.includes('Title'))
      const descIndex = lines.findIndex(l => l.includes('Description'))
      expect(titleIndex).toBeGreaterThan(descIndex)
    })

    it('moves node inside another container', () => {
      const source = `App
  Card pad 16
    Title "Hello"
  Footer
    Link "Home"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 5 },
          { id: 'node-2', componentName: 'Card', line: 2, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
          { id: 'node-4', componentName: 'Footer', line: 4, endLine: 5, parentId: 'node-1' },
          { id: 'node-5', componentName: 'Link', line: 5, endLine: 5, parentId: 'node-4' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move Title inside Footer
      const result = modifier.moveNode('node-3', 'node-4', 'inside')

      expect(result.success).toBe(true)
      expect(result.newSource).toContain('Title')
      // Title should now be indented under Footer (4 spaces)
      expect(result.newSource).toContain('    Title')
    })

    it('prevents moving node onto itself', () => {
      const source = `Card pad 16
  Title "Hello"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 2 },
          { id: 'node-2', componentName: 'Title', line: 2, endLine: 2, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.moveNode('node-2', 'node-2', 'before')

      expect(result.success).toBe(false)
      expect(result.error).toContain('itself')
    })

    it('prevents moving node into its descendant', () => {
      const source = `Card pad 16
  Container
    Title "Hello"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Container', line: 2, endLine: 3, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Try to move Container inside Title (its descendant)
      const result = modifier.moveNode('node-2', 'node-3', 'inside')

      expect(result.success).toBe(false)
      expect(result.error).toContain('descendant')
    })
  })

  describe('CodeChange integration', () => {
    it('produces valid CodeChange for CodeMirror', () => {
      const source = `Card pad 16`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Card', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.addChild('node-1', 'Button')

      expect(result.change).toBeDefined()
      expect(typeof result.change.from).toBe('number')
      expect(typeof result.change.to).toBe('number')
      expect(typeof result.change.insert).toBe('string')

      // Verify applyChange produces same result
      const applied = applyChange(source, result.change)
      expect(applied).toBe(result.newSource)
    })
  })
})
