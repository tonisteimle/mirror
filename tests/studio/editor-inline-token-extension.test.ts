// @vitest-environment jsdom
/**
 * Tests for studio/editor/inline-token-extension.ts
 *
 * Module was 0% covered. The extension watches Enter key in the editor.
 * When the cursor line ends with `$name: value`, it:
 *   1. Rewrites the line to `$name` (replacing the inline definition).
 *   2. Persists `$name: value` to tokens.tok (creates if missing,
 *      updates in-place if `$name:` already exists).
 *   3. Shows a 2-second status message.
 *
 * Defers to the unified TriggerManager when any picker is open.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createInlineTokenExtension } from '../../studio/editor/inline-token-extension'
import {
  getTriggerManager,
  createTriggerManager,
  setTriggerManager,
} from '../../studio/editor/trigger-manager'

let parent: HTMLDivElement
let view: EditorView
let writeFile: ReturnType<typeof vi.fn>
let files: Record<string, string>

beforeEach(() => {
  parent = document.createElement('div')
  document.body.appendChild(parent)

  // Status element used by the success-feedback path.
  document.body.innerHTML += '<div id="status" class="status">Ready</div>'

  files = {}
  writeFile = vi.fn((path: string, content: string) => {
    files[path] = content
  })

  setTriggerManager(createTriggerManager())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  view?.destroy()
  parent.remove()
  document.getElementById('status')?.remove()
  getTriggerManager().dispose()
})

function makeView(initialDoc: string) {
  const state = EditorState.create({
    doc: initialDoc,
    extensions: [
      createInlineTokenExtension({
        getFiles: () => files,
        writeFile,
      }),
    ],
  })
  view = new EditorView({ state, parent })
  return view
}

function pressEnter(view: EditorView): boolean {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  })
  return view.contentDOM.dispatchEvent(event)
}

// =============================================================================
// Happy path
// =============================================================================

describe('createInlineTokenExtension — happy path', () => {
  it('rewrites "bg $surface: #333" → "bg $surface" and creates tokens.tok', () => {
    makeView('bg $surface: #333')
    // Cursor at end of line
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(view.state.doc.toString()).toBe('bg $surface\n')
    // tokens.tok was created with the seed and the new definition.
    expect(writeFile).toHaveBeenCalled()
    // Final state of files['tokens.tok'] reflects all writes (seed + add).
    expect(files['tokens.tok']).toContain('$surface: #333')
  })

  it('preserves prefix content (only the matched inline def is replaced)', () => {
    makeView('Frame bg $primary: #2271C1')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(view.state.doc.toString()).toBe('Frame bg $primary\n')
  })

  it('handles dotted token names (e.g. "$spacing.md: 8")', () => {
    makeView('pad $spacing.md: 8')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(view.state.doc.toString()).toBe('pad $spacing.md\n')
    expect(files['tokens.tok']).toContain('$spacing.md: 8')
  })
})

// =============================================================================
// tokens.tok management
// =============================================================================

describe('tokens.tok — create / update', () => {
  it('seeds a fresh tokens.tok with header comment when missing', () => {
    makeView('bg $a: #fff')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    // First write seeds the file with the design-tokens header.
    const seedCall = writeFile.mock.calls.find(c => c[1] === '// Design Tokens\n')
    expect(seedCall).toBeDefined()
    // Final state contains both the seed AND the new token.
    expect(files['tokens.tok']).toContain('// Design Tokens')
    expect(files['tokens.tok']).toContain('$a: #fff')
  })

  it('appends a new token to an existing tokens.tok', () => {
    files['tokens.tok'] = '// Design Tokens\n$existing: #000\n'
    makeView('bg $new: #111')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    const tok = files['tokens.tok']
    expect(tok).toContain('$existing: #000')
    expect(tok).toContain('$new: #111')
  })

  it('UPDATES an existing token in-place (no duplicate definitions)', () => {
    files['tokens.tok'] = '// Design Tokens\n$primary: #old\n'
    makeView('bg $primary: #new')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    const tok = files['tokens.tok']
    expect(tok).toContain('$primary: #new')
    expect(tok).not.toContain('#old')
    // No duplicate $primary lines.
    expect(tok.match(/\$primary:/g)?.length).toBe(1)
  })
})

// =============================================================================
// Edge cases — when NOT to fire
// =============================================================================

describe('does NOT fire on…', () => {
  it('non-Enter keys', () => {
    makeView('bg $surface: #333')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true })
    view.contentDOM.dispatchEvent(event)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('lines that do NOT match the inline-token pattern', () => {
    makeView('Frame gap 12')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('token names that do NOT start with a letter', () => {
    makeView('bg $1invalid: #fff')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('inline definitions with empty values', () => {
    makeView('bg $surface:')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('when ANY picker is open (defers to TriggerManager)', () => {
    // Force the TriggerManager into open state.
    const mgr = getTriggerManager() as unknown as { isOpen: () => boolean }
    mgr.isOpen = () => true

    makeView('bg $surface: #333')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    // Listener returns false → no rewrite, no file write.
    expect(view.state.doc.toString()).toBe('bg $surface: #333')
    expect(writeFile).not.toHaveBeenCalled()
  })
})

// =============================================================================
// Status feedback
// =============================================================================

describe('status feedback', () => {
  it('shows "Token created" message in #status, reverts to "Ready" after 2s', () => {
    makeView('bg $surface: #333')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)

    const statusEl = document.getElementById('status')!
    expect(statusEl.textContent).toContain("'$surface'")
    expect(statusEl.className).toBe('status ok')

    // After 2s the message reverts.
    vi.advanceTimersByTime(2000)
    expect(statusEl.textContent).toBe('Ready')
  })

  it('does not throw when #status element is missing', () => {
    document.getElementById('status')?.remove()
    expect(() => {
      makeView('bg $a: 1')
      view.dispatch({ selection: { anchor: view.state.doc.length } })
      pressEnter(view)
    }).not.toThrow()
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  it('M1: tokens-file UPDATE branch — same name re-defined NOT duplicated', () => {
    // Catches a mutation that drops the regex-replace branch.
    files['tokens.tok'] = '$primary: #old\n'
    makeView('bg $primary: #new')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(files['tokens.tok'].match(/\$primary:/g)?.length).toBe(1)
  })

  it('M2: token-name letter-start guard — names starting with digit are REJECTED', () => {
    // Catches a mutation that drops the letter-start check.
    makeView('bg $9bad: #fff')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(writeFile).not.toHaveBeenCalled()
  })

  it('M3: TriggerManager open-gate — extension is silenced when picker is open', () => {
    const mgr = getTriggerManager() as unknown as { isOpen: () => boolean }
    mgr.isOpen = () => true
    makeView('bg $x: #1')
    view.dispatch({ selection: { anchor: view.state.doc.length } })
    pressEnter(view)
    expect(writeFile).not.toHaveBeenCalled()
  })
})
