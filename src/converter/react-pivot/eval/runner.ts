/**
 * @module converter/react-pivot/eval/runner
 * @description Evaluation runner for measuring LLM generation quality
 *
 * Runs test cases through the pipeline and measures quality metrics.
 */

import { executePipeline } from '../pipeline'
import {
  EVAL_TEST_CASES,
  UNIVERSAL_FORBIDDEN_PATTERNS,
  type EvalTestCase,
  type TestCategory,
} from './test-cases'

// =============================================================================
// Types
// =============================================================================

export interface EvalResult {
  testCase: EvalTestCase
  passed: boolean
  score: number          // 0-100
  mirrorCode: string
  issues: EvalIssue[]
  metrics: {
    generationTime: number
    componentCount: number
    tokenUsage: number   // Number of token references found
    postProcessCorrections: number
  }
}

export interface EvalIssue {
  type: 'missing-pattern' | 'forbidden-pattern' | 'min-components' | 'syntax-error'
  message: string
  pattern?: string
}

export interface EvalSummary {
  totalTests: number
  passedTests: number
  failedTests: number
  passRate: number       // 0-100
  averageScore: number   // 0-100
  averageGenerationTime: number
  averageTokenUsage: number
  categoryBreakdown: Record<TestCategory, CategoryStats>
  worstTests: EvalResult[]  // Bottom 5 performers
}

export interface CategoryStats {
  total: number
  passed: number
  passRate: number
  averageScore: number
}

// =============================================================================
// Evaluation Functions
// =============================================================================

/**
 * Run a single test case and evaluate the result.
 */
export async function evaluateTestCase(
  testCase: EvalTestCase,
  tokensCode?: string
): Promise<EvalResult> {
  const startTime = performance.now()

  // Run the pipeline
  const result = await executePipeline(testCase.prompt, {
    tokensCode,
    qualityMode: false, // Use fast mode for eval
  })

  const generationTime = performance.now() - startTime
  const issues: EvalIssue[] = []
  let score = 100

  // Check if generation succeeded
  if (!result.success || !result.mirrorCode) {
    return {
      testCase,
      passed: false,
      score: 0,
      mirrorCode: '',
      issues: [{ type: 'syntax-error', message: 'Generation failed' }],
      metrics: {
        generationTime,
        componentCount: 0,
        tokenUsage: 0,
        postProcessCorrections: 0,
      },
    }
  }

  const code = result.mirrorCode

  // Check expected patterns
  for (const pattern of testCase.expectedPatterns) {
    if (!pattern.test(code)) {
      issues.push({
        type: 'missing-pattern',
        message: `Missing expected pattern: ${pattern.source}`,
        pattern: pattern.source,
      })
      score -= 15 // Deduct 15 points per missing pattern
    }
  }

  // Check forbidden patterns (case-specific)
  for (const pattern of testCase.forbiddenPatterns) {
    if (pattern.test(code)) {
      issues.push({
        type: 'forbidden-pattern',
        message: `Found forbidden pattern: ${pattern.source}`,
        pattern: pattern.source,
      })
      score -= 20 // Deduct 20 points per forbidden pattern
    }
  }

  // Check universal forbidden patterns
  for (const pattern of UNIVERSAL_FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      issues.push({
        type: 'forbidden-pattern',
        message: `Found universally forbidden pattern: ${pattern.source}`,
        pattern: pattern.source,
      })
      score -= 25 // Deduct 25 points per universal violation
    }
  }

  // Check minimum components
  const componentCount = countComponents(code)
  if (testCase.minComponents && componentCount < testCase.minComponents) {
    issues.push({
      type: 'min-components',
      message: `Expected at least ${testCase.minComponents} components, found ${componentCount}`,
    })
    score -= 10
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))

  // Calculate token usage
  const tokenUsage = countTokenReferences(code)

  return {
    testCase,
    passed: score >= 70 && issues.filter(i => i.type === 'forbidden-pattern').length === 0,
    score,
    mirrorCode: code,
    issues,
    metrics: {
      generationTime,
      componentCount,
      tokenUsage,
      postProcessCorrections: 0, // Would need to track from result
    },
  }
}

/**
 * Run all test cases and generate summary.
 */
export async function runFullEvaluation(tokensCode?: string): Promise<{
  results: EvalResult[]
  summary: EvalSummary
}> {
  const results: EvalResult[] = []

  console.log(`Running ${EVAL_TEST_CASES.length} test cases...\n`)

  for (const testCase of EVAL_TEST_CASES) {
    process.stdout.write(`  ${testCase.id}: `)
    const result = await evaluateTestCase(testCase, tokensCode)
    results.push(result)

    // Print inline result
    if (result.passed) {
      console.log(`✓ (${result.score}%)`)
    } else {
      console.log(`✗ (${result.score}%) - ${result.issues[0]?.message || 'Failed'}`)
    }
  }

  const summary = generateSummary(results)
  return { results, summary }
}

