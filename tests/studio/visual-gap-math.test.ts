/**
 * gap-handle-math — pure-function tests.
 *
 * Sibling to tests/studio/visual-spacing-math.test.ts which pins
 * padding/margin polarity. Gap is simpler (no inward/outward), but
 * shares the directional-delta and minimum-clamping invariants.
 *
 * Before this file existed: gap math was inline in gap-manager.ts
 * (800+ LOC), exercised only by browser-tests that use synthetic
 * `dispatchEvent(MouseEvent)` — `isTrusted=false`, no real input
 * pipeline. A refactor at the manager level could silently flip
 * direction or break clamping; these tests are the safety net.
 */

import { describe, it, expect } from 'vitest'
import {
  calculateGapDelta,
  applyGapDelta,
  type GapDirection,
} from '../../studio/visual/gap-handle-math'

describe('calculateGapDelta', () => {
  describe('horizontal direction (children flow →)', () => {
    it('drag right grows the gap (positive delta)', () => {
      // start at x=100, mouse moves to x=180 → +80px gap
      expect(calculateGapDelta('horizontal', 100, 200, 180, 200)).toBe(80)
    })

    it('drag left shrinks the gap (negative delta)', () => {
      // start at x=100, mouse moves to x=60 → -40px gap
      expect(calculateGapDelta('horizontal', 100, 200, 60, 200)).toBe(-40)
    })

    it('vertical mouse movement is ignored', () => {
      // Y change of +500 does not affect horizontal gap.
      expect(calculateGapDelta('horizontal', 100, 200, 100, 700)).toBe(0)
    })

    it('returns zero for no movement', () => {
      expect(calculateGapDelta('horizontal', 100, 200, 100, 200)).toBe(0)
    })
  })

  describe('vertical direction (children flow ↓)', () => {
    it('drag down grows the gap (positive delta)', () => {
      // start at y=100, mouse moves to y=150 → +50px gap
      expect(calculateGapDelta('vertical', 50, 100, 50, 150)).toBe(50)
    })

    it('drag up shrinks the gap (negative delta)', () => {
      expect(calculateGapDelta('vertical', 50, 100, 50, 70)).toBe(-30)
    })

    it('horizontal mouse movement is ignored', () => {
      // X change of +999 does not affect vertical gap.
      expect(calculateGapDelta('vertical', 50, 100, 1050, 100)).toBe(0)
    })

    it('returns zero for no movement', () => {
      expect(calculateGapDelta('vertical', 50, 100, 50, 100)).toBe(0)
    })
  })

  describe('direction-polarity is the only difference', () => {
    it('horizontal/vertical produce opposite deltas for the same diagonal drag', () => {
      // Mouse moves +30,-20 from (100,100) to (130,80).
      const hor = calculateGapDelta('horizontal', 100, 100, 130, 80)
      const ver = calculateGapDelta('vertical', 100, 100, 130, 80)
      expect(hor).toBe(30)
      expect(ver).toBe(-20)
    })
  })

  describe.each<GapDirection>(['horizontal', 'vertical'])(
    'sub-pixel coordinates (%s)',
    direction => {
      it('preserves fractional delta', () => {
        const v = calculateGapDelta(direction, 100, 100, 130.5, 130.5)
        // Both axes shifted by +30.5 — pick the relevant one per direction.
        expect(v).toBeCloseTo(30.5, 5)
      })
    }
  )
})

describe('applyGapDelta', () => {
  it('adds positive delta to startGap', () => {
    expect(applyGapDelta(20, 30)).toBe(50)
  })

  it('subtracts negative delta from startGap', () => {
    expect(applyGapDelta(20, -10)).toBe(10)
  })

  it('clamps at zero — gaps cannot be negative', () => {
    // start at 20, delta -50 would yield -30 → clamp to 0.
    expect(applyGapDelta(20, -50)).toBe(0)
  })

  it('clamps even when startGap is already zero', () => {
    expect(applyGapDelta(0, -10)).toBe(0)
  })

  it('starting from zero with positive delta returns the delta', () => {
    expect(applyGapDelta(0, 12)).toBe(12)
  })

  it('preserves fractional values', () => {
    expect(applyGapDelta(20, 5.5)).toBeCloseTo(25.5, 5)
  })

  it('clamps fractional negatives at exactly zero', () => {
    expect(applyGapDelta(0.4, -1)).toBe(0)
  })
})

describe('integration — drag start to finish', () => {
  it('horizontal drag from gap=10, drag mouse +25px → gap=35', () => {
    const delta = calculateGapDelta('horizontal', 100, 100, 125, 100)
    const newGap = applyGapDelta(10, delta)
    expect(newGap).toBe(35)
  })

  it('horizontal drag past minimum → gap=0, not negative', () => {
    const delta = calculateGapDelta('horizontal', 100, 100, 50, 100)
    const newGap = applyGapDelta(10, delta)
    expect(newGap).toBe(0)
  })

  it('vertical drag from gap=4, drag mouse +16px down → gap=20', () => {
    const delta = calculateGapDelta('vertical', 0, 100, 0, 116)
    const newGap = applyGapDelta(4, delta)
    expect(newGap).toBe(20)
  })
})
