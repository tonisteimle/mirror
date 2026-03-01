/**
 * Format on Blur Extension
 *
 * Automatically formats Mirror DSL code to canonical block form when the editor loses focus.
 * This ensures consistent code style across the project.
 *
 * Transforms:
 *   Button p 12, bg #333  →  Button
 *                              padding 12
 *                              background #333
 */

import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { formatDocument } from './canonical-formatter'

export interface FormatOnBlurConfig {
  /** Callback to report the formatted value */
  onChange: (value: string) => void
  /** Whether formatting is enabled (default: true) */
  enabled?: boolean
}

/**
 * Creates a CodeMirror extension that formats code to canonical form on blur.
 *
 * @example
 * ```ts
 * const formatExtension = createFormatOnBlurExtension({
 *   onChange: (value) => setCode(value),
 *   enabled: true,
 * })
 * ```
 */
export function createFormatOnBlurExtension(config: FormatOnBlurConfig): Extension {
  const { onChange, enabled = true } = config

  return EditorView.domEventHandlers({
    blur: (event, view) => {
      if (!enabled) return false

      const currentValue = view.state.doc.toString()

      // Skip empty or whitespace-only content
      if (!currentValue.trim()) return false

      try {
        // Transform to canonical block form
        const canonical = formatDocument(currentValue)

        // Only update if something changed
        if (canonical !== currentValue) {
          // Preserve cursor position relative to document
          const cursor = view.state.selection.main
          const cursorLine = view.state.doc.lineAt(cursor.head)
          const lineNumber = cursorLine.number
          const columnOffset = cursor.head - cursorLine.from

          // Update editor content
          view.dispatch({
            changes: { from: 0, to: currentValue.length, insert: canonical },
          })

          // Try to restore cursor position (may be clamped if document is shorter)
          const newDoc = view.state.doc
          if (lineNumber <= newDoc.lines) {
            const newLine = newDoc.line(lineNumber)
            const newPos = Math.min(newLine.from + columnOffset, newLine.to)
            view.dispatch({
              selection: { anchor: newPos },
            })
          }

          // Notify parent of the change
          onChange(canonical)
        }
      } catch (error) {
        // Formatting failed - don't update, keep original
        console.warn('Format on blur failed:', error)
      }

      return false // Don't prevent default blur behavior
    },
  })
}

/**
 * Formats Mirror DSL code to canonical form.
 * Can be used for manual formatting (e.g., Cmd+Shift+F).
 *
 * @param view - CodeMirror EditorView
 * @param onChange - Callback to report the formatted value
 * @returns true if formatting was applied, false otherwise
 */
export function formatCode(view: EditorView, onChange: (value: string) => void): boolean {
  const currentValue = view.state.doc.toString()

  // Skip empty content
  if (!currentValue.trim()) return false

  try {
    const canonical = formatDocument(currentValue)

    if (canonical !== currentValue) {
      // Preserve cursor position
      const cursor = view.state.selection.main
      const cursorLine = view.state.doc.lineAt(cursor.head)
      const lineNumber = cursorLine.number
      const columnOffset = cursor.head - cursorLine.from

      view.dispatch({
        changes: { from: 0, to: currentValue.length, insert: canonical },
      })

      // Restore cursor
      const newDoc = view.state.doc
      if (lineNumber <= newDoc.lines) {
        const newLine = newDoc.line(lineNumber)
        const newPos = Math.min(newLine.from + columnOffset, newLine.to)
        view.dispatch({
          selection: { anchor: newPos },
        })
      }

      onChange(canonical)
      return true
    }
  } catch (error) {
    console.warn('Format code failed:', error)
  }

  return false
}
