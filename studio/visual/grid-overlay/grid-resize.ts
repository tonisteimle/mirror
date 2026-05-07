/**
 * Grid resize math — turn a cursor position over a grid into a new
 * `(x, y, w, h)` placement, given the element's current placement and
 * which corner is being dragged.
 *
 * Anchor model: the corner *opposite* the resize handle stays fixed.
 * The handle's own corner snaps to whichever cell the cursor is over.
 * That mirrors how 8-way pixel-resize feels, just expressed in cells.
 *
 *   handle 'e' — east edge moves; west edge (gridX) anchored
 *   handle 'w' — west edge moves; east edge (gridX + gridW - 1) anchored
 *   handle 's' — south edge moves; north edge (gridY) anchored
 *   handle 'n' — north edge moves; south edge (gridY + gridH - 1) anchored
 *   corners ('ne','se','sw','nw') combine the two perpendicular edges.
 *
 * All cell coordinates are 1-indexed (matches Mirror DSL: `x 1, y 1, w 2`).
 */

import type { GridGeometry } from './grid-detector'
import type { ResizeHandle } from '../resize-manager'
import { pointerToCell } from './grid-snap'

export interface GridPlacement {
  gridX: number
  gridY: number
  gridW: number
  gridH: number
}

/**
 * Read an element's *current* grid placement from computed styles.
 * Returns null when the element isn't explicitly placed (e.g. auto-flow
 * from a single `bg #..` child) — Phase-3 resize is opt-in: only fires
 * for elements that already have a concrete `x/y/w/h` placement.
 */
export function readGridPlacement(el: HTMLElement): GridPlacement | null {
  const cs = getComputedStyle(el)
  const x = parseLine(cs.gridColumnStart)
  const y = parseLine(cs.gridRowStart)
  if (x === null || y === null) return null
  const w = parseSpan(cs.gridColumnEnd) ?? 1
  const h = parseSpan(cs.gridRowEnd) ?? 1
  return { gridX: x, gridY: y, gridW: w, gridH: h }
}

function parseLine(raw: string): number | null {
  if (!raw || raw === 'auto') return null
  const m = raw.match(/^(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

function parseSpan(raw: string): number | null {
  if (!raw) return null
  const m = raw.match(/^span\s+(\d+)$/)
  return m ? parseInt(m[1], 10) : null
}

/**
 * Compute the new grid placement for a cursor at `cursor`, given the
 * element's start placement and which handle the user is dragging.
 *
 * Both edges of the affected axis collapse onto each other (gridW or
 * gridH = 1) when the cursor crosses the anchor — no negative spans, no
 * inversions. Output cells are clamped to [1, columnCount/rowCount].
 */
export function resizeToCells(
  handle: ResizeHandle,
  cursor: { x: number; y: number },
  geo: GridGeometry,
  start: GridPlacement
): GridPlacement {
  const cell = pointerToCell(cursor, geo)
  const colCount = geo.columnSizes.length
  const rowCount = geo.rowSizes.length

  let { gridX, gridY, gridW, gridH } = start

  if (handle.includes('e')) {
    const newRight = clamp(Math.max(gridX, cell.x), 1, colCount)
    gridW = newRight - gridX + 1
  }
  if (handle.includes('w')) {
    const right = gridX + gridW - 1
    const newLeft = clamp(Math.min(cell.x, right), 1, colCount)
    gridX = newLeft
    gridW = right - newLeft + 1
  }
  if (handle.includes('s')) {
    const newBottom = clamp(Math.max(gridY, cell.y), 1, rowCount)
    gridH = newBottom - gridY + 1
  }
  if (handle.includes('n')) {
    const bottom = gridY + gridH - 1
    const newTop = clamp(Math.min(cell.y, bottom), 1, rowCount)
    gridY = newTop
    gridH = bottom - newTop + 1
  }

  return { gridX, gridY, gridW, gridH }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}
