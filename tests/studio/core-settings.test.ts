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
import { gridSettings, smartGuidesSettings, generalSettings, handleSnapSettings } from '../../studio/core/settings'
import { events } from '../../studio/core/events'

describe('Settings Store', () => {
  beforeEach(() => {
    // Reset to defaults before each test
    gridSettings.reset()
    smartGuidesSettings.reset()
    generalSettings.reset()
    handleSnapSettings.reset()
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
        expect(settings.color).toBe('#5BA8F5')
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

  describe('handleSnapSettings (Feature 3: Custom Snap Grids)', () => {
    describe('get()', () => {
      it('returns default values', () => {
        const settings = handleSnapSettings.get()

        expect(settings.enabled).toBe(true)
        expect(settings.gridSize).toBe(8)
        expect(settings.customPoints).toEqual([])
        expect(settings.threshold).toBe(4)
        expect(settings.maxValue).toBe(200)
      })

      it('returns a copy (not mutable)', () => {
        const settings = handleSnapSettings.get()
        settings.gridSize = 999

        expect(handleSnapSettings.get().gridSize).toBe(8) // Unchanged
      })
    })

    describe('set()', () => {
      it('updates settings', () => {
        handleSnapSettings.set({ gridSize: 16 })

        expect(handleSnapSettings.get().gridSize).toBe(16)
      })

      it('merges with existing settings', () => {
        handleSnapSettings.set({ gridSize: 16 })
        handleSnapSettings.set({ enabled: false })

        const settings = handleSnapSettings.get()
        expect(settings.gridSize).toBe(16)
        expect(settings.enabled).toBe(false)
      })

      it('emits handleSnap:changed event', () => {
        const handler = vi.fn()
        const unsub = events.on('handleSnap:changed', handler)

        handleSnapSettings.set({ gridSize: 16 })

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          gridSize: 16,
        }))

        unsub()
      })
    })

    describe('toggle()', () => {
      it('toggles enabled state', () => {
        expect(handleSnapSettings.get().enabled).toBe(true)

        const result = handleSnapSettings.toggle()

        expect(result).toBe(false)
        expect(handleSnapSettings.get().enabled).toBe(false)
      })

      it('toggles back to enabled', () => {
        handleSnapSettings.set({ enabled: false })

        const result = handleSnapSettings.toggle()

        expect(result).toBe(true)
        expect(handleSnapSettings.get().enabled).toBe(true)
      })
    })

    describe('setGridSize()', () => {
      it('sets grid size', () => {
        handleSnapSettings.setGridSize(16)

        expect(handleSnapSettings.get().gridSize).toBe(16)
      })

      it('rejects size <= 0', () => {
        handleSnapSettings.setGridSize(8)
        handleSnapSettings.setGridSize(0)

        expect(handleSnapSettings.get().gridSize).toBe(8) // Unchanged
      })

      it('rejects size > 64', () => {
        handleSnapSettings.setGridSize(8)
        handleSnapSettings.setGridSize(65)

        expect(handleSnapSettings.get().gridSize).toBe(8) // Unchanged
      })

      it('accepts boundary values', () => {
        handleSnapSettings.setGridSize(1)
        expect(handleSnapSettings.get().gridSize).toBe(1)

        handleSnapSettings.setGridSize(64)
        expect(handleSnapSettings.get().gridSize).toBe(64)
      })
    })

    describe('addCustomPoint()', () => {
      it('adds a custom snap point', () => {
        handleSnapSettings.addCustomPoint(20)

        expect(handleSnapSettings.get().customPoints).toContain(20)
      })

      it('does not add duplicate points', () => {
        handleSnapSettings.addCustomPoint(20)
        handleSnapSettings.addCustomPoint(20)

        expect(handleSnapSettings.get().customPoints).toEqual([20])
      })

      it('keeps points sorted', () => {
        handleSnapSettings.addCustomPoint(30)
        handleSnapSettings.addCustomPoint(10)
        handleSnapSettings.addCustomPoint(20)

        expect(handleSnapSettings.get().customPoints).toEqual([10, 20, 30])
      })
    })

    describe('removeCustomPoint()', () => {
      it('removes a custom snap point', () => {
        handleSnapSettings.addCustomPoint(20)
        handleSnapSettings.removeCustomPoint(20)

        expect(handleSnapSettings.get().customPoints).not.toContain(20)
      })

      it('does nothing for non-existent points', () => {
        handleSnapSettings.addCustomPoint(10)
        handleSnapSettings.removeCustomPoint(20)

        expect(handleSnapSettings.get().customPoints).toEqual([10])
      })
    })

    describe('getSnapPoints()', () => {
      it('generates grid-based snap points', () => {
        handleSnapSettings.setGridSize(8)

        const points = handleSnapSettings.getSnapPoints()

        expect(points).toContain(0)
        expect(points).toContain(8)
        expect(points).toContain(16)
        expect(points).toContain(24)
      })

      it('includes custom points', () => {
        handleSnapSettings.setGridSize(8)
        handleSnapSettings.addCustomPoint(20) // Not on 8-grid

        const points = handleSnapSettings.getSnapPoints()

        expect(points).toContain(20)
        expect(points).toContain(16)
        expect(points).toContain(24)
      })

      it('returns empty array when disabled', () => {
        handleSnapSettings.set({ enabled: false })

        const points = handleSnapSettings.getSnapPoints()

        expect(points).toEqual([])
      })

      it('deduplicates points', () => {
        handleSnapSettings.setGridSize(4)
        handleSnapSettings.addCustomPoint(8) // Already on 4-grid

        const points = handleSnapSettings.getSnapPoints()
        const count = points.filter(p => p === 8).length

        expect(count).toBe(1)
      })
    })

    describe('reset()', () => {
      it('resets to defaults', () => {
        handleSnapSettings.set({ gridSize: 16, enabled: false })
        handleSnapSettings.addCustomPoint(20)

        handleSnapSettings.reset()

        const settings = handleSnapSettings.get()
        expect(settings.gridSize).toBe(8)
        expect(settings.enabled).toBe(true)
        expect(settings.customPoints).toEqual([])
      })

      it('emits event with defaults', () => {
        const handler = vi.fn()
        const unsub = events.on('handleSnap:changed', handler)

        handleSnapSettings.reset()

        expect(handler).toHaveBeenCalledWith(expect.objectContaining({
          enabled: true,
          gridSize: 8,
          customPoints: [],
        }))
        unsub()
      })
    })
  })
})
