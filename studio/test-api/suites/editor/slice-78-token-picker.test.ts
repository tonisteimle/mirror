/**
 * Slice 78 — Token-Picker browser tests (CDP).
 *
 * Quality-Gate (00-plan Schritt 7): the jsdom RTs in
 * `tests/studio/slice-78-token-picker.test.ts` lock the picker's logic, but
 * jsdom doesn't honour CSS or run the studio bundle. These browser tests
 * close the gap by:
 *
 *   - typing `$` in the real editor with property-sets seeded into
 *     tokens.mir, then asserting the picker DOM that pops up
 *   - asserting the section-header is styled (real `getComputedStyle`,
 *     not just class presence)
 *   - asserting click-insertion writes `cardstyle` into the editor
 *
 * Studio bundle must be built (`npm run build:studio`) for these tests to
 * see the new picker code.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

/**
 * Window globals used in this test only. Don't `extends Window` — the
 * narrow `editor` shape conflicts with the full CodeMirror `EditorView`
 * declared globally elsewhere. Cast via `window as unknown as MirrorWindow`.
 */
interface MirrorWindow {
  files: Record<string, string>
  editor: {
    state: { doc: { length: number; toString(): string } }
    dispatch: (transaction: {
      changes?: { from: number; to: number; insert: string }
      selection?: { anchor: number }
    }) => void
    focus(): void
  }
  desktopFiles?: { updateFileCache?: (path: string, content: string) => void }
  switchFile?: (file: string) => void
  getCurrentFile?: () => string
}

/** Wait for any element matching the selector to appear (or time out). */
async function waitFor(selector: string, timeout = 1500): Promise<HTMLElement | null> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector) as HTMLElement | null
    if (el) return el
    await new Promise(r => setTimeout(r, 30))
  }
  return null
}

/** Seed app.mir + tokens.mir with content that exercises both kinds. */
function seedFiles(): void {
  const w = window as unknown as MirrorWindow
  w.files['tokens.mir'] = `primary.bg: #2271C1
danger.bg: #ef4444
accent.bg: $primary
cardstyle: bg #1a1a1a, pad 16, rad 8
heading: fs 18, weight bold, col white
`
  w.files['app.mir'] = `Frame
`
  // Some tests run after a tab swap. Make sure the desktop-files cache stays
  // in sync with window.files so the prelude collector picks the right
  // tokens.mir contents.
  w.desktopFiles?.updateFileCache?.('tokens.mir', w.files['tokens.mir'])
  w.desktopFiles?.updateFileCache?.('app.mir', w.files['app.mir'])
}

/** Drop the editor onto app.mir and load the seeded text into the buffer. */
async function loadAppMir(api: TestAPI): Promise<void> {
  const w = window as unknown as MirrorWindow
  if (w.switchFile && w.getCurrentFile?.() !== 'app.mir') {
    w.switchFile('app.mir')
    await api.utils.waitUntil(() => w.getCurrentFile?.() === 'app.mir', 2000)
  }
  const view = w.editor
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: w.files['app.mir'] },
  })
  view.focus()
}

/**
 * Insert `Frame ` then `$` as two separate dispatches so the trigger-manager
 * actually fires. The token-trigger has `if (insertedText !== trigger.char)
 * return false` (trigger-manager.ts:641) — a one-shot `Frame $` insert is
 * ignored because its inserted text isn't the bare `$` char.
 */
async function typeDollarAfterFrame(): Promise<void> {
  const w = window as unknown as MirrorWindow
  const view = w.editor
  // Reset to a clean buffer first.
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: '' },
  })
  view.focus()
  // Insert the prefix (not a trigger char).
  view.dispatch({
    changes: { from: 0, to: 0, insert: 'Frame ' },
    selection: { anchor: 6 },
  })
  // Now insert the `$` so the trigger sees `insertedText === '$'`.
  view.dispatch({
    changes: { from: 6, to: 6, insert: '$' },
    selection: { anchor: 7 },
  })
  // Picker rendering is synchronous on selection but the BasePicker.show()
  // anchors via getBoundingClientRect → flush a frame to let layout settle.
  await new Promise(r => setTimeout(r, 50))
}

