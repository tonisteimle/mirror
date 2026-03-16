/**
 * DropHandler Integration Tests
 *
 * Tests DropHandler with REAL CodeModifier (no mocks) to verify
 * actual source code transformations work correctly.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DropHandler, createDropHandler, DropData } from '../drop-handler'
import { CodeModifier } from '../../../src/studio/code-modifier'
import { SourceMap, SourceMapBuilder } from '../../../src/studio/source-map'
import type { DropZoneInfo } from '../drag-drop-visualizer'

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

/**
 * Mock DOMRect for Node.js environment
 */
const mockRect = (x = 0, y = 0, w = 100, h = 100): DOMRect =>
  ({ x, y, width: w, height: h, top: y, left: x, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect)

/**
 * Create a DropZone for testing
 */
function createDropZone(overrides: Partial<DropZoneInfo> & { targetId: string }): DropZoneInfo {
  return {
    targetRect: mockRect(),
    placement: 'inside',
    ...overrides,
  }
}

/**
 * Create a DropHandler with real CodeModifier
 */
function createTestHandler(source: string, sourceMap: SourceMap): {
  handler: DropHandler
  getNewSource: () => string | null
} {
  let newSource: string | null = null

  const handler = createDropHandler(
    () => new CodeModifier(source, sourceMap),
    (s) => { newSource = s }
  )

  return {
    handler,
    getNewSource: () => newSource,
  }
}

// ============================================================================
// INTEGRATION TESTS: INSIDE PLACEMENT
// ============================================================================

describe('DropHandler Integration: Inside Placement', () => {
  it('drops component as last child', () => {
    const source = `Container
  Text "Hello"`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
        { id: 'node-2', componentName: 'Text', line: 2, endLine: 2, parentId: 'node-1' },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'Button' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Button')

    // Button should be after Text
    const lines = newSource.split('\n')
    const textIndex = lines.findIndex(l => l.includes('Text'))
    const buttonIndex = lines.findIndex(l => l.includes('Button'))
    expect(buttonIndex).toBeGreaterThan(textIndex)
  })

  it('drops component with text content', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = {
      type: 'component',
      component: 'Text',
      textContent: 'Hello World',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Text')
    expect(newSource).toContain('Hello World')
  })

  it('drops component with properties', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = {
      type: 'component',
      component: 'Box',
      properties: 'bg #3B82F6, pad 16',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Box')
    expect(newSource).toContain('bg #3B82F6')
    expect(newSource).toContain('pad 16')
  })

  it('drops container horizontal as HBox', () => {
    const source = `App`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'App', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = {
      type: 'container',
      direction: 'horizontal',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('HBox')
  })

  it('drops container vertical as VBox', () => {
    const source = `App`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'App', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = {
      type: 'container',
      direction: 'vertical',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('VBox')
  })

  it('drops layout type as Box', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'layout' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('Box')
  })
})

// ============================================================================
// INTEGRATION TESTS: SIBLING PLACEMENT
// ============================================================================

describe('DropHandler Integration: Sibling Placement', () => {
  it('drops component before sibling', () => {
    const source = `Container
  First
  Second`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 3 },
        { id: 'node-2', componentName: 'First', line: 2, endLine: 2, parentId: 'node-1' },
        { id: 'node-3', componentName: 'Second', line: 3, endLine: 3, parentId: 'node-1' },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-3', placement: 'before' })
    const data: DropData = { type: 'component', component: 'Divider' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    const lines = newSource.split('\n')

    const dividerIndex = lines.findIndex(l => l.includes('Divider'))
    const secondIndex = lines.findIndex(l => l.includes('Second'))
    expect(dividerIndex).toBeLessThan(secondIndex)
  })

  it('drops component after sibling', () => {
    const source = `Container
  First
  Second`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 3 },
        { id: 'node-2', componentName: 'First', line: 2, endLine: 2, parentId: 'node-1' },
        { id: 'node-3', componentName: 'Second', line: 3, endLine: 3, parentId: 'node-1' },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-2', placement: 'after' })
    const data: DropData = { type: 'component', component: 'Icon' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    const lines = newSource.split('\n')

    const firstIndex = lines.findIndex(l => l.includes('First'))
    const iconIndex = lines.findIndex(l => l.includes('Icon'))
    const secondIndex = lines.findIndex(l => l.includes('Second'))

    expect(iconIndex).toBeGreaterThan(firstIndex)
    expect(iconIndex).toBeLessThan(secondIndex)
  })

  it('preserves sibling indentation', () => {
    const source = `App
  Container
    Item1
    Item2`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'App', line: 1, endLine: 4 },
        { id: 'node-2', componentName: 'Container', line: 2, endLine: 4, parentId: 'node-1' },
        { id: 'node-3', componentName: 'Item1', line: 3, endLine: 3, parentId: 'node-2' },
        { id: 'node-4', componentName: 'Item2', line: 4, endLine: 4, parentId: 'node-2' },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-3', placement: 'after' })
    const data: DropData = { type: 'component', component: 'NewItem' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    // NewItem should have 4-space indentation (same as Item1)
    expect(newSource).toContain('    NewItem')
  })
})

// ============================================================================
// INTEGRATION TESTS: SEMANTIC ZONE INSERTION
// ============================================================================

describe('DropHandler Integration: Semantic Zone Insertion', () => {
  it('applies layout for top-left zone', () => {
    const source = `Container w 200, h 200`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({
      targetId: 'node-1',
      placement: 'inside',
      semanticZone: 'top-left',
    })
    const data: DropData = { type: 'component', component: 'Icon' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('Icon')
  })

  it('applies layout for bot-right zone', () => {
    const source = `Container w 200, h 200`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({
      targetId: 'node-1',
      placement: 'inside',
      semanticZone: 'bot-right',
    })
    const data: DropData = {
      type: 'component',
      component: 'Button',
      textContent: 'Submit',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Button')
    expect(newSource).toContain('Submit')
  })

  it('skips wrapper for mid-center zone (default)', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({
      targetId: 'node-1',
      placement: 'inside',
      semanticZone: 'mid-center',
    })
    const data: DropData = { type: 'component', component: 'Text' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    // Should be added as simple child
    expect(newSource).toContain('Text')
    expect(newSource.split('\n').length).toBeLessThanOrEqual(2)
  })

  it.each([
    'top-left', 'top-center', 'top-right',
    'mid-left', 'mid-right',
    'bot-left', 'bot-center', 'bot-right',
  ] as const)('handles %s semantic zone', (semanticZone) => {
    const source = `Container w 200, h 200`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({
      targetId: 'node-1',
      placement: 'inside',
      semanticZone,
    })
    const data: DropData = { type: 'component', component: 'Box' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('Box')
  })
})

// ============================================================================
// INTEGRATION TESTS: ERROR HANDLING
// ============================================================================

describe('DropHandler Integration: Error Handling', () => {
  it('returns false when CodeModifier is not available', () => {
    let codeChangeCalled = false
    const handler = createDropHandler(
      () => null,
      () => { codeChangeCalled = true }
    )

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'Button' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(false)
    expect(codeChangeCalled).toBe(false)
  })

  it('returns false for non-existent target', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-999', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'Button' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(false)
    expect(getNewSource()).toBeNull()
  })

  it('returns false for non-existent sibling target', () => {
    const source = `Container
  Box`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 2 },
        { id: 'node-2', componentName: 'Box', line: 2, endLine: 2, parentId: 'node-1' },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-999', placement: 'before' })
    const data: DropData = { type: 'component', component: 'Button' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(false)
    expect(getNewSource()).toBeNull()
  })
})

// ============================================================================
// INTEGRATION TESTS: COMPLEX SCENARIOS
// ============================================================================

describe('DropHandler Integration: Complex Scenarios', () => {
  it('handles deeply nested structure', () => {
    const source = `App
  Header
    Nav
      Item
  Content
    Section
      Card`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'App', line: 1, endLine: 7 },
        { id: 'node-2', componentName: 'Header', line: 2, endLine: 4, parentId: 'node-1' },
        { id: 'node-3', componentName: 'Nav', line: 3, endLine: 4, parentId: 'node-2' },
        { id: 'node-4', componentName: 'Item', line: 4, endLine: 4, parentId: 'node-3' },
        { id: 'node-5', componentName: 'Content', line: 5, endLine: 7, parentId: 'node-1' },
        { id: 'node-6', componentName: 'Section', line: 6, endLine: 7, parentId: 'node-5' },
        { id: 'node-7', componentName: 'Card', line: 7, endLine: 7, parentId: 'node-6' },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    // Drop into deeply nested Card
    const zone = createDropZone({ targetId: 'node-7', placement: 'inside' })
    const data: DropData = {
      type: 'component',
      component: 'Button',
      textContent: 'Click',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Button')
    expect(newSource).toContain('Click')
    // Button should be at 8-space indentation
    expect(newSource).toContain('        Button')
  })

  it('handles component with all options', () => {
    const source = `Container w 300, h 200`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = {
      type: 'component',
      component: 'Button',
      properties: 'bg #3B82F6, pad 12 24, rad 8',
      textContent: 'Submit Form',
    }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Button')
    expect(newSource).toContain('bg #3B82F6')
    expect(newSource).toContain('pad 12 24')
    expect(newSource).toContain('rad 8')
    expect(newSource).toContain('Submit Form')
  })

  it('preserves original container properties', () => {
    const source = `Container pad 16, bg #FFF, rad 8`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'Button' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    // Original properties should be preserved
    expect(newSource).toContain('pad 16')
    expect(newSource).toContain('bg #FFF')
    expect(newSource).toContain('rad 8')
    expect(newSource).toContain('Button')
  })
})

// ============================================================================
// INTEGRATION TESTS: EDGE CASES
// ============================================================================

describe('DropHandler Integration: Edge Cases', () => {
  it('handles empty container', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'Text' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Container')
    expect(newSource).toContain('Text')
  })

  it('handles container with only properties (no children)', () => {
    const source = `Container pad 16, bg #FFF`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'Button' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    const newSource = getNewSource()!
    expect(newSource).toContain('Container pad 16, bg #FFF')
    expect(newSource).toContain('Button')
  })

  it('handles component names with numbers', () => {
    const source = `Container`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'Container', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'component', component: 'H1' }

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('H1')
  })

  it('handles container without direction defaulting to VBox', () => {
    const source = `App`
    const sourceMap = createTestSourceMap({
      nodes: [
        { id: 'node-1', componentName: 'App', line: 1, endLine: 1 },
      ],
    })

    const { handler, getNewSource } = createTestHandler(source, sourceMap)

    const zone = createDropZone({ targetId: 'node-1', placement: 'inside' })
    const data: DropData = { type: 'container' } // No direction specified

    const result = handler.handleDrop(zone, data)

    expect(result).toBe(true)
    expect(getNewSource()).toContain('VBox')
  })
})
