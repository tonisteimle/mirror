/**
 * Settings Store for Studio
 *
 * Manages user preferences in memory.
 * Settings are stored on server for logged-in users.
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
  color: '#5BA8F5',
}

// In-memory state
let currentGridSettings: GridSettings = { ...DEFAULT_GRID }

export const gridSettings = {
  /**
   * Get current grid settings
   */
  get(): GridSettings {
    return { ...currentGridSettings }
  },

  /**
   * Update grid settings
   */
  set(settings: Partial<GridSettings>): void {
    currentGridSettings = { ...currentGridSettings, ...settings }
    events.emit('grid:changed', currentGridSettings)
  },

  /**
   * Toggle grid snap on/off
   */
  toggleSnap(): boolean {
    const newValue = !currentGridSettings.enabled
    this.set({ enabled: newValue })
    return newValue
  },

  /**
   * Toggle visual grid display
   */
  toggleVisual(): boolean {
    const newValue = !currentGridSettings.showVisual
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
    currentGridSettings = { ...DEFAULT_GRID }
    events.emit('grid:changed', currentGridSettings)
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

// In-memory state
let currentSmartGuidesSettings: SmartGuidesSettings = { ...DEFAULT_SMART_GUIDES }

export const smartGuidesSettings = {
  /**
   * Get current smart guides settings
   */
  get(): SmartGuidesSettings {
    return { ...currentSmartGuidesSettings }
  },

  /**
   * Update smart guides settings
   */
  set(settings: Partial<SmartGuidesSettings>): void {
    currentSmartGuidesSettings = { ...currentSmartGuidesSettings, ...settings }
    events.emit('smartGuides:changed', currentSmartGuidesSettings)
  },

  /**
   * Toggle smart guides on/off
   */
  toggle(): boolean {
    const newValue = !currentSmartGuidesSettings.enabled
    this.set({ enabled: newValue })
    return newValue
  },

  /**
   * Reset to defaults
   */
  reset(): void {
    currentSmartGuidesSettings = { ...DEFAULT_SMART_GUIDES }
    events.emit('smartGuides:changed', currentSmartGuidesSettings)
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

// In-memory state
let currentGeneralSettings: GeneralSettings = { ...DEFAULT_GENERAL }

export const generalSettings = {
  /**
   * Get current general settings
   */
  get(): GeneralSettings {
    return { ...currentGeneralSettings }
  },

  /**
   * Update general settings
   */
  set(settings: Partial<GeneralSettings>): void {
    currentGeneralSettings = { ...currentGeneralSettings, ...settings }
    events.emit('settings:changed', currentGeneralSettings)
  },

  /**
   * Reset to defaults
   */
  reset(): void {
    currentGeneralSettings = { ...DEFAULT_GENERAL }
    events.emit('settings:changed', currentGeneralSettings)
  },
}
