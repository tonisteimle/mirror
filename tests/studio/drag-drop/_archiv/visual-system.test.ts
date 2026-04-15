/**
 * Visual System Tests
 *
 * Tests for the drag-drop visual feedback system.
 * Covers: element pooling, indicators, outlines, ghosts, cleanup.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VisualSystem, createVisualSystem } from '../../../studio/drag-drop/visual/system'
import { VISUAL_IDS } from '../../../studio/drag-drop/visual/types'
import type { VisualHint } from '../../../studio/drag-drop/types'

// ============================================
// Test Setup
// ============================================

describe('VisualSystem', () => {
  let container: HTMLElement
  let visualSystem: VisualSystem

  beforeEach(() => {
    // Create a fresh container for each test
    document.body.innerHTML = ''
    container = document.createElement('div')
    container.id = 'test-container'
    document.body.appendChild(container)
    visualSystem = createVisualSystem(container)
  })

  afterEach(() => {
    visualSystem.dispose()
    document.body.innerHTML = ''
  })

  // ============================================
  // Element Pooling
  // ============================================

  describe('element pooling', () => {
    it('creates elements lazily on first use', () => {
      // Before any visual operation, elements should not exist
      expect(document.getElementById(VISUAL_IDS.indicator)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.parentOutline)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.ghost)).toBeNull()
    })

    it('creates all pooled elements on first showIndicator', () => {
      const hint: VisualHint = {
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      }

      visualSystem.showIndicator(hint)

      // All elements should now exist (created together for pooling)
      expect(document.getElementById(VISUAL_IDS.indicator)).not.toBeNull()
      expect(document.getElementById(VISUAL_IDS.parentOutline)).not.toBeNull()
      expect(document.getElementById(VISUAL_IDS.ghost)).not.toBeNull()
    })

    it('reuses elements across multiple showIndicator calls', () => {
      const hint: VisualHint = {
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      }

      visualSystem.showIndicator(hint)
      const firstIndicator = document.getElementById(VISUAL_IDS.indicator)

      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 50, y: 50, width: 200, height: 2 },
      })
      const secondIndicator = document.getElementById(VISUAL_IDS.indicator)

      // Same element should be reused
      expect(firstIndicator).toBe(secondIndicator)
    })

    it('has correct base styles on pooled elements', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      const indicator = document.getElementById(VISUAL_IDS.indicator)!
      expect(indicator.style.position).toBe('fixed')
      expect(indicator.style.pointerEvents).toBe('none')
      expect(indicator.style.zIndex).toBe('9999')
    })
  })

  // ============================================
  // Line Indicator
  // ============================================

  describe('line indicator', () => {
    it('shows line indicator at correct position', () => {
      const hint: VisualHint = {
        type: 'line',
        rect: { x: 100, y: 200, width: 150, height: 2 },
      }

      visualSystem.showIndicator(hint)

      const state = visualSystem.getState()
      expect(state.indicatorVisible).toBe(true)
      expect(state.indicatorRect).toEqual({ x: 100, y: 200, width: 150, height: 2 })
    })

    it('applies line styles correctly', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      const indicator = document.getElementById(VISUAL_IDS.indicator)!
      expect(indicator.style.display).toBe('block')
      expect(indicator.style.backgroundColor).toBe('rgb(91, 168, 245)') // #5BA8F5
      // Line type has no border - check borderStyle instead of shorthand
      // (jsdom normalizes 'border: none' differently)
      expect(indicator.style.borderStyle).toBe('none')
    })

    it('updates position on subsequent calls', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 200, y: 300, width: 250, height: 2 },
      })

      const state = visualSystem.getState()
      expect(state.indicatorRect).toEqual({ x: 200, y: 300, width: 250, height: 2 })
    })
  })

  // ============================================
  // Outline Indicator
  // ============================================

  describe('outline indicator', () => {
    it('shows outline indicator at correct position', () => {
      const hint: VisualHint = {
        type: 'outline',
        rect: { x: 50, y: 100, width: 200, height: 150 },
      }

      visualSystem.showIndicator(hint)

      const state = visualSystem.getState()
      expect(state.indicatorVisible).toBe(true)
      expect(state.indicatorRect).toEqual({ x: 50, y: 100, width: 200, height: 150 })
    })

    it('applies outline styles correctly', () => {
      visualSystem.showIndicator({
        type: 'outline',
        rect: { x: 0, y: 0, width: 100, height: 100 },
      })

      const indicator = document.getElementById(VISUAL_IDS.indicator)!
      expect(indicator.style.display).toBe('block')
      expect(indicator.style.backgroundColor).toBe('transparent')
      expect(indicator.style.border).toBe('2px dashed rgb(91, 168, 245)')
      expect(indicator.style.borderRadius).toBe('4px')
    })
  })

  // ============================================
  // Ghost Indicator (Absolute Positioning)
  // ============================================

  describe('ghost indicator', () => {
    it('shows ghost indicator at correct position', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 150, width: 80, height: 60 },
      }

      visualSystem.showIndicator(hint)

      const state = visualSystem.getState()
      expect(state.ghostVisible).toBe(true)
      expect(state.ghostRect).toEqual({ x: 100, y: 150, width: 80, height: 60 })
    })

    it('uses ghostSize when provided', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 150, width: 0, height: 0 },
        ghostSize: { width: 120, height: 80 },
      }

      visualSystem.showIndicator(hint)

      const state = visualSystem.getState()
      expect(state.ghostRect).toEqual({ x: 100, y: 150, width: 120, height: 80 })
    })

    it('hides regular indicator when showing ghost', () => {
      // First show a line indicator
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })
      expect(visualSystem.getState().indicatorVisible).toBe(true)

      // Then show a ghost
      visualSystem.showIndicator({
        type: 'ghost',
        rect: { x: 100, y: 100, width: 50, height: 50 },
      })

      const state = visualSystem.getState()
      expect(state.indicatorVisible).toBe(false)
      expect(state.ghostVisible).toBe(true)
    })

    it('hides ghost when showing line indicator', () => {
      // First show a ghost
      visualSystem.showIndicator({
        type: 'ghost',
        rect: { x: 100, y: 100, width: 50, height: 50 },
      })
      expect(visualSystem.getState().ghostVisible).toBe(true)

      // Then show a line
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      const state = visualSystem.getState()
      expect(state.ghostVisible).toBe(false)
      expect(state.indicatorVisible).toBe(true)
    })

    it('applies ghost styles correctly', () => {
      visualSystem.showIndicator({
        type: 'ghost',
        rect: { x: 0, y: 0, width: 100, height: 100 },
      })

      const ghost = document.getElementById(VISUAL_IDS.ghost)!
      expect(ghost.style.display).toBe('block')
      expect(ghost.style.border).toContain('dashed')
      expect(ghost.style.borderRadius).toBe('4px')
    })
  })

  // ============================================
  // Parent Outline
  // ============================================

  describe('parent outline', () => {
    it('shows parent outline at correct position', () => {
      const rect = { x: 10, y: 20, width: 300, height: 200 }

      visualSystem.showParentOutline(rect)

      const state = visualSystem.getState()
      expect(state.parentOutlineVisible).toBe(true)
      expect(state.parentOutlineRect).toEqual(rect)
    })

    it('applies parent outline styles correctly', () => {
      visualSystem.showParentOutline({ x: 0, y: 0, width: 100, height: 100 })

      const outline = document.getElementById(VISUAL_IDS.parentOutline)!
      expect(outline.style.display).toBe('block')
      expect(outline.style.border).toContain('dashed')
      expect(outline.style.backgroundColor).toBe('transparent')
    })

    it('hides parent outline', () => {
      visualSystem.showParentOutline({ x: 0, y: 0, width: 100, height: 100 })
      expect(visualSystem.getState().parentOutlineVisible).toBe(true)

      visualSystem.hideParentOutline()

      const state = visualSystem.getState()
      expect(state.parentOutlineVisible).toBe(false)
      expect(state.parentOutlineRect).toBeNull()
    })
  })

  // ============================================
  // Hide Methods
  // ============================================

  describe('hide methods', () => {
    it('hideIndicator hides line indicator', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      visualSystem.hideIndicator()

      const state = visualSystem.getState()
      expect(state.indicatorVisible).toBe(false)
      expect(state.indicatorRect).toBeNull()
    })

    it('hideIndicator sets display to none', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      visualSystem.hideIndicator()

      const indicator = document.getElementById(VISUAL_IDS.indicator)!
      expect(indicator.style.display).toBe('none')
    })
  })

  // ============================================
  // Clear Method
  // ============================================

  describe('clear method', () => {
    it('hides all visual elements', () => {
      // Show all types of elements
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })
      visualSystem.showParentOutline({ x: 0, y: 0, width: 200, height: 200 })

      visualSystem.clear()

      const state = visualSystem.getState()
      expect(state.indicatorVisible).toBe(false)
      expect(state.parentOutlineVisible).toBe(false)
      expect(state.ghostVisible).toBe(false)
    })

    it('can be called multiple times safely', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      // Multiple clears should not throw
      visualSystem.clear()
      visualSystem.clear()
      visualSystem.clear()

      expect(visualSystem.getState().indicatorVisible).toBe(false)
    })

    it('can be called before any elements created', () => {
      // Clear before any show calls - should not throw
      visualSystem.clear()

      expect(visualSystem.getState().indicatorVisible).toBe(false)
    })
  })

  // ============================================
  // Dispose Method
  // ============================================

  describe('dispose method', () => {
    it('removes all elements from DOM', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })
      visualSystem.showParentOutline({ x: 0, y: 0, width: 100, height: 100 })

      // Verify elements exist
      expect(document.getElementById(VISUAL_IDS.indicator)).not.toBeNull()
      expect(document.getElementById(VISUAL_IDS.parentOutline)).not.toBeNull()
      expect(document.getElementById(VISUAL_IDS.ghost)).not.toBeNull()

      visualSystem.dispose()

      // Elements should be removed
      expect(document.getElementById(VISUAL_IDS.indicator)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.parentOutline)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.ghost)).toBeNull()
    })

    it('can be called multiple times safely', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })

      // Multiple disposes should not throw
      visualSystem.dispose()
      visualSystem.dispose()
      visualSystem.dispose()
    })

    it('allows re-initialization after dispose', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 0, y: 0, width: 100, height: 2 },
      })
      visualSystem.dispose()

      // Create new system after dispose
      const newSystem = createVisualSystem(container)
      newSystem.showIndicator({
        type: 'line',
        rect: { x: 50, y: 50, width: 100, height: 2 },
      })

      expect(newSystem.getState().indicatorVisible).toBe(true)

      newSystem.dispose()
    })
  })

  // ============================================
  // getState Test API
  // ============================================

  describe('getState test API', () => {
    it('returns correct initial state', () => {
      const state = visualSystem.getState()

      expect(state.indicatorVisible).toBe(false)
      expect(state.indicatorRect).toBeNull()
      expect(state.parentOutlineVisible).toBe(false)
      expect(state.parentOutlineRect).toBeNull()
      expect(state.ghostVisible).toBe(false)
      expect(state.ghostRect).toBeNull()
    })

    it('returns copies of rects (not references)', () => {
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 100, y: 100, width: 50, height: 2 },
      })

      const state1 = visualSystem.getState()
      const state2 = visualSystem.getState()

      // Should be equal but not the same object
      expect(state1.indicatorRect).toEqual(state2.indicatorRect)
      expect(state1.indicatorRect).not.toBe(state2.indicatorRect)
    })

    it('tracks all visual element states correctly', () => {
      // Show indicator
      visualSystem.showIndicator({
        type: 'line',
        rect: { x: 10, y: 20, width: 100, height: 2 },
      })

      // Show parent outline
      visualSystem.showParentOutline({ x: 5, y: 10, width: 200, height: 150 })

      const state = visualSystem.getState()
      expect(state.indicatorVisible).toBe(true)
      expect(state.indicatorRect).toEqual({ x: 10, y: 20, width: 100, height: 2 })
      expect(state.parentOutlineVisible).toBe(true)
      expect(state.parentOutlineRect).toEqual({ x: 5, y: 10, width: 200, height: 150 })
    })
  })

  // ============================================
  // Legacy Methods (No-op)
  // ============================================

  describe('legacy methods', () => {
    it('has no-op legacy methods that do not throw', () => {
      // These methods should exist and not throw
      expect(() => visualSystem.showGhost()).not.toThrow()
      expect(() => visualSystem.updateGhost()).not.toThrow()
      expect(() => visualSystem.hideGhost()).not.toThrow()
      expect(() => visualSystem.showSnapGuides()).not.toThrow()
      expect(() => visualSystem.hideSnapGuides()).not.toThrow()
      expect(() => visualSystem.showZoneOverlay()).not.toThrow()
      expect(() => visualSystem.hideZoneOverlay()).not.toThrow()
    })
  })

  // ============================================
  // Factory Function
  // ============================================

  describe('createVisualSystem factory', () => {
    it('creates a VisualSystem instance', () => {
      const system = createVisualSystem(container)

      expect(system).toBeInstanceOf(VisualSystem)

      system.dispose()
    })
  })
})
