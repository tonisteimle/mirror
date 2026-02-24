/**
 * React-Pivot Evaluation Suite
 *
 * Tests the quality of the React-Pivot pipeline:
 * LLM generates React/JSX → Deterministic transformation to Mirror DSL
 *
 * Uses fixtures for deterministic testing.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { TestSuite, TestCase, ResponseFixture } from '../schema'
import { evaluate } from '../utils/evaluator'

// =============================================================================
// Paths
// =============================================================================

const SUITE_PATH = join(__dirname, '..', 'fixtures', 'react-pivot', 'cases.json')
const RESPONSES_PATH = join(__dirname, '..', 'fixtures', 'react-pivot', 'responses')

// =============================================================================
// Load Functions
// =============================================================================

function loadSuite(): TestSuite {
  const content = readFileSync(SUITE_PATH, 'utf-8')
  return JSON.parse(content) as TestSuite
}

function loadFixtures(): Map<string, ResponseFixture> {
  const fixtures = new Map<string, ResponseFixture>()

  if (!existsSync(RESPONSES_PATH)) {
    return fixtures
  }

  const { readdirSync } = require('fs')
  const files = readdirSync(RESPONSES_PATH).filter((f: string) => f.endsWith('.json'))

  for (const file of files) {
    const caseId = file.replace('.json', '')
    try {
      const content = readFileSync(join(RESPONSES_PATH, file), 'utf-8')
      const fixture = JSON.parse(content) as ResponseFixture
      fixtures.set(caseId, fixture)
    } catch (err) {
      console.warn(`Failed to load fixture ${file}: ${err}`)
    }
  }

  return fixtures
}

// =============================================================================
// Load Data Immediately (for test structure)
// =============================================================================

const suite = loadSuite()
const fixtures = loadFixtures()
const hasAnyFixtures = fixtures.size > 0

// =============================================================================
// Test Suite
// =============================================================================

describe('React-Pivot Evaluation', () => {

  describe('Suite Metadata', () => {
    it('has valid suite definition', () => {
      expect(suite.name).toBeDefined()
      expect(suite.pipeline).toBe('react-pivot')
      expect(suite.cases.length).toBeGreaterThan(0)
    })

    it('all cases have required fields', () => {
      for (const testCase of suite.cases) {
        expect(testCase.id).toBeDefined()
        expect(testCase.description).toBeDefined()
        expect(testCase.input.prompt).toBeDefined()
        expect(testCase.expect.parses).toBe(true)
      }
    })

    it('has expected case count (30 test cases)', () => {
      expect(suite.cases.length).toBe(30)
    })

    it('has proper severity distribution', () => {
      const critical = suite.cases.filter(c => c.severity === 'critical').length
      const important = suite.cases.filter(c => c.severity === 'important').length
      const normal = suite.cases.filter(c => c.severity === 'normal').length
      const edgeCase = suite.cases.filter(c => c.severity === 'edge-case').length

      expect(critical).toBe(10)   // Basic cases
      expect(important).toBe(10)  // Intermediate cases
      expect(normal).toBe(8)      // Advanced cases
      expect(edgeCase).toBe(2)    // Edge cases
    })

    it('reports fixture coverage', () => {
      const total = suite.cases.length
      const recorded = suite.cases.filter(c => fixtures.has(c.id)).length
      const coverage = (recorded / total * 100).toFixed(1)

      console.log(`\n📊 Fixture Coverage: ${recorded}/${total} (${coverage}%)`)

      if (recorded < total) {
        const missing = suite.cases
          .filter(c => !fixtures.has(c.id))
          .map(c => c.id)
        console.log(`⚠️  Missing: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`)
        console.log(`   Run: npm run llm:record -- --pipeline=react-pivot`)
      }
    })
  })

  // =============================================================================
  // Evaluation Tests (only if fixtures exist)
  // =============================================================================

  describe.skipIf(!hasAnyFixtures)('Critical Cases (Basic)', () => {
    const criticalCases = suite.cases.filter(c =>
      c.severity === 'critical' && fixtures.has(c.id)
    )

    if (criticalCases.length === 0) {
      it.skip('no critical fixtures recorded', () => {})
    }

    for (const testCase of criticalCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })

  describe.skipIf(!hasAnyFixtures)('Important Cases (Intermediate)', () => {
    const importantCases = suite.cases.filter(c =>
      c.severity === 'important' && fixtures.has(c.id)
    )

    if (importantCases.length === 0) {
      it.skip('no important fixtures recorded', () => {})
    }

    for (const testCase of importantCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })

  describe.skipIf(!hasAnyFixtures)('Standard Cases (Advanced)', () => {
    const normalCases = suite.cases.filter(c =>
      c.severity === 'normal' && fixtures.has(c.id)
    )

    if (normalCases.length === 0) {
      it.skip('no standard fixtures recorded', () => {})
    }

    for (const testCase of normalCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })

  describe.skipIf(!hasAnyFixtures)('Edge Cases', () => {
    const edgeCases = suite.cases.filter(c =>
      c.severity === 'edge-case' && fixtures.has(c.id)
    )

    if (edgeCases.length === 0) {
      it.skip('no edge-case fixtures recorded', () => {})
    }

    for (const testCase of edgeCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })
})

// =============================================================================
// Summary (always runs)
// =============================================================================

describe('React-Pivot Summary', () => {
  it('generates evaluation summary', () => {
    if (fixtures.size === 0) {
      console.log('\n⚠️  No fixtures recorded yet.')
      console.log('Run: npm run llm:record -- --pipeline=react-pivot\n')
      return
    }

    let passed = 0
    let failed = 0
    const failures: string[] = []

    // By severity
    const bySeverity = {
      critical: { passed: 0, failed: 0 },
      important: { passed: 0, failed: 0 },
      normal: { passed: 0, failed: 0 },
      'edge-case': { passed: 0, failed: 0 },
    }

    for (const testCase of suite.cases) {
      const fixture = fixtures.get(testCase.id)
      if (!fixture) continue

      const result = evaluate(fixture.response.processed, testCase)

      if (result.passed) {
        passed++
        bySeverity[testCase.severity].passed++
      } else {
        failed++
        bySeverity[testCase.severity].failed++
        const failedChecks = result.checks.filter(c => !c.passed)
        failures.push(`${testCase.id}: ${failedChecks.map(c => c.name).join(', ')}`)
      }
    }

    const total = passed + failed
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0'

    console.log(`\n${'='.repeat(50)}`)
    console.log('REACT-PIVOT EVALUATION SUMMARY')
    console.log(`${'='.repeat(50)}`)
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Rate: ${passRate}%`)

    console.log('\nBy Severity:')
    console.log(`  Critical (Basic):      ${bySeverity.critical.passed}/${bySeverity.critical.passed + bySeverity.critical.failed}`)
    console.log(`  Important (Intermediate): ${bySeverity.important.passed}/${bySeverity.important.passed + bySeverity.important.failed}`)
    console.log(`  Normal (Advanced):     ${bySeverity.normal.passed}/${bySeverity.normal.passed + bySeverity.normal.failed}`)
    console.log(`  Edge Cases:            ${bySeverity['edge-case'].passed}/${bySeverity['edge-case'].passed + bySeverity['edge-case'].failed}`)

    if (failures.length > 0) {
      console.log('\nFailed cases:')
      failures.forEach(f => console.log(`  ❌ ${f}`))
    }

    console.log('')
  })
})
