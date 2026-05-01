/**
 * Tests for studio/editor/ghost-diff.ts
 *
 * Pure StateField + decoration logic. Browser-Test (DOM-Render) ist separat;
 * hier testen wir den Field-State und die Decoration-Bauung gegen ein
 * EditorState ohne View.
 *
 * Siehe: docs/concepts/llm-edit-flow-test-concept.md § 3.1 (ghost-diff)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  ghostDiffField,
  setGhostDiffEffect,
  clearGhostDiffEffect,
  buildGhostDecorations,
  ghostDiffExtension,
  setGhostDiff,
  clearGhostDiff,
  isGhostActive,
} from '../../studio/editor/ghost-diff'

function stateFor(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [ghostDiffField] })
}

describe('GhostDiff — StateField', () => {
  it('starts inactive with empty source pair', () => {
    const s = stateFor('Frame gap 12')
    const ghost = s.field(ghostDiffField)
    expect(ghost.active).toBe(false)
    expect(ghost.baseSource).toBe('')
    expect(ghost.newSource).toBe('')
  })

  it('activates after setGhostDiffEffect', () => {
    const s = stateFor('Frame gap 12')
    const next = s.update({
      effects: setGhostDiffEffect.of({
        baseSource: 'Frame gap 12',
        newSource: 'Frame gap 16',
      }),
    }).state
    const ghost = next.field(ghostDiffField)
    expect(ghost.active).toBe(true)
    expect(ghost.baseSource).toBe('Frame gap 12')
    expect(ghost.newSource).toBe('Frame gap 16')
  })

  it('deactivates after clearGhostDiffEffect', () => {
    let s = stateFor('Frame gap 12')
    s = s.update({
      effects: setGhostDiffEffect.of({
        baseSource: 'A',
        newSource: 'B',
      }),
    }).state
    s = s.update({ effects: clearGhostDiffEffect.of(undefined) }).state
    const ghost = s.field(ghostDiffField)
    expect(ghost.active).toBe(false)
    expect(ghost.baseSource).toBe('')
    expect(ghost.newSource).toBe('')
  })

  it('auto-discards on a direct doc edit while ghost is active (T4.4)', () => {
    let s = stateFor('Frame gap 12')
    s = s.update({
      effects: setGhostDiffEffect.of({
        baseSource: 'Frame gap 12',
        newSource: 'Frame gap 16',
      }),
    }).state
    expect(s.field(ghostDiffField).active).toBe(true)
    // Plain doc-changing transaction — no ghost effect. The user typed.
    s = s.update({
      changes: { from: 0, to: 0, insert: 'X' },
    }).state
    const ghost = s.field(ghostDiffField)
    expect(ghost.active).toBe(false)
    expect(ghost.baseSource).toBe('')
    expect(ghost.newSource).toBe('')
  })

  it('preserves state across unrelated transactions that do NOT change the doc', () => {
    let s = stateFor('Frame gap 12')
    s = s.update({
      effects: setGhostDiffEffect.of({
        baseSource: 'Frame gap 12',
        newSource: 'Frame gap 16',
      }),
    }).state
    // Selection-only transaction — no docChanged. Ghost survives.
    s = s.update({
      selection: { anchor: 0 },
    }).state
    const ghost = s.field(ghostDiffField)
    expect(ghost.active).toBe(true)
    expect(ghost.newSource).toBe('Frame gap 16')
  })

  it('does not auto-discard when the doc change is the accept (carries clearGhostDiffEffect)', () => {
    let s = stateFor('Frame gap 12')
    s = s.update({
      effects: setGhostDiffEffect.of({
        baseSource: 'Frame gap 12',
        newSource: 'Frame gap 16',
      }),
    }).state
    // accept = doc replace + clearGhostDiffEffect in the same dispatch.
    s = s.update({
      changes: { from: 0, to: s.doc.length, insert: 'Frame gap 16' },
      effects: clearGhostDiffEffect.of(undefined),
    }).state
    const ghost = s.field(ghostDiffField)
    expect(ghost.active).toBe(false)
  })
})

describe('GhostDiff — buildGhostDecorations', () => {
  it('returns empty decoration set for identical sources', () => {
    const doc = EditorState.create({ doc: 'A\nB\nC' }).doc
    const decos = buildGhostDecorations('A\nB\nC', 'A\nB\nC', doc)
    expect(decos.size).toBe(0)
  })

  it('marks a single removed line with the cm-ghost-removed class', () => {
    const base = 'A\nB\nC'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'A\nC', doc)
    const list = decosToArray(decos)
    const removed = list.filter(d => d.spec.class === 'cm-ghost-removed')
    expect(removed.length).toBe(1)
    // "B" is line 2 (1-indexed)
    expect(doc.lineAt(removed[0].from).number).toBe(2)
  })

  it('emits a block-widget for a pure addition', () => {
    const base = 'A\nC'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'A\nB\nC', doc)
    const list = decosToArray(decos)
    const widgets = list.filter(d => d.spec.widget)
    expect(widgets.length).toBe(1)
    // Widget anchor is end of line 1 (after "A", before "C")
    expect(widgets[0].from).toBe(doc.line(1).to)
  })

  it('combines strike + widget for a changed line', () => {
    const base = 'A\nB\nC'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'A\nX\nC', doc)
    const list = decosToArray(decos)
    expect(list.filter(d => d.spec.class === 'cm-ghost-removed').length).toBe(1)
    expect(list.filter(d => d.spec.widget).length).toBe(1)
  })

  it('handles addition at end of file', () => {
    const base = 'A\nB'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'A\nB\nC', doc)
    const list = decosToArray(decos)
    const widgets = list.filter(d => d.spec.widget)
    expect(widgets.length).toBe(1)
    expect(widgets[0].from).toBe(doc.length)
  })

  it('handles addition at start of file', () => {
    const base = 'A\nB'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'X\nA\nB', doc)
    const list = decosToArray(decos)
    const widgets = list.filter(d => d.spec.widget)
    expect(widgets.length).toBe(1)
    expect(widgets[0].from).toBe(0)
  })

  it('handles multiple non-adjacent hunks', () => {
    const base = 'A\nB\nC\nD\nE'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'A\nX\nC\nY\nE', doc)
    const list = decosToArray(decos)
    expect(list.filter(d => d.spec.class === 'cm-ghost-removed').length).toBe(2)
    expect(list.filter(d => d.spec.widget).length).toBe(2)
  })

  it('handles empty base (full insert)', () => {
    const doc = EditorState.create({ doc: '' }).doc
    const decos = buildGhostDecorations('', 'A\nB', doc)
    const list = decosToArray(decos)
    expect(list.filter(d => d.spec.widget).length).toBe(1)
  })

  it('handles full replacement (everything removed, everything added)', () => {
    const base = 'A\nB'
    const doc = EditorState.create({ doc: base }).doc
    const decos = buildGhostDecorations(base, 'X\nY', doc)
    const list = decosToArray(decos)
    expect(list.filter(d => d.spec.class === 'cm-ghost-removed').length).toBe(2)
    expect(list.filter(d => d.spec.widget).length).toBe(1)
  })
})

describe('GhostDiff — EditorView integration', () => {
  function makeView(doc: string): EditorView {
    const parent = document.createElement('div')
    document.body.appendChild(parent)
    const state = EditorState.create({
      doc,
      extensions: [ghostDiffExtension()],
    })
    return new EditorView({ state, parent })
  }

  it('setGhostDiff/clearGhostDiff cycle through view.dispatch', () => {
    const view = makeView('Frame gap 12')
    expect(isGhostActive(view.state)).toBe(false)
    setGhostDiff(view, 'Frame gap 12', 'Frame gap 16')
    expect(isGhostActive(view.state)).toBe(true)
    clearGhostDiff(view)
    expect(isGhostActive(view.state)).toBe(false)
    view.destroy()
  })

  it('renders a green added-line widget in the DOM when active', () => {
    const view = makeView('Frame gap 12')
    setGhostDiff(view, 'Frame gap 12', 'Frame gap 12\nText "X"')
    // Force layout pass.
    view.requestMeasure()
    const added = view.dom.querySelector('.cm-ghost-added')
    expect(added).not.toBeNull()
    const line = added?.querySelector('.cm-ghost-added-line')
    expect(line?.textContent).toContain('Text "X"')
    view.destroy()
  })

  it('renders no ghost decorations after clear', () => {
    const view = makeView('A\nB')
    setGhostDiff(view, 'A\nB', 'A\nC')
    view.requestMeasure()
    expect(view.dom.querySelector('.cm-ghost-removed')).not.toBeNull()
    clearGhostDiff(view)
    view.requestMeasure()
    expect(view.dom.querySelector('.cm-ghost-removed')).toBeNull()
    expect(view.dom.querySelector('.cm-ghost-added')).toBeNull()
    view.destroy()
  })
})

// ============================================================
// Helpers
// ============================================================

interface FlatDeco {
  from: number
  to: number
  spec: { class?: string; widget?: unknown }
}

/** Flatten an opaque DecorationSet into a sorted array we can assert against. */
function decosToArray(decos: unknown): FlatDeco[] {
  const out: FlatDeco[] = []

  ;(decos as any).between(0, Number.MAX_SAFE_INTEGER, (from: number, to: number, value: any) => {
    out.push({ from, to, spec: value.spec })
  })
  return out
}
