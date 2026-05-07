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
 * Siehe: docs/archive/concepts/llm-edit-flow.md (Anforderungen),
 *        docs/archive/concepts/llm-edit-flow-plan.md (T2.4)
 */

import { buildEditPrompt, type EditCaptureCtx } from './edit-prompts'
import { runEdit } from './fixer'
import { parsePatchResponse } from './patch-format'
import {
  applyPatches,
  applyPatchesMultiFile,
  type RetryHint,
  type MultiFileRetryHint,
} from './patch-applier'
import {
  checkComponentCompliance,
  checkRedundancyCompliance,
  checkTokenCompliance,
  type ComponentViolation,
  type RedundancyViolation,
  type TokenViolation,
} from './quality-checks'

/**
 * Bündel der drei AST-basierten Quality-Checks. Verstöße sind nicht-
 * gating — der Edit-Flow returniert weiterhin `ready` oder `no-change`,
 * aber der Caller kann sie im Status-Indicator anzeigen oder darauf
 * reagieren (z.B. via expliziten User-Aufruf "fix quality issues").
 *
 * Bei `no-change`: Verstöße im Original-Source. Das LLM hat geschwiegen,
 * obwohl es das hätte fixen können — sichtbar machen, statt verstecken.
 *
 * Bei `ready`: Verstöße im proposedSource (nach Patch-Apply). Idealer-
 * weise leer; nicht-leer heisst der LLM hat einen Verstoss übersehen
 * oder ein neuer ist durch den Patch entstanden.
 */
export interface QualityViolations {
  token: TokenViolation[]
  component: ComponentViolation[]
  redundancy: RedundancyViolation[]
}

function runQualityChecks(source: string, ctx: EditCaptureCtx): QualityViolations {
  return {
    // Multi-File-Roadmap: alle Sibling-Files in beide Compliance-Checks —
    // der Parser zieht sich selbst raus, was Tokens vs Components sind.
    token: checkTokenCompliance(source, ctx.siblings).violations,
    component: checkComponentCompliance(source, ctx.siblings).violations,
    redundancy: checkRedundancyCompliance(source).violations,
  }
}

export interface RunEditFlowOptions {
  /** Cancel laufenden Call (z.B. wenn der User Esc drückt). */
  signal?: AbortSignal
  /**
   * Maximale Retry-Versuche bei Anker-Mismatch.
   * 0 = nie retry. Default: 2.
   */
  maxRetries?: number
  /**
   * Wenn true, startet der Orchestrator nach einem `ready`/`no-change`-
   * Ergebnis mit verbliebenen Quality-Violations EINEN zusätzlichen LLM-
   * Call mit gezieltem Hint, um die Idiom-Verstösse zu schliessen. Die
   * Latenz verdoppelt sich dabei im Worst-Case — Studio-Default ist
   * deshalb opt-in. Bei `false` (Default) bleibt der bisherige
   * Single-Pass-Pfad unverändert; der Caller sieht die Violations dann
   * nur im Status-Indicator.
   *
   * Maximal 1 Quality-Retry pro Edit-Flow, niemals geschachtelt.
   */
  qualityRetry?: boolean
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
  | {
      attempt: number
      kind: 'unknown-file'
      unknownFiles: string[]
      willRetry: false
    }
  | { attempt: number; kind: 'bridge-error'; error: string; willRetry: false }
  | {
      attempt: number
      kind: 'quality-retry'
      /** Zähler der Verstösse VOR dem Retry. */
      violationsBefore: number
      /** Zähler der Verstösse NACH dem Retry. */
      violationsAfter: number
      /** Status-Übergang (z.B. no-change → ready, ready → ready). */
      transition: string
    }

export type EditResultStatus = 'ready' | 'no-change' | 'error'

export interface EditResult {
  status: EditResultStatus
  /** Vorgeschlagener Source nach Patch-Applikation (nur bei `ready`). */
  proposedSource?: string
  /**
   * Cross-File-Änderungen (nur bei `ready` und nur wenn der LLM
   * `@@FILE`-Header benutzt hat). Map: filename → neuer Content. Files,
   * die der LLM NICHT angefasst hat, fehlen in der Map. Die aktive Datei
   * steht IMMER unter `proposedSource`, nicht hier.
   *
   * Multi-File-Roadmap Komponente 6b: All-or-Nothing-Semantik. Entweder
   * alle Files erfolgreich gepatcht oder gar keine — bei Teilversagen
   * wird der ganze Result zu `error`.
   */
  otherFileChanges?: Record<string, string>
  /** Menschenlesbare Fehler-Beschreibung (nur bei `error`). */
  error?: string
  /** Anzahl tatsächlich durchgeführter Retries (0 = direkt geklappt). */
  retries?: number
  /**
   * AST-basierte Quality-Verstösse im finalen Source (nur bei `ready` oder
   * `no-change`; bei `error` undefined, weil dann kein finaler Source
   * existiert). Drei Dimensionen: Token, Component, Redundanz. Leere
   * Arrays heisst clean.
   */
  qualityViolations?: QualityViolations
  /**
   * True wenn ein Quality-Retry stattgefunden hat (nur gesetzt mit
   * `qualityRetry: true`). Erlaubt dem Caller zu unterscheiden ob die
   * verbliebenen Violations nach EINEM Pass oder nach ZWEI Passes übrig
   * geblieben sind — letzteres ist der "AI hat aufgegeben"-Fall.
   */
  qualityRetried?: boolean
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

