/**
 * User Settings Service
 *
 * Persists user-level settings to localStorage.
 * No server, no user management.
 */

import { events } from '../core/events'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('UserSettings')

// =============================================================================
// Types
// =============================================================================

export interface UserSettings {
  recentIcons: string[]
  agentMemory: AgentMemoryData | null
}

export interface AgentMemoryData {
  preferences: [string, Preference][]
  patterns: [string, Pattern][]
  corrections: Correction[]
  snippets: [string, Snippet][]
}

interface Preference {
  category: 'color' | 'spacing' | 'layout' | 'typography' | 'component'
  key: string
  value: string
  confidence: number
}

interface Pattern {
  trigger: string
  action: PatternAction
  successCount: number
  failureCount: number
}

interface PatternAction {
  type: 'set_property' | 'add_component' | 'apply_pattern' | 'batch_edit' | string
  params: Record<string, unknown>
}

interface Correction {
  originalRequest: string
  originalAction: unknown
  correctedAction: unknown
  timestamp: string
}

interface Snippet {
  name: string
  description: string
  code: string
  tags: string[]
  usageCount: number
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'mirror-user-settings'

const DEFAULT_SETTINGS: UserSettings = {
  recentIcons: [],
  agentMemory: null,
}

// =============================================================================
// User Settings Service
// =============================================================================

class UserSettingsService {
  private settings: UserSettings = { ...DEFAULT_SETTINGS }
  private loaded = false
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  /**
   * Load settings from localStorage
   */
  async load(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...data,
        }
        log.info('Loaded from localStorage')
      } else {
        this.settings = { ...DEFAULT_SETTINGS }
        log.info('No settings found, using defaults')
      }
      this.loaded = true
      events.emit('userSettings:loaded', { settings: this.settings as unknown as Record<string, unknown> })
    } catch (error) {
      log.warn('Failed to load:', error)
      this.settings = { ...DEFAULT_SETTINGS }
      this.loaded = true
    }
  }

  /**
   * Save settings to localStorage (debounced)
   */
  private scheduleSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout)
    }

    this.saveTimeout = setTimeout(() => {
      this.saveNow()
    }, 500)
  }

  /**
   * Save settings immediately
   */
  private saveNow(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
      log.info('Saved to localStorage')
    } catch (error) {
      log.warn('Failed to save:', error)
    }
  }

  // ===========================================================================
  // Recent Icons
  // ===========================================================================

  getRecentIcons(): string[] {
    return [...this.settings.recentIcons]
  }

  addRecentIcon(iconName: string, maxRecent = 12): void {
    const icons = this.settings.recentIcons.filter(i => i !== iconName)
    icons.unshift(iconName)
    this.settings.recentIcons = icons.slice(0, maxRecent)
    this.scheduleSave()
  }

  clearRecentIcons(): void {
    this.settings.recentIcons = []
    this.scheduleSave()
  }

  // ===========================================================================
  // Agent Memory
  // ===========================================================================

  getAgentMemory(): AgentMemoryData | null {
    return this.settings.agentMemory
  }

  setAgentMemory(memory: AgentMemoryData): void {
    this.settings.agentMemory = memory
    this.scheduleSave()
  }

  clearAgentMemory(): void {
    this.settings.agentMemory = null
    this.scheduleSave()
  }

  // ===========================================================================
  // General
  // ===========================================================================

  isLoaded(): boolean {
    return this.loaded
  }

  getAll(): UserSettings {
    return { ...this.settings }
  }

  /**
   * Clear all settings and reset to defaults
   */
  reset(): void {
    this.settings = { ...DEFAULT_SETTINGS }
    this.saveNow()
  }
}

// =============================================================================
// Singleton
// =============================================================================

let instance: UserSettingsService | null = null

export function getUserSettings(): UserSettingsService {
  if (!instance) {
    instance = new UserSettingsService()
  }
  return instance
}

/**
 * Initialize user settings (call on app startup)
 */
export async function initUserSettings(): Promise<void> {
  const settings = getUserSettings()
  await settings.load()
}
