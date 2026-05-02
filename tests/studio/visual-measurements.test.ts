/**
 * studio/visual/measurements/measurement-calculator
 *
 * Pure-function geometry helpers — distances from a selected element to
 * its container edges and to nearest siblings. Each test pins a
 * concrete layout so the calculation invariants stay obvious.
 */

import { describe, it, expect } from 'vitest'
import { calculateMeasurements } from '../../studio/visual/measurements/measurement-calculator'
import type { Rect } from '../../studio/visual/measurements/types'

const CONTAINER: Rect = { x: 0, y: 0, width: 200, height: 200 }

function rect(x: number, y: number, w: number, h: number): Rect {
  return { x, y, width: w, height: h }
}

describe('calculateMeasurements — container edges', () => {
  it('emits all four edge distances when element is centred', () => {
    const selected = rect(50, 50, 100, 100)
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER)

    const containerEdges = measurements.filter(m => m.to === 'container')
    expect(containerEdges).toHaveLength(4)

    const byEdge = Object.fromEntries(containerEdges.map(m => [m.edge, m.distance]))
    expect(byEdge.top).toBe(50)
    expect(byEdge.bottom).toBe(50)
    expect(byEdge.left).toBe(50)
    expect(byEdge.right).toBe(50)
  })

  it('skips zero-distance container edges', () => {
    // Element flush against top-left of container
    const selected = rect(0, 0, 100, 100)
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER)
    const edges = measurements.filter(m => m.to === 'container').map(m => m.edge)
    expect(edges).not.toContain('top')
    expect(edges).not.toContain('left')
    expect(edges).toContain('bottom')
    expect(edges).toContain('right')
  })

  it('rounds fractional distances', () => {
    const selected = rect(33.7, 22.4, 50, 50)
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER)
    for (const m of measurements) {
      expect(Number.isInteger(m.distance)).toBe(true)
    }
  })
})

describe('calculateMeasurements — sibling gaps', () => {
  it('finds horizontal gap between vertically-overlapping siblings', () => {
    const a = rect(10, 50, 50, 50) // ends at x=60
    const b = rect(100, 60, 50, 50) // starts at x=100, vertically overlaps a
    const siblings = new Map([
      ['a', a],
      ['b', b],
    ])

    const measurements = calculateMeasurements('a', a, siblings, CONTAINER)
    const sibling = measurements.find(m => m.to === 'b')
    expect(sibling).toBeDefined()
    expect(sibling?.direction).toBe('horizontal')
    expect(sibling?.distance).toBe(40) // 100 - 60
  })

  it('finds vertical gap between horizontally-overlapping siblings', () => {
    const a = rect(10, 10, 50, 50) // ends at y=60
    const b = rect(20, 100, 50, 50) // starts at y=100, horizontally overlaps a
    const siblings = new Map([
      ['a', a],
      ['b', b],
    ])

    const measurements = calculateMeasurements('a', a, siblings, CONTAINER)
    const sibling = measurements.find(m => m.to === 'b')
    expect(sibling).toBeDefined()
    expect(sibling?.direction).toBe('vertical')
    expect(sibling?.distance).toBe(40) // 100 - 60
  })

  it('skips siblings that overlap (no gap)', () => {
    const a = rect(10, 10, 50, 50)
    const b = rect(30, 30, 50, 50) // overlaps a
    const siblings = new Map([
      ['a', a],
      ['b', b],
    ])

    const measurements = calculateMeasurements('a', a, siblings, CONTAINER)
    expect(measurements.find(m => m.to === 'b')).toBeUndefined()
  })

  it('skips diagonally-positioned siblings (no axis overlap)', () => {
    const a = rect(10, 10, 30, 30) // top-left
    const b = rect(120, 120, 30, 30) // bottom-right, no overlap on either axis
    const siblings = new Map([
      ['a', a],
      ['b', b],
    ])

    const measurements = calculateMeasurements('a', a, siblings, CONTAINER)
    expect(measurements.find(m => m.to === 'b')).toBeUndefined()
  })

  it('does not measure to itself', () => {
    const a = rect(50, 50, 50, 50)
    const siblings = new Map([['a', a]])
    const measurements = calculateMeasurements('a', a, siblings, CONTAINER)
    expect(measurements.find(m => m.to === 'a')).toBeUndefined()
  })
})

describe('calculateMeasurements — config', () => {
  it('respects minDistance filter', () => {
    const selected = rect(1, 1, 50, 50)
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER, {
      minDistance: 10,
    })
    // top=1 and left=1 should be filtered out (< 10)
    const edges = measurements.filter(m => m.to === 'container').map(m => m.edge)
    expect(edges).not.toContain('top')
    expect(edges).not.toContain('left')
  })

  it('respects maxMeasurements limit and sorts by distance ascending', () => {
    const selected = rect(50, 50, 100, 100)
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER, {
      maxMeasurements: 2,
    })
    expect(measurements).toHaveLength(2)
    // Closest measurements come first
    expect(measurements[0].distance).toBeLessThanOrEqual(measurements[1].distance)
  })

  it('returns empty array when no measurements meet threshold', () => {
    const selected = rect(0, 0, 200, 200) // fills container exactly
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER)
    expect(measurements).toHaveLength(0)
  })
})

describe('calculateMeasurements — labelPosition + line endpoints', () => {
  it('places container-top label at midpoint of top gap', () => {
    const selected = rect(60, 80, 80, 50) // top distance = 80
    const measurements = calculateMeasurements('a', selected, new Map(), CONTAINER)
    const top = measurements.find(m => m.edge === 'top' && m.to === 'container')
    expect(top?.labelPosition.x).toBe(60 + 80 / 2) // x-center of element
    expect(top?.labelPosition.y).toBe(40) // midpoint of 0..80
    expect(top?.lineStart.y).toBe(0)
    expect(top?.lineEnd.y).toBe(80)
  })
})
