/**
 * AlignmentZone Model Tests
 *
 * Tests 9-zone detection for empty flex containers.
 */

import { describe, it, expect } from 'vitest'
import {
  detectZone,
  getZoneId,
  getZoneCenter,
  getVerticalContainerAlign,
  getHorizontalContainerAlign,
  getAlignProperty,
  detectAlignmentZone,
  calculateIndicatorRect,
  type HorizontalZone,
  type VerticalZone,
} from '../alignment-zone'
import type { Rect } from '../coordinate'

// ==========================================================================
// Test Container
// ==========================================================================

const container: Rect = { x: 0, y: 0, width: 300, height: 300 }
// Zones are each 100x100:
// top-left:     (0-100, 0-100)
// top-center:   (100-200, 0-100)
// top-right:    (200-300, 0-100)
// center-left:  (0-100, 100-200)
// center-center:(100-200, 100-200)
// center-right: (200-300, 100-200)
// bottom-left:  (0-100, 200-300)
// bottom-center:(100-200, 200-300)
// bottom-right: (200-300, 200-300)

// ==========================================================================
// detectZone
// ==========================================================================

describe('detectZone()', () => {
  describe('horizontal detection', () => {
    it('detects left zone', () => {
      const result = detectZone({ x: 50, y: 150 }, container)
      expect(result.horizontal).toBe('left')
    })

    it('detects center zone', () => {
      const result = detectZone({ x: 150, y: 150 }, container)
      expect(result.horizontal).toBe('center')
    })

    it('detects right zone', () => {
      const result = detectZone({ x: 250, y: 150 }, container)
      expect(result.horizontal).toBe('right')
    })

    it('handles edge cases at boundaries', () => {
      expect(detectZone({ x: 0, y: 150 }, container).horizontal).toBe('left')
      expect(detectZone({ x: 99, y: 150 }, container).horizontal).toBe('left')
      expect(detectZone({ x: 100, y: 150 }, container).horizontal).toBe('center')
      expect(detectZone({ x: 199, y: 150 }, container).horizontal).toBe('center')
      expect(detectZone({ x: 200, y: 150 }, container).horizontal).toBe('right')
    })
  })

  describe('vertical detection', () => {
    it('detects top zone', () => {
      const result = detectZone({ x: 150, y: 50 }, container)
      expect(result.vertical).toBe('top')
    })

    it('detects center zone', () => {
      const result = detectZone({ x: 150, y: 150 }, container)
      expect(result.vertical).toBe('center')
    })

    it('detects bottom zone', () => {
      const result = detectZone({ x: 150, y: 250 }, container)
      expect(result.vertical).toBe('bottom')
    })
  })

  describe('combined detection', () => {
    it('detects top-left', () => {
      const result = detectZone({ x: 50, y: 50 }, container)
      expect(result).toEqual({ horizontal: 'left', vertical: 'top' })
    })

    it('detects center-center', () => {
      const result = detectZone({ x: 150, y: 150 }, container)
      expect(result).toEqual({ horizontal: 'center', vertical: 'center' })
    })

    it('detects bottom-right', () => {
      const result = detectZone({ x: 250, y: 250 }, container)
      expect(result).toEqual({ horizontal: 'right', vertical: 'bottom' })
    })
  })

  describe('offset container', () => {
    it('handles container not at origin', () => {
      const offsetContainer: Rect = { x: 100, y: 100, width: 300, height: 300 }
      // Center of this container is at (250, 250)
      const result = detectZone({ x: 250, y: 250 }, offsetContainer)
      expect(result).toEqual({ horizontal: 'center', vertical: 'center' })
    })
  })
})

// ==========================================================================
// getZoneId
// ==========================================================================

describe('getZoneId()', () => {
  it('combines horizontal and vertical into ID', () => {
    expect(getZoneId('left', 'top')).toBe('top-left')
    expect(getZoneId('center', 'center')).toBe('center-center')
    expect(getZoneId('right', 'bottom')).toBe('bottom-right')
  })
})

// ==========================================================================
// getZoneCenter
// ==========================================================================

describe('getZoneCenter()', () => {
  it('calculates center of top-left zone', () => {
    const center = getZoneCenter({ horizontal: 'left', vertical: 'top' }, container)
    expect(center.x).toBe(50) // 100/2
    expect(center.y).toBe(50)
  })

  it('calculates center of center-center zone', () => {
    const center = getZoneCenter({ horizontal: 'center', vertical: 'center' }, container)
    expect(center.x).toBe(150)
    expect(center.y).toBe(150)
  })

  it('calculates center of bottom-right zone', () => {
    const center = getZoneCenter({ horizontal: 'right', vertical: 'bottom' }, container)
    expect(center.x).toBe(250) // 100*2.5
    expect(center.y).toBe(250)
  })
})

