/**
 * Editor → Property Panel Sync — cursor / selection drives panel content.
 *
 * The previous version of this file had two trivia tests:
 *   - "panel is accessible" (`isVisible() !== undefined` — passes always)
 *   - "code edit updates DOM" (asserted DOM, not panel)
 *
 * Neither caught the regression "panel shows the wrong element's
 * properties" — which is the dominant failure mode of selection-driven
 * panels. The rebuilt suite asserts:
 *
 *   editor.setCursor(line) → panel.getSelectedNodeId() === expectedId
 *   panel.getPropertyValue('bg') === source-line's bg literal
 *
 * We compare panel reads against the source-line's literal values, so a
 * mutation that wires the wrong nodeId into the panel adapter (e.g. always
 * returning the parent's nodeId) breaks 4+ assertions immediately.
 *
 * Cursor → selection sync is debounced ~50ms; we wait 200ms after each
 * cursor / click to let the SyncCoordinator settle without flake.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

const SYNC_SETTLE_MS = 200

export const editorToPanelTests: TestCase[] = describe('Editor → Property Panel Sync', [
  testWithSetup(
    'Cursor on Frame line → panel reflects Frame properties',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "child", col white, fs 18`,
    async (api: TestAPI) => {
      api.editor.setCursor(1, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      const id = await api.panel.property.waitForSelectedNodeId(2000)
      api.assert.equals(id, 'node-1', `Cursor on line 1 must select Frame (node-1), got ${id}`)

      const bg = api.panel.property.getPropertyValue('bg')
      api.assert.equals(bg, '#1a1a1a', `Panel bg must reflect Frame's bg literal, got ${bg}`)

      const pad = api.panel.property.getPropertyValue('pad')
      api.assert.equals(pad, '16', `Panel pad must reflect Frame's pad literal, got ${pad}`)
    }
  ),

  testWithSetup(
    'Cursor on Text line → panel reflects Text properties (not Frame)',
    `Frame pad 16, bg #1a1a1a, gap 8
  Text "child", col white, fs 18`,
    async (api: TestAPI) => {
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      const id = api.panel.property.getSelectedNodeId()
      api.assert.equals(id, 'node-2', `Cursor on line 2 must select Text (node-2), got ${id}`)

      // Critical: panel must show TEXT's col (white), not FRAME's bg (#1a1a1a).
      // A bug returning parent props would surface here.
      const col = api.panel.property.getPropertyValue('col')
      api.assert.equals(col, 'white', `Panel col must be Text's white, got ${col}`)

      const fs = api.panel.property.getPropertyValue('fs')
      api.assert.equals(fs, '18', `Panel fs must be Text's 18, got ${fs}`)

      // Frame's bg should NOT appear on the Text panel.
      const bg = api.panel.property.getPropertyValue('bg')
      api.assert.ok(
        !bg || bg === '',
        `Panel bg must be empty for Text (Frame's bg #1a1a1a must not bleed), got ${bg}`
      )
    }
  ),

  testWithSetup(
    'Moving cursor between two siblings switches panel values both ways',
    `Frame gap 8
  Button "A", bg #2271C1, col white
  Button "B", bg #ef4444, col black`,
    async (api: TestAPI) => {
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      api.assert.equals(api.panel.property.getSelectedNodeId(), 'node-2', 'A → node-2')
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#2271C1',
        'Panel bg = #2271C1 for A'
      )

      api.editor.setCursor(3, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      api.assert.equals(api.panel.property.getSelectedNodeId(), 'node-3', 'B → node-3')
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#ef4444',
        'Panel bg = #ef4444 for B (changed)'
      )
      api.assert.equals(
        api.panel.property.getPropertyValue('col'),
        'black',
        'Panel col = black for B'
      )

      // Back to A — verify panel doesn't get stuck on B.
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#2271C1',
        'Panel bg back to #2271C1 for A'
      )
    }
  ),

  testWithSetup(
    'Click in preview updates panel to clicked element',
    `Frame gap 8
  Button "A", bg #2271C1, col white
  Button "B", bg #ef4444, col black`,
    async (api: TestAPI) => {
      await api.interact.click('node-3')
      await api.utils.delay(SYNC_SETTLE_MS)

      api.assert.equals(api.panel.property.getSelectedNodeId(), 'node-3', 'Click → node-3')
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#ef4444',
        'Panel bg = #ef4444 for clicked B'
      )

      await api.interact.click('node-2')
      await api.utils.delay(SYNC_SETTLE_MS)

      api.assert.equals(api.panel.property.getSelectedNodeId(), 'node-2', 'Click → node-2')
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#2271C1',
        'Panel bg = #2271C1 for clicked A'
      )
    }
  ),

  testWithSetup(
    'Code edit on selected node updates panel value live',
    `Frame pad 16, bg #1a1a1a
  Button "X", bg #2271C1, col white`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.panel.property.getPropertyValue('bg'), '#2271C1', 'before-edit bg')

      // Edit the selected node's bg literal.
      await api.editor.setCode(`Frame pad 16, bg #1a1a1a
  Button "X", bg #ef4444, col white`)
      await api.utils.waitForCompile()
      await api.utils.delay(SYNC_SETTLE_MS)

      const bgAfter = api.panel.property.getPropertyValue('bg')
      api.assert.equals(
        bgAfter,
        '#ef4444',
        `Panel must reflect edited bg literal after recompile, got ${bgAfter}`
      )
    }
  ),

  testWithSetup(
    'Mid-line cursor: panel still reads the line owner properties',
    `Frame gap 8
  Button "Click", bg #2271C1, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Column 25 lands inside `bg #2271C1`. Selection must be the
      // Button (line owner). cursor-selection-sync covers selection
      // identity; this test additionally asserts the panel READS the
      // correct values (bg literal, not parent's nothing).
      api.editor.setCursor(2, 25)
      await api.utils.delay(SYNC_SETTLE_MS)
      const id = await api.panel.property.waitForSelectedNodeId(2000)

      api.assert.equals(id, 'node-2', 'Mid-line cursor must select line owner')
      api.assert.equals(
        api.panel.property.getPropertyValue('bg'),
        '#2271C1',
        'Panel bg must be Button literal even with mid-line cursor'
      )
    }
  ),
])
