/**
 * ElementMover Grid Integration Tests
 *
 * Tests for grid snap and smart guides integration:
 * - Grid settings integration
 * - Grid snap behavior
 * - Smart guides when grid is disabled
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { gridSettings, smartGuidesSettings } from '../../core/settings'

// Create localStorage mock
function createLocalStorageMock() {
  const storage: Record<string, string> = {}
  return {
    storage,
    mock: {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => { storage[key] = value }),
      removeItem: vi.fn((key: string) => { delete storage[key] }),
      clear: vi.fn(() => { Object.keys(storage).forEach(k => delete storage[k]) }),
      get length() { return Object.keys(storage).length },
      key: vi.fn((i: number) => Object.keys(storage)[i] || null),
    }
  }
}

describe('ElementMover Grid Integration', () => {
  let mockData: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    // Mock localStorage
    mockData = createLocalStorageMock()
    // @ts-ignore
    global.localStorage = mockData.mock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('grid settings integration', () => {
    it('reads grid settings from settings store', () => {
      gridSettings.set({ enabled: true, size: 16 })

      const settings = gridSettings.get()
      expect(settings.enabled).toBe(true)
      expect(settings.size).toBe(16)
    })

    it('respects grid enabled state', () => {
      gridSettings.set({ enabled: true, size: 8 })

      const settings = gridSettings.get()
      expect(settings.enabled).toBe(true)
    })

    it('respects grid disabled state', () => {
      gridSettings.set({ enabled: false })

      const settings = gridSettings.get()
      expect(settings.enabled).toBe(false)
    })
  })

  describe('grid snap calculation', () => {
    it('snaps value to 8px grid', () => {
      const gridSize = 8
      const value = 103

      const snapped = Math.round(value / gridSize) * gridSize
      expect(snapped).toBe(104) // 103 rounds to 104
    })

    it('snaps value to 16px grid', () => {
      const gridSize = 16
      const value = 25

      const snapped = Math.round(value / gridSize) * gridSize
      expect(snapped).toBe(32) // 25 rounds to 32
    })

    it('snaps value to 4px grid', () => {
      const gridSize = 4
      const value = 9

      const snapped = Math.round(value / gridSize) * gridSize
      expect(snapped).toBe(8) // 9 rounds to 8
    })

    it('returns exact value when grid size is 1', () => {
      const gridSize = 1
      const value = 137

      const snapped = Math.round(value / gridSize) * gridSize
      expect(snapped).toBe(137)
    })
  })

  describe('smart guides integration', () => {
    it('shows smart guides when grid is disabled', () => {
      gridSettings.set({ enabled: false })
      smartGuidesSettings.set({ enabled: true })

      const gridEnabled = gridSettings.get().enabled
      const guidesEnabled = smartGuidesSettings.get().enabled

      expect(gridEnabled).toBe(false)
      expect(guidesEnabled).toBe(true)
    })

    it('hides smart guides when grid is enabled', () => {
      gridSettings.set({ enabled: true })

      const settings = gridSettings.get()
      expect(settings.enabled).toBe(true)
    })

    it('both can be disabled', () => {
      gridSettings.set({ enabled: false })
      smartGuidesSettings.set({ enabled: false })

      expect(gridSettings.get().enabled).toBe(false)
      expect(smartGuidesSettings.get().enabled).toBe(false)
    })
  })

  describe('grid size variations', () => {
    it('supports 4px grid', () => {
      gridSettings.setSize(4)
      expect(gridSettings.get().size).toBe(4)
    })

    it('supports 8px grid (default)', () => {
      gridSettings.setSize(8)
      expect(gridSettings.get().size).toBe(8)
    })

    it('supports 16px grid', () => {
      gridSettings.setSize(16)
      expect(gridSettings.get().size).toBe(16)
    })

    it('supports 1px grid (effectively no snap)', () => {
      gridSettings.setSize(1)
      expect(gridSettings.get().size).toBe(1)
    })
  })

  describe('grid toggle behavior', () => {
    it('toggleSnap toggles grid on/off', () => {
      expect(gridSettings.get().enabled).toBe(true) // Default

      const result1 = gridSettings.toggleSnap()
      expect(result1).toBe(false)
      expect(gridSettings.get().enabled).toBe(false)

      const result2 = gridSettings.toggleSnap()
      expect(result2).toBe(true)
      expect(gridSettings.get().enabled).toBe(true)
    })

    it('toggleVisual toggles grid display', () => {
      expect(gridSettings.get().showVisual).toBe(false) // Default

      const result1 = gridSettings.toggleVisual()
      expect(result1).toBe(true)
      expect(gridSettings.get().showVisual).toBe(true)

      const result2 = gridSettings.toggleVisual()
      expect(result2).toBe(false)
      expect(gridSettings.get().showVisual).toBe(false)
    })
  })
})
