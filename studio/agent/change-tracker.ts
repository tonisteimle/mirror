/**
 * Stateful Change-Tracker — speichert pro File die zuletzt "gesehene"
 * Source und liefert auf Anfrage den Diff zwischen Baseline und aktueller
 * Source.
 *
 * Verwendung im Edit-Flow: vor jedem `Cmd+Enter` ruft der Orchestrator
 * `getDiffSinceLastCall(file, currentSource)` und injectet das Ergebnis
 * als Diff-Section ins Prompt — damit weiss das LLM, welche Bereiche
 * der User zuletzt selbst angefasst hat ("user is iterating on X").
 *
 * Snapshots werden bei jedem `getDiffSinceLastCall` aktualisiert — die
 * nächste Anfrage vergleicht also gegen die _jetzt_ aktuelle Source.
 *
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Diff seit letztem Call),
 *        llm-edit-flow-plan.md (T1.3)
 */

import { formatUnifiedDiff } from './source-diff'

/** Hard cap auf gesendete Diff-Zeilen, um Prompt-Bloat zu verhindern. */
export const MAX_DIFF_LINES = 200

export interface ChangeTracker {
  /** Setze die Baseline für ein File explizit (z.B. beim File-Open). */
  track(fileId: string, source: string): void
  /**
   * Berechne Diff zwischen Baseline und `currentSource` und aktualisiere
   * die Baseline auf `currentSource`. Erste Anfrage für ein File (ohne
   * vorigen `track()`-Call) liefert leeren String und etabliert nur die
   * Baseline.
   */
  getDiffSinceLastCall(fileId: string, currentSource: string): string
  /** Verwirf alle Snapshots. */
  reset(): void
}

export function createChangeTracker(): ChangeTracker {
  const snapshots = new Map<string, string>()

  return {
    track(fileId, source) {
      snapshots.set(fileId, source)
    },

    getDiffSinceLastCall(fileId, currentSource) {
      const baseline = snapshots.get(fileId)
      snapshots.set(fileId, currentSource)
      if (baseline === undefined) return ''

      const diff = formatUnifiedDiff(baseline, currentSource)
      if (diff === '') return ''

      const lines = diff.split('\n')
      if (lines.length <= MAX_DIFF_LINES) return diff

      const truncated = lines.length - MAX_DIFF_LINES
      return [
        ...lines.slice(0, MAX_DIFF_LINES),
        `... (${truncated} more diff lines truncated)`,
      ].join('\n')
    },

    reset() {
      snapshots.clear()
    },
  }
}
