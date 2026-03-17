/**
 * Settings Store for Studio
 *
 * Manages user preferences with localStorage persistence.
 * Uses event system for reactive updates.
 */

import { events } from './events'

// ============================================================================
// Grid Settings
// ============================================================================

export interface GridSettings {
  /** Grid snap enabled */
  enabled: boolean
  /** Grid size in pixels */
  size: number
  /** Show visual grid overlay */
  showVisual: boolean
  /** Grid line color */
  color: string
}

const DEFAULT_GRID: GridSettings = {
  enabled: true,
  size: 8,
  showVisual: false,
  color: '#3B82F6',
}

const GRID_STORAGE_KEY = 'mirror-studio-grid'

export const gridSettings = {
  /**
   * Get current grid settings
   */
  get(): GridSettings {
    try {
      const stored = localStorage.getItem(GRID_STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_GRID, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('[Settings] Failed to parse grid settings:', e)
    }
    return { ...DEFAULT_GRID }
  },

  /**
   * Update grid settings
   */
  set(settings: Partial<GridSettings>): void {
    const current = this.get()
    const updated = { ...current, ...settings }
    try {
      localStorage.setItem(GRID_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('[Settings] Failed to save grid settings:', e)
    }
    events.emit('grid:changed', updated)
  },

  /**
   * Toggle grid snap on/off
   */
  toggleSnap(): boolean {
    const current = this.get()
    const newValue = !current.enabled
    this.set({ enabled: newValue })
    return newValue
  },

  /**
   * Toggle visual grid display
   */
  toggleVisual(): boolean {
    const current = this.get()
    const newValue = !current.showVisual
    this.set({ showVisual: newValue })
    return newValue
  },

  /**
   * Set grid size
   */
  setSize(size: number): void {
    if (size > 0 && size <= 100) {
      this.set({ size })
    }
  },

  /**
   * Reset to defaults
   */
  reset(): void {
    try {
      localStorage.removeItem(GRID_STORAGE_KEY)
    } catch (e) {
      // Ignore
    }
    events.emit('grid:changed', DEFAULT_GRID)
  },
}

// ============================================================================
// Smart Guides Settings
// ============================================================================

export interface SmartGuidesSettings {
  /** Smart guides enabled */
  enabled: boolean
  /** Snap threshold in pixels */
  threshold: number
  /** Guide line color */
  color: string
  /** Show distance indicators */
  showDistances: boolean
}

const DEFAULT_SMART_GUIDES: SmartGuidesSettings = {
  enabled: true,
  threshold: 4,
  color: '#FF6B6B',
  showDistances: true,
}

const SMART_GUIDES_STORAGE_KEY = 'mirror-studio-smart-guides'

export const smartGuidesSettings = {
  /**
   * Get current smart guides settings
   */
  get(): SmartGuidesSettings {
    try {
      const stored = localStorage.getItem(SMART_GUIDES_STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_SMART_GUIDES, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('[Settings] Failed to parse smart guides settings:', e)
    }
    return { ...DEFAULT_SMART_GUIDES }
  },

  /**
   * Update smart guides settings
   */
  set(settings: Partial<SmartGuidesSettings>): void {
    const current = this.get()
    const updated = { ...current, ...settings }
    try {
      localStorage.setItem(SMART_GUIDES_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('[Settings] Failed to save smart guides settings:', e)
    }
    events.emit('smartGuides:changed', updated)
  },

  /**
   * Toggle smart guides on/off
   */
  toggle(): boolean {
    const current = this.get()
    const newValue = !current.enabled
    this.set({ enabled: newValue })
    return newValue
  },
}

// ============================================================================
// General Settings
// ============================================================================

export interface GeneralSettings {
  /** Keyboard navigation step size (normal) */
  moveStep: number
  /** Keyboard navigation step size (with Shift) */
  moveStepShift: number
  /** Show position labels during drag */
  showPositionLabels: boolean
}

const DEFAULT_GENERAL: GeneralSettings = {
  moveStep: 1,
  moveStepShift: 10,
  showPositionLabels: true,
}

const GENERAL_STORAGE_KEY = 'mirror-studio-general'

export const generalSettings = {
  get(): GeneralSettings {
    try {
      const stored = localStorage.getItem(GENERAL_STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_GENERAL, ...JSON.parse(stored) }
      }
    } catch (e) {
      console.warn('[Settings] Failed to parse general settings:', e)
    }
    return { ...DEFAULT_GENERAL }
  },

  set(settings: Partial<GeneralSettings>): void {
    const current = this.get()
    const updated = { ...current, ...settings }
    try {
      localStorage.setItem(GENERAL_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('[Settings] Failed to save general settings:', e)
    }
    events.emit('settings:changed', updated)
  },
}
