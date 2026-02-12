#!/usr/bin/env npx tsx
/**
 * LLM E2E Test Runner
 *
 * Usage:
 *   npm run test:llm:smoke
 *   npm run test:llm
 *   npm run test:llm -- --category basic
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '.env.local' })

import { runTestSuite, printSummary, checkApiKey } from './test-harness'
import {
  allTests,
  smokeTests,
  basicTests,
  layoutTests,
  formTests,
  dashboardTests,
  stylingTests,
  interactiveTests,
  complexTests,
} from './test-cases'

const categories: Record<string, typeof allTests> = {
  all: allTests,
  smoke: smokeTests,
  basic: basicTests,
  layout: layoutTests,
  form: formTests,
  dashboard: dashboardTests,
  styling: stylingTests,
  interactive: interactiveTests,
  complex: complexTests,
}

async function main() {
  console.log('\n🧪 Mirror LLM E2E Tests\n')

  // Check API key
  if (!checkApiKey()) {
    process.exit(1)
  }

  // Parse arguments
  const args = process.argv.slice(2)
  let testsToRun = allTests

  if (args.includes('--smoke')) {
    testsToRun = smokeTests
    console.log('Running smoke tests only...\n')
  } else if (args.includes('--category')) {
    const categoryIndex = args.indexOf('--category')
    const category = args[categoryIndex + 1]
    if (category && categories[category]) {
      testsToRun = categories[category]
      console.log(`Running ${category} tests...\n`)
    } else {
      console.log('Available categories:', Object.keys(categories).join(', '))
      process.exit(1)
    }
  } else if (args.includes('--help')) {
    console.log(`
Usage:
  npx tsx src/__tests__/llm-e2e/run-tests.ts [options]

Options:
  --smoke              Run only smoke tests (fast)
  --category <name>    Run specific category
  --help               Show this help

Categories: ${Object.keys(categories).join(', ')}

Environment:
  VITE_OPENROUTER_API_KEY   Required. Your OpenRouter API key.
`)
    process.exit(0)
  }

  console.log(`Running ${testsToRun.length} tests...\n`)

  const result = await runTestSuite(testsToRun)
  printSummary(result)

  // Exit with error code if tests failed
  process.exit(result.failed > 0 ? 1 : 0)
}

main().catch(err => {
  console.error('Test runner error:', err)
  process.exit(1)
})
