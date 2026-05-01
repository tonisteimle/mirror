/**
 * Eval-Driver für den LLM-Edit-Flow (T2.5 Skeleton).
 *
 * Misst die End-to-End-Qualität: production prompt-builder → claude CLI →
 * production patch-parser/applier → compile-check → assertions.
 *
 * Bewusst klein gehalten: 1 Scenario pro Modus als Starter. Per Plan
 * (T2.5 DoD) kommen wir auf "5 Beispiele pro Modus" — Scenarios werden
 * **einzeln** dazugebaut + sofort mit `--only=ID` getestet, nicht im
 * Big-Bang (siehe Memory-Feedback `eval_scenarios_incremental`).
 *
 * Run:
 *   npx tsx scripts/eval-edit-flow.ts                 # alle Scenarios
 *   npx tsx scripts/eval-edit-flow.ts --only=mode1-1  # nur ein Scenario
 *   npx tsx scripts/eval-edit-flow.ts --list          # IDs auflisten
 *   npx tsx scripts/eval-edit-flow.ts --mode=2        # nur Modus 2
 *
 * Foreground, sichtbar, kein Background. Pro Scenario ~5-15s (claude CLI).
 */

import { spawn } from 'child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { buildEditPrompt, type EditCaptureCtx } from '../studio/agent/edit-prompts'
import { parsePatchResponse, type Patch } from '../studio/agent/patch-format'
import { applyPatches, type ApplyResult } from '../studio/agent/patch-applier'

// =============================================================================
// SCENARIO TYPES
// =============================================================================

type EditMode = 1 | 2 | 3

interface AssertContext {
  patches: Patch[]
  parseErrors: string[]
  apply: ApplyResult
  finalSource: string | null
  compileOk: boolean
}

interface Assertion {
  label: string
  check: (ctx: AssertContext) => { pass: boolean; detail?: string }
}

interface EditScenario {
  id: string
  label: string
  mode: EditMode
  /** Project files (for compile-check). currentFile must exist as a key. */
  files: Record<string, string>
  currentFile: string
  ctx: EditCaptureCtx
  asserts: Assertion[]
}

// =============================================================================
// ASSERT BUILDERS
// =============================================================================

const must = {
  applies: (label = 'patches apply cleanly'): Assertion => ({
    label,
    check: ctx => ({
      pass: ctx.apply.success,
      detail: ctx.apply.success
        ? undefined
        : `failed: ${ctx.apply.retryHints?.map(h => `${h.reason}(${h.matchCount}×)`).join(', ')}`,
    }),
  }),
  finalContains: (needle: string | RegExp, label?: string): Assertion => ({
    label: label ?? `final source contains ${describe(needle)}`,
    check: ctx => {
      if (!ctx.finalSource) return { pass: false, detail: 'no final source' }
      return {
        pass: matches(ctx.finalSource, needle),
        detail: matches(ctx.finalSource, needle) ? undefined : 'not found',
      }
    },
  }),
  finalNotContains: (needle: string | RegExp, label?: string): Assertion => ({
    label: label ?? `final source does not contain ${describe(needle)}`,
    check: ctx => {
      if (!ctx.finalSource) return { pass: false, detail: 'no final source' }
      return {
        pass: !matches(ctx.finalSource, needle),
        detail: matches(ctx.finalSource, needle) ? 'unexpected match' : undefined,
      }
    },
  }),
  compiles: (label = 'final source compiles'): Assertion => ({
    label,
    check: ctx => ({
      pass: ctx.compileOk,
      detail: ctx.compileOk ? undefined : 'compile failed',
    }),
  }),
  patchCount: (n: number, label?: string): Assertion => ({
    label: label ?? `produces exactly ${n} patch${n === 1 ? '' : 'es'}`,
    check: ctx => ({
      pass: ctx.patches.length === n,
      detail: ctx.patches.length === n ? undefined : `got ${ctx.patches.length}`,
    }),
  }),
}

function matches(s: string, n: string | RegExp): boolean {
  return typeof n === 'string' ? s.includes(n) : n.test(s)
}

function describe(n: string | RegExp): string {
  return typeof n === 'string' ? `"${n.length > 30 ? n.slice(0, 27) + '…' : n}"` : `/${n.source}/`
}

