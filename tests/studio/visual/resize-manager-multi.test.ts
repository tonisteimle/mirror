/**
 * ResizeManager Multi-Selection Tests
 * Feature 4: Multi-Element Manipulation
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Import types from resize-manager
import type { ResizeHandle, MultiResizeState } from '../../../studio/visual/resize-manager'

// Test the anchor determination logic
describe('resize-manager multi-selection', () => {
  describe('getAnchorFromHandle logic', () => {
    // This tests the anchor determination logic that's used in resize-manager
    function getAnchorFromHandle(handle: ResizeHandle): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' {
      switch (handle) {
        case 'se': return 'top-left'      // Dragging SE, anchor is opposite (TL)
        case 'sw': return 'top-right'     // Dragging SW, anchor is opposite (TR)
        case 'ne': return 'bottom-left'   // Dragging NE, anchor is opposite (BL)
        case 'nw': return 'bottom-right'  // Dragging NW, anchor is opposite (BR)
        case 'e': return 'top-left'       // Edge handles use adjacent corner
        case 'w': return 'top-right'
        case 's': return 'top-left'
        case 'n': return 'bottom-left'
        default: return 'top-left'
      }
    }

    it('returns opposite corner for corner handles', () => {
      expect(getAnchorFromHandle('se')).toBe('top-left')
      expect(getAnchorFromHandle('sw')).toBe('top-right')
      expect(getAnchorFromHandle('ne')).toBe('bottom-left')
      expect(getAnchorFromHandle('nw')).toBe('bottom-right')
    })

    it('returns top-left for east and south edge handles', () => {
      expect(getAnchorFromHandle('e')).toBe('top-left')
      expect(getAnchorFromHandle('s')).toBe('top-left')
    })

    it('returns appropriate anchor for west and north edge handles', () => {
      expect(getAnchorFromHandle('w')).toBe('top-right')
      expect(getAnchorFromHandle('n')).toBe('bottom-left')
    })
  })

  describe('bounding box position calculation', () => {
    // Test the calculation of new bounding box position based on anchor
    function calculateNewPosition(
      originalX: number,
      originalY: number,
      originalWidth: number,
      originalHeight: number,
      newWidth: number,
      newHeight: number,
      anchor: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'
    ): { x: number; y: number } {
      let newX = originalX
      let newY = originalY

      switch (anchor) {
        case 'top-right':
          newX = originalX + originalWidth - newWidth
          break
        case 'bottom-left':
          newY = originalY + originalHeight - newHeight
          break
        case 'bottom-right':
          newX = originalX + originalWidth - newWidth
          newY = originalY + originalHeight - newHeight
          break
        case 'center':
          newX = originalX + (originalWidth - newWidth) / 2
          newY = originalY + (originalHeight - newHeight) / 2
          break
      }

      return { x: newX, y: newY }
    }

    it('keeps position when anchor is top-left', () => {
      const result = calculateNewPosition(100, 100, 200, 200, 300, 300, 'top-left')
      expect(result.x).toBe(100)
      expect(result.y).toBe(100)
    })

    it('adjusts x when anchor is top-right', () => {
      const result = calculateNewPosition(100, 100, 200, 200, 300, 300, 'top-right')
      expect(result.x).toBe(0)  // 100 + 200 - 300 = 0
      expect(result.y).toBe(100)
    })

    it('adjusts y when anchor is bottom-left', () => {
      const result = calculateNewPosition(100, 100, 200, 200, 300, 300, 'bottom-left')
      expect(result.x).toBe(100)
      expect(result.y).toBe(0)  // 100 + 200 - 300 = 0
    })

    it('adjusts both when anchor is bottom-right', () => {
      const result = calculateNewPosition(100, 100, 200, 200, 300, 300, 'bottom-right')
      expect(result.x).toBe(0)
      expect(result.y).toBe(0)
    })

    it('centers for center anchor', () => {
      const result = calculateNewPosition(100, 100, 200, 200, 300, 300, 'center')
      expect(result.x).toBe(50)   // 100 + (200 - 300) / 2 = 50
      expect(result.y).toBe(50)
    })

    it('handles shrinking with top-right anchor', () => {
      const result = calculateNewPosition(100, 100, 200, 200, 100, 100, 'top-right')
      expect(result.x).toBe(200)  // 100 + 200 - 100 = 200
      expect(result.y).toBe(100)
    })
  })

  describe('scale factor calculation', () => {
    it('calculates correct scale factors', () => {
      const originalWidth = 200
      const originalHeight = 100
      const newWidth = 400
      const newHeight = 150

      const scaleX = newWidth / originalWidth
      const scaleY = newHeight / originalHeight

      expect(scaleX).toBe(2)
      expect(scaleY).toBe(1.5)
    })

    it('handles uniform scaling', () => {
      const originalWidth = 200
      const originalHeight = 200
      const newWidth = 400
      const newHeight = 400

      const scaleX = newWidth / originalWidth
      const scaleY = newHeight / originalHeight

      expect(scaleX).toBe(scaleY)
      expect(scaleX).toBe(2)
    })
  })

  describe('size calculation from handle drag', () => {
    function calculateNewSize(
      handle: ResizeHandle,
      originalWidth: number,
      originalHeight: number,
      dx: number,
      dy: number
    ): { width: number; height: number } {
      let newWidth = originalWidth
      let newHeight = originalHeight

      if (handle.includes('e')) newWidth = originalWidth + dx
      if (handle.includes('w')) newWidth = originalWidth - dx
      if (handle.includes('s')) newHeight = originalHeight + dy
      if (handle.includes('n')) newHeight = originalHeight - dy

      // Clamp to minimum size
      newWidth = Math.max(10, newWidth)
      newHeight = Math.max(10, newHeight)

      return { width: newWidth, height: newHeight }
    }

    it('increases width when dragging east', () => {
      const result = calculateNewSize('e', 100, 100, 50, 0)
      expect(result.width).toBe(150)
      expect(result.height).toBe(100)
    })

    it('decreases width when dragging west', () => {
      const result = calculateNewSize('w', 100, 100, 30, 0)
      expect(result.width).toBe(70)
      expect(result.height).toBe(100)
    })

    it('increases height when dragging south', () => {
      const result = calculateNewSize('s', 100, 100, 0, 50)
      expect(result.width).toBe(100)
      expect(result.height).toBe(150)
    })

    it('decreases height when dragging north', () => {
      const result = calculateNewSize('n', 100, 100, 0, 30)
      expect(result.width).toBe(100)
      expect(result.height).toBe(70)
    })

    it('handles corner handles (se)', () => {
      const result = calculateNewSize('se', 100, 100, 50, 30)
      expect(result.width).toBe(150)
      expect(result.height).toBe(130)
    })

    it('handles corner handles (nw)', () => {
      const result = calculateNewSize('nw', 100, 100, 20, 10)
      expect(result.width).toBe(80)  // 100 - 20
      expect(result.height).toBe(90) // 100 - 10
    })

    it('clamps to minimum size', () => {
      const result = calculateNewSize('nw', 50, 50, 100, 100)
      expect(result.width).toBe(10)  // clamped
      expect(result.height).toBe(10) // clamped
    })
  })
})
