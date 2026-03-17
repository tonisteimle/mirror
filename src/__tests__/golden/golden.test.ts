/**
 * Golden Master Tests
 *
 * Diese Tests validieren den DOM Output gegen manuell verifizierte Werte.
 * Die Golden Master Datei (master.ts) ist die EINZIGE Source of Truth.
 *
 * Wenn ein Test hier fehlschlägt, gibt es zwei Möglichkeiten:
 * 1. Der Compiler hat einen Bug → Compiler fixen
 * 2. Der Golden Master ist falsch → Golden Master updaten (nach Verifizierung!)
 */

import { describe, it, expect } from 'vitest'
import { compileAndExecute } from '../../test-utils'
import { ALL_CATEGORIES, GoldenCase, getGoldenStats } from './master'

// ============================================================================
// Test Generator
// ============================================================================

function generateTestsForCategory(categoryName: string, cases: GoldenCase[]) {
  describe(`Golden: ${categoryName}`, () => {
    for (const testCase of cases) {
      it(`'${testCase.input}' → ${JSON.stringify(testCase.css)}`, () => {
        // Determine element type
        const elementType = testCase.elementType || 'frame'
        const content = elementType === 'text' ? '"Test"' : ''

        // Build code
        const code = `
TestElement as ${elementType}:
  ${testCase.input}

TestElement ${content}
`
        const { root } = compileAndExecute(code)

        // Check each expected CSS property
        for (const [prop, expectedValue] of Object.entries(testCase.css)) {
          const actualValue = root.style[prop as any]

          // Handle browser normalization
          const normalizedExpected = normalizeValue(expectedValue)
          const normalizedActual = normalizeValue(actualValue)

          expect(
            normalizedActual,
            `${prop}: expected "${expectedValue}", got "${actualValue}"`
          ).toBe(normalizedExpected)
        }
      })
    }
  })
}

// ============================================================================
// Value Normalization
// ============================================================================

function normalizeValue(value: string): string {
  if (!value) return value

  // Normalize flex shorthand variations
  // "1 1 0%" can become "1" or "1 1 0" in some browsers
  if (value === '1 1 0%' || value === '1 1 0' || value === '1') {
    return '1 1 0%'
  }

  // Normalize rgb spacing
  // "rgb(255, 0, 0)" vs "rgb(255,0,0)"
  if (value.startsWith('rgb')) {
    return value.replace(/,\s*/g, ', ')
  }

  return value
}

// ============================================================================
// Run All Golden Tests
// ============================================================================

describe('Golden Master Tests', () => {
  // Print stats
  const stats = getGoldenStats()
  console.log(`\n📊 Golden Master: ${stats.totalCases} cases in ${stats.categories} categories\n`)

  // Generate tests for each category
  for (const category of ALL_CATEGORIES) {
    generateTestsForCategory(category.name, category.cases)
  }
})

// ============================================================================
// Coverage Report
// ============================================================================

describe('Golden Master Coverage', () => {
  it('reports coverage statistics', () => {
    const stats = getGoldenStats()

    // Log coverage
    console.log('\n📋 Golden Master Coverage:')
    for (const cat of stats.byCategory) {
      console.log(`   ${cat.name}: ${cat.count} cases`)
    }
    console.log(`   ─────────────────`)
    console.log(`   Total: ${stats.totalCases} cases\n`)

    // This test always passes - it's just for reporting
    expect(stats.totalCases).toBeGreaterThan(0)
  })
})
