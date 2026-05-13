/**
 * Compiler Performance Smoke Test
 *
 * Performance was unrepresented in the findings/quality-pass culture
 * before this file. The tooling around test-runner perf is mature
 * (parallel runner, gated icon-wait, test-mode debounce shortcuts) but
 * nothing measured the compiler itself or surfaced a regression in
 * compile time.
 *
 * What we measure:
 *   1. Parse time      (source → AST)
 *   2. IR construction (AST → IR)
 *   3. DOM emit        (IR → DOM JS)
 *
 * Each stage runs against a fixed substantial fixture
 * (examples/hospital-dashboard/dashboard.mirror, ~618 LOC, mixed
 * primitives + components + tokens). We take the median of 5 runs
 * after a warmup, then assert the median is below a generous ceiling
 * — enough headroom that JIT noise + CI variability don't cause
 * false failures, tight enough that an order-of-magnitude regression
 * does fail.
 *
 * Bumping the ceiling? Document why in the commit message and update
 * the constant. The point is intentional regression-acknowledgement,
 * not silent drift. Tightening (because perf improved) is always
 * welcome — same rule, document the new floor.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'
import { generateDOM } from '../../compiler/backends/dom'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '../..')

const FIXTURE_PATH = path.join(repoRoot, 'examples/hospital-dashboard/dashboard.mirror')
const FIXTURE_SOURCE = fs.readFileSync(FIXTURE_PATH, 'utf-8')

/**
 * Generous ceilings, in milliseconds. These are ~5–10× the expected
 * median on a modern laptop in 2026, so noise + CI shouldn't trigger
 * them. An order-of-magnitude regression would.
 *
 * Last calibrated: 2026-05-10.
 */
const CEILINGS = {
  parse: 100, // ms — typical median ~10–30 ms
  ir: 100, // ms — typical median ~20–40 ms
  domEmit: 200, // ms — typical median ~40–80 ms
  fullPipeline: 400, // ms — sum of the three with overhead headroom
} as const

/**
 * Run `fn` `runs` times after a warmup, return the median wall-time.
 * Median (not mean) because GC pauses + JIT compilation make the
 * first few runs much slower than steady-state — we don't want one
 * outlier to skew the result.
 */
function medianTime(fn: () => void, runs = 5, warmup = 2): number {
  for (let i = 0; i < warmup; i++) fn()
  const samples: number[] = []
  for (let i = 0; i < runs; i++) {
    const start = performance.now()
    fn()
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  return samples[Math.floor(samples.length / 2)]
}

describe('compiler performance — hospital-dashboard fixture (~618 LOC)', () => {
  it(`parse() median is below ${CEILINGS.parse} ms`, () => {
    const median = medianTime(() => parse(FIXTURE_SOURCE))
    // Log so a CI run leaves a paper-trail to spot drift before the
    // ceiling is hit — useful for "we got 2× slower this week" trends.
    console.log(`  parse() median: ${median.toFixed(2)} ms`)
    expect(median).toBeLessThan(CEILINGS.parse)
  })

  it(`toIR() median is below ${CEILINGS.ir} ms`, () => {
    const ast = parse(FIXTURE_SOURCE)
    const median = medianTime(() => toIR(ast))
    console.log(`  toIR() median: ${median.toFixed(2)} ms`)
    expect(median).toBeLessThan(CEILINGS.ir)
  })

  it(`generateDOM() median is below ${CEILINGS.domEmit} ms`, () => {
    const ast = parse(FIXTURE_SOURCE)
    const median = medianTime(() => generateDOM(ast))
    console.log(`  generateDOM() median: ${median.toFixed(2)} ms`)
    expect(median).toBeLessThan(CEILINGS.domEmit)
  })

  it(`full pipeline (parse + toIR + generateDOM) median is below ${CEILINGS.fullPipeline} ms`, () => {
    const median = medianTime(() => {
      const ast = parse(FIXTURE_SOURCE)
      toIR(ast)
      generateDOM(ast)
    })
    console.log(`  full pipeline median: ${median.toFixed(2)} ms`)
    expect(median).toBeLessThan(CEILINGS.fullPipeline)
  })
})

describe('compiler performance — small-fixture floor', () => {
  // A trivial fixture should be effectively instant. If this regresses,
  // the parser/IR has gained per-call overhead independent of input
  // size — usually a sign of new global initialisation in the hot path.
  const TRIVIAL = 'Frame bg #fff'

  it('parse() of a 1-line fixture stays under 5 ms', () => {
    const median = medianTime(() => parse(TRIVIAL), 10, 5)
    console.log(`  trivial parse() median: ${median.toFixed(2)} ms`)
    expect(median).toBeLessThan(5)
  })
})
