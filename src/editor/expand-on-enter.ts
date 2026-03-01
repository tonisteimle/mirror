/**
 * Expand on Enter Extension
 *
 * Automatically expands shorthand Mirror DSL syntax to canonical block form
 * when the user presses Enter. This allows fast typing while maintaining
 * readable, canonical code.
 *
 * Example:
 *   User types: Button p 16, bg #333⏎
 *   Result:     Button
 *                 padding 16
 *                 background #333
 *                 █ (cursor here)
 */

import { keymap, EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { isExpandableLine, expandLineToBlock, getIndent } from './canonical-formatter'

export interface ExpandOnEnterConfig {
  /** Whether expansion is enabled (default: true) */
  enabled?: () => boolean
  /** Callback when content changes */
  onChange?: (value: string) => void
}

/**
 * Creates a CodeMirror keymap that expands shorthand on Enter.
 *
 * @example
 * ```ts
 * const expandKeymap = createExpandOnEnterKeymap({
 *   enabled: () => true,
 *   onChange: (value) => setCode(value),
 * })
 * ```
 */
export function createExpandOnEnterKeymap(config: ExpandOnEnterConfig = {}): Extension {
  const { enabled = () => true, onChange } = config

  return keymap.of([{
    key: 'Enter',
    run: (view: EditorView) => {
      console.log('[Expand] Handler called')
      if (!enabled()) {
        console.log('[Expand] Disabled, skipping')
        return false // Let default Enter handler run
      }

      const { head } = view.state.selection.main
      const line = view.state.doc.lineAt(head)
      const lineText = line.text

      console.log('[Expand] Line:', lineText, 'head:', head, 'line.to:', line.to)

      // Only expand if we're at the end of the line
      if (head !== line.to) {
        console.log('[Expand] Not at end of line, skipping')
        return false
      }

      // Check if line needs expansion
      if (!isExpandableLine(lineText)) {
        console.log('[Expand] Line not expandable, skipping')
        return false
      }

      console.log('[Expand] Line is expandable!')

      try {
        // Expand to block syntax (includes preprocessing)
        const expanded = expandLineToBlock(lineText)

        // Check if expansion actually changed anything meaningfully
        if (expanded.trim() === lineText.trim()) {
          return false
        }

        // Get the base indent of this line
        const baseIndent = getIndent(lineText)

        // Calculate where cursor should go:
        // After the last property line, indented and ready for next property
        const expandedLines = expanded.split('\n')
        const lastLineIndent = expandedLines.length > 1
          ? getIndent(expandedLines[1]) // Use property indent
          : baseIndent + '  '

        // Replace line and add newline with proper indent
        const newContent = expanded + '\n' + lastLineIndent

        view.dispatch({
          changes: {
            from: line.from,
            to: line.to,
            insert: newContent,
          },
          selection: {
            anchor: line.from + newContent.length,
          },
        })

        // Notify parent of change
        if (onChange) {
          onChange(view.state.doc.toString())
        }

        return true
      } catch (error) {
        console.warn('Expand on enter failed:', error)
        return false // Fall back to default Enter behavior
      }
    },
  }])
}

/**
 * Manually expand the current line (for testing or keyboard shortcut)
 */
export function expandCurrentLine(view: EditorView): boolean {
  const { head } = view.state.selection.main
  const line = view.state.doc.lineAt(head)
  const lineText = line.text

  if (!isExpandableLine(lineText)) {
    return false
  }

  try {
    const expanded = expandLineToBlock(lineText)

    if (expanded.trim() === lineText.trim()) {
      return false
    }

    view.dispatch({
      changes: {
        from: line.from,
        to: line.to,
        insert: expanded,
      },
    })

    return true
  } catch {
    return false
  }
}
