/**
 * Settings Store Tests
 *
 * Tests for the settings system:
 * - In-memory state
 * - Toggle functions
 * - Default values
 * - Event emission
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { gridSettings, smartGuidesSettings, generalSettings } from '../../studio/core/settings'
import { events } from '../../studio/core/events'

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    gridSettings.reset()
    smartGuidesSettings.reset()
    generalSettings.reset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('gridSettings', () => {
    describe('get()', () => {
      it('returns default values', () => {
        const settings = gridSettings.get()

        expect(settings.enabled).toBe(true)
        expect(settings.size).toBe(8)
        expect(settings.showVisual).toBe(false)
        expect(settings.color).toBe('#3B82F6')
      })

      it('returns a copy (not mutable)', () => {
        const settings = gridSettings.get()
        settings.size = 999

        expect(gridSettings.get().size).toBe(8) // Unchanged
      })
    })

    describe('set()', () => {
      it('updates settings', () => {
        gridSettings.set({ size: 12 })

        expect(gridSettings.get().size).toBe(12)
      })

      it('merges with existing settings', () => {
        gridSettings.set({ size: 12 })
        gridSettings.set({ enabled: false })

        const settings = gridSettings.get()
        expect(settings.size).toBe(12)
        expect(settings.enabled).toBe(false)
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
      it('resets to defaults', () => {
        gridSettings.set({ size: 16, enabled: false })

        gridSettings.reset()

        const settings = gridSettings.get()
        expect(settings.size).toBe(8)
        expect(settings.enabled).toBe(true)
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
    })

    describe('set()', () => {
      it('updates settings', () => {
        smartGuidesSettings.set({ threshold: 10 })

        expect(smartGuidesSettings.get().threshold).toBe(10)
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

    describe('reset()', () => {
      it('resets to defaults', () => {
        smartGuidesSettings.set({ threshold: 10 })

        smartGuidesSettings.reset()

        expect(smartGuidesSettings.get().threshold).toBe(4)
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
    })

    describe('set()', () => {
      it('updates settings', () => {
        generalSettings.set({ moveStep: 5 })

        expect(generalSettings.get().moveStep).toBe(5)
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

    describe('reset()', () => {
      it('resets to defaults', () => {
        generalSettings.set({ moveStep: 5 })

        generalSettings.reset()

        expect(generalSettings.get().moveStep).toBe(1)
      })
    })
  })
})
