#!/usr/bin/env tsx
/**
 * Re-classify existing eval results from disk.
 *
 *   npx tsx scripts/eval-reclassify.ts <results-dir>
 *
 * Earlier versions of `eval-llm-pipeline.ts` flipped a cell to
 * verify-fail whenever the (redundant) verify subprocess crashed,
 * even if the agent's own verify run had already produced a
 * verify-report.md saying ✅ PASS. That bug is fixed in
 * eval-llm-pipeline.ts; this script repairs prior runs in-place
 * by re-reading verify-report.md per cell and trusting it over
 * the recorded exit-code-derived status.
 *
 * Idempotent: re-running on already-correct data is a no-op.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { parseVerifyReport, type CellResult } from './eval-llm-pipeline'

interface ResultsFile {
  results: CellResult[]
}

function main(): void {
  const resultsDir = process.argv[2]
  if (!resultsDir) {
    console.error('usage: tsx scripts/eval-reclassify.ts <results-dir>')
    process.exit(2)
  }
  const resultsPath = join(resolve(resultsDir), 'results.json')
  if (!existsSync(resultsPath)) {
    console.error(`not found: ${resultsPath}`)
    process.exit(1)
  }
  const data = JSON.parse(readFileSync(resultsPath, 'utf8')) as ResultsFile

  let changed = 0
  for (const r of data.results) {
    if (r.status !== 'verify-fail') continue
    const reportPath = join(r.bundlePath, 'verify-report.md')
    if (!existsSync(reportPath)) continue
    const parsed = parseVerifyReport(readFileSync(reportPath, 'utf8'))
    if (!parsed.passed) continue
    // Report says PASS but we recorded fail. Re-classify.
    console.log(
      `  ✓ ${r.cellId}: verify-fail → success ` +
        `(report scores: ${Object.entries(parsed.scores)
          .map(([k, v]) => `${k}=${v.toFixed(1)}%`)
          .join(', ')})`
    )
    r.status = 'success'
    r.viewportScores = parsed.scores
    delete r.error
    changed++
  }

  if (changed === 0) {
    console.log('no changes needed')
    return
  }
  writeFileSync(resultsPath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`✓ re-classified ${changed} cells in ${resultsPath}`)
}

main()
