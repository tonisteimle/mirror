/**
 * Parser für LLM-Edit-Flow-Patches.
 *
 * Format:
 *   @@FILE <filename>     ← optional, target file (default: active file)
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
 * Multi-File-Roadmap Komponente 6b: `@@FILE name.mir` vor `@@FIND` gibt
 * an, in welche Datei der Patch gehört. Fehlt der Header, ist die aktive
 * Datei gemeint (rückwärtskompatibel mit dem ursprünglichen Format —
 * Single-File-Patches schreiben sich identisch). Mehrere Patches in einer
 * Antwort dürfen unterschiedliche `@@FILE`-Targets haben; der Applier
 * wendet sie all-or-nothing an. Die LLM darf NUR existierende Files
 * patchen — neue Files anlegen ist explizit nicht erlaubt.
 *
 * Defekter Input erzeugt Einträge in `parseErrors` und versucht sich
 * zu erholen, statt zu werfen — der Caller (Edit-Flow-Orchestrator)
 * kann erfolgreich geparste Patches anwenden _und_ die Errors als
 * Retry-Hint ans LLM zurückgeben.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Patch-Format)
 */

export interface Patch {
  /** Anker-Snippet, wird in der Source byte-genau gesucht. */
  find: string
  /** Ersatz-Text. Leerer String = Löschung. */
  replace: string
  /**
   * Optional: Target-File. Fehlt der `@@FILE`-Header, ist die aktive
   * Datei gemeint (Caller löst das über seinen Default-Filename auf).
   */
  targetFile?: string
}

export interface ParsedPatchResponse {
  /** Erfolgreich geparste Patches in Reihenfolge ihres Auftauchens. */
  patches: Patch[]
  /** Menschenlesbare Fehlermeldungen für defekte Blöcke. */
  parseErrors: string[]
}

const MARKER_FILE = '@@FILE'
const MARKER_FIND = '@@FIND'
const MARKER_REPLACE = '@@REPLACE'
const MARKER_END = '@@END'

type ParseState = 'idle' | 'in_find' | 'in_replace'

/** Match `@@FILE <filename>` (filename trimmed). */
function parseFileMarker(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed.startsWith(MARKER_FILE)) return null
  const rest = trimmed.slice(MARKER_FILE.length).trim()
  return rest.length > 0 ? rest : null
}

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
  let currentFile: string | undefined
  let blockStartLine = 0

  const reset = () => {
    state = 'idle'
    currentFind = []
    currentReplace = []
    currentFile = undefined
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // `@@FILE name` is a *modifier* — it sets the target file for the
    // next @@FIND block. Only valid in idle state. Discard with error if
    // mid-block.
    const fileTarget = parseFileMarker(line)
    if (fileTarget !== null) {
      if (state !== 'idle') {
        parseErrors.push(`Line ${i + 1}: @@FILE inside an open block (state '${state}'); ignoring`)
        continue
      }
      currentFile = fileTarget
      continue
    }

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
      const patch: Patch = {
        find: currentFind.join('\n'),
        replace: currentReplace.join('\n'),
      }
      // Only attach targetFile when explicitly set. Single-file callers
      // can ignore the field entirely; multi-file callers default to the
      // active file when undefined.
      if (currentFile) patch.targetFile = currentFile
      patches.push(patch)
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
