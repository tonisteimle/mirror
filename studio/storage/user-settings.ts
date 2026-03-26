/**
 * User Settings Service
 *
 * Persists user-level settings to server.
 * During development: single default user, no login required.
 */

import { events } from '../core/events'

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
  type: 'set_property' | 'add_component' | 'apply_pattern' | 'batch_edit'
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
// Default Values
// =============================================================================

const DEFAULT_SETTINGS: UserSettings = {
  recentIcons: [],
  agentMemory: null,
}

// =============================================================================
// API Helper
// =============================================================================

function getApiBase(): string {
  if (typeof window === 'undefined') {
    return '/api'
  }

  const globalConfig = (window as unknown as { MIRROR_API_BASE?: string }).MIRROR_API_BASE
  if (globalConfig) {
    return globalConfig
  }

  const scriptTag = document.querySelector('script[data-api-base]')
  if (scriptTag) {
    const apiBase = scriptTag.getAttribute('data-api-base')
    if (apiBase) return apiBase
  }

  const pathname = window.location.pathname
  let basePath = pathname

  if (basePath.includes('.')) {
    basePath = basePath.substring(0, basePath.lastIndexOf('/'))
  }

  basePath = basePath.replace(/\/$/, '')
  return basePath + '/api'
}

// =============================================================================
// User Settings Service
// =============================================================================

class UserSettingsService {
  private settings: UserSettings = { ...DEFAULT_SETTINGS }
  private loaded = false
  private saveTimeout: ReturnType<typeof setTimeout> | null = null
  private apiBase: string

  constructor() {
    this.apiBase = getApiBase()
  }

  /**
   * Load settings from server
   */
  async load(): Promise<void> {
    try {
      const response = await fetch(`${this.apiBase}/user/settings`)

      if (response.ok) {
        const data = await response.json()
        this.settings = {
          ...DEFAULT_SETTINGS,
          ...data,
        }
        this.loaded = true
        console.log('[UserSettings] Loaded from server')
        events.emit('userSettings:loaded', this.settings)
      } else if (response.status === 404) {
        // No settings yet, use defaults
        this.settings = { ...DEFAULT_SETTINGS }
        this.loaded = true
        console.log('[UserSettings] No settings found, using defaults')
      } else {
        console.warn('[UserSettings] Failed to load:', response.status)
      }
    } catch (error) {
      console.warn('[UserSettings] Failed to load:', error)
      // Use defaults on error
      this.settings = { ...DEFAULT_SETTINGS }
    }
  }

  /**
   * Save settings to server (debounced)
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
  private async saveNow(): Promise<void> {
    try {
      await fetch(`${this.apiBase}/user/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.settings),
      })
      console.log('[UserSettings] Saved to server')
    } catch (error) {
      console.warn('[UserSettings] Failed to save:', error)
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