/**
 * Run evaluation for a specific category.
 */
export async function runCategoryEvaluation(
  category: TestCategory,
  tokensCode?: string
): Promise<{
  results: EvalResult[]
  summary: EvalSummary
}> {
  const testCases = EVAL_TEST_CASES.filter(tc => tc.category === category)
  const results: EvalResult[] = []

  console.log(`Running ${testCases.length} ${category} test cases...\n`)

  for (const testCase of testCases) {
    process.stdout.write(`  ${testCase.id}: `)
    const result = await evaluateTestCase(testCase, tokensCode)
    results.push(result)

    if (result.passed) {
      console.log(`✓ (${result.score}%)`)
    } else {
      console.log(`✗ (${result.score}%) - ${result.issues[0]?.message || 'Failed'}`)
    }
  }

  const summary = generateSummary(results)
  return { results, summary }
}

// =============================================================================
// Helper Functions
// =============================================================================

function countComponents(code: string): number {
  // Count component definitions and instances
  const componentPattern = /^[A-Z][a-zA-Z0-9]*(?:\s|:|\n)/gm
  const matches = code.match(componentPattern) || []
  return matches.length
}

function countTokenReferences(code: string): number {
  // Count $token references
  const tokenPattern = /\$[a-zA-Z][a-zA-Z0-9-]*(?:\.[a-zA-Z]+)?/g
  const matches = code.match(tokenPattern) || []
  return matches.length
}

function generateSummary(results: EvalResult[]): EvalSummary {
  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length

  // Calculate category breakdown
  const categories: TestCategory[] = ['basic', 'layout', 'tokens', 'states', 'events', 'forms', 'lists', 'modals', 'complex']
  const categoryBreakdown: Record<TestCategory, CategoryStats> = {} as Record<TestCategory, CategoryStats>

  for (const category of categories) {
    const categoryResults = results.filter(r => r.testCase.category === category)
    const categoryPassed = categoryResults.filter(r => r.passed).length

    categoryBreakdown[category] = {
      total: categoryResults.length,
      passed: categoryPassed,
      passRate: categoryResults.length > 0 ? (categoryPassed / categoryResults.length) * 100 : 0,
      averageScore: categoryResults.length > 0
        ? categoryResults.reduce((sum, r) => sum + r.score, 0) / categoryResults.length
        : 0,
    }
  }

  // Find worst performers
  const worstTests = [...results]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)

  return {
    totalTests,
    passedTests,
    failedTests: totalTests - passedTests,
    passRate: (passedTests / totalTests) * 100,
    averageScore: results.reduce((sum, r) => sum + r.score, 0) / totalTests,
    averageGenerationTime: results.reduce((sum, r) => sum + r.metrics.generationTime, 0) / totalTests,
    averageTokenUsage: results.reduce((sum, r) => sum + r.metrics.tokenUsage, 0) / totalTests,
    categoryBreakdown,
    worstTests,
  }
}

// =============================================================================
// Reporting
// =============================================================================

export function printSummary(summary: EvalSummary): void {
  console.log('\n' + '═'.repeat(60))
  console.log('  EVALUATION SUMMARY')
  console.log('═'.repeat(60))

  console.log(`
Overall Results:
  Total Tests:    ${summary.totalTests}
  Passed:         ${summary.passedTests} (${summary.passRate.toFixed(1)}%)
  Failed:         ${summary.failedTests}
  Average Score:  ${summary.averageScore.toFixed(1)}%
  Avg Gen Time:   ${summary.averageGenerationTime.toFixed(0)}ms
  Avg Token Use:  ${summary.averageTokenUsage.toFixed(1)} refs/test
`)

  console.log('Category Breakdown:')
  console.log('─'.repeat(60))
  console.log('  Category     | Tests | Pass | Rate    | Avg Score')
  console.log('─'.repeat(60))

  for (const [category, stats] of Object.entries(summary.categoryBreakdown)) {
    if (stats.total > 0) {
      console.log(
        `  ${category.padEnd(12)} | ${String(stats.total).padStart(5)} | ${String(stats.passed).padStart(4)} | ${stats.passRate.toFixed(1).padStart(6)}% | ${stats.averageScore.toFixed(1).padStart(8)}%`
      )
    }
  }

  console.log('─'.repeat(60))

  if (summary.worstTests.length > 0) {
    console.log('\nWorst Performers:')
    for (const result of summary.worstTests) {
      console.log(`  ${result.testCase.id}: ${result.score}% - ${result.issues[0]?.message || 'Unknown issue'}`)
    }
  }

  console.log('\n' + '═'.repeat(60))
}

// =============================================================================
// Export
// =============================================================================

export {
  EVAL_TEST_CASES,
  type EvalTestCase,
  type TestCategory,
}
