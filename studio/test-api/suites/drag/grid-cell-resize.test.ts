/**
 * Grid-cell resize tests — Phase 3 end-to-end verification.
 *
 * Exercises the cell-aware resize branch added to ResizeManager:
 *   - element placed in a `display: grid` parent triggers the
 *     activeGridResize state machine instead of the px-snap path
 *   - dragging an 'e' / 's' / 'se' handle past a cell boundary snaps
 *     to the next cell-span and writes `w N` / `h N` to the source
 *   - dragging a 'w' / 'n' handle moves gridX/gridY without losing
 *     the anchored opposite edge
 *
 * Lives in the browser suite (not Vitest) for the same reason as
 * grid-cell-drop: getComputedStyle on a CSS grid only resolves
 * `1fr → Npx` inside a real browser, and the Studio resize pipeline
 * needs the editor + sourceMap wired up.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Fixtures
// =============================================================================

/**
 * 4×3 grid with a single placed child. Column tracks resolve to 100px each
 * (400 / 4) so cell boundaries are at viewport-relative x = 100, 200, 300.
 * Anchor at (4,3) forces the third row to materialize in
 * `gridTemplateRows`. Without it, an unused row stays implicit and our
 * cell-snap math can't see it.
 */
const GRID_FIXTURE = `Frame name MainGrid, grid 4, gap 0, w 400, h 300, pad 0, row-height 100
  Frame name Cell, x 1, y 1, w 1, h 1, bg #ef4444
  Frame name Anchor, x 4, y 3, w 1, h 1, bg transparent`

// =============================================================================
// Helpers
// =============================================================================

function findIdByName(name: string): string | null {
  const el = document.querySelector(`[data-mirror-name="${name}"]`)
  return (el as HTMLElement | null)?.dataset.mirrorId ?? null
}

// =============================================================================
// Tests
// =============================================================================

export const gridCellResizeTests: TestCase[] = describe('Grid Cell Resize (Phase 3)', [
  // ---------------------------------------------------------------------------
  // 1. East handle: drag past cell-1 boundary → w 2
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Cell (1,1,w1) east-drag into column 2 → w 2',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const cellId = findIdByName('Cell')!
      // East handle sits at the column-1/2 boundary (grid-local x=100).
      // Drag +50 lands the cursor at x=150 — middle of column 2.
      await api.interact.dragResizeHandle(cellId, 'e', 50, 0)

      const cellLine = api.editor
        .getCode()
        .split('\n')
        .find(l => l.includes('Cell, x 1'))
      api.assert.ok(cellLine, 'Cell line must still exist')
      api.assert.ok(/\bw 2\b/.test(cellLine!), `Expected "w 2", got: ${cellLine}`)
      api.assert.ok(/\bx 1\b/.test(cellLine!), `Anchor: x must stay at 1, got: ${cellLine}`)
      api.assert.ok(/\by 1\b/.test(cellLine!), `Anchor: y must stay at 1, got: ${cellLine}`)
    }
  ),

  // ---------------------------------------------------------------------------
  // 2. South handle: drag past row-1 boundary → h 2
  // ---------------------------------------------------------------------------
  testWithSetup('Cell (1,1,h1) south-drag into row 2 → h 2', GRID_FIXTURE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const cellId = findIdByName('Cell')!
    await api.interact.dragResizeHandle(cellId, 's', 0, 50)

    const cellLine = api.editor
      .getCode()
      .split('\n')
      .find(l => l.includes('Cell, x 1'))
    api.assert.ok(cellLine, 'Cell line must still exist')
    api.assert.ok(/\bh 2\b/.test(cellLine!), `Expected "h 2", got: ${cellLine}`)
    api.assert.ok(/\by 1\b/.test(cellLine!), `Anchor: y must stay at 1, got: ${cellLine}`)
  }),

  // ---------------------------------------------------------------------------
  // 3. SE corner: extends both axes
  // ---------------------------------------------------------------------------
  testWithSetup('Cell SE-drag extends both w and h to 2', GRID_FIXTURE, async (api: TestAPI) => {
    await api.utils.waitForCompile()

    const cellId = findIdByName('Cell')!
    // SE handle sits at the cell-1 SE corner (grid-local 100,100).
    // +50/+50 → cursor at (150, 150) — middle of cell (2,2).
    await api.interact.dragResizeHandle(cellId, 'se', 50, 50)

    const cellLine = api.editor
      .getCode()
      .split('\n')
      .find(l => l.includes('Cell, x 1'))!
    api.assert.ok(/\bw 2\b/.test(cellLine), `Expected "w 2", got: ${cellLine}`)
    api.assert.ok(/\bh 2\b/.test(cellLine), `Expected "h 2", got: ${cellLine}`)
  }),

  // ---------------------------------------------------------------------------
  // 4. East drag less than half a cell → no change (no-op)
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Tiny east-drag stays in same cell → source unchanged',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const before = api.editor.getCode()
      const cellId = findIdByName('Cell')!
      // 30px east — handle starts at the column-1 east edge (= column-2
      // west edge). Adding 30px keeps us in column 2's first 30px, but
      // since we're going from column 1→column 2 the snap *increments*.
      // Actually testing the smaller no-op is harder — instead verify
      // the line still has w 1 if the drag resolves to span 1.
      // Use a *negative* delta (drag west by 5px) which should round to
      // staying in column 1 → no DSL write.
      await api.interact.dragResizeHandle(cellId, 'e', -5, 0)
      const after = api.editor.getCode()
      api.assert.equal(after, before, 'Source must be unchanged for sub-cell drag')
    }
  ),
])

export default gridCellResizeTests
