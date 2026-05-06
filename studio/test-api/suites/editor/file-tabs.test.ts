/**
 * Editor File Tabs Tests
 *
 * Validates the four-tab switcher above the editor (Daten / Tokens /
 * Komponenten / Anwendung). The tabs are 1:1 mapped to four files
 * (data.data / tokens.tok / components.com / app.mir) and clicking one
 * triggers the existing switchFile() flow: save current file, swap to
 * the target file, recompile.
 *
 * Multi-file setup pattern (cf. project/file-switching.test.ts):
 * each test seeds window.files directly and uses the bare test() form
 * — testWithSetup() only loads ONE file into the editor and would
 * leave data.data / tokens.tok / components.com empty.
 */

import { test, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { DEFAULT_PROJECT } from '../../../storage/project-actions'

// =============================================================================
// HELPERS
// =============================================================================

const TAB_FILES = ['data.data', 'tokens.tok', 'components.com', 'app.mir'] as const
const TAB_LABELS = ['Daten', 'Tokens', 'Komponenten', 'Anwendung'] as const

interface MirrorWindow extends Window {
  files: Record<string, string>
  editor: {
    state: { doc: { length: number; toString(): string } }
    dispatch: (transaction: { changes: { from: number; to: number; insert: string } }) => void
  }
  switchFile: (filename: string) => void
  desktopFiles?: { updateFileCache?: (path: string, content: string) => void }
  studio?: { actions: { setPreviewFile: (path: string) => void } }
}

function getTabs(): { label: string; file: string; active: boolean }[] {
  return Array.from(document.querySelectorAll('.editor-file-tab')).map(el => ({
    label: (el.textContent || '').trim(),
    file: (el as HTMLElement).dataset.file || '',
    active: el.classList.contains('active'),
  }))
}

function activeTab(): string {
  const a = document.querySelector('.editor-file-tab.active') as HTMLElement | null
  return a?.dataset.file || ''
}

function clickTab(file: string): void {
  const btn = document.querySelector(
    `.editor-file-tab[data-file="${file}"]`
  ) as HTMLButtonElement | null
  if (!btn) throw new Error(`Tab for file "${file}" not found`)
  btn.click()
}

function getEditorText(): string {
  const cm = document.querySelector('.cm-content') as HTMLElement | null
  return cm?.textContent || ''
}

/**
 * Seed all four files in window.files (and the desktop-files cache,
 * which the prelude collector also reads) so the tab-switcher has real
 * content to swap between. Mirrors the seeding pattern in
 * project/file-switching.test.ts so multi-file behavior is exercised.
 */
function seedAllFour(): void {
  const w = window as unknown as MirrorWindow
  for (const file of TAB_FILES) {
    const content = (DEFAULT_PROJECT as Record<string, string>)[file] ?? ''
    w.files[file] = content
    w.desktopFiles?.updateFileCache?.(file, content)
  }
}

// =============================================================================
// TESTS
// =============================================================================

export const editorFileTabsTests: TestCase[] = describe('Editor File Tabs', [
  // ---------------------------------------------------------------------------
  // Structure: all four tabs present in the right order
  // ---------------------------------------------------------------------------

  test('all four tabs render with the right labels and data-files', async () => {
    const tabs = getTabs()
    if (tabs.length !== 4) throw new Error(`Expected 4 tabs, got ${tabs.length}`)

    for (let i = 0; i < 4; i++) {
      if (tabs[i].label !== TAB_LABELS[i]) {
        throw new Error(`Tab ${i}: label '${tabs[i].label}', expected '${TAB_LABELS[i]}'`)
      }
      if (tabs[i].file !== TAB_FILES[i]) {
        throw new Error(`Tab ${i}: file '${tabs[i].file}', expected '${TAB_FILES[i]}'`)
      }
    }
  }),

  // ---------------------------------------------------------------------------
  // Initial state: exactly one tab is active
  // ---------------------------------------------------------------------------

  test('exactly one tab is active on boot', async () => {
    const activeCount = getTabs().filter(t => t.active).length
    if (activeCount !== 1) {
      throw new Error(`Exactly one tab must be .active, got ${activeCount}`)
    }
  }),

  // ---------------------------------------------------------------------------
  // Click round-trip: each tab swaps active state + editor content
  // ---------------------------------------------------------------------------

  test('clicking the Tokens tab loads tokens.tok into the editor', async (api: TestAPI) => {
    seedAllFour()
    clickTab('tokens.tok')
    await api.utils.waitUntil(() => activeTab() === 'tokens.tok', 2000)

    const text = getEditorText()
    if (!text.includes('primary.bg')) {
      throw new Error(`Editor should show tokens content; got: "${text.slice(0, 120)}"`)
    }
    if (text.includes('Frame name HomeView')) {
      throw new Error(`Tokens tab leaked app.mir content`)
    }
  }),

  test('clicking the Daten tab loads data.data into the editor', async (api: TestAPI) => {
    seedAllFour()
    clickTab('data.data')
    await api.utils.waitUntil(() => activeTab() === 'data.data', 2000)

    const text = getEditorText()
    if (!text.includes('features:')) {
      throw new Error(`Editor should show data content; got: "${text.slice(0, 120)}"`)
    }
  }),

  test('clicking the Komponenten tab loads components.com into the editor', async (api: TestAPI) => {
    seedAllFour()
    clickTab('components.com')
    await api.utils.waitUntil(() => activeTab() === 'components.com', 2000)

    const text = getEditorText()
    if (!text.includes('Card:') && !text.includes('Btn ')) {
      throw new Error(`Editor should show components content; got: "${text.slice(0, 120)}"`)
    }
  }),

  test('switching Daten → Anwendung → Daten preserves the round-trip content', async (api: TestAPI) => {
    seedAllFour()

    clickTab('data.data')
    await api.utils.waitUntil(() => activeTab() === 'data.data', 2000)
    const dataBefore = getEditorText().replace(/\s+/g, '')

    clickTab('app.mir')
    await api.utils.waitUntil(() => activeTab() === 'app.mir', 2000)
    const appText = getEditorText()
    if (!appText.includes('HomeView')) {
      throw new Error(`app.mir should contain HomeView; got: "${appText.slice(0, 120)}"`)
    }

    clickTab('data.data')
    await api.utils.waitUntil(() => activeTab() === 'data.data', 2000)
    const dataAfter = getEditorText().replace(/\s+/g, '')
    if (dataAfter !== dataBefore) {
      throw new Error(
        `Round-trip lost content. before='${dataBefore.slice(0, 80)}' after='${dataAfter.slice(0, 80)}'`
      )
    }
  }),

  // ---------------------------------------------------------------------------
  // Edit persistence: editing tokens + switching + back keeps the edit
  // ---------------------------------------------------------------------------

  test('editing on Tokens tab + switching to Anwendung + back preserves the edit', async (api: TestAPI) => {
    seedAllFour()

    clickTab('tokens.tok')
    await api.utils.waitUntil(() => activeTab() === 'tokens.tok', 2000)

    // Append a fresh token line via setCode so the change goes through
    // the same path as a real edit.
    const tokensBefore = getEditorText()
    await api.editor.setCode(tokensBefore + '\n// edit-marker.col: #ff00ff\n')
    const afterEdit = getEditorText()
    if (!afterEdit.includes('edit-marker.col')) {
      throw new Error('setCode did not stick on Tokens tab')
    }

    clickTab('app.mir')
    await api.utils.waitUntil(() => activeTab() === 'app.mir', 2000)
    if (getEditorText().includes('edit-marker.col')) {
      throw new Error('Tokens edit leaked into app.mir editor view')
    }

    clickTab('tokens.tok')
    await api.utils.waitUntil(() => activeTab() === 'tokens.tok', 2000)
    const reloaded = getEditorText()
    if (!reloaded.includes('edit-marker.col')) {
      throw new Error(
        `Token edit lost on round-trip. Got: "${reloaded.slice(reloaded.length - 120)}"`
      )
    }
  }),

  // ---------------------------------------------------------------------------
  // Files map invariant: all four expected slots stay populated
  // ---------------------------------------------------------------------------

  test('window.files keeps the four expected slots through tab swaps', async (api: TestAPI) => {
    seedAllFour()

    for (const file of TAB_FILES) {
      clickTab(file)
      await api.utils.waitUntil(() => activeTab() === file, 2000)
    }

    const w = window as unknown as MirrorWindow
    const keys = Object.keys(w.files).filter(k => !k.startsWith('playground'))
    const expected = new Set(TAB_FILES as readonly string[])
    const missing = (TAB_FILES as readonly string[]).filter(k => !keys.includes(k))
    const extra = keys.filter(k => !expected.has(k))
    if (missing.length || extra.length) {
      throw new Error(`Files map drift. missing=[${missing.join(',')}] extra=[${extra.join(',')}]`)
    }
  }),

  // ---------------------------------------------------------------------------
  // Preview-redirect invariant: preview never goes blank, even when the
  // editor sits on a non-layout tab (tokens / data / components).
  // ---------------------------------------------------------------------------

  test('preview stays non-empty across all four tabs (preview-redirect invariant)', async (api: TestAPI) => {
    seedAllFour()
    // Force the preview file to app.mir so the redirect logic has a
    // layout to fall back to (matches the real app boot state).
    const w = window as unknown as MirrorWindow
    w.studio?.actions.setPreviewFile('app.mir')

    for (const file of TAB_FILES) {
      clickTab(file)
      await api.utils.waitUntil(() => activeTab() === file, 2000)
      // Wait for the preview to contain something meaningful from the
      // app.mir layout — `HomeView` is the named root in the seeded
      // app.mir (DEFAULT_PROJECT). If preview-redirect works, this
      // string must be present regardless of which file the editor sits on.
      await api.utils.waitUntil(() => {
        const html = document.getElementById('preview')?.innerHTML ?? ''
        return html.includes('HomeView') || html.includes('mirror-id')
      }, 3000)

      const html = document.getElementById('preview')?.innerHTML ?? ''
      if (!html.includes('HomeView') && !html.includes('mirror-id')) {
        throw new Error(
          `Preview blanked on tab '${file}' (innerHTML.length=${html.length}). ` +
            `Expected HomeView from app.mir to be rendered (preview-redirect).`
        )
      }
    }
  }),
])
