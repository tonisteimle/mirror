/**
 * Pure-math pins for `computeDropChildIndexPoint`.
 *
 * The helper drives test-API drops; cursor positions must satisfy
 * Studio's HitDetector + InsertionCalculator pipeline. Previous version
 * landed inside HitDetector's ESCAPE_ZONE_SIZE band in tight-packed
 * containers — drop escalated to parent, drop into the container was
 * rejected. The current version subtracts ESCAPE_ZONE_SIZE + safety
 * margin from `containerRect.bottom`.
 */

import { describe, it, expect } from 'vitest'
import { computeDropChildIndexPoint } from '../../studio/test-api/mirror-actions/drop-points'
import { ESCAPE_ZONE_SIZE } from '../../studio/preview/drag/hit-detector'

type Rect = {
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
}

const rect = (left: number, top: number, width: number, height: number): Rect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
})

describe('computeDropChildIndexPoint', () => {
  it('returns container center for empty container', () => {
    const container = rect(0, 0, 320, 240)
    const point = computeDropChildIndexPoint(container, [], 0)
    expect(point).toEqual({ x: 160, y: 120 })
  })

  it('inserts before child[index] just above its top edge', () => {
    const container = rect(0, 0, 320, 400)
    const children = [rect(12, 12, 100, 60), rect(12, 80, 100, 60), rect(12, 148, 100, 60)]
    const point = computeDropChildIndexPoint(container, children, 1)
    // Just above child[1].top=80 with 4px headroom.
    expect(point).toEqual({ x: 62, y: 76 })
  })

  it('clamps insertion before child[0] to inside container top', () => {
    const container = rect(0, 0, 320, 400)
    // Child starts at y=2, so r.top - 4 = -2 < container.top + 4.
    const children = [rect(12, 2, 100, 60)]
    const point = computeDropChildIndexPoint(container, children, 0)
    expect(point.y).toBe(4)
  })

  it('append-at-end in a roomy container: lands just below last child', () => {
    const container = rect(0, 0, 320, 400)
    const children = [rect(12, 12, 100, 60), rect(12, 80, 100, 60), rect(12, 148, 100, 60)]
    // last.bottom=208, last.bottom+8=216, container.bottom-28=372 → min=216.
    const point = computeDropChildIndexPoint(container, children, 3)
    expect(point.y).toBe(216)
  })

  it('append-at-end in a TIGHT container stays outside the escape zone', () => {
    // The bug case: 3×60 children + 2×8 gap + 2×12 pad ≈ 220px inside a 240px
    // container. last.bottom=208, container.bottom=240. Old math would land
    // at y=216 (only 24px from container bottom) — right on the escape-zone
    // boundary. New math lands at y=212 (28px from bottom, 4px headroom).
    const container = rect(0, 0, 320, 240)
    const children = [rect(12, 12, 100, 60), rect(12, 80, 100, 60), rect(12, 148, 100, 60)]
    const point = computeDropChildIndexPoint(container, children, 3)
    expect(point.y).toBe(container.bottom - ESCAPE_ZONE_SIZE - 4)
    expect(point.y).toBe(212)
    // Hit-detector rule: cursor is below last child AND strictly outside
    // the escape-zone band (containerEnd - cursor >= ESCAPE_ZONE_SIZE).
    const last = children[children.length - 1]
    expect(point.y).toBeGreaterThan(last.bottom)
    expect(container.bottom - point.y).toBeGreaterThanOrEqual(ESCAPE_ZONE_SIZE)
  })

  it('append-at-end in an over-packed container returns best-effort (may be inside last child)', () => {
    // Children overflow into the escape zone — no safe cursor position
    // exists. Helper returns the escape-zone-safe y, even if it's above
    // last child. Documented for awareness; caller should not expect
    // correctness in this geometry.
    const container = rect(0, 0, 320, 220)
    const children = [rect(12, 8, 100, 60), rect(12, 76, 100, 60), rect(12, 144, 100, 60)]
    // last.bottom=204, container.bottom-28=192 → min=192 (above last child!).
    const point = computeDropChildIndexPoint(container, children, 3)
    expect(point.y).toBe(192)
    // No assertion that this is "below last child" — geometry doesn't allow it.
  })

  it('uses last child x-midpoint for append-at-end', () => {
    const container = rect(0, 0, 320, 400)
    const children = [rect(50, 12, 100, 60)]
    const point = computeDropChildIndexPoint(container, children, 1)
    expect(point.x).toBe(100) // 50 + 100/2
  })
})
