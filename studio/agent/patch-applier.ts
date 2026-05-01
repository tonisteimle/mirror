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
 * Siehe: docs/concepts/llm-edit-flow.md (Anker-Validierung)
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
