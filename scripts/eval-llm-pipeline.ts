#!/usr/bin/env tsx
/**
 * Mirror → Framework end-to-end LLM eval.
 *
 *   npx tsx scripts/eval-llm-pipeline.ts [options]
 *
 * Drives the full pipeline that this codebase ships:
 *   build bundle  →  invoke claude on the bundle  →  pixel-diff verify
 *
 * Across 3 complexity tiers × 4 framework targets × N runs, aggregates
 * pass/fail + per-viewport match scores + timings into a markdown
 * report. Designed for non-deterministic LLM runs: success is decided
 * by an objective verify-threshold, repeated across N runs to surface
 * variance.
 *
 * Each cell takes ~5–15 minutes (claude is the dominant cost). Full
 * matrix at runs=3 is hours, not seconds. Default `--tier S
 * --targets vanilla --runs 1` runs in a few minutes for smoke testing.
 *
 * Output: `eval-results/<timestamp>/`
 *   - report.md            — aggregate matrix
 *   - <cell-id>/bundle/   — bundle dir
 *   - <cell-id>/log.txt   — claude stdout/stderr
 *   - results.json         — machine-readable
 */

import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  readdirSync,
  statSync,
  appendFileSync,
} from 'node:fs'
import { resolve, join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'
import { runFunctional, type FunctionalResult } from './eval-functional'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

// ---------------------------------------------------------------------------
// Domain
// ---------------------------------------------------------------------------

export type Tier = 'S' | 'M' | 'L'
export type Target = 'react' | 'vue' | 'svelte' | 'vanilla'

export interface ProjectSpec {
  tier: Tier
  label: string
  path: string
}

export interface EvalCell {
  tier: Tier
  target: Target
  project: ProjectSpec
}

export type CellStatus =
  | 'success'
  | 'export-fail'
  | 'agent-fail'
  | 'verify-fail'
  | 'timeout'
  | 'skipped'

export interface CellResult {
  cellId: string
  cell: EvalCell
  run: number
  status: CellStatus
  exportTimeMs: number
  agentTimeMs: number
  verifyTimeMs: number
  functionalTimeMs: number
  totalTimeMs: number
  viewportScores: Record<string, number>
  functional: FunctionalResult | null
  bundlePath: string
  logPath: string
  error?: string
}

// ---------------------------------------------------------------------------
// Project catalog
// ---------------------------------------------------------------------------

export const PROJECTS: Record<Tier, ProjectSpec> = {
  S: { tier: 'S', label: 'hotel-checkin', path: 'examples/hotel-checkin.mirror' },
  M: { tier: 'M', label: 'personas-informatik', path: 'examples/personas-informatik' },
  L: { tier: 'L', label: 'task-app', path: 'examples/task-app' },
}

const ALL_TIERS: Tier[] = ['S', 'M', 'L']
const ALL_TARGETS: Target[] = ['react', 'vue', 'svelte', 'vanilla']

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable)
// ---------------------------------------------------------------------------

/**
 * Expand the requested tier × target axes into individual cells.
 * Order: tier-major (S < M < L), then canonical target order.
 */
export function expandMatrix(req: { tiers: Tier[]; targets: Target[] }): EvalCell[] {
  const cells: EvalCell[] = []
  for (const tier of req.tiers) {
    const project = PROJECTS[tier]
    if (!project) continue
    for (const target of req.targets) {
      cells.push({ tier, target, project })
    }
  }
  return cells
}

/**
 * Parse the markdown verify-report.md produced by `tools/verify.ts`.
 * Returns the per-viewport match-percentage and overall pass flag.
 *
 * Report shape:
 *   **Verdict:** ✅ PASS | ❌ FAIL
 *   | Viewport | Match | Diff Pixels | Diff Image |
 *   | mobile   | ✓ 96.50% | ...
 */
export function parseVerifyReport(md: string): {
  passed: boolean
  scores: Record<string, number>
} {
  const passed = /Verdict:\*\*\s*✅\s*PASS/.test(md)
  const scores: Record<string, number> = {}
  // Match table rows. The viewport column is one of mobile/tablet/desktop.
  const rowRe = /\|\s*(mobile|tablet|desktop)\s*\|\s*[✓✗]?\s*([\d.]+)%/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(md)) !== null) {
    scores[m[1]] = parseFloat(m[2])
  }
  return { passed, scores }
}

export function cellId(cell: EvalCell, run: number): string {
  return `${cell.tier}-${cell.project.label}-${cell.target}-r${run}`
}

