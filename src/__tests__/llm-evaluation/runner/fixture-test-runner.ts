/**
 * Fixture Test Runner
 *
 * Runs evaluation tests using fixtures for deterministic results.
 * Can be used standalone or integrated with Vitest.
 */

import { describe, it, expect, beforeAll } from 'vitest'
import type {
  TestCase,
  TestSuite,
  EvaluationResult,
  SuiteResult,
  ResponseFixture,
} from '../schema'
import { evaluate, evaluateSuite, generateReport } from '../utils/evaluator'
import { loadFixture, fixtureExists, loadAllFixtures } from '../utils/recorder'
import { createMockProvider } from '../utils/mock-provider'

// =============================================================================
// Suite Runner
// =============================================================================

/**
 * Run a complete test suite and return results
 */
export function runSuite(
  suite: TestSuite,
  options: {
    strict?: boolean  // Fail if fixture missing
    verbose?: boolean // Print detailed output
  } = {}
): SuiteResult {
  const startTime = performance.now()
  const results: EvaluationResult[] = []
  const skipped: string[] = []

  const fixtures = loadAllFixtures(suite.pipeline)

  for (const testCase of suite.cases) {
    if (testCase.skip) {
      skipped.push(testCase.id)
      continue
    }

    // Get fixture
    const fixture = fixtures.get(testCase.id)

    if (!fixture) {
      if (options.strict) {
        throw new Error(`Missing fixture for: ${testCase.id}`)
      }

      if (options.verbose) {
        console.log(`[Skip] No fixture: ${testCase.id}`)
      }
      skipped.push(testCase.id)
      continue
    }

    // Evaluate
    const result = evaluate(fixture.response.processed, testCase, {
      includePerformance: true,
    })

    results.push(result)

    if (options.verbose) {
      const status = result.passed ? '✓' : '✗'
      console.log(`${status} ${testCase.id}`)
    }
  }

  const durationMs = performance.now() - startTime

  // Calculate summary
  const passedCases = results.filter(r => r.passed).length
  const failedCases = results.filter(r => !r.passed).length

  // Calculate by severity
  const bySeverity = {
    critical: { passed: 0, failed: 0 },
    important: { passed: 0, failed: 0 },
    normal: { passed: 0, failed: 0 },
    'edge-case': { passed: 0, failed: 0 },
  }

  for (const result of results) {
    const testCase = suite.cases.find(c => c.id === result.caseId)
    if (testCase) {
      const severity = testCase.severity
      if (result.passed) {
        bySeverity[severity].passed++
      } else {
        bySeverity[severity].failed++
      }
    }
  }

  return {
    suiteName: suite.name,
    passed: failedCases === 0,
    results,
    summary: {
      totalCases: suite.cases.length,
      passedCases,
      failedCases,
      skippedCases: skipped.length,
      passRate: results.length > 0 ? passedCases / results.length : 0,
    },
    bySeverity,
    runAt: new Date().toISOString(),
    durationMs,
  }
}

// =============================================================================
// Vitest Integration
// =============================================================================

/**
 * Create Vitest test suite from TestSuite definition
 */
export function createVitestSuite(suite: TestSuite): void {
  describe(suite.name, () => {
    let fixtures: Map<string, ResponseFixture>

    beforeAll(() => {
      fixtures = loadAllFixtures(suite.pipeline)
    })

    // Group tests by severity
    const bySeverity = {
      critical: suite.cases.filter(c => c.severity === 'critical'),
      important: suite.cases.filter(c => c.severity === 'important'),
      normal: suite.cases.filter(c => c.severity === 'normal'),
      'edge-case': suite.cases.filter(c => c.severity === 'edge-case'),
    }

    // Critical tests
    if (bySeverity.critical.length > 0) {
      describe('Critical Cases', () => {
        for (const testCase of bySeverity.critical) {
          createTestCase(testCase, () => fixtures)
        }
      })
    }

    // Important tests
    if (bySeverity.important.length > 0) {
      describe('Important Cases', () => {
        for (const testCase of bySeverity.important) {
          createTestCase(testCase, () => fixtures)
        }
      })
    }

    // Normal tests
    if (bySeverity.normal.length > 0) {
      describe('Standard Cases', () => {
        for (const testCase of bySeverity.normal) {
          createTestCase(testCase, () => fixtures)
        }
      })
    }

    // Edge cases
    if (bySeverity['edge-case'].length > 0) {
      describe('Edge Cases', () => {
        for (const testCase of bySeverity['edge-case']) {
          createTestCase(testCase, () => fixtures)
        }
      })
    }
  })
}