// ==========================================================================
// Align Property Mapping
// ==========================================================================

describe('getVerticalContainerAlign()', () => {
  it('returns center for center-center', () => {
    expect(getVerticalContainerAlign('center', 'center')).toBe('center')
  })

  it('returns align top for top-center', () => {
    expect(getVerticalContainerAlign('center', 'top')).toBe('align top')
  })

  it('returns align bottom for bottom-center', () => {
    expect(getVerticalContainerAlign('center', 'bottom')).toBe('align bottom')
  })

  it('returns align left for center-left', () => {
    expect(getVerticalContainerAlign('left', 'center')).toBe('align left')
  })

  it('returns align right for center-right', () => {
    expect(getVerticalContainerAlign('right', 'center')).toBe('align right')
  })

  it('returns align top left for top-left', () => {
    expect(getVerticalContainerAlign('left', 'top')).toBe('align top left')
  })

  it('returns align bottom right for bottom-right', () => {
    expect(getVerticalContainerAlign('right', 'bottom')).toBe('align bottom right')
  })
})

describe('getHorizontalContainerAlign()', () => {
  it('returns center for center-center', () => {
    expect(getHorizontalContainerAlign('center', 'center')).toBe('center')
  })

  it('returns align top for top-center', () => {
    expect(getHorizontalContainerAlign('center', 'top')).toBe('align top')
  })

  it('returns align left for center-left', () => {
    expect(getHorizontalContainerAlign('left', 'center')).toBe('align left')
  })

  it('returns align top right for top-right', () => {
    expect(getHorizontalContainerAlign('right', 'top')).toBe('align top right')
  })
})

describe('getAlignProperty()', () => {
  it('delegates to vertical container function', () => {
    expect(getAlignProperty('left', 'top', 'vertical')).toBe('align top left')
  })

  it('delegates to horizontal container function', () => {
    expect(getAlignProperty('left', 'top', 'horizontal')).toBe('align top left')
  })
})

// ==========================================================================
// detectAlignmentZone (Main API)
// ==========================================================================

describe('detectAlignmentZone()', () => {
  it('returns complete result for top-left in vertical container', () => {
    const result = detectAlignmentZone({ x: 50, y: 50 }, container, 'vertical')

    expect(result.zone).toBe('top-left')
    expect(result.horizontal).toBe('left')
    expect(result.vertical).toBe('top')
    expect(result.alignProperty).toBe('align top left')
    expect(result.indicatorPosition).toEqual({ x: 50, y: 50 })
  })

  it('returns complete result for center in horizontal container', () => {
    const result = detectAlignmentZone({ x: 150, y: 150 }, container, 'horizontal')

    expect(result.zone).toBe('center-center')
    expect(result.alignProperty).toBe('center')
    expect(result.indicatorPosition).toEqual({ x: 150, y: 150 })
  })

  it('returns complete result for bottom-right', () => {
    const result = detectAlignmentZone({ x: 250, y: 250 }, container, 'vertical')

    expect(result.zone).toBe('bottom-right')
    expect(result.alignProperty).toBe('align bottom right')
  })
})

// ==========================================================================
// calculateIndicatorRect
// ==========================================================================

describe('calculateIndicatorRect()', () => {
  it('centers indicator on zone center', () => {
    const elementSize = { width: 80, height: 40 }
    const rect = calculateIndicatorRect(
      { horizontal: 'center', vertical: 'center' },
      container,
      elementSize
    )

    expect(rect).toEqual({
      x: 150 - 40, // center.x - width/2
      y: 150 - 20, // center.y - height/2
      width: 80,
      height: 40,
    })
  })

  it('positions indicator in top-left zone', () => {
    const elementSize = { width: 60, height: 30 }
    const rect = calculateIndicatorRect(
      { horizontal: 'left', vertical: 'top' },
      container,
      elementSize
    )

    expect(rect).toEqual({
      x: 50 - 30,
      y: 50 - 15,
      width: 60,
      height: 30,
    })
  })
})

// ==========================================================================
// Edge Cases
// ==========================================================================

describe('edge cases', () => {
  it('handles very small container', () => {
    const small: Rect = { x: 0, y: 0, width: 30, height: 30 }
    const result = detectAlignmentZone({ x: 15, y: 15 }, small, 'vertical')

    expect(result.zone).toBe('center-center')
  })

  it('handles non-square container', () => {
    const wide: Rect = { x: 0, y: 0, width: 600, height: 100 }
    // Left third: 0-200, center: 200-400, right: 400-600
    const result = detectZone({ x: 500, y: 50 }, wide)

    expect(result.horizontal).toBe('right')
    expect(result.vertical).toBe('center')
  })
})
