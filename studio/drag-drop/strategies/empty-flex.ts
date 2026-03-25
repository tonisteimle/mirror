/**
 * EmptyFlexStrategy
 *
 * Handles drop on empty flex containers.
 * Uses 9-zone alignment detection.
 */

import type { Point, DropTarget, DragSource, DropResult, VisualHint, Rect, AlignmentZone } from '../types'
import type { DropStrategy } from './types'

export class EmptyFlexStrategy implements DropStrategy {
  readonly name = 'EmptyFlexStrategy'

  matches(target: DropTarget): boolean {
    return target.layoutType === 'flex' && !target.hasChildren
  }

  calculate(
    cursor: Point,
    target: DropTarget,
    _source: DragSource
  ): DropResult {
    const rect = target.element.getBoundingClientRect()
    const zone = detectZone(cursor, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    })

    return {
      target,
      placement: 'inside',
      targetId: target.nodeId,
      zone,
    }
  }

  getVisualHint(result: DropResult): VisualHint {
    const rect = result.target.element.getBoundingClientRect()

    return {
      type: 'zone',
      zone: result.zone,
      rect: result.zone
        ? getZoneRect(
            { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
            result.zone
          )
        : { x: rect.left, y: rect.top, width: rect.width, height: rect.height },
    }
  }
}

/**
 * Detect which of 9 zones the cursor is in
 *
 * Zones are divided into 3x3 grid:
 * - Columns: left (0-33%), center (33-66%), right (66-100%)
 * - Rows: top (0-33%), middle (33-66%), bottom (66-100%)
 */
export function detectZone(cursor: Point, rect: Rect): AlignmentZone {
  const relX = (cursor.x - rect.x) / rect.width
  const relY = (cursor.y - rect.y) / rect.height

  const col: 'left' | 'center' | 'right' =
    relX < 0.33 ? 'left' : relX > 0.66 ? 'right' : 'center'

  const row: 'top' | 'middle' | 'bottom' =
    relY < 0.33 ? 'top' : relY > 0.66 ? 'bottom' : 'middle'

  return { row, col }
}

/**
 * Get the rect for a specific zone (for visual highlighting)
 */
export function getZoneRect(containerRect: Rect, zone: AlignmentZone): Rect {
  const thirdWidth = containerRect.width / 3
  const thirdHeight = containerRect.height / 3

  const colIndex = zone.col === 'left' ? 0 : zone.col === 'center' ? 1 : 2
  const rowIndex = zone.row === 'top' ? 0 : zone.row === 'middle' ? 1 : 2

  return {
    x: containerRect.x + colIndex * thirdWidth,
    y: containerRect.y + rowIndex * thirdHeight,
    width: thirdWidth,
    height: thirdHeight,
  }
}

/**
 * Map zone to DSL alignment properties
 */
export function zoneToDSLProperties(zone: AlignmentZone): string | null {
  const { row, col } = zone

  // Center zone = no properties needed
  if (row === 'middle' && col === 'center') {
    return null
  }

  const parts: string[] = []

  // Vertical alignment
  if (row === 'top') parts.push('top')
  else if (row === 'bottom') parts.push('bottom')

  // Horizontal alignment
  if (col === 'left') parts.push('left')
  else if (col === 'right') parts.push('right')

  return parts.length > 0 ? parts.join(' ') : null
}
