/**
 * Grid-cell-insert tests — Phase 4 end-to-end verification.
 *
 * Exercises the click-to-insert affordance on the GridOverlay:
 *   - empty cells of an *active* (selected) grid get a transparent SVG
 *     hit-rect with `pointer-events: auto`
 *   - clicking that hit-rect emits `grid:insert-at-cell`
 *   - init-grid-overlay subscribes and runs an InsertComponentCommand
 *     that adds `Frame x N, y M, bg #2271C1` to the grid
 *
 * Why this lives in the browser suite:
 *   GridOverlay reads computed grid geometry from the live DOM. jsdom
 *   doesn't resolve `1fr → Npx` so we can't compute cell-rects there.
 *   The Studio bootstrap also wires the event-bus + executor; the test
 *   needs all of that in one piece.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Fixtures
// =============================================================================

/**
 * 4×2 grid with a single placed child at (1,1). Every other cell is
 * empty and therefore clickable. Anchor at (4,2) forces the second row
 * to materialize in `gridTemplateRows` (CSS-grid keeps unused rows
 * implicit, which our cell-snap math can't see).
 */
const GRID_FIXTURE = `Frame name MainGrid, grid 4, gap 8, w 400, h 200, pad 16, row-height 48
  Frame name CellA, x 1, y 1, w 1, h 1, bg #ef4444
  Frame name Anchor, x 4, y 2, w 1, h 1, bg transparent`

// =============================================================================
// Helpers
// =============================================================================

function findIdByName(name: string): string | null {
  const el = document.querySelector(`[data-mirror-name="${name}"]`)
  return (el as HTMLElement | null)?.dataset.mirrorId ?? null
}

/**
 * Find the SVG hit-rect for a specific cell of a grid. The overlay
 * marks them with `data-mirror-overlay="grid-cell-hit"` and positions
 * each one at the cell-rect inside the overlay SVG. We query by
 * geometry — pick the rect whose center is closest to the cell's
 * grid-local center.
 */
function findCellHitRect(gridId: string, gridX: number, gridY: number): SVGRectElement | null {
  const grid = document.querySelector<HTMLElement>(`[data-mirror-id="${gridId}"]`)
  if (!grid) return null
  // The overlay SVGs are siblings of the grid inside #preview, NOT
  // descendants. Search the whole document for the grid-cell-hit rects.
  const hits = Array.from(
    document.querySelectorAll<SVGRectElement>('rect[data-mirror-overlay="grid-cell-hit"]')
  )
  if (hits.length === 0) return null

  // Cell center in grid-local coords. Tracks resolve to ~92px each
  // (400 - 32 padding = 368, /4 = 92, with 8px gaps the math works
  // out — but we don't need the exact number, just relative position).
  const gridRect = grid.getBoundingClientRect()
  const cs = getComputedStyle(grid)
  const padLeft = parseFloat(cs.paddingLeft) || 0
  const padTop = parseFloat(cs.paddingTop) || 0
  const innerW = gridRect.width - padLeft - parseFloat(cs.paddingRight || '0')
  const innerH = gridRect.height - padTop - parseFloat(cs.paddingBottom || '0')
  // Roughly: cell centers fall at `padLeft + (gridX - 0.5) * cellW`
  // (ignoring gaps for the heuristic — the snap-to-nearest below
  // tolerates that).
  const cellW = innerW / 4
  const cellH = innerH / 2
  const targetCx = gridRect.left + padLeft + (gridX - 0.5) * cellW
  const targetCy = gridRect.top + padTop + (gridY - 0.5) * cellH

  let best: SVGRectElement | null = null
  let bestDist = Infinity
  for (const hit of hits) {
    const r = hit.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    const dist = Math.hypot(cx - targetCx, cy - targetCy)
    if (dist < bestDist) {
      bestDist = dist
      best = hit
    }
  }
  return best
}

function clickRect(el: SVGRectElement): void {
  const r = el.getBoundingClientRect()
  const cx = r.left + r.width / 2
  const cy = r.top + r.height / 2
  el.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: cx,
      clientY: cy,
    })
  )
}

// =============================================================================
// Tests
// =============================================================================

export const gridCellInsertTests: TestCase[] = describe('Grid Cell Insert (Phase 4)', [
  // ---------------------------------------------------------------------------
  // 1. Click on empty cell inserts a default Frame at that cell
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Click empty cell (2,1) inserts Frame x 2, y 1',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select MainGrid so the overlay renders cell hit-zones for it.
      const gridId = findIdByName('MainGrid')!
      await api.interact.click(gridId)
      await api.utils.waitForIdle()

      const hit = findCellHitRect(gridId, 2, 1)
      api.assert.ok(hit, 'Cell (2,1) hit-rect must exist')

      const before = api.editor.getCode()
      clickRect(hit!)
      await api.utils.waitForIdle()

      const after = api.editor.getCode()
      api.assert.ok(after !== before, 'Source must change after cell click')
      api.assert.ok(/x 2/.test(after) && /y 1/.test(after), `Expected x 2, y 1, got: ${after}`)
    }
  ),

  // ---------------------------------------------------------------------------
  // 2. Occupied cell is NOT clickable (no hit-rect for CellA's cell)
  // ---------------------------------------------------------------------------
  testWithSetup('Occupied cell (1,1) has no hit-rect', GRID_FIXTURE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const gridId = findIdByName('MainGrid')!
    await api.interact.click(gridId)
    await api.utils.waitForIdle()

    // CellA occupies (1,1); the closest hit-rect to that cell's
    // *center* should still NOT be at (1,1) — it should be at one of
    // the empty neighbors.
    const hit = findCellHitRect(gridId, 1, 1)
    // The hit list is non-empty (other cells are clickable); we just
    // assert that the rect closest to CellA's location isn't actually
    // *over* CellA — if it were, it would punch through and make the
    // occupied cell clickable.
    const cellAEl = document.querySelector<HTMLElement>(
      `[data-mirror-id="${findIdByName('CellA')}"]`
    )!
    const cellARect = cellAEl.getBoundingClientRect()
    const hitRect = hit?.getBoundingClientRect()
    // If a hit-rect exists, it must NOT cover CellA's center.
    if (hitRect) {
      const cellACx = cellARect.left + cellARect.width / 2
      const cellACy = cellARect.top + cellARect.height / 2
      const overlap =
        cellACx >= hitRect.left &&
        cellACx <= hitRect.right &&
        cellACy >= hitRect.top &&
        cellACy <= hitRect.bottom
      api.assert.ok(!overlap, 'No hit-rect must overlap an occupied cell center')
    }
  }),

  // ---------------------------------------------------------------------------
  // 3. Click adds the inserted Frame at end of MainGrid's children
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Insert appends a new Frame as a child of MainGrid',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const gridId = findIdByName('MainGrid')!
      await api.interact.click(gridId)
      await api.utils.waitForIdle()

      const hit = findCellHitRect(gridId, 3, 1)
      api.assert.ok(hit, 'Cell (3,1) hit-rect must exist')
      clickRect(hit!)
      await api.utils.waitForIdle()

      // Source should now have a 3rd child (the inserted Frame),
      // alongside CellA and Anchor.
      const code = api.editor.getCode()
      const frameLines = code.split('\n').filter(l => /^\s+Frame\b/.test(l))
      api.assert.ok(
        frameLines.length >= 3,
        `Expected ≥3 child Frame lines after insert, got ${frameLines.length}: ${code}`
      )
    }
  ),
])

export default gridCellInsertTests
