#!/usr/bin/env npx tsx
/**
 * Parallel Browser Test Runner
 *
 * Spawns N Chrome instances inside one Node process and distributes
 * categories across them via a work-stealing pool. Each worker keeps its
 * Chrome and CDP connection alive across categories — Chrome cold-start
 * is paid once per worker, not once per category.
 *
 * Usage:
 *   npx tsx tools/test-parallel.ts                  # default 4 workers
 *   npx tsx tools/test-parallel.ts --workers=8
 *   npx tsx tools/test-parallel.ts --categories=core,layout,editor
 */

import { TestRunner } from './test-runner/runner'

interface CategoryResult {
  name: string
  passed: number
  failed: number
  durationMs: number
  failures: string[]
}

const ALL_CATEGORIES = [
  'core',
  'layout',
  'styling',
  'visuals',
  'states',
  'components',
  'drag',
  'handles',
  'selection',
  'propertyPanel',
  'editor',
  'data',
  'project',
  'compiler',
  'ai',
  // 'tutorial' migrated to Vitest+jsdom — run via `npx vitest run tests/tutorial/`.
  // Re-add here only if you want to exercise the browser path explicitly.
  'stepRunner',
]

interface CliArgs {
  workers: number
  categories: string[]
  headed: boolean
  bail: boolean
  url: string
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = {
    workers: 4,
    categories: ALL_CATEGORIES,
    headed: false,
    bail: false,
    url: 'http://localhost:5173/studio/',
  }
  for (const arg of argv) {
    if (arg.startsWith('--workers=')) out.workers = parseInt(arg.split('=')[1], 10)
    else if (arg.startsWith('--categories=')) out.categories = arg.split('=')[1].split(',')
    else if (arg.startsWith('--url=')) out.url = arg.split('=')[1]
    else if (arg === '--headed') out.headed = true
    else if (arg === '--bail') out.bail = true
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: test-parallel [options]

Options:
  --workers=N            Parallel worker count (default: 4)
  --categories=a,b,c     Comma-separated category list (default: all)
  --url=URL              Studio URL (default: http://localhost:5173/studio/)
  --headed               Run with visible browsers
  --bail                 Stop scheduling after first failure
  -h, --help             Show this help`)
      process.exit(0)
    }
  }
  return out
}

interface Worker {
  id: number
  runner: TestRunner
}

async function startWorker(id: number, url: string, headed: boolean): Promise<Worker> {
  const runner = new TestRunner({ headless: !headed, silent: true, screenshotOnFailure: false })
  await runner.start()
  await runner.navigate(url)
  // Generous timeouts — when N workers race to load the same studio URL the
  // dev server can take much longer than usual to respond and the test API
  // bootstrap may slip past the default 30 s.
  const apiReady = await runner.waitForTestAPI(60000)
  if (!apiReady) {
    throw new Error(`Worker ${id}: Test API not available after navigate`)
  }
  const suitesReady = await runner.waitForTestSuites(30000)
  if (!suitesReady) {
    throw new Error(`Worker ${id}: Test suites not registered after API ready`)
  }
  return { id, runner }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function runCategoryOnWorker(worker: Worker, category: string): Promise<CategoryResult> {
  const start = Date.now()
  try {
    const suite = await worker.runner.runMirrorTests(category)
    return {
      name: category,
      passed: suite.passed,
      failed: suite.failed,
      durationMs: Date.now() - start,
      failures: suite.tests.filter(t => !t.passed).map(t => t.name),
    }
  } catch (err) {
    return {
      name: category,
      passed: 0,
      failed: 1,
      durationMs: Date.now() - start,
      failures: [`Worker error: ${(err as Error).message}`],
    }
  }
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

function fmtDuration(ms: number): string {
  const s = ms / 1000
  if (s < 60) return `${s.toFixed(1)}s`
  return `${Math.floor(s / 60)}m ${(s % 60).toFixed(0)}s`
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2))

  const concurrency = Math.min(args.workers, args.categories.length)
  console.log(
    `\n🚀 Parallel test runner — ${concurrency} workers × ${args.categories.length} categories\n`
  )

  // Stagger Chrome launches by ~750 ms each so 4+ workers don't slam the
  // dev server simultaneously. Cold-load contention was the #1 cause of
  // intermittent "Test API not found" failures on parallel runs.
  const startupStart = Date.now()
  const STAGGER_MS = 750
  const workerPromises = Array.from({ length: concurrency }, async (_, i) => {
    await delay(i * STAGGER_MS)
    return startWorker(i, args.url, args.headed)
  })
  const workers = await Promise.all(workerPromises)
  console.log(`  ⏱️  ${concurrency} browsers ready in ${fmtDuration(Date.now() - startupStart)}\n`)

  const queue = [...args.categories]
  const results: CategoryResult[] = []
  let completed = 0
  let bailed = false
  const total = args.categories.length
  const startTime = Date.now()

  async function workerLoop(worker: Worker): Promise<void> {
    while (queue.length > 0 && !bailed) {
      const cat = queue.shift()
      if (!cat) return
      const result = await runCategoryOnWorker(worker, cat)
      results.push(result)
      completed++
      const status = result.failed === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
      const counts = `${result.passed} passed${
        result.failed > 0 ? `, \x1b[31m${result.failed} failed\x1b[0m` : ''
      }`
      console.log(
        `  [${pad(`${completed}/${total}`, 5)}] ${status} ${pad(result.name, 16)} ${pad(
          fmtDuration(result.durationMs),
          10
        )} ${counts}  \x1b[2mw${worker.id}\x1b[0m`
      )
      if (result.failures.length > 0) {
        for (const f of result.failures.slice(0, 3)) console.log(`        \x1b[31m✗\x1b[0m ${f}`)
        if (result.failures.length > 3)
          console.log(`        \x1b[2m... and ${result.failures.length - 3} more\x1b[0m`)
      }
      if (args.bail && result.failed > 0) bailed = true
    }
  }

  await Promise.all(workers.map(workerLoop))

  const totalDuration = Date.now() - startTime
  const totalPassed = results.reduce((sum, r) => sum + r.passed, 0)
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0)
  const sequentialEstimate = results.reduce((sum, r) => sum + r.durationMs, 0)
  const speedup = sequentialEstimate / Math.max(totalDuration, 1)

  console.log('')
  console.log('═'.repeat(60))
  console.log(
    `Total: \x1b[32m${totalPassed} passed\x1b[0m${
      totalFailed > 0 ? `, \x1b[31m${totalFailed} failed\x1b[0m` : ''
    }`
  )
  console.log(
    `Wall time: ${fmtDuration(totalDuration)}  |  Sum of categories: ${fmtDuration(
      sequentialEstimate
    )}  |  Speedup: ${speedup.toFixed(2)}×`
  )
  console.log('═'.repeat(60))

  // Cleanup
  await Promise.all(workers.map(w => w.runner.stop()))

  process.exit(totalFailed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Parallel runner failed:', err)
  process.exit(1)
})
