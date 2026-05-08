#!/usr/bin/env tsx
/**
 * Real-LLM eval for the HTML-first generation pipeline.
 *
 *   npx tsx scripts/eval-generation-pipeline.ts [options]
 *
 * Drives `runGenerationPipeline` against the actual `claude` CLI with a
 * curated set of fixture prompts. Captures HTML + Mirror + timings +
 * validation outcome per fixture, optionally renders the resulting
 * Mirror to standalone HTML via `mirror-build`, and writes a markdown
 * report at the end.
 *
 * Production code path: we install a `globalThis.window.TauriBridge`
 * shim that delegates `runAgent` calls to `spawn('claude', ...)`. The
 * pipeline itself runs UNCHANGED — same prompts, same retry-loop, same
 * pre-flight + W500 elevation. This is the eval-CLI we'd use to validate
 * a prompt-tuning change before shipping.
 *
 * Manual eval — NOT in CI. Each fixture costs ~30–90s of claude time
 * (Stage 1 + Stage 2 + up to 2 retries). Six fixtures × 1 run ≈ 5 min.
 *
 * Output: `eval-results/generation-pipeline/<timestamp>/`
 *   - report.md            — aggregate summary
 *   - results.json         — machine-readable (resume-friendly)
 *   - <fixture>/run-<n>/
 *       - prompt.txt       — the input userPrompt + sketch + siblings
 *       - html.html        — Stage 1 output
 *       - mirror.mir       — Stage 2 output (final, post-retries)
 *       - validation.json  — validator errors (if any)
 *       - steps.ndjson     — every onStep event in order
 *       - render.html      — compiled Mirror as standalone HTML (if --render)
 *       - error.txt        — error message (if status === 'error')
 */

import { spawn } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

// ============================================================================
// Bridge shim — must be installed BEFORE the pipeline is imported.
// ============================================================================

function findClaudeBinary(): string {
  if (process.env.CLAUDE_BIN && existsSync(process.env.CLAUDE_BIN)) {
    return process.env.CLAUDE_BIN
  }
  const home = process.env.HOME
  if (home) {
    const local = join(home, '.local', 'bin', 'claude')
    if (existsSync(local)) return local
  }
  return 'claude'
}
const CLAUDE_BIN = findClaudeBinary()

interface BridgeRunAgentResult {
  session_id: string
  success: boolean
  output: string
  error: string | null
}

let bridgeCallCount = 0
let bridgeTotalMs = 0

