/**
 * Zweistufige Generation-Pipeline: User-Prompt (oder Sketch) → HTML → Mirror.
 *
 * Stage 1: HTML-Generation
 *   - LLM frei generieren in HTML/CSS/JS
 *   - System-Prompt enthält Mirror-friendly Constraints + Translation-Hints
 *
 * Stage 2: LLM-Übersetzung
 *   - Frischer LLM-Call
 *   - Liest CLAUDE.md (im Project-Root) + strukturierten Context-Block
 *   - Liest die HTML aus Stage 1
 *   - Schreibt idiomatisches Mirror
 *
 * Stage 3: Validator
 *   - Mirror-Syntax + Token/State/Component-Refs via `compiler/validator`
 *   - Bei Fail → Translator erneut aufrufen mit Fehlerliste + Source
 *   - Max N Retries (default 2), bei Erschöpfung Output mit `warning`-Status
 *
 * Stateless. Kein Editor-Zugriff. Caller (Editor-Hook, CLI, Test) bekommt
 * den `GenerationPipelineResult` und entscheidet selbst über UI.
 */

import { runEdit } from './fixer'
import {
  buildHtmlGenerationPrompt,
  buildTranslationPrompt,
  type HtmlGenerationPromptInput,
  type TranslationContext,
} from './generation-prompts'
import { validate, type ValidationError, type ValidationResult } from '../../compiler/validator'

// ============================================================================
// API
// ============================================================================

export interface GenerationPipelineInput {
  /**
   * Freeform User-Prompt ("Eine Stat-Card mit Monthly Revenue, +12% vs last
   * month"). Entweder dieser Wert ODER `sketch` muss gesetzt sein. Wenn
   * beides gesetzt ist, wird `sketch` primär behandelt und `userPrompt`
   * als zusätzlicher Hint im HTML-Generation-Prompt erwähnt.
   */
  userPrompt?: string
  /**
   * Roher, unterspecifizierter Mirror-Sketch (Designer-Input). Pipeline
   * interpretiert grosszügig — Sketch → HTML → cleanes Mirror.
   */
  sketch?: string
  /**
   * Strukturierter Context-Block für die Translation-Stufe.
   * Optional, aber empfohlen für höhere Idiom-Qualität.
   */
  context?: TranslationContext
  /**
   * Project-Kontext für die Translation: existierende Tokens / Components,
   * die wiederverwendet (nicht redefiniert) werden sollen. Im MVP-Single-
   * File-Modus oft leer; bei späterer Multi-File-Reaktivierung mit Inhalt.
   */
  projectFiles?: {
    tokens: Record<string, string>
    components: Record<string, string>
  }
}

export interface RunGenerationPipelineOptions {
  /** Cancel laufenden Pipeline-Run (z.B. wenn der User Esc drückt). */
  signal?: AbortSignal
  /** Max Translation-Retries bei Validator-Fail. 0 = nie retry. Default: 2. */
  maxTranslationRetries?: number
  /**
   * Telemetrie-Hook: wird nach jedem Pipeline-Schritt mit dem Outcome
   * aufgerufen. Erlaubt Eval / Studio-Status-Indicator ohne globalen State.
   */
  onStep?: (event: GenerationPipelineStepEvent) => void
}

export type GenerationPipelineStatus = 'success' | 'warning' | 'error'

export interface GenerationPipelineResult {
  status: GenerationPipelineStatus
  /** Finaler Mirror-Output (gesetzt bei `success` und `warning`). */
  mirror?: string
  /** HTML-Zwischenartefakt (gesetzt sobald Stage 1 erfolgreich war). */
  html?: string
  /** Validator-Errors aus dem letzten Versuch (nur bei `warning`). */
  validationErrors?: ValidationError[]
  /** Anzahl tatsächlich durchgeführter Translation-Retries (0 = direkt). */
  translationRetries?: number
  /** Menschenlesbare Fehler-Beschreibung (nur bei `error`). */
  error?: string
}

export type GenerationPipelineStepEvent =
  | { kind: 'html-start' }
  | { kind: 'html-done'; html: string; durationMs: number }
  | { kind: 'translate-start'; attempt: number }
  | { kind: 'translate-done'; mirror: string; attempt: number; durationMs: number }
  | { kind: 'validate'; attempt: number; valid: boolean; errorCount: number }
  | { kind: 'error'; phase: 'html' | 'translate' | 'validate'; message: string }

const DEFAULT_MAX_RETRIES = 2

