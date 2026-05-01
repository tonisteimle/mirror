/**
 * Ghost-Diff Overlay für den LLM-Edit-Flow.
 *
 * Stellt einen vorgeschlagenen neuen Source als visuellen Overlay über
 * den aktuellen Editor-Inhalt dar (rot durchgestrichen für entfernte
 * Zeilen, grüner Block für neue Zeilen). Der Editor-Doc selbst bleibt
 * unverändert bis der User mit Tab akzeptiert.
 *
 * Sequenz:
 *   1. Edit-Flow liefert `proposedSource`.
 *   2. Caller dispatcht `setGhostDiffEffect.of({ baseSource, newSource })`.
 *   3. Field aktiviert; Decorations werden via `EditorView.decorations.compute`
 *      pro State-Änderung neu berechnet.
 *   4. Tab → akzeptieren = view.dispatch({ changes: replace doc with newSource,
 *      effects: clearGhostDiffEffect }) — gehört dem Caller (siehe T3.4).
 *   5. Esc → verwerfen = view.dispatch({ effects: clearGhostDiffEffect }).
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Diff-Ghost),
 *        docs/concepts/llm-edit-flow-plan.md (T3.1)
 */

import { StateField, StateEffect, type Text } from '@codemirror/state'
import { EditorView, Decoration, WidgetType, type DecorationSet } from '@codemirror/view'
import { computeLineDiff } from '../agent/source-diff'

// ============================================================
// State
// ============================================================

export interface GhostDiffState {
  /** Source zum Zeitpunkt der LLM-Anfrage (= aktueller Doc-Inhalt). */
  baseSource: string
  /** Vorgeschlagener Source nach Patch-Apply. */
  newSource: string
  /** Ist der Ghost-Overlay aktiv? */
  active: boolean
}

const INITIAL_STATE: GhostDiffState = {
  baseSource: '',
  newSource: '',
  active: false,
}

export const setGhostDiffEffect = StateEffect.define<{
  baseSource: string
  newSource: string
}>()

export const clearGhostDiffEffect = StateEffect.define<void>()

export const ghostDiffField = StateField.define<GhostDiffState>({
  create() {
    return INITIAL_STATE
  },
  update(state, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setGhostDiffEffect)) {
        return {
          baseSource: effect.value.baseSource,
          newSource: effect.value.newSource,
          active: true,
        }
      }
      if (effect.is(clearGhostDiffEffect)) {
        return INITIAL_STATE
      }
    }
    return state
  },
})

// ============================================================
// Decorations
// ============================================================

class GhostAddedWidget extends WidgetType {
  constructor(private readonly text: string) {
    super()
  }
  toDOM() {
    const div = document.createElement('div')
    div.className = 'cm-ghost-added'
    // Preserve newlines + leading whitespace; render as-is.
    for (const line of this.text.split('\n')) {
      const lineEl = document.createElement('div')
      lineEl.className = 'cm-ghost-added-line'
      lineEl.textContent = line || '​' // zero-width to keep blank lines visible
      div.appendChild(lineEl)
    }
    return div
  }
  eq(other: GhostAddedWidget) {
    return other.text === this.text
  }
}

const removedLineDeco = Decoration.line({ class: 'cm-ghost-removed' })

/**
 * Reine Funktion: aus baseSource/newSource/Doc die DecorationSet bauen.
 * Exported für Unit-Tests.
 */
export function buildGhostDecorations(
  baseSource: string,
  newSource: string,
  doc: Text
): DecorationSet {
  const hunks = computeLineDiff(baseSource, newSource)
  if (hunks.length === 0) return Decoration.none

  type Range = { from: number; deco: Decoration; sortKey: number }
  const ranges: Range[] = []

  for (const hunk of hunks) {
    // Mark all removed lines with strike-through.
    for (let i = 0; i < hunk.removed.length; i++) {
      const line = doc.line(hunk.oldStart + i)
      ranges.push({ from: line.from, deco: removedLineDeco, sortKey: 0 })
    }

    // Emit a block widget for added lines, anchored just after the last
    // removed line in this hunk (or at the position before oldStart if
    // there are no removed lines = pure addition).
    if (hunk.added.length > 0) {
      let anchorPos: number
      if (hunk.removed.length > 0) {
        const lastRemovedLineNum = hunk.oldStart + hunk.removed.length - 1
        anchorPos = doc.line(lastRemovedLineNum).to
      } else if (hunk.oldStart <= 1) {
        // Pure addition at start of doc.
        anchorPos = 0
      } else {
        // Pure addition mid-doc: anchor at end of the line BEFORE oldStart.
        anchorPos = doc.line(hunk.oldStart - 1).to
      }
      const widget = new GhostAddedWidget(hunk.added.join('\n'))
      ranges.push({
        from: anchorPos,
        // sortKey 1 ensures widget sorts after line-strike at same pos.
        sortKey: 1,
        deco: Decoration.widget({ widget, block: true, side: 1 }),
      })
    }
  }

  // RangeSet requires sorted (from, then by deco-startSide).
  ranges.sort((a, b) => a.from - b.from || a.sortKey - b.sortKey)

  return Decoration.set(
    ranges.map(r => r.deco.range(r.from)),
    true
  )
}

const ghostDiffDecorations = EditorView.decorations.compute([ghostDiffField], state => {
  const ghost = state.field(ghostDiffField)
  if (!ghost.active) return Decoration.none
  return buildGhostDecorations(ghost.baseSource, ghost.newSource, state.doc)
})

// ============================================================
// Theme
// ============================================================

const ghostDiffTheme = EditorView.baseTheme({
  '.cm-ghost-removed': {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    textDecoration: 'line-through',
    textDecorationColor: 'rgba(239, 68, 68, 0.6)',
  },
  '.cm-ghost-added': {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderLeft: '2px solid rgba(16, 185, 129, 0.7)',
    paddingLeft: '6px',
    fontFamily: 'inherit',
    whiteSpace: 'pre',
  },
  '.cm-ghost-added-line': {
    color: '#10b981',
    minHeight: '1.2em',
  },
})

// ============================================================
// Extension factory
// ============================================================

export function ghostDiffExtension() {
  return [ghostDiffField, ghostDiffDecorations, ghostDiffTheme]
}

// ============================================================
// API
// ============================================================

export function setGhostDiff(view: EditorView, baseSource: string, newSource: string): void {
  view.dispatch({
    effects: setGhostDiffEffect.of({ baseSource, newSource }),
  })
}

export function clearGhostDiff(view: EditorView): void {
  view.dispatch({ effects: clearGhostDiffEffect.of(undefined) })
}

export function isGhostActive(state: { field: (f: typeof ghostDiffField) => GhostDiffState }) {
  return state.field(ghostDiffField).active
}