function createTestCase(
  testCase: TestCase,
  getFixtures: () => Map<string, ResponseFixture>
): void {
  const testFn = testCase.skip ? it.skip : it

  testFn(testCase.description, () => {
    const fixtures = getFixtures()
    const fixture = fixtures.get(testCase.id)

    if (!fixture) {
      throw new Error(
        `Missing fixture: ${testCase.id}\n` +
        `Run: npm run llm:record -- --pipeline=${testCase.pipeline} --case=${testCase.id}`
      )
    }

    const result = evaluate(fixture.response.processed, testCase)

    // Assert all checks passed
    for (const check of result.checks) {
      expect(check.passed, check.message).toBe(true)
    }
  })
}

// =============================================================================
// Standalone Runner
// =============================================================================

/**
 * Run suite from command line
 */
export async function runFromCLI(suitePath: string): Promise<void> {
  const { readFileSync } = await import('fs')

  const suiteJson = readFileSync(suitePath, 'utf-8')
  const suite = JSON.parse(suiteJson) as TestSuite

  console.log(`\nRunning: ${suite.name}`)
  console.log(`Pipeline: ${suite.pipeline}`)
  console.log(`Cases: ${suite.cases.length}`)

  const result = runSuite(suite, { verbose: true })

  console.log(generateReport(result.results))
  console.log(`\nDuration: ${result.durationMs.toFixed(0)}ms`)

  if (!result.passed) {
    process.exit(1)
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Generate a markdown report from suite results
 */
export function generateMarkdownReport(result: SuiteResult): string {
  const lines: string[] = []

  lines.push(`# ${result.suiteName}`)
  lines.push('')
  lines.push(`**Status:** ${result.passed ? '✅ PASSED' : '❌ FAILED'}`)
  lines.push(`**Pass Rate:** ${(result.summary.passRate * 100).toFixed(1)}%`)
  lines.push(`**Duration:** ${result.durationMs.toFixed(0)}ms`)
  lines.push('')

  // Summary table
  lines.push('## Summary')
  lines.push('')
  lines.push('| Metric | Count |')
  lines.push('|--------|-------|')
  lines.push(`| Total | ${result.summary.totalCases} |`)
  lines.push(`| Passed | ${result.summary.passedCases} |`)
  lines.push(`| Failed | ${result.summary.failedCases} |`)
  lines.push(`| Skipped | ${result.summary.skippedCases} |`)
  lines.push('')

  // By severity
  lines.push('## By Severity')
  lines.push('')
  lines.push('| Severity | Passed | Failed |')
  lines.push('|----------|--------|--------|')
  for (const [sev, counts] of Object.entries(result.bySeverity)) {
    lines.push(`| ${sev} | ${counts.passed} | ${counts.failed} |`)
  }
  lines.push('')

  // Failed cases
  const failed = result.results.filter(r => !r.passed)
  if (failed.length > 0) {
    lines.push('## Failed Cases')
    lines.push('')

    for (const r of failed) {
      lines.push(`### ${r.caseId}`)
      lines.push('')

      const failedChecks = r.checks.filter(c => !c.passed)
      for (const check of failedChecks) {
        lines.push(`- ❌ ${check.message}`)
        if (check.expected !== undefined) {
          lines.push(`  - Expected: \`${check.expected}\``)
          lines.push(`  - Actual: \`${check.actual}\``)
        }
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}