export const slice78TokenPickerTests: TestCase[] = describe('Slice 78 — Token-Picker (browser)', [
  // ---------------------------------------------------------------------------
  // Picker DOM contains property-sets at the right place
  // ---------------------------------------------------------------------------

  test('property-sets render in their own "Style Bundles" section', async (api: TestAPI) => {
    seedFiles()
    await loadAppMir(api)
    await typeDollarAfterFrame()

    const picker = await waitFor('.token-picker')
    if (!picker) throw new Error('Token picker did not open after typing `$`')

    // Section header is present (set + single coexist → header shows)
    const header = picker.querySelector('.token-picker-section-header') as HTMLElement | null
    if (!header) throw new Error('Style Bundles section header not rendered')
    if (header.textContent !== 'Style Bundles') {
      throw new Error(`Section header text: '${header.textContent}', expected 'Style Bundles'`)
    }

    // Set rows present, with the dedicated kind attribute
    const setRows = picker.querySelectorAll('[data-token-kind="set"]')
    if (setRows.length < 2) {
      throw new Error(`Expected ≥2 set rows (cardstyle + heading), got ${setRows.length}`)
    }
    const setNames = Array.from(setRows).map(
      r => r.querySelector('.token-picker-name')?.textContent || ''
    )
    if (!setNames.includes('$cardstyle')) throw new Error('cardstyle missing from picker')
    if (!setNames.includes('$heading')) throw new Error('heading missing from picker')

    // Single-value rows still present
    const singleRows = picker.querySelectorAll('[data-token-kind="single"]')
    if (singleRows.length < 2) {
      throw new Error(`Expected ≥2 single rows, got ${singleRows.length}`)
    }
  }),

  // ---------------------------------------------------------------------------
  // Section header is actually styled (CSS hooked up)
  // ---------------------------------------------------------------------------

  test('section header receives the audit-spec CSS (not a raw browser default)', async (api: TestAPI) => {
    seedFiles()
    await loadAppMir(api)
    await typeDollarAfterFrame()

    const header = (await waitFor('.token-picker-section-header')) as HTMLElement | null
    if (!header) throw new Error('Section header not in DOM')

    const cs = getComputedStyle(header)
    // Audit-spec checks: uppercased + small + bordered top + monospace font column.
    // Don't pin exact values (theme tokens may change), just that *something*
    // beyond the browser default is applied.
    if (cs.textTransform !== 'uppercase') {
      throw new Error(`text-transform: '${cs.textTransform}', expected 'uppercase'`)
    }
    const borderTop = cs.borderTopWidth
    if (borderTop === '' || borderTop === '0px') {
      throw new Error(`border-top-width: '${borderTop}', expected non-zero`)
    }
    if (cs.padding === '' || cs.padding === '0px') {
      throw new Error(`padding: '${cs.padding}', expected non-zero`)
    }
  }),

  // ---------------------------------------------------------------------------
  // Property-set row has no color-swatch (B-2 visual gate)
  // ---------------------------------------------------------------------------

  test('property-set rows do NOT render a color-swatch even when set contains bg', async (api: TestAPI) => {
    seedFiles()
    await loadAppMir(api)
    await typeDollarAfterFrame()

    const picker = (await waitFor('.token-picker')) as HTMLElement | null
    if (!picker) throw new Error('Picker did not open')

    const cardRow = picker.querySelector('[data-token="$cardstyle"]') as HTMLElement | null
    if (!cardRow) throw new Error('cardstyle row missing')

    if (cardRow.querySelector('.token-picker-preview')) {
      throw new Error('Property-set row should not have a color-swatch')
    }

    const value = cardRow.querySelector('.token-picker-value')?.textContent || ''
    if (!value.includes('bg #1a1a1a')) {
      throw new Error(`Property-bag preview missing bg entry: '${value}'`)
    }
  }),

  // ---------------------------------------------------------------------------
  // Chain-token resolved to terminal hex (color-swatch paints)
  // ---------------------------------------------------------------------------

  test('chain-token color-swatch shows the resolved hex, not the literal $primary', async (api: TestAPI) => {
    seedFiles()
    await loadAppMir(api)
    await typeDollarAfterFrame()

    const picker = (await waitFor('.token-picker')) as HTMLElement | null
    if (!picker) throw new Error('Picker did not open')

    const accentRow = picker.querySelector('[data-token="$accent.bg"]') as HTMLElement | null
    if (!accentRow) throw new Error('accent.bg row missing')

    const swatch = accentRow.querySelector('.token-picker-preview') as HTMLElement | null
    if (!swatch) throw new Error('accent.bg should have a color-swatch (it resolves to a color)')

    const cs = getComputedStyle(swatch)
    // primary.bg is #2271C1 → rgb(34, 113, 193); the swatch must paint that,
    // not the literal `$primary` string. We assert "blueish" rather than the
    // exact hex to stay robust to colour-system normalization.
    const bg = cs.backgroundColor
    if (!/rgb\(\s*34,\s*113,\s*193\s*\)/.test(bg) && !/#?2271c1/i.test(bg)) {
      throw new Error(`accent.bg swatch background: '${bg}', expected resolved primary color`)
    }
  }),
])
