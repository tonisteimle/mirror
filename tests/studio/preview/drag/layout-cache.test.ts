/**
 * @vitest-environment jsdom
 *
 * Tests for LayoutCache
 * Caches element rectangles for O(1) lookup during drag
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { LayoutCache } from '../../../../studio/preview/drag/layout-cache'

// Mock getBoundingClientRect
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

describe('LayoutCache', () => {
  let cache: LayoutCache

  beforeEach(() => {
    cache = new LayoutCache()
  })

  describe('build', () => {
    it('caches rects for elements with data-mirror-id', () => {
      const container = document.createElement('div')
      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'node-1')
      child1.getBoundingClientRect = () => mockRect(0, 0, 100, 50)

      const child2 = document.createElement('div')
      child2.setAttribute('data-mirror-id', 'node-2')
      child2.getBoundingClientRect = () => mockRect(0, 60, 100, 50)

      container.appendChild(child1)
      container.appendChild(child2)

      cache.build(container)

      expect(cache.getRect('node-1')).toBeTruthy()
      expect(cache.getRect('node-2')).toBeTruthy()
      expect(cache.getRect('node-1')?.x).toBe(0)
      expect(cache.getRect('node-2')?.y).toBe(60)
    })

    it('ignores elements without data-mirror-id', () => {
      const container = document.createElement('div')
      const child = document.createElement('div')
      child.getBoundingClientRect = () => mockRect(0, 0, 100, 50)
      container.appendChild(child)

      cache.build(container)

      expect(cache.isEmpty()).toBe(true)
    })

    it('clears previous cache on rebuild', () => {
      const container1 = document.createElement('div')
      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'old-node')
      child1.getBoundingClientRect = () => mockRect(0, 0, 100, 50)
      container1.appendChild(child1)

      cache.build(container1)
      expect(cache.getRect('old-node')).toBeTruthy()

      const container2 = document.createElement('div')
      const child2 = document.createElement('div')
      child2.setAttribute('data-mirror-id', 'new-node')
      child2.getBoundingClientRect = () => mockRect(0, 0, 100, 50)
      container2.appendChild(child2)

      cache.build(container2)
      expect(cache.getRect('old-node')).toBeNull()
      expect(cache.getRect('new-node')).toBeTruthy()
    })
  })

  describe('getChildren', () => {
    it('returns children grouped by parent', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'root')
      container.getBoundingClientRect = () => mockRect(0, 0, 400, 300)

      const parent = document.createElement('div')
      parent.setAttribute('data-mirror-id', 'parent')
      parent.getBoundingClientRect = () => mockRect(0, 0, 400, 200)

      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'child-1')
      child1.getBoundingClientRect = () => mockRect(0, 0, 100, 50)

      const child2 = document.createElement('div')
      child2.setAttribute('data-mirror-id', 'child-2')
      child2.getBoundingClientRect = () => mockRect(0, 60, 100, 50)

      parent.appendChild(child1)
      parent.appendChild(child2)
      container.appendChild(parent)

      cache.build(container)

      const children = cache.getChildren('parent')
      expect(children).toHaveLength(2)
      expect(children[0].nodeId).toBe('child-1')
      expect(children[1].nodeId).toBe('child-2')
    })

    it('sorts children by position (top-to-bottom)', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'root')
      container.getBoundingClientRect = () => mockRect(0, 0, 400, 300)

      const parent = document.createElement('div')
      parent.setAttribute('data-mirror-id', 'parent')
      parent.getBoundingClientRect = () => mockRect(0, 0, 400, 200)

      // Add children out of order
      const child2 = document.createElement('div')
      child2.setAttribute('data-mirror-id', 'child-2')
      child2.getBoundingClientRect = () => mockRect(0, 100, 100, 50)

      const child1 = document.createElement('div')
      child1.setAttribute('data-mirror-id', 'child-1')
      child1.getBoundingClientRect = () => mockRect(0, 0, 100, 50)

      parent.appendChild(child2) // added first but lower
      parent.appendChild(child1) // added second but higher

      container.appendChild(parent)

      cache.build(container)

      const children = cache.getChildren('parent')
      expect(children[0].nodeId).toBe('child-1') // higher up
      expect(children[1].nodeId).toBe('child-2') // lower down
    })

    it('returns empty array for unknown parent', () => {
      cache.build(document.createElement('div'))
      expect(cache.getChildren('unknown')).toEqual([])
    })
  })

  describe('invalidate', () => {
    it('clears all cached data', () => {
      const container = document.createElement('div')
      const child = document.createElement('div')
      child.setAttribute('data-mirror-id', 'node')
      child.getBoundingClientRect = () => mockRect(0, 0, 100, 50)
      container.appendChild(child)

      cache.build(container)
      expect(cache.isEmpty()).toBe(false)

      cache.invalidate()
      expect(cache.isEmpty()).toBe(true)
      expect(cache.getRect('node')).toBeNull()
      expect(cache.getContainer()).toBeNull()
    })
  })

  describe('getContainer', () => {
    it('returns the container element', () => {
      const container = document.createElement('div')
      cache.build(container)
      expect(cache.getContainer()).toBe(container)
    })

    it('returns null before build', () => {
      expect(cache.getContainer()).toBeNull()
    })
  })
})
