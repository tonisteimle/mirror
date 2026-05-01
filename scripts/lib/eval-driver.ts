/**
 * Shared infrastructure for the LLM eval-drivers in `scripts/eval-*.ts`.
 *
 * Each driver answers a different *semantic* question (token-, component-,
 * redundancy-, mixed-quality), but the mechanical steps are identical:
 *
 *   findClaudeBin → callClaude(prompt) → parsePatchResponse → applyPatches
 *
 * This module owns those mechanics so the per-driver files only contain
 * scenarios + per-scenario reporting.
 *
 * Scope intentionally narrow: no scenario types, no summary format. Each
 * driver still owns those because the violation-shape and the "what passed"
 * criterion differ between them.
 */

import { spawn } from 'child_process'
import { join } from 'path'
import { buildEditPrompt, type EditCaptureCtx } from '../../studio/agent/edit-prompts'
import { parsePatchResponse, type ParsedPatchResponse } from '../../studio/agent/patch-format'
import { applyPatches, type ApplyResult } from '../../studio/agent/patch-applier'

// =============================================================================
// CLAUDE CLI
// =============================================================================

export function findClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  const home = process.env.HOME
  if (home) return join(home, '.local', 'bin', 'claude')
  return 'claude'
}

const CLAUDE_BIN = findClaudeBin()

export interface ClaudeResult {
  output: string
  error: string | null
  elapsedMs: number
}

/**
 * Spawn the claude CLI, write `prompt` to stdin, return stdout. Times out
 * after `timeoutMs` (default 90s) by sending SIGTERM. Never throws — all
 * failure modes come back via the `error` field.
 */
