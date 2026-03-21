/**
 * CoordinateCalculator Tests
 *
 * Tests centralized position calculation utilities.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateElementPosition,
  calculateDragDelta,
  calculateGhostPosition,
  calculateDropPosition,
  calculateAbsolutePosition,
  calculateFlexToAbsolutePosition,
  validateCoordinate,
  validatePoint,
  validateAndClampCoordinates,
  snapPointToGrid,
  snapToGridSafe,
} from '../coordinate-calculator'

// ==========================================================================
// Element Position Calculations
// ==========================================================================

describe('calculateElementPosition()', () => {
  it('calculates position relative to container', () => {
    const element = { x: 150, y: 200, width: 100, height: 50 }
    const container = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateElementPosition(element, container)

    expect(result).toEqual({ x: 50, y: 100 })
  })

  it('clamps negative positions to zero', () => {
    const element = { x: 50, y: 80, width: 100, height: 50 }
    const container = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateElementPosition(element, container)

    // Element is above/left of container, should clamp to 0
    expect(result).toEqual({ x: 0, y: 0 })
  })
})

// ==========================================================================
// Drag Delta Calculations
// ==========================================================================

describe('calculateDragDelta()', () => {
  it('calculates delta between two points', () => {
    const start = { x: 100, y: 100 }
    const current = { x: 150, y: 200 }

    const result = calculateDragDelta(start, current)

    expect(result).toEqual({ x: 50, y: 100 })
  })

  it('handles negative deltas', () => {
    const start = { x: 200, y: 300 }
    const current = { x: 150, y: 250 }

    const result = calculateDragDelta(start, current)

    expect(result).toEqual({ x: -50, y: -50 })
  })
})

// ==========================================================================
// Ghost Position Calculations
// ==========================================================================

describe('calculateGhostPosition()', () => {
  it('calculates ghost position from element rect and delta', () => {
    const elementRect = { x: 100, y: 200, width: 50, height: 30 }
    const delta = { x: 25, y: 50 }

    const result = calculateGhostPosition(elementRect, delta)

    expect(result).toEqual({ x: 125, y: 250 })
  })
})

// ==========================================================================
// Drop Position Calculations
// ==========================================================================

describe('calculateDropPosition()', () => {
  it('calculates drop position relative to container', () => {
    const ghostRect = { x: 175, y: 225, width: 50, height: 30 }
    const containerRect = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateDropPosition(ghostRect, containerRect)

    expect(result).toEqual({ x: 75, y: 125 })
  })

  it('clamps to non-negative values', () => {
    const ghostRect = { x: 50, y: 80, width: 50, height: 30 }
    const containerRect = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateDropPosition(ghostRect, containerRect)

    expect(result).toEqual({ x: 0, y: 0 })
  })

  it('rounds to integers', () => {
    const ghostRect = { x: 125.7, y: 150.3, width: 50, height: 30 }
    const containerRect = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateDropPosition(ghostRect, containerRect)

    expect(result).toEqual({ x: 26, y: 50 })
  })
})

// ==========================================================================
// Absolute Position Calculations
// ==========================================================================

describe('calculateAbsolutePosition()', () => {
  it('calculates new position from start position and delta', () => {
    const startPos = { x: 50, y: 100 }
    const delta = { x: 30, y: 40 }

    const result = calculateAbsolutePosition(startPos, delta)

    expect(result).toEqual({ x: 80, y: 140 })
  })

  it('clamps to non-negative values', () => {
    const startPos = { x: 20, y: 30 }
    const delta = { x: -50, y: -100 }

    const result = calculateAbsolutePosition(startPos, delta)

    expect(result).toEqual({ x: 0, y: 0 })
  })
})

describe('calculateFlexToAbsolutePosition()', () => {
  it('calculates position from cursor and container', () => {
    const cursor = { x: 175, y: 225 }
    const container = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateFlexToAbsolutePosition(cursor, container)

    expect(result).toEqual({ x: 75, y: 125 })
  })

  it('clamps to non-negative values', () => {
    const cursor = { x: 50, y: 80 }
    const container = { x: 100, y: 100, width: 500, height: 400 }

    const result = calculateFlexToAbsolutePosition(cursor, container)

    expect(result).toEqual({ x: 0, y: 0 })
  })
})

// ==========================================================================
// Validation Utilities
// ==========================================================================

describe('validateCoordinate()', () => {
  it('returns valid coordinate clamped to >= 0', () => {
    expect(validateCoordinate(50)).toBe(50)
    expect(validateCoordinate(-10)).toBe(0)
    expect(validateCoordinate(25.7)).toBe(26)
  })

  it('returns null for invalid values', () => {
    expect(validateCoordinate(undefined)).toBe(null)
    expect(validateCoordinate(NaN)).toBe(null)
    expect(validateCoordinate(Infinity)).toBe(null)
  })
})

describe('validatePoint()', () => {
  it('returns validated point', () => {
    expect(validatePoint({ x: 50, y: 100 })).toEqual({ x: 50, y: 100 })
    expect(validatePoint({ x: -10, y: -20 })).toEqual({ x: 0, y: 0 })
  })

  it('returns null for invalid points', () => {
    expect(validatePoint(undefined)).toBe(null)
    expect(validatePoint({ x: NaN, y: 100 })).toBe(null)
    expect(validatePoint({ x: 50, y: Infinity })).toBe(null)
  })
})

describe('validateAndClampCoordinates()', () => {
  it('returns valid result with clamped coordinates', () => {
    const result = validateAndClampCoordinates(50, 100)
    expect(result).toEqual({ x: 50, y: 100, valid: true })
  })

  it('clamps negative values to zero', () => {
    const result = validateAndClampCoordinates(-10, -20)
    expect(result).toEqual({ x: 0, y: 0, valid: true })
  })

  it('returns invalid result for NaN/Infinity', () => {
    expect(validateAndClampCoordinates(NaN, 100)).toEqual({ x: 0, y: 0, valid: false })
    expect(validateAndClampCoordinates(50, Infinity)).toEqual({ x: 0, y: 0, valid: false })
  })
})

// ==========================================================================
// Grid Snapping
// ==========================================================================

describe('snapPointToGrid()', () => {
  it('snaps point to grid', () => {
    const point = { x: 47, y: 63 }
    const result = snapPointToGrid(point, 8)

    expect(result).toEqual({ x: 48, y: 64 })
  })

  it('returns clamped point when grid is disabled (0)', () => {
    const point = { x: 47.5, y: 63.2 }
    const result = snapPointToGrid(point, 0)

    expect(result).toEqual({ x: 48, y: 63 })
  })

  it('clamps to >= 0', () => {
    const point = { x: -5, y: -10 }
    const result = snapPointToGrid(point, 8)

    expect(result).toEqual({ x: 0, y: 0 })
  })
})

describe('snapToGridSafe()', () => {
  it('validates and snaps', () => {
    const point = { x: 47, y: 63 }
    const result = snapToGridSafe(point, 8)

    expect(result).toEqual({ x: 48, y: 64 })
  })

  it('returns zero for invalid input', () => {
    const point = { x: NaN, y: 100 }
    const result = snapToGridSafe(point, 8)

    expect(result).toEqual({ x: 0, y: 0 })
  })
})
