/**
 * DragState Model Tests
 *
 * Tests the pure drag state management without any DOM dependencies.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DragState,
  createDragState,
  type DragSource,
  type Point,
  type Rect,
} from '../drag-state'

describe('DragState', () => {
  let state: DragState

  beforeEach(() => {
    state = createDragState()
  })

  // ==========================================================================
  // Initial State
  // ==========================================================================

  describe('initial state', () => {
    it('starts in idle phase', () => {
      expect(state.getPhase()).toBe('idle')
      expect(state.isIdle()).toBe(true)
    })

    it('has no source or target', () => {
      expect(state.getSource()).toBeNull()
      expect(state.getTarget()).toBeNull()
    })

    it('has zero delta', () => {
      expect(state.getDelta()).toEqual({ x: 0, y: 0 })
      expect(state.getDistance()).toBe(0)
    })
  })

  // ==========================================================================
  // State Transitions
  // ==========================================================================

  describe('start()', () => {
    const source: DragSource = {
      type: 'element',
      nodeId: 'node-1',
      rect: { x: 100, y: 100, width: 50, height: 50 },
      grabOffset: { x: 10, y: 20 }, // Clicked 10px from left, 20px from top
    }
    const position: Point = { x: 110, y: 120 }

    it('transitions from idle to pending', () => {
      const result = state.start(source, position)

      expect(result).toBe(true)
      expect(state.getPhase()).toBe('pending')
      expect(state.isPending()).toBe(true)
    })

    it('stores source and position', () => {
      state.start(source, position)

      expect(state.getSource()).toEqual(source)
      expect(state.getStartPosition()).toEqual(position)
      expect(state.getCurrentPosition()).toEqual(position)
    })

    it('rejects start when not idle', () => {
      state.start(source, position)
      const result = state.start(source, { x: 200, y: 200 })

      expect(result).toBe(false)
      expect(state.getStartPosition()).toEqual(position)
    })

    it('works with palette source', () => {
      const paletteSource: DragSource = {
        type: 'palette',
        componentName: 'Box',
        properties: 'w 100, h 100',
      }

      state.start(paletteSource, position)

      expect(state.getSource()).toEqual(paletteSource)
    })
  })

  describe('move()', () => {
    const source: DragSource = {
      type: 'element',
      nodeId: 'node-1',
      rect: { x: 0, y: 0, width: 50, height: 50 },
      grabOffset: { x: 25, y: 25 }, // Grabbed at center
    }

    beforeEach(() => {
      state.start(source, { x: 100, y: 100 })
    })

    it('updates current position', () => {
      state.move({ x: 110, y: 120 })

      expect(state.getCurrentPosition()).toEqual({ x: 110, y: 120 })
    })

    it('calculates delta correctly', () => {
      state.move({ x: 150, y: 130 })

      expect(state.getDelta()).toEqual({ x: 50, y: 30 })
    })

    it('stays pending when under threshold', () => {
      state.move({ x: 101, y: 101 }) // Distance ~1.4px

      expect(state.isPending()).toBe(true)
      expect(state.isDragging()).toBe(false)
    })

    it('transitions to dragging when threshold exceeded', () => {
      state.move({ x: 105, y: 100 }) // Distance = 5px > default 3px

      expect(state.isDragging()).toBe(true)
      expect(state.isPending()).toBe(false)
    })

    it('rejects move when idle', () => {
      const freshState = createDragState()
      const result = freshState.move({ x: 200, y: 200 })

      expect(result).toBe(false)
    })
  })

  describe('setTarget()', () => {
    const source: DragSource = {
      type: 'element',
      nodeId: 'node-1',
      rect: { x: 0, y: 0, width: 50, height: 50 },
      grabOffset: { x: 25, y: 25 },
    }

    it('sets target when dragging', () => {
      state.start(source, { x: 100, y: 100 })
      state.move({ x: 110, y: 100 }) // Exceed threshold

      state.setTarget({
        nodeId: 'node-2',
        placement: 'inside',
      })

      expect(state.getTarget()).toEqual({
        nodeId: 'node-2',
        placement: 'inside',
      })
    })

    it('ignores target when pending', () => {
      state.start(source, { x: 100, y: 100 })

      state.setTarget({
        nodeId: 'node-2',
        placement: 'inside',
      })

      expect(state.getTarget()).toBeNull()
    })
  })

  describe('complete()', () => {
    const source: DragSource = {
      type: 'element',
      nodeId: 'node-1',
      rect: { x: 0, y: 0, width: 50, height: 50 },
      grabOffset: { x: 25, y: 25 },
    }

    it('returns result when dragging with target', () => {
      state.start(source, { x: 100, y: 100 })
      state.move({ x: 150, y: 120 })
      state.setTarget({ nodeId: 'node-2', placement: 'after' })

      const result = state.complete()

      expect(result).not.toBeNull()
      expect(result!.source).toEqual(source)
      expect(result!.target.nodeId).toBe('node-2')
      expect(result!.delta).toEqual({ x: 50, y: 20 })
    })

    it('returns null and resets when pending', () => {
      state.start(source, { x: 100, y: 100 })

      const result = state.complete()

      expect(result).toBeNull()
      expect(state.isIdle()).toBe(true)
    })

    it('returns null when no target', () => {
      state.start(source, { x: 100, y: 100 })
      state.move({ x: 150, y: 120 })

      const result = state.complete()

      expect(result).toBeNull()
    })

    it('transitions to complete phase', () => {
      state.start(source, { x: 100, y: 100 })
      state.move({ x: 150, y: 120 })
      state.setTarget({ nodeId: 'node-2', placement: 'inside' })

      state.complete()

      expect(state.isComplete()).toBe(true)
    })
  })

  describe('cancel()', () => {
    it('resets to idle from any phase', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 25, y: 25 },
      }

      state.start(source, { x: 100, y: 100 })
      state.move({ x: 150, y: 120 })

      state.cancel()

      expect(state.isIdle()).toBe(true)
      expect(state.getSource()).toBeNull()
      expect(state.getCurrentPosition()).toBeNull()
    })
  })

  // ==========================================================================
  // Calculations
  // ==========================================================================

  describe('getDistance()', () => {
    it('calculates Euclidean distance', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 0, y: 0 },
      }

      state.start(source, { x: 0, y: 0 })
      state.move({ x: 3, y: 4 })

      expect(state.getDistance()).toBe(5) // 3-4-5 triangle
    })
  })

  describe('snapToGrid()', () => {
    it('snaps position to grid', () => {
      const gridState = createDragState({ gridSize: 8 })

      expect(gridState.snapToGrid({ x: 10, y: 15 })).toEqual({ x: 8, y: 16 })
      expect(gridState.snapToGrid({ x: 12, y: 20 })).toEqual({ x: 16, y: 24 })
    })

    it('returns original when grid is 0', () => {
      const noGridState = createDragState({ gridSize: 0 })

      expect(noGridState.snapToGrid({ x: 10, y: 15 })).toEqual({ x: 10, y: 15 })
    })
  })

  describe('calculateNewPosition()', () => {
    it('applies delta to original rect', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 100, y: 100, width: 50, height: 50 },
        grabOffset: { x: 10, y: 10 },
      }

      state.start(source, { x: 110, y: 110 })
      state.move({ x: 160, y: 130 })

      const newPos = state.calculateNewPosition(source.rect)

      expect(newPos).toEqual({ x: 150, y: 120 })
    })

    it('snaps to grid when configured', () => {
      const gridState = createDragState({ gridSize: 8 })
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 100, y: 100, width: 50, height: 50 },
        grabOffset: { x: 10, y: 10 },
      }

      gridState.start(source, { x: 110, y: 110 })
      gridState.move({ x: 115, y: 115 }) // delta: 5, 5

      const newPos = gridState.calculateNewPosition(source.rect)

      // 100 + 5 = 105 → snaps to 104
      expect(newPos).toEqual({ x: 104, y: 104 })
    })
  })

  // ==========================================================================
  // Duplicate Mode
  // ==========================================================================

  describe('duplicate mode', () => {
    it('defaults to non-duplicate', () => {
      expect(state.isDuplicating()).toBe(false)
    })

    it('can be configured on creation', () => {
      const dupState = createDragState({ duplicate: true })
      expect(dupState.isDuplicating()).toBe(true)
    })

    it('can be toggled during drag', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 25, y: 25 },
      }

      state.start(source, { x: 100, y: 100 })
      state.setDuplicate(true)

      expect(state.isDuplicating()).toBe(true)
    })

    it('is included in result', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 25, y: 25 },
      }

      state.start(source, { x: 100, y: 100 })
      state.move({ x: 150, y: 120 })
      state.setDuplicate(true)
      state.setTarget({ nodeId: 'node-2', placement: 'inside' })

      const result = state.complete()

      expect(result!.isDuplicate).toBe(true)
    })
  })

  // ==========================================================================
  // Custom Threshold
  // ==========================================================================

  describe('custom threshold', () => {
    it('respects custom threshold', () => {
      const sensitiveState = createDragState({ threshold: 1 })
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 25, y: 25 },
      }

      sensitiveState.start(source, { x: 100, y: 100 })
      sensitiveState.move({ x: 101, y: 101 }) // Distance ~1.4px

      expect(sensitiveState.isDragging()).toBe(true)
    })

    it('can be changed after creation', () => {
      state.setThreshold(10)

      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 25, y: 25 },
      }

      state.start(source, { x: 100, y: 100 })
      state.move({ x: 108, y: 100 }) // Distance = 8px

      expect(state.isPending()).toBe(true) // Still pending, threshold is 10
    })
  })

  // ==========================================================================
  // Snapshot
  // ==========================================================================

  describe('getSnapshot()', () => {
    it('returns complete state', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 0, y: 0, width: 50, height: 50 },
        grabOffset: { x: 25, y: 25 },
      }

      state.start(source, { x: 100, y: 100 })
      state.move({ x: 150, y: 120 })
      state.setTarget({ nodeId: 'node-2', placement: 'after' })

      const snapshot = state.getSnapshot()

      expect(snapshot).toEqual({
        phase: 'dragging',
        source,
        startPosition: { x: 100, y: 100 },
        currentPosition: { x: 150, y: 120 },
        delta: { x: 50, y: 20 },
        target: { nodeId: 'node-2', placement: 'after' },
        isDuplicate: false,
      })
    })
  })

  // ==========================================================================
  // Ghost Calculation (NEW)
  // ==========================================================================

  describe('calculateGhostRect()', () => {
    it('returns null when idle', () => {
      expect(state.calculateGhostRect()).toBeNull()
    })

    it('calculates ghost position using grab offset', () => {
      // Element at (100, 100), size 80x40
      // User clicks at (120, 110) - that's 20px from left, 10px from top
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 100, y: 100, width: 80, height: 40 },
        grabOffset: { x: 20, y: 10 },
      }

      state.start(source, { x: 120, y: 110 })
      state.move({ x: 200, y: 150 })

      const ghost = state.calculateGhostRect()

      // Ghost.x = cursor.x - grabOffset.x = 200 - 20 = 180
      // Ghost.y = cursor.y - grabOffset.y = 150 - 10 = 140
      expect(ghost).toEqual({
        x: 180,
        y: 140,
        width: 80,
        height: 40,
      })
    })

    it('maintains relative cursor position (no jumping)', () => {
      // User grabs element at right edge (x: 75 from left)
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 100, y: 100, width: 80, height: 40 },
        grabOffset: { x: 75, y: 20 }, // Near right edge
      }

      state.start(source, { x: 175, y: 120 }) // cursor at element's right edge
      state.move({ x: 175, y: 120 }) // Same position - no movement yet

      const ghost = state.calculateGhostRect()

      // Ghost should be at original position (no jumping)
      expect(ghost).toEqual({
        x: 100, // 175 - 75 = 100 (original position)
        y: 100, // 120 - 20 = 100 (original position)
        width: 80,
        height: 40,
      })
    })

    it('applies grid snapping to ghost position', () => {
      const gridState = createDragState({ gridSize: 8 })
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 100, y: 100, width: 80, height: 40 },
        grabOffset: { x: 20, y: 10 },
      }

      gridState.start(source, { x: 120, y: 110 })
      gridState.move({ x: 125, y: 115 }) // 125-20=105, 115-10=105

      const ghost = gridState.calculateGhostRect()

      // 105 snaps to 104 (nearest 8-grid)
      expect(ghost).toEqual({
        x: 104,
        y: 104,
        width: 80,
        height: 40,
      })
    })

    it('centers palette items on cursor', () => {
      const paletteSource: DragSource = {
        type: 'palette',
        componentName: 'Button',
        defaultSize: { width: 100, height: 40 },
      }

      state.start(paletteSource, { x: 200, y: 150 })
      state.move({ x: 200, y: 150 })

      const ghost = state.calculateGhostRect()

      // Palette items center on cursor
      expect(ghost).toEqual({
        x: 150, // 200 - 50 (half width)
        y: 130, // 150 - 20 (half height)
        width: 100,
        height: 40,
      })
    })

    it('uses default size for palette without specified size', () => {
      const paletteSource: DragSource = {
        type: 'palette',
        componentName: 'Box',
        // No defaultSize specified
      }

      state.start(paletteSource, { x: 200, y: 150 })
      state.move({ x: 200, y: 150 })

      const ghost = state.calculateGhostRect()

      // Default size is 100x40
      expect(ghost!.width).toBe(100)
      expect(ghost!.height).toBe(40)
    })
  })

  describe('getGrabOffset()', () => {
    it('returns null for idle state', () => {
      expect(state.getGrabOffset()).toBeNull()
    })

    it('returns grab offset for element source', () => {
      const source: DragSource = {
        type: 'element',
        nodeId: 'node-1',
        rect: { x: 100, y: 100, width: 80, height: 40 },
        grabOffset: { x: 20, y: 10 },
      }

      state.start(source, { x: 120, y: 110 })

      expect(state.getGrabOffset()).toEqual({ x: 20, y: 10 })
    })

    it('returns null for palette source', () => {
      const paletteSource: DragSource = {
        type: 'palette',
        componentName: 'Button',
      }

      state.start(paletteSource, { x: 200, y: 150 })

      expect(state.getGrabOffset()).toBeNull()
    })
  })
})