export async function runGenerationPipeline(
  input: GenerationPipelineInput,
  options: RunGenerationPipelineOptions = {}
): Promise<GenerationPipelineResult> {
  const { signal, maxTranslationRetries = DEFAULT_MAX_RETRIES, onStep } = options

  if (!input.userPrompt && !input.sketch) {
    return {
      status: 'error',
      error: 'Pipeline-Input leer — userPrompt oder sketch muss gesetzt sein.',
    }
  }

  // -------------------------------------------------------------------------
  // Stage 1: HTML-Generation
  // -------------------------------------------------------------------------
  onStep?.({ kind: 'html-start' })
  const htmlPromptInput: HtmlGenerationPromptInput = {
    userPrompt: input.userPrompt,
    sketch: input.sketch,
  }
  const htmlPrompt = buildHtmlGenerationPrompt(htmlPromptInput)

  let htmlRaw: string
  const htmlStart = performance.now()
  try {
    htmlRaw = await runEdit(htmlPrompt, signal)
  } catch (err) {
    if (isAbortError(err)) throw err
    const message = errorMessage(err)
    onStep?.({ kind: 'error', phase: 'html', message })
    return { status: 'error', error: `HTML-Generation fehlgeschlagen: ${message}` }
  }
  const html = stripCodeFences(htmlRaw, 'html').trim()
  const htmlDuration = performance.now() - htmlStart
  if (html === '') {
    onStep?.({ kind: 'error', phase: 'html', message: 'leerer Output' })
    return { status: 'error', error: 'HTML-Generation lieferte leeren Output.' }
  }
  onStep?.({ kind: 'html-done', html, durationMs: htmlDuration })

  // -------------------------------------------------------------------------
  // Stage 2 + 3: Translation + Validation (mit Retry-Loop)
  // -------------------------------------------------------------------------
  let attempt = 0
  let lastMirror = ''
  let lastValidationErrors: ValidationError[] = []

  while (true) {
    onStep?.({ kind: 'translate-start', attempt })

    const translationPrompt = buildTranslationPrompt({
      html,
      context: input.context,
      projectFiles: input.projectFiles,
      retryContext:
        attempt > 0
          ? { validationErrors: lastValidationErrors, previousMirror: lastMirror }
          : undefined,
    })

    let mirrorRaw: string
    const translateStart = performance.now()
    try {
      mirrorRaw = await runEdit(translationPrompt, signal)
    } catch (err) {
      if (isAbortError(err)) throw err
      const message = errorMessage(err)
      onStep?.({ kind: 'error', phase: 'translate', message })
      return {
        status: 'error',
        html,
        translationRetries: attempt,
        error: `Translation fehlgeschlagen: ${message}`,
      }
    }
    const mirror = stripCodeFences(mirrorRaw, 'mirror').trim()
    const translateDuration = performance.now() - translateStart

    if (mirror === '') {
      onStep?.({ kind: 'error', phase: 'translate', message: 'leerer Output' })
      return {
        status: 'error',
        html,
        translationRetries: attempt,
        error: 'Translation lieferte leeren Output.',
      }
    }

    onStep?.({ kind: 'translate-done', mirror, attempt, durationMs: translateDuration })

    // Pre-flight: catch known parser-pathological patterns BEFORE calling
    // the (synchronous) validator. Nested state blocks cause the current
    // parser to hang in an infinite loop — without this guard, a single
    // bad LLM output would freeze the studio for the user.
    const preflight = detectPreflightIssues(mirror)
    if (preflight.length > 0) {
      onStep?.({
        kind: 'validate',
        attempt,
        valid: false,
        errorCount: preflight.length,
      })
      lastMirror = mirror
      lastValidationErrors = preflight
      if (attempt >= maxTranslationRetries) {
        return {
          status: 'warning',
          mirror,
          html,
          validationErrors: preflight,
          translationRetries: attempt,
        }
      }
      attempt++
      continue
    }

    // Validate. For the AI pipeline we elevate W500 (undefined token) from
    // warning to blocking, because a Mirror with `bg $missing` parses but
    // breaks at runtime — and a missing token-definition is exactly the
    // kind of bug the translator is most likely to introduce. Spurious
    // W500s from `$N`-shaped string literals are filtered out.
    let validationErrors: ValidationError[]
    try {
      const result = validate(mirror)
      validationErrors = selectBlockingIssues(result)
      onStep?.({
        kind: 'validate',
        attempt,
        valid: validationErrors.length === 0,
        errorCount: validationErrors.length,
      })
      if (validationErrors.length === 0) {
        return {
          status: 'success',
          mirror,
          html,
          translationRetries: attempt,
        }
      }
    } catch (err) {
      const message = errorMessage(err)
      onStep?.({ kind: 'error', phase: 'validate', message })
      // Validator-Crash ist unerwartet — Output trotzdem zurückgeben mit
      // warning, damit der User den Roh-Mirror sieht und manuell handeln
      // kann. Pipeline ist stateless, der Caller entscheidet.
      return {
        status: 'warning',
        mirror,
        html,
        validationErrors: [],
        translationRetries: attempt,
        error: `Validator-Crash: ${message}`,
      }
    }

    // Validator failed — prepare retry
    lastMirror = mirror
    lastValidationErrors = validationErrors
    if (attempt >= maxTranslationRetries) {
      // Retries erschöpft — Output trotzdem mit `warning` zurückgeben.
      // Der Caller kann entscheiden ob er anzeigen oder verwerfen will.
      return {
        status: 'warning',
        mirror,
        html,
        validationErrors,
        translationRetries: attempt,
      }
    }
    attempt++
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Real Mirror tokens follow identifier syntax: a letter start, optional
 * dot-suffix. The lexer occasionally surfaces `$N`-shaped substrings from
 * inside string literals (e.g. `"$48,217"`) as token references — those
 * fail this pattern and get filtered out below.
 *
 * TODO: Fix at the source by making the parser/lexer not emit token-refs
 * from inside string literals. Until then, this filter prevents the
 * pipeline from chasing phantom undefined-token errors.
 */
const VALID_TOKEN_REF_RE = /^\$[a-zA-Z_][a-zA-Z0-9_-]*(?:\.[a-zA-Z_][a-zA-Z0-9_-]*)?$/

function looksLikeRealTokenRef(message: string): boolean {
  // Validator emits `Token "${tokenRef}" is not defined`.
  const match = message.match(/^Token "([^"]+)" is not defined$/)
  if (!match) return true // unknown message shape — be safe, keep as blocking
  return VALID_TOKEN_REF_RE.test(match[1])
}

/**
 * Combine validator errors with the warning subset we treat as blocking
 * for the AI-pipeline use case. Today: only W500 (undefined token) gets
 * elevated. W501 (unused token) and W503 (unused component) stay
 * non-blocking — they're code smells, not runtime breakage.
 */
function selectBlockingIssues(result: ValidationResult): ValidationError[] {
  const blocking: ValidationError[] = [...result.errors]
  for (const w of result.warnings) {
    if (w.code === 'W500' && looksLikeRealTokenRef(w.message)) {
      blocking.push({ ...w, severity: 'error' })
    }
  }
  return blocking
}

/**
 * Pre-flight check for parser-pathological patterns. Runs BEFORE the
 * validator on Mirror that the LLM produced — because some inputs hang
 * the parser in an infinite loop, and the validator can't be aborted
 * once running (synchronous code, no worker isolation today).
 *
 * Currently detected:
 *  - Nested state blocks (`hover:` inside `on:` etc.) — trigger an
 *    infinite loop in the current parser. Discovered in the
 *    profile-card-toggle smoke test (2026-05-05).
 *
 * Returns errors in the same shape as the validator, so they thread
 * through the existing retry-loop without special-casing.
 *
 * TODO: remove the pre-flight once the parser bug is fixed in
 * `compiler/parser/`. Tracked alongside the canvas-position bug.
 */
const STATE_BLOCK_NAMES = [
  'hover',
  'focus',
  'active',
  'disabled',
  'on',
  'selected',
  'highlighted',
  'expanded',
  'collapsed',
  'open',
  'closed',
  'filled',
  'valid',
  'invalid',
  'loading',
  'error',
  'compact',
  'regular',
  'wide',
]
const STATE_BLOCK_RE = new RegExp(`^(\\s*)(${STATE_BLOCK_NAMES.join('|')}):\\s*$`)

function detectPreflightIssues(source: string): ValidationError[] {
  const issues: ValidationError[] = []
  const lines = source.split('\n')

  // Track open state-block ranges by indent. When we see a state-block
  // header, we record its indent. Any deeper-indented state-block header
  // before we exit the parent's indent counts as nesting.
  const openStateIndents: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue

    const indent = line.match(/^(\s*)/)?.[1].length ?? 0

    // Pop all state-blocks whose indent is >= current line's indent (we
    // exited their scope).
    while (openStateIndents.length > 0 && indent <= openStateIndents[openStateIndents.length - 1]) {
      openStateIndents.pop()
    }

    const stateMatch = line.match(STATE_BLOCK_RE)
    if (stateMatch) {
      if (openStateIndents.length > 0) {
        // We're inside another state block — this is the nested-state bug.
        const parentIndent = openStateIndents[openStateIndents.length - 1]
        issues.push({
          severity: 'error',
          code: 'PIPELINE_NESTED_STATE',
          message: `Nested state block "${stateMatch[2]}:" at indent ${indent} inside another state block at indent ${parentIndent}. State blocks cannot be nested — flatten to one level per element.`,
          line: i + 1,
          column: indent + 1,
          suggestion:
            'Remove the inner state block or move it out of the parent state. Each element gets at most ONE level of state blocks.',
        })
      }
      openStateIndents.push(indent)
    }
  }

  return issues
}

/**
 * Entferne markdown code-fences aus dem LLM-Output, falls vorhanden.
 * Die System-Prompts verlangen "no fences", aber LLMs ignorieren das
 * gelegentlich. Wir säubern defensiv, statt am Output zu scheitern.
 */
function stripCodeFences(raw: string, language: 'html' | 'mirror'): string {
  let s = raw.trim()
  // Match opening fence: ```html, ```mirror, or just ```
  const openRegex = new RegExp(`^\`\`\`(?:${language}|html|mirror)?\\s*\\n`)
  const openMatch = s.match(openRegex)
  if (!openMatch) return s
  s = s.slice(openMatch[0].length)
  // Strip trailing fence
  const closeMatch = s.match(/\n```\s*$/)
  if (closeMatch) {
    s = s.slice(0, s.length - closeMatch[0].length)
  }
  return s
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
