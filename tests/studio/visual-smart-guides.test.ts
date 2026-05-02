/**
 * studio/visual/smart-guides/guide-calculator
 *
 * Edge-snap calculator for drag operations. Pinned with deterministic
 * fixtures; smart-guides settings get reset before each test so the
 * module-global doesn't leak state across cases.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { GuideCalculator } from '../../studio/visual/smart-guides/guide-calculator'
import { smartGuidesSettings } from '../../studio/core/settings'

interface RectLike {
  x: number
  y: number
  width: number
  height: number
  top: number
  left: number
  right: number
  bottom: number
}

function rect(x: number, y: number, w: number, h: number): RectLike {
  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
  }
}

const CONTAINER: RectLike = rect(0, 0, 1000, 1000)

beforeEach(() => {
  // Reset to defaults so each case starts from a known baseline
  smartGuidesSettings.set({ enabled: true, threshold: 4 })
})

describe('GuideCalculator — disabled mode', () => {
  it('returns container-relative position with no guides when disabled', () => {
    smartGuidesSettings.set({ enabled: false })
    const calc = new GuideCalculator()

    const moving = rect(100, 200, 50, 50)
    const result = calc.calculate(moving, new Map(), CONTAINER)

    expect(result.snappedX).toBe(false)
    expect(result.snappedY).toBe(false)
    expect(result.guides).toHaveLength(0)
    expect(result.x).toBe(100)
    expect(result.y).toBe(200)
  })
})

describe('GuideCalculator — left-edge alignment with sibling', () => {
  it('snaps moving left to sibling left within threshold', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(100, 50, 50, 50) // sibling left = 100
    const moving = rect(102, 200, 50, 50) // 2px off — within threshold

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedX).toBe(true)
    expect(result.x).toBe(100)
    expect(result.guides.length).toBeGreaterThan(0)
  })

  it('does not snap when distance exceeds threshold', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(100, 50, 50, 50)
    const moving = rect(110, 200, 50, 50) // 10px off — beyond threshold

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedX).toBe(false)
    expect(result.x).toBe(110)
  })
})

describe('GuideCalculator — right-edge alignment', () => {
  it('snaps moving right to sibling right within threshold', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(100, 50, 50, 50) // sibling right = 150
    // Moving right would be at 150 ± threshold
    const moving = rect(98, 200, 50, 50) // moving right = 148, target sibling.right = 150

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedX).toBe(true)
    // snapX = sibling.right - moving.width = 150 - 50 = 100
    expect(result.x).toBe(100)
  })
})

describe('GuideCalculator — center-X alignment', () => {
  it('snaps to sibling center', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(100, 50, 100, 50) // sibling centerX = 150
    // Moving centerX should snap to 150 → moving left = 150 - 25 = 125
    const moving = rect(124, 200, 50, 50) // movingCenterX = 149, target = 150

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedX).toBe(true)
    expect(result.x).toBe(125)
  })
})

describe('GuideCalculator — vertical alignment', () => {
  it('snaps moving top to sibling top within threshold', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(50, 100, 50, 50) // sibling top = 100
    const moving = rect(200, 102, 50, 50)

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedY).toBe(true)
    expect(result.y).toBe(100)
  })

  it('snaps moving bottom to sibling bottom', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(50, 100, 50, 50) // sibling bottom = 150
    const moving = rect(200, 98, 50, 50) // moving bottom = 148

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedY).toBe(true)
    expect(result.y).toBe(100) // bottom 150 - height 50 = 100
  })
})

describe('GuideCalculator — container edges', () => {
  it('snaps to container left edge', () => {
    const calc = new GuideCalculator(4)
    const moving = rect(2, 200, 50, 50) // 2px from container left

    const result = calc.calculate(moving, new Map(), CONTAINER)
    expect(result.snappedX).toBe(true)
    expect(result.x).toBe(0)
  })

  it('snaps to container right edge', () => {
    const calc = new GuideCalculator(4)
    // Container right = 1000; moving right at 1002 = 2px past
    const moving = rect(950, 200, 50, 50) // moving right = 1000 exactly
    const result = calc.calculate(moving, new Map(), CONTAINER)
    expect(result.snappedX).toBe(true)
  })
})

describe('GuideCalculator — both axes simultaneously', () => {
  it('snaps independently on X and Y', () => {
    const calc = new GuideCalculator(4)
    const sibling = rect(100, 100, 50, 50)
    const moving = rect(102, 103, 50, 50) // both within threshold

    const result = calc.calculate(moving, new Map([['sib', sibling]]), CONTAINER)
    expect(result.snappedX).toBe(true)
    expect(result.snappedY).toBe(true)
    expect(result.x).toBe(100)
    expect(result.y).toBe(100)
  })
})
