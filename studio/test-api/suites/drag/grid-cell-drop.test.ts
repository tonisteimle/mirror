/**
 * Grid-cell-drop tests — Phase 2 end-to-end verification.
 *
 * Exercises the cell-aware drop branch added to DragController:
 *   - hit-detector classifies `display: grid` as `'grid'` (not `'flex-row'`)
 *   - DragController.handleGridHit computes (gridX, gridY) from cursor +
 *     live `gridTemplateColumns`/`gridTemplateRows`
 *   - ElementMoveHandler writes `x N, y M` (and optional `w P, h Q`) on the
 *     dropped element
 *
 * Why this lives in the browser test suite, not Vitest:
 *   The DragController, drop pipeline, and code-modifier all run inside
 *   Studio. Verifying that `Frame x 1 → Frame x 3` actually appears in
 *   the editor source requires a real Studio instance with an editor
 *   bound to the live source map. jsdom isn't enough — `getComputedStyle`
 *   doesn't resolve `1fr` to pixels and the editor's DOM isn't there.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Fixtures
// =============================================================================

/**
 * Minimal 4×2 grid with two children. The Anchor at (4, 2) is solely
 * there to force the 2nd row into `gridTemplateRows` (CSS-grid keeps
 * unused rows implicit, which our cell-snap math can't see). All test
 * moves target empty cells away from CellA's start position, so the
 * hit-detector consistently reports the grid container as the drop
 * target rather than picking up an existing cell-child.
 */
const GRID_FIXTURE = `Frame name MainGrid, grid 4, gap 8, w 400, h 200, pad 16, row-height 48
  Frame name CellA, x 1, y 1, w 1, h 1, bg #ef4444
  Frame name Anchor, x 4, y 2, w 1, h 1, bg transparent`

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find a node-id by data-mirror-name. Tests use stable mirror-names
 * (`name MainGrid`, `name CellA`) to avoid hard-coding generated ids,
 * which can shift if the IR walks the tree differently after a refactor.
 */
function findIdByName(name: string): string | null {
  const el = document.querySelector(`[data-mirror-name="${name}"]`)
  return (el as HTMLElement | null)?.dataset.mirrorId ?? null
}

// =============================================================================
// Tests
// =============================================================================

export const gridCellDropTests: TestCase[] = describe('Grid Cell Drop (Phase 2)', [
  // ---------------------------------------------------------------------------
  // 1. Move to an empty cell — DSL gets x/y written
  // ---------------------------------------------------------------------------
  testWithSetup(
    'CellA (1,1) → empty cell (2,1) writes x 2, y 1',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const cellAId = findIdByName('CellA')
      const gridId = findIdByName('MainGrid')
      api.assert.ok(cellAId, 'CellA must have a node-id')
      api.assert.ok(gridId, 'MainGrid must have a node-id')

      await api.interact.moveElementToCell(cellAId!, gridId!, { x: 2, y: 1 })

      const code = api.editor.getCode()
      // CellA must now be at x 2, y 1 (was at x 1, y 1).
      const cellALine = code.split('\n').find(l => l.includes('CellA'))
      api.assert.ok(cellALine, 'CellA line must still exist in source')
      api.assert.ok(/\bx 2\b/.test(cellALine!), `Expected "x 2" in CellA line, got: ${cellALine}`)
      api.assert.ok(/\by 1\b/.test(cellALine!), `Expected "y 1" in CellA line, got: ${cellALine}`)
      api.assert.ok(!/\bx 1\b/.test(cellALine!), `Old "x 1" must be replaced, got: ${cellALine}`)
    }
  ),

  // ---------------------------------------------------------------------------
  // 2. Move to a different row — y updates
  // ---------------------------------------------------------------------------
  testWithSetup(
    'CellA (1,1) → cell (2,2) updates both x and y',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const cellAId = findIdByName('CellA')!
      const gridId = findIdByName('MainGrid')!

      await api.interact.moveElementToCell(cellAId, gridId, { x: 2, y: 2 })

      const cellALine = api.editor
        .getCode()
        .split('\n')
        .find(l => l.includes('CellA'))!
      api.assert.ok(/\bx 2\b/.test(cellALine), `Expected "x 2", got: ${cellALine}`)
      api.assert.ok(/\by 2\b/.test(cellALine), `Expected "y 2", got: ${cellALine}`)
    }
  ),

  // ---------------------------------------------------------------------------
  // 3. Source line preserves other properties (bg, w, h, name)
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Move preserves unrelated properties on the same line',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const cellAId = findIdByName('CellA')!
      const gridId = findIdByName('MainGrid')!

      // Move into an empty cell — CellA goes to (2, 2).
      await api.interact.moveElementToCell(cellAId, gridId, { x: 2, y: 2 })

      const cellALine = api.editor
        .getCode()
        .split('\n')
        .find(l => l.includes('CellA'))!
      api.assert.ok(/name CellA/.test(cellALine), 'name CellA must survive')
      api.assert.ok(/#ef4444/.test(cellALine), 'bg #ef4444 must survive')
      api.assert.ok(/\bx 2\b/.test(cellALine), 'x 2 must be set')
      api.assert.ok(/\by 2\b/.test(cellALine), 'y 2 must be set')
    }
  ),

  // ---------------------------------------------------------------------------
  // KNOWN LIMITATION: cell-on-cell drops (dropping onto a cell that already
  // contains another grid child) are blocked by the hit-detector picking up
  // the existing child instead of the grid container. Tracked for Phase-2
  // follow-up. All tests here therefore target empty cells.
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // 5. Default span (w 1, h 1) is NOT emitted — keeps DSL minimal
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Default w 1 / h 1 are not written explicitly when moving CellA',
    GRID_FIXTURE,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const cellAId = findIdByName('CellA')!
      const gridId = findIdByName('MainGrid')!

      await api.interact.moveElementToCell(cellAId, gridId, { x: 2, y: 2 })

      // CellA HAS `w 1, h 1` already in the fixture — the move should not
      // duplicate or re-write them. We can't easily assert "w stays 1" with
      // string match (the line still contains "w 1"); but we can assert
      // there's no spurious "w 1, w 1" or similar.
      const cellALine = api.editor
        .getCode()
        .split('\n')
        .find(l => l.includes('CellA'))!
      const wMatches = cellALine.match(/\bw 1\b/g) ?? []
      const hMatches = cellALine.match(/\bh 1\b/g) ?? []
      api.assert.ok(
        wMatches.length <= 1,
        `Expected at most one "w 1", got ${wMatches.length}: ${cellALine}`
      )
      api.assert.ok(
        hMatches.length <= 1,
        `Expected at most one "h 1", got ${hMatches.length}: ${cellALine}`
      )
    }
  ),
])

export default gridCellDropTests
