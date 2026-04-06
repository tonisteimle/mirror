/**
 * VisualSystem Ghost Indicator Tests
 *
 * Tests for the ghost indicator in the visual feedback system.
 * Verifies creation, styling, state tracking, and cleanup.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { VisualSystem, createVisualSystem } from '../../../studio/drag-drop/visual/system'
import { VISUAL_IDS } from '../../../studio/drag-drop/visual/types'
import type { VisualHint } from '../../../studio/drag-drop/types'

describe('VisualSystem Ghost Indicator', () => {
  let container: HTMLElement
  let visualSystem: VisualSystem

  beforeEach(() => {
    // Clean up any existing elements
    document.body.innerHTML = ''

    container = document.createElement('div')
    container.id = 'preview-container'
    document.body.appendChild(container)

    visualSystem = createVisualSystem(container)
  })

  afterEach(() => {
    visualSystem.dispose()
    document.body.innerHTML = ''
  })

  // ============================================
  // Ghost creation tests
  // ============================================

  describe('ghost indicator creation', () => {
    it('creates ghost element when showing ghost hint', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
        ghostSize: { width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement).not.toBeNull()
    })

    it('sets correct position on ghost element', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 150, y: 200, width: 80, height: 60 },
        ghostSize: { width: 80, height: 60 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.left).toBe('150px')
      expect(ghostElement?.style.top).toBe('200px')
    })

    it('sets correct size on ghost element', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 120, height: 80 },
        ghostSize: { width: 120, height: 80 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.width).toBe('120px')
      expect(ghostElement?.style.height).toBe('80px')
    })

    it('uses ghostSize when provided', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 50, height: 50 }, // rect size
        ghostSize: { width: 150, height: 100 }, // ghostSize overrides
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.width).toBe('150px')
      expect(ghostElement?.style.height).toBe('100px')
    })

    it('falls back to rect size when ghostSize not provided', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 80, height: 40 },
        // no ghostSize
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.width).toBe('80px')
      expect(ghostElement?.style.height).toBe('40px')
    })
  })

  // ============================================
  // Ghost styling tests
  // ============================================

  describe('ghost indicator styling', () => {
    it('applies purple background color', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.backgroundColor).toBe('rgba(139, 92, 246, 0.3)')
    })

    it('applies dashed purple border', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.border).toBe('2px dashed rgb(139, 92, 246)')
    })

    it('applies border radius', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.borderRadius).toBe('4px')
    })

    it('sets fixed positioning', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.position).toBe('fixed')
    })

    it('sets high z-index', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.zIndex).toBe('9999')
    })

    it('disables pointer events', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.pointerEvents).toBe('none')
    })

    it('applies box shadow for glow effect', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)

      const ghostElement = document.getElementById(VISUAL_IDS.ghost)
      expect(ghostElement?.style.boxShadow).toContain('rgba(139, 92, 246')
    })
  })

  // ============================================
  // State tracking tests
  // ============================================

  describe('ghost state tracking', () => {
    it('tracks ghost visible state', () => {
      expect(visualSystem.getState().ghostVisible).toBe(false)

      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(hint)

      expect(visualSystem.getState().ghostVisible).toBe(true)
    })

    it('tracks ghost rect', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 150, y: 200, width: 120, height: 80 },
        ghostSize: { width: 120, height: 80 },
      }
      visualSystem.showIndicator(hint)

      const state = visualSystem.getState()
      expect(state.ghostRect).toEqual({
        x: 150,
        y: 200,
        width: 120,
        height: 80,
      })
    })

    it('hideIndicator does not affect ghost state', () => {
      // Ghost is separate from indicator - hideIndicator should NOT hide ghost
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(hint)

      // hideIndicator only hides the line indicator, not the ghost
      visualSystem.hideIndicator()

      const state = visualSystem.getState()
      // Ghost should still be visible
      expect(state.ghostVisible).toBe(true)
      expect(state.ghostRect).not.toBeNull()
    })

    it('updates ghost state when showing new ghost', () => {
      const hint1: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(hint1)

      const hint2: VisualHint = {
        type: 'ghost',
        rect: { x: 200, y: 150, width: 80, height: 60 },
        ghostSize: { width: 80, height: 60 },
      }
      visualSystem.showIndicator(hint2)

      const state = visualSystem.getState()
      expect(state.ghostRect).toEqual({
        x: 200,
        y: 150,
        width: 80,
        height: 60,
      })
    })
  })

  // ============================================
  // Ghost vs indicator interaction
  // ============================================

  describe('ghost and indicator interaction', () => {
    it('hides regular indicator when showing ghost', () => {
      // Show line indicator first
      const lineHint: VisualHint = {
        type: 'line',
        rect: { x: 100, y: 100, width: 200, height: 2 },
      }
      visualSystem.showIndicator(lineHint)
      expect(document.getElementById(VISUAL_IDS.indicator)).not.toBeNull()

      // Show ghost - should remove line indicator
      const ghostHint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(ghostHint)

      expect(document.getElementById(VISUAL_IDS.indicator)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.ghost)).not.toBeNull()
    })

    it('hides ghost when showing line indicator', () => {
      // Show ghost first
      const ghostHint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(ghostHint)
      expect(document.getElementById(VISUAL_IDS.ghost)).not.toBeNull()

      // Show line indicator - should remove ghost
      const lineHint: VisualHint = {
        type: 'line',
        rect: { x: 100, y: 100, width: 200, height: 2 },
      }
      visualSystem.showIndicator(lineHint)

      expect(document.getElementById(VISUAL_IDS.ghost)).toBeNull()
      expect(document.getElementById(VISUAL_IDS.indicator)).not.toBeNull()
    })
  })

  // ============================================
  // Cleanup tests
  // ============================================

  describe('cleanup', () => {
    it('removes ghost element on clear()', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(hint)

      visualSystem.clear()

      expect(document.getElementById(VISUAL_IDS.ghost)).toBeNull()
    })

    it('resets ghost state on clear()', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(hint)

      visualSystem.clear()

      const state = visualSystem.getState()
      expect(state.ghostVisible).toBe(false)
      expect(state.ghostRect).toBeNull()
    })

    it('removes ghost element on dispose()', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }
      visualSystem.showIndicator(hint)

      visualSystem.dispose()

      expect(document.getElementById(VISUAL_IDS.ghost)).toBeNull()
    })

    it('can show ghost again after clear()', () => {
      const hint: VisualHint = {
        type: 'ghost',
        rect: { x: 100, y: 100, width: 100, height: 40 },
      }

      visualSystem.showIndicator(hint)
      visualSystem.clear()
      visualSystem.showIndicator(hint)

      expect(document.getElementById(VISUAL_IDS.ghost)).not.toBeNull()
      expect(visualSystem.getState().ghostVisible).toBe(true)
    })
  })
})
