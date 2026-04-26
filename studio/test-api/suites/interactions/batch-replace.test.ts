/**
 * Batch-Replace on Extract — End-to-End CDP Tests
 *
 * Covers the dialog flow that vitest cannot reach (real DOM, real
 * Studio editor, real file callbacks):
 *
 *   Phase A (exact matches, component-extract)
 *     - dialog appears when matches exist
 *     - dialog suppressed when no matches
 *     - apply replaces all checked matches
 *     - opt-out: unchecked match stays unchanged
 *     - cancel leaves the original extraction in place
 *
 *   Phase B (token-extract segment match)
 *     - dialog appears for `bg primary::#XXX` with other `bg #XXX` lines
 *     - matches are scoped to property name (col #XXX is NOT matched)
 *     - apply replaces all checked segments
 *
 *   Phase C (near matches with override, component-extract)
 *     - dialog has a separate "Ähnlich" section
 *     - near-match opt-in replaces with override
 *     - near-matches default unchecked
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DIALOG_SELECTOR = 'dialog.mirror-batch-replace-dialog'

/** Type the second `:` after `<name>:` to fire the extract trigger. */
async function typeDoubleColon(
  api: TestAPI,
  setup: { name: string; properties: string; searchFor: string }
) {
  const editor = window.editor
  if (!editor) throw new Error('Editor not found')

  const code = editor.state.doc.toString()
  const searchPos = code.indexOf(setup.searchFor)
  if (searchPos === -1) throw new Error(`Could not find "${setup.searchFor}" in code`)

  const replaceEnd = searchPos + setup.searchFor.length
  const textWithSingleColon = `${setup.name}:${setup.properties}`

  editor.dispatch({
    changes: { from: searchPos, to: replaceEnd, insert: textWithSingleColon },
    selection: { anchor: searchPos + setup.name.length + 1 },
  })

  await api.utils.delay(50)

  const currentCode = editor.state.doc.toString()
  const singleColonPos = currentCode.indexOf(`${setup.name}:`)
  if (singleColonPos === -1) throw new Error(`Could not find "${setup.name}:" in code`)
  const insertPos = singleColonPos + `${setup.name}:`.length

  editor.dispatch({
    changes: { from: insertPos, to: insertPos, insert: ':' },
    selection: { anchor: insertPos + 1 },
  })

  // Allow trigger setTimeout (10ms) + dialog render to settle.
  await api.utils.delay(250)
}

/** Wait until the batch-replace dialog appears (or timeout). */
async function waitForDialog(api: TestAPI, timeoutMs = 1000): Promise<HTMLDialogElement> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const dialog = document.querySelector(DIALOG_SELECTOR) as HTMLDialogElement | null
    if (dialog && dialog.open) return dialog
    await api.utils.delay(20)
  }
  throw new Error('Batch-replace dialog did not appear within timeout')
}

/** Confirm there is NO dialog open after the trigger. */
async function expectNoDialog(api: TestAPI, settleMs = 400): Promise<void> {
  await api.utils.delay(settleMs)
  const dialog = document.querySelector(DIALOG_SELECTOR) as HTMLDialogElement | null
  if (dialog && dialog.open) {
    // Close it so the next test isn't disturbed.
    dialog.close()
    dialog.remove()
    throw new Error('Expected no batch-replace dialog, but one appeared')
  }
}

function dialogCheckboxes(dialog: HTMLDialogElement): HTMLInputElement[] {
  return Array.from(dialog.querySelectorAll('input[type="checkbox"]'))
}

function dialogPreviewTexts(dialog: HTMLDialogElement): string[] {
  return Array.from(dialog.querySelectorAll('label span:last-child'))
    .map(el => (el as HTMLElement).textContent ?? '')
    .filter(Boolean)
}

function clickDialogButton(dialog: HTMLDialogElement, label: string): void {
  const buttons = Array.from(dialog.querySelectorAll('button'))
  const btn = buttons.find(b => (b.textContent ?? '').trim() === label)
  if (!btn) throw new Error(`Button "${label}" not found in dialog`)
  ;(btn as HTMLButtonElement).click()
}

function getComFile(): { name: string; content: string } | null {
  const files = window.desktopFiles?.getFiles?.() || {}
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith('.com') || name.endsWith('.components')) {
      return { name, content: String(content) }
    }
  }
  return null
}

function getTokFile(): { name: string; content: string } | null {
  const files = window.desktopFiles?.getFiles?.() || {}
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith('.tok') || name.endsWith('.tokens')) {
      return { name, content: String(content) }
    }
  }
  return null
}

function currentEditorText(): string {
  const editor = window.editor
  if (!editor) throw new Error('Editor not found')
  return editor.state.doc.toString()
}