// =============================================================================
// SCENARIOS — 1 starter pro Modus. Erweitern auf je 5 (Plan T2.5 DoD).
// =============================================================================

const SCENARIOS: EditScenario[] = [
  // ─── MODUS 1: Cmd+Enter ohne Selection / ohne Instruction ──────────────
  {
    id: 'mode1-1',
    label: 'whole-doc: typo in button text',
    mode: 1,
    files: {
      'app.mir': 'canvas mobile, bg #1a1a1a\n\nButton "Speihern", bg #2271C1, col white',
    },
    currentFile: 'app.mir',
    ctx: {
      source: 'canvas mobile, bg #1a1a1a\n\nButton "Speihern", bg #2271C1, col white',
      fileName: 'app.mir',
      cursor: { line: 3, col: 1 },
      selection: null,
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      must.finalContains('Speichern'),
      must.finalNotContains('Speihern'),
      must.compiles(),
    ],
  },

  // ─── MODUS 2: Cmd+Enter MIT Selection (focused edit) ───────────────────
  {
    id: 'mode2-1',
    label: 'selection: change selected button background',
    mode: 2,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 12\n  Button "Save", bg #2271C1\n  Button "Cancel", bg #333',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 12\n  Button "Save", bg #2271C1\n  Button "Cancel", bg #333',
      fileName: 'app.mir',
      cursor: { line: 4, col: 3 },
      selection: {
        // Range covering the Save button line.
        from: 32,
        to: 64,
        text: '  Button "Save", bg #2271C1',
      },
      instruction: null,
      diffSinceLastCall: '',
      projectFiles: { tokens: {}, components: {} },
    },
    asserts: [
      must.applies(),
      // The selected line should change; the Cancel line should stay.
      must.finalContains('Cancel'),
      must.compiles(),
    ],
  },

  // ─── MODUS 3: Cmd+Shift+Enter (mit User-Anweisung) ─────────────────────
  {
    id: 'mode3-1',
    label: 'instruction: extract repeated style as token',
    mode: 3,
    files: {
      'app.mir':
        'canvas mobile\n\nFrame gap 12\n  Text "Title", col #2271C1, fs 18\n  Text "Sub", col #2271C1, fs 14',
      'tokens.tok': 'primary.col: #2271C1',
    },
    currentFile: 'app.mir',
    ctx: {
      source:
        'canvas mobile\n\nFrame gap 12\n  Text "Title", col #2271C1, fs 18\n  Text "Sub", col #2271C1, fs 14',
      fileName: 'app.mir',
      cursor: { line: 1, col: 1 },
      selection: null,
      instruction: 'Verwende den $primary Token für die col-Properties statt #2271C1',
      diffSinceLastCall: '',
      projectFiles: {
        tokens: { 'tokens.tok': 'primary.col: #2271C1' },
        components: {},
      },
    },
    asserts: [
      must.applies(),
      must.finalContains('$primary'),
      must.finalNotContains('#2271C1'),
      must.compiles(),
    ],
  },
]

// =============================================================================
// CLI EXEC — direct subprocess (same pattern as eval-ai-simple.ts)
// =============================================================================

function findClaudeBin(): string {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  const home = process.env.HOME
  if (home) return join(home, '.local', 'bin', 'claude')
  return 'claude'
}

const CLAUDE_BIN = findClaudeBin()

interface ClaudeResult {
  output: string
  error: string | null
  elapsedMs: number
}

