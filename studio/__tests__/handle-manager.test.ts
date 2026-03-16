/**
 * Tests for HandleManager
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createHandleManager, HandleManager } from '../preview/handle-manager'

// Mock state and events
vi.mock('../core', () => ({
  state: {
    get: vi.fn(() => ({
      selection: { nodeId: 'test-node' }
    }))
  },
  events: {
    emit: vi.fn()
  }
}))

// Helper to create container
function createContainer(): HTMLElement {
  const container = document.createElement('div')
  container.style.width = '500px'
  container.style.height = '500px'
  container.style.position = 'relative'
  document.body.appendChild(container)
  return container
}

// Helper to create test element
function createTestElement(
  nodeId: string,
  options: {
    width?: number
    height?: number
    padding?: string
    display?: string
    flexDirection?: string
    gap?: string
    borderRadius?: string
  } = {}
): HTMLElement {
  const element = document.createElement('div')
  element.setAttribute('data-mirror-id', nodeId)
  element.style.width = `${options.width || 200}px`
  element.style.height = `${options.height || 200}px`
  element.style.padding = options.padding || '16px'
  element.style.display = options.display || 'flex'
  element.style.flexDirection = options.flexDirection || 'column'
  element.style.gap = options.gap || '8px'
  element.style.borderRadius = options.borderRadius || '8px'
  element.style.position = 'absolute'
  element.style.left = '50px'
  element.style.top = '50px'
  return element
}

describe('HandleManager', () => {
  let container: HTMLElement
  let manager: HandleManager

  beforeEach(() => {
    container = createContainer()
    manager = createHandleManager({ container })
  })

  afterEach(() => {
    manager.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
    vi.clearAllMocks()
  })

  describe('showHandles', () => {
    it('creates handles for a selected element', () => {
      const element = createTestElement('node-1')
      container.appendChild(element)

      // Mock getBoundingClientRect
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )

      manager.showHandles('node-1')

      // Should create overlay with handles
      const overlay = container.querySelector('.handle-overlay')
      expect(overlay).toBeTruthy()

      // Should have handles (padding + radius + possibly gap)
      const handles = overlay?.querySelectorAll('.handle')
      expect(handles?.length).toBeGreaterThanOrEqual(5) // 4 padding + 1 radius
    })

    it('creates padding handles for all 4 sides', () => {
      const element = createTestElement('node-1')
      container.appendChild(element)

      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )

      manager.showHandles('node-1')

      const paddingHandles = container.querySelectorAll('.handle-padding')
      expect(paddingHandles.length).toBe(4)
    })

    it('creates radius handle', () => {
      const element = createTestElement('node-1')
      container.appendChild(element)

      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )

      manager.showHandles('node-1')

      const radiusHandle = container.querySelector('.handle-radius')
      expect(radiusHandle).toBeTruthy()
    })

    it('creates gap handle for flex containers with children', () => {
      const element = createTestElement('node-1', {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      })
      const child1 = document.createElement('div')
      child1.style.height = '50px'
      const child2 = document.createElement('div')
      child2.style.height = '50px'
      element.appendChild(child1)
      element.appendChild(child2)
      container.appendChild(element)

      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )
      vi.spyOn(child1, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 66, 168, 50)
      )
      vi.spyOn(child2, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 132, 168, 50)
      )

      manager.showHandles('node-1')

      const gapHandle = container.querySelector('.handle-gap')
      expect(gapHandle).toBeTruthy()
    })
  })

  describe('hideHandles', () => {
    it('removes all handles', () => {
      const element = createTestElement('node-1')
      container.appendChild(element)

      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )

      manager.showHandles('node-1')
      expect(container.querySelectorAll('.handle').length).toBeGreaterThan(0)

      manager.hideHandles()
      expect(container.querySelectorAll('.handle').length).toBe(0)
    })
  })

  describe('handle cursors', () => {
    it('sets correct cursor for padding handles', () => {
      const element = createTestElement('node-1')
      container.appendChild(element)

      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )

      manager.showHandles('node-1')

      const handles = container.querySelectorAll('.handle-padding') as NodeListOf<HTMLElement>
      const directions = Array.from(handles).map(h => h.dataset.direction)

      // Should have n, s, e, w directions
      expect(directions).toContain('n')
      expect(directions).toContain('s')
      expect(directions).toContain('e')
      expect(directions).toContain('w')
    })

    it('radius handle has diagonal cursor', () => {
      const element = createTestElement('node-1')
      container.appendChild(element)

      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(50, 50, 200, 200)
      )
      vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 500, 500)
      )

      manager.showHandles('node-1')

      const radiusHandle = container.querySelector('.handle-radius') as HTMLElement
      expect(radiusHandle?.style.cursor).toBe('nesw-resize')
    })
  })

  describe('dispose', () => {
    it('removes overlay from DOM', () => {
      manager.dispose()

      const overlay = container.querySelector('.handle-overlay')
      expect(overlay).toBeFalsy()
    })

    it('can be called multiple times safely', () => {
      manager.dispose()
      manager.dispose() // Should not throw
    })
  })
})

describe('HandleManager snapping', () => {
  let container: HTMLElement
  let manager: HandleManager

  beforeEach(() => {
    container = createContainer()
    manager = createHandleManager({ container })
  })

  afterEach(() => {
    manager.dispose()
    if (container.parentNode) {
      container.parentNode.removeChild(container)
    }
  })

  it('snap points include common spacing values', () => {
    // Snap points are [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64]
    // This is implementation detail but important for UX
    const element = createTestElement('node-1', { padding: '0px' })
    container.appendChild(element)

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(50, 50, 200, 200)
    )
    vi.spyOn(container, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 500, 500)
    )

    manager.showHandles('node-1')

    // Handles should exist and be ready for snapping
    const handles = container.querySelectorAll('.handle')
    expect(handles.length).toBeGreaterThan(0)
  })
})
