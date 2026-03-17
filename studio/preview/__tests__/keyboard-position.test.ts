/**
 * Keyboard Position Navigation Tests
 *
 * Unit tests for arrow key movement logic:
 * - Arrow key detection
 * - Absolute container detection
 * - Position calculation with step modifiers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'

describe('Keyboard Position Navigation', () => {
  let dom: JSDOM
  let container: HTMLElement

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis
    global.KeyboardEvent = dom.window.KeyboardEvent as unknown as typeof KeyboardEvent

    // Mock getComputedStyle
    global.window.getComputedStyle = vi.fn().mockReturnValue({
      position: 'absolute',
      left: '100px',
      top: '50px',
    })

    // Create container with absolute positioned element
    container = document.createElement('div')
    container.innerHTML = `
      <div data-layout="stacked" style="position: relative;">
        <div data-mirror-id="abs-element" data-x="100" data-y="50" style="position: absolute; left: 100px; top: 50px;">
          Absolute Element
        </div>
      </div>
      <div data-layout="ver">
        <div data-mirror-id="flex-element">Flex Element</div>
      </div>
    `
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    vi.clearAllMocks()
  })

  describe('arrow key detection', () => {
    const isArrowKey = (key: string): boolean => {
      return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)
    }

    it('recognizes ArrowUp as arrow key', () => {
      expect(isArrowKey('ArrowUp')).toBe(true)
    })

    it('recognizes ArrowDown as arrow key', () => {
      expect(isArrowKey('ArrowDown')).toBe(true)
    })

    it('recognizes ArrowLeft as arrow key', () => {
      expect(isArrowKey('ArrowLeft')).toBe(true)
    })

    it('recognizes ArrowRight as arrow key', () => {
      expect(isArrowKey('ArrowRight')).toBe(true)
    })

    it('rejects non-arrow keys', () => {
      expect(isArrowKey('a')).toBe(false)
      expect(isArrowKey('Enter')).toBe(false)
      expect(isArrowKey('Escape')).toBe(false)
    })
  })

  describe('absolute container detection', () => {
    function isInAbsoluteContainer(nodeId: string): boolean {
      const element = container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!element) return false

      const parent = element.parentElement
      if (!parent) return false

      // Check for absolute container markers
      if (parent.dataset.layout === 'stacked') {
        return true
      }

      // Check computed styles
      const style = window.getComputedStyle(element)
      if (style.position === 'absolute') {
        return true
      }

      return false
    }

    it('detects element in stacked layout', () => {
      expect(isInAbsoluteContainer('abs-element')).toBe(true)
    })

    it('rejects element in flex layout', () => {
      // Override getComputedStyle for flex element
      global.window.getComputedStyle = vi.fn().mockReturnValue({
        position: 'static',
      })

      expect(isInAbsoluteContainer('flex-element')).toBe(false)
    })

    it('rejects non-existent element', () => {
      expect(isInAbsoluteContainer('non-existent')).toBe(false)
    })
  })

  describe('position calculation', () => {
    function getCurrentPosition(nodeId: string): { x: number; y: number } {
      const element = container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
      if (!element) return { x: 0, y: 0 }

      // Read from data attributes
      const dataX = element.dataset.x
      const dataY = element.dataset.y
      if (dataX !== undefined && dataY !== undefined) {
        return { x: parseInt(dataX, 10) || 0, y: parseInt(dataY, 10) || 0 }
      }

      // Fall back to computed style
      const style = window.getComputedStyle(element)
      return {
        x: parseInt(style.left, 10) || 0,
        y: parseInt(style.top, 10) || 0,
      }
    }

    it('reads position from data attributes', () => {
      const pos = getCurrentPosition('abs-element')
      expect(pos.x).toBe(100)
      expect(pos.y).toBe(50)
    })

    it('returns zero for non-existent element', () => {
      const pos = getCurrentPosition('non-existent')
      expect(pos.x).toBe(0)
      expect(pos.y).toBe(0)
    })
  })

  describe('step calculation', () => {
    function calculateStep(shiftKey: boolean): number {
      return shiftKey ? 10 : 1
    }

    it('returns 1px step without shift', () => {
      expect(calculateStep(false)).toBe(1)
    })

    it('returns 10px step with shift', () => {
      expect(calculateStep(true)).toBe(10)
    })
  })

  describe('delta calculation', () => {
    function calculateDelta(key: string, step: number): { dx: number; dy: number } {
      let dx = 0
      let dy = 0

      switch (key) {
        case 'ArrowUp':
          dy = -step
          break
        case 'ArrowDown':
          dy = step
          break
        case 'ArrowLeft':
          dx = -step
          break
        case 'ArrowRight':
          dx = step
          break
      }

      return { dx, dy }
    }

    it('ArrowUp moves up (negative y)', () => {
      const delta = calculateDelta('ArrowUp', 1)
      expect(delta.dx).toBe(0)
      expect(delta.dy).toBe(-1)
    })

    it('ArrowDown moves down (positive y)', () => {
      const delta = calculateDelta('ArrowDown', 1)
      expect(delta.dx).toBe(0)
      expect(delta.dy).toBe(1)
    })

    it('ArrowLeft moves left (negative x)', () => {
      const delta = calculateDelta('ArrowLeft', 1)
      expect(delta.dx).toBe(-1)
      expect(delta.dy).toBe(0)
    })

    it('ArrowRight moves right (positive x)', () => {
      const delta = calculateDelta('ArrowRight', 1)
      expect(delta.dx).toBe(1)
      expect(delta.dy).toBe(0)
    })

    it('uses step size for delta', () => {
      const delta = calculateDelta('ArrowRight', 10)
      expect(delta.dx).toBe(10)
      expect(delta.dy).toBe(0)
    })
  })

  describe('input field handling', () => {
    function shouldIgnoreEvent(e: KeyboardEvent): boolean {
      const target = e.target as HTMLElement | null
      if (!target) return false

      const tagName = target.tagName.toLowerCase()
      return tagName === 'input' || tagName === 'textarea' || target.isContentEditable === true
    }

    it('ignores events from input elements', () => {
      const input = dom.window.document.createElement('input')
      container.appendChild(input)

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      Object.defineProperty(event, 'target', { value: input })

      expect(shouldIgnoreEvent(event)).toBe(true)
    })

    it('ignores events from textarea elements', () => {
      const textarea = dom.window.document.createElement('textarea')
      container.appendChild(textarea)

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      Object.defineProperty(event, 'target', { value: textarea })

      expect(shouldIgnoreEvent(event)).toBe(true)
    })

    it('allows events from other elements', () => {
      const div = dom.window.document.createElement('div')
      container.appendChild(div)

      const event = new KeyboardEvent('keydown', { key: 'ArrowRight' })
      Object.defineProperty(event, 'target', { value: div })

      expect(shouldIgnoreEvent(event)).toBe(false)
    })
  })

  describe('new position calculation', () => {
    it('calculates new position correctly', () => {
      const current = { x: 100, y: 50 }
      const delta = { dx: 1, dy: 0 }

      const newPos = {
        x: current.x + delta.dx,
        y: current.y + delta.dy,
      }

      expect(newPos.x).toBe(101)
      expect(newPos.y).toBe(50)
    })

    it('calculates with shift step', () => {
      const current = { x: 100, y: 50 }
      const delta = { dx: 10, dy: 0 }

      const newPos = {
        x: current.x + delta.dx,
        y: current.y + delta.dy,
      }

      expect(newPos.x).toBe(110)
      expect(newPos.y).toBe(50)
    })

    it('handles negative deltas', () => {
      const current = { x: 100, y: 50 }
      const delta = { dx: -1, dy: -1 }

      const newPos = {
        x: current.x + delta.dx,
        y: current.y + delta.dy,
      }

      expect(newPos.x).toBe(99)
      expect(newPos.y).toBe(49)
    })
  })
})
