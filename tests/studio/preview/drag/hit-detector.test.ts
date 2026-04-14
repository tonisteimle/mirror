/**
 * @vitest-environment jsdom
 *
 * Tests for HitDetector
 * Finds the drop target container under cursor
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { HitDetector } from '../../../../studio/preview/drag/hit-detector'
import { LayoutCache } from '../../../../studio/preview/drag/layout-cache'

// Mock DOMRect
const mockRect = (x: number, y: number, width: number, height: number): DOMRect => ({
  x,
  y,
  width,
  height,
  top: y,
  left: x,
  right: x + width,
  bottom: y + height,
  toJSON: () => ({}),
})

describe('HitDetector', () => {
  let detector: HitDetector
  let cache: LayoutCache
  let originalElementFromPoint: typeof document.elementFromPoint

  beforeEach(() => {
    detector = new HitDetector()
    cache = new LayoutCache()
    // Store original and mock elementFromPoint
    originalElementFromPoint = document.elementFromPoint
    document.elementFromPoint = vi.fn()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    document.elementFromPoint = originalElementFromPoint
  })

  describe('detect', () => {
    it('returns null when elementFromPoint returns null', () => {
      document.elementFromPoint = vi.fn().mockReturnValue(null)

      const result = detector.detect({ x: 100, y: 100 }, cache)
      expect(result).toBeNull()
    })

    it('returns null when no element has data-mirror-id', () => {
      const element = document.createElement('div')
      element.style.display = 'flex'
      document.elementFromPoint = vi.fn().mockReturnValue(element)

      const result = detector.detect({ x: 100, y: 100 }, cache)
      expect(result).toBeNull()
    })

    it('finds flex container under cursor', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'flex-container')
      container.style.display = 'flex'
      container.style.flexDirection = 'column'

      // Setup mock for getComputedStyle
      const originalGetComputedStyle = window.getComputedStyle
      vi.spyOn(window, 'getComputedStyle').mockImplementation(el => {
        if (el === container) {
          return {
            display: 'flex',
            flexDirection: 'column',
            position: 'static',
          } as CSSStyleDeclaration
        }
        return originalGetComputedStyle(el)
      })

      document.elementFromPoint = vi.fn().mockReturnValue(container)

      // Mock cache to return rect
      vi.spyOn(cache, 'getRect').mockReturnValue(mockRect(0, 0, 400, 300))

      const result = detector.detect({ x: 100, y: 100 }, cache)

      expect(result).not.toBeNull()
      expect(result?.containerId).toBe('flex-container')
      expect(result?.layout).toBe('flex-column')
    })

    it('detects flex-row layout', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'row-container')

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'flex',
        flexDirection: 'row',
        position: 'static',
      } as CSSStyleDeclaration)

      document.elementFromPoint = vi.fn().mockReturnValue(container)
      vi.spyOn(cache, 'getRect').mockReturnValue(mockRect(0, 0, 400, 300))

      const result = detector.detect({ x: 100, y: 100 }, cache)

      expect(result?.layout).toBe('flex-row')
    })

    it('detects grid layout as flex-row', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'grid-container')

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'grid',
        flexDirection: '',
        position: 'static',
      } as CSSStyleDeclaration)

      document.elementFromPoint = vi.fn().mockReturnValue(container)
      vi.spyOn(cache, 'getRect').mockReturnValue(mockRect(0, 0, 400, 300))

      const result = detector.detect({ x: 100, y: 100 }, cache)

      expect(result?.layout).toBe('flex-row')
    })

    it('detects stacked layout (position: relative) as flex-column', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'stacked-container')

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'block',
        flexDirection: '',
        position: 'relative',
      } as CSSStyleDeclaration)

      document.elementFromPoint = vi.fn().mockReturnValue(container)
      vi.spyOn(cache, 'getRect').mockReturnValue(mockRect(0, 0, 400, 300))

      const result = detector.detect({ x: 100, y: 100 }, cache)

      expect(result?.layout).toBe('flex-column')
    })

    it('walks up DOM to find valid container', () => {
      const parent = document.createElement('div')
      parent.setAttribute('data-mirror-id', 'parent')

      const child = document.createElement('div')
      // child has no data-mirror-id
      child.style.display = 'block'

      parent.appendChild(child)
      Object.defineProperty(child, 'parentElement', { value: parent })

      vi.spyOn(window, 'getComputedStyle').mockImplementation(el => {
        if (el === parent) {
          return {
            display: 'flex',
            flexDirection: 'column',
            position: 'static',
          } as CSSStyleDeclaration
        }
        return { display: 'block', flexDirection: '', position: 'static' } as CSSStyleDeclaration
      })

      document.elementFromPoint = vi.fn().mockReturnValue(child)
      vi.spyOn(cache, 'getRect').mockReturnValue(mockRect(0, 0, 400, 300))

      const result = detector.detect({ x: 100, y: 100 }, cache)

      expect(result?.containerId).toBe('parent')
    })

    it('returns null when cache has no rect for container', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        display: 'flex',
        flexDirection: 'column',
        position: 'static',
      } as CSSStyleDeclaration)

      document.elementFromPoint = vi.fn().mockReturnValue(container)
      vi.spyOn(cache, 'getRect').mockReturnValue(null) // No rect in cache

      const result = detector.detect({ x: 100, y: 100 }, cache)

      expect(result).toBeNull()
    })
  })
})