function countOccurrences(text: string, pattern: string): number {
  let count = 0
  let pos = text.indexOf(pattern)
  while (pos !== -1) {
    count++
    pos = text.indexOf(pattern, pos + 1)
  }
  return count
}

// ---------------------------------------------------------------------------
// Phase A: Component-Extract Batch-Replace
// ---------------------------------------------------------------------------

const phaseATests: TestCase[] = [
  testWithSetup(
    'Phase A: dialog appears when project has matching frames',
    `Frame pad 12, bg #1a1a1a, rad 8
  Text "Alpha"

Frame pad 12, bg #1a1a1a, rad 8
  Text "Beta"

Frame pad 12, bg #1a1a1a, rad 8
  Text "Gamma"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'Card',
        properties: ' pad 12, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 12, bg #1a1a1a, rad 8', // first occurrence
      })

      const dialog = await waitForDialog(api)

      // Expect 2 exact matches (the other two Frames; target is skipped).
      const cbs = dialogCheckboxes(dialog)
      if (cbs.length !== 2) {
        throw new Error(`Expected 2 checkboxes, got ${cbs.length}`)
      }
      // All exact-match checkboxes default checked.
      if (!cbs.every(cb => cb.checked)) {
        throw new Error('Expected all exact-match checkboxes to default checked')
      }

      clickDialogButton(dialog, 'Anwenden')
      await api.utils.delay(200)

      // Editor should now have THREE Card instances (target + 2 batch replaces),
      // and ZERO `Frame pad 12` style lines.
      const finalCode = currentEditorText()
      const cardLines = finalCode.split('\n').filter(l => /^\s*Card\s*$/.test(l))
      if (cardLines.length !== 3) {
        throw new Error(`Expected 3 plain Card instances, got ${cardLines.length}\n${finalCode}`)
      }
      if (finalCode.includes('Frame pad 12, bg #1a1a1a, rad 8')) {
        throw new Error('Old Frame styling still present after batch-apply')
      }

      // The .com file should have one Card definition.
      const com = getComFile()
      if (!com) throw new Error('No components file created')
      if (!/^Card\s*:\s*pad 12,\s*bg #1a1a1a,\s*rad 8/m.test(com.content)) {
        throw new Error(`Card definition missing or malformed:\n${com.content}`)
      }
    }
  ),

  testWithSetup(
    'Phase A: opt-out — unchecked match stays unchanged',
    `Frame pad 12, bg #1a1a1a, rad 8
Frame pad 12, bg #1a1a1a, rad 8
Frame pad 12, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'Card',
        properties: ' pad 12, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 12, bg #1a1a1a, rad 8',
      })

      const dialog = await waitForDialog(api)
      const cbs = dialogCheckboxes(dialog)
      if (cbs.length !== 2) {
        throw new Error(`Expected 2 checkboxes, got ${cbs.length}`)
      }

      // Uncheck the LAST match — only the first should be batch-replaced.
      cbs[cbs.length - 1].click()
      if (cbs[cbs.length - 1].checked) {
        throw new Error('Could not uncheck the second match')
      }

      clickDialogButton(dialog, 'Anwenden')
      await api.utils.delay(200)

      const finalCode = currentEditorText()
      // Should have 2 Card instances (target + first batch) and 1 Frame still.
      const cardCount = countOccurrences(finalCode, 'Card')
      const frameCount = (finalCode.match(/^Frame pad 12, bg #1a1a1a, rad 8$/gm) || []).length
      if (cardCount !== 2) {
        throw new Error(`Expected 2 Card instances, got ${cardCount}\n${finalCode}`)
      }
      if (frameCount !== 1) {
        throw new Error(`Expected 1 leftover Frame, got ${frameCount}\n${finalCode}`)
      }
    }
  ),

  testWithSetup(
    'Phase A: cancel — original extraction kept, other matches untouched',
    `Frame pad 12, bg #1a1a1a, rad 8
Frame pad 12, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'Card',
        properties: ' pad 12, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 12, bg #1a1a1a, rad 8',
      })

      const dialog = await waitForDialog(api)
      clickDialogButton(dialog, 'Abbrechen')
      await api.utils.delay(200)

      const finalCode = currentEditorText()
      // Original extraction stays (line 1 is now `Card`), but line 2 still Frame.
      const lines = finalCode.split('\n')
      if (!/^Card\s*$/.test(lines[0])) {
        throw new Error(`Line 0 should be Card, got: "${lines[0]}"`)
      }
      if (!lines[1].includes('Frame pad 12, bg #1a1a1a, rad 8')) {
        throw new Error(`Line 1 should still be the Frame, got: "${lines[1]}"`)
      }

      // .com file should still have the Card definition (extract did happen).
      const com = getComFile()
      if (!com || !com.content.includes('Card:')) {
        throw new Error('Card definition should be in .com (cancel only skips batch, not extract)')
      }
    }
  ),

  testWithSetup(
    'Phase A: no other matches → no dialog appears',
    `Frame pad 12, bg #1a1a1a, rad 8
Frame w 100, h 50, bg #fff`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'UniqueCard',
        properties: ' pad 12, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 12, bg #1a1a1a, rad 8',
      })

      // Other Frame has different properties → no match → no dialog.
      await expectNoDialog(api)

      // Extraction itself still happened.
      const finalCode = currentEditorText()
      if (!finalCode.includes('UniqueCard')) {
        throw new Error('Extraction did not produce instance')
      }
    }
  ),
]

