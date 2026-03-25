/**
 * EmptyFlexStrategy Tests
 */

import { describe, it, expect } from 'vitest'
import { detectZone, getZoneRect, zoneToDSLProperties } from '../../strategies/empty-flex'
import type { Rect, AlignmentZone } from '../../types'

describe('detectZone', () => {
  const rect: Rect = { x: 0, y: 0, width: 300, height: 300 }

  it.each<[{ x: number; y: number }, AlignmentZone]>([
    [{ x: 30, y: 30 }, { row: 'top', col: 'left' }],
    [{ x: 150, y: 30 }, { row: 'top', col: 'center' }],
    [{ x: 270, y: 30 }, { row: 'top', col: 'right' }],
    [{ x: 30, y: 150 }, { row: 'middle', col: 'left' }],
    [{ x: 150, y: 150 }, { row: 'middle', col: 'center' }],
    [{ x: 270, y: 150 }, { row: 'middle', col: 'right' }],
    [{ x: 30, y: 270 }, { row: 'bottom', col: 'left' }],
    [{ x: 150, y: 270 }, { row: 'bottom', col: 'center' }],
    [{ x: 270, y: 270 }, { row: 'bottom', col: 'right' }],
  ])('cursor %j returns zone %j', (cursor, expectedZone) => {
    expect(detectZone(cursor, rect)).toEqual(expectedZone)
  })

  it('handles edge case at 33% boundary (left side)', () => {
    // 98/300 = 0.326... < 0.33 -> left
    const cursor = { x: 98, y: 150 }
    const zone = detectZone(cursor, rect)
    expect(zone.col).toBe('left')
  })

  it('handles edge case at 33% boundary (center side)', () => {
    // 100/300 = 0.333... >= 0.33 -> center
    const cursor = { x: 100, y: 150 }
    const zone = detectZone(cursor, rect)
    expect(zone.col).toBe('center')
  })

  it('handles edge case at 66% boundary', () => {
    // 198/300 = 0.66 -> center (not > 0.66)
    const cursor = { x: 198, y: 150 }
    const zone = detectZone(cursor, rect)
    expect(zone.col).toBe('center')
  })

  it('works with offset container', () => {
    const offsetRect: Rect = { x: 100, y: 50, width: 300, height: 300 }
    const cursor = { x: 130, y: 80 } // top-left of offset container
    const zone = detectZone(cursor, offsetRect)
    expect(zone).toEqual({ row: 'top', col: 'left' })
  })
})

describe('getZoneRect', () => {
  const containerRect: Rect = { x: 0, y: 0, width: 300, height: 300 }

  it('returns correct rect for top-left zone', () => {
    const zone: AlignmentZone = { row: 'top', col: 'left' }
    const zoneRect = getZoneRect(containerRect, zone)

    expect(zoneRect).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    })
  })

  it('returns correct rect for center zone', () => {
    const zone: AlignmentZone = { row: 'middle', col: 'center' }
    const zoneRect = getZoneRect(containerRect, zone)

    expect(zoneRect).toEqual({
      x: 100,
      y: 100,
      width: 100,
      height: 100,
    })
  })

  it('returns correct rect for bottom-right zone', () => {
    const zone: AlignmentZone = { row: 'bottom', col: 'right' }
    const zoneRect = getZoneRect(containerRect, zone)

    expect(zoneRect).toEqual({
      x: 200,
      y: 200,
      width: 100,
      height: 100,
    })
  })
})

describe('zoneToDSLProperties', () => {
  it.each<[AlignmentZone, string | null]>([
    [{ row: 'top', col: 'left' }, 'top left'],
    [{ row: 'top', col: 'center' }, 'top'],
    [{ row: 'top', col: 'right' }, 'top right'],
    [{ row: 'middle', col: 'left' }, 'left'],
    [{ row: 'middle', col: 'center' }, null],
    [{ row: 'middle', col: 'right' }, 'right'],
    [{ row: 'bottom', col: 'left' }, 'bottom left'],
    [{ row: 'bottom', col: 'center' }, 'bottom'],
    [{ row: 'bottom', col: 'right' }, 'bottom right'],
  ])('zone %j returns %s', (zone, expected) => {
    expect(zoneToDSLProperties(zone)).toBe(expected)
  })
})
