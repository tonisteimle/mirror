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
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_KEY = 'mirror-user-settings'

const DEFAULT_SETTINGS: UserSettings = {
  recentIcons: [],
}

// =============================================================================
// User Settings Service
// =============================================================================

class UserSettingsService {
  private settings: UserSettings = { ...DEFAULT_SETTINGS }
  private loaded = false
  private saveTimeout: ReturnType<typeof setTimeout> | null = null

  async load(): Promise<void> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored)
        this.settings = { ...DEFAULT_SETTINGS, ...data }
        log.info('Loaded from localStorage')
      } else {
        this.settings = { ...DEFAULT_SETTINGS }
        log.info('No settings found, using defaults')
      }
      this.loaded = true
      events.emit('userSettings:loaded', {
        settings: this.settings as unknown as Record<string, unknown>,
      })
    } catch (error) {
      log.warn('Failed to load:', error)
      this.settings = { ...DEFAULT_SETTINGS }
      this.loaded = true
    }
  }

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout)
    this.saveTimeout = setTimeout(() => this.saveNow(), 500)
  }

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
  // General
  // ===========================================================================

  isLoaded(): boolean {
    return this.loaded
  }

  getAll(): UserSettings {
    return { ...this.settings }
  }

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

export async function initUserSettings(): Promise<void> {
  const settings = getUserSettings()
  await settings.load()
}
