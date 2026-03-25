/**
 * Snap Calculator Tests
 */

import { describe, it, expect } from 'vitest'
import { calculateSnap } from '../snap/calculator'
import type { Rect, Size, SnapConfig } from '../types'

describe('calculateSnap', () => {
  const container: Rect = { x: 0, y: 0, width: 400, height: 300 }
  const sourceSize: Size = { width: 100, height: 50 }

  describe('edge snapping', () => {
    const config: Partial<SnapConfig> = {
      threshold: 10,
      snapToEdges: true,
      snapToCenter: false,
      snapToSiblings: false,
    }

    it('snaps to left edge within threshold', () => {
      const result = calculateSnap({ x: 8, y: 100 }, sourceSize, container, [], config)

      expect(result.position.x).toBe(0)
      expect(result.snapped).toBe(true)
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'edge', position: 0 })
      )
    })

    it('snaps to right edge within threshold', () => {
      const result = calculateSnap({ x: 295, y: 100 }, sourceSize, container, [], config)

      expect(result.position.x).toBe(300) // 400 - 100
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'edge', position: 400 })
      )
    })

    it('snaps to top edge within threshold', () => {
      const result = calculateSnap({ x: 100, y: 5 }, sourceSize, container, [], config)

      expect(result.position.y).toBe(0)
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'y', type: 'edge', position: 0 })
      )
    })

    it('snaps to bottom edge within threshold', () => {
      const result = calculateSnap({ x: 100, y: 248 }, sourceSize, container, [], config)

      expect(result.position.y).toBe(250) // 300 - 50
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'y', type: 'edge', position: 300 })
      )
    })

    it('does not snap when outside threshold', () => {
      const result = calculateSnap({ x: 50, y: 100 }, sourceSize, container, [], config)

      expect(result.position.x).toBe(50)
      expect(result.snapped).toBe(false)
      expect(result.guides).toHaveLength(0)
    })
  })

  describe('center snapping', () => {
    const config: Partial<SnapConfig> = {
      threshold: 10,
      snapToEdges: false,
      snapToCenter: true,
      snapToSiblings: false,
    }

    it('snaps to horizontal center', () => {
      const result = calculateSnap({ x: 147, y: 100 }, sourceSize, container, [], config)

      expect(result.position.x).toBe(150) // (400 - 100) / 2
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'center' })
      )
    })

    it('snaps to vertical center', () => {
      const result = calculateSnap({ x: 100, y: 122 }, sourceSize, container, [], config)

      expect(result.position.y).toBe(125) // (300 - 50) / 2
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'y', type: 'center' })
      )
    })

    it('does not snap when outside threshold', () => {
      const result = calculateSnap({ x: 100, y: 100 }, sourceSize, container, [], config)

      expect(result.position).toEqual({ x: 100, y: 100 })
      expect(result.snapped).toBe(false)
    })
  })

  describe('sibling snapping', () => {
    const config: Partial<SnapConfig> = {
      threshold: 10,
      snapToEdges: false,
      snapToCenter: false,
      snapToSiblings: true,
    }

    const siblings: Rect[] = [
      { x: 50, y: 200, width: 80, height: 40 },
    ]

    it('snaps to sibling left edge', () => {
      const result = calculateSnap({ x: 53, y: 100 }, sourceSize, container, siblings, config)

      expect(result.position.x).toBe(50)
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'sibling' })
      )
    })

    it('snaps to sibling right edge', () => {
      // Source right edge (x + 100) aligns with sibling right edge (50 + 80 = 130)
      const result = calculateSnap({ x: 27, y: 100 }, sourceSize, container, siblings, config)

      expect(result.position.x).toBe(30) // 130 - 100
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'x', type: 'sibling' })
      )
    })

    it('snaps to sibling top edge', () => {
      const result = calculateSnap({ x: 200, y: 197 }, sourceSize, container, siblings, config)

      expect(result.position.y).toBe(200)
      expect(result.guides).toContainEqual(
        expect.objectContaining({ axis: 'y', type: 'sibling' })
      )
    })
  })

  describe('multiple snaps', () => {
    const config: Partial<SnapConfig> = {
      threshold: 10,
      snapToEdges: true,
      snapToCenter: false,
      snapToSiblings: false,
    }

    it('can snap both axes simultaneously', () => {
      const result = calculateSnap({ x: 8, y: 5 }, sourceSize, container, [], config)

      expect(result.position).toEqual({ x: 0, y: 0 })
      expect(result.guides).toHaveLength(2)
    })
  })

  describe('grid snapping', () => {
    const config: Partial<SnapConfig> = {
      gridSize: 10,
      snapToEdges: false,
      snapToCenter: false,
      snapToSiblings: false,
    }

    it('snaps to grid', () => {
      const result = calculateSnap({ x: 53, y: 67 }, sourceSize, container, [], config)

      expect(result.position.x).toBe(50)
      expect(result.position.y).toBe(70)
    })
  })
})
