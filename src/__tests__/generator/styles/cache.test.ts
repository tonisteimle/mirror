/**
 * Style Cache Tests
 *
 * Tests for style caching functionality:
 * - Cache hits and misses
 * - TTL expiration
 * - Cache size limits
 * - Cache clearing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCachedStyle,
  clearStyleCache,
  getStyleCacheSize,
} from '../../../generator/styles/style-cache'

describe('style-cache', () => {
  beforeEach(() => {
    clearStyleCache()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getCachedStyle', () => {
    it('computes and caches a new style', () => {
      const computeFn = vi.fn(() => ({ color: 'red' }))

      const result = getCachedStyle('Button', { bg: 'red' }, [], computeFn)

      expect(result).toEqual({ color: 'red' })
      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    it('returns cached style on subsequent calls', () => {
      const computeFn = vi.fn(() => ({ color: 'blue' }))

      getCachedStyle('Box', { w: 100 }, [], computeFn)
      const result = getCachedStyle('Box', { w: 100 }, [], computeFn)

      expect(result).toEqual({ color: 'blue' })
      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    it('recomputes when properties differ', () => {
      const computeFn = vi.fn((props?: Record<string, unknown>) => ({
        width: (props?.w || 0) as number
      }))

      getCachedStyle('Box', { w: 100 }, [], () => computeFn({ w: 100 }))
      getCachedStyle('Box', { w: 200 }, [], () => computeFn({ w: 200 }))

      expect(computeFn).toHaveBeenCalledTimes(2)
    })

    it('recomputes when component name differs', () => {
      const computeFn = vi.fn(() => ({ padding: '8px' }))

      getCachedStyle('Button', { pad: 8 }, [], computeFn)
      getCachedStyle('Card', { pad: 8 }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(2)
    })

    it('creates stable cache keys for same properties in different order', () => {
      const computeFn = vi.fn(() => ({ flex: 1 }))

      getCachedStyle('Box', { a: 1, b: 2, c: 3 }, [], computeFn)
      getCachedStyle('Box', { c: 3, a: 1, b: 2 }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(1)
    })

  })

  describe('TTL expiration', () => {
    it('returns cached value within TTL', () => {
      const computeFn = vi.fn(() => ({ margin: '10px' }))

      getCachedStyle('Box', {}, [], computeFn)

      // Advance 20 seconds (within 30s TTL)
      vi.advanceTimersByTime(20000)

      getCachedStyle('Box', {}, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    it('recomputes after TTL expires', () => {
      const computeFn = vi.fn(() => ({ border: '1px solid' }))

      getCachedStyle('Card', {}, [], computeFn)

      // Advance past 30s TTL
      vi.advanceTimersByTime(31000)

      getCachedStyle('Card', {}, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('clearStyleCache', () => {
    it('clears all cached styles', () => {
      const computeFn = vi.fn(() => ({ background: 'white' }))

      getCachedStyle('Box', {}, [], computeFn)
      getCachedStyle('Card', {}, [], computeFn)
      getCachedStyle('Button', {}, [], computeFn)

      expect(getStyleCacheSize()).toBe(3)

      clearStyleCache()

      expect(getStyleCacheSize()).toBe(0)
    })

    it('forces recomputation after clear', () => {
      const computeFn = vi.fn(() => ({ transform: 'scale(1)' }))

      getCachedStyle('Box', { scale: 1 }, [], computeFn)
      clearStyleCache()
      getCachedStyle('Box', { scale: 1 }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('getStyleCacheSize', () => {
    it('returns 0 for empty cache', () => {
      expect(getStyleCacheSize()).toBe(0)
    })

    it('returns correct count after adding entries', () => {
      getCachedStyle('A', {}, [], () => ({}))
      getCachedStyle('B', {}, [], () => ({}))
      getCachedStyle('C', {}, [], () => ({}))

      expect(getStyleCacheSize()).toBe(3)
    })

    it('does not increase for cache hits', () => {
      getCachedStyle('Box', { w: 100 }, [], () => ({}))
      getCachedStyle('Box', { w: 100 }, [], () => ({}))
      getCachedStyle('Box', { w: 100 }, [], () => ({}))

      expect(getStyleCacheSize()).toBe(1)
    })
  })

  describe('complex property values', () => {
    it('handles nested object properties', () => {
      const computeFn = vi.fn(() => ({ boxShadow: '0 2px 4px' }))

      getCachedStyle('Card', { shadow: { x: 0, y: 2, blur: 4 } }, [], computeFn)
      getCachedStyle('Card', { shadow: { x: 0, y: 2, blur: 4 } }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    it('differentiates nested objects with different values', () => {
      const computeFn = vi.fn(() => ({}))

      getCachedStyle('Card', { shadow: { x: 0, y: 2 } }, [], computeFn)
      getCachedStyle('Card', { shadow: { x: 0, y: 4 } }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(2)
    })

    it('handles array properties', () => {
      const computeFn = vi.fn(() => ({}))

      getCachedStyle('Box', { items: [1, 2, 3] }, [], computeFn)
      getCachedStyle('Box', { items: [1, 2, 3] }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(1)
    })

    it('handles string properties with special characters', () => {
      const computeFn = vi.fn(() => ({}))

      getCachedStyle('Text', { content: 'Hello | World :: Test' }, [], computeFn)
      getCachedStyle('Text', { content: 'Hello | World :: Test' }, [], computeFn)

      expect(computeFn).toHaveBeenCalledTimes(1)
    })
  })
})
