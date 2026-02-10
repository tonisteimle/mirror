/**
 * Simple LRU (Least Recently Used) Cache implementation.
 * O(1) get and set operations using Map iteration order.
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>
  private readonly maxSize: number

  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  /**
   * Get a value from the cache.
   * Moves the accessed key to the end (most recently used).
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined
    }

    // Move to end (most recently used)
    const value = this.cache.get(key)!
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  /**
   * Set a value in the cache.
   * If cache is full, removes the least recently used entry.
   */
  set(key: K, value: V): void {
    // If key exists, delete it first to update position
    if (this.cache.has(key)) {
      this.cache.delete(key)
    }
    // Evict oldest entry if at capacity
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }

    this.cache.set(key, value)
  }

  /**
   * Check if a key exists in the cache.
   */
  has(key: K): boolean {
    return this.cache.has(key)
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current size of the cache.
   */
  get size(): number {
    return this.cache.size
  }
}
