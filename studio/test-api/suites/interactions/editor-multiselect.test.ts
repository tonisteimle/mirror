/**
 * Editor Multiselection Tests
 *
 * Tests for bidirectional multiselection: selecting multiple lines in the editor
 * should trigger multiselection in the preview.
 */

import { describe, test, testWithSetup, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

/**
 * Basic editor multiselection tests
 */
export const basicEditorMultiselectTests: TestCase[] = describe('Basic Editor Multiselection', [
  testWithSetup(
    'Selecting two element lines creates multiselection',
    `Frame ver, gap 16
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      // Initially no multiselection
      let multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Should start with empty multiselection, got ${multiSelection.length}`
      )

      // Select lines 2-3 in editor (Button A and B)
      api.editor.selectLines(2, 3)
      await api.utils.delay(100) // Wait for sync

      // Should have multiselection with 2 elements
      multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Should have 2 elements in multiselection, got ${multiSelection.length}`
      )

      // Check that correct elements are selected
      api.assert.ok(multiSelection.includes('node-2'), 'Should include node-2 (Button A)')
      api.assert.ok(multiSelection.includes('node-3'), 'Should include node-3 (Button B)')
    }
  ),

  testWithSetup(
    'Selecting all child element lines creates multiselection',
    `Frame ver, gap 16
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      // Debug: Check SourceMap line mappings
      const state = (window as any).__mirrorStudio__?.state?.get?.()
      const sourceMap = state?.sourceMap
      const sourceMapInfo: string[] = []
      if (sourceMap) {
        for (let line = 1; line <= 5; line++) {
          const node = sourceMap.getNodeAtLine(line)
          sourceMapInfo.push(`L${line}: ${node?.nodeId ?? 'null'}`)
        }
      }

      // Check editor state BEFORE selection
      const editor = (window as any).editor
      const docLines = editor?.state?.doc?.lines ?? 'unknown'
      const docLength = editor?.state?.doc?.length ?? 'unknown'

      // Check line info BEFORE selectLines
      const line2Info = editor?.state?.doc?.line?.(2)
      const line4Info = editor?.state?.doc?.line?.(4)
      const lineInfoDebug = `L2:${line2Info?.from}-${line2Info?.to}, L4:${line4Info?.from}-${line4Info?.to}`

      // Select lines 2-4 in editor (all three buttons)
      api.editor.selectLines(2, 4)

      // Get debug info from selectLines
      const slDebug = (window as any).__selectLinesDebug
      const slInfo = slDebug
        ? `in:${slDebug.input.fromLine}-${slDebug.input.toLine} comp:${slDebug.computed.anchor}-${slDebug.computed.head} res:${slDebug.result.from}-${slDebug.result.to} anc-head:${slDebug.result.anchor}-${slDebug.result.head}`
        : 'no-debug'

      // Check selection IMMEDIATELY after selectLines
      const selImmediate = editor?.state?.selection?.main
      const selImmFrom = selImmediate?.from ?? 'unknown'
      const selImmTo = selImmediate?.to ?? 'unknown'
      const immFromLine =
        selImmFrom !== 'unknown' ? editor.state.doc.lineAt(selImmFrom).number : '?'
      const immToLine = selImmTo !== 'unknown' ? editor.state.doc.lineAt(selImmTo).number : '?'

      await api.utils.delay(100)

      // Check selection AFTER delay
      const selection = editor?.state?.selection?.main
      const selFrom = selection?.from ?? 'unknown'
      const selTo = selection?.to ?? 'unknown'
      const fromLineNum =
        selFrom !== 'unknown' ? editor.state.doc.lineAt(selFrom).number : 'unknown'
      const toLineNum = selTo !== 'unknown' ? editor.state.doc.lineAt(selTo).number : 'unknown'

      // Get update listener debug history
      const updateHistory = (window as any).__updateDebugHistory ?? []
      const lastUpdate = updateHistory[updateHistory.length - 1]
      const updateInfo = lastUpdate
        ? `upd:${lastUpdate.from}-${lastUpdate.to}(L${lastUpdate.fromLine}-L${lastUpdate.toLine})`
        : 'no-update'

      // Get selectLines preState
      const slDebugFull = (window as any).__selectLinesDebug
      const lineInfos = slDebugFull?.preState?.lineInfos
      const lineInfoStr = lineInfos
        ? `L4:${lineInfos.toLine.from}-${lineInfos.toLine.to}`
        : 'no-lineinfo'
      const docInfo = slDebugFull?.preState
        ? `doc:${slDebugFull.preState.docLength}L${slDebugFull.preState.docLines}`
        : 'no-doc'
      const usedES = slDebugFull?.usedEditorSelection ? 'ES:y' : 'ES:n'

      // Don't clear debug history yet - we need it later

      // Get transaction filter debug
      const txDebug = (window as any).__txFilterDebug ?? []
      const lastTx = txDebug[txDebug.length - 1]
      const txInfo = lastTx
        ? `tx:${lastTx.selection?.from ?? 'null'}-${lastTx.selection?.to ?? 'null'}`
        : 'no-tx'

      // Clear debug
      ;(window as any).__txFilterDebug = []

      // Get transaction result
      const txResult = slDebugFull?.transactionResult
      const selObjInfo = txResult?.selObj
        ? `selObj:${txResult.selObj.mainFrom}-${txResult.selObj.mainTo}`
        : 'no-selObj'
      const focusInfo = `focus:${txResult?.focusBefore ? 'y' : 'n'}→${txResult?.focusAfter ? 'y' : 'n'}`
      const forcedFocus = txResult?.forcedFocus ? ' FORCED' : ''
      const beforeAfter = txResult?.beforeSel
        ? `before:${txResult.beforeSel.from}-${txResult.beforeSel.to} after:${txResult.afterSel.from}-${txResult.afterSel.to}`
        : 'no-before-after'

      // Check multiselection
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 3,
        `Should have 3 elements in multiselection, got ${multiSelection.length}: [${multiSelection.join(', ')}]`
      )
    }
  ),

  testWithSetup(
    'Moving cursor clears multiselection',
    `Frame ver, gap 16
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      // First create multiselection
      api.editor.selectLines(2, 3)
      await api.utils.delay(100)

      let multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 2,
        `Should have multiselection, got ${multiSelection.length}`
      )

      // Now move cursor to single line
      api.editor.setCursor(4, 0)
      // Wait longer than cursorDebounce (150ms) for sync to complete
      await api.utils.delay(200)

      // Multiselection should be cleared
      multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Multiselection should be cleared, got ${multiSelection.length}`
      )
    }
  ),
])

