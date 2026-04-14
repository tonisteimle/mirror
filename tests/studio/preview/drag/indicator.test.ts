/**
 * @vitest-environment jsdom
 *
 * Tests for Indicator
 * Visual insertion line - single DOM element that gets repositioned
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Indicator } from '../../../../studio/preview/drag/indicator'

describe('Indicator', () => {
  let indicator: Indicator

  beforeEach(() => {
    indicator = new Indicator()
  })

  afterEach(() => {
    indicator.destroy()
  })

  describe('show', () => {
    it('creates element on first show', () => {
      expect(document.getElementById('drag-insertion-indicator')).toBeNull()

      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')

      const el = document.getElementById('drag-insertion-indicator')
      expect(el).not.toBeNull()
    })

    it('positions element correctly for horizontal orientation', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')

      const el = document.getElementById('drag-insertion-indicator')!
      expect(el.style.left).toBe('100px')
      expect(el.style.top).toBe('50px')
      expect(el.style.width).toBe('200px')
      expect(el.style.height).toBe('3px') // INDICATOR_THICKNESS
    })

    it('positions element correctly for vertical orientation', () => {
      indicator.show({ x: 100, y: 50 }, 150, 'vertical')

      const el = document.getElementById('drag-insertion-indicator')!
      expect(el.style.left).toBe('100px')
      expect(el.style.top).toBe('50px')
      expect(el.style.width).toBe('3px') // INDICATOR_THICKNESS
      expect(el.style.height).toBe('150px')
    })

    it('makes element visible', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')

      const el = document.getElementById('drag-insertion-indicator')!
      expect(el.style.display).toBe('block')
    })

    it('reuses existing element on subsequent shows', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')
      const el1 = document.getElementById('drag-insertion-indicator')!

      indicator.show({ x: 200, y: 100 }, 300, 'vertical')
      const el2 = document.getElementById('drag-insertion-indicator')!

      expect(el1).toBe(el2)
      expect(el2.style.left).toBe('200px')
      expect(el2.style.top).toBe('100px')
    })
  })

  describe('hide', () => {
    it('hides the element', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')
      indicator.hide()

      const el = document.getElementById('drag-insertion-indicator')!
      expect(el.style.display).toBe('none')
    })

    it('does nothing if element not created yet', () => {
      expect(() => indicator.hide()).not.toThrow()
    })
  })

  describe('isVisible', () => {
    it('returns false before any show', () => {
      expect(indicator.isVisible()).toBe(false)
    })

    it('returns true after show', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')
      expect(indicator.isVisible()).toBe(true)
    })

    it('returns false after hide', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')
      indicator.hide()
      expect(indicator.isVisible()).toBe(false)
    })
  })

  describe('destroy', () => {
    it('removes element from DOM', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')
      expect(document.getElementById('drag-insertion-indicator')).not.toBeNull()

      indicator.destroy()
      expect(document.getElementById('drag-insertion-indicator')).toBeNull()
    })

    it('does nothing if element not created', () => {
      expect(() => indicator.destroy()).not.toThrow()
    })

    it('allows recreation after destroy', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')
      indicator.destroy()

      indicator.show({ x: 200, y: 100 }, 300, 'vertical')
      expect(document.getElementById('drag-insertion-indicator')).not.toBeNull()
    })
  })

  describe('styling', () => {
    it('applies fixed positioning', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')

      const el = document.getElementById('drag-insertion-indicator')!
      expect(el.style.position).toBe('fixed')
    })

    it('disables pointer events', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')

      const el = document.getElementById('drag-insertion-indicator')!
      expect(el.style.pointerEvents).toBe('none')
    })

    it('has high z-index', () => {
      indicator.show({ x: 100, y: 50 }, 200, 'horizontal')

      const el = document.getElementById('drag-insertion-indicator')!
      expect(parseInt(el.style.zIndex)).toBeGreaterThanOrEqual(10000)
    })
  })
})
