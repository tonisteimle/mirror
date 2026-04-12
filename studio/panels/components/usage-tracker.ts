/**
 * UsageTracker - Track recently used components
 *
 * Stores the last N used component IDs in localStorage for quick access.
 */

import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('UsageTracker')
const STORAGE_KEY = 'mirror-recent-components'
const MAX_RECENT = 5

export interface UsageTrackerConfig {
  maxRecent?: number
  storageKey?: string
}

/**
 * UsageTracker class
 */
export class UsageTracker {
  private maxRecent: number
  private storageKey: string
  private recentIds: string[] = []

  constructor(config: UsageTrackerConfig = {}) {
    this.maxRecent = config.maxRecent ?? MAX_RECENT
    this.storageKey = config.storageKey ?? STORAGE_KEY
    this.load()
  }

  /**
   * Track usage of a component
   */
  track(componentId: string): void {
    // Remove if already in list
    this.recentIds = this.recentIds.filter(id => id !== componentId)

    // Add to front
    this.recentIds.unshift(componentId)

    // Trim to max length
    if (this.recentIds.length > this.maxRecent) {
      this.recentIds = this.recentIds.slice(0, this.maxRecent)
    }

    // Persist
    this.save()
  }

  /**
   * Get recently used component IDs (most recent first)
   */
  getRecent(): string[] {
    return [...this.recentIds]
  }

  /**
   * Check if there are any recent components
   */
  hasRecent(): boolean {
    return this.recentIds.length > 0
  }

  /**
   * Clear all recent components
   */
  clear(): void {
    this.recentIds = []
    this.save()
  }

  /**
   * Load from localStorage
   */
  private load(): void {
    try {
      const stored = localStorage.getItem(this.storageKey)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          this.recentIds = parsed.slice(0, this.maxRecent)
        }
      }
    } catch (err) {
      // Ignore parse errors but log in development
      log.warn('Failed to load recent items:', err)
      this.recentIds = []
    }
  }

  /**
   * Save to localStorage
   */
  private save(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.recentIds))
    } catch (err) {
      // Ignore storage errors (e.g., quota exceeded) but log in development
      log.warn('Failed to save recent items:', err)
    }
  }
}

// Singleton instance
let globalTracker: UsageTracker | null = null

/**
 * Get the global UsageTracker instance
 */
export function getUsageTracker(): UsageTracker {
  if (!globalTracker) {
    globalTracker = new UsageTracker()
  }
  return globalTracker
}

/**
 * Create a new UsageTracker instance
 */
export function createUsageTracker(config?: UsageTrackerConfig): UsageTracker {
  return new UsageTracker(config)
}