  const firstResult = await runEditFlowCore(ctx, options)

  if (!options.qualityRetry) return firstResult
  if (firstResult.status === 'error') return firstResult

  const before = countQualityIssues(firstResult.qualityViolations)
  if (before === 0) return firstResult

  // Source für den Retry: bei `ready` der bereits gepatchte
  // proposedSource, bei `no-change` der unveränderte ctx.source.
  // So baut der Retry IMMER auf dem aktuellen Stand auf, ohne den
  // ersten Patch zu verlieren.
  const retrySource =
    firstResult.status === 'ready' && firstResult.proposedSource !== undefined
      ? firstResult.proposedSource
      : ctx.source

  // Multi-File-Roadmap 6b: wenn der erste Pass Sibling-Files mit-
  // gepatcht hat, müssen die für den Retry sichtbar sein (sonst sieht
  // der LLM noch den alten Stand und denkt "fehlt noch"). Siblings
  // werden überlagert.
  const retrySiblings: Record<string, string> = firstResult.otherFileChanges
    ? { ...ctx.siblings, ...firstResult.otherFileChanges }
    : ctx.siblings

  const retryCtx: EditCaptureCtx = {
    ...ctx,
    source: retrySource,
    siblings: retrySiblings,
    instruction: buildQualityRetryInstruction(
      firstResult.qualityViolations as QualityViolations,
      ctx.instruction
    ),
  }

  const retryResult = await runEditFlowCore(retryCtx, { ...options, qualityRetry: false })

  // Bridge-Error oder neuer Anker-Mismatch im Retry → ersten Pass
  // unverändert beibehalten. Wir wollen niemandem ein Quality-
  // Retry-Versagen aufdrücken, das den ursprünglichen Erfolg killt.
  if (retryResult.status === 'error') {
    return { ...firstResult, qualityRetried: true }
  }

  // Multi-File: kombiniere otherFileChanges aus beiden Pässen. Retry-
  // Änderungen überschreiben First-Pass-Änderungen für dasselbe File
  // (Retry sah ja bereits den gepatchten Stand → seine Antwort ist
  // semantisch der Endstand).
  const mergedOtherFileChanges = mergeOtherFileChanges(
    firstResult.otherFileChanges,
    retryResult.otherFileChanges
  )

  // Wenn der Retry sauber läuft, übernehmen wir sein Ergebnis. Ein
  // `no-change` im Retry bedeutet: der LLM weiss keine Verbesserung
  // → Violations bleiben, aber der erste Patch (falls einer war) ist
  // schon im retrySource enthalten → wir packen diesen als ready
  // zurück, damit der User die Verbesserung NICHT verliert.
  let merged: EditResult
  if (retryResult.status === 'no-change' && firstResult.status === 'ready') {
    merged = {
      status: 'ready',
      proposedSource: retrySource,
      otherFileChanges: mergedOtherFileChanges,
      retries: (firstResult.retries ?? 0) + (retryResult.retries ?? 0),
      qualityViolations: retryResult.qualityViolations,
      qualityRetried: true,
    }
  } else {
    merged = {
      ...retryResult,
      otherFileChanges: mergedOtherFileChanges,
      retries: (firstResult.retries ?? 0) + (retryResult.retries ?? 0),
      qualityRetried: true,
    }
  }

