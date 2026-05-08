/**
 * Unit tests for the grid-overlay detector helpers.
 *
 * jsdom's CSS engine is incomplete — it does NOT resolve `grid-template-
 * columns: repeat(12, 1fr)` to absolute pixel values the way a real
 * browser does. So we feed `gridTemplateColumns` directly as a px-list
 * (`100px 100px 100px`) which is what the detector parses anyway. The
 * end-to-end "real Studio in Chrome" verification is covered by
 * `tools/probe-grid-overlay-live.ts` (Phase 1.5).
 */

import { describe, test, expect, beforeEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  isGridContainer,
  getDirectGridChildren,
  findOwningGridContainer,
  findGridContainersIn,
  readGridGeometry,
} from '../../studio/visual/grid-overlay/grid-detector'

let dom: JSDOM
let doc: Document

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { pretendToBeVisual: true })
  doc = dom.window.document
  // jsdom doesn't expose `getComputedStyle` returning DOM-style camelCase
  // perfectly, but it does honor inline styles for `display`, `gap`,
  // `gridTemplateColumns` etc. Verified manually below.
  ;(globalThis as any).getComputedStyle = dom.window.getComputedStyle
  ;(globalThis as any).HTMLElement = dom.window.HTMLElement
  ;(globalThis as any).Element = dom.window.Element
  ;(globalThis as any).DOMRect = dom.window.DOMRect
})

function div(style: Record<string, string>, parent?: Element): HTMLElement {
  const el = doc.createElement('div')
  Object.assign(el.style, style)
  ;(parent || doc.body).appendChild(el)
  return el
}

describe('isGridContainer', () => {
  test('returns true for display: grid', () => {
    const el = div({ display: 'grid' })
    expect(isGridContainer(el)).toBe(true)
  })

  test('returns true for display: inline-grid', () => {
    const el = div({ display: 'inline-grid' })
    expect(isGridContainer(el)).toBe(true)
  })

  test('returns false for display: flex', () => {
    expect(isGridContainer(div({ display: 'flex' }))).toBe(false)
  })

  test('returns false for default block', () => {
    expect(isGridContainer(div({}))).toBe(false)
  })
})

describe('getDirectGridChildren', () => {
  test('returns direct HTMLElement children of a grid container', () => {
    const grid = div({ display: 'grid' })
    const a = div({}, grid)
    const b = div({}, grid)
    expect(getDirectGridChildren(grid)).toEqual([a, b])
  })

  test('skips style/script tags', () => {
    const grid = div({ display: 'grid' })
    const style = doc.createElement('style')
    grid.appendChild(style)
    const a = div({}, grid)
    expect(getDirectGridChildren(grid)).toEqual([a])
  })

  test('skips Studio overlay siblings (data-mirror-overlay)', () => {
    const grid = div({ display: 'grid' })
    const a = div({}, grid)
    const overlay = div({}, grid)
    overlay.dataset.mirrorOverlay = 'grid'
    expect(getDirectGridChildren(grid)).toEqual([a])
  })

  test('returns [] for non-grid container', () => {
    const flex = div({ display: 'flex' })
    div({}, flex)
    expect(getDirectGridChildren(flex)).toEqual([])
  })

  test('does NOT recurse — grandchildren are not direct children', () => {
    const grid = div({ display: 'grid' })
    const middle = div({}, grid)
    div({}, middle)
    expect(getDirectGridChildren(grid)).toEqual([middle])
  })
})

describe('findOwningGridContainer', () => {
  test('walks up to find nearest grid container', () => {
    const grid = div({ display: 'grid' })
    const child = div({}, grid)
    const grandchild = div({}, child)
    expect(findOwningGridContainer(grandchild)).toBe(grid)
  })

  test('returns the element itself if it is a grid', () => {
    const grid = div({ display: 'grid' })
    expect(findOwningGridContainer(grid)).toBe(grid)
  })

  test('innermost grid wins (nested grids)', () => {
    const outer = div({ display: 'grid' })
    const inner = div({ display: 'grid' }, outer)
    const target = div({}, inner)
    expect(findOwningGridContainer(target)).toBe(inner)
  })

  test('returns null when no grid ancestor', () => {
    const a = div({})
    const b = div({}, a)
    expect(findOwningGridContainer(b)).toBeNull()
  })

  test('returns null for null input', () => {
    expect(findOwningGridContainer(null)).toBeNull()
  })
})

describe('findGridContainersIn', () => {
  test('finds nested grids in document order', () => {
    const root = div({})
    const grid1 = div({ display: 'grid' }, root)
    const inside = div({}, grid1)
    const grid2 = div({ display: 'grid' }, inside)
    expect(findGridContainersIn(root)).toEqual([grid1, grid2])
  })

  test('returns empty list when there are no grids', () => {
    const root = div({})
    div({}, root)
    div({ display: 'flex' }, root)
    expect(findGridContainersIn(root)).toEqual([])
  })

  test('includes root itself if it is a grid', () => {
    const root = div({ display: 'grid' })
    div({}, root)
    expect(findGridContainersIn(root)).toEqual([root])
  })
})

describe('readGridGeometry — boundary line math', () => {
  // jsdom won't compute `1fr` for us, so we simulate the *post-resolution*
  // state by setting `gridTemplateColumns` directly to px values. This
  // tests our parser, which is the part we wrote — the browser handles
  // the fr→px resolution and we trust it.

  test('emits cell-edges for a fixed-column grid without gap', () => {
    const el = div({
      display: 'grid',
      gridTemplateColumns: '100px 100px 100px',
      gridTemplateRows: '50px',
    })
    const geo = readGridGeometry(el)
    expect(geo).not.toBeNull()
    expect(geo!.columnSizes).toEqual([100, 100, 100])
    expect(geo!.columnLines).toEqual([0, 100, 200, 300])
    expect(geo!.rowSizes).toEqual([50])
    expect(geo!.rowLines).toEqual([0, 50])
    expect(geo!.columnGap).toBe(0)
  })

  test('emits both edges of every gap', () => {
    const el = div({
      display: 'grid',
      gridTemplateColumns: '100px 100px 100px',
      gridTemplateRows: '50px',
      columnGap: '8px',
    })
    const geo = readGridGeometry(el)!
    // 3 columns, 2 internal gaps → 6 boundary lines
    expect(geo.columnLines).toEqual([0, 100, 108, 208, 216, 316])
    expect(geo.columnGap).toBe(8)
  })

  test('column gap and row gap are independent', () => {
    const el = div({
      display: 'grid',
      gridTemplateColumns: '50px 50px',
      gridTemplateRows: '40px 40px',
      columnGap: '10px',
      rowGap: '4px',
    })
    const geo = readGridGeometry(el)!
    expect(geo.columnLines).toEqual([0, 50, 60, 110])
    expect(geo.rowLines).toEqual([0, 40, 44, 84])
  })

  test('returns null for non-grid element', () => {
    expect(readGridGeometry(div({}))).toBeNull()
    expect(readGridGeometry(div({ display: 'flex' }))).toBeNull()
  })

  test('handles empty grid (no rendered tracks)', () => {
    // jsdom returns 'none' for unset gridTemplateColumns. Our parser
    // treats that as zero tracks rather than failing.
    const el = div({ display: 'grid' })
    const geo = readGridGeometry(el)
    // Either null or empty geometry is acceptable; we want no crash.
    if (geo) {
      expect(geo.columnLines).toEqual([])
      expect(geo.rowLines).toEqual([])
    }
  })
})
