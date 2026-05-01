/**
 * Orchestrator für den LLM-Edit-Flow.
 *
 * Reine async-Funktion ohne Editor-Abhängigkeit: bekommt einen
 * `EditCaptureCtx`, baut den Prompt, ruft die Bridge, parst die Antwort,
 * appliziert Patches, und macht ggf. Retries mit Hint-Prompts.
 *
 * Nicht-Ziele:
 *  - Kein State (Editor-Mutation, Ghost-Diff, Decorations) — das ist Sache
 *    von `studio/editor/edit-handler.ts` (Phase 3).
 *  - Kein User-Feedback (Toast, Banner) — der Caller sieht den `EditResult`.
 *
 * Siehe: docs/concepts/llm-edit-flow.md (Anforderungen),
 *        docs/concepts/llm-edit-flow-plan.md (T2.4)
 */

import { buildEditPrompt, type EditCaptureCtx } from './edit-prompts'
import { runEdit } from './fixer'
import { parsePatchResponse } from './patch-format'
import { applyPatches, type RetryHint } from './patch-applier'

export interface RunEditFlowOptions {
  /** Cancel laufenden Call (z.B. wenn der User Esc drückt). */
  signal?: AbortSignal
  /**
   * Maximale Retry-Versuche bei Anker-Mismatch.
   * 0 = nie retry. Default: 2.
   */
  maxRetries?: number
  /**
   * Telemetrie-Hook: wird nach jedem LLM-Call (Erstaufruf + jeder Retry)
   * mit dem Outcome aufgerufen. Erlaubt Eval/Studio per-Attempt-Tracking
   * ohne globalen State.
   */
  onAttempt?: (event: EditFlowAttemptEvent) => void
}

/**
 * Per-Attempt-Outcome — eines pro LLM-Call. `attempt` ist 0-indexed:
 * 0 = Erstaufruf, 1 = erster Retry, etc. `willRetry` zeigt an, ob der
 * Orchestrator nach diesem Attempt einen weiteren Versuch unternimmt.
 */
export type EditFlowAttemptEvent =
  | { attempt: number; kind: 'success' }
  | { attempt: number; kind: 'no-change' }
  | { attempt: number; kind: 'parse-error'; parseErrors: string[]; willRetry: false }
  | {
      attempt: number
      kind: 'apply-failed'
      hints: RetryHint[]
      willRetry: boolean
    }
  | { attempt: number; kind: 'bridge-error'; error: string; willRetry: false }

export type EditResultStatus = 'ready' | 'no-change' | 'error'

export interface EditResult {
  status: EditResultStatus
  /** Vorgeschlagener Source nach Patch-Applikation (nur bei `ready`). */
  proposedSource?: string
  /** Menschenlesbare Fehler-Beschreibung (nur bei `error`). */
  error?: string
  /** Anzahl tatsächlich durchgeführter Retries (0 = direkt geklappt). */
  retries?: number
}

const DEFAULT_MAX_RETRIES = 2

/**
 * Hartes Source-Limit, bevor wir den LLM-Call gar nicht erst starten.
 * Bei dieser Grösse passt der Source noch komfortabel in Claudes Kontext
 * (≈ 25K Tokens), aber Anker-Hit-Rate sinkt empirisch deutlich darüber.
 * Datei splitten ist die richtige Antwort.
 */
const MAX_SOURCE_CHARS = 100_000

