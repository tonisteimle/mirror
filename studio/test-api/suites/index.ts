/**
 * Test Suites Public API
 *
 * Single entry point for the CDP browser test runner. Categories live
 * in categories.ts (single source of truth) — this module re-exports
 * the registry and provides runtime helpers that delegate to it.
 *
 * Usage:
 *   __mirrorTestSuites.runAll()
 *   __mirrorTestSuites.runCategory('layout')
 *   __mirrorTestSuites.runSingleTest('Frame renders div')
 */

import type { TestSuiteResult } from '../types'
import type { TestCase } from '../test-runner'
import { categories, listCategories, getCategoryCounts, allCategoryTests } from './categories'

// Re-export the category registry. Consumers should treat categories.ts as
// the canonical surface; everything else here is glue.
export * from './categories'

// =============================================================================
// Aggregate Test Sets
// =============================================================================

/** Every test in every registered category. */
export const allTests: TestCase[] = allCategoryTests

/**
 * Smoke subset — the first 3 tests from each category, used by `runQuick`.
 * Cheap, deterministic, useful for validating the runner itself.
 */
export const quickTests: TestCase[] = Object.values(categories).flatMap(c => c.tests.slice(0, 3))

/** Test counts per category, plus `total`. */
export const testCounts: Record<string, number> & { total: number } = {
  ...getCategoryCounts(),
  total: allTests.length,
}

// =============================================================================
// Runner Functions
// =============================================================================

function requireApi(): {
  run: (tests: TestCase[], name: string) => Promise<TestSuiteResult>
} {
  const api = (
    window as { __mirrorTest?: { run: (t: TestCase[], n: string) => Promise<TestSuiteResult> } }
  ).__mirrorTest
  if (!api) throw new Error('Mirror Test API not available')
  return api
}

export async function runAllTests(): Promise<TestSuiteResult> {
  return requireApi().run(allTests, 'All Mirror Tests')
}

export async function runQuickTests(): Promise<TestSuiteResult> {
  return requireApi().run(quickTests, 'Quick Tests')
}

/**
 * Run one of the 17 main categories. Pass the category name as listed by
 * `__mirrorTestSuites.listCategories()`. Legacy dot-notation subcategories
 * (`layout.direction`, `styling.colors`, …) are no longer supported — use
 * `__mirrorTest.filter(pattern)` to slice within a category.
 */
export async function runCategory(category: string): Promise<TestSuiteResult> {
  if (category in categories) {
    const cat = categories[category as keyof typeof categories]
    return requireApi().run(cat.tests, `${cat.name} Tests`)
  }
  throw new Error(`Unknown category: "${category}". Available: ${listCategories().join(', ')}`)
}

export async function runSingleTest(testName: string): Promise<TestSuiteResult> {
  const needle = testName.toLowerCase()
  const exact = allTests.find(t => t.name === testName)
  const partial = exact ?? allTests.find(t => t.name.toLowerCase().includes(needle))

  if (!partial) {
    const matches = allTests.filter(t => t.name.toLowerCase().includes(needle))
    console.error(`❌ Test not found: "${testName}"`)
    if (matches.length > 0) {
      console.log('Available tests containing that pattern:')
      matches.slice(0, 10).forEach(t => console.log(`   - ${t.name}`))
      if (matches.length > 10) console.log(`   ... and ${matches.length - 10} more`)
    }
    return {
      name: testName,
      passed: 0,
      failed: 1,
      skipped: 0,
      duration: 0,
      results: [{ name: testName, passed: false, duration: 0, assertions: [] }],
    }
  }

  console.log(`🎯 Running: ${partial.name}`)
  return requireApi().run([partial], `Single Test: ${partial.name}`)
}

export function printTestSummary(): void {
  console.log('📊 Mirror Test Suites:')
  for (const [name, info] of Object.entries(categories)) {
    console.log(`   ${name.padEnd(18)}: ${info.tests.length.toString().padStart(4)} tests`)
  }
  console.log('   ──────────────────────────')
  console.log(`   Total:              ${allTests.length.toString().padStart(4)} tests`)
  console.log('')
  console.log('Run with:')
  console.log('   __mirrorTestSuites.runAll()')
  console.log('   __mirrorTestSuites.runCategory("layout")')
  console.log('   __mirrorTestSuites.runSingleTest("Frame renders div")')
}