// ---------------------------------------------------------------------------
// Phase B: Token-Extract Segment Batch-Replace
// ---------------------------------------------------------------------------

const phaseBTests: TestCase[] = [
  testWithSetup(
    'Phase B: dialog appears with bg #2271C1 segments',
    `Frame bg #2271C1, w 100, h 50
Btn pad 10, bg #2271C1, col white
Text col #2271C1
Card bg #2271C1, rad 8`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Build `bg primary::#2271C1` on first line.
      const editor = window.editor!
      const code = editor.state.doc.toString()
      const searchPos = code.indexOf('bg #2271C1')
      editor.dispatch({
        changes: {
          from: searchPos,
          to: searchPos + 'bg #2271C1'.length,
          insert: 'bg primary:#2271C1',
        },
        selection: { anchor: searchPos + 'bg primary:'.length },
      })
      await api.utils.delay(50)

      // Insert second `:` to trigger extraction.
      const colonPos = editor.state.doc.toString().indexOf('bg primary:') + 'bg primary:'.length
      editor.dispatch({
        changes: { from: colonPos, to: colonPos, insert: ':' },
        selection: { anchor: colonPos + 1 },
      })
      await api.utils.delay(250)

      const dialog = await waitForDialog(api)
      const cbs = dialogCheckboxes(dialog)

      // Target line skipped. Lines 2 + 4 have `bg #2271C1` → match.
      // Line 3 has `col #2271C1` → different property → NOT a match.
      if (cbs.length !== 2) {
        throw new Error(`Expected 2 segment matches, got ${cbs.length}`)
      }

      // Sanity-check preview text doesn't include `col #2271C1`.
      const previews = dialogPreviewTexts(dialog).join('\n')
      if (previews.includes('col #2271C1')) {
        throw new Error('col #2271C1 should NOT be in matches (different property)')
      }

      clickDialogButton(dialog, 'Anwenden')
      await api.utils.delay(200)

      const finalCode = currentEditorText()
      // All four `bg #2271C1` should now be `bg $primary` (target + 2 matches; line 3 untouched).
      const bgPrimaryCount = countOccurrences(finalCode, 'bg $primary')
      if (bgPrimaryCount !== 3) {
        throw new Error(`Expected 3 bg $primary refs, got ${bgPrimaryCount}\n${finalCode}`)
      }
      // col #2271C1 stays.
      if (!finalCode.includes('col #2271C1')) {
        throw new Error('col #2271C1 should be untouched')
      }

      // .tok file has primary.bg.
      const tok = getTokFile()
      if (!tok || !/^primary\.bg\s*:\s*#2271C1/m.test(tok.content)) {
        throw new Error(`primary.bg token not in .tok:\n${tok?.content ?? '(no .tok file)'}`)
      }
    }
  ),

  testWithSetup(
    'Phase B: no other bg #XXX → no dialog (just local extract)',
    `Frame bg #2271C1, w 100, h 50`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const editor = window.editor!
      const code = editor.state.doc.toString()
      const searchPos = code.indexOf('bg #2271C1')
      editor.dispatch({
        changes: {
          from: searchPos,
          to: searchPos + 'bg #2271C1'.length,
          insert: 'bg primary:#2271C1',
        },
      })
      await api.utils.delay(50)

      const colonPos = editor.state.doc.toString().indexOf('bg primary:') + 'bg primary:'.length
      editor.dispatch({
        changes: { from: colonPos, to: colonPos, insert: ':' },
      })
      await api.utils.delay(250)

      await expectNoDialog(api)

      // Local extract still happened.
      const finalCode = currentEditorText()
      if (!finalCode.includes('bg $primary')) {
        throw new Error('Local extract did not produce $primary reference')
      }
    }
  ),
]

// ---------------------------------------------------------------------------
// Phase C: Near-Match Override Mode
// ---------------------------------------------------------------------------

