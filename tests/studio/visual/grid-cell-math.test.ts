/**
 * @vitest-environment jsdom
 *
 * Pure-function tests for the grid-cell math used by:
 *   - DrawManager (live preview during draw)
 *   - drag/test-runner (cell-center for synthetic drops)
 *   - demo-runner (cell-center for headed drag tests)
 *
 * Lives at the snap-math layer; no DOM, no Studio. The browser-coupled
 * `pointerToCell` is exercised separately in browser tests where real
 * computed-style grid geometry is available.
 */

import { describe, test, expect } from 'vitest'
import {
  cellRange,
  cellRangeToRect,
  cellCenterOffset,
} from '../../../studio/visual/snap/grid-cell-snap'
import type { GridGeometry } from '../../../studio/visual/grid-overlay/grid-detector'

// =============================================================================
// cellRange — normalize two cells into a top-left-anchored, w/h>=1 range
// =============================================================================

describe('cellRange', () => {
  test('forward direction: top-left to bottom-right', () => {
    expect(cellRange({ x: 1, y: 1 }, { x: 4, y: 8 })).toEqual({
      x: 1,
      y: 1,
      w: 4,
      h: 8,
    })
  })

  test('reverse direction: bottom-right to top-left → same range', () => {
    expect(cellRange({ x: 4, y: 8 }, { x: 1, y: 1 })).toEqual({
      x: 1,
      y: 1,
      w: 4,
      h: 8,
    })
  })

  test('mixed direction: SW to NE', () => {
    expect(cellRange({ x: 1, y: 8 }, { x: 4, y: 1 })).toEqual({
      x: 1,
      y: 1,
      w: 4,
      h: 8,
    })
  })

  test('single cell (start == end) → 1×1 range', () => {
    // Click-without-drag still produces an element; the gesture stays
    // monomorphic (one press/release = one element).
    expect(cellRange({ x: 3, y: 5 }, { x: 3, y: 5 })).toEqual({
      x: 3,
      y: 5,
      w: 1,
      h: 1,
    })
  })

  test('1-D range along a row', () => {
    expect(cellRange({ x: 2, y: 3 }, { x: 4, y: 3 })).toEqual({
      x: 2,
      y: 3,
      w: 3,
      h: 1,
    })
  })
})

// =============================================================================
// cellCenterOffset — 1D pixel offset to a cell's center
// =============================================================================

describe('cellCenterOffset', () => {
  test('first cell with no gap', () => {
    // [100, 100, 100], gap 0, cell 0 (0-indexed) → center at 50
    expect(cellCenterOffset([100, 100, 100], 0, 0)).toBe(50)
  })

  test('middle cell with no gap', () => {
    // index 1 → starts at 100, center 150
    expect(cellCenterOffset([100, 100, 100], 0, 1)).toBe(150)
  })

  test('first cell with gap is unaffected by gap', () => {
    // The leading edge of the first cell sits at 0 regardless of gap.
    expect(cellCenterOffset([100, 100, 100], 8, 0)).toBe(50)
  })

  test('subsequent cells with gap include preceding gaps', () => {
    // cell 1 starts at 100 + 8 = 108, center 158
    expect(cellCenterOffset([100, 100, 100], 8, 1)).toBe(158)
    // cell 2 starts at 100 + 8 + 100 + 8 = 216, center 266
    expect(cellCenterOffset([100, 100, 100], 8, 2)).toBe(266)
  })

  test('uneven track sizes', () => {
    // [200, 100, 50], gap 0, cell 2 starts at 300, center 325
    expect(cellCenterOffset([200, 100, 50], 0, 2)).toBe(325)
  })

  test('out-of-bounds index returns sane value (no NaN)', () => {
    // Past the end: undefined sizes treated as 0 → returns the running offset
    expect(Number.isFinite(cellCenterOffset([100, 100], 0, 5))).toBe(true)
  })
})

// =============================================================================
// cellRangeToRect — pixel rectangle (relative to inner content origin)
// =============================================================================

/** Build a GridGeometry stub. `rect` isn't read by cellRangeToRect, so a
 *  dummy DOMRect-ish object is fine. */
function geo(opts: {
  cols: number[]
  rows: number[]
  colGap?: number
  rowGap?: number
}): GridGeometry {
  const { cols, rows, colGap = 0, rowGap = 0 } = opts
  return {
    rect: new DOMRect(0, 0, 0, 0),
    columnLines: [],
    rowLines: [],
    columnSizes: cols,
    rowSizes: rows,
    columnGap: colGap,
    rowGap: rowGap,
  }
}