/**
 * Tests for parent-child filtering
 */
export const parentChildFilterTests: TestCase[] = describe('Parent-Child Filtering', [
  testWithSetup(
    'Selecting parent and child lines only selects parent',
    `Frame ver, gap 16
  Frame pad 8, bg #222
    Button "Child"
  Button "Sibling"`,
    async (api: TestAPI) => {
      // Select lines 2-3 (Frame with child and Button inside)
      api.editor.selectLines(2, 3)
      await api.utils.delay(100)

      // After filtering, only 1 element remains (the parent Frame)
      // Single element uses regular selection, not multiselection
      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Single parent should use regular selection, not multiselection. Got ${multiSelection.length}`
      )

      // Check regular selection has the parent
      const selection = api.studio.getSelection()
      api.assert.ok(selection === 'node-2', `Should select parent Frame (node-2), got ${selection}`)
    }
  ),

  testWithSetup(
    'Selecting siblings creates multiselection',
    `Frame ver, gap 16
  Frame pad 8, bg #222
    Button "Child A"
  Frame pad 8, bg #333
    Button "Child B"`,
    async (api: TestAPI) => {
      // Select lines 2-5 (both sibling Frames with their children)
      api.editor.selectLines(2, 5)
      await api.utils.delay(100)

      const multiSelection = api.studio.getMultiSelection()
      // Should have 2 sibling Frames, not their children
      api.assert.ok(
        multiSelection.length === 2,
        `Should select 2 sibling parents, got ${multiSelection.length}`
      )
    }
  ),
])

/**
 * Tests for single line selection
 */
export const singleLineTests: TestCase[] = describe('Single Line Selection', [
  testWithSetup(
    'Single line selection uses regular selection',
    `Frame ver, gap 16
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // Clear any debug history
      ;(window as any).__updateDebugHistory = []

      // First move cursor to a different line to ensure state change detection
      api.editor.setCursor(1, 0)
      await api.utils.delay(200)

      // Now select line 2 - this should trigger cursor sync
      api.editor.setCursor(2, 0)
      // Wait longer than cursorDebounce (150ms) for sync to complete
      await api.utils.delay(200)

      const multiSelection = api.studio.getMultiSelection()
      api.assert.ok(
        multiSelection.length === 0,
        `Single line should not create multiselection, got ${multiSelection.length}`
      )

      // Get debug info
      const updateHistory = (window as any).__updateDebugHistory || []
      const lastUpdate = updateHistory[updateHistory.length - 1]
      const updateInfo = lastUpdate
        ? `lastUpd:L${lastUpdate.fromLine}-L${lastUpdate.toLine}`
        : 'no-update'

      // Should have regular selection
      const selection = api.studio.getSelection()
      // Debug: Check what nodes exist and current state
      const preview = document.getElementById('preview')
      const nodeIds = Array.from(preview?.querySelectorAll('[data-mirror-id]') ?? []).map(el =>
        el.getAttribute('data-mirror-id')
      )

      // Check sync coordinator state
      const sync = (window as any).__mirrorStudio__?.sync
      const lineOffset = sync?.lineOffset?.getOffset?.() ?? 'unknown'

      api.assert.ok(
        selection === 'node-2',
        `sel="${selection}" nodes=[${nodeIds.join(',')}] ${updateInfo} offset=${lineOffset}`
      )
    }
  ),
])

/**
 * All editor multiselect tests combined
 */
export const allEditorMultiselectTests: TestCase[] = [
  ...basicEditorMultiselectTests,
  ...parentChildFilterTests,
  ...singleLineTests,
]
