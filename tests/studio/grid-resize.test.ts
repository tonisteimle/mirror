/**
 * Pure-math tests for grid-resize. The DOM-coupled paths
 * (handleGridResizeMove → element.style writes, resize:end emit) are
 * covered by the browser suite — here we lock in the cell-snap math so
 * a regression in the corner-anchoring rules surfaces in milliseconds.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { resizeToCells, type GridPlacement } from '../../studio/visual/grid-overlay/grid-resize'
import type { GridGeometry } from '../../studio/visual/grid-overlay/grid-detector'

// 4-column × 3-row grid, 100px cells, no gap. Lets us pick a cursor
// (cellX × 100, cellY × 100) and predict the snapped cell deterministically.
const GEO: GridGeometry = {
  rect: {
    left: 0,
    top: 0,
    right: 400,
    bottom: 300,
    width: 400,
    height: 300,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect,
  columnLines: [0, 100, 200, 300, 400],
  rowLines: [0, 100, 200, 300],
  columnSizes: [100, 100, 100, 100],
  rowSizes: [100, 100, 100],
  columnGap: 0,
  rowGap: 0,
}

const START: GridPlacement = { gridX: 2, gridY: 2, gridW: 1, gridH: 1 }

// Helper: a cursor at `(cellX, cellY)` 1-indexed lands on the *center*
// of that cell, well clear of the boundary snap-tiebreak code.
const cursorAt = (cellX: number, cellY: number) => ({
  x: (cellX - 1) * 100 + 50,
  y: (cellY - 1) * 100 + 50,
})

describe('resizeToCells — east handle', () => {
  it('drag east extends gridW; gridX stays anchored', () => {
    const out = resizeToCells('e', cursorAt(4, 2), GEO, START)
    expect(out).toEqual({ gridX: 2, gridY: 2, gridW: 3, gridH: 1 })
  })

  it('drag east into anchor cell collapses to gridW=1', () => {
    const out = resizeToCells('e', cursorAt(2, 2), GEO, START)
    expect(out).toEqual({ gridX: 2, gridY: 2, gridW: 1, gridH: 1 })
  })

  it('drag east past anchor (west) clamps to gridW=1, gridX unchanged', () => {
    const out = resizeToCells('e', cursorAt(1, 2), GEO, START)
    expect(out.gridX).toBe(2)
    expect(out.gridW).toBe(1)
  })
})

describe('resizeToCells — west handle', () => {
  it('drag west moves gridX left; right edge anchored', () => {
    const start: GridPlacement = { gridX: 3, gridY: 2, gridW: 2, gridH: 1 } // right = 4
    const out = resizeToCells('w', cursorAt(1, 2), GEO, start)
    expect(out).toEqual({ gridX: 1, gridY: 2, gridW: 4, gridH: 1 })
  })

  it('drag west into right-edge collapses to gridW=1', () => {
    const start: GridPlacement = { gridX: 1, gridY: 2, gridW: 3, gridH: 1 } // right = 3
    const out = resizeToCells('w', cursorAt(3, 2), GEO, start)
    expect(out).toEqual({ gridX: 3, gridY: 2, gridW: 1, gridH: 1 })
  })
})

describe('resizeToCells — south handle', () => {
  it('drag south extends gridH; gridY stays anchored', () => {
    const out = resizeToCells('s', cursorAt(2, 3), GEO, START)
    expect(out).toEqual({ gridX: 2, gridY: 2, gridW: 1, gridH: 2 })
  })

  it('drag south into anchor row collapses to gridH=1', () => {
    const out = resizeToCells('s', cursorAt(2, 2), GEO, START)
    expect(out.gridH).toBe(1)
  })
})

describe('resizeToCells — north handle', () => {
  it('drag north moves gridY up; bottom edge anchored', () => {
    const start: GridPlacement = { gridX: 2, gridY: 3, gridW: 1, gridH: 1 } // bottom = 3
    const out = resizeToCells('n', cursorAt(2, 1), GEO, start)
    expect(out).toEqual({ gridX: 2, gridY: 1, gridW: 1, gridH: 3 })
  })
})

describe('resizeToCells — corner handles', () => {
  it('SE corner extends both gridW and gridH', () => {
    const out = resizeToCells('se', cursorAt(4, 3), GEO, START)
    expect(out).toEqual({ gridX: 2, gridY: 2, gridW: 3, gridH: 2 })
  })

  it('NW corner moves both gridX and gridY left/up', () => {
    const start: GridPlacement = { gridX: 3, gridY: 3, gridW: 1, gridH: 1 }
    const out = resizeToCells('nw', cursorAt(1, 1), GEO, start)
    expect(out).toEqual({ gridX: 1, gridY: 1, gridW: 3, gridH: 3 })
  })

  it('NE corner extends gridW, moves gridY up', () => {
    const start: GridPlacement = { gridX: 2, gridY: 3, gridW: 1, gridH: 1 }
    const out = resizeToCells('ne', cursorAt(4, 1), GEO, start)
    expect(out).toEqual({ gridX: 2, gridY: 1, gridW: 3, gridH: 3 })
  })

  it('SW corner moves gridX left, extends gridH', () => {
    const start: GridPlacement = { gridX: 3, gridY: 2, gridW: 1, gridH: 1 }
    const out = resizeToCells('sw', cursorAt(1, 3), GEO, start)
    expect(out).toEqual({ gridX: 1, gridY: 2, gridW: 3, gridH: 2 })
  })
})

describe('resizeToCells — clamping', () => {
  it('east drag past column count clamps to last column', () => {
    const out = resizeToCells('e', { x: 10000, y: 150 }, GEO, START)
    // Grid has 4 columns; gridX=2, so max gridW = 3
    expect(out.gridW).toBe(3)
  })

  it('south drag past row count clamps to last row', () => {
    const out = resizeToCells('s', { x: 150, y: 10000 }, GEO, START)
    // Grid has 3 rows; gridY=2, so max gridH = 2
    expect(out.gridH).toBe(2)
  })

  it('west drag past left edge clamps gridX to 1', () => {
    const start: GridPlacement = { gridX: 3, gridY: 2, gridW: 1, gridH: 1 }
    const out = resizeToCells('w', { x: -10000, y: 150 }, GEO, start)
    expect(out.gridX).toBe(1)
    expect(out.gridW).toBe(3) // 1..3 inclusive
  })
})