export function callClaude(prompt: string, timeoutMs = 90_000): Promise<ClaudeResult> {
  return new Promise(resolve => {
    const start = Date.now()
    const proc = spawn(CLAUDE_BIN, ['-p', '--output-format', 'text'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    let killed = false
    const timer = setTimeout(() => {
      killed = true
      proc.kill('SIGTERM')
    }, timeoutMs)
    proc.stdout.on('data', d => (stdout += d.toString()))
    proc.stderr.on('data', d => (stderr += d.toString()))
    proc.on('error', err => {
      clearTimeout(timer)
      resolve({
        output: '',
        error: `spawn failed: ${err.message}`,
        elapsedMs: Date.now() - start,
      })
    })
    proc.on('close', code => {
      clearTimeout(timer)
      const elapsedMs = Date.now() - start
      if (killed) {
        resolve({ output: stdout, error: `claude killed after ${timeoutMs}ms timeout`, elapsedMs })
      } else if (code === 0) {
        resolve({ output: stdout, error: null, elapsedMs })
      } else {
        resolve({
          output: stdout,
          error: stderr.trim() || `claude exited with code ${code}`,
          elapsedMs,
        })
      }
    })
    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

// =============================================================================
// FORMATTING
// =============================================================================

/**
 * Compact one-line preview of multi-line text. Newlines become ⏎ and the
 * result is truncated to `max` chars with an ellipsis suffix.
 */
export function preview(s: string, max = 90): string {
  const oneline = s.replace(/\n/g, '⏎')
  return oneline.length <= max ? oneline : oneline.slice(0, max - 1) + '…'
}

// =============================================================================
// CLI ARG PARSING
// =============================================================================

export interface EvalArgs {
  /** `--list` was passed → just print scenario IDs and exit. */
  list: boolean
  /** `--only=<id>` filter, or null. */
  only: string | null
}

export function parseEvalArgs(argv = process.argv.slice(2)): EvalArgs {
  const list = argv.includes('--list')
  const onlyArg = argv.find(a => a.startsWith('--only='))
  const only = onlyArg ? onlyArg.slice('--only='.length) : null
  return { list, only }
}

// =============================================================================
// PIPELINE — one scenario worth of work
// =============================================================================

export interface PipelineOutcome {
  /** Raw claude stdout (may be empty on error). */
  rawOutput: string
  /** Parse result of the claude output (patches + parseErrors). */
  parsed: ParsedPatchResponse
  /** Result of applying the parsed patches. */
  applyResult: ApplyResult
  /**
   * The source we should run quality-checks against. For a successful
   * patch, that's the new source; otherwise it's the original (no-change
   * preserves source). On apply-fail this is null because there's no
   * coherent "final" source.
   */
  finalSource: string | null
  /** True iff there were no patches AND no parse errors. */
  noChange: boolean
  /** True iff parsed at least one patch but applyPatches couldn't apply. */
  applyFailed: boolean
  /** Bridge or spawn failure — claude itself didn't return a usable result. */
  claudeError: string | null
  claudeMs: number
}

/**
 * Run the full LLM pipeline for a single scenario:
 *   buildEditPrompt → callClaude → parsePatchResponse → applyPatches
 *
 * Logs progress to stdout (caller-visible). Per-scenario violation
 * reporting and summary stay with the caller — they vary too much to
 * usefully share.
 *
 * Each driver typically wraps this and adds its own quality-check logic
 * on top of `outcome.finalSource`.
 */
export async function runEvalPipeline(ctx: EditCaptureCtx): Promise<PipelineOutcome> {
  const prompt = buildEditPrompt(ctx)
  console.log(`📝 prompt ${prompt.length} chars`)

  console.log('🤖 calling claude (timeout 90s)...')
  const claude = await callClaude(prompt)

  if (claude.error) {
    console.log(`❌ claude error: ${claude.error}`)
    return {
      rawOutput: claude.output,
      parsed: { patches: [], parseErrors: [] },
      applyResult: { success: false },
      finalSource: null,
      noChange: false,
      applyFailed: false,
      claudeError: claude.error,
      claudeMs: claude.elapsedMs,
    }
  }
  console.log(`   got ${claude.output.length} chars in ${claude.elapsedMs}ms`)

  const parsed = parsePatchResponse(claude.output)
  console.log(
    `✂  parsed: ${parsed.patches.length} patch(es), ${parsed.parseErrors.length} parse-error(s)`
  )
  parsed.patches.forEach((p, i) => {
    console.log(`   patch #${i + 1}:`)
    console.log(`     FIND:    ${preview(p.find)}`)
    console.log(`     REPLACE: ${preview(p.replace)}`)
  })

  const noChange = parsed.patches.length === 0 && parsed.parseErrors.length === 0
  if (noChange) console.log(`   (no-change)`)

  const applyResult = applyPatches(ctx.source, parsed.patches)
  const applyFailed = parsed.patches.length > 0 && !applyResult.success

  if (applyFailed) {
    console.log(
      `   ✗ patches did NOT apply: ${applyResult.retryHints?.map(h => h.reason).join(', ') ?? 'unknown'}`
    )
    return {
      rawOutput: claude.output,
      parsed,
      applyResult,
      finalSource: null,
      noChange: false,
      applyFailed: true,
      claudeError: null,
      claudeMs: claude.elapsedMs,
    }
  }

  const finalSource =
    applyResult.success && applyResult.newSource !== undefined ? applyResult.newSource : ctx.source

  console.log(`📦 final source:`)
  for (const line of finalSource.split('\n')) console.log(`   │ ${line}`)

  return {
    rawOutput: claude.output,
    parsed,
    applyResult,
    finalSource,
    noChange,
    applyFailed: false,
    claudeError: null,
    claudeMs: claude.elapsedMs,
  }
}

// =============================================================================
// SCENARIO DRIVER LOOP — the part that's the same in every driver's main()
// =============================================================================

export interface ScenarioBase {
  id: string
  label: string
}

/**
 * Filter `scenarios` by `--only=` and exit early on `--list`. Returns
 * the (possibly empty) filtered list. Used by every driver's main().
 */
export function applyScenarioFilter<T extends ScenarioBase>(
  scenarios: T[],
  args: EvalArgs,
  listLabel: string
): T[] | null {
  if (args.list) {
    console.log(`Available ${listLabel} scenarios:`)
    for (const s of scenarios) console.log(`  ${s.id} — ${s.label}`)
    return null
  }
  let filtered = scenarios
  if (args.only) filtered = filtered.filter(s => s.id === args.only)
  if (filtered.length === 0) {
    console.error(`No scenarios match filter --only=${args.only}`)
    process.exit(1)
  }
  return filtered
}

/**
 * Standard scenario header — keeps the look-and-feel consistent across
 * drivers without forcing the runner into a single shape.
 */
export function logScenarioHeader(id: string, label: string, question: string, extras?: string[]) {
  console.log('')
  console.log('━'.repeat(80))
  console.log(`▶  ${id}: ${label}`)
  console.log('   Q: ' + question)
  if (extras) for (const e of extras) console.log('   ' + e)
  console.log('━'.repeat(80))
}
