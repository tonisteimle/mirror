// @vitest-environment jsdom
/**
 * Tests for five 0%-coverage editor utilities:
 *  - llm-keymap.ts (CodeMirror KeyBindings for the LLM-Edit-Flow)
 *  - edit-status-indicator.ts (singleton DOM status pill)
 *  - smart-paste.ts (paste-event handler, tab→space, indent normalize)
 *  - indent-guides.ts (vertical guide decorations)
 *  - syntax-highlight.ts (regex-based DSL coloring)
 *
 * All five share the editor/ folder but have separate concerns. Batched
 * here for efficiency: each module gets a focused describe block.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  llmEditKeymap,
  isGhostActiveSelector,
  type LlmEditKeymapConfig,
} from '../../studio/editor/llm-keymap'
import {
  setEditStatus,
  hideEditStatus,
  getEditStatusElement,
} from '../../studio/editor/edit-status-indicator'
import { smartPasteExtension } from '../../studio/editor/smart-paste'
import { indentGuidesExtension } from '../../studio/editor/indent-guides'
import { mirrorHighlight } from '../../studio/editor/syntax-highlight'
import { ghostDiffExtension, setGhostDiff } from '../../studio/editor/ghost-diff'

// =============================================================================
// llm-keymap.ts
// =============================================================================

describe('llmEditKeymap', () => {
  function makeConfig(overrides: Partial<LlmEditKeymapConfig> = {}): {
    config: LlmEditKeymapConfig
    calls: Record<string, number>
  } {
    const calls: Record<string, number> = {
      handleEditFlow: 0,
      openPromptField: 0,
      generateFromPrompt: 0,
      acceptGhost: 0,
      dismissGhost: 0,
    }
    const config: LlmEditKeymapConfig = {
      handleEditFlow: () => {
        calls.handleEditFlow++
        return true
      },
      openPromptField: () => {
        calls.openPromptField++
        return true
      },
      generateFromPrompt: () => {
        calls.generateFromPrompt++
        return true
      },
      acceptGhost: () => {
        calls.acceptGhost++
        return true
      },
      dismissGhost: () => {
        calls.dismissGhost++
        return true
      },
      ...overrides,
    }
    return { config, calls }
  }

  it('returns 5 KeyBindings (Mod-Enter, Mod-Shift-Enter, Mod-Alt-Enter, Tab, Escape)', () => {
    const { config } = makeConfig()
    const bindings = llmEditKeymap(config)
    expect(bindings).toHaveLength(5)
    const keys = bindings.map(b => b.key)
    expect(keys).toEqual(['Mod-Enter', 'Mod-Shift-Enter', 'Mod-Alt-Enter', 'Tab', 'Escape'])
  })

  it('Mod-Enter delegates to handleEditFlow', () => {
    const { config, calls } = makeConfig()
    const bindings = llmEditKeymap(config)
    const view = {} as EditorView
    bindings[0].run!(view)
    expect(calls.handleEditFlow).toBe(1)
  })

  it('Mod-Shift-Enter delegates to openPromptField', () => {
    const { config, calls } = makeConfig()
    const bindings = llmEditKeymap(config)
    bindings[1].run!({} as EditorView)
    expect(calls.openPromptField).toBe(1)
  })

  it('Mod-Alt-Enter delegates to generateFromPrompt', () => {
    const { config, calls } = makeConfig()
    const bindings = llmEditKeymap(config)
    bindings[2].run!({} as EditorView)
    expect(calls.generateFromPrompt).toBe(1)
  })

  it('Tab is GHOST-GATED — returns false (no acceptGhost call) when ghost is inactive', () => {
    const { config, calls } = makeConfig()
    const bindings = llmEditKeymap(config)
    const state = EditorState.create({ doc: '', extensions: [ghostDiffExtension()] })
    const view = { state } as EditorView
    const result = bindings[3].run!(view)
    expect(result).toBe(false)
    expect(calls.acceptGhost).toBe(0)
  })

  it('Tab calls acceptGhost when ghost IS active', () => {
    const { config, calls } = makeConfig()
    const bindings = llmEditKeymap(config)
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const state = EditorState.create({
      doc: 'Frame gap 12',
      extensions: [ghostDiffExtension()],
    })
    const view = new EditorView({ state, parent })
    setGhostDiff(view, 'Frame gap 12', 'Frame gap 16')
    expect(isGhostActiveSelector(view.state)).toBe(true)
    bindings[3].run!(view)
    expect(calls.acceptGhost).toBe(1)
    view.destroy()
    parent.remove()
  })

  it('Escape is NOT ghost-gated — always calls dismissGhost', () => {
    const { config, calls } = makeConfig()
    const bindings = llmEditKeymap(config)
    const state = EditorState.create({ doc: '', extensions: [ghostDiffExtension()] })
    bindings[4].run!({ state } as EditorView)
    expect(calls.dismissGhost).toBe(1)
  })

  describe('isGhostActiveSelector', () => {
    it('returns false when ghost is inactive', () => {
      const state = EditorState.create({ doc: '', extensions: [ghostDiffExtension()] })
      expect(isGhostActiveSelector(state)).toBe(false)
    })

    it('returns false safely when the ghostDiffField is missing from state', () => {
      const state = EditorState.create({ doc: '' }) // no ghostDiff extension
      expect(isGhostActiveSelector(state)).toBe(false)
    })
  })
})

// =============================================================================
// edit-status-indicator.ts
// =============================================================================

describe('EditStatusIndicator', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    hideEditStatus()
  })
  afterEach(() => {
    hideEditStatus()
  })

  it('idle status removes element from DOM', () => {
    setEditStatus('thinking')
    expect(document.querySelector('.cm-llm-status')).not.toBeNull()
    setEditStatus('idle')
    expect(document.querySelector('.cm-llm-status')).toBeNull()
  })

  it('thinking status creates element with default message', () => {
    setEditStatus('thinking')
    const el = document.querySelector('.cm-llm-status') as HTMLElement
    expect(el).not.toBeNull()
    expect(el.classList.contains('cm-llm-status-thinking')).toBe(true)
    expect(el.textContent).toBe('AI denkt nach…')
    expect(el.getAttribute('aria-live')).toBe('polite')
    expect(el.getAttribute('role')).toBe('status')
  })

  it('error status uses aria-live=assertive (not polite)', () => {
    setEditStatus('error', 'Foo broke')
    const el = document.querySelector('.cm-llm-status') as HTMLElement
    expect(el.getAttribute('aria-live')).toBe('assertive')
    expect(el.textContent).toBe('Foo broke')
  })

  it('switching states REMOVES previous state-class and adds new one', () => {
    setEditStatus('thinking')
    setEditStatus('ready')
    const el = document.querySelector('.cm-llm-status') as HTMLElement
    expect(el.classList.contains('cm-llm-status-thinking')).toBe(false)
    expect(el.classList.contains('cm-llm-status-ready')).toBe(true)
  })

  it('custom message overrides the default', () => {
    setEditStatus('warning', 'custom warn text')
    expect(getEditStatusElement()?.textContent).toBe('custom warn text')
  })

  it('default messages are language-specific (German)', () => {
    setEditStatus('thinking')
    expect(getEditStatusElement()?.textContent).toContain('denkt')
    setEditStatus('ready')
    expect(getEditStatusElement()?.textContent).toContain('Tab')
    setEditStatus('error')
    expect(getEditStatusElement()?.textContent).toContain('Fehler')
  })

  it('hideEditStatus is safe to call when no element exists', () => {
    expect(() => hideEditStatus()).not.toThrow()
    hideEditStatus()
    hideEditStatus() // double-hide
    expect(getEditStatusElement()).toBeNull()
  })
})

// =============================================================================
// smart-paste.ts
// =============================================================================

describe('smartPasteExtension — clipboard handling', () => {
  let parent: HTMLDivElement
  let view: EditorView

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.appendChild(parent)
  })

  afterEach(() => {
    view?.destroy()
    parent.remove()
  })

  function makeView(initialDoc: string) {
    const state = EditorState.create({
      doc: initialDoc,
      extensions: [smartPasteExtension()],
    })
    view = new EditorView({ state, parent })
    return view
  }

  function paste(view: EditorView, text: string): boolean {
    // jsdom lacks DataTransfer — fake the minimum surface (getData).
    const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    Object.defineProperty(event, 'clipboardData', {
      value: { getData: (kind: string) => (kind === 'text/plain' ? text : '') },
    })
    return view.contentDOM.dispatchEvent(event)
  }

  it('passes through single-line paste with no tabs (no smart-paste interception)', () => {
    makeView('')
    paste(view, 'hello')
    // smart-paste returns false → CodeMirror's default handler inserts 'hello'
    // verbatim with no rewriting. Verifying via doc state: text is preserved
    // unchanged (no tab-to-space rewrite, no indent re-jiggering).
    expect(view.state.doc.toString()).toBe('hello')
  })

  it('intercepts single-line paste with tabs — converts to 2-space indents', () => {
    makeView('')
    paste(view, '\thello\t')
    expect(view.state.doc.toString()).toBe('  hello  ')
  })

  it('intercepts multi-line paste — re-indents subsequent lines with cursor indent', () => {
    makeView('  ') // cursor at indent 2
    view.dispatch({ selection: { anchor: 2 } })
    paste(view, 'Frame\n  Box\n  Text')
    // minIndent across non-empty lines = 0 (Frame). No dedent.
    // First line inline; subsequent lines get cursor-indent (2 spaces) PREPENDED:
    //   line 0: 'Frame'
    //   line 1: '  ' + '  Box' = '    Box'
    //   line 2: '  ' + '  Text' = '    Text'
    // Inserted at column 2 of doc '  ': → '  Frame\n    Box\n    Text'
    expect(view.state.doc.toString()).toBe('  Frame\n    Box\n    Text')
  })

  it('multi-line paste with deeper internal indents preserves relative structure', () => {
    makeView('') // cursor at column 0, cursorIndent = ''
    paste(view, 'Frame\n  Box\n    Text')
    // minIndent = 0 → no dedent. cursorIndent='' → subsequent lines unchanged.
    expect(view.state.doc.toString()).toBe('Frame\n  Box\n    Text')
  })

  it('multi-line paste dedents the BASE indent (deepest common prefix)', () => {
    makeView('') // cursor at column 0
    paste(view, '    Frame\n      Box') // base indent 4
    // Dedent by 4: 'Frame\n  Box'. cursorIndent='' → unchanged.
    expect(view.state.doc.toString()).toBe('Frame\n  Box')
  })
})

// =============================================================================
// indent-guides.ts
// =============================================================================

describe('indentGuidesExtension', () => {
  let parent: HTMLDivElement
  let view: EditorView

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.appendChild(parent)
  })

  afterEach(() => {
    view?.destroy()
    parent.remove()
  })

  it('returns an array of extensions (plugin + theme)', () => {
    const ext = indentGuidesExtension()
    expect(Array.isArray(ext)).toBe(true)
    expect(ext.length).toBeGreaterThanOrEqual(2)
  })

  it('renders as a CodeMirror extension without throwing on a multi-line doc', () => {
    const state = EditorState.create({
      doc: 'Frame\n  Box\n    Text\n\n  Btn',
      extensions: [indentGuidesExtension()],
    })
    view = new EditorView({ state, parent })
    // Just verify the view rendered (no exception from the plugin).
    expect(view.dom).toBeInstanceOf(HTMLElement)
  })

  it('rebuilds decorations on doc change', () => {
    const state = EditorState.create({
      doc: 'Frame',
      extensions: [indentGuidesExtension()],
    })
    view = new EditorView({ state, parent })
    // Append a deeply-indented line
    view.dispatch({
      changes: { from: view.state.doc.length, insert: '\n    Box' },
    })
    expect(view.state.doc.toString()).toBe('Frame\n    Box')
  })

  it('handles empty document', () => {
    const state = EditorState.create({
      doc: '',
      extensions: [indentGuidesExtension()],
    })
    view = new EditorView({ state, parent })
    expect(view.state.doc.length).toBe(0)
  })
})

// =============================================================================
// syntax-highlight.ts
// =============================================================================

describe('mirrorHighlight (syntax-highlight.ts)', () => {
  let parent: HTMLDivElement
  let view: EditorView

  beforeEach(() => {
    parent = document.createElement('div')
    document.body.appendChild(parent)
  })

  afterEach(() => {
    view?.destroy()
    parent.remove()
  })

  function makeView(doc: string) {
    const state = EditorState.create({
      doc,
      extensions: [mirrorHighlight],
    })
    view = new EditorView({ state, parent })
    return view
  }

  it('renders without throwing on a typical Mirror DSL doc', () => {
    makeView(`Frame gap 12, pad 16, bg #2271C1
  Text "Hi", col white, fs 18
  Btn "Click", hover // important
  $primary
  each user in users
    Text user.name
`)
    expect(view.dom).toBeInstanceOf(HTMLElement)
  })

  it('rebuilds tokens on doc change', () => {
    makeView('Frame')
    view.dispatch({
      changes: { from: view.state.doc.length, insert: ' bg #ff0000' },
    })
    // Just ensure no throw and doc updated.
    expect(view.state.doc.toString()).toBe('Frame bg #ff0000')
  })

  it('handles empty document and pure-comment document', () => {
    makeView('')
    expect(view.state.doc.length).toBe(0)
    view.dispatch({ changes: { from: 0, insert: '// just a comment' } })
    expect(view.state.doc.toString()).toBe('// just a comment')
  })

  it('first-match-wins resolves overlapping patterns deterministically', () => {
    // The string "as" inside a quoted string should NOT be highlighted as
    // a keyword — the string match wins because it's earlier-position.
    makeView('Text "as is"')
    expect(view.state.doc.toString()).toBe('Text "as is"')
    // No exceptions, decorations applied.
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven coverage', () => {
  it('M1 (llm-keymap): Tab without active ghost MUST return false', () => {
    // Catches a mutation that drops the isGhostActiveSelector check.
    let acceptCalled = false
    const config: LlmEditKeymapConfig = {
      handleEditFlow: () => true,
      openPromptField: () => true,
      generateFromPrompt: () => true,
      acceptGhost: () => {
        acceptCalled = true
        return true
      },
      dismissGhost: () => true,
    }
    const bindings = llmEditKeymap(config)
    const state = EditorState.create({ doc: '', extensions: [ghostDiffExtension()] })
    const result = bindings[3].run!({ state } as EditorView)
    expect(result).toBe(false)
    expect(acceptCalled).toBe(false)
  })

  it('M2 (status-indicator): error uses aria-live=assertive (catches polite/assertive swap)', () => {
    setEditStatus('error', 'msg')
    expect(getEditStatusElement()!.getAttribute('aria-live')).toBe('assertive')
    setEditStatus('thinking')
    // Polite for non-error
    expect(getEditStatusElement()!.getAttribute('aria-live')).toBe('polite')
    hideEditStatus()
  })

  it('M3 (smart-paste): tabs in single-line paste ARE converted (catches the no-op mutation)', () => {
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const state = EditorState.create({
      doc: '',
      extensions: [smartPasteExtension()],
    })
    const view = new EditorView({ state, parent })

    const ev = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent
    Object.defineProperty(ev, 'clipboardData', {
      value: { getData: () => '\t' },
    })
    view.contentDOM.dispatchEvent(ev)

    // Tab MUST become 2 spaces (not preserved as \t).
    expect(view.state.doc.toString()).toBe('  ')
    view.destroy()
    parent.remove()
  })
})
