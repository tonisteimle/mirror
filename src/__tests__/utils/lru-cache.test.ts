/**
 * LRU Cache Tests
 *
 * Tests for the Least Recently Used cache implementation:
 * - Basic get/set operations
 * - LRU eviction policy
 * - Size management
 * - Edge cases
 */

import { describe, it, expect } from 'vitest'
import { LRUCache } from '../../utils/lru-cache'

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('stores and retrieves a value', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)

      expect(cache.get('a')).toBe(1)
    })

    it('stores multiple values', () => {
      const cache = new LRUCache<string, number>(5)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
    })

    it('returns undefined for missing key', () => {
      const cache = new LRUCache<string, number>(3)

      expect(cache.get('nonexistent')).toBeUndefined()
    })

    it('overwrites existing value', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('a', 2)

      expect(cache.get('a')).toBe(2)
    })

    it('works with different key types', () => {
      const cache = new LRUCache<number, string>(3)

      cache.set(1, 'one')
      cache.set(2, 'two')

      expect(cache.get(1)).toBe('one')
      expect(cache.get(2)).toBe('two')
    })

    it('works with object values', () => {
      const cache = new LRUCache<string, { name: string }>(3)
      const obj = { name: 'test' }

      cache.set('key', obj)

      expect(cache.get('key')).toBe(obj)
    })
  })

  describe('has method', () => {
    it('returns true for existing key', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)

      expect(cache.has('a')).toBe(true)
    })

    it('returns false for missing key', () => {
      const cache = new LRUCache<string, number>(3)

      expect(cache.has('a')).toBe(false)
    })

    it('returns false after key is evicted', () => {
      const cache = new LRUCache<string, number>(2)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3) // evicts 'a'

      expect(cache.has('a')).toBe(false)
    })
  })

  describe('size property', () => {
    it('returns 0 for empty cache', () => {
      const cache = new LRUCache<string, number>(3)

      expect(cache.size).toBe(0)
    })

    it('returns correct size after adding items', () => {
      const cache = new LRUCache<string, number>(5)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      expect(cache.size).toBe(3)
    })

    it('does not exceed maxSize', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4)
      cache.set('e', 5)

      expect(cache.size).toBe(3)
    })

    it('does not increase when overwriting', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('a', 10) // overwrite, not new entry

      expect(cache.size).toBe(2)
    })
  })

  describe('clear method', () => {
    it('removes all entries', () => {
      const cache = new LRUCache<string, number>(5)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.clear()

      expect(cache.size).toBe(0)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBeUndefined()
    })

    it('allows adding items after clear', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.clear()
      cache.set('b', 2)

      expect(cache.size).toBe(1)
      expect(cache.get('b')).toBe(2)
    })
  })

  describe('LRU eviction', () => {
    it('evicts least recently used item when at capacity', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)
      cache.set('d', 4) // should evict 'a'

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('get() moves item to most recently used', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.get('a') // 'a' is now most recently used

      cache.set('d', 4) // should evict 'b' (least recently used)

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('set() moves item to most recently used when overwriting', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      cache.set('a', 10) // 'a' is now most recently used

      cache.set('d', 4) // should evict 'b' (least recently used)

      expect(cache.get('a')).toBe(10)
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('correctly evicts multiple items in sequence', () => {
      const cache = new LRUCache<string, number>(2)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3) // evicts 'a'
      cache.set('d', 4) // evicts 'b'

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBeUndefined()
      expect(cache.get('c')).toBe(3)
      expect(cache.get('d')).toBe(4)
    })

    it('access pattern affects eviction order', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('a', 1)
      cache.set('b', 2)
      cache.set('c', 3)

      // Access in reverse order
      cache.get('c')
      cache.get('b')
      cache.get('a')

      // Now 'c' is the least recently used
      cache.set('d', 4) // should evict 'c'

      expect(cache.get('a')).toBe(1)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBeUndefined()
      expect(cache.get('d')).toBe(4)
    })
  })

  describe('edge cases', () => {
    it('handles cache of size 1', () => {
      const cache = new LRUCache<string, number>(1)

      cache.set('a', 1)
      expect(cache.get('a')).toBe(1)

      cache.set('b', 2)
      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
    })

    it('handles get on non-existent key without affecting eviction', () => {
      const cache = new LRUCache<string, number>(2)

      cache.set('a', 1)
      cache.set('b', 2)

      cache.get('nonexistent') // should not affect anything

      cache.set('c', 3) // should evict 'a'

      expect(cache.get('a')).toBeUndefined()
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBe(3)
    })

    it('handles null values', () => {
      const cache = new LRUCache<string, null>(3)

      cache.set('a', null)

      expect(cache.get('a')).toBeNull()
      expect(cache.has('a')).toBe(true)
    })

    it('handles undefined values', () => {
      const cache = new LRUCache<string, undefined>(3)

      cache.set('a', undefined)

      // Note: get returns undefined for both missing keys and undefined values
      expect(cache.get('a')).toBeUndefined()
      expect(cache.has('a')).toBe(true)
    })

    it('handles empty string keys', () => {
      const cache = new LRUCache<string, number>(3)

      cache.set('', 1)

      expect(cache.get('')).toBe(1)
      expect(cache.has('')).toBe(true)
    })

    it('handles numeric keys', () => {
      const cache = new LRUCache<number, string>(3)

      cache.set(0, 'zero')
      cache.set(-1, 'negative')
      cache.set(1.5, 'float')

      expect(cache.get(0)).toBe('zero')
      expect(cache.get(-1)).toBe('negative')
      expect(cache.get(1.5)).toBe('float')
    })

    it('maintains correct order after many operations', () => {
      const cache = new LRUCache<string, number>(3)

      // Add and access items in various patterns
      cache.set('a', 1)
      cache.set('b', 2)
      cache.get('a')
      cache.set('c', 3)
      cache.get('b')
      cache.set('a', 10)
      cache.set('d', 4) // should evict 'c' (least recently used)

      expect(cache.get('a')).toBe(10)
      expect(cache.get('b')).toBe(2)
      expect(cache.get('c')).toBeUndefined()
      expect(cache.get('d')).toBe(4)
    })
  })
})
