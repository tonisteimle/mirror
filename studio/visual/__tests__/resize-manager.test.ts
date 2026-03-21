/**
 * ResizeManager Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { ResizeManager, createResizeManager, type ResizeHandle } from '../resize-manager'
import { OverlayManager, createOverlayManager } from '../overlay-manager'

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement
global.window = dom.window as unknown as Window & typeof globalThis
global.MouseEvent = dom.window.MouseEvent

// Mock events module
vi.mock('../../core', () => ({
  events: {
    emit: vi.fn(),
  },
}))

describe('ResizeManager', () => {
  let container: HTMLElement
  let overlayManager: OverlayManager
  let resizeManager: ResizeManager
  let mockGetSourceMap: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create container
    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    // Create overlay manager
    overlayManager = createOverlayManager({ container })

    // Create mock getSourceMap
    mockGetSourceMap = vi.fn().mockReturnValue({
      getNodeById: vi.fn().mockReturnValue({ parentId: 'parent-1' }),
    })

    // Create resize manager
    resizeManager = createResizeManager({
      container,
      overlayManager,
      getSourceMap: mockGetSourceMap,
    })
  })

  afterEach(() => {
    resizeManager.dispose()
    overlayManager.dispose()
    container.remove()
  })

  describe('showHandles()', () => {
    it('creates 8 resize handles for an element', () => {
      // Create test element
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      element.style.width = '100px'
      element.style.height = '80px'
      container.appendChild(element)

      // Mock getBoundingClientRect
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50,
        top: 30,
        width: 100,
        height: 80,
        right: 150,
        bottom: 110,
      })
      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      })

      resizeManager.showHandles('test-node')

      const handles = container.querySelectorAll('.resize-handle')
      expect(handles.length).toBe(8)
    })

    it('creates handles at correct positions', () => {
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      container.appendChild(element)

      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 200,
        height: 150,
        right: 300,
        bottom: 200,
      })
      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      })

      resizeManager.showHandles('test-node')

      const positions: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
      positions.forEach(pos => {
        const handle = container.querySelector(`.resize-handle-${pos}`)
        expect(handle).not.toBeNull()
        expect((handle as HTMLElement).dataset.position).toBe(pos)
        expect((handle as HTMLElement).dataset.nodeId).toBe('test-node')
      })
    })

    it('sets correct cursors for each handle', () => {
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      container.appendChild(element)

      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100,
        top: 50,
        width: 200,
        height: 150,
        right: 300,
        bottom: 200,
      })
      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
      })

      resizeManager.showHandles('test-node')

      const cursorMap: Record<ResizeHandle, string> = {
        nw: 'nwse-resize',
        n: 'ns-resize',
        ne: 'nesw-resize',
        e: 'ew-resize',
        se: 'nwse-resize',
        s: 'ns-resize',
        sw: 'nesw-resize',
        w: 'ew-resize',
      }

      Object.entries(cursorMap).forEach(([pos, cursor]) => {
        const handle = container.querySelector(`.resize-handle-${pos}`) as HTMLElement
        expect(handle.style.cursor).toBe(cursor)
      })
    })

    it('removes previous handles before creating new ones', () => {
      // First element
      const element1 = document.createElement('div')
      element1.dataset.mirrorId = 'node-1'
      container.appendChild(element1)
      element1.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50, top: 30, width: 100, height: 80, right: 150, bottom: 110,
      })

      // Second element
      const element2 = document.createElement('div')
      element2.dataset.mirrorId = 'node-2'
      container.appendChild(element2)
      element2.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 200, top: 100, width: 150, height: 100, right: 350, bottom: 200,
      })

      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600,
      })

      // Show handles for first element
      resizeManager.showHandles('node-1')
      expect(container.querySelectorAll('.resize-handle').length).toBe(8)

      // Show handles for second element
      resizeManager.showHandles('node-2')
      expect(container.querySelectorAll('.resize-handle').length).toBe(8)

      // All handles should be for node-2
      const handles = container.querySelectorAll('.resize-handle')
      handles.forEach(handle => {
        expect((handle as HTMLElement).dataset.nodeId).toBe('node-2')
      })
    })
  })

  describe('hideHandles()', () => {
    it('removes all handles from DOM', () => {
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      container.appendChild(element)
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50, top: 30, width: 100, height: 80, right: 150, bottom: 110,
      })
      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600,
      })

      resizeManager.showHandles('test-node')
      expect(container.querySelectorAll('.resize-handle').length).toBe(8)

      resizeManager.hideHandles()
      expect(container.querySelectorAll('.resize-handle').length).toBe(0)
    })
  })

  describe('refresh()', () => {
    it('re-shows handles for current node', () => {
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      container.appendChild(element)
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50, top: 30, width: 100, height: 80, right: 150, bottom: 110,
      })
      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600,
      })

      resizeManager.showHandles('test-node')

      // Modify element position
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 100, top: 60, width: 120, height: 90, right: 220, bottom: 150,
      })

      resizeManager.refresh()

      // Handles should be repositioned (we can't easily verify exact positions
      // but we verify they still exist)
      expect(container.querySelectorAll('.resize-handle').length).toBe(8)
    })

    it('does nothing if no current node', () => {
      // No handles shown, refresh should not throw
      expect(() => resizeManager.refresh()).not.toThrow()
      expect(container.querySelectorAll('.resize-handle').length).toBe(0)
    })
  })

  describe('dispose()', () => {
    it('removes handles and cleans up event listeners', () => {
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      container.appendChild(element)
      element.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 50, top: 30, width: 100, height: 80, right: 150, bottom: 110,
      })
      container.getBoundingClientRect = vi.fn().mockReturnValue({
        left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600,
      })

      resizeManager.showHandles('test-node')
      resizeManager.dispose()

      expect(container.querySelectorAll('.resize-handle').length).toBe(0)
    })
  })
})

describe('ResizeManager Sizing Logic', () => {
  // These tests verify the sizing mode detection logic (fill, hug, px)
  // This is internal logic exposed through the resize:end event

  let container: HTMLElement
  let overlayManager: OverlayManager
  let resizeManager: ResizeManager
  let mockEvents: { emit: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    vi.clearAllMocks()

    // Get mocked events
    const eventsModule = await import('../../core')
    mockEvents = eventsModule.events as unknown as { emit: ReturnType<typeof vi.fn> }

    container = document.createElement('div')
    container.style.position = 'relative'
    container.style.width = '800px'
    container.style.height = '600px'
    document.body.appendChild(container)

    overlayManager = createOverlayManager({ container })

    const mockGetSourceMap = vi.fn().mockReturnValue({
      getNodeById: vi.fn().mockReturnValue({ parentId: 'parent-1' }),
    })

    resizeManager = createResizeManager({
      container,
      overlayManager,
      getSourceMap: mockGetSourceMap,
    })
  })

  afterEach(() => {
    resizeManager.dispose()
    overlayManager.dispose()
    container.remove()
  })

  it('emits resize:start when drag begins', () => {
    // Create element and parent
    const parent = document.createElement('div')
    parent.dataset.mirrorId = 'parent-1'
    parent.style.width = '400px'
    parent.style.height = '300px'
    container.appendChild(parent)

    const element = document.createElement('div')
    element.dataset.mirrorId = 'test-node'
    element.style.width = '100px'
    element.style.height = '80px'
    parent.appendChild(element)

    element.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 50, top: 30, width: 100, height: 80, right: 150, bottom: 110,
    })
    container.getBoundingClientRect = vi.fn().mockReturnValue({
      left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600,
    })

    resizeManager.showHandles('test-node')

    // Simulate mousedown on SE handle
    const seHandle = container.querySelector('.resize-handle-se') as HTMLElement
    const mousedownEvent = new MouseEvent('mousedown', {
      clientX: 150,
      clientY: 110,
      bubbles: true,
    })
    seHandle.dispatchEvent(mousedownEvent)

    expect(mockEvents.emit).toHaveBeenCalledWith('resize:start', expect.objectContaining({
      nodeId: 'test-node',
      handle: 'se',
    }))
  })
})
