/**
 * Integration: GridOverlay rendering against a synthetic preview tree.
 *
 * jsdom can't resolve CSS-grid `1fr`/`auto` to pixels, so the test sets
 * `gridTemplateColumns` directly to px lists. The Phase-1 detector logic
 * is what we test here — the boundary-line math, the auto-mode selection
 * resolution, and the dispose/refresh cycle. Real-browser end-to-end
 * (with `1fr` resolution) lives in `tools/probe-grid-overlay-live.ts`.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import { GridOverlay } from '../../studio/visual/grid-overlay/grid-overlay'

let dom: JSDOM
let doc: Document
let preview: HTMLElement

function setupGlobals() {
  ;(globalThis as any).window = dom.window
  ;(globalThis as any).document = dom.window.document
  ;(globalThis as any).getComputedStyle = dom.window.getComputedStyle
  ;(globalThis as any).HTMLElement = dom.window.HTMLElement
  ;(globalThis as any).Element = dom.window.Element
  ;(globalThis as any).SVGElement = dom.window.SVGElement
  ;(globalThis as any).DOMRect = dom.window.DOMRect
  ;(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0)
}

beforeEach(() => {
  dom = new JSDOM('<!DOCTYPE html><html><body><div id="preview"></div></body></html>', {
    pretendToBeVisual: true,
    // Setting an http URL grants the document a real origin so
    // localStorage is available — needed when GridOverlay's transitive
    // imports touch user-settings during init. Without this, jsdom
    // creates an opaque-origin document that throws SecurityError on
    // any localStorage access.
    url: 'http://localhost/',
  })
  doc = dom.window.document
  preview = doc.getElementById('preview') as HTMLElement
  setupGlobals()
})

afterEach(() => {
  dom.window.close()
})

function gridContainer(opts: {
  cols?: string
  rows?: string
  gap?: string
  nodeId?: string
}): HTMLElement {
  const el = doc.createElement('div')
  Object.assign(el.style, {
    display: 'grid',
    gridTemplateColumns: opts.cols ?? '100px 100px 100px',
    gridTemplateRows: opts.rows ?? '40px 40px',
    columnGap: opts.gap ?? '8px',
    rowGap: opts.gap ?? '8px',
  })
  if (opts.nodeId) el.dataset.mirrorId = opts.nodeId
  preview.appendChild(el)
  return el
}

function gridChild(parent: HTMLElement, nodeId: string): HTMLElement {
  const el = doc.createElement('div')
  el.dataset.mirrorId = nodeId
  parent.appendChild(el)
  return el
}

function svgsInPreview(): SVGSVGElement[] {
  return Array.from(preview.querySelectorAll<SVGSVGElement>('svg[data-mirror-overlay="grid"]'))
}

describe('GridOverlay — auto mode visualization', () => {
  test('shows nothing when nothing is selected', () => {
    gridContainer({ nodeId: 'node-1' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setMode('auto')
    expect(svgsInPreview()).toHaveLength(0)
    overlay.dispose()
  })

  test('shows overlay when grid container itself is selected', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    expect(svgsInPreview()).toHaveLength(1)
    overlay.dispose()
  })

  test('shows overlay when a direct grid child is selected', () => {
    const grid = gridContainer({ nodeId: 'node-grid' })
    gridChild(grid, 'node-child')
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-child')
    expect(svgsInPreview()).toHaveLength(1)
    overlay.dispose()
  })

  test('hides overlay when selection moves away from any grid', () => {
    gridContainer({ nodeId: 'node-grid' })
    const sibling = doc.createElement('div')
    sibling.dataset.mirrorId = 'node-other'
    preview.appendChild(sibling)
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    expect(svgsInPreview()).toHaveLength(1)
    overlay.setSelection('node-other')
    expect(svgsInPreview()).toHaveLength(0)
    overlay.dispose()
  })

  test('nested grid: shows inner grid when inner child is selected', () => {
    const outer = gridContainer({ nodeId: 'node-outer' })
    outer.style.gridTemplateColumns = '200px 200px'
    const middle = doc.createElement('div')
    Object.assign(middle.style, {
      display: 'grid',
      gridTemplateColumns: '50px 50px',
      gridTemplateRows: '20px',
    })
    middle.dataset.mirrorId = 'node-middle'
    outer.appendChild(middle)
    const innerChild = gridChild(middle, 'node-inner')

    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-inner')
    // Should show the *innermost* owning grid only (the middle one).
    const svgs = svgsInPreview()
    expect(svgs).toHaveLength(1)
    overlay.dispose()
  })
})

describe('GridOverlay — always mode', () => {
  test('shows every grid container, regardless of selection', () => {
    gridContainer({ nodeId: 'node-grid-1' })
    const sibling = doc.createElement('div')
    preview.appendChild(sibling)
    gridContainer({ nodeId: 'node-grid-2' })

    const overlay = new GridOverlay({ container: preview })
    overlay.setMode('always')
    expect(svgsInPreview()).toHaveLength(2)
    overlay.dispose()
  })
})

describe('GridOverlay — off mode', () => {
  test('shows nothing even with selection on a grid', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    expect(svgsInPreview()).toHaveLength(1) // before
    overlay.setMode('off')
    expect(svgsInPreview()).toHaveLength(0)
    overlay.dispose()
  })
})

describe('GridOverlay — SVG line counts', () => {
  test('emits one line per column boundary + one per row boundary', () => {
    // 3 columns + 2 internal gaps = 6 boundary lines (vertical)
    // 2 rows + 1 internal gap = 4 boundary lines (horizontal)
    gridContainer({
      nodeId: 'node-grid',
      cols: '100px 100px 100px',
      rows: '40px 40px',
      gap: '8px',
    })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    const svg = svgsInPreview()[0]
    const lines = Array.from(svg.querySelectorAll('line'))
    // 6 vertical (column boundaries) + 4 horizontal (row boundaries) = 10
    expect(lines.length).toBe(10)
    overlay.dispose()
  })

  test('lines have dashed stroke + opacity for studio-aid look', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    const line = svgsInPreview()[0].querySelector('line')!
    expect(line.getAttribute('stroke-dasharray')).toBe('3 3')
    expect(parseFloat(line.getAttribute('opacity')!)).toBeLessThan(1)
  })
})

describe('GridOverlay — dispose', () => {
  test('removes all SVGs and detaches listeners', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    expect(svgsInPreview()).toHaveLength(1)
    overlay.dispose()
    expect(svgsInPreview()).toHaveLength(0)
  })

  test('calling refresh after dispose does not throw', () => {
    const overlay = new GridOverlay({ container: preview })
    overlay.dispose()
    expect(() => overlay.refresh()).not.toThrow()
  })
})

describe('GridOverlay — refresh after recompile', () => {
  test('drops stale overlay when its target was removed from DOM', () => {
    const grid = gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    expect(svgsInPreview()).toHaveLength(1)

    // Simulate recompile: tear down preview content
    grid.remove()
    overlay.refresh()
    expect(svgsInPreview()).toHaveLength(0)
    overlay.dispose()
  })
})

describe('GridOverlay — active-cell ghost (Phase 2B)', () => {
  function activeCellRect(svg: SVGSVGElement): SVGRectElement | null {
    // Phase 4 added empty-cell hit-zone rects (data-mirror-overlay
    // = "grid-cell-hit") to the same SVG. Filter those out so we keep
    // testing only the active-cell ghost rect.
    const rects = svg.querySelectorAll<SVGRectElement>('rect')
    for (const r of Array.from(rects)) {
      if (r.dataset.mirrorOverlay !== 'grid-cell-hit') return r
    }
    return null
  }

  test('shows ghost rect when setActiveCell is called for a known grid', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setActiveCell({ containerId: 'node-grid', gridX: 1, gridY: 1, gridW: 1, gridH: 1 })
    const svg = svgsInPreview()[0]
    expect(svg).toBeDefined()
    expect(activeCellRect(svg)).not.toBeNull()
    overlay.dispose()
  })

  test('forces auto-mode to show the targeted grid even without selection', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setMode('auto')
    // No selection — without active-cell, would be hidden.
    expect(svgsInPreview()).toHaveLength(0)
    overlay.setActiveCell({ containerId: 'node-grid', gridX: 1, gridY: 1, gridW: 1, gridH: 1 })
    expect(svgsInPreview()).toHaveLength(1)
    overlay.dispose()
  })

  test('null active-cell removes the ghost rect', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setSelection('node-grid')
    overlay.setActiveCell({ containerId: 'node-grid', gridX: 2, gridY: 1, gridW: 1, gridH: 1 })
    expect(activeCellRect(svgsInPreview()[0])).not.toBeNull()
    overlay.setActiveCell(null)
    expect(activeCellRect(svgsInPreview()[0])).toBeNull()
    overlay.dispose()
  })

  test('ghost rect uses fill (active highlight) not just stroke', () => {
    gridContainer({ nodeId: 'node-grid' })
    const overlay = new GridOverlay({ container: preview })
    overlay.setActiveCell({ containerId: 'node-grid', gridX: 1, gridY: 1, gridW: 2, gridH: 1 })
    const rect = activeCellRect(svgsInPreview()[0])!
    expect(rect.getAttribute('fill-opacity')).toBe('0.18')
    expect(rect.getAttribute('stroke-opacity')).toBe('0.9')
  })

  test('ghost rect references the targeted span (gridW/gridH)', () => {
    gridContainer({
      nodeId: 'node-grid',
      cols: '100px 100px 100px',
      rows: '50px 50px',
      gap: '8px',
    })
    const overlay = new GridOverlay({ container: preview })
    overlay.setActiveCell({ containerId: 'node-grid', gridX: 2, gridY: 1, gridW: 2, gridH: 1 })
    const rect = activeCellRect(svgsInPreview()[0])!
    // x: trackStart for col 2 = 100 + 8 = 108
    // width: cols 2+3 = 100 + 8 + 100 = 208
    expect(parseFloat(rect.getAttribute('x')!)).toBe(108)
    expect(parseFloat(rect.getAttribute('width')!)).toBe(208)
    overlay.dispose()
  })

  test('ghost is dropped when cell coords exceed explicit tracks', () => {
    gridContainer({
      nodeId: 'node-grid',
      cols: '100px 100px',
      rows: '50px',
    })
    const overlay = new GridOverlay({ container: preview })
    overlay.setActiveCell({ containerId: 'node-grid', gridX: 5, gridY: 1, gridW: 1, gridH: 1 })
    expect(activeCellRect(svgsInPreview()[0])).toBeNull()
    overlay.dispose()
  })
})
