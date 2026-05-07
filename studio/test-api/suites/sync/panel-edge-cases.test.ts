/**
 * Property Panel ↔ Selection edge cases.
 *
 * Covers transitions that the happy-path tests miss:
 *
 *   (a) Selection cleared (null)         → panel reverts to empty state
 *   (c) Selected node removed by edit    → panel doesn't keep stale data
 *   (d) Cursor on a blank / non-element  → previous selection persists
 *
 * Multi-selection (case b) and inside-definition cursor (case e) are
 * better covered by the dedicated suites and aren't reachable from the
 * test-api here without bespoke harnesses.
 *
 * The "stale data" failure mode is the most damaging in practice: the
 * panel keeps showing properties of a node that no longer exists, and
 * any subsequent setProperty writes go to a phantom nodeId. The
 * SELECTION_INVALIDATED → not-found / fallback path needs a test.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

const SETTLE_MS = 200

export const panelEdgeCaseTests: TestCase[] = describe('Panel ↔ Selection edge cases', [
  testWithSetup(
    'Selection cleared → panel goes empty',
    `Frame pad 16, bg #1a1a1a
  Button "X", bg #2271C1, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)
      api.assert.equals(
        api.panel.property.getSelectedNodeId(),
        'node-2',
        'precondition: node-2 selected'
      )

      await api.studio.setSelection(null)
      await api.utils.delay(SETTLE_MS)

      // After clear, the panel must drop the previous element. We assert
      // via getAllProperties()→empty rather than getSelectedNodeId, since
      // some implementations may leave the previousElement reference
      // hanging in pending-update states. The user-visible contract is
      // "no properties shown".
      const props = api.panel.property.getAllProperties()
      api.assert.ok(
        Object.keys(props).length === 0,
        `Panel must show no properties after clear, got ${JSON.stringify(props)}`
      )
    }
  ),

  testWithSetup(
    'Selected node removed by code edit → panel no longer shows its props',
    `Frame pad 16, bg #1a1a1a
  Button "doomed", bg #2271C1, col white
  Button "survivor", bg #ef4444, col black`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#2271C1',
        'precondition: panel shows doomed Button'
      )

      // Edit removes the doomed Button entirely.
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "survivor", bg #ef4444, col black`)
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)

      // After invalidation, the panel must NOT keep showing the doomed
      // Button's #2271C1 — that would let the user "edit" a phantom
      // node. Acceptable end states: empty, fallback to new node-2
      // (now the survivor), or not-found.
      const bg = api.panel.property.getPropertyValue('bg')
      api.assert.ok(
        bg !== '#2271C1',
        `Panel must not keep stale doomed-Button bg #2271C1 after deletion, got ${bg}`
      )

      // Defensive: if the panel did fall back to a node, that node must
      // actually exist in the new source. Either survivor-Button or
      // Frame is acceptable.
      const id = api.panel.property.getSelectedNodeId()
      if (id !== null) {
        api.assert.ok(
          id === 'node-1' || id === 'node-2',
          `Fallback selection must be a still-existing node, got ${id}`
        )
      }
    }
  ),

  testWithSetup(
    'Cursor on blank line keeps previous selection',
    `Frame pad 16, bg #1a1a1a, gap 8

  Button "X", bg #2271C1, col white`,
    async (api: TestAPI) => {
      // Pre-select the Button (line 3 in the 3-line source above).
      api.editor.setCursor(3, 1)
      await api.utils.delay(SETTLE_MS)
      const before = await api.panel.property.waitForSelectedNodeId(2000)
      api.assert.equals(before, 'node-2', 'precondition: Button is selected')

      // Now cursor onto the blank line 2 — there is no node here.
      api.editor.setCursor(2, 0)
      await api.utils.delay(SETTLE_MS)

      // The contract: blank line shouldn't actively unselect the user's
      // previous element. Either the panel keeps showing node-2's
      // props (preferred — preserves user context) OR it falls back
      // to the parent Frame (also acceptable). Fully empty would be a
      // regression — the user would lose their working context every
      // time they hit Enter.
      const after = api.panel.property.getSelectedNodeId()
      api.assert.ok(
        after === 'node-2' || after === 'node-1',
        `Blank-line cursor must keep a meaningful selection, got ${after}`
      )

      // Whatever node is held, its props must be readable.
      const props = api.panel.property.getAllProperties()
      api.assert.ok(
        Object.keys(props).length > 0,
        'Panel must still expose properties for the held selection'
      )
    }
  ),

  testWithSetup(
    'Code edit that renames primitive (Button → Frame) reflects new primitive',
    `Frame pad 16
  Button "X", bg #2271C1, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SETTLE_MS)
      api.assert.equals(
        api.panel.property.getSelectedNodeId(),
        'node-2',
        'precondition: Button selected'
      )

      // Swap Button → Frame on the same line. The nodeId should remain
      // (positional resolver maps to same position) but the primitive
      // changes.
      await api.editor.setCode(`Frame pad 16
  Frame bg #2271C1, w 100, h 50`)
      await api.utils.waitForCompile()
      await api.utils.delay(SETTLE_MS)

      // bg should still be readable on the new Frame.
      const bg = api.panel.property.getPropertyValue('bg')
      api.assert.equals(
        bg,
        '#2271C1',
        `After Button→Frame swap, panel must reflect new primitive's bg, got ${bg}`
      )
      // The new w/h should appear (they didn't exist on the Button).
      const w = api.panel.property.getPropertyValue('w')
      api.assert.equals(w, '100', `New Frame's w 100 must surface, got ${w}`)
    }
  ),
])
