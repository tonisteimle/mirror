/**
 * Translating Lines Extension
 *
 * Adds an animated indicator in the gutter for lines being translated by the LLM.
 * Similar to VS Code's Copilot indicator - appears before the line number.
 */

import { EditorView, gutter, GutterMarker } from '@codemirror/view'
import { StateField, StateEffect, RangeSet } from '@codemirror/state'

/** Effect to update which lines are currently translating */
export const setTranslatingLines = StateEffect.define<Set<number>>()

/** Custom gutter marker with animated spinner */
class TranslatingMarker extends GutterMarker {
  toDOM() {
    const wrapper = document.createElement('div')
    wrapper.className = 'cm-translating-marker'

    // Create animated dots (3 dots like VS Code)
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span')
      dot.className = 'cm-translating-dot'
      dot.style.animationDelay = `${i * 0.15}s`
      wrapper.appendChild(dot)
    }

    return wrapper
  }
}

const translatingMarker = new TranslatingMarker()

/** StateField that tracks translating lines */
const translatingLinesField = StateField.define<Set<number>>({
  create() {
    return new Set()
  },
  update(lines, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setTranslatingLines)) {
        return effect.value
      }
    }
    return lines
  },
})

/** Gutter that shows translating indicators */
const translatingGutter = gutter({
  class: 'cm-translating-gutter',
  markers: view => {
    const lines = view.state.field(translatingLinesField)
    if (lines.size === 0) {
      return RangeSet.empty
    }

    const markers: { from: number; marker: GutterMarker }[] = []
    const doc = view.state.doc

    lines.forEach(lineIndex => {
      // lineIndex is 0-based, doc.line is 1-based
      if (lineIndex >= 0 && lineIndex < doc.lines) {
        const line = doc.line(lineIndex + 1)
        markers.push({ from: line.from, marker: translatingMarker })
      }
    })

    markers.sort((a, b) => a.from - b.from)
    return RangeSet.of(markers.map(m => m.marker.range(m.from)))
  },
})

/** CSS styles for the gutter marker */
const translatingGutterTheme = EditorView.baseTheme({
  '.cm-translating-gutter': {
    width: '20px',
    minWidth: '20px',
  },
  '.cm-translating-marker': {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    height: '100%',
    paddingRight: '4px',
  },
  '.cm-translating-dot': {
    width: '3px',
    height: '3px',
    borderRadius: '50%',
    backgroundColor: '#3B82F6',
    animation: 'cm-translating-bounce 0.6s ease-in-out infinite',
  },
  '@keyframes cm-translating-bounce': {
    '0%, 100%': {
      opacity: '0.3',
      transform: 'scale(0.8)',
    },
    '50%': {
      opacity: '1',
      transform: 'scale(1)',
    },
  },
})

/**
 * Create the translating lines extension.
 * Use `setTranslatingLines` effect to update which lines are translating.
 *
 * @example
 * ```ts
 * // Add extension to editor
 * const extensions = [..., createTranslatingLinesExtension()]
 *
 * // Update translating lines
 * view.dispatch({
 *   effects: setTranslatingLines.of(new Set([0, 2, 5]))
 * })
 *
 * // Clear all
 * view.dispatch({
 *   effects: setTranslatingLines.of(new Set())
 * })
 * ```
 */
export function createTranslatingLinesExtension() {
  return [translatingLinesField, translatingGutter, translatingGutterTheme]
}
