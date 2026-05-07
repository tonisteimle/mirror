/**
 * Wendet vom LLM gelieferte Patches auf einen Source-String an.
 *
 * **Anker-Uniqueness-Regel:** jeder `find`-Snippet muss exakt einmal im
 * aktuellen Working-Copy vorkommen, sonst wird der Patch nicht
 * appliziert und der Aufrufer bekommt einen `RetryHint` zurück, den er
 * dem LLM als Klarstellung weiterreichen kann.
 *
 * **Sequenz-Semantik:** Patches werden in der gegebenen Reihenfolge auf
 * ein gemeinsames Working-Copy angewendet — jeder Patch sieht die
 * Mutation des vorigen. Bei Fehler wird das (möglicherweise teilweise
 * mutierte) Working-Copy NICHT zurückgegeben — der Orchestrator startet
 * Retries vom Original-Source.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Anker-Validierung)
 */

import type { Patch } from './patch-format'

export interface ApplyResult {
  success: boolean
  /** Nur gesetzt wenn `success: true`. */
  newSource?: string
  /** Nur gesetzt wenn `success: false`, enthält die fehlgeschlagenen Patches. */
  retryHints?: RetryHint[]
}

export interface RetryHint {
  patch: Patch
  reason: 'no-match' | 'multiple-matches'
  matchCount: number
}

export function applyPatches(source: string, patches: Patch[]): ApplyResult {
  let workingCopy = source

  for (const p of patches) {
    const matchCount = countOccurrences(workingCopy, p.find)

    if (matchCount !== 1) {
      return {
        success: false,
        retryHints: [
          {
            patch: p,
            reason: matchCount === 0 ? 'no-match' : 'multiple-matches',
            matchCount,
          },
        ],
      }
    }

    const idx = workingCopy.indexOf(p.find)
    workingCopy = workingCopy.slice(0, idx) + p.replace + workingCopy.slice(idx + p.find.length)
  }

  return { success: true, newSource: workingCopy }
}

function countOccurrences(haystack: string, needle: string): number {
  // Empty needle → no match. (Without this, indexOf('', 0) === 0 would
  // loop forever and an empty FIND would otherwise "match everywhere".)
  if (needle === '') return 0

  let count = 0
  let pos = 0
  while (true) {
    const idx = haystack.indexOf(needle, pos)
    if (idx === -1) break
    count++
    pos = idx + needle.length
  }
  return count
}

// ============================================================================
// Multi-File Apply (Multi-File-Roadmap Komponente 6b)
// ============================================================================

export interface MultiFileApplyResult {
  success: boolean
  /**
   * Alle aktualisierten Files (nur bei `success: true`). Map: filename →
   * neuer Content. Files, die NICHT von Patches berührt wurden, werden
   * NICHT in dieser Map zurückgegeben — der Caller behält seine Original-
   * Files für die unveränderten Slots.
   */
  updatedFiles?: Record<string, string>
  /**
   * Bei `success: false`: alle Patches die nicht angewendet werden
   * konnten (mit Reason). All-or-Nothing-Semantik: wenn ein Patch
   * fehlschlägt, wird KEIN File geschrieben.
   */
  retryHints?: MultiFileRetryHint[]
  /**
   * Bei `success: false`: Files die der Patch referenziert hat, die aber
   * nicht im Projekt existieren. Die LLM darf nur in EXISTIERENDE Files
   * patchen — neue Files anlegen ist explizit nicht erlaubt.
   */
  unknownFiles?: string[]
}

export interface MultiFileRetryHint extends RetryHint {
  /** Welche Datei der Patch berührt hat. */
  targetFile: string
}

export interface MultiFileApplyOptions {
  /**
   * Default-Filename für Patches ohne explizites `@@FILE`. Match das
   * heutige Single-File-Verhalten: ohne `@@FILE` ist die aktuell
   * editierte Datei gemeint.
   */
  defaultFile: string
}

/**
 * Wendet eine Liste von Patches all-or-nothing über mehrere Files an.
 *
 * 1. Resolved jeden Patch zu seinem Target-File (`patch.targetFile` oder
 *    `defaultFile`).
 * 2. Validiert dass jedes Target im `files`-Map existiert. Unbekannte
 *    Files → Fehler, kein File wird geschrieben.
 * 3. Gruppiert Patches pro File, wendet sie pro Datei sequenziell an
 *    (jeder Patch sieht die Mutation seiner Vorgänger im selben File).
 * 4. Wenn alle Files erfolgreich gepatcht: gibt die aktualisierten Files
 *    zurück. Wenn irgendein Patch fehlschlägt: gibt KEINEN File zurück,
 *    sammelt aber alle fehlgeschlagenen Patches als Retry-Hints.
 */
export function applyPatchesMultiFile(
  files: Record<string, string>,
  patches: Patch[],
  options: MultiFileApplyOptions
): MultiFileApplyResult {
  // Phase 1: resolve target-file for each patch + validate existence.
  const grouped = new Map<string, Patch[]>()
  const unknownFiles = new Set<string>()
  for (const p of patches) {
    const target = p.targetFile ?? options.defaultFile
    if (!(target in files)) {
      unknownFiles.add(target)
      continue
    }
    if (!grouped.has(target)) grouped.set(target, [])
    grouped.get(target)!.push(p)
  }

  if (unknownFiles.size > 0) {
    return {
      success: false,
      unknownFiles: [...unknownFiles],
    }
  }

  // Phase 2: apply each file's patches on a working copy. If ANY file
  // fails, abort the whole transaction (all-or-nothing).
  const updated: Record<string, string> = {}
  const retryHints: MultiFileRetryHint[] = []
  for (const [filename, filePatches] of grouped) {
    const sourceResult = applyPatches(files[filename], filePatches)
    if (!sourceResult.success) {
      // Collect retry hints for this file's failed patches.
      for (const hint of sourceResult.retryHints ?? []) {
        retryHints.push({ ...hint, targetFile: filename })
      }
      continue
    }
    if (sourceResult.newSource !== undefined) {
      updated[filename] = sourceResult.newSource
    }
  }

  if (retryHints.length > 0) {
    return { success: false, retryHints }
  }

  return { success: true, updatedFiles: updated }
}