const phaseCTests: TestCase[] = [
  testWithSetup(
    'Phase C: near-match section appears with default-unchecked overrides',
    `Frame pad 16, bg #1a1a1a, rad 8
  Text "Default"
Frame pad 16, bg #2271C1, rad 8
  Text "Primary"
Frame pad 16, bg #ef4444, rad 8
  Text "Danger"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'Card',
        properties: ' pad 16, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 16, bg #1a1a1a, rad 8',
      })

      const dialog = await waitForDialog(api)
      const cbs = dialogCheckboxes(dialog)

      // Two near-matches (different bg colors). No exact matches besides target.
      if (cbs.length !== 2) {
        throw new Error(`Expected 2 near-match checkboxes, got ${cbs.length}`)
      }
      // Near-matches default UNchecked (opt-in).
      if (cbs.every(cb => cb.checked)) {
        throw new Error('Near-matches should default unchecked')
      }

      // Preview text should include the override-projection.
      const previews = dialogPreviewTexts(dialog).join('\n')
      if (!previews.includes('→')) {
        throw new Error(`Near-match preview should include "→" arrow:\n${previews}`)
      }
      if (!previews.includes('Card bg #2271C1') && !previews.includes('Card bg #ef4444')) {
        throw new Error(`Override preview missing target component name:\n${previews}`)
      }

      clickDialogButton(dialog, 'Abbrechen')
      await api.utils.delay(200)

      // After cancel: original extracts to Card; near-matches stay as Frame.
      const finalCode = currentEditorText()
      if (!finalCode.includes('Frame pad 16, bg #2271C1, rad 8')) {
        throw new Error('Near-match should be unchanged after cancel')
      }
      if (!finalCode.includes('Frame pad 16, bg #ef4444, rad 8')) {
        throw new Error('Near-match should be unchanged after cancel')
      }
    }
  ),

  testWithSetup(
    'Phase C: opt-in a near-match → replaced with override',
    `Frame pad 16, bg #1a1a1a, rad 8
Frame pad 16, bg #2271C1, rad 8`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'Card',
        properties: ' pad 16, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 16, bg #1a1a1a, rad 8',
      })

      const dialog = await waitForDialog(api)
      const cbs = dialogCheckboxes(dialog)
      if (cbs.length !== 1) {
        throw new Error(`Expected 1 near-match, got ${cbs.length}`)
      }

      // Opt-in.
      cbs[0].click()
      if (!cbs[0].checked) {
        throw new Error('Could not check near-match opt-in')
      }

      clickDialogButton(dialog, 'Anwenden')
      await api.utils.delay(200)

      const finalCode = currentEditorText()
      if (!/^Card$/m.test(finalCode)) {
        throw new Error(`Target line should be plain Card:\n${finalCode}`)
      }
      if (!/^Card bg #2271C1$/m.test(finalCode)) {
        throw new Error(`Near-match line should be "Card bg #2271C1":\n${finalCode}`)
      }
    }
  ),

  testWithSetup(
    'Phase C: dialog header shows both counts (exact + near)',
    `Frame pad 16, bg #1a1a1a, rad 8
Frame pad 16, bg #1a1a1a, rad 8
Frame pad 16, bg #2271C1, rad 8`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await typeDoubleColon(api, {
        name: 'Card',
        properties: ' pad 16, bg #1a1a1a, rad 8',
        searchFor: 'Frame pad 16, bg #1a1a1a, rad 8',
      })

      const dialog = await waitForDialog(api)
      // 1 exact + 1 near
      const cbs = dialogCheckboxes(dialog)
      if (cbs.length !== 2) {
        throw new Error(`Expected 1 exact + 1 near = 2 checkboxes, got ${cbs.length}`)
      }
      // First (exact) checked, second (near) unchecked.
      if (!cbs[0].checked) {
        throw new Error('Exact match should default checked')
      }
      if (cbs[1].checked) {
        throw new Error('Near match should default unchecked')
      }

      // Header text should reference both sections.
      const header = dialog.querySelector('div')!.textContent ?? ''
      if (!/Exakt|exakt/.test(header) || !/ähnlich|Ähnlich/.test(header)) {
        throw new Error(`Header should mention both exact + near sections:\n${header}`)
      }

      clickDialogButton(dialog, 'Abbrechen')
      await api.utils.delay(200)
    }
  ),
]

// ---------------------------------------------------------------------------
// Export — register with categories
// ---------------------------------------------------------------------------

export const batchReplaceTests: TestCase[] = describe('Batch-Replace on Extract (:: trigger)', [
  ...phaseATests,
  ...phaseBTests,
  ...phaseCTests,
])
