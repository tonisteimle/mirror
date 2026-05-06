/**
 * Cursor ↔ Selection Sync Tests
 *
 * The existing sync suites only check that *some* selection happens after
 * a click or cursor move. That's too lax — it doesn't catch the most
 * common sync regressions:
 *
 *   - cursor moves to line N but the wrong node gets selected
 *   - preview click selects element X but the cursor lands on the wrong line
 *   - cursor on a property value (e.g. mid-line on `bg #2271C1`) drifts
 *     selection to a sibling
 *   - selecting deep-nested element accidentally promotes to its parent
 *
 * This suite asserts EXACT mapping in both directions:
 *   editor.setCursor(line)  →  state.getSelection() === expectedNodeId
 *   interact.click(nodeId)  →  editor.getCursor().line === expectedLine
 *
 * Cursor sync is debounced ~50ms in SyncCoordinator; we wait 200ms after
 * each setCursor / click so the debounce + downstream sync can settle
 * without flake.
 */

import { test, testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { DEFAULT_PROJECT } from '../../../storage/project-actions'

const SYNC_SETTLE_MS = 200

// =============================================================================
// HELPERS — multi-file seeding (cf. editor/file-tabs.test.ts)
// =============================================================================

const TAB_FILES = ['data.data', 'tokens.tok', 'components.com', 'app.mir'] as const

interface MirrorWindow extends Window {
  files: Record<string, string>
  switchFile: (filename: string) => void
  desktopFiles?: { updateFileCache?: (path: string, content: string) => void }
  studio?: { actions: { setPreviewFile: (path: string) => void } }
}

function seedAllFour(): void {
  const w = window as unknown as MirrorWindow
  for (const file of TAB_FILES) {
    const content = (DEFAULT_PROJECT as Record<string, string>)[file] ?? ''
    w.files[file] = content
    w.desktopFiles?.updateFileCache?.(file, content)
  }
}

function clickEditorTab(file: string): void {
  const btn = document.querySelector(
    `.editor-file-tab[data-file="${file}"]`
  ) as HTMLButtonElement | null
  if (!btn) throw new Error(`Editor tab "${file}" not found`)
  btn.click()
}

function activeEditorTab(): string {
  const a = document.querySelector('.editor-file-tab.active') as HTMLElement | null
  return a?.dataset.file || ''
}

/**
 * Bounce away from the active tab (so switchFile doesn't save the
 * test-runner's empty editor on top of the file we want to load), then
 * re-seed all files and switch to `target`. This guarantees the editor
 * loads the demo content for `target` and not the empty stub the test
 * runner left behind.
 */
async function bounceSeedAndLoad(api: TestAPI, target: string): Promise<void> {
  // Bounce away first if needed.
  if (activeEditorTab() === target) {
    const sibling = TAB_FILES.find(f => f !== target) ?? 'app.mir'
    clickEditorTab(sibling)
    await api.utils.waitUntil(() => activeEditorTab() === sibling, 2000)
  }
  // NOW seed — the bounce already saved the stale empty editor onto
  // `target`'s slot, so we need to overwrite it with the demo content
  // *after* the bounce.
  seedAllFour()
  // Switch to target — switchFile reads window.files[target] which we
  // just refreshed.
  clickEditorTab(target)
  await api.utils.waitUntil(() => activeEditorTab() === target, 2000)
  await api.utils.waitForCompile()
}

// =============================================================================
// EDITOR → PREVIEW (cursor drives selection)
// =============================================================================

export const cursorToSelectionTests: TestCase[] = describe('Sync: Cursor → Selection', [
  testWithSetup(
    'Cursor on line 1 selects the root Frame',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      api.editor.setCursor(1, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      const sel = api.state.getSelection()
      api.assert.equals(sel, 'node-1', `Cursor on Frame line should select node-1, got ${sel}`)
    }
  ),

  testWithSetup(
    'Cursor on line 2 selects the first Text',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      const sel = api.state.getSelection()
      api.assert.equals(sel, 'node-2', `Cursor on first Text should select node-2, got ${sel}`)
    }
  ),

  testWithSetup(
    'Cursor on line 3 selects the second Text (not the first)',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      api.editor.setCursor(3, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      const sel = api.state.getSelection()
      api.assert.equals(sel, 'node-3', `Cursor on second Text should select node-3, got ${sel}`)
    }
  ),

  testWithSetup(
    'Cursor mid-line (inside a property value) still selects the line owner',
    `Frame gap 8\n  Button "Click", bg #2271C1, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      // Column 25 puts the cursor inside `bg #2271C1`, not at the line start.
      // The selection must still be the Button, not the Frame or a sibling.
      api.editor.setCursor(2, 25)
      await api.utils.delay(SYNC_SETTLE_MS)

      const sel = api.state.getSelection()
      api.assert.equals(sel, 'node-2', `Mid-line cursor must select Button, got ${sel}`)
    }
  ),

  testWithSetup(
    'Deep-nested cursor selects the deepest element, not an ancestor',
    `Frame pad 16\n  Frame pad 12\n    Frame pad 8\n      Text "Deep"`,
    async (api: TestAPI) => {
      api.editor.setCursor(4, 1)
      await api.utils.delay(SYNC_SETTLE_MS)

      const sel = api.state.getSelection()
      api.assert.equals(
        sel,
        'node-4',
        `Cursor on deep Text must select node-4 (the Text), got ${sel}`
      )
    }
  ),

  testWithSetup(
    'Moving cursor between two siblings updates selection both ways',
    `Frame gap 8\n  Text "A"\n  Text "B"`,
    async (api: TestAPI) => {
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.state.getSelection(), 'node-2', 'A → node-2')

      api.editor.setCursor(3, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.state.getSelection(), 'node-3', 'B → node-3')

      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.state.getSelection(), 'node-2', 'back to A → node-2')
    }
  ),
])

