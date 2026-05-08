/**
 * Cell-snap math: cursor position → 1-indexed grid cell.
 *
 * The geometry under test is a 4-column × 2-row grid with `gap = 8`:
 *
 *   columnSizes: [80, 80, 80, 80]      (total 320 + 24 gap = 344)
 *   rowSizes:    [40, 40]              (total 80 + 8 gap = 88)
 *   rect: starts at (100, 200) in viewport coords
 *
 * Boundary positions (column, viewport x):
 *   cell 1: [100, 180]  gap [180, 188]
 *   cell 2: [188, 268]  gap [268, 276]
 *   cell 3: [276, 356]  gap [356, 364]
 *   cell 4: [364, 444]
 *
 * Boundary positions (row, viewport y):
 *   cell 1: [200, 240]  gap [240, 248]
 *   cell 2: [248, 288]
 */

import { describe, test, expect, beforeAll } from 'vitest'
import { JSDOM } from 'jsdom'
import { pointerToCell } from '../../studio/visual/snap/grid-cell-snap'
import type { GridGeometry } from '../../studio/visual/grid-overlay/grid-detector'

beforeAll(() => {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  ;(globalThis as any).DOMRect = dom.window.DOMRect
})

function makeGeo(): GridGeometry {
  return {
    rect: new DOMRect(100, 200, 344, 88),
    columnLines: [0, 80, 88, 168, 176, 256, 264, 344],
    rowLines: [0, 40, 48, 88],
    columnSizes: [80, 80, 80, 80],
    rowSizes: [40, 40],
    columnGap: 8,
    rowGap: 8,
  }
}

describe('pointerToCell — inside-cell positions', () => {
  test('cursor in cell 1,1 returns x=1 y=1', () => {
    expect(pointerToCell({ x: 110, y: 210 }, makeGeo())).toEqual({ x: 1, y: 1 })
  })

  test('cursor in cell 4,2 returns x=4 y=2', () => {
    expect(pointerToCell({ x: 400, y: 270 }, makeGeo())).toEqual({ x: 4, y: 2 })
  })

  test('cursor at exact cell-end boundary belongs to current cell', () => {
    // x=180 is the right edge of cell 1's track (just before the gap).
    expect(pointerToCell({ x: 180, y: 220 }, makeGeo())).toEqual({ x: 1, y: 1 })
  })

  test('cursor just past the gap snaps to next cell', () => {
    // x=189 is inside cell 2's track (gap ends at 188).
    expect(pointerToCell({ x: 189, y: 220 }, makeGeo())).toEqual({ x: 2, y: 1 })
  })
})

describe('pointerToCell — gap regions snap to nearest center', () => {
  // Gap between col 1 and 2 is [180, 188] in viewport. Cell 1 center is
  // at x=140 (100+40), cell 2 center at x=228 (100+128). Anywhere in the
  // gap, distance-to-cell-1-center > distance-to-cell-2-center, so gap
  // snaps to the nearer one.

  test('cursor at gap midpoint between cols snaps to closer cell', () => {
    // Gap mid: x=184. Cell 1 center: 140 (dist 44). Cell 2 center: 228 (dist 44).
    // Tie → prefers earlier cell (`<= `).
    expect(pointerToCell({ x: 184, y: 220 }, makeGeo())).toEqual({ x: 1, y: 1 })
  })

  test('cursor closer to col-2 side of gap snaps to col 2', () => {
    // x=187 is 1 px before gap end. Cell 1 center: 140 (dist 47). Cell 2 center: 228 (dist 41).
    expect(pointerToCell({ x: 187, y: 220 }, makeGeo())).toEqual({ x: 2, y: 1 })
  })

  test('cursor closer to col-1 side of gap snaps to col 1', () => {
    // x=181 is 1 px past cell-1 edge. Cell 1 center: 140 (dist 41). Cell 2 center: 228 (dist 47).
    expect(pointerToCell({ x: 181, y: 220 }, makeGeo())).toEqual({ x: 1, y: 1 })
  })

  test('row gap snaps the same way', () => {
    // Row gap is [240, 248]. Row 1 center: y=220 (dist 24). Row 2 center: y=268 (dist 24).
    // Mid-gap (244): tie → row 1.
    expect(pointerToCell({ x: 220, y: 244 }, makeGeo())).toEqual({ x: 2, y: 1 })
  })
})

describe('pointerToCell — out-of-bounds clamping', () => {
  test('cursor far above clamps to row 1', () => {
    expect(pointerToCell({ x: 220, y: 0 }, makeGeo())).toEqual({ x: 2, y: 1 })
  })

  test('cursor far below clamps to last row', () => {
    expect(pointerToCell({ x: 220, y: 5000 }, makeGeo())).toEqual({ x: 2, y: 2 })
  })

  test('cursor far left clamps to col 1', () => {
    expect(pointerToCell({ x: -100, y: 220 }, makeGeo())).toEqual({ x: 1, y: 1 })
  })

  test('cursor far right clamps to last col', () => {
    expect(pointerToCell({ x: 5000, y: 220 }, makeGeo())).toEqual({ x: 4, y: 1 })
  })
})

describe('pointerToCell — single-cell grid (degenerate)', () => {
  test('1×1 grid always returns (1, 1)', () => {
    const geo: GridGeometry = {
      rect: new DOMRect(0, 0, 100, 100),
      columnLines: [0, 100],
      rowLines: [0, 100],
      columnSizes: [100],
      rowSizes: [100],
      columnGap: 0,
      rowGap: 0,
    }
    expect(pointerToCell({ x: 50, y: 50 }, geo)).toEqual({ x: 1, y: 1 })
    expect(pointerToCell({ x: 200, y: 200 }, geo)).toEqual({ x: 1, y: 1 })
  })
})

describe('pointerToCell — no-gap grid', () => {
  test('cursor at exact column boundary snaps to current cell (rounds down)', () => {
    const geo: GridGeometry = {
      rect: new DOMRect(0, 0, 300, 100),
      columnLines: [0, 100, 200, 300],
      rowLines: [0, 100],
      columnSizes: [100, 100, 100],
      rowSizes: [100],
      columnGap: 0,
      rowGap: 0,
    }
    // x=100 is the boundary between cell 1 and cell 2. With no gap, our
    // algorithm picks the current cell (`<= cellEnd`) so cell 1 wins.
    expect(pointerToCell({ x: 100, y: 50 }, geo)).toEqual({ x: 1, y: 1 })
    expect(pointerToCell({ x: 101, y: 50 }, geo)).toEqual({ x: 2, y: 1 })
  })
})
