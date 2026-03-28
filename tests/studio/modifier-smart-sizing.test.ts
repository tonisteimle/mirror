/**
 * Tests for SmartSizingService
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSmartSizingService, SmartSizingService } from '../../src/studio/services/smart-sizing'
import { SourceMap, SourceMapBuilder } from '../../src/ir/source-map'

// Helper to create container with mock getBoundingClientRect
function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.style.width = '400px'
  container.style.height = '400px'
  document.body.appendChild(container)
  return container
}

// Helper to create element with data-mirror-id
function createNodeElement(
  nodeId: string,
  options: {
    width?: number
    height?: number
    display?: string
    flexDirection?: string
    gap?: string
    padding?: string
  } = {}
): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)
  element.style.width = `${options.width || 200}px`
  element.style.height = `${options.height || 200}px`

  if (options.display) element.style.display = options.display
  if (options.flexDirection) element.style.flexDirection = options.flexDirection
  if (options.gap) element.style.gap = options.gap
  if (options.padding) element.style.padding = options.padding

  return element
}

// Helper to create a SourceMap
function createTestSourceMap(config: {
  nodes: Array<{
    id: string
    componentName: string
    parentId?: string
  }>
}): SourceMap {
  const builder = new SourceMapBuilder()

  for (const node of config.nodes) {
    builder.addNode(node.id, node.componentName, {
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 100,
    }, {
      parentId: node.parentId,
    })
  }

  return builder.build()
}

describe('SmartSizingService', () => {
  let container: HTMLElement
  let service: SmartSizingService

  beforeEach(() => {
    container = createContainer()
    service = createSmartSizingService()
  })

  afterEach(() => {
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.restoreAllMocks()
  })

  describe('calculateInitialSize', () => {
    it('returns full width and half height for vertical layout', () => {
      const parent = createNodeElement('parent', {
        width: 400,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
      })
      container.appendChild(parent)

      // Mock getBoundingClientRect
      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 400)
      )

      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'parent', componentName: 'Box' }]
      })

      const result = service.calculateInitialSize('parent', sourceMap, container)

      expect(result.width).toBe('full')
      // Half of 400 = 200
      expect(result.height).toBe('200')
    })

    it('returns half width and full height for horizontal layout', () => {
      const parent = createNodeElement('parent', {
        width: 400,
        height: 200,
        display: 'flex',
        flexDirection: 'row',
      })
      container.appendChild(parent)

      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 200)
      )

      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'parent', componentName: 'Box' }]
      })

      const result = service.calculateInitialSize('parent', sourceMap, container)

      // Half of 400 = 200
      expect(result.width).toBe('200')
      expect(result.height).toBe('full')
    })

    it('returns fallback for non-existent parent', () => {
      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'other', componentName: 'Box' }]
      })

      const result = service.calculateInitialSize('non-existent', sourceMap, container)

      expect(result.width).toBe('full')
      expect(result.height).toBe('hug')
    })

    it('respects minimum size of 40px', () => {
      const parent = createNodeElement('parent', {
        width: 50,
        height: 50,
        display: 'flex',
        flexDirection: 'column',
      })
      container.appendChild(parent)

      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 50, 50)
      )

      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'parent', componentName: 'Box' }]
      })

      const result = service.calculateInitialSize('parent', sourceMap, container)

      // Half of 50 = 25, but minimum is 40
      expect(result.height).toBe('40')
    })
  })

  describe('calculateResidualSpace', () => {
    it('returns full space when parent is empty', () => {
      const parent = createNodeElement('parent', {
        width: 400,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
      })
      container.appendChild(parent)

      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 400)
      )

      const sourceMap = createTestSourceMap({
        nodes: [{ id: 'parent', componentName: 'Box' }]
      })

      const result = service.calculateResidualSpace('parent', undefined, sourceMap, container)

      expect(result.width).toBe(400)
      expect(result.height).toBe(400)
    })

    it('subtracts child sizes in vertical layout', () => {
      const parent = createNodeElement('parent', {
        width: 400,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
      })
      const child = createNodeElement('child', { width: 400, height: 100 })
      parent.appendChild(child)
      container.appendChild(parent)

      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 400)
      )
      vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 100)
      )

      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'parent', componentName: 'Box' },
          { id: 'child', componentName: 'Box', parentId: 'parent' },
        ]
      })

      const result = service.calculateResidualSpace('parent', undefined, sourceMap, container)

      // 400 - 100 = 300 (minus gap)
      expect(result.height).toBeLessThanOrEqual(300)
    })

    it('subtracts child sizes in horizontal layout', () => {
      const parent = createNodeElement('parent', {
        width: 400,
        height: 200,
        display: 'flex',
        flexDirection: 'row',
      })
      const child = createNodeElement('child', { width: 150, height: 200 })
      parent.appendChild(child)
      container.appendChild(parent)

      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 200)
      )
      vi.spyOn(child, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 150, 200)
      )

      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'parent', componentName: 'Box' },
          { id: 'child', componentName: 'Box', parentId: 'parent' },
        ]
      })

      const result = service.calculateResidualSpace('parent', undefined, sourceMap, container)

      // 400 - 150 = 250 (minus gap)
      expect(result.width).toBeLessThanOrEqual(250)
    })

    it('excludes specified child from calculation', () => {
      const parent = createNodeElement('parent', {
        width: 400,
        height: 400,
        display: 'flex',
        flexDirection: 'column',
      })
      const child1 = createNodeElement('child1', { width: 400, height: 100 })
      const child2 = createNodeElement('child2', { width: 400, height: 100 })
      parent.appendChild(child1)
      parent.appendChild(child2)
      container.appendChild(parent)

      vi.spyOn(parent, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 400)
      )
      vi.spyOn(child1, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 400, 100)
      )
      vi.spyOn(child2, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 100, 400, 100)
      )

      const sourceMap = createTestSourceMap({
        nodes: [
          { id: 'parent', componentName: 'Box' },
          { id: 'child1', componentName: 'Box', parentId: 'parent' },
          { id: 'child2', componentName: 'Box', parentId: 'parent' },
        ]
      })

      // Exclude child2 from calculation (for move operation)
      const result = service.calculateResidualSpace('parent', 'child2', sourceMap, container)

      // Should only subtract child1's height
      // 400 - 100 = 300 (minus gap)
      expect(result.height).toBeGreaterThan(200) // If both counted, would be less
    })
  })
})