function callClaude(prompt: string, timeoutMs = 90_000): Promise<ClaudeResult> {
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
// COMPILE — write all project files to tmpdir, run compiler/cli.ts
// =============================================================================

interface CompileResult {
  ok: boolean
  errors: string[]
  elapsedMs: number
}

function compileProject(
  files: Record<string, string>,
  currentFile: string,
  finalCurrentFileSource: string
): Promise<CompileResult> {
  const start = Date.now()
  return new Promise(resolve => {
    const tmp = mkdtempSync(join(tmpdir(), 'eval-edit-flow-'))
    try {
      for (const [name, content] of Object.entries(files)) {
        const out = name === currentFile ? finalCurrentFileSource : content
        writeFileSync(join(tmp, name), out)
      }
      const proc = spawn(
        'npx',
        ['tsx', 'compiler/cli.ts', '--project', tmp, '-o', join(tmp, 'out.js')],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', d => (stdout += d.toString()))
      proc.stderr.on('data', d => (stderr += d.toString()))
      proc.on('close', code => {
        try {
          rmSync(tmp, { recursive: true, force: true })
        } catch {
          /* ignore */
        }
        const errors = (stderr + '\n' + stdout)
          .split('\n')
          .filter(l => /error|fail/i.test(l))
          .filter(l => l.trim())
        resolve({ ok: code === 0, errors, elapsedMs: Date.now() - start })
      })
    } catch (err) {
      try {
        rmSync(tmp, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
      resolve({ ok: false, errors: [String(err)], elapsedMs: Date.now() - start })
    }
  })
}

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface ScenarioResult {
  scenario: EditScenario
  prompt: string
  rawOutput: string
  patches: Patch[]
  parseErrors: string[]
  apply: ApplyResult
  finalSource: string | null
  compileOk: boolean
  compileErrors: string[]
  assertResults: { label: string; pass: boolean; detail?: string }[]
  claudeMs: number
  compileMs: number
  totalMs: number
  error?: string
}

async function runScenario(scenario: EditScenario): Promise<ScenarioResult> {
  const totalStart = Date.now()
  const ts = (label: string) => `[+${((Date.now() - totalStart) / 1000).toFixed(1)}s] ${label}`

  console.log('')
  console.log('━'.repeat(80))
  console.log(`▶  ${scenario.id} (mode ${scenario.mode}): ${scenario.label}`)
  console.log('━'.repeat(80))
  if (scenario.ctx.instruction) console.log(`Instruction: "${scenario.ctx.instruction}"`)
  if (scenario.ctx.selection) console.log(`Selection: "${scenario.ctx.selection.text}"`)
  console.log(`Files: ${Object.keys(scenario.files).join(', ')}`)
  console.log(`Asserts: ${scenario.asserts.length}`)
  console.log('')

  console.log(ts('🔨 building prompt with buildEditPrompt (production fn)...'))
  const prompt = buildEditPrompt(scenario.ctx)
  console.log(ts(`   prompt is ${prompt.length} chars`))

  console.log(ts('🤖 calling claude -p (timeout 90s)...'))
  const claudeResult = await callClaude(prompt)
  if (claudeResult.error) {
    console.log(ts(`❌ claude error: ${claudeResult.error}`))
    return errResult(scenario, prompt, claudeResult.error, totalStart)
  }
  console.log(ts(`   got ${claudeResult.output.length} chars in ${claudeResult.elapsedMs}ms`))

  console.log(ts('✂  parsing patches via parsePatchResponse (production fn)...'))
  const parsed = parsePatchResponse(claudeResult.output)
  console.log(
    ts(`   ${parsed.patches.length} patch(es), ${parsed.parseErrors.length} parse-error(s)`)
  )
  for (const e of parsed.parseErrors) console.log(`     ! ${e}`)
  parsed.patches.forEach((p, i) => {
    console.log(`   patch #${i + 1}:`)
    console.log(`     FIND:    ${preview(p.find)}`)
    console.log(`     REPLACE: ${preview(p.replace)}`)
  })

  const apply = applyPatches(scenario.ctx.source, parsed.patches)
  let finalSource: string | null = null
  let compile: CompileResult = { ok: false, errors: [], elapsedMs: 0 }

  if (apply.success && apply.newSource !== undefined) {
    finalSource = apply.newSource
    console.log(ts('🔧 compile-checking final source via compiler CLI...'))
    compile = await compileProject(scenario.files, scenario.currentFile, finalSource)
    if (compile.ok) {
      console.log(ts(`   ✓ compile clean (${compile.elapsedMs}ms)`))
    } else {
      console.log(
        ts(`   ✗ compile FAILED (${compile.elapsedMs}ms) — ${compile.errors.length} error(s):`)
      )
      compile.errors.slice(0, 5).forEach(e => console.log(`     │ ${e.slice(0, 140)}`))
    }
  } else {
    console.log(
      ts(`   ✗ patches did NOT apply: ${apply.retryHints?.map(h => h.reason).join(', ')}`)
    )
  }

  console.log(ts(`✅ running ${scenario.asserts.length} assertions:`))
  const assertCtx: AssertContext = {
    patches: parsed.patches,
    parseErrors: parsed.parseErrors,
    apply,
    finalSource,
    compileOk: compile.ok,
  }
  const assertResults = scenario.asserts.map(a => {
    const r = a.check(assertCtx)
    return { label: a.label, pass: r.pass, detail: r.detail }
  })
  for (const r of assertResults) {
    const icon = r.pass ? '✓' : '✗'
    const detail = r.detail ? ` — ${r.detail}` : ''
    console.log(`     ${icon} ${r.label}${detail}`)
  }

  const totalMs = Date.now() - totalStart
  const passed = assertResults.filter(r => r.pass).length
  console.log('')
  console.log(
    `▷  ${scenario.id}: ${passed}/${assertResults.length} asserts ` +
      `| claude ${claudeResult.elapsedMs}ms | compile ${compile.elapsedMs}ms | total ${totalMs}ms`
  )

  return {
    scenario,
    prompt,
    rawOutput: claudeResult.output,
    patches: parsed.patches,
    parseErrors: parsed.parseErrors,
    apply,
    finalSource,
    compileOk: compile.ok,
    compileErrors: compile.errors,
    assertResults,
    claudeMs: claudeResult.elapsedMs,
    compileMs: compile.elapsedMs,
    totalMs,
  }
}

function errResult(
  scenario: EditScenario,
  prompt: string,
  error: string,
  start: number
): ScenarioResult {
  return {
    scenario,
    prompt,
    rawOutput: '',
    patches: [],
    parseErrors: [],
    apply: { success: false },
    finalSource: null,
    compileOk: false,
    compileErrors: [],
    assertResults: scenario.asserts.map(a => ({
      label: a.label,
      pass: false,
      detail: 'pipeline failed before assert',
    })),
    claudeMs: 0,
    compileMs: 0,
    totalMs: Date.now() - start,
    error,
  }
}

function preview(s: string, max = 80): string {
  const oneline = s.replace(/\n/g, '⏎')
  return oneline.length <= max ? oneline : oneline.slice(0, max - 1) + '…'
}

// =============================================================================
// MAIN
// =============================================================================

function parseArgs(argv: string[]): {
  list: boolean
  only: string | null
  mode: EditMode | null
} {
  let list = false
  let only: string | null = null
  let mode: EditMode | null = null
  for (const arg of argv.slice(2)) {
    if (arg === '--list') list = true
    else if (arg.startsWith('--only=')) only = arg.slice('--only='.length)
    else if (arg.startsWith('--mode=')) {
      const m = parseInt(arg.slice('--mode='.length), 10)
      if (m === 1 || m === 2 || m === 3) mode = m
    }
  }
  return { list, only, mode }
}

async function main() {
  const args = parseArgs(process.argv)

  if (args.list) {
    console.log('Available scenarios:')
    for (const s of SCENARIOS) console.log(`  [mode ${s.mode}] ${s.id} — ${s.label}`)
    return
  }

  let scenarios = SCENARIOS
  if (args.only) scenarios = scenarios.filter(s => s.id === args.only)
  if (args.mode !== null) scenarios = scenarios.filter(s => s.mode === args.mode)

  if (scenarios.length === 0) {
    console.error('No scenarios match the filter.')
    process.exit(1)
  }

  console.log(`Running ${scenarios.length} scenario(s)...`)
  const results: ScenarioResult[] = []
  for (const s of scenarios) {
    results.push(await runScenario(s))
  }

  console.log('')
  console.log('═'.repeat(80))
  console.log('SUMMARY')
  console.log('═'.repeat(80))
  let totalAsserts = 0
  let totalPassed = 0
  for (const r of results) {
    const passed = r.assertResults.filter(a => a.pass).length
    const total = r.assertResults.length
    totalAsserts += total
    totalPassed += passed
    const icon = passed === total ? '✓' : '✗'
    console.log(`  ${icon} ${r.scenario.id} — ${passed}/${total} asserts`)
  }
  console.log('')
  console.log(`Total: ${totalPassed}/${totalAsserts} assertions passed`)
  process.exit(totalPassed === totalAsserts ? 0 : 1)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