export async function runEditFlow(
  ctx: EditCaptureCtx,
  options: RunEditFlowOptions = {}
): Promise<EditResult> {
  const { signal, maxRetries = DEFAULT_MAX_RETRIES, onAttempt } = options

  // Edge-case: leerer Source. Patches brauchen einen Anker im Source —
  // ohne Source kein Anker. Statt den LLM-Call zu verbrennen, sofort
  // einen freundlichen Hinweis zurückgeben.
  if (ctx.source.trim() === '') {
    return {
      status: 'error',
      error: 'Editor ist leer — füge zuerst Code ein, bevor du eine LLM-Bearbeitung anstösst.',
      retries: 0,
    }
  }

  // Edge-case: Source zu gross. Token-Budget-Heuristik (≈ 4 Chars/Token).
  // Trim wäre fragil (Anker im abgeschnittenen Teil) — splitten ist die
  // bessere Antwort. Caller bekommt die Begründung im error-Feld.
  if (ctx.source.length > MAX_SOURCE_CHARS) {
    return {
      status: 'error',
      error:
        `Datei zu gross für eine LLM-Bearbeitung (${ctx.source.length} > ` +
        `${MAX_SOURCE_CHARS} Zeichen). Splitte sie in kleinere Files.`,
      retries: 0,
    }
  }

  const basePrompt = buildEditPrompt(ctx)
  let prompt = basePrompt
  let retries = 0

  while (true) {
    const attempt = retries
    let raw: string
    try {
      raw = await runEdit(prompt, signal)
    } catch (err) {
      if (isAbortError(err)) throw err
      const message = errorMessage(err)
      onAttempt?.({ attempt, kind: 'bridge-error', error: message, willRetry: false })
      return {
        status: 'error',
        error: message,
        retries,
      }
    }

    const parsed = parsePatchResponse(raw)

    if (parsed.patches.length === 0 && parsed.parseErrors.length === 0) {
      // Stille ist heilig: keine Änderung gewünscht.
      onAttempt?.({ attempt, kind: 'no-change' })
      return { status: 'no-change', retries }
    }

    if (parsed.patches.length === 0 && parsed.parseErrors.length > 0) {
      onAttempt?.({
        attempt,
        kind: 'parse-error',
        parseErrors: parsed.parseErrors,
        willRetry: false,
      })
      return {
        status: 'error',
        error: `Antwort konnte nicht geparsed werden:\n${parsed.parseErrors.join('\n')}`,
        retries,
      }
    }

    const applyResult = applyPatches(ctx.source, parsed.patches)

    if (applyResult.success) {
      onAttempt?.({ attempt, kind: 'success' })
      return {
        status: 'ready',
        proposedSource: applyResult.newSource,
        retries,
      }
    }

    // applyPatches garantiert retryHints bei success=false.
    const hints = applyResult.retryHints as RetryHint[]
    const willRetry = retries < maxRetries
    onAttempt?.({ attempt, kind: 'apply-failed', hints, willRetry })

    if (!willRetry) {
      return {
        status: 'error',
        error: formatRetryHints(hints),
        retries,
      }
    }

    prompt = basePrompt + '\n\n' + buildHintMessage(hints)
    retries++
  }
}

function buildHintMessage(hints: RetryHint[]): string {
  const lines = ['## Retry — Anker-Probleme im vorherigen Patch']
  lines.push('')
  lines.push(
    'Dein vorheriger Patch konnte nicht angewendet werden. Bitte gib NEUE Patches zurück, die diese Probleme beheben:'
  )
  lines.push('')

  for (const hint of hints) {
    if (hint.reason === 'no-match') {
      lines.push(
        `- Der \`@@FIND\`-Anker wurde **0×** im Source gefunden. Lies den Source nochmal byte-genau und nimm einen Anker, der EXAKT so vorkommt:`
      )
    } else {
      lines.push(
        `- Der \`@@FIND\`-Anker kam **${hint.matchCount}×** im Source vor — er muss aber EINDEUTIG sein. Nimm mehr Kontext-Zeilen drumherum, bis er nur noch 1× passt:`
      )
    }
    lines.push('  ```')
    for (const line of hint.patch.find.split('\n')) {
      lines.push('  ' + line)
    }
    lines.push('  ```')
  }

  return lines.join('\n')
}

function formatRetryHints(hints: RetryHint[]): string {
  // applyPatches liefert immer mindestens einen Hint bei success=false.
  const parts: string[] = []
  for (const hint of hints) {
    if (hint.reason === 'no-match') {
      parts.push(`Anker nicht gefunden (no-match): "${preview(hint.patch.find)}"`)
    } else {
      parts.push(`Anker mehrdeutig (${hint.matchCount}× gefunden): "${preview(hint.patch.find)}"`)
    }
  }
  return parts.join('; ')
}

function preview(s: string, max = 60): string {
  const oneline = s.replace(/\n/g, '⏎')
  return oneline.length <= max ? oneline : oneline.slice(0, max - 1) + '…'
}

function isAbortError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'name' in err &&
    (err as { name?: string }).name === 'AbortError'
  )
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
