/**
 * Style Cache Module
 *
 * Provides caching for computed styles to avoid redundant calculations.
 * Uses a LRU-style cache with size limits and TTL expiration.
 */

import type React from 'react'

interface CacheEntry {
  style: React.CSSProperties
  timestamp: number
}

// Cache configuration
const MAX_CACHE_SIZE = 500
const CACHE_TTL_MS = 30000  // 30 seconds

// Style cache storage
const styleCache = new Map<string, CacheEntry>()

/**
 * Generate a cache key from properties and component name
 */
function generateCacheKey(
  componentName: string,
  properties: Record<string, unknown>,
  modifiers: string[]
): string {
  // Create a stable key from properties
  const propKeys = Object.keys(properties).sort()
  const propStr = propKeys.map(k => `${k}:${JSON.stringify(properties[k])}`).join('|')
  const modStr = modifiers.sort().join(',')
  return `${componentName}::${propStr}::${modStr}`
}

/**
 * Get a cached style or compute and cache it
 */
export function getCachedStyle(
  componentName: string,
  properties: Record<string, unknown>,
  modifiers: string[],
  computeFn: () => React.CSSProperties
): React.CSSProperties {
  const key = generateCacheKey(componentName, properties, modifiers)
  const now = Date.now()

  // Check for cached entry
  const cached = styleCache.get(key)
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.style
  }

  // Compute new style
  const style = computeFn()

  // Cache the result
  styleCache.set(key, { style, timestamp: now })

  // Cleanup if cache is too large
  if (styleCache.size > MAX_CACHE_SIZE) {
    cleanupCache(now)
  }

  return style
}

/**
 * Remove expired entries from cache
 */
function cleanupCache(now: number): void {
  const expiredKeys: string[] = []

  for (const [key, entry] of styleCache) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      expiredKeys.push(key)
    }
  }

  for (const key of expiredKeys) {
    styleCache.delete(key)
  }

  // If still too large, remove oldest entries
  if (styleCache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(styleCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toRemove = entries.slice(0, styleCache.size - MAX_CACHE_SIZE + 100)
    for (const [key] of toRemove) {
      styleCache.delete(key)
    }
  }
}

/**
 * Clear the entire style cache
 * (useful when design tokens change)
 */
export function clearStyleCache(): void {
  styleCache.clear()
}

/**
 * Get current cache size (for debugging/monitoring)
 */
export function getStyleCacheSize(): number {
  return styleCache.size
}