function callClaudeViaSpawn(prompt: string, signal?: AbortSignal): Promise<BridgeRunAgentResult> {
  return new Promise((resolveP, rejectP) => {
    if (signal?.aborted) {
      rejectP(new DOMException('Aborted', 'AbortError'))
      return
    }
    const start = Date.now()
    const args = ['-p', '--output-format', 'text']
    const proc = spawn(CLAUDE_BIN, args, { stdio: ['pipe', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let aborted = false

    const onAbort = () => {
      aborted = true
      proc.kill('SIGKILL')
    }
    if (signal) signal.addEventListener('abort', onAbort, { once: true })

    proc.stdout.on('data', c => (stdout += c.toString()))
    proc.stderr.on('data', c => (stderr += c.toString()))
    proc.on('error', err => {
      if (signal) signal.removeEventListener('abort', onAbort)
      const elapsed = Date.now() - start
      bridgeCallCount += 1
      bridgeTotalMs += elapsed
      resolveP({
        session_id: '',
        success: false,
        output: '',
        error: `spawn failed: ${err.message}`,
      })
    })
    proc.on('close', code => {
      if (signal) signal.removeEventListener('abort', onAbort)
      const elapsed = Date.now() - start
      bridgeCallCount += 1
      bridgeTotalMs += elapsed
      if (aborted) {
        rejectP(new DOMException('Aborted', 'AbortError'))
        return
      }
      if (code === 0) {
        resolveP({ session_id: 'eval', success: true, output: stdout, error: null })
      } else {
        resolveP({
          session_id: 'eval',
          success: false,
          output: stdout,
          error: stderr.trim() || `claude exited with code ${code}`,
        })
      }
    })

    proc.stdin.write(prompt)
    proc.stdin.end()
  })
}

// Install the shim BEFORE pulling in the pipeline. `runEdit` looks at
// `window.TauriBridge` — it's the only browser-ish global on the call path.
{
  const win: Record<string, unknown> = (globalThis as unknown as { window?: Record<string, unknown> }).window ?? {}
  win.TauriBridge = {
    isTauri: () => true,
    agent: {
      checkClaudeCli: async () => true,
      runAgent: async (prompt: string, _agentType: string, _projectPath: string, _sessionId: string | null) =>
        callClaudeViaSpawn(prompt),
    },
  }
  ;(globalThis as unknown as { window: typeof win }).window = win
}

// Now we can dynamically import the pipeline.
type PipelineModule = typeof import('../studio/agent/generation-pipeline')
const pipelineModulePromise: Promise<PipelineModule> = import('../studio/agent/generation-pipeline')

// ============================================================================
// Fixtures — 6 prompts span the spectrum we care about.
// ============================================================================

interface Fixture {
  id: string
  label: string
  /** Why this fixture is in the suite — what dimension does it stress? */
  rationale: string
  userPrompt?: string
  sketch?: string
  /** Sibling files for translation context (tokens/components). */
  siblings?: Record<string, string>
}

const FIXTURES: Fixture[] = [
  {
    id: 'p1-login-form',
    label: 'Login form (styling + hover)',
    rationale:
      'Pure styling + hover state. Tests Stage 2 idiom: should produce Btn: with hover: state, no nesting, sensible token-less defaults.',
    userPrompt:
      'Eine Login-Form mit Email und Passwort, einem Login-Button (primary blue) und einem "Passwort vergessen?"-Link. Der Button hat einen hover-State. Mache es kompakt, max 320px breit.',
  },
  {
    id: 'p2-pricing-tiers',
    label: 'Pricing tiers (repetition + hierarchy)',
    rationale:
      'Three repeated cards with one highlighted. Tests component-extraction (Tier:) and exclusive emphasis pattern.',
    userPrompt:
      'Drei Pricing-Tiers nebeneinander: Free, Pro (highlighted), Enterprise. Jedes mit Titel, Preis, drei Features (Bullet-Liste mit check-Icons) und einem CTA-Button. Pro-Karte hat einen farbigen Border und eine "Most Popular"-Badge.',
  },
  {
    id: 'p3-tabs-toggle',
    label: 'Tabs with switch toggle (interaction + structure)',
    rationale:
      'Tests Mirror`s exclusive() / toggle() actions. Stage 2 must recognize tab pattern and emit Tab: + selected: state.',
    userPrompt:
      'Eine Settings-Section mit drei Tabs (Account, Notifications, Privacy) — Notifications ist aktiv. Im aktiven Tab: drei Switch-Toggles ("Email digest", "Push notifications", "Weekly summary") — die ersten zwei sind on, der dritte off.',
  },
  {
    id: 'p4-tokens-resolved',
    label: 'Stat cards using sibling tokens',
    rationale:
      'Tests sibling-context: translator must use $brand/$muted from tokens.tok rather than inline hex. Stresses the W500 elevation: undefined token → blocking error → retry.',
    userPrompt:
      'Drei Stat-Cards in einer Reihe: "Revenue $48,217 (+12%)", "Users 1,294 (+8%)", "Churn 2.3% (-0.4pt)". Jede mit grossem Wert, Label drüber, Delta-Pill (grün/rot) drunter. Karten haben rad 8 und nutzen die existierenden Brand-Farben.',
    siblings: {
      'tokens.tok': [
        'brand.bg: #2271C1',
        'brand.col: white',
        'muted.col: #888',
        'positive.bg: #10b981',
        'negative.bg: #ef4444',
        'card.bg: #1a1a1a',
        'card.rad: 8',
      ].join('\n'),
    },
  },
  {
    id: 'p5-component-extraction',
    label: 'Three cards sharing structure',
    rationale:
      'Three cards with identical structure — translator should define Card: once and call it three times, not inline-repeat.',
    userPrompt:
      'Drei Project-Cards in einer Reihe. Jede zeigt: Cover (60×60 farbiger Block mit Icon), Titel, kurze Beschreibung (2 Zeilen), Status-Pill ("Active"/"Paused"/"Done"). Cards: "Homepage Redesign" (active, blau), "Email Migration" (paused, gelb), "Auth v2" (done, grün).',
  },
  {
    id: 'p6-sketch-cleanup',
    label: 'Rough sketch → cleaned Mirror',
    rationale:
      'Sketch-only path (no userPrompt). Tests buildHtmlGenerationPrompt sketch branch + the inference rules for incomplete input.',
    sketch: [
      'Frame gap 16, pad 24',
      '  Text "Welcome back, Anna", fs 24',
      '  Frame hor, gap 12',
      '    Frame pad 12, bg gray',
      '      Text "12 todos"',
      '    Frame pad 12, bg gray',
      '      Text "3 due today"',
      '  Button "Add task"',
    ].join('\n'),
  },
]

// ============================================================================
// Per-fixture run
// ============================================================================

import type {
  GenerationPipelineInput,
  GenerationPipelineResult,
  GenerationPipelineStepEvent,
} from '../studio/agent/generation-pipeline'

interface FixtureRunRecord {
  fixtureId: string
  fixtureLabel: string
  run: number
  startedAt: string
  finishedAt: string
  status: GenerationPipelineResult['status'] | 'crashed'
  totalMs: number
  htmlMs: number
  translateMs: number
  /** Total of all translate-attempt durations (includes retries). */
  translateAttempts: number
  retries: number
  validationErrorCount: number
  validationErrors: Array<{ code?: string; severity?: string; message: string; line?: number; column?: number }>
  htmlBytes: number
  mirrorBytes: number
  rendered: boolean
  renderError?: string
  errorMessage?: string
}

interface RunOpts {
  outRoot: string
  render: boolean
  timeoutMs: number
  maxRetries: number
}

function logTo(path: string, text: string) {
  appendFileSync(path, text, 'utf8')
}

async function runFixture(
  fixture: Fixture,
  run: number,
  opts: RunOpts,
  pipeline: PipelineModule
): Promise<FixtureRunRecord> {
  const cellRoot = join(opts.outRoot, fixture.id, `run-${run}`)
  mkdirSync(cellRoot, { recursive: true })

  const promptPath = join(cellRoot, 'prompt.txt')
  writeFileSync(
    promptPath,
    [
      `# ${fixture.id} — ${fixture.label}`,
      `# rationale: ${fixture.rationale}`,
      ``,
      fixture.userPrompt ? `## userPrompt\n${fixture.userPrompt}` : '',
      fixture.sketch ? `## sketch\n${fixture.sketch}` : '',
      fixture.siblings
        ? `## siblings\n` +
          Object.entries(fixture.siblings)
            .map(([f, c]) => `--- ${f} ---\n${c}`)
            .join('\n\n')
        : '',
    ]
      .filter(Boolean)
      .join('\n\n'),
    'utf8'
  )

  const stepsPath = join(cellRoot, 'steps.ndjson')
  writeFileSync(stepsPath, '', 'utf8')

  const record: FixtureRunRecord = {
    fixtureId: fixture.id,
    fixtureLabel: fixture.label,
    run,
    startedAt: new Date().toISOString(),
    finishedAt: '',
    status: 'error',
    totalMs: 0,
    htmlMs: 0,
    translateMs: 0,
    translateAttempts: 0,
    retries: 0,
    validationErrorCount: 0,
    validationErrors: [],
    htmlBytes: 0,
    mirrorBytes: 0,
    rendered: false,
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), opts.timeoutMs)
  const t0 = Date.now()

  let lastResult: GenerationPipelineResult | null = null
  try {
    const input: GenerationPipelineInput = {
      userPrompt: fixture.userPrompt,
      sketch: fixture.sketch,
      siblings: fixture.siblings,
    }
    lastResult = await pipeline.runGenerationPipeline(input, {
      signal: ac.signal,
      maxTranslationRetries: opts.maxRetries,
      onStep: (event: GenerationPipelineStepEvent) => {
        logTo(stepsPath, JSON.stringify({ t: Date.now() - t0, ...event }) + '\n')
        if (event.kind === 'html-done') {
          record.htmlMs = event.durationMs
        }
        if (event.kind === 'translate-done') {
          record.translateMs += event.durationMs
          record.translateAttempts += 1
          record.retries = event.attempt
        }
      },
    })
    record.status = lastResult.status
    if (lastResult.html) {
      record.htmlBytes = Buffer.byteLength(lastResult.html, 'utf8')
      writeFileSync(join(cellRoot, 'html.html'), lastResult.html, 'utf8')
    }
    if (lastResult.mirror) {
      record.mirrorBytes = Buffer.byteLength(lastResult.mirror, 'utf8')
      writeFileSync(join(cellRoot, 'mirror.mir'), lastResult.mirror, 'utf8')
    }
    if (lastResult.validationErrors && lastResult.validationErrors.length > 0) {
      record.validationErrorCount = lastResult.validationErrors.length
      record.validationErrors = lastResult.validationErrors.map(e => ({
        code: e.code,
        severity: e.severity,
        message: e.message,
        line: e.line,
        column: e.column,
      }))
      writeFileSync(
        join(cellRoot, 'validation.json'),
        JSON.stringify(record.validationErrors, null, 2),
        'utf8'
      )
    }
    if (lastResult.status === 'error' && lastResult.error) {
      record.errorMessage = lastResult.error
      writeFileSync(join(cellRoot, 'error.txt'), lastResult.error, 'utf8')
    }
    record.retries = lastResult.translationRetries ?? record.retries
  } catch (err) {
    record.status = 'crashed'
    record.errorMessage = (err as Error).message
    writeFileSync(join(cellRoot, 'error.txt'), record.errorMessage, 'utf8')
  } finally {
    clearTimeout(timer)
    record.totalMs = Date.now() - t0
    record.finishedAt = new Date().toISOString()
  }

  // Optional render step. We only attempt rendering if the pipeline
  // produced Mirror output. Render-failure is non-fatal — the eval is
  // primarily about pipeline behavior, not the build CLI.
  if (opts.render && lastResult && lastResult.mirror) {
    try {
      await renderMirror(lastResult.mirror, fixture.siblings, cellRoot)
      record.rendered = true
    } catch (err) {
      record.renderError = (err as Error).message
    }
  }

  return record
}

// ============================================================================
// Mirror → standalone HTML via `mirror-build`. Multi-file siblings get
// written into a temp project dir so token/component refs resolve.
// ============================================================================

async function renderMirror(
  mirror: string,
  siblings: Record<string, string> | undefined,
  outDir: string
): Promise<void> {
  const projectDir = join(outDir, 'project')
  mkdirSync(projectDir, { recursive: true })
  // Multi-file: write siblings + the entry file. Single-file mode if no siblings.
  if (siblings && Object.keys(siblings).length > 0) {
    for (const [name, content] of Object.entries(siblings)) {
      writeFileSync(join(projectDir, name), content, 'utf8')
    }
    writeFileSync(join(projectDir, 'app.mir'), mirror, 'utf8')
    await spawnAsync(
      'npx',
      ['tsx', join(REPO_ROOT, 'compiler/build-cli.ts'), projectDir, '--out', join(outDir, 'render.html'), '--quiet'],
      { cwd: REPO_ROOT }
    )
  } else {
    const file = join(projectDir, 'app.mir')
    writeFileSync(file, mirror, 'utf8')
    await spawnAsync(
      'npx',
      ['tsx', join(REPO_ROOT, 'compiler/build-cli.ts'), file, '--out', join(outDir, 'render.html'), '--quiet'],
      { cwd: REPO_ROOT }
    )
  }
}

function spawnAsync(
  cmd: string,
  args: string[],
  opts: { cwd?: string } = {}
): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const proc = spawn(cmd, args, { cwd: opts.cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let stderr = ''
    proc.stderr.on('data', c => (stderr += c.toString()))
    proc.on('error', err => rejectP(err))
    proc.on('close', code => {
      if (code === 0) resolveP()
      else rejectP(new Error(`${cmd} exited ${code}: ${stderr.slice(0, 200)}`))
    })
  })
}

// ============================================================================
// Reporting
// ============================================================================

function renderReport(records: FixtureRunRecord[], meta: { startedAt: string; finishedAt: string }): string {
  const total = records.length
  const success = records.filter(r => r.status === 'success').length
  const warning = records.filter(r => r.status === 'warning').length
  const error = records.filter(r => r.status === 'error' || r.status === 'crashed').length
  const sumMs = records.reduce((a, r) => a + r.totalMs, 0)

  const lines: string[] = [
    `# Generation-Pipeline Eval`,
    ``,
    `Started: ${meta.startedAt}`,
    `Finished: ${meta.finishedAt}`,
    `Duration: ${(sumMs / 1000).toFixed(0)}s total wall-clock`,
    `Bridge calls: ${bridgeCallCount} (${(bridgeTotalMs / 1000).toFixed(0)}s in claude)`,
    ``,
    `## Summary`,
    ``,
    `| status   | count |`,
    `| -------- | -----:|`,
    `| success  | ${success} |`,
    `| warning  | ${warning} |`,
    `| error    | ${error} |`,
    `| **total**| **${total}** |`,
    ``,
    `## Fixtures`,
    ``,
    `| Fixture | Status | Retries | HTML (B) | Mirror (B) | HTML (s) | Translate (s) | Total (s) | Validation |`,
    `| ------- | ------ | ------:| -------:| ---------:| -------:| ------------:| --------:| ---------- |`,
  ]
  for (const r of records) {
    const valSummary =
      r.validationErrorCount === 0
        ? '—'
        : r.validationErrors
            .slice(0, 2)
            .map(e => `${e.code ?? '?'}@${e.line ?? '?'}:${e.column ?? '?'}`)
            .join(', ') + (r.validationErrorCount > 2 ? ` +${r.validationErrorCount - 2}` : '')
    lines.push(
      `| ${r.fixtureId} | ${r.status} | ${r.retries} | ${r.htmlBytes} | ${r.mirrorBytes} | ${(r.htmlMs / 1000).toFixed(1)} | ${(r.translateMs / 1000).toFixed(1)} | ${(r.totalMs / 1000).toFixed(1)} | ${valSummary} |`
    )
  }

  lines.push('', `## Per-fixture detail`, '')
  for (const r of records) {
    lines.push(`### ${r.fixtureId} — ${r.fixtureLabel}`, '')
    lines.push(`- status: **${r.status}**`)
    lines.push(`- retries: ${r.retries}`)
    lines.push(`- timings: html ${(r.htmlMs / 1000).toFixed(1)}s · translate ${(r.translateMs / 1000).toFixed(1)}s (${r.translateAttempts} attempts) · total ${(r.totalMs / 1000).toFixed(1)}s`)
    if (r.htmlBytes) lines.push(`- HTML: ${r.htmlBytes} bytes → \`${r.fixtureId}/run-${r.run}/html.html\``)
    if (r.mirrorBytes) lines.push(`- Mirror: ${r.mirrorBytes} bytes → \`${r.fixtureId}/run-${r.run}/mirror.mir\``)
    if (r.rendered) lines.push(`- rendered: \`${r.fixtureId}/run-${r.run}/render.html\``)
    else if (r.renderError) lines.push(`- render error: ${r.renderError}`)
    if (r.errorMessage) lines.push(`- error: ${r.errorMessage}`)
    if (r.validationErrors.length > 0) {
      lines.push(`- validation errors:`)
      for (const e of r.validationErrors) {
        lines.push(`  - ${e.severity ?? '?'} ${e.code ?? '?'} ${e.line ?? '?'}:${e.column ?? '?'} — ${e.message}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

// ============================================================================
// CLI
// ============================================================================

interface CliOpts {
  filter: string | null
  runs: number
  out: string
  render: boolean
  timeoutSec: number
  maxRetries: number
  resume: string | null
  help: boolean
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = {
    filter: null,
    runs: 1,
    out: '',
    render: true,
    timeoutSec: 240,
    maxRetries: 2,
    resume: null,
    help: false,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '-h':
      case '--help':
        opts.help = true
        break
      case '--filter':
        opts.filter = argv[++i]
        break
      case '--runs':
        opts.runs = parseInt(argv[++i], 10)
        break
      case '--out':
        opts.out = argv[++i]
        break
      case '--no-render':
        opts.render = false
        break
      case '--timeout':
        opts.timeoutSec = parseInt(argv[++i], 10)
        break
      case '--max-retries':
        opts.maxRetries = parseInt(argv[++i], 10)
        break
      case '--resume':
        opts.resume = argv[++i]
        break
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`)
    }
  }
  return opts
}

function printHelp(): void {
  console.log(`
eval-generation-pipeline — real-LLM eval of the HTML-first generation pipeline

Usage:
  npx tsx scripts/eval-generation-pipeline.ts [options]

Options:
  --filter <regex>      run only fixtures whose id matches (default: all)
  --runs <n>            runs per fixture for variance (default: 1)
  --out <dir>           output dir (default: eval-results/generation-pipeline/<ts>)
  --no-render           skip the mirror-build render step
  --timeout <s>         per-fixture timeout in seconds (default: 240)
  --max-retries <n>     translator retries on validator-fail (default: 2)
  --resume <dir>        resume an interrupted run
  -h, --help            show this help

Smoke (one fixture, no render):
  npx tsx scripts/eval-generation-pipeline.ts --filter '^p1' --no-render

Variance (3 runs of token-resolution):
  npx tsx scripts/eval-generation-pipeline.ts --filter p4 --runs 3

Full suite (6 fixtures × 1 run, ~5 min):
  npx tsx scripts/eval-generation-pipeline.ts
`)
}

async function main(): Promise<void> {
  let cli: CliOpts
  try {
    cli = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error((e as Error).message)
    printHelp()
    process.exit(2)
  }
  if (cli.help) {
    printHelp()
    process.exit(0)
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const outRoot = cli.out
    ? resolve(cli.out)
    : resolve(REPO_ROOT, 'eval-results', 'generation-pipeline', ts)
  mkdirSync(outRoot, { recursive: true })

  const filterRe = cli.filter ? new RegExp(cli.filter) : null
  const fixtures = filterRe ? FIXTURES.filter(f => filterRe.test(f.id)) : FIXTURES
  if (fixtures.length === 0) {
    console.error(`no fixtures match --filter ${cli.filter}`)
    process.exit(2)
  }

  console.log(`▶ pipeline eval: ${fixtures.length} fixtures × ${cli.runs} runs = ${fixtures.length * cli.runs} runs`)
  console.log(`▶ output: ${outRoot}`)
  console.log(`▶ claude: ${CLAUDE_BIN}`)

  // Resume support
  const resultsJson = join(outRoot, 'results.json')
  const records: FixtureRunRecord[] = []
  if (cli.resume) {
    const resumePath = join(resolve(cli.resume), 'results.json')
    if (existsSync(resumePath)) {
      const prior = JSON.parse(readFileSync(resumePath, 'utf8')) as { records: FixtureRunRecord[] }
      records.push(...prior.records)
      console.log(`▶ resuming with ${records.length} prior records`)
    }
  }

  const pipeline = await pipelineModulePromise
  const startedAt = new Date().toISOString()

  const opts: RunOpts = {
    outRoot,
    render: cli.render,
    timeoutMs: cli.timeoutSec * 1000,
    maxRetries: cli.maxRetries,
  }

  for (const fixture of fixtures) {
    for (let run = 1; run <= cli.runs; run++) {
      const already = records.find(
        r => r.fixtureId === fixture.id && r.run === run && (r.status === 'success' || r.status === 'warning')
      )
      if (already) {
        console.log(`  ⏭  ${fixture.id} run ${run} (already ${already.status})`)
        continue
      }
      console.log(`  ▶  ${fixture.id} run ${run} ...`)
      const rec = await runFixture(fixture, run, opts, pipeline)
      const tag =
        rec.status === 'success' ? '✓' : rec.status === 'warning' ? '⚠' : '✗'
      console.log(
        `  ${tag} ${fixture.id} run ${run} [${rec.status}] retries=${rec.retries} ${(rec.totalMs / 1000).toFixed(0)}s` +
          (rec.errorMessage ? ` — ${rec.errorMessage.slice(0, 80)}` : '')
      )
      records.push(rec)
      // Persist after every run.
      writeFileSync(resultsJson, JSON.stringify({ records }, null, 2), 'utf8')
    }
  }

  const finishedAt = new Date().toISOString()
  const report = renderReport(records, { startedAt, finishedAt })
  writeFileSync(join(outRoot, 'report.md'), report, 'utf8')
  console.log(`\n✓ Report: ${join(outRoot, 'report.md')}`)
  const ok = records.every(r => r.status === 'success' || r.status === 'warning')
  process.exit(ok ? 0 : 1)
}

const isCliEntry = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCliEntry) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
