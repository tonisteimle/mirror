/**
 * Parser für LLM-Edit-Flow-Patches.
 *
 * Format:
 *   @@FIND
 *   <find content>
 *   @@REPLACE
 *   <replace content>
 *   @@END
 *
 * Marker stehen jeweils auf eigenen Zeilen (führende/trailing Whitespace
 * wird toleriert). Inhalt zwischen Markern wird byte-genau bewahrt
 * (inklusive Tabs, Unicode, Mehrzeilen). Text vor dem ersten oder nach
 * dem letzten Block (LLM-Vorrede/Nachrede) wird ignoriert.
 *
 * Defekter Input erzeugt Einträge in `parseErrors` und versucht sich
 * zu erholen, statt zu werfen — der Caller (Edit-Flow-Orchestrator)
 * kann erfolgreich geparste Patches anwenden _und_ die Errors als
 * Retry-Hint ans LLM zurückgeben.
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Patch-Format)
 */

export interface Patch {
  /** Anker-Snippet, wird in der Source byte-genau gesucht. */
  find: string
  /** Ersatz-Text. Leerer String = Löschung. */
  replace: string
}

export interface ParsedPatchResponse {
  /** Erfolgreich geparste Patches in Reihenfolge ihres Auftauchens. */
  patches: Patch[]
  /** Menschenlesbare Fehlermeldungen für defekte Blöcke. */
  parseErrors: string[]
}

const MARKER_FIND = '@@FIND'
const MARKER_REPLACE = '@@REPLACE'
const MARKER_END = '@@END'

type ParseState = 'idle' | 'in_find' | 'in_replace'

export function parsePatchResponse(rawText: string): ParsedPatchResponse {
  const patches: Patch[] = []
  const parseErrors: string[] = []

  // Strip leading BOM, normalize line endings.
  let text = rawText
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  text = text.replace(/\r\n/g, '\n')

  // Edge: empty input → no work.
  if (text.length === 0) return { patches, parseErrors }

  const lines = text.split('\n')

  let state: ParseState = 'idle'
  let currentFind: string[] = []
  let currentReplace: string[] = []
  let blockStartLine = 0

  const reset = () => {
    state = 'idle'
    currentFind = []
    currentReplace = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === MARKER_FIND) {
      if (state !== 'idle') {
        parseErrors.push(
          `Line ${i + 1}: unexpected @@FIND while in state '${state}' ` +
            `(block starting at line ${blockStartLine + 1} is unclosed and will be discarded)`
        )
      }
      state = 'in_find'
      currentFind = []
      currentReplace = []
      blockStartLine = i
      continue
    }

    if (trimmed === MARKER_REPLACE) {
      if (state !== 'in_find') {
        parseErrors.push(`Line ${i + 1}: @@REPLACE without preceding @@FIND (state was '${state}')`)
        reset()
        continue
      }
      state = 'in_replace'
      continue
    }

    if (trimmed === MARKER_END) {
      if (state !== 'in_replace') {
        parseErrors.push(`Line ${i + 1}: @@END without preceding @@REPLACE (state was '${state}')`)
        reset()
        continue
      }
      patches.push({
        find: currentFind.join('\n'),
        replace: currentReplace.join('\n'),
      })
      reset()
      continue
    }

    // Non-marker line: append to current block, or ignore if outside one.
    if (state === 'in_find') currentFind.push(line)
    else if (state === 'in_replace') currentReplace.push(line)
    // else: idle (vorrede/nachrede), ignored
  }

  if (state !== 'idle') {
    parseErrors.push(
      `Unclosed block (started at line ${blockStartLine + 1}, ended in state '${state}')`
    )
  }

  return { patches, parseErrors }
}