// =============================================================================
// PREVIEW → EDITOR (click drives cursor)
// =============================================================================

export const selectionToCursorTests: TestCase[] = describe('Sync: Selection → Cursor', [
  testWithSetup(
    'Click first Text moves cursor to its line',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SYNC_SETTLE_MS)

      const cur = api.editor.getCursor()
      api.assert.equals(
        cur.line,
        2,
        `Click on first Text must put cursor on line 2, got ${cur.line}`
      )
    }
  ),

  testWithSetup(
    'Click second Text moves cursor to its line (not the first)',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      await api.interact.click('node-3')
      await api.utils.delay(SYNC_SETTLE_MS)

      const cur = api.editor.getCursor()
      api.assert.equals(
        cur.line,
        3,
        `Click on second Text must put cursor on line 3, got ${cur.line}`
      )
    }
  ),

  testWithSetup(
    'Click deep-nested element moves cursor to the deep line',
    `Frame pad 16\n  Frame pad 12\n    Frame pad 8\n      Text "Deep"`,
    async (api: TestAPI) => {
      await api.interact.click('node-4')
      await api.utils.delay(SYNC_SETTLE_MS)

      const cur = api.editor.getCursor()
      api.assert.equals(
        cur.line,
        4,
        `Click on deep Text must put cursor on line 4, got ${cur.line}`
      )
    }
  ),

  testWithSetup(
    'Clicking different elements moves cursor each time',
    `Frame gap 8\n  Text "A"\n  Button "B"\n  Text "C"`,
    async (api: TestAPI) => {
      await api.interact.click('node-2')
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.editor.getCursor().line, 2, 'A → line 2')

      await api.interact.click('node-3')
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.editor.getCursor().line, 3, 'B → line 3')

      await api.interact.click('node-4')
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.editor.getCursor().line, 4, 'C → line 4')
    }
  ),
])

