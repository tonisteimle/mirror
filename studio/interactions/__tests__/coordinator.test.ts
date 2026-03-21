/**
 * InteractionCoordinator Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { createInteractionCoordinator, type InteractionCoordinator } from '../coordinator'
import { state, actions } from '../../core/state'
import { events } from '../../core/events'

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})
const { window } = dom
global.document = window.document
global.HTMLElement = window.HTMLElement
global.MouseEvent = window.MouseEvent

// Mock the DragController
vi.mock('../../visual/controllers/drag-controller', () => ({
  createDragController: vi.fn(() => ({
    startElementDrag: vi.fn(),
    startPaletteDrag: vi.fn(),
    isDragging: vi.fn(() => false),
    cancel: vi.fn(),
    setGridSize: vi.fn(),
    dispose: vi.fn(),
  })),
}))

describe('InteractionCoordinator', () => {
  let container: HTMLElement
  let coordinator: InteractionCoordinator

  beforeEach(() => {
    // Create container
    container = document.createElement('div')
    document.body.appendChild(container)

    // Reset state
    state.set({
      selection: { nodeId: null, origin: 'editor' },
      multiSelection: [],
      sourceMap: null,
      compiling: false,
    })

    // Create coordinator
    coordinator = createInteractionCoordinator(container)
  })

  afterEach(() => {
    coordinator.dispose()
    document.body.removeChild(container)
    vi.clearAllMocks()
  })

  describe('Initialization', () => {
    it('creates coordinator with default config', () => {
      expect(coordinator).toBeDefined()
      expect(coordinator.isDragging()).toBe(false)
    })

    it('creates coordinator with custom config', () => {
      const customCoordinator = createInteractionCoordinator(container, {
        gridSize: 10,
        enableGuides: true,
        threshold: 5,
      })
      expect(customCoordinator).toBeDefined()
      customCoordinator.dispose()
    })
  })

  describe('Selection Operations', () => {
    beforeEach(() => {
      // Set up a mock SourceMap for selection to work
      const mockSourceMap = {
        getNodeById: vi.fn((id: string) => id ? { nodeId: id, componentName: 'Box' } : null),
        getRootNodes: vi.fn(() => []),
      }
      state.set({ sourceMap: mockSourceMap as any })
    })

    it('selects a node', () => {
      coordinator.select('node-1', 'preview')
      expect(state.get().selection).toEqual({ nodeId: 'node-1', origin: 'preview' })
    })

    it('clears selection', () => {
      state.set({ selection: { nodeId: 'node-1', origin: 'preview' } })
      coordinator.clearSelection('preview')
      expect(state.get().selection.nodeId).toBe(null)
    })

    it('gets current selection', () => {
      state.set({ selection: { nodeId: 'node-1', origin: 'editor' } })
      const selection = coordinator.getSelection()
      expect(selection).toEqual({ nodeId: 'node-1', origin: 'editor' })
    })
  })

  describe('Multi-Selection Operations', () => {
    it('toggles multi-selection', () => {
      coordinator.toggleMultiSelection('node-1')
      expect(state.get().multiSelection).toContain('node-1')

      coordinator.toggleMultiSelection('node-1')
      expect(state.get().multiSelection).not.toContain('node-1')
    })

    it('sets multi-selection', () => {
      coordinator.setMultiSelection(['node-1', 'node-2', 'node-3'])
      expect(state.get().multiSelection).toEqual(['node-1', 'node-2', 'node-3'])
    })

    it('clears multi-selection', () => {
      state.set({ multiSelection: ['node-1', 'node-2'] })
      coordinator.clearMultiSelection()
      expect(state.get().multiSelection).toEqual([])
    })

    it('gets multi-selection', () => {
      state.set({ multiSelection: ['node-1', 'node-2'] })
      expect(coordinator.getMultiSelection()).toEqual(['node-1', 'node-2'])
    })
  })

  describe('Drag Operations', () => {
    it('checks if dragging', () => {
      expect(coordinator.isDragging()).toBe(false)
    })

    it('starts element drag', async () => {
      const element = document.createElement('div')
      element.dataset.mirrorId = 'node-1'
      container.appendChild(element)

      const event = new MouseEvent('mousedown', { clientX: 100, clientY: 100 })
      coordinator.startDrag(element, event)

      // Drag controller was initialized and used
      const mod = await import('../../visual/controllers/drag-controller')
      expect(mod.createDragController).toHaveBeenCalled()
    })
  })

  describe('Lifecycle', () => {
    it('disposes properly', () => {
      coordinator.dispose()
      // Should not throw when disposed
      expect(() => coordinator.isDragging()).not.toThrow()
    })
  })

  describe('Callbacks', () => {
    it('calls onSelectionChange callback', () => {
      const onSelectionChange = vi.fn()
      const coordWithCallbacks = createInteractionCoordinator(container, {}, { onSelectionChange })

      // Set up mock SourceMap
      const mockSourceMap = {
        getNodeById: vi.fn((id: string) => id ? { nodeId: id, componentName: 'Box' } : null),
        getRootNodes: vi.fn(() => []),
      }
      state.set({ sourceMap: mockSourceMap as any })

      coordWithCallbacks.select('node-1', 'preview')
      expect(onSelectionChange).toHaveBeenCalledWith('node-1', 'preview')

      coordWithCallbacks.dispose()
    })
  })
})
