/**
 * Tests for SpatialCache
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SpatialCache, createSpatialCache } from '../../src/studio/spatial-cache'

// ===========================================
// TEST HELPERS
// ===========================================

function createElementWithRect(
  nodeId: string,
  rect: { left: number; top: number; width: number; height: number }
): HTMLElement {
  const element = document.createElement('div')
  element.dataset.mirrorId = nodeId

  vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
    new DOMRect(rect.left, rect.top, rect.width, rect.height)
  )

  document.body.appendChild(element)
  return element
}

function cleanupElements(elements: HTMLElement[]): void {
  elements.forEach((el) => {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  })
}

// ===========================================
// SpatialCache
// ===========================================

describe('SpatialCache', () => {
  let cache: SpatialCache
  let elements: HTMLElement[]

  beforeEach(() => {
    cache = new SpatialCache()
    elements = []
  })

  afterEach(() => {
    cleanupElements(elements)
    vi.restoreAllMocks()
  })

  describe('rebuild', () => {
    it('should index elements with data-mirror-id', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
        createElementWithRect('box-2', { left: 100, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      expect(cache.size).toBe(2)
    })

    it('should skip elements without data-mirror-id', () => {
      const elementWithId = createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 })
      const elementWithoutId = document.createElement('div')
      vi.spyOn(elementWithoutId, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(100, 0, 100, 100)
      )
      document.body.appendChild(elementWithoutId)

      elements = [elementWithId, elementWithoutId]
      cache.rebuild(elements)

      expect(cache.size).toBe(1)

      // Cleanup the element without ID manually
      elementWithoutId.remove()
    })

    it('should clear previous items on rebuild', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)
      expect(cache.size).toBe(1)

      cache.rebuild([])
      expect(cache.size).toBe(0)
    })
  })

  describe('findNearPoint', () => {
    it('should find elements within radius', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
        createElementWithRect('box-2', { left: 200, top: 200, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findNearPoint(50, 50, 50)

      expect(results).toHaveLength(1)
      expect(results[0].nodeId).toBe('box-1')
    })

    it('should find multiple elements within radius', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 50, height: 50 }),
        createElementWithRect('box-2', { left: 60, top: 0, width: 50, height: 50 }),
        createElementWithRect('box-3', { left: 500, top: 500, width: 50, height: 50 }),
      ]

      cache.rebuild(elements)

      const results = cache.findNearPoint(50, 25, 100)

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.nodeId).sort()).toEqual(['box-1', 'box-2'])
    })

    it('should return empty array when no elements in range', () => {
      elements = [
        createElementWithRect('box-1', { left: 500, top: 500, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findNearPoint(0, 0, 50)

      expect(results).toHaveLength(0)
    })

    it('should use default radius of 50', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findNearPoint(50, 50)

      expect(results).toHaveLength(1)
    })
  })

  describe('findAtPoint', () => {
    it('should find element containing point', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
        createElementWithRect('box-2', { left: 200, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findAtPoint(50, 50)

      expect(results).toHaveLength(1)
      expect(results[0].nodeId).toBe('box-1')
    })

    it('should find overlapping elements at point', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
        createElementWithRect('box-2', { left: 50, top: 50, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findAtPoint(75, 75)

      expect(results).toHaveLength(2)
    })

    it('should return empty array for point outside all elements', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findAtPoint(500, 500)

      expect(results).toHaveLength(0)
    })
  })

  describe('findInRect', () => {
    it('should find elements intersecting rectangle', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
        createElementWithRect('box-2', { left: 50, top: 50, width: 100, height: 100 }),
        createElementWithRect('box-3', { left: 500, top: 500, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findInRect(25, 25, 75, 75)

      expect(results).toHaveLength(2)
      expect(results.map((r) => r.nodeId).sort()).toEqual(['box-1', 'box-2'])
    })

    it('should return empty for non-intersecting rectangle', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      const results = cache.findInRect(200, 200, 300, 300)

      expect(results).toHaveLength(0)
    })
  })

  describe('clear', () => {
    it('should remove all items', () => {
      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
        createElementWithRect('box-2', { left: 100, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)
      expect(cache.size).toBe(2)

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.isEmpty).toBe(true)
    })
  })

  describe('size and isEmpty', () => {
    it('should return correct size', () => {
      expect(cache.size).toBe(0)

      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      expect(cache.size).toBe(1)
    })

    it('should return isEmpty correctly', () => {
      expect(cache.isEmpty).toBe(true)

      elements = [
        createElementWithRect('box-1', { left: 0, top: 0, width: 100, height: 100 }),
      ]

      cache.rebuild(elements)

      expect(cache.isEmpty).toBe(false)
    })
  })

  describe('SpatialItem properties', () => {
    it('should include element reference and nodeId', () => {
      elements = [
        createElementWithRect('box-1', { left: 10, top: 20, width: 100, height: 50 }),
      ]

      cache.rebuild(elements)

      const results = cache.findAtPoint(50, 40)

      expect(results[0].nodeId).toBe('box-1')
      expect(results[0].element).toBe(elements[0])
      expect(results[0].minX).toBe(10)
      expect(results[0].minY).toBe(20)
      expect(results[0].maxX).toBe(110)
      expect(results[0].maxY).toBe(70)
    })
  })
})

// ===========================================
// createSpatialCache factory
// ===========================================

describe('createSpatialCache', () => {
  it('should create SpatialCache instance', () => {
    const cache = createSpatialCache()

    expect(cache).toBeInstanceOf(SpatialCache)
    expect(cache.isEmpty).toBe(true)
  })
})

// ===========================================
// Performance characteristics
// ===========================================

describe('SpatialCache Performance', () => {
  let cache: SpatialCache
  let elements: HTMLElement[]

  beforeEach(() => {
    cache = new SpatialCache()
    elements = []
  })

  afterEach(() => {
    cleanupElements(elements)
    vi.restoreAllMocks()
  })

  it('should handle large number of elements', () => {
    // Create 200 elements in a grid
    for (let i = 0; i < 200; i++) {
      const row = Math.floor(i / 20)
      const col = i % 20
      elements.push(
        createElementWithRect(`box-${i}`, {
          left: col * 50,
          top: row * 50,
          width: 40,
          height: 40,
        })
      )
    }

    cache.rebuild(elements)

    expect(cache.size).toBe(200)

    // Query should still work
    const results = cache.findAtPoint(25, 25)
    expect(results.length).toBeGreaterThan(0)
  })

  it('should perform many queries efficiently', () => {
    // Create 100 elements
    for (let i = 0; i < 100; i++) {
      elements.push(
        createElementWithRect(`box-${i}`, {
          left: Math.random() * 1000,
          top: Math.random() * 1000,
          width: 50,
          height: 50,
        })
      )
    }

    cache.rebuild(elements)

    // Perform 1000 queries
    const start = performance.now()
    for (let i = 0; i < 1000; i++) {
      cache.findNearPoint(Math.random() * 1000, Math.random() * 1000)
    }
    const duration = performance.now() - start

    // Should complete in reasonable time (< 100ms for 1000 queries)
    expect(duration).toBeLessThan(100)
  })
})
