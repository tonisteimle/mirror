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

// ============================================================================
// Handle Snap Settings (Feature 3: Custom Snap Grids)
// ============================================================================

export interface HandleSnapSettings {
  /** Snapping enabled */
  enabled: boolean
  /** Grid size in pixels (4, 8, 16, etc.) */
  gridSize: number
  /** Additional custom snap points */
  customPoints: number[]
  /** Snap threshold in pixels */
  threshold: number
  /** Maximum value for handles */
  maxValue: number
  /** Token snapping enabled (snap to design tokens) */
  tokenSnapping: boolean
}

const DEFAULT_HANDLE_SNAP: HandleSnapSettings = {
  enabled: true,
  gridSize: 8,
  customPoints: [],
  threshold: 4,
  maxValue: 200,
  tokenSnapping: true,
}

// In-memory state
let currentHandleSnapSettings: HandleSnapSettings = { ...DEFAULT_HANDLE_SNAP }

export const handleSnapSettings = {
  /**
   * Get current handle snap settings
   */
  get(): HandleSnapSettings {
    return { ...currentHandleSnapSettings }
  },

  /**
   * Update handle snap settings
   */
  set(settings: Partial<HandleSnapSettings>): void {
    currentHandleSnapSettings = { ...currentHandleSnapSettings, ...settings }
    events.emit('handleSnap:changed', currentHandleSnapSettings)
  },

  /**
   * Toggle snapping on/off
   */
  toggle(): boolean {
    const newValue = !currentHandleSnapSettings.enabled
    this.set({ enabled: newValue })
    return newValue
  },

  /**
   * Set grid size
   */
  setGridSize(size: number): void {
    if (size > 0 && size <= 64) {
      this.set({ gridSize: size })
    }
  },

  /**
   * Toggle token snapping on/off
   */
  toggleTokenSnapping(): boolean {
    const newValue = !currentHandleSnapSettings.tokenSnapping
    this.set({ tokenSnapping: newValue })
    return newValue
  },

  /**
   * Add custom snap point
   */
  addCustomPoint(value: number): void {
    if (!currentHandleSnapSettings.customPoints.includes(value)) {
      this.set({
        customPoints: [...currentHandleSnapSettings.customPoints, value].sort((a, b) => a - b),
      })
    }
  },

  /**
   * Remove custom snap point
   */
  removeCustomPoint(value: number): void {
    this.set({
      customPoints: currentHandleSnapSettings.customPoints.filter(p => p !== value),
    })
  },

  /**
   * Generate snap points based on current settings
   */
  getSnapPoints(): number[] {
    const settings = this.get()
    if (!settings.enabled) return []

    // Generate grid-based points
    const gridPoints: number[] = []
    for (let i = 0; i <= settings.maxValue; i += settings.gridSize) {
      gridPoints.push(i)
    }

    // Merge with custom points and deduplicate
    return [...new Set([...gridPoints, ...settings.customPoints])].sort((a, b) => a - b)
  },

  /**
   * Reset to defaults
   */
  reset(): void {
    currentHandleSnapSettings = { ...DEFAULT_HANDLE_SNAP }
    events.emit('handleSnap:changed', currentHandleSnapSettings)
  },
}
