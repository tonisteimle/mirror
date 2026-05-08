/**
 * Unit tests for the deterministic helpers in `eval-llm-pipeline.ts`.
 *
 * The cell-driver itself spawns `claude` and is non-deterministic, so
 * those parts are exercised by manual smoke runs (see the eval CLI's
 * `--dry-run` mode). This suite locks down the parsing + matrix
 * expansion + report rendering — the parts that have to be correct
 * for the eval results to mean anything.
 */

import { describe, it, expect } from 'vitest'
import {
  expandMatrix,
  parseVerifyReport,
  cellId,
  renderReport,
  type CellResult,
  type EvalCell,
} from '../../scripts/eval-llm-pipeline'

describe('expandMatrix', () => {
  it('produces the cartesian product in tier-major order', () => {
    const cells = expandMatrix({
      tiers: ['S', 'M', 'L'],
      targets: ['react', 'vue', 'svelte', 'vanilla'],
    })
    expect(cells).toHaveLength(12)
    expect(cells[0]).toMatchObject({ tier: 'S', target: 'react' })
    expect(cells[3]).toMatchObject({ tier: 'S', target: 'vanilla' })
    expect(cells[4]).toMatchObject({ tier: 'M', target: 'react' })
    expect(cells[11]).toMatchObject({ tier: 'L', target: 'vanilla' })
  })

  it('empty axes produce empty matrix', () => {
    expect(expandMatrix({ tiers: [], targets: ['react'] })).toHaveLength(0)
    expect(expandMatrix({ tiers: ['S'], targets: [] })).toHaveLength(0)
  })

  it('attaches the project spec to each cell', () => {
    const [cell] = expandMatrix({ tiers: ['S'], targets: ['react'] })
    expect(cell.project.label).toBe('hotel-checkin')
    expect(cell.project.path).toContain('hotel-checkin')
  })
})

describe('parseVerifyReport', () => {
  const passingReport = `# Verify Report

**Bundle:** \`./bundle\`
**Threshold:** 95%
**Verdict:** ✅ PASS

| Viewport | Match | Diff Pixels | Diff Image |
| -------- | -----:| -----------:| ---------- |
| mobile   | ✓ 96.50% | 1,234 / 100,000 | \`verify-diff-mobile.png\` |
| tablet   | ✓ 97.10% | 800 / 100,000 | \`verify-diff-tablet.png\` |
| desktop  | ✓ 98.20% | 500 / 100,000 | \`verify-diff-desktop.png\` |
`

  const failingReport = `**Verdict:** ❌ FAIL

| Viewport | Match |
| mobile   | ✗ 87.30% | 13,000 / 100,000 |
| tablet   | ✓ 96.10% |
| desktop  | ✗ 89.50% |
`

  it('extracts pass verdict and per-viewport scores', () => {
    const r = parseVerifyReport(passingReport)
    expect(r.passed).toBe(true)
    expect(r.scores.mobile).toBeCloseTo(96.5)
    expect(r.scores.tablet).toBeCloseTo(97.1)
    expect(r.scores.desktop).toBeCloseTo(98.2)
  })

  it('extracts fail verdict + per-viewport scores even when below threshold', () => {
    const r = parseVerifyReport(failingReport)
    expect(r.passed).toBe(false)
    expect(r.scores.mobile).toBeCloseTo(87.3)
    expect(r.scores.tablet).toBeCloseTo(96.1)
    expect(r.scores.desktop).toBeCloseTo(89.5)
  })

  it('returns empty scores when the report has no viewport rows', () => {
    const r = parseVerifyReport('**Verdict:** ❌ FAIL\n(no viewports)')
    expect(r.passed).toBe(false)
    expect(r.scores).toEqual({})
  })

  it('does not blow up on a totally empty input', () => {
    const r = parseVerifyReport('')
    expect(r.passed).toBe(false)
    expect(r.scores).toEqual({})
  })
})

describe('cellId', () => {
  it('embeds tier, project label, target, and run number', () => {
    const cell: EvalCell = {
      tier: 'M',
      target: 'svelte',
      project: { tier: 'M', label: 'personas-informatik', path: 'examples/personas-informatik' },
    }
    expect(cellId(cell, 2)).toBe('M-personas-informatik-svelte-r2')
  })
})

describe('renderReport', () => {
  function fakeResult(over: Partial<CellResult>): CellResult {
    return {
      cellId: 'fake',
      cell: {
        tier: 'S',
        target: 'vanilla',
        project: { tier: 'S', label: 'hotel-checkin', path: '...' },
      },
      run: 1,
      status: 'success',
      exportTimeMs: 1000,
      agentTimeMs: 5000,
      verifyTimeMs: 500,
      functionalTimeMs: 200,
      totalTimeMs: 6700,
      viewportScores: { mobile: 96, tablet: 97, desktop: 98 },
      functional: null,
      bundlePath: '/tmp/x',
      logPath: '/tmp/x/log',
      ...over,
    }
  }

  it('renders the success matrix with passes/total · mean%', () => {
    const md = renderReport(
      [
        fakeResult({
          run: 1,
          status: 'success',
          viewportScores: { mobile: 96, tablet: 97, desktop: 98 },
        }),
        fakeResult({
          run: 2,
          status: 'verify-fail',
          viewportScores: { mobile: 80, tablet: 81, desktop: 82 },
        }),
      ],
      { startedAt: '2026-05-08T00:00:00Z', finishedAt: '2026-05-08T00:30:00Z', runsPerCell: 2 }
    )
    expect(md).toContain('# LLM Pipeline Eval')
    expect(md).toContain('## Success matrix')
    // 1 of 2 passed; mean of 6 scores = (96+97+98+80+81+82)/6 = 89.0
    expect(md).toMatch(/1\/2 · px 89\.0%/)
  })

  it('per-cell detail section lists individual runs with their scores', () => {
    const md = renderReport(
      [
        fakeResult({ run: 1, status: 'success', viewportScores: { mobile: 96 } }),
        fakeResult({ run: 2, status: 'agent-fail', viewportScores: {} }),
      ],
      { startedAt: 'x', finishedAt: 'y', runsPerCell: 2 }
    )
    expect(md).toContain('## Per-cell detail')
    expect(md).toMatch(/\| 1 \| success \| 96\.0/)
    expect(md).toMatch(/\| 2 \| agent-fail \| —/)
  })

  it('omits cells with no results from the per-cell detail', () => {
    const md = renderReport([fakeResult({})], {
      startedAt: 'x',
      finishedAt: 'y',
      runsPerCell: 1,
    })
    // Only the S × vanilla section should appear
    expect((md.match(/^### /gm) || []).length).toBe(1)
  })

  it('mean over zero scores is rendered as 0.0%, not NaN', () => {
    const md = renderReport([fakeResult({ status: 'export-fail', viewportScores: {} })], {
      startedAt: 'x',
      finishedAt: 'y',
      runsPerCell: 1,
    })
    expect(md).not.toMatch(/NaN/)
  })
})
