/**
 * studio/visual/snap-integration
 *
 * Combines grid snapping with smart-guide alignment for click-to-draw.
 * Tests cover grid snap, disabled snap, and the combined flow.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SnapIntegration, createSnapIntegration } from '../../studio/visual/snap-integration'
import { smartGuidesSettings } from '../../studio/core/settings'

const CONTAINER = {
  x: 0,
  y: 0,
  width: 1000,
  height: 1000,
  top: 0,
  left: 0,
  right: 1000,
  bottom: 1000,
}

beforeEach(() => {
  smartGuidesSettings.set({ enabled: true, threshold: 4 })
})

describe('SnapIntegration — disabled snap', () => {
  it('returns rect as-is when disableSnapping=true at call site', () => {
    const snap = new SnapIntegration({
      gridSize: 10,
      enableSmartGuides: true,
      snapTolerance: 4,
      disableSnapping: false,
    })
    const rect = { x: 33, y: 47, width: 50, height: 50 }
    const result = snap.snap(rect, new Map(), CONTAINER, true)
    expect(result.rect).toEqual(rect)
    expect(result.guides).toHaveLength(0)
  })

  it('returns rect as-is when config.disableSnapping=true', () => {
    const snap = new SnapIntegration({
      gridSize: 10,
      enableSmartGuides: true,
      snapTolerance: 4,
      disableSnapping: true,
    })
    const rect = { x: 33, y: 47, width: 50, height: 50 }
    const result = snap.snap(rect, new Map(), CONTAINER)
    expect(result.rect).toEqual(rect)
  })
})

describe('SnapIntegration — grid snap', () => {
  it('rounds rect coordinates to grid size', () => {
    const snap = new SnapIntegration({
      gridSize: 10,
      enableSmartGuides: false,
      snapTolerance: 4,
      disableSnapping: false,
    })
    const rect = { x: 33, y: 47, width: 51, height: 53 }
    const result = snap.snap(rect, new Map(), CONTAINER)
    expect(result.rect.x).toBe(30)
    expect(result.rect.y).toBe(50)
    expect(result.rect.width).toBe(50)
    expect(result.rect.height).toBe(50)
  })

  it('passes through when gridSize=0', () => {
    const snap = new SnapIntegration({
      gridSize: 0,
      enableSmartGuides: false,
      snapTolerance: 4,
      disableSnapping: false,
    })
    const rect = { x: 33, y: 47, width: 51, height: 53 }
    const result = snap.snap(rect, new Map(), CONTAINER)
    expect(result.rect).toEqual(rect)
  })
})

describe('SnapIntegration — config update', () => {
  it('honors gridSize update via updateConfig', () => {
    const snap = createSnapIntegration({
      gridSize: 10,
      enableSmartGuides: false,
      snapTolerance: 4,
      disableSnapping: false,
    })
    const rect = { x: 13, y: 17, width: 50, height: 50 }

    snap.updateConfig({ gridSize: 20 })
    const result = snap.snap(rect, new Map(), CONTAINER)
    expect(result.rect.x).toBe(20) // round to nearest 20
    expect(result.rect.y).toBe(20)
  })

  it('updates disableSnapping flag', () => {
    const snap = createSnapIntegration({
      gridSize: 10,
      enableSmartGuides: false,
      snapTolerance: 4,
      disableSnapping: false,
    })
    snap.updateConfig({ disableSnapping: true })
    const rect = { x: 33, y: 47, width: 50, height: 50 }
    const result = snap.snap(rect, new Map(), CONTAINER)
    expect(result.rect).toEqual(rect)
  })
})