describe('cellRangeToRect', () => {
  test('1x1 cell at origin (no gap)', () => {
    const g = geo({ cols: [100, 100, 100], rows: [80, 80] })
    expect(cellRangeToRect(g, { x: 1, y: 1 }, { x: 1, y: 1 })).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    })
  })

  test('full-width header (cells 1..N)', () => {
    const g = geo({ cols: [100, 100, 100, 100], rows: [80, 80] })
    expect(cellRangeToRect(g, { x: 1, y: 1 }, { x: 4, y: 1 })).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 80,
    })
  })

  test('reverse cells produce the same rect', () => {
    // cellRange normalizes — direction must not matter to the output.
    const g = geo({ cols: [100, 100, 100, 100], rows: [80, 80, 80] })
    const a = cellRangeToRect(g, { x: 4, y: 3 }, { x: 1, y: 1 })
    const b = cellRangeToRect(g, { x: 1, y: 1 }, { x: 4, y: 3 })
    expect(a).toEqual(b)
  })

  test('with gaps: span includes internal gaps but not trailing gap', () => {
    // 4 cols × 100px, gap 8: span (1..3) covers cells 1,2,3 with gaps 1-2
    // and 2-3 between them. Width = 100 + 8 + 100 + 8 + 100 = 316.
    // No gap is added after cell 3 (trailing gap doesn't belong to the span).
    const g = geo({
      cols: [100, 100, 100, 100],
      rows: [80, 80],
      colGap: 8,
    })
    expect(cellRangeToRect(g, { x: 1, y: 1 }, { x: 3, y: 1 })).toEqual({
      x: 0,
      y: 0,
      width: 316,
      height: 80,
    })
  })

  test('with gaps: cell starting at column 2 is offset by gap', () => {
    // Sidebar style: column 1 alone, rows 2..3.
    // x = 0 (col 1 starts at origin), y = 80 + 8 = 88 (row 1 + row gap).
    const g = geo({
      cols: [100, 100, 100, 100],
      rows: [80, 80, 80],
      rowGap: 8,
    })
    expect(cellRangeToRect(g, { x: 1, y: 2 }, { x: 1, y: 3 })).toEqual({
      x: 0,
      y: 88,
      width: 100,
      height: 168, // 80 + 8 + 80
    })
  })

  test('full-grid span (1,1) to (last,last)', () => {
    const g = geo({
      cols: [100, 100, 100, 100],
      rows: [80, 80, 80, 80, 80, 80, 80, 80],
      colGap: 8,
      rowGap: 8,
    })
    const r = cellRangeToRect(g, { x: 1, y: 1 }, { x: 4, y: 8 })
    // 4 cols + 3 internal gaps = 100*4 + 8*3 = 424
    expect(r.width).toBe(424)
    // 8 rows + 7 internal gaps = 80*8 + 8*7 = 696
    expect(r.height).toBe(696)
    expect(r.x).toBe(0)
    expect(r.y).toBe(0)
  })

  test('uneven track sizes', () => {
    // Sidebar 200, two content cols 300 each. Row 1 at 80, row 2 at 60.
    // Range cell (2, 2) only: x = 200 (col1), y = 80 (row1).
    const g = geo({ cols: [200, 300, 300], rows: [80, 60] })
    expect(cellRangeToRect(g, { x: 2, y: 2 }, { x: 2, y: 2 })).toEqual({
      x: 200,
      y: 80,
      width: 300,
      height: 60,
    })
  })

  test('range past declared tracks returns sensible (non-NaN) numbers', () => {
    // If the caller passes a cell beyond the explicit grid, we treat the
    // missing track as 0 instead of crashing. The drawing code should
    // never see this in practice (pointerToCell clamps), but defensive
    // math avoids hard-to-debug NaN propagation.
    const g = geo({ cols: [100, 100], rows: [80] })
    const r = cellRangeToRect(g, { x: 1, y: 1 }, { x: 5, y: 5 })
    expect(Number.isFinite(r.x)).toBe(true)
    expect(Number.isFinite(r.y)).toBe(true)
    expect(Number.isFinite(r.width)).toBe(true)
    expect(Number.isFinite(r.height)).toBe(true)
  })
})
