/**
 * Indent Guides Extension
 *
 * CodeMirror extension that displays vertical indent guide lines
 * at each indentation level (2 spaces per level for Mirror DSL).
 *
 * Usage:
 *   Add indentGuidesExtension() to EditorView extensions
 */

import {
  EditorView,
  Decoration,
  ViewPlugin,
  ViewUpdate,
  type DecorationSet,
} from '@codemirror/view'
import { RangeSetBuilder } from '@codemirror/state'

// ===========================================
// Configuration
// ===========================================

const INDENT_SIZE = 2 // 2 spaces per indent level in Mirror DSL
const CHAR_WIDTH = 7.2 // Approximate character width in pixels (monospace)

// ===========================================
// Decorations
// ===========================================

/**
 * Create a line decoration with CSS variables for indent guide rendering.
 * Uses background-image with linear-gradient for drawing vertical lines.
 */
function createIndentGuideDecoration(levels: number): Decoration {
  if (levels <= 0) {
    return Decoration.line({ attributes: {} })
  }

  // Generate CSS for vertical lines at each indent level
  // Each guide is a 1px wide line positioned at (level * INDENT_SIZE) characters
  const gradients: string[] = []

  for (let level = 1; level <= levels; level++) {
    // Position: slightly left of the indent boundary (0.5 char offset)
    // This creates visual separation between the guide and the text
    const xPos = (level * INDENT_SIZE - 0.5) * CHAR_WIDTH
    // Create a vertical line using linear-gradient
    gradients.push(
      `linear-gradient(to right, transparent ${xPos - 0.5}px, var(--indent-guide-color, rgba(255, 255, 255, 0.15)) ${xPos - 0.5}px, var(--indent-guide-color, rgba(255, 255, 255, 0.15)) ${xPos + 0.5}px, transparent ${xPos + 0.5}px)`
    )
  }

  return Decoration.line({
    attributes: {
      class: 'cm-indent-guides',
      style: `background-image: ${gradients.join(', ')};`,
    },
  })
}

// ===========================================
// View Plugin
// ===========================================

/**
 * Calculate indent level for a line of text.
 */
function getIndentLevel(text: string): number {
  const match = text.match(/^(\s*)/)
  const leadingSpaces = match ? match[1].replace(/\t/g, '  ').length : 0
  return Math.floor(leadingSpaces / INDENT_SIZE)
}

/**
 * ViewPlugin that calculates and applies indent guide decorations.
 * Empty lines inherit guides from surrounding context.
 */
const indentGuidesPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = this.buildDecorations(view)
    }

    update(update: ViewUpdate) {
      // Rebuild decorations when document or viewport changes
      if (update.docChanged || update.viewportChanged) {
        this.decorations = this.buildDecorations(update.view)
      }
    }

    buildDecorations(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>()
      const doc = view.state.doc

      for (const { from, to } of view.visibleRanges) {
        for (let pos = from; pos <= to; ) {
          const line = doc.lineAt(pos)
          const text = line.text
          const isEmpty = text.trim().length === 0

          let levels: number

          if (isEmpty) {
            // For empty lines: look at next non-empty line's indent
            // This makes guides continue through empty lines
            levels = this.findNextIndentLevel(doc, line.number)
          } else {
            levels = getIndentLevel(text)
          }

          if (levels > 0) {
            builder.add(line.from, line.from, createIndentGuideDecoration(levels))
          }

          pos = line.to + 1
        }
      }

      return builder.finish()
    }

    /**
     * Find the indent level of the next non-empty line.
     * Used to continue guides through empty lines.
     */
    findNextIndentLevel(doc: any, currentLineNum: number): number {
      const totalLines = doc.lines

      // Look forward for next non-empty line
      for (let i = currentLineNum + 1; i <= totalLines; i++) {
        const line = doc.line(i)
        if (line.text.trim().length > 0) {
          return getIndentLevel(line.text)
        }
      }

      // If no next line, look backward
      for (let i = currentLineNum - 1; i >= 1; i--) {
        const line = doc.line(i)
        if (line.text.trim().length > 0) {
          return getIndentLevel(line.text)
        }
      }

      return 0
    }
  },
  {
    decorations: v => v.decorations,
  }
)

// ===========================================
// CSS Theme
// ===========================================

// Mirror Studio uses a dark theme, so we set white guide colors directly
const indentGuidesTheme = EditorView.theme({
  // Container for indent guides
  '.cm-indent-guides': {
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'left center',
    backgroundSize: '100% 100%',
    '--indent-guide-color': 'rgba(255, 255, 255, 0.15)',
  },

  // Active line: brighter guides
  '.cm-activeLine.cm-indent-guides': {
    '--indent-guide-color': 'rgba(255, 255, 255, 0.3)',
  },
})

// ===========================================
// Extension Export
// ===========================================

/**
 * CodeMirror extension for indent guide visualization.
 * Add this to your EditorView extensions array.
 *
 * @example
 * ```typescript
 * import { indentGuidesExtension } from './editor/indent-guides'
 *
 * const editor = new EditorView({
 *   extensions: [
 *     indentGuidesExtension(),
 *     // ... other extensions
 *   ]
 * })
 * ```
 */
export function indentGuidesExtension() {
  return [indentGuidesPlugin, indentGuidesTheme]
}
