/**
 * Built-in browser drag tests + runAllTests entry point
 */

import type { BrowserTestRunner } from './test-runner'
import type { TestCase, BrowserTestResult } from './test-api-types'

export const builtInTests: TestCase[] = [
  {
    name: 'Drop Button into empty Frame',
    run: async runner => {
      return runner
        .fromPalette('Button')
        .withText('Test')
        .toContainer('node-1')
        .atIndex(0)
        .execute()
    },
  },
  {
    name: 'Drop Text after Button',
    run: async runner => {
      return runner.fromPalette('Text').withText('Hello').toContainer('node-1').atIndex(1).execute()
    },
  },
  {
    name: 'Drop Icon at beginning',
    run: async runner => {
      return runner.fromPalette('Icon').withText('star').toContainer('node-1').atIndex(0).execute()
    },
  },
]

/**
 * Run all built-in tests
 */
export async function runAllTests(runner: BrowserTestRunner): Promise<{
  passed: number
  failed: number
  results: BrowserTestResult[]
}> {
  const results: BrowserTestResult[] = []
  let passed = 0
  let failed = 0

  console.group('🧪 Drag & Drop Browser Tests')

  for (const test of builtInTests) {
    console.log(`Running: ${test.name}...`)
    const result = await test.run(runner)
    results.push(result)

    if (result.success) {
      passed++
      console.log(`  ✅ ${test.name} (${result.duration.toFixed(0)}ms)`)
    } else {
      failed++
      console.log(`  ❌ ${test.name}: ${result.error}`)
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  console.groupEnd()

  return { passed, failed, results }
}
