/**
 * Inline Token Definition Handler
 *
 * When the user writes `bg $surface: #333` and presses Enter, the
 * line gets rewritten to `bg $surface` and the definition
 * `$surface: #333` is appended (or updated) in `tokens.tok`. This
 * lets the user "promote" a one-off value to a reusable token
 * without leaving the editor.
 *
 * Extracted from studio/app.js so the glue is typed.
 */

import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { getTriggerManager } from './trigger-manager'

const TOKENS_FILENAME = 'tokens.tok'

// `$tokenName: value` at end of property — e.g.
//   bg $surface: #333  /  rad $m: 4  /  pad $spacing.md: 8
const INLINE_TOKEN_REGEX = /\$([a-zA-Z][a-zA-Z0-9._-]*):\s*(.+)$/

interface InlineTokenMatch {
  tokenName: string
  tokenValue: string
  /** The full inline definition that was matched, e.g. "$surface: #333". */
  fullMatch: string
  /** The replacement reference, e.g. "$surface". */
  replacement: string
}

function extractInlineToken(lineText: string): InlineTokenMatch | null {
  const match = lineText.match(INLINE_TOKEN_REGEX)
  if (!match) return null

  const tokenName = match[1]
  const tokenValue = match[2].trim()

  // Reject names that don't start with a letter, and empty values.
  if (!/^[a-zA-Z]/.test(tokenName)) return null
  if (!tokenValue) return null

  return {
    tokenName,
    tokenValue,
    fullMatch: match[0],
    replacement: `$${tokenName}`,
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function showTokenCreatedFeedback(tokenName: string): void {
  const status = document.getElementById('status')
  if (!status) return
  status.textContent = `Token '$${tokenName}' created`
  status.className = 'status ok'
  setTimeout(() => {
    status.textContent = 'Ready'
  }, 2000)
}

export interface InlineTokenExtensionDeps {
  /** Returns the current project files (for reading tokens.tok). */
  getFiles: () => Record<string, string | null | undefined>
  /**
   * Persists a file. Should both update the in-memory files map and
   * trigger any disk/desktop-files writes — same semantics as the
   * studio's existing `saveFile()`.
   */
  writeFile: (path: string, content: string) => void | Promise<void>
}

/**
 * CodeMirror extension that rewrites `… $name: value` into `… $name`
 * on Enter, persisting the definition to tokens.tok.
 *
 * No-ops if any picker is open (the unified TriggerManager owns
 * Enter in that case).
 */
export function createInlineTokenExtension(deps: InlineTokenExtensionDeps): Extension {
  function ensureTokensFile(): void {
    const files = deps.getFiles()
    if (!files[TOKENS_FILENAME]) {
      const seed = '// Design Tokens\n'
      void deps.writeFile(TOKENS_FILENAME, seed)
    }
  }

  function addTokenToFile(tokenName: string, tokenValue: string): void {
    ensureTokensFile()
    const files = deps.getFiles()
    let content = files[TOKENS_FILENAME] || '// Design Tokens\n'

    const tokenLine = `$${tokenName}: ${tokenValue}`
    const tokenRegex = new RegExp(`^\\$${escapeRegex(tokenName)}:\\s*.+$`, 'm')

    if (tokenRegex.test(content)) {
      content = content.replace(tokenRegex, tokenLine)
    } else {
      content = content.trimEnd() + `\n${tokenLine}\n`
    }

    void deps.writeFile(TOKENS_FILENAME, content)
  }

  return EditorView.domEventHandlers({
    keydown: (event, view) => {
      if (event.key !== 'Enter') return false

      // Defer to the unified TriggerManager when any picker is open.
      if (getTriggerManager().isOpen()) return false

      const cursorPos = view.state.selection.main.head
      const line = view.state.doc.lineAt(cursorPos)
      const match = extractInlineToken(line.text)
      if (!match) return false

      addTokenToFile(match.tokenName, match.tokenValue)

      // Replace the inline definition on this line with just the reference.
      const newLineText = line.text.replace(match.fullMatch, match.replacement)
      view.dispatch({
        changes: { from: line.from, to: line.to, insert: newLineText + '\n' },
        selection: { anchor: line.from + newLineText.length + 1 },
      })

      showTokenCreatedFeedback(match.tokenName)

      event.preventDefault()
      return true
    },
  })
}
