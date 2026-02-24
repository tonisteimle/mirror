#!/usr/bin/env npx tsx
/**
 * Run LLM Quality Evaluation
 *
 * Usage:
 *   npx tsx scripts/run-llm-eval.ts              # Run all tests
 *   npx tsx scripts/run-llm-eval.ts basic        # Run specific category
 *   npx tsx scripts/run-llm-eval.ts --quick      # Run quick sample (5 tests)
 *   npx tsx scripts/run-llm-eval.ts --verbose    # Show generated code
 */

import {
  runFullEvaluation,
  runCategoryEvaluation,
  evaluateTestCase,
  printSummary,
  EVAL_TEST_CASES,
  type TestCategory,
} from '../src/converter/react-pivot/eval'

// Default tokens for testing
const DEFAULT_TOKENS = `
$grey-50: #FAFAFA
$grey-100: #F4F4F5
$grey-500: #71717A
$grey-800: #27272A
$grey-900: #18181B
$grey-950: #09090B

$blue-500: #3B82F6
$blue-600: #2563EB
$green-500: #22C55E
$red-500: #EF4444
$yellow-500: #F59E0B

$app.bg: $grey-950
$surface.bg: $grey-900
$elevated.bg: $grey-800
$hover.bg: $grey-700
$input.bg: $grey-800

$default.col: $grey-300
$muted.col: $grey-500
$heading.col: $grey-50
$on-primary.col: $grey-50

$primary.bg: $blue-500
$primary.col: $blue-500
$primary.hover.bg: $blue-600

$success.bg: $green-500
$success.col: $green-500
$danger.bg: $red-500
$danger.col: $red-500
$warning.bg: $yellow-500
$warning.col: $yellow-500

$sm.pad: 4
$md.pad: 8
$lg.pad: 16

$sm.gap: 4
$md.gap: 8
$lg.gap: 16

$sm.rad: 4
$md.rad: 6
$lg.rad: 8

$xs.font.size: 11
$sm.font.size: 12
$default.font.size: 13
$heading.font.size: 18
`

async function main() {
  const args = process.argv.slice(2)

  const verbose = args.includes('--verbose')
  const quick = args.includes('--quick')
  const category = args.find(a => !a.startsWith('--')) as TestCategory | undefined

  console.log('═'.repeat(60))
  console.log('  LLM QUALITY EVALUATION')
  console.log('═'.repeat(60))
  console.log()

  if (quick) {
    // Run quick sample: 5 random tests
    console.log('Running quick evaluation (5 tests)...\n')

    const sampleTests = EVAL_TEST_CASES.slice(0, 5)
    const results = []

    for (const testCase of sampleTests) {
      process.stdout.write(`  ${testCase.id}: `)
      const result = await evaluateTestCase(testCase, DEFAULT_TOKENS)
      results.push(result)

      if (result.passed) {
        console.log(`✓ (${result.score}%)`)
      } else {
        console.log(`✗ (${result.score}%) - ${result.issues[0]?.message || 'Failed'}`)
      }

      if (verbose) {
        console.log('\n    Generated code:')
        console.log('    ' + result.mirrorCode.split('\n').join('\n    '))
        console.log()
      }
    }

    const passed = results.filter(r => r.passed).length
    const avgScore = results.reduce((s, r) => s + r.score, 0) / results.length

    console.log(`\nQuick Results: ${passed}/${results.length} passed, avg score ${avgScore.toFixed(1)}%`)

  } else if (category) {
    // Run specific category
    const validCategories = ['basic', 'layout', 'tokens', 'states', 'events', 'forms', 'lists', 'modals', 'complex']

    if (!validCategories.includes(category)) {
      console.error(`Invalid category: ${category}`)
      console.error(`Valid categories: ${validCategories.join(', ')}`)
      process.exit(1)
    }

    const { results, summary } = await runCategoryEvaluation(category as TestCategory, DEFAULT_TOKENS)

    if (verbose) {
      console.log('\n--- Generated Code ---\n')
      for (const result of results) {
        console.log(`[${result.testCase.id}]`)
        console.log(result.mirrorCode)
        console.log()
      }
    }

    printSummary(summary)

  } else {
    // Run full evaluation
    const { results, summary } = await runFullEvaluation(DEFAULT_TOKENS)

    if (verbose) {
      console.log('\n--- Generated Code ---\n')
      for (const result of results) {
        console.log(`[${result.testCase.id}]`)
        console.log(result.mirrorCode)
        console.log()
      }
    }

    printSummary(summary)
  }
}

main().catch(console.error)
