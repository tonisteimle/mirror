/**
 * studio/visual/auto-layout/pattern-detector
 *
 * Detects layout patterns (hor / ver / grid / wrap) from selected node
 * positions. Pure-function — no DOM, no module-globals.
 */

import { describe, it, expect } from 'vitest'
import {
  detectLayoutPattern,
  type LayoutRect,
} from '../../studio/visual/auto-layout/pattern-detector'

function rect(x: number, y: number, w: number, h: number): LayoutRect {
  return { x, y, width: w, height: h }
}

function rectsToMap(rects: Array<{ id: string; r: LayoutRect }>): Map<string, LayoutRect> {
  return new Map(rects.map(({ id, r }) => [id, r]))
}

describe('detectLayoutPattern — guard rails', () => {
  it('returns null with fewer than 2 nodes', () => {
    const rects = rectsToMap([{ id: 'a', r: rect(0, 0, 50, 50) }])
    expect(detectLayoutPattern(['a'], rects)).toBeNull()
  })

  it('returns null when nodeIds map to no rects', () => {
    const rects = rectsToMap([{ id: 'a', r: rect(0, 0, 50, 50) }])
    expect(detectLayoutPattern(['x', 'y'], rects)).toBeNull()
  })

  it('returns null when only one node has a rect', () => {
    const rects = rectsToMap([{ id: 'a', r: rect(0, 0, 50, 50) }])
    expect(detectLayoutPattern(['a', 'b'], rects)).toBeNull()
  })
})

describe('detectLayoutPattern — horizontal stack', () => {
  it('detects 3 elements arranged horizontally with same Y', () => {
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(60, 0, 50, 50) },
      { id: 'c', r: rect(120, 0, 50, 50) },
    ])
    const result = detectLayoutPattern(['a', 'b', 'c'], rects)
    expect(result).not.toBeNull()
    expect(result?.pattern).toBe('horizontal-stack')
    expect(result?.preview).toContain('hor')
    // Detector rounds gap to 4-px grid; raw is 10, snapped is ~12
    expect(result?.inferredGap).toBeGreaterThan(0)
    expect(result?.confidence).toBeGreaterThanOrEqual(0.6)
  })
})

describe('detectLayoutPattern — vertical stack', () => {
  it('detects 3 elements arranged vertically with same X', () => {
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(0, 70, 50, 50) },
      { id: 'c', r: rect(0, 140, 50, 50) },
    ])
    const result = detectLayoutPattern(['a', 'b', 'c'], rects)
    expect(result).not.toBeNull()
    expect(result?.pattern).toBe('vertical-stack')
    expect(result?.preview).toMatch(/ver|gap/)
    expect(result?.inferredGap).toBeGreaterThan(0)
  })
})

describe('detectLayoutPattern — grid', () => {
  it('detects 2x2 grid', () => {
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(60, 0, 50, 50) },
      { id: 'c', r: rect(0, 60, 50, 50) },
      { id: 'd', r: rect(60, 60, 50, 50) },
    ])
    const result = detectLayoutPattern(['a', 'b', 'c', 'd'], rects)
    expect(result).not.toBeNull()
    expect(result?.pattern).toBe('grid')
    expect(result?.gridColumns).toBe(2)
  })

  it('detects 3x2 grid (6 elements)', () => {
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(60, 0, 50, 50) },
      { id: 'c', r: rect(120, 0, 50, 50) },
      { id: 'd', r: rect(0, 60, 50, 50) },
      { id: 'e', r: rect(60, 60, 50, 50) },
      { id: 'f', r: rect(120, 60, 50, 50) },
    ])
    const result = detectLayoutPattern(['a', 'b', 'c', 'd', 'e', 'f'], rects)
    expect(result).not.toBeNull()
    expect(result?.pattern).toBe('grid')
    expect(result?.gridColumns).toBe(3)
  })
})

describe('detectLayoutPattern — confidence + tolerance', () => {
  it('respects custom alignmentTolerance for slight misalignment', () => {
    // 2px Y-misalignment should still count as horizontal with default tolerance
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(60, 2, 50, 50) },
      { id: 'c', r: rect(120, 0, 50, 50) },
    ])
    const result = detectLayoutPattern(['a', 'b', 'c'], rects, { alignmentTolerance: 5 })
    expect(result?.pattern).toBe('horizontal-stack')
  })

  it('returns null when minConfidence threshold is too high', () => {
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(60, 30, 50, 50) }, // diagonal, low confidence
    ])
    const result = detectLayoutPattern(['a', 'b'], rects, { minConfidence: 0.99 })
    expect(result).toBeNull()
  })
})

describe('detectLayoutPattern — preview string format', () => {
  it('horizontal preview includes inferred gap', () => {
    const rects = rectsToMap([
      { id: 'a', r: rect(0, 0, 50, 50) },
      { id: 'b', r: rect(58, 0, 50, 50) }, // 8px gap
      { id: 'c', r: rect(116, 0, 50, 50) },
    ])
    const result = detectLayoutPattern(['a', 'b', 'c'], rects)
    expect(result?.preview).toMatch(/gap/)
  })
})
