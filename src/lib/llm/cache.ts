/**
 * LLM Response Cache
 *
 * Caches LLM responses to reduce API calls and improve performance.
 * Uses a hash of the prompt as the cache key with configurable TTL.
 */

// =============================================================================
// Types
// =============================================================================

export interface CacheEntry {
  /** The cached response */
  response: string
  /** When the entry was created */
  timestamp: number
  /** Time-to-live in milliseconds */
  ttl: number
  /** The prompt hash used as key */
  hash: string
  /** Model used for generation */
  model?: string
  /** Token usage if available */
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

export interface CacheStats {
  /** Total entries in cache */
  size: number
  /** Number of cache hits */
  hits: number
  /** Number of cache misses */
  misses: number
  /** Hit rate percentage */
  hitRate: number
  /** Total memory usage estimate in bytes */
  memoryEstimate: number
}

export interface CacheConfig {
  /** Maximum number of entries (default: 100) */
  maxEntries?: number
  /** Default TTL in milliseconds (default: 15 minutes) */
  defaultTtl?: number
  /** Whether to persist to localStorage (default: false) */
  persist?: boolean
  /** Storage key for persistence */
  storageKey?: string
}

// =============================================================================
// Hash Function
// =============================================================================

/**
 * Simple hash function for prompt strings.
 * Uses djb2 algorithm which is fast and has good distribution.
 */
function hashPrompt(prompt: string, model?: string): string {
  const input = model ? `${model}:${prompt}` : prompt
  let hash = 5381

  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = ((hash << 5) + hash) + char
  }

  return (hash >>> 0).toString(36)
}

// =============================================================================
// Response Cache Class
// =============================================================================

/**
 * In-memory cache for LLM responses with TTL support.
 *
 * @example
 * ```typescript
 * const cache = new ResponseCache({ maxEntries: 50, defaultTtl: 10 * 60 * 1000 })
 *
 * // Check cache before making API call
 * const cached = cache.get(hashPrompt(prompt))
 * if (cached) {
 *   return cached.response
 * }
 *
 * // After API call
 * const response = await makeApiCall(prompt)
 * cache.set(hashPrompt(prompt), response)
 * ```
 */
export class ResponseCache {
  private cache: Map<string, CacheEntry> = new Map()
  private hits = 0
  private misses = 0

  private readonly maxEntries: number
  private readonly defaultTtl: number
  private readonly persist: boolean
  private readonly storageKey: string

  constructor(config: CacheConfig = {}) {
    this.maxEntries = config.maxEntries ?? 100
    this.defaultTtl = config.defaultTtl ?? 15 * 60 * 1000 // 15 minutes
    this.persist = config.persist ?? false
    this.storageKey = config.storageKey ?? 'mirror-llm-cache'

    if (this.persist) {
      this.loadFromStorage()
    }
  }

  /**
   * Get a cached response by prompt hash.
   *
   * @param hash - The prompt hash
   * @returns Cached response or null if not found/expired
   */
  get(hash: string): CacheEntry | null {
    const entry = this.cache.get(hash)

    if (!entry) {
      this.misses++
      return null
    }

    // Check if expired
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(hash)
      this.misses++
      return null
    }

    this.hits++
    return entry
  }

  /**
   * Store a response in the cache.
   *
   * @param hash - The prompt hash
   * @param response - The response to cache
   * @param ttl - Optional TTL override in milliseconds
   * @param metadata - Optional metadata (model, usage)
   */
  set(
    hash: string,
    response: string,
    ttl?: number,
    metadata?: { model?: string; usage?: { promptTokens: number; completionTokens: number } }
  ): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries) {
      this.evictOldest()
    }

    const entry: CacheEntry = {
      response,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      hash,
      model: metadata?.model,
      usage: metadata?.usage,
    }

    this.cache.set(hash, entry)

    if (this.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Check if a hash exists in cache (without affecting stats).
   */
  has(hash: string): boolean {
    const entry = this.cache.get(hash)
    if (!entry) return false

    const now = Date.now()
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(hash)
      return false
    }

    return true
  }

  /**
   * Invalidate (delete) a specific entry.
   */
  invalidate(hash: string): boolean {
    const deleted = this.cache.delete(hash)
    if (this.persist) {
      this.saveToStorage()
    }
    return deleted
  }

  /**
   * Invalidate entries matching a pattern.
   * Pattern can be a prefix or substring to match against the hash.
   */
  invalidatePattern(pattern: string): number {
    let count = 0
    for (const key of Array.from(this.cache.keys())) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
        count++
      }
    }
    if (count > 0 && this.persist) {
      this.saveToStorage()
    }
    return count
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear()
    this.hits = 0
    this.misses = 0
    if (this.persist) {
      this.saveToStorage()
    }
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
      memoryEstimate: this.estimateMemoryUsage(),
    }
  }

  /**
   * Reset statistics counters.
   */
  resetStats(): void {
    this.hits = 0
    this.misses = 0
  }

  /**
   * Get all cached entries (for debugging).
   */
  entries(): CacheEntry[] {
    return Array.from(this.cache.values())
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Evict the oldest entries until we're under capacity.
   */
  private evictOldest(): void {
    // Get entries sorted by timestamp
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)

    // Delete oldest 10% or at least 1
    const toDelete = Math.max(1, Math.floor(entries.length * 0.1))
    for (let i = 0; i < toDelete; i++) {
      this.cache.delete(entries[i][0])
    }
  }

  /**
   * Estimate memory usage in bytes.
   */
  private estimateMemoryUsage(): number {
    let bytes = 0
    for (const entry of Array.from(this.cache.values())) {
      // Rough estimate: string length * 2 (UTF-16) + object overhead
      bytes += entry.response.length * 2 + 200
    }
    return bytes
  }

  /**
   * Load cache from localStorage.
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (!stored) return

      const data = JSON.parse(stored) as CacheEntry[]
      const now = Date.now()

      // Only load non-expired entries
      for (const entry of data) {
        if (now - entry.timestamp < entry.ttl) {
          this.cache.set(entry.hash, entry)
        }
      }
    } catch {
      // Storage not available or corrupted
    }
  }

  /**
   * Save cache to localStorage.
   */
  private saveToStorage(): void {
    try {
      const data = Array.from(this.cache.values())
      localStorage.setItem(this.storageKey, JSON.stringify(data))
    } catch {
      // Storage not available or quota exceeded
    }
  }
}

// =============================================================================
// Global Cache Instance
// =============================================================================

let globalCache: ResponseCache | null = null

/**
 * Get or create the global response cache.
 */
export function getGlobalCache(): ResponseCache {
  if (!globalCache) {
    globalCache = new ResponseCache({
      maxEntries: 100,
      defaultTtl: 15 * 60 * 1000, // 15 minutes
      persist: false,
    })
  }
  return globalCache
}

/**
 * Clear the global cache.
 */
export function clearGlobalCache(): void {
  globalCache?.clear()
}

/**
 * Get stats from the global cache.
 */
export function getGlobalCacheStats(): CacheStats {
  return getGlobalCache().getStats()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Hash a prompt for cache lookup.
 */
export { hashPrompt }

/**
 * Create a cache key from prompt and optional parameters.
 */
export function createCacheKey(
  systemPrompt: string,
  userPrompt: string,
  model?: string
): string {
  const combined = `${systemPrompt}|||${userPrompt}`
  return hashPrompt(combined, model)
}