  const after = countQualityIssues(merged.qualityViolations)
  options.onAttempt?.({
    attempt: (firstResult.retries ?? 0) + 1,
    kind: 'quality-retry',
    violationsBefore: before,
    violationsAfter: after,
    transition: `${firstResult.status} → ${merged.status}`,
  })

  return merged
}

async function runEditFlowCore(
  ctx: EditCaptureCtx,
  options: RunEditFlowOptions
): Promise<EditResult> {
  const { signal, maxRetries = DEFAULT_MAX_RETRIES, onAttempt } = options
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
      return {
        status: 'no-change',
        retries,
        qualityViolations: runQualityChecks(ctx.source, ctx),
      }
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

    // Multi-File-Roadmap Komponente 6b: wenn IRGENDEIN Patch ein
    // `@@FILE`-Target hat, routen wir die ganze Antwort durch den
    // Multi-File-Applier (all-or-nothing über alle betroffenen Files).
    // Patches ohne `@@FILE` zielen auf `ctx.fileName` (Default).
    const isCrossFile = parsed.patches.some(p => p.targetFile !== undefined)

    if (isCrossFile) {
      const filesMap = buildFilesMap(ctx)
      const multiResult = applyPatchesMultiFile(filesMap, parsed.patches, {
        defaultFile: ctx.fileName,
      })

      if (multiResult.success) {
        onAttempt?.({ attempt, kind: 'success' })
        const updated = multiResult.updatedFiles ?? {}
        // Active file: prefer the updated version, fall back to the
        // original (when patches only touched siblings).
        const proposed = updated[ctx.fileName] ?? ctx.source
        const otherFileChanges: Record<string, string> = {}
        for (const [name, content] of Object.entries(updated)) {
          if (name !== ctx.fileName) otherFileChanges[name] = content
        }
        return {
          status: 'ready',
          proposedSource: proposed,
          otherFileChanges: Object.keys(otherFileChanges).length > 0 ? otherFileChanges : undefined,
          retries,
          qualityViolations: runQualityChecks(proposed, ctx),
        }
      }

      // Unknown-file is a hard fail (LLM tried to create a new file).
      // Don't retry — the LLM can't infer that intent from a hint loop.
      if (multiResult.unknownFiles && multiResult.unknownFiles.length > 0) {
        onAttempt?.({
          attempt,
          kind: 'unknown-file',
          unknownFiles: multiResult.unknownFiles,
          willRetry: false,
        })
        return {
          status: 'error',
          error:
            `Patch referenziert Files die nicht im Projekt existieren: ` +
            multiResult.unknownFiles.join(', ') +
            `. Die LLM darf nur in existierende Files patchen.`,
          retries,
        }
      }

      // Anker-Mismatch in irgendeinem File → Retry-Hints inkl. targetFile.
      const multiHints = (multiResult.retryHints ?? []) as MultiFileRetryHint[]
      const willRetry = retries < maxRetries
      // Surface as the same `apply-failed` event shape (telemetry stays
      // backward-compatible); the multi-file targetFile lives on the hint.
      onAttempt?.({ attempt, kind: 'apply-failed', hints: multiHints, willRetry })

      if (!willRetry) {
        return {
          status: 'error',
          error: formatRetryHints(multiHints),
          retries,
        }
      }

      prompt = basePrompt + '\n\n' + buildHintMessage(multiHints)
      retries++
      continue
    }

    const applyResult = applyPatches(ctx.source, parsed.patches)

    if (applyResult.success) {
      onAttempt?.({ attempt, kind: 'success' })
      const proposed = applyResult.newSource as string
      return {
        status: 'ready',
        proposedSource: proposed,
        retries,
        qualityViolations: runQualityChecks(proposed, ctx),
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

/**
 * Bauen der Files-Map für den Multi-File-Applier: aktive Datei + alle
 * Sibling-Files. Wir bauen das im Edit-Flow, weil die LLM-Antwort darüber
 * entscheidet, ob multi-file gerouted wird — der Caller müsste sonst die
 * Map vorher übergeben, ohne zu wissen ob sie gebraucht wird.
 */
function buildFilesMap(ctx: EditCaptureCtx): Record<string, string> {
  const map: Record<string, string> = { ...ctx.siblings }
  map[ctx.fileName] = ctx.source
  return map
}

function countQualityIssues(v: QualityViolations | undefined): number {
  if (!v) return 0
  return v.token.length + v.component.length + v.redundancy.length
}

function mergeOtherFileChanges(
  first: Record<string, string> | undefined,
  second: Record<string, string> | undefined
): Record<string, string> | undefined {
  if (!first && !second) return undefined
  return { ...(first ?? {}), ...(second ?? {}) }
}

function buildQualityRetryInstruction(
  v: QualityViolations,
  userInstruction: string | null
): string {
  const lines: string[] = []
  lines.push(
    'Der vorherige Pass hat folgende Idiom-Verstösse hinterlassen. Behebe sie per Patch (Token/Component/Redundanz-Pflicht laut Regeln #4–#6).'
  )

  if (v.token.length > 0) {
    lines.push('')
    lines.push('### Token-Verstösse')
    for (const t of v.token) {
      lines.push(
        `- L${t.line} \`${t.elementName} ${t.propertyName} ${t.hardcodedValue}\` → ersetze den hardcodeten Wert durch \`${t.suggestedToken}\` (passender Token mit Suffix existiert).`
      )
    }
  }

  if (v.component.length > 0) {
    lines.push('')
    lines.push('### Component-Verstösse')
    for (const c of v.component) {
      const extra =
        c.extraProperties.length > 0 ? ` (Zusatz-Props: ${c.extraProperties.join(', ')})` : ''
      lines.push(
        `- L${c.line} inline \`${c.inlineElementType}\` mit Properties [${c.matchedProperties.join(', ')}] → benutze stattdessen die Component \`${c.suggestedComponent}\`${extra}.`
      )
    }
  }

  if (v.redundancy.length > 0) {
    lines.push('')
    lines.push('### Redundanz-Verstösse')
    for (const r of v.redundancy) {
      lines.push(`- L${r.line} \`${r.elementName}\` (${r.kind}): ${r.detail}.`)
    }
  }

  if (userInstruction) {
    lines.push('')
    lines.push(
      `Ursprüngliche User-Anweisung war: "${userInstruction}". Behalte deren Intent, fixe aber zusätzlich die obigen Verstösse.`
    )
  }

  return lines.join('\n')
}

function buildHintMessage(hints: Array<RetryHint | MultiFileRetryHint>): string {
  const lines = ['## Retry — Anker-Probleme im vorherigen Patch']
  lines.push('')
  lines.push(
    'Dein vorheriger Patch konnte nicht angewendet werden. Bitte gib NEUE Patches zurück, die diese Probleme beheben:'
  )
  lines.push('')

  for (const hint of hints) {
    const inFile = 'targetFile' in hint && hint.targetFile ? ` (in \`${hint.targetFile}\`)` : ''
    if (hint.reason === 'no-match') {
      lines.push(
        `- Der \`@@FIND\`-Anker wurde **0×** im Source gefunden${inFile}. Lies den Source nochmal byte-genau und nimm einen Anker, der EXAKT so vorkommt:`
      )
    } else {
      lines.push(
        `- Der \`@@FIND\`-Anker kam **${hint.matchCount}×** im Source vor${inFile} — er muss aber EINDEUTIG sein. Nimm mehr Kontext-Zeilen drumherum, bis er nur noch 1× passt:`
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

function formatRetryHints(hints: Array<RetryHint | MultiFileRetryHint>): string {
  // applyPatches liefert immer mindestens einen Hint bei success=false.
  const parts: string[] = []
  for (const hint of hints) {
    const inFile = 'targetFile' in hint && hint.targetFile ? ` [${hint.targetFile}]` : ''
    if (hint.reason === 'no-match') {
      parts.push(`Anker nicht gefunden (no-match)${inFile}: "${preview(hint.patch.find)}"`)
    } else {
      parts.push(
        `Anker mehrdeutig (${hint.matchCount}× gefunden)${inFile}: "${preview(hint.patch.find)}"`
      )
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
