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

    it('moves last sibling before middle sibling with correct formatting', () => {
      // Exact user scenario: move green box before yellow box
      const source = `App pad 32, ver, gap 16
  Box w 50, h 50, bg #CC5DE8
  Box w 50, h 50, bg #FAB005
  Box w 50, h 50, bg #099268`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Box', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Box', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move last box (green) before middle box (yellow)
      const result = modifier.moveNode('node-4', 'node-3', 'before')

      expect(result.success).toBe(true)

      // Check exact output format - each component should be on its own line
      const expectedSource = `App pad 32, ver, gap 16
  Box w 50, h 50, bg #CC5DE8
  Box w 50, h 50, bg #099268
  Box w 50, h 50, bg #FAB005`

      expect(result.newSource).toBe(expectedSource)

      // Also verify line count is preserved
      const originalLines = source.split('\n').length
      const newLines = result.newSource.split('\n').length
      expect(newLines).toBe(originalLines)
    })

    it('moves last sibling before first child with correct formatting', () => {
      // Edge case: move to very first position
      const source = `App pad 32, ver, gap 16
  Box w 50, h 50, bg #CC5DE8
  Box w 50, h 50, bg #FAB005
  Box w 50, h 50, bg #099268`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Box', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Box', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move last box (green) before first box (purple)
      const result = modifier.moveNode('node-4', 'node-2', 'before')

      expect(result.success).toBe(true)

      // Check exact output format
      const expectedSource = `App pad 32, ver, gap 16
  Box w 50, h 50, bg #099268
  Box w 50, h 50, bg #CC5DE8
  Box w 50, h 50, bg #FAB005`

      expect(result.newSource).toBe(expectedSource)

      // Verify line count is preserved
      const originalLines = source.split('\n').length
      const newLines = result.newSource.split('\n').length
      expect(newLines).toBe(originalLines)
    })

    it('moves first sibling after last sibling', () => {
      // Edge case: move first child to the end
      const source = `App pad 32
  Box1
  Box2
  Box3`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Box1', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Box2', line: 3, endLine: 3, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Box3', line: 4, endLine: 4, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move first child (Box1) after last child (Box3)
      const result = modifier.moveNode('node-2', 'node-4', 'after')

      expect(result.success).toBe(true)

      const expectedSource = `App pad 32
  Box2
  Box3
  Box1`

      expect(result.newSource).toBe(expectedSource)
    })

    it('moves multi-line block (container with children) correctly', () => {
      // Critical test: move a container that has children
      const source = `App
  Card
    Title "Hello"
    Button "Click"
  Footer`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 5 },
          { id: 'node-2', componentName: 'Card', line: 2, endLine: 4, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Title', line: 3, endLine: 3, parentId: 'node-2' },
          { id: 'node-4', componentName: 'Button', line: 4, endLine: 4, parentId: 'node-2' },
          { id: 'node-5', componentName: 'Footer', line: 5, endLine: 5, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move Card (with its children) after Footer
      const result = modifier.moveNode('node-2', 'node-5', 'after')

      expect(result.success).toBe(true)

      const expectedSource = `App
  Footer
  Card
    Title "Hello"
    Button "Click"`

      expect(result.newSource).toBe(expectedSource)

      // Verify all content is preserved
      expect(result.newSource).toContain('Card')
      expect(result.newSource).toContain('Title "Hello"')
      expect(result.newSource).toContain('Button "Click"')
      expect(result.newSource).toContain('Footer')
    })

    it('moves element inside empty container', () => {
      // Edge case: target container has no children
      const source = `App
  Box1
  Container`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 3 },
          { id: 'node-2', componentName: 'Box1', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Container', line: 3, endLine: 3, parentId: 'node-1' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move Box1 inside empty Container
      const result = modifier.moveNode('node-2', 'node-3', 'inside')

      expect(result.success).toBe(true)

      const expectedSource = `App
  Container
    Box1`

      expect(result.newSource).toBe(expectedSource)
    })

    it('moves element inside container with existing children', () => {
      // Move element inside container that already has children
      const source = `App
  Box1
  Container
    Child1`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'App', line: 1, endLine: 4 },
          { id: 'node-2', componentName: 'Box1', line: 2, endLine: 2, parentId: 'node-1' },
          { id: 'node-3', componentName: 'Container', line: 3, endLine: 4, parentId: 'node-1' },
          { id: 'node-4', componentName: 'Child1', line: 4, endLine: 4, parentId: 'node-3' },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Move Box1 inside Container (should go after Child1)
      const result = modifier.moveNode('node-2', 'node-3', 'inside')

      expect(result.success).toBe(true)

      const expectedSource = `App
  Container
    Child1
    Box1`

      expect(result.newSource).toBe(expectedSource)
    })
  })

  describe('updateProperty', () => {
    it('updates property on lowercase component name', () => {
      const source = `rect w 100, h 200, bg #FCC419`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'rect', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.updateProperty('node-1', 'bg', '$primary.bg')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`rect w 100, h 200, bg $primary.bg`)
    })

    it('updates property with alias on lowercase component', () => {
      const source = `box pad 16, background #333`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'box', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      // Using alias 'bg' to update 'background'
      const result = modifier.updateProperty('node-1', 'bg', '#fff')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`box pad 16, background #fff`)
    })

    it('adds new property to lowercase component when not exists', () => {
      const source = `rect w 100, h 200`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'rect', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.updateProperty('node-1', 'bg', '#333')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`rect w 100, h 200, bg #333`)
    })

    it('updates property on uppercase component name', () => {
      const source = `Button pad 12, bg #3B82F6, "Click me"`
      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'node-1', componentName: 'Button', line: 1, endLine: 1 },
        ],
      })

      const modifier = new CodeModifier(source, sourceMap)
      const result = modifier.updateProperty('node-1', 'bg', '#EF4444')

      expect(result.success).toBe(true)
      expect(result.newSource).toBe(`Button pad 12, bg #EF4444, "Click me"`)
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