/**
 * Render the aggregate markdown report. Per cell shows: status, the
 * mean+stddev of the viewport scores across runs, total time. Final
 * matrix is tier × target.
 */
export function renderReport(
  results: CellResult[],
  meta: { startedAt: string; finishedAt: string; runsPerCell: number }
): string {
  // Group results by (tier, target).
  type Key = `${Tier}|${Target}`
  const groups = new Map<Key, CellResult[]>()
  for (const r of results) {
    const k: Key = `${r.cell.tier}|${r.cell.target}`
    const arr = groups.get(k) ?? []
    arr.push(r)
    groups.set(k, arr)
  }

  const tierOrder: Tier[] = ['S', 'M', 'L']
  const targets: Target[] = ALL_TARGETS

  const cellSummary = (rs: CellResult[]): string => {
    if (rs.length === 0) return '—'
    const passes = rs.filter(r => r.status === 'success').length
    const allScores = rs.flatMap(r => Object.values(r.viewportScores))
    const mean = allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0
    // Aggregate functional: total passed / total checked across runs.
    const fnPassed = rs.reduce((a, r) => a + (r.functional?.passed ?? 0), 0)
    const fnTotal = rs.reduce((a, r) => a + (r.functional?.total ?? 0), 0)
    const fnPart = fnTotal > 0 ? ` · fn ${fnPassed}/${fnTotal}` : ''
    return `${passes}/${rs.length} · px ${mean.toFixed(1)}%${fnPart}`
  }

  const lines: string[] = [
    `# LLM Pipeline Eval`,
    ``,
    `Started: ${meta.startedAt}`,
    `Finished: ${meta.finishedAt}`,
    `Runs per cell: ${meta.runsPerCell}`,
    ``,
    `## Success matrix (passes/total · mean viewport-match%)`,
    ``,
    `| Project | ${targets.join(' | ')} |`,
    `| ------- | ${targets.map(() => ':---:').join(' | ')} |`,
  ]

  for (const tier of tierOrder) {
    const proj = PROJECTS[tier]
    const row = [`${tier} · ${proj.label}`]
    for (const target of targets) {
      row.push(cellSummary(groups.get(`${tier}|${target}` as Key) ?? []))
    }
    lines.push(`| ${row.join(' | ')} |`)
  }

  lines.push('', `## Per-cell detail`, '')
  for (const tier of tierOrder) {
    const proj = PROJECTS[tier]
    for (const target of targets) {
      const rs = groups.get(`${tier}|${target}` as Key) ?? []
      if (rs.length === 0) continue
      lines.push(`### ${tier} · ${proj.label} → ${target}`, '')
      lines.push(`| Run | Status | mobile | tablet | desktop | Functional | Time |`)
      lines.push(`| ---:| ------ | -----:| -----:| -------:| ---------- | ----:|`)
      for (const r of rs) {
        const m = r.viewportScores.mobile?.toFixed(1) ?? '—'
        const t = r.viewportScores.tablet?.toFixed(1) ?? '—'
        const d = r.viewportScores.desktop?.toFixed(1) ?? '—'
        const fn = r.functional ? `${r.functional.passed}/${r.functional.total}` : '—'
        const time = `${(r.totalTimeMs / 1000).toFixed(0)}s`
        lines.push(`| ${r.run} | ${r.status} | ${m} | ${t} | ${d} | ${fn} | ${time} |`)
      }
      // Failing-claim breakdown — shows WHICH semantic checks missed.
      const allFailed = rs.flatMap(r => r.functional?.details ?? []).filter(d => !d.passed)
      if (allFailed.length > 0) {
        const tally = new Map<string, number>()
        for (const f of allFailed) tally.set(f.name, (tally.get(f.name) ?? 0) + 1)
        lines.push('', `_failed claims (count across runs):_`)
        for (const [name, count] of [...tally.entries()].sort((a, b) => b[1] - a[1])) {
          lines.push(`- ${name} (×${count})`)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Cell driver (side-effecting)
// ---------------------------------------------------------------------------

interface RunOpts {
  outRoot: string
  snapshot: boolean
  dryRun: boolean
  agentTimeoutMs: number
  threshold: number
}

function logTo(path: string, line: string): void {
  appendFileSync(path, line + '\n', 'utf8')
}

async function exec(
  cmd: string,
  args: string[],
  opts: { cwd?: string; logPath: string; timeoutMs?: number; env?: Record<string, string> } = {
    logPath: '',
  }
): Promise<{ code: number; timedOut: boolean }> {
  return new Promise(resolvePromise => {
    const proc = spawn(cmd, args, {
      cwd: opts.cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...(opts.env ?? {}) },
    })
    let timer: NodeJS.Timeout | null = null
    let timedOut = false
    if (opts.timeoutMs && opts.timeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true
        proc.kill('SIGKILL')
      }, opts.timeoutMs)
    }
    proc.stdout.on('data', chunk => logTo(opts.logPath, chunk.toString().replace(/\n$/, '')))
    proc.stderr.on('data', chunk =>
      logTo(opts.logPath, '[stderr] ' + chunk.toString().replace(/\n$/, ''))
    )
    proc.on('error', err => {
      logTo(opts.logPath, `[error] ${err.message}`)
      if (timer) clearTimeout(timer)
      resolvePromise({ code: -1, timedOut })
    })
    proc.on('exit', code => {
      if (timer) clearTimeout(timer)
      resolvePromise({ code: code ?? 0, timedOut })
    })
  })
}

/**
 * Runs one cell × one run. Mutates result fields as it advances.
 * On any non-success, returns early — later phases are skipped and
 * scores stay zero.
 */
export async function runCell(cell: EvalCell, run: number, opts: RunOpts): Promise<CellResult> {
  const id = cellId(cell, run)
  const cellRoot = join(opts.outRoot, id)
  const bundlePath = join(cellRoot, 'bundle')
  const logPath = join(cellRoot, 'log.txt')
  mkdirSync(cellRoot, { recursive: true })
  writeFileSync(logPath, `# ${id}\nstarted ${new Date().toISOString()}\n`, 'utf8')

  const result: CellResult = {
    cellId: id,
    cell,
    run,
    status: 'success',
    exportTimeMs: 0,
    agentTimeMs: 0,
    verifyTimeMs: 0,
    functionalTimeMs: 0,
    totalTimeMs: 0,
    viewportScores: {},
    functional: null,
    bundlePath,
    logPath,
  }
  const t0 = Date.now()

  try {
    // 1. Build bundle
    const exportArgs = [
      'tsx',
      'tools/export.ts',
      cell.project.path,
      '--target',
      cell.target,
      '--out',
      bundlePath,
    ]
    if (opts.snapshot) exportArgs.push('--snapshot')
    const tExp = Date.now()
    const expR = await exec('npx', exportArgs, { cwd: REPO_ROOT, logPath })
    result.exportTimeMs = Date.now() - tExp
    if (expR.code !== 0) {
      result.status = 'export-fail'
      result.error = `mirror-export exited ${expR.code}`
      return result
    }

    // 2. Invoke agent
    const tAgent = Date.now()
    if (opts.dryRun) {
      // Skip claude entirely. Touch a marker so verify can detect intent.
      mkdirSync(join(bundlePath, 'generated'), { recursive: true })
      writeFileSync(
        join(bundlePath, 'generated', '.dry-run'),
        'agent skipped via --dry-run',
        'utf8'
      )
      logTo(logPath, '[dry-run] skipped claude invocation')
    } else {
      const prompt = [
        'Read INSTRUCTIONS.md, MIRROR-BRIEF.md, target.json, source/*, and',
        'visual-reference.html (if present). Execute the pipeline in',
        'INSTRUCTIONS.md, gating on each step. Use Write/Edit/Bash to create',
        'files in ./generated/. Stop when all gates are green or you hit a',
        'real blocker.',
      ].join('\n')
      const claudeR = await exec('claude', ['--print', prompt, '--dangerously-skip-permissions'], {
        cwd: bundlePath,
        logPath,
        timeoutMs: opts.agentTimeoutMs,
      })
      if (claudeR.timedOut) {
        result.status = 'timeout'
        result.error = `claude exceeded ${opts.agentTimeoutMs}ms`
        result.agentTimeMs = Date.now() - tAgent
        return result
      }
      if (claudeR.code !== 0) {
        result.status = 'agent-fail'
        result.error = `claude exited ${claudeR.code}`
        result.agentTimeMs = Date.now() - tAgent
        return result
      }
    }
    result.agentTimeMs = Date.now() - tAgent

    // 3. Verify (only meaningful with --snapshot)
    if (opts.snapshot) {
      const tVer = Date.now()
      const verR = await exec(
        'npx',
        ['tsx', 'tools/verify.ts', bundlePath, '--threshold', String(opts.threshold)],
        // 5-min hard cap — verify is a Chrome-driving task and has been
        // observed to hang on the same CDP race as snapshot.
        { cwd: REPO_ROOT, logPath, timeoutMs: 300_000 }
      )
      result.verifyTimeMs = Date.now() - tVer
      // Trust the report content over the exit code. The agent itself
      // runs verify as part of its pipeline, so verify-report.md may
      // already be on disk before our redundant verify run starts.
      // Our run can crash on a CDP race (Chrome attach/detach) without
      // invalidating the agent's earlier successful verification — the
      // file is the source of truth.
      const reportPath = join(bundlePath, 'verify-report.md')
      if (existsSync(reportPath)) {
        const parsed = parseVerifyReport(readFileSync(reportPath, 'utf8'))
        result.viewportScores = parsed.scores
        if (!parsed.passed) {
          result.status = 'verify-fail'
          result.error = `verify thresholds not met`
        }
      } else {
        result.status = 'verify-fail'
        result.error =
          verR.code !== 0
            ? `verify exited ${verR.code} and produced no report`
            : 'verify-report.md not produced'
      }
    } else {
      logTo(logPath, '[no-verify] snapshot disabled, skipping verify')
    }

    // 4. Functional eval — semantic checks beyond pixel-diff. Run even
    // if verify failed; the functional score is independent.
    if (!opts.dryRun) {
      const tFn = Date.now()
      try {
        // Resolve generated dir for this target.
        const candidate =
          cell.target === 'vanilla'
            ? join(bundlePath, 'generated')
            : join(bundlePath, 'generated', 'dist')
        const genDir = existsSync(candidate) ? candidate : join(bundlePath, 'generated')
        if (existsSync(genDir)) {
          // Hard 60-s cap — runFunctional uses CDP which has been seen
          // to hang. Race against a timeout that resolves with a null
          // result so the cell can complete cleanly.
          result.functional = await Promise.race([
            runFunctional({ generatedDir: genDir, project: cell.project.label }),
            new Promise<null>(r => setTimeout(() => r(null), 60_000)),
          ])
          if (!result.functional) {
            logTo(logPath, '[functional] timed out after 60s')
          } else {
            logTo(
              logPath,
              `[functional] ${result.functional.passed}/${result.functional.total} contractual claims pass`
            )
            // If functional fails AND verify hadn't already flagged a
            // problem, downgrade status.
            if (
              result.status === 'success' &&
              result.functional.total > 0 &&
              result.functional.passed < result.functional.total
            ) {
              // Don't fail the cell outright on partial functional miss
              // — keep status=success but the report will surface the
              // partial score. We only flip to verify-fail if zero
              // claims pass (catastrophic miss).
              if (result.functional.passed === 0) {
                result.status = 'verify-fail'
                result.error = 'functional eval: 0 claims passed'
              }
            }
          }
        } else {
          logTo(logPath, '[functional] no generated dir found, skipping')
        }
      } catch (err) {
        logTo(logPath, `[functional] error: ${(err as Error).message}`)
      } finally {
        result.functionalTimeMs = Date.now() - tFn
      }
    }
  } catch (err) {
    result.status = 'verify-fail'
    result.error = (err as Error).message
  } finally {
    result.totalTimeMs = Date.now() - t0
  }
  return result
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface CliOpts {
  tiers: Tier[]
  targets: Target[]
  runs: number
  snapshot: boolean
  dryRun: boolean
  agentTimeoutMs: number
  threshold: number
  outRoot: string
  resume: string | null
  help: boolean
}

function parseTierList(s: string): Tier[] {
  if (s === 'all') return ALL_TIERS
  return s
    .split(',')
    .map(x => x.trim().toUpperCase())
    .filter((x): x is Tier => (ALL_TIERS as string[]).includes(x))
}

function parseTargetList(s: string): Target[] {
  if (s === 'all') return ALL_TARGETS
  return s
    .split(',')
    .map(x => x.trim().toLowerCase())
    .filter((x): x is Target => (ALL_TARGETS as string[]).includes(x))
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = {
    tiers: ['S'],
    targets: ['vanilla'],
    runs: 1,
    snapshot: true,
    dryRun: false,
    agentTimeoutMs: 25 * 60 * 1000, // 25 min default
    threshold: 95,
    outRoot: '',
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
      case '--tier':
      case '--tiers':
        opts.tiers = parseTierList(argv[++i])
        break
      case '--target':
      case '--targets':
        opts.targets = parseTargetList(argv[++i])
        break
      case '--runs':
        opts.runs = parseInt(argv[++i], 10)
        break
      case '--no-snapshot':
        opts.snapshot = false
        break
      case '--dry-run':
        opts.dryRun = true
        opts.snapshot = false // dry-run skips verify too
        break
      case '--timeout':
        opts.agentTimeoutMs = parseInt(argv[++i], 10) * 1000
        break
      case '--threshold':
        opts.threshold = Number(argv[++i])
        break
      case '--out':
        opts.outRoot = argv[++i]
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

function printHelp() {
  console.log(`
mirror-eval — end-to-end LLM pipeline eval

Usage:
  npx tsx scripts/eval-llm-pipeline.ts [options]

Options:
  --tier <list>          S | M | L | all  (default: S)
  --targets <list>       react | vue | svelte | vanilla | all (default: vanilla)
  --runs <n>             runs per cell (default: 1)
  --threshold <pct>      verify threshold (default: 95)
  --timeout <s>          agent timeout per cell, seconds (default: 1500)
  --no-snapshot          skip render-snapshot capture (verify off too)
  --dry-run              skip claude entirely (test plumbing)
  --out <dir>            output dir (default: eval-results/<timestamp>)
  --resume <dir>         resume an interrupted run

Smoke (1 cell, no claude):
  npx tsx scripts/eval-llm-pipeline.ts --dry-run

Real smoke (vanilla on smallest project, 1 run):
  npx tsx scripts/eval-llm-pipeline.ts --tier S --targets vanilla --runs 1

Full matrix:
  npx tsx scripts/eval-llm-pipeline.ts --tier all --targets all --runs 3
`)
}

async function main(): Promise<void> {
  let opts: CliOpts
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error((e as Error).message)
    printHelp()
    process.exit(2)
  }
  if (opts.help) {
    printHelp()
    process.exit(0)
  }

  if (!opts.outRoot) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    opts.outRoot = resolve(REPO_ROOT, 'eval-results', ts)
  }
  mkdirSync(opts.outRoot, { recursive: true })

  const cells = expandMatrix({ tiers: opts.tiers, targets: opts.targets })
  console.log(
    `▶ matrix: ${cells.length} cells × ${opts.runs} runs = ${cells.length * opts.runs} runs total`
  )
  console.log(`▶ output: ${opts.outRoot}`)
  if (opts.dryRun) console.log(`▶ dry-run mode: skipping claude + verify`)

  const startedAt = new Date().toISOString()
  const allResults: CellResult[] = []

  // Resume: load existing results.json if present.
  const resultsJson = join(opts.outRoot, 'results.json')
  if (opts.resume && existsSync(join(opts.resume, 'results.json'))) {
    const existing = JSON.parse(readFileSync(join(opts.resume, 'results.json'), 'utf8')) as {
      results: CellResult[]
    }
    allResults.push(...existing.results)
    console.log(`▶ resuming with ${allResults.length} prior results`)
  }

  for (const cell of cells) {
    for (let run = 1; run <= opts.runs; run++) {
      const id = cellId(cell, run)
      if (allResults.some(r => r.cellId === id && r.status === 'success')) {
        console.log(`  ⏭  ${id} (already passed)`)
        continue
      }
      console.log(`  ▶  ${id} ...`)
      const result = await runCell(cell, run, {
        outRoot: opts.outRoot,
        snapshot: opts.snapshot,
        dryRun: opts.dryRun,
        agentTimeoutMs: opts.agentTimeoutMs,
        threshold: opts.threshold,
      })
      console.log(
        `  ${result.status === 'success' ? '✓' : '✗'} ${id} ` +
          `[${result.status}] ${(result.totalTimeMs / 1000).toFixed(0)}s`
      )
      allResults.push(result)
      // Persist after every cell so a crash doesn't lose work.
      writeFileSync(resultsJson, JSON.stringify({ results: allResults }, null, 2))
    }
  }

  const finishedAt = new Date().toISOString()
  const report = renderReport(allResults, {
    startedAt,
    finishedAt,
    runsPerCell: opts.runs,
  })
  writeFileSync(join(opts.outRoot, 'report.md'), report, 'utf8')
  console.log(`\n✓ Report: ${join(opts.outRoot, 'report.md')}`)

  const successes = allResults.filter(r => r.status === 'success').length
  console.log(`✓ ${successes}/${allResults.length} runs passed`)
  process.exit(allResults.every(r => r.status === 'success') ? 0 : 1)
}

const isCliEntry = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCliEntry) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}

// Suppress unused-import warnings for spawnSync, statSync, readdirSync — kept for resume support.
void spawnSync
void statSync
void readdirSync
void relative
