/**
 * LayoutExtractor Tests
 *
 * Phase 1 of Preview Architecture Refactoring
 * Tests for extracting layout information from rendered DOM
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  extractLayoutInfo,
  extractElementLayout,
  extractAndStoreLayout,
  getLayoutRect,
  getLayoutRects,
  hasLayoutInfo,
} from '../../studio/preview/layout-extractor'
import { state, actions } from '../../studio/core/state'

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
global.window = dom.window as unknown as Window & typeof globalThis

describe('LayoutExtractor', () => {
  let container: HTMLElement

  beforeEach(() => {
    // Reset state
    actions.clearLayoutInfo()

    // Create container
    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    // Mock getBoundingClientRect for container
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
      top: 0,
      right: 800,
      bottom: 600,
      left: 0,
      toJSON: () => ({}),
    })
  })

  afterEach(() => {
    container.remove()
    vi.restoreAllMocks()
  })

  describe('extractLayoutInfo()', () => {
    it('extracts layout for all elements with data-mirror-id', () => {
      // Create test elements
      const frame1 = createMirrorElement('node-1', container, {
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      })
      const frame2 = createMirrorElement('node-2', container, {
        x: 50,
        y: 150,
        width: 150,
        height: 80,
      })

      const layoutInfo = extractLayoutInfo(container)

      expect(layoutInfo.size).toBe(2)
      expect(layoutInfo.has('node-1')).toBe(true)
      expect(layoutInfo.has('node-2')).toBe(true)
    })

    it('returns empty map for container with no mirror elements', () => {
      const layoutInfo = extractLayoutInfo(container)
      expect(layoutInfo.size).toBe(0)
    })

    it('calculates position relative to container', () => {
      createMirrorElement('node-1', container, {
        x: 100,
        y: 50,
        width: 200,
        height: 100,
      })

      const layoutInfo = extractLayoutInfo(container)
      const rect = layoutInfo.get('node-1')

      expect(rect?.x).toBe(100)
      expect(rect?.y).toBe(50)
    })

    it('extracts nested elements correctly', () => {
      const parent = createMirrorElement('parent', container, {
        x: 10,
        y: 10,
        width: 400,
        height: 300,
      })

      createMirrorElement('child', parent, {
        x: 30,
        y: 30,
        width: 100,
        height: 50,
      })

      const layoutInfo = extractLayoutInfo(container)

      expect(layoutInfo.size).toBe(2)
      expect(layoutInfo.get('child')?.parentId).toBe('parent')
    })
  })

  describe('extractElementLayout()', () => {
    it('extracts dimensions correctly', () => {
      const element = createMirrorElement('node-1', container, {
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.width).toBe(200)
      expect(layout?.height).toBe(100)
    })

    it('extracts padding values', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        padding: '10px 20px 15px 25px',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.padding.top).toBe(10)
      expect(layout?.padding.right).toBe(20)
      expect(layout?.padding.bottom).toBe(15)
      expect(layout?.padding.left).toBe(25)
    })

    it('extracts gap value', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        gap: '16px',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.gap).toBe(16)
    })

    it('extracts border radius', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        borderRadius: '8px',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.radius).toBe(8)
    })

    it('detects absolute positioning', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        position: 'absolute',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.isAbsolute).toBe(true)
    })

    it('detects flex direction row', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        display: 'flex',
        flexDirection: 'row',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.flexDirection).toBe('row')
      expect(layout?.isContainer).toBe(true)
    })

    it('detects flex direction column', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        display: 'flex',
        flexDirection: 'column',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.flexDirection).toBe('column')
    })

    it('detects grid container', () => {
      const element = createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 200,
        height: 100,
        display: 'grid',
      })

      const containerRect = container.getBoundingClientRect()
      const layout = extractElementLayout(element, containerRect)

      expect(layout?.isContainer).toBe(true)
    })
  })

  describe('extractAndStoreLayout()', () => {
    it('stores layout info in state', () => {
      createMirrorElement('node-1', container, {
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      })

      extractAndStoreLayout(container)

      const currentState = state.get()
      expect(currentState.layoutInfo.size).toBe(1)
      expect(currentState.layoutInfo.has('node-1')).toBe(true)
    })

    it('increments layout version', () => {
      const initialVersion = state.get().layoutVersion

      createMirrorElement('node-1', container, {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      })

      extractAndStoreLayout(container)

      expect(state.get().layoutVersion).toBe(initialVersion + 1)
    })
  })

  describe('getLayoutRect()', () => {
    it('returns layout rect from state', () => {
      createMirrorElement('node-1', container, {
        x: 10,
        y: 20,
        width: 200,
        height: 100,
      })

      extractAndStoreLayout(container)

      const rect = getLayoutRect('node-1')
      expect(rect).not.toBeNull()
      expect(rect?.x).toBe(10)
      expect(rect?.y).toBe(20)
    })

    it('returns null for non-existent node', () => {
      const rect = getLayoutRect('non-existent')
      expect(rect).toBeNull()
    })
  })

  describe('getLayoutRects()', () => {
    it('returns multiple layout rects', () => {
      createMirrorElement('node-1', container, { x: 0, y: 0, width: 100, height: 100 })
      createMirrorElement('node-2', container, { x: 100, y: 0, width: 100, height: 100 })
      createMirrorElement('node-3', container, { x: 200, y: 0, width: 100, height: 100 })

      extractAndStoreLayout(container)

      const rects = getLayoutRects(['node-1', 'node-3'])
      expect(rects.size).toBe(2)
      expect(rects.has('node-1')).toBe(true)
      expect(rects.has('node-3')).toBe(true)
      expect(rects.has('node-2')).toBe(false)
    })

    it('skips non-existent nodes', () => {
      createMirrorElement('node-1', container, { x: 0, y: 0, width: 100, height: 100 })

      extractAndStoreLayout(container)

      const rects = getLayoutRects(['node-1', 'non-existent'])
      expect(rects.size).toBe(1)
    })
  })

  describe('hasLayoutInfo()', () => {
    it('returns true for existing node', () => {
      createMirrorElement('node-1', container, { x: 0, y: 0, width: 100, height: 100 })
      extractAndStoreLayout(container)

      expect(hasLayoutInfo('node-1')).toBe(true)
    })

    it('returns false for non-existent node', () => {
      expect(hasLayoutInfo('non-existent')).toBe(false)
    })
  })
})

/**
 * Helper to create a mock element with data-mirror-id and mocked styles
 */
function createMirrorElement(
  nodeId: string,
  parent: HTMLElement,
  options: {
    x: number
    y: number
    width: number
    height: number
    padding?: string
    gap?: string
    borderRadius?: string
    position?: string
    display?: string
    flexDirection?: string
  }
): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)

  // Apply styles
  if (options.padding) element.style.padding = options.padding
  if (options.gap) element.style.gap = options.gap
  if (options.borderRadius) element.style.borderRadius = options.borderRadius
  if (options.position) element.style.position = options.position
  if (options.display) element.style.display = options.display
  if (options.flexDirection) element.style.flexDirection = options.flexDirection

  parent.appendChild(element)

  // Mock getBoundingClientRect
  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    top: options.y,
    right: options.x + options.width,
    bottom: options.y + options.height,
    left: options.x,
    toJSON: () => ({}),
  })

  return element
}