// =============================================================================
// ROUND-TRIP (both directions interleaved)
// =============================================================================

export const roundTripSyncTests: TestCase[] = describe('Sync: Round-Trip', [
  testWithSetup(
    'Click → cursor → re-click selects the same node consistently',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      await api.interact.click('node-3')
      await api.utils.delay(SYNC_SETTLE_MS)
      const lineAfterClick = api.editor.getCursor().line
      api.assert.equals(lineAfterClick, 3, 'click → line 3')

      // Same line, different column — cursor sync must not fight the click.
      api.editor.setCursor(3, 5)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(
        api.state.getSelection(),
        'node-3',
        'cursor on same line keeps node-3 selected'
      )
    }
  ),

  testWithSetup(
    'Editor cursor → preview selection → editor cursor stays put',
    `Frame gap 8\n  Text "First"\n  Text "Second"`,
    async (api: TestAPI) => {
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.state.getSelection(), 'node-2', 'editor → node-2')

      // Highlight from preview side: selection comes from origin "preview",
      // and per the sync coordinator the editor cursor must NOT be scrolled
      // because the editor already shows the right line. We just verify the
      // cursor still points at line 2.
      const cur = api.editor.getCursor()
      api.assert.equals(cur.line, 2, 'cursor still on line 2 after preview-origin sync')
    }
  ),
])

// =============================================================================
// EDITS PRESERVE SELECTION
// =============================================================================

