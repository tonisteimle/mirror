/**
 * Settings Store Tests
 *
 * Tests for the settings persistence system:
 * - localStorage persistence
 * - Toggle functions
 * - Default values
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { gridSettings, smartGuidesSettings, generalSettings } from '../settings'
import { events } from '../events'

// Create localStorage mock with internal storage access
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

describe('Settings Store', () => {
  let mockData: ReturnType<typeof createLocalStorageMock>

  beforeEach(() => {
    mockData = createLocalStorageMock()
    // @ts-ignore
    global.localStorage = mockData.mock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('gridSettings', () => {
    describe('get()', () => {
      it('returns default values when no storage', () => {
        const settings = gridSettings.get()

        expect(settings.enabled).toBe(true)
        expect(settings.size).toBe(8)
        expect(settings.showVisual).toBe(false)
        expect(settings.color).toBe('#3B82F6')
      })

      it('returns stored values', () => {
        mockData.storage['mirror-studio-grid'] = JSON.stringify({
          enabled: false,
          size: 16,
        })

        const settings = gridSettings.get()

        expect(settings.enabled).toBe(false)
        expect(settings.size).toBe(16)
      })

      it('merges stored values with defaults', () => {
        mockData.storage['mirror-studio-grid'] = JSON.stringify({
          enabled: false,
        })

        const settings = gridSettings.get()

        expect(settings.enabled).toBe(false)
        expect(settings.size).toBe(8) // Default
        expect(settings.showVisual).toBe(false) // Default
      })

      it('handles invalid JSON gracefully', () => {
        mockData.storage['mirror-studio-grid'] = 'invalid json'
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const settings = gridSettings.get()

        expect(settings.enabled).toBe(true) // Default
        expect(warnSpy).toHaveBeenCalled()
      })
    })

    describe('set()', () => {
      it('saves settings to localStorage', () => {
        gridSettings.set({ size: 12 })

        expect(mockData.storage['mirror-studio-grid']).toBeDefined()
        const saved = JSON.parse(mockData.storage['mirror-studio-grid'])
        expect(saved.size).toBe(12)
      })

      it('merges with existing settings', () => {
        gridSettings.set({ size: 12 })
        gridSettings.set({ enabled: false })

        const saved = JSON.parse(mockData.storage['mirror-studio-grid'])
        expect(saved.size).toBe(12)
        expect(saved.enabled).toBe(false)
      })

      it('emits grid:changed event', () => {
        const handler = vi.fn()
        const unsub = events.on('grid:changed', handler)

        gridSettings.set({ size: 16 })

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          size: 16,
        }))

        unsub()
      })
    })

    describe('toggleSnap()', () => {
      it('toggles enabled state', () => {
        expect(gridSettings.get().enabled).toBe(true)

        const result = gridSettings.toggleSnap()

        expect(result).toBe(false)
        expect(gridSettings.get().enabled).toBe(false)
      })

      it('toggles back to enabled', () => {
        gridSettings.set({ enabled: false })

        const result = gridSettings.toggleSnap()

        expect(result).toBe(true)
        expect(gridSettings.get().enabled).toBe(true)
      })

      it('emits event on toggle', () => {
        const handler = vi.fn()
        const unsub = events.on('grid:changed', handler)

        gridSettings.toggleSnap()

        expect(handler).toHaveBeenCalled()
        unsub()
      })
    })

    describe('toggleVisual()', () => {
      it('toggles showVisual state', () => {
        expect(gridSettings.get().showVisual).toBe(false)

        const result = gridSettings.toggleVisual()

        expect(result).toBe(true)
        expect(gridSettings.get().showVisual).toBe(true)
      })

      it('toggles back to hidden', () => {
        gridSettings.set({ showVisual: true })

        const result = gridSettings.toggleVisual()

        expect(result).toBe(false)
        expect(gridSettings.get().showVisual).toBe(false)
      })
    })

    describe('setSize()', () => {
      it('sets grid size', () => {
        gridSettings.setSize(16)

        expect(gridSettings.get().size).toBe(16)
      })

      it('rejects size <= 0', () => {
        gridSettings.setSize(8) // Set valid first
        gridSettings.setSize(0)

        expect(gridSettings.get().size).toBe(8) // Unchanged
      })

      it('rejects size > 100', () => {
        gridSettings.setSize(8)
        gridSettings.setSize(101)

        expect(gridSettings.get().size).toBe(8) // Unchanged
      })

      it('accepts boundary values', () => {
        gridSettings.setSize(1)
        expect(gridSettings.get().size).toBe(1)

        gridSettings.setSize(100)
        expect(gridSettings.get().size).toBe(100)
      })
    })

    describe('reset()', () => {
      it('removes from localStorage', () => {
        gridSettings.set({ size: 16 })
        expect(mockData.storage['mirror-studio-grid']).toBeDefined()

        gridSettings.reset()

        expect(mockData.storage['mirror-studio-grid']).toBeUndefined()
      })

      it('emits event with defaults', () => {
        const handler = vi.fn()
        const unsub = events.on('grid:changed', handler)

        gridSettings.reset()

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          enabled: true,
          size: 8,
          showVisual: false,
        }))
        unsub()
      })
    })
  })

  describe('smartGuidesSettings', () => {
    describe('get()', () => {
      it('returns default values', () => {
        const settings = smartGuidesSettings.get()

        expect(settings.enabled).toBe(true)
        expect(settings.threshold).toBe(4)
        expect(settings.color).toBe('#FF6B6B')
        expect(settings.showDistances).toBe(true)
      })

      it('returns stored values', () => {
        mockData.storage['mirror-studio-smart-guides'] = JSON.stringify({
          enabled: false,
          threshold: 8,
        })

        const settings = smartGuidesSettings.get()

        expect(settings.enabled).toBe(false)
        expect(settings.threshold).toBe(8)
      })
    })

    describe('set()', () => {
      it('saves settings', () => {
        smartGuidesSettings.set({ threshold: 10 })

        const saved = JSON.parse(mockData.storage['mirror-studio-smart-guides'])
        expect(saved.threshold).toBe(10)
      })

      it('emits smartGuides:changed event', () => {
        const handler = vi.fn()
        const unsub = events.on('smartGuides:changed', handler)

        smartGuidesSettings.set({ enabled: false })

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          enabled: false,
        }))
        unsub()
      })
    })

    describe('toggle()', () => {
      it('toggles enabled state', () => {
        expect(smartGuidesSettings.get().enabled).toBe(true)

        const result = smartGuidesSettings.toggle()

        expect(result).toBe(false)
        expect(smartGuidesSettings.get().enabled).toBe(false)
      })

      it('returns new value', () => {
        const result1 = smartGuidesSettings.toggle()
        expect(result1).toBe(false)

        const result2 = smartGuidesSettings.toggle()
        expect(result2).toBe(true)
      })
    })
  })

  describe('generalSettings', () => {
    describe('get()', () => {
      it('returns default values', () => {
        const settings = generalSettings.get()

        expect(settings.moveStep).toBe(1)
        expect(settings.moveStepShift).toBe(10)
        expect(settings.showPositionLabels).toBe(true)
      })

      it('returns stored values', () => {
        mockData.storage['mirror-studio-general'] = JSON.stringify({
          moveStep: 2,
          moveStepShift: 20,
        })

        const settings = generalSettings.get()

        expect(settings.moveStep).toBe(2)
        expect(settings.moveStepShift).toBe(20)
      })
    })

    describe('set()', () => {
      it('saves settings', () => {
        generalSettings.set({ moveStep: 5 })

        const saved = JSON.parse(mockData.storage['mirror-studio-general'])
        expect(saved.moveStep).toBe(5)
      })

      it('emits settings:changed event', () => {
        const handler = vi.fn()
        const unsub = events.on('settings:changed', handler)

        generalSettings.set({ showPositionLabels: false })

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          showPositionLabels: false,
        }))
        unsub()
      })
    })
  })

  describe('localStorage error handling', () => {
    it('handles setItem errors gracefully', () => {
      mockData.mock.setItem.mockImplementation(() => {
        throw new Error('Storage full')
      })
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      // Should not throw
      gridSettings.set({ size: 16 })

      expect(warnSpy).toHaveBeenCalled()
    })

    it('handles removeItem errors gracefully', () => {
      mockData.mock.removeItem.mockImplementation(() => {
        throw new Error('Error')
      })

      // Should not throw
      gridSettings.reset()
    })
  })
})
