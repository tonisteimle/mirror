/**
 * Grid-snap math — pure functions that turn a cursor position over a
 * grid container into a target cell.
 *
 * Coordinate system contract:
 *   - All inputs are in *viewport* (clientX/Y) coordinates.
 *   - `geo.rect` is the grid container's *inner content* rect, also in
 *     viewport coords. (See `readGridGeometry` in grid-detector.)
 *   - Output cell coordinates are 1-indexed (CSS grid convention,
 *     matches Mirror DSL `x N, y M`).
 *
 * Edge handling:
 *   - When the cursor sits inside a gap between cells, it snaps to
 *     whichever cell's center it's closer to. Gaps don't have their own
 *     cell index in CSS grid.
 *   - Cursor outside the grid bounds clamps to the nearest edge cell.
 */

import type { GridGeometry } from '../grid-overlay/grid-detector'

export interface GridCell {
  /** 1-indexed column. Falls in [1, columnCount]. */
  x: number
  /** 1-indexed row. Falls in [1, rowCount]. */
  y: number
}

/**
 * Map a cursor position (viewport coords) onto a grid cell.
 * Always returns a cell — out-of-bounds cursors clamp to the nearest edge.
 */
export function pointerToCell(cursor: { x: number; y: number }, geo: GridGeometry): GridCell {
  const localX = cursor.x - geo.rect.left
  const localY = cursor.y - geo.rect.top
  return {
    x: localToCellIndex(localX, geo.columnSizes, geo.columnGap),
    y: localToCellIndex(localY, geo.rowSizes, geo.rowGap),
  }
}

/**
 * Resolve a 1D position to a 1-indexed cell. The grid is laid out as
 *   cell-1 [size0] gap cell-2 [size1] gap … cell-N [size_{N-1}]
 *
 * Algorithm:
 *   - Walk the tracks; the cell whose [start, end] range contains
 *     `pos` wins.
 *   - For positions inside a gap region, snap to whichever neighboring
 *     cell's *center* is closer.
 *   - Out of bounds: clamp to first or last cell.
 */
function localToCellIndex(pos: number, sizes: number[], gap: number): number {
  if (sizes.length === 0) return 1
  if (pos <= 0) return 1

  let cursor = 0
  for (let i = 0; i < sizes.length; i++) {
    const cellStart = cursor
    const cellEnd = cursor + sizes[i]
    if (pos <= cellEnd) {
      // Inside this cell's track (or inside the leading gap of this cell).
      return i + 1
    }
    cursor = cellEnd
    if (i < sizes.length - 1 && gap > 0) {
      const gapStart = cursor
      const gapEnd = cursor + gap
      if (pos < gapEnd) {
        // Inside the gap between cell i and cell i+1. Snap to whichever
        // cell's center is closer.
        const cellICenter = cellStart + sizes[i] / 2
        const cellNextCenter = gapEnd + sizes[i + 1] / 2
        const distToI = Math.abs(pos - cellICenter)
        const distToNext = Math.abs(pos - cellNextCenter)
        return distToI <= distToNext ? i + 1 : i + 2
      }
      cursor = gapEnd
    }
  }
  // Past the end → last cell.
  return sizes.length
}

/**
 * Read an element's current grid placement from its inline styles or
 * compiled `data-mirror-name`-encoded properties. Used to preserve a
 * dragging element's existing span (`w`, `h`) when it's just being moved.
 *
 * Returns null if the element isn't placed in a grid (no
 * `gridColumnStart` resolved). The caller falls back to a 1×1 default.
 */
export function readCurrentSpan(el: HTMLElement): { w: number; h: number } | null {
  const cs = getComputedStyle(el)
  // `grid-column-end: span N` resolves to `span N` literally; `auto` for
  // unset. We only care about explicit spans.
  const w = parseSpan(cs.gridColumnEnd) ?? 1
  const h = parseSpan(cs.gridRowEnd) ?? 1
  // Sanity: we only return a span if at least column-start is set. That
  // distinguishes "user explicitly placed in a cell" from "auto-flow".
  const colStart = cs.gridColumnStart
  if (!colStart || colStart === 'auto') return null
  return { w, h }
}

function parseSpan(value: string): number | null {
  if (!value) return null
  // CSS resolves `span 4` literally; or it could be a numeric line index
  // when `grid-column-end: 5` — both produce a span when paired with a
  // start. We only handle the `span N` form because it's what Mirror's
  // backend emits for `w 4` on a grid child.
  const m = value.match(/^span\s+(\d+)$/)
  if (m) return parseInt(m[1], 10)
  return null
}

// =============================================================================
// Cell-range / rect math
//
// Pure functions that translate between (1-indexed) cell coordinates and
// the pixel rectangle CSS Grid would render them as. Used by:
//   - DrawManager (live preview during draw)
//   - drag/test-runner (cell-center for synthetic drops)
//   - demo-runner browser-side (cell-center for headed drag tests)
//
// Each call site previously had its own copy. The math is identical;
// keeping it in one place removes drift risk and gives unit tests a
// single target.
// =============================================================================

/** Inclusive cell-range, normalized so x/y point at the top-left and
 *  w/h are at least 1. Both inputs are 1-indexed; mirror DSL `x A, y B`. */
export interface CellRange {
  x: number
  y: number
  w: number
  h: number
}

/**
 * Bounding cell-range between two cells. Always returns w >= 1, h >= 1
 * — clicking-without-dragging in a single cell still produces a 1×1
 * range, which is what the layout-draw flow wants (one gesture = one
 * placed element).
 */
export function cellRange(a: GridCell, b: GridCell): CellRange {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x) + 1,
    h: Math.abs(a.y - b.y) + 1,
  }
}

/**
 * Pixel center (offset, in track-local px) of cell `index` within a
 * single-axis track list. `index` is 0-indexed for symmetry with array
 * walks; callers using 1-indexed cell coords pass `cell.x - 1`.
 *
 * Used to compute "drop the cursor in the middle of cell (X, Y)"
 * positions for synthetic drag tests.
 */
export function cellCenterOffset(sizes: number[], gap: number, index: number): number {
  let off = 0
  for (let i = 0; i < index; i++) off += (sizes[i] ?? 0) + gap
  return off + (sizes[index] ?? 0) / 2
}

/**
 * Pixel rectangle (relative to the grid's *inner content* origin —
 * i.e. `geo.rect`) covering the given cell-range. Internal gaps count
 * toward the span; trailing gap (after the last spanned cell) does
 * not, matching how CSS Grid actually paints a `grid-column-end: span N`
 * child.
 */
export function cellRangeToRect(
  geo: GridGeometry,
  start: GridCell,
  current: GridCell
): { x: number; y: number; width: number; height: number } {
  const range = cellRange(start, current)
  const x0 = range.x - 1
  const y0 = range.y - 1

  let x = 0
  for (let i = 0; i < x0; i++) x += (geo.columnSizes[i] ?? 0) + geo.columnGap
  let y = 0
  for (let i = 0; i < y0; i++) y += (geo.rowSizes[i] ?? 0) + geo.rowGap

  let width = 0
  for (let i = 0; i < range.w; i++) {
    width += geo.columnSizes[x0 + i] ?? 0
    if (i < range.w - 1) width += geo.columnGap
  }
  let height = 0
  for (let i = 0; i < range.h; i++) {
    height += geo.rowSizes[y0 + i] ?? 0
    if (i < range.h - 1) height += geo.rowGap
  }

  return { x, y, width, height }
}