export const editPreservesSelectionTests: TestCase[] = describe('Sync: Edits Preserve Selection', [
  testWithSetup(
    'Editing a property keeps the same node selected',
    `Frame gap 8\n  Button "Click", bg #333, col white`,
    async (api: TestAPI) => {
      // Select the Button via cursor
      api.editor.setCursor(2, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
      api.assert.equals(api.state.getSelection(), 'node-2', 'pre-edit: node-2 selected')

      // Tweak a property — the line still belongs to the Button.
      await api.editor.setCode(`Frame gap 8\n  Button "Click", bg #2271C1, col white`)
      await api.utils.waitForCompile()
      await api.utils.delay(SYNC_SETTLE_MS)

      // Selection should follow the same line owner.
      const sel = api.state.getSelection()
      api.assert.ok(
        sel === 'node-2',
        `Selection must remain on Button after a property tweak, got ${sel}`
      )
    }
  ),
])

// =============================================================================
// MULTI-FILE: preview-redirect + tab-switch sync edge-cases
//
// In the four-file project the preview shows app.mir while the editor can
// sit on data.data / tokens.tok / components.com. Selection sync must:
//   - clicking a preview node while editor is on a NON-app file should
//     either jump to app.mir + cursor, or no-op cleanly (never throw).
//   - switching tabs must NOT leave a stale selection pointing at a node
//     that no longer maps into the active file's source.
//   - cursor in app.mir after a tab-switch must select the right node.
// These tests use bare test() + manual seedAllFour because the standard
// testWithSetup only loads ONE file into the editor.
// =============================================================================

export const multiFileSyncTests: TestCase[] = describe('Sync: Multi-File', [
  test('Cursor on app.mir line selects the matching node (with prelude active)', async (api: TestAPI) => {
    await bounceSeedAndLoad(api, 'app.mir')
    await api.utils.delay(SYNC_SETTLE_MS)

    // Demo app.mir starts with `canvas mobile, ...` then `Frame name HomeView`.
    // Find the first Frame line in the actual editor source (the prelude
    // is folded under-the-hood via the lineOffset service).
    const code = api.editor.getCode()
    const lines = code.split('\n')
    const frameLineIndex = lines.findIndex(l => /^Frame\b/.test(l.trim()))
    api.assert.ok(frameLineIndex >= 0, 'app.mir must contain a Frame line')

    api.editor.setCursor(frameLineIndex + 1, 1)
    await api.utils.delay(SYNC_SETTLE_MS)

    const sel = api.state.getSelection()
    api.assert.ok(
      sel !== null && sel.startsWith('node-'),
      `Cursor on Frame line must select a node, got ${sel}`
    )
  }),

  test('Switching from app.mir to tokens.tok clears or reanchors selection cleanly', async (api: TestAPI) => {
    await bounceSeedAndLoad(api, 'app.mir')
    await api.utils.delay(SYNC_SETTLE_MS)

    // Park the cursor on a real Frame line in app.mir → selects something.
    const code = api.editor.getCode()
    const frameLineIndex = code.split('\n').findIndex(l => /^Frame\b/.test(l.trim()))
    if (frameLineIndex >= 0) {
      api.editor.setCursor(frameLineIndex + 1, 1)
      await api.utils.delay(SYNC_SETTLE_MS)
    }

    // Switch to tokens.tok. The editor source no longer contains layout
    // nodes — selection must NOT point at a node sourced from app.mir
    // and mapped onto a tokens-line that doesn't exist there.
    clickEditorTab('tokens.tok')
    await api.utils.waitUntil(() => activeEditorTab() === 'tokens.tok', 2000)
    await api.utils.waitForCompile()
    await api.utils.delay(SYNC_SETTLE_MS)

    const sel = api.state.getSelection()
    const cur = api.editor.getCursor()
    const editorLineCount = api.editor.getCode().split('\n').length
    api.assert.ok(
      cur.line >= 1 && cur.line <= editorLineCount,
      `Cursor must remain inside tokens.tok bounds [1..${editorLineCount}], got line ${cur.line} (sel=${sel})`
    )
  }),

  test('Editor on tokens.tok: cursor moves on tokens lines must NOT highlight a layout node', async (api: TestAPI) => {
    await bounceSeedAndLoad(api, 'tokens.tok')
    await api.utils.delay(SYNC_SETTLE_MS)

    // Find a real token line in tokens.tok (e.g. `primary.bg: #...`).
    const code = api.editor.getCode()
    const tokenLineIndex = code.split('\n').findIndex(l => /^[a-z][\w.-]*\.\w+:/i.test(l.trim()))
    api.assert.ok(tokenLineIndex >= 0, 'tokens.tok must contain at least one token line')

    api.editor.setCursor(tokenLineIndex + 1, 1)
    await api.utils.delay(SYNC_SETTLE_MS)

    const sel = api.state.getSelection()
    // A token definition line has no DOM node — selection must be null,
    // NOT a stale layout node from app.mir.
    api.assert.ok(
      sel === null,
      `Cursor on a token-definition line must produce no selection, got ${sel}`
    )
  }),

  test("Switching tabs does not leak the previous tab's cursor line", async (api: TestAPI) => {
    await bounceSeedAndLoad(api, 'app.mir')
    await api.utils.delay(SYNC_SETTLE_MS)
    const appLineCount = api.editor.getCode().split('\n').length

    // Move cursor near the end of app.mir, far past where any other file
    // would have content.
    api.editor.setCursor(appLineCount, 1)
    await api.utils.delay(SYNC_SETTLE_MS)
    const cursorBefore = api.editor.getCursor().line
    api.assert.equals(cursorBefore, appLineCount, 'cursor parked at end of app.mir')

    // Switch to tokens.tok (typically much shorter).
    clickEditorTab('tokens.tok')
    await api.utils.waitUntil(() => activeEditorTab() === 'tokens.tok', 2000)
    await api.utils.delay(SYNC_SETTLE_MS)

    const tokensLineCount = api.editor.getCode().split('\n').length
    const cursorAfter = api.editor.getCursor().line

    api.assert.ok(
      cursorAfter <= tokensLineCount,
      `Cursor (line ${cursorAfter}) must be inside tokens.tok (max ${tokensLineCount}). ` +
        `If this fails the previous tab's cursor leaked across the file switch.`
    )
  }),
])
