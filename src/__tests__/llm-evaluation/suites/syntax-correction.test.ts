/**
 * Syntax Correction Evaluation Suite
 *
 * Tests the quality of LLM typo and syntax error correction.
 * Uses fixtures for deterministic testing.
 *
 * These tests verify that the LLM:
 * 1. Corrects component name typos (Buttn → Button)
 * 2. Corrects property name typos (backgrund → background)
 * 3. Preserves original values (colors, numbers, strings)
 * 4. Does NOT generate completely different code
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import type { TestSuite, TestCase, ResponseFixture } from '../schema'
import { evaluate } from '../utils/evaluator'

// =============================================================================
// Paths
// =============================================================================

const SUITE_PATH = join(__dirname, '..', 'fixtures', 'syntax-correction', 'cases.json')
const RESPONSES_PATH = join(__dirname, '..', 'fixtures', 'syntax-correction', 'responses')

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

describe('Syntax Correction Evaluation', () => {

  describe('Suite Metadata', () => {
    it('has valid suite definition', () => {
      expect(suite.name).toBeDefined()
      expect(suite.pipeline).toBe('syntax-correction')
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
        console.log(`   Run: npm run llm:record -- --pipeline=syntax-correction`)
      }
    })
  })

  // =============================================================================
  // Component Typo Corrections (Critical)
  // =============================================================================

  describe.skipIf(!hasAnyFixtures)('Component Name Corrections', () => {
    const componentCases = suite.cases.filter(c =>
      c.tags?.includes('component-typo') && fixtures.has(c.id)
    )

    if (componentCases.length === 0) {
      it.skip('no component typo fixtures recorded', () => {})
    }

    for (const testCase of componentCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })

  // =============================================================================
  // Property Typo Corrections (Critical)
  // =============================================================================

  describe.skipIf(!hasAnyFixtures)('Property Name Corrections', () => {
    const propertyCases = suite.cases.filter(c =>
      c.tags?.includes('property-typo') && fixtures.has(c.id)
    )

    if (propertyCases.length === 0) {
      it.skip('no property typo fixtures recorded', () => {})
    }

    for (const testCase of propertyCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })

  // =============================================================================
  // Value Preservation (Important)
  // =============================================================================

  describe.skipIf(!hasAnyFixtures)('Value Preservation', () => {
    const preservationCases = suite.cases.filter(c =>
      c.tags?.includes('preservation') && fixtures.has(c.id)
    )

    if (preservationCases.length === 0) {
      it.skip('no preservation fixtures recorded', () => {})
    }

    for (const testCase of preservationCases) {
      it(testCase.description, () => {
        const fixture = fixtures.get(testCase.id)!
        const result = evaluate(fixture.response.processed, testCase)

        for (const check of result.checks) {
          expect(check.passed, `${check.name}: ${check.message}`).toBe(true)
        }
      })
    }
  })

  // =============================================================================
  // Syntax Error Fixes (Normal)
  // =============================================================================

  describe.skipIf(!hasAnyFixtures)('Syntax Error Fixes', () => {
    const syntaxCases = suite.cases.filter(c =>
      c.tags?.includes('syntax-error') && fixtures.has(c.id)
    )

    if (syntaxCases.length === 0) {
      it.skip('no syntax error fixtures recorded', () => {})
    }

    for (const testCase of syntaxCases) {
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

describe('Syntax Correction Summary', () => {
  it('generates evaluation summary', () => {
    if (fixtures.size === 0) {
      console.log('\n⚠️  No fixtures recorded yet.')
      console.log('Run: npm run llm:record -- --pipeline=syntax-correction\n')
      return
    }

    let passed = 0
    let failed = 0
    const failures: string[] = []

    for (const testCase of suite.cases) {
      const fixture = fixtures.get(testCase.id)
      if (!fixture) continue

      const result = evaluate(fixture.response.processed, testCase)

      if (result.passed) {
        passed++
      } else {
        failed++
        const failedChecks = result.checks.filter(c => !c.passed)
        failures.push(`${testCase.id}: ${failedChecks.map(c => c.name).join(', ')}`)
      }
    }

    const total = passed + failed
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0'

    console.log(`\n${'='.repeat(50)}`)
    console.log('SYNTAX CORRECTION EVALUATION SUMMARY')
    console.log(`${'='.repeat(50)}`)
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed} | Rate: ${passRate}%`)

    if (failures.length > 0) {
      console.log('\nFailed cases:')
      failures.forEach(f => console.log(`  ❌ ${f}`))
    }

    console.log('')
  })
})
