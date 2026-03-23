#!/usr/bin/env npx ts-node
/**
 * Scenario Test Runner
 *
 * Runs all defined test scenarios and reports results.
 *
 * Usage:
 *   npx ts-node studio/agent/__tests__/run-scenarios.ts
 *   npx ts-node studio/agent/__tests__/run-scenarios.ts --category basic
 *   npx ts-node studio/agent/__tests__/run-scenarios.ts --tag button
 *   npx ts-node studio/agent/__tests__/run-scenarios.ts --id basic-001
 *   npx ts-node studio/agent/__tests__/run-scenarios.ts --real  # Use real CLI
 */

import {
  allScenarios,
  getScenariosByCategory,
  getScenariosByTag,
  getScenarioById,
  getRunnableScenarios,
  validateResult,
  TestScenario,
  ScenarioCategory
} from './test-scenarios'
import { createFixerTestHarness, FixerTestHarness } from './fixer-harness'

// ============================================
// PARSE ARGS
// ============================================

const args = process.argv.slice(2)

function getArg(name: string): string | undefined {
  const index = args.indexOf(`--${name}`)
  return index >= 0 ? args[index + 1] : undefined
}

const useRealCli = args.includes('--real')
const debug = args.includes('--debug')
const verbose = args.includes('--verbose')
const stopOnFail = args.includes('--stop-on-fail')
const categoryFilter = getArg('category') as ScenarioCategory | undefined
const tagFilter = getArg('tag')
const idFilter = getArg('id')
const limit = getArg('limit') ? parseInt(getArg('limit')!, 10) : undefined

// ============================================
// COLORS
// ============================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
}

function color(text: string, c: keyof typeof colors): string {
  return `${colors[c]}${text}${colors.reset}`
}

// ============================================
// RESULT TRACKING
// ============================================

interface ScenarioResult {
  scenario: TestScenario
  passed: boolean
  duration: number
  errors: string[]
}

const results: ScenarioResult[] = []

// ============================================
// RUN SCENARIO
// ============================================

async function runScenario(scenario: TestScenario): Promise<ScenarioResult> {
  const harness = createFixerTestHarness({
    files: scenario.files,
    currentFile: scenario.currentFile,
    cursor: scenario.cursor,
    useMockCli: !useRealCli,
    mockResponse: scenario.mockResponse,
    debug
  })

  try {
    if (verbose) {
      console.log(`\n${color('━'.repeat(60), 'dim')}`)
      console.log(`${color('▶', 'blue')} ${scenario.name}`)
      console.log(`${color('  ID:', 'dim')} ${scenario.id}`)
      console.log(`${color('  Category:', 'dim')} ${scenario.category}`)
      console.log(`${color('  Prompt:', 'dim')} ${scenario.prompt}`)
      console.log(`${color('  Files:', 'dim')} ${Object.keys(scenario.files).join(', ')}`)
    }

    const result = await harness.runPrompt(scenario.prompt)

    const validation = validateResult(result, scenario.validate)

    if (verbose) {
      console.log(`${color('  Duration:', 'dim')} ${result.duration}ms`)
      console.log(`${color('  Changed:', 'dim')} ${result.filesChanged.join(', ') || 'none'}`)
      console.log(`${color('  Created:', 'dim')} ${result.filesCreated.join(', ') || 'none'}`)

      if (validation.passed) {
        console.log(`${color('  ✓ PASSED', 'green')}`)
      } else {
        console.log(`${color('  ✗ FAILED', 'red')}`)
        for (const error of validation.errors) {
          console.log(`${color('    - ', 'red')}${error}`)
        }
      }
    }

    return {
      scenario,
      passed: validation.passed,
      duration: result.duration,
      errors: validation.errors
    }
  } finally {
    harness.dispose()
  }
}

// ============================================
// GET SCENARIOS TO RUN
// ============================================

function getScenariosToRun(): TestScenario[] {
  // Filter by ID first (most specific)
  if (idFilter) {
    const scenario = getScenarioById(idFilter)
    if (!scenario) {
      console.error(color(`Scenario with ID "${idFilter}" not found`, 'red'))
      process.exit(1)
    }
    return [scenario]
  }

  // Filter by category
  if (categoryFilter) {
    const scenarios = getScenariosByCategory(categoryFilter)
    if (scenarios.length === 0) {
      console.error(color(`No scenarios in category "${categoryFilter}"`, 'red'))
      process.exit(1)
    }
    return scenarios
  }

  // Filter by tag
  if (tagFilter) {
    const scenarios = getScenariosByTag(tagFilter)
    if (scenarios.length === 0) {
      console.error(color(`No scenarios with tag "${tagFilter}"`, 'red'))
      process.exit(1)
    }
    return scenarios
  }

  // Get all runnable scenarios
  return getRunnableScenarios()
}

// ============================================
// MAIN
// ============================================

async function main(): Promise<void> {
  console.log(`
${color('╔═══════════════════════════════════════════════════════════╗', 'cyan')}
${color('║', 'cyan')}           ${color('Mirror Fixer Scenario Runner', 'bright')}                  ${color('║', 'cyan')}
${color('╠═══════════════════════════════════════════════════════════╣', 'cyan')}
${color('║', 'cyan')}  Mode: ${useRealCli ? color('Real CLI (slow)', 'yellow') : color('Mock (fast)', 'green')}                               ${color('║', 'cyan')}
${color('║', 'cyan')}  Debug: ${debug ? 'On' : 'Off'}                                              ${color('║', 'cyan')}
${color('╚═══════════════════════════════════════════════════════════╝', 'cyan')}
`)

  let scenarios = getScenariosToRun()

  // Apply limit
  if (limit && limit > 0) {
    scenarios = scenarios.slice(0, limit)
  }

  console.log(`Running ${color(scenarios.length.toString(), 'bright')} scenarios...\n`)

  const startTime = Date.now()
  let passed = 0
  let failed = 0

  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i]
    const progress = `[${i + 1}/${scenarios.length}]`

    if (!verbose) {
      process.stdout.write(`${color(progress, 'dim')} ${scenario.id.padEnd(12)} ${scenario.name.slice(0, 40).padEnd(40)} `)
    }

    try {
      const result = await runScenario(scenario)
      results.push(result)

      if (result.passed) {
        passed++
        if (!verbose) {
          console.log(color('✓', 'green'))
        }
      } else {
        failed++
        if (!verbose) {
          console.log(color('✗', 'red'))
          if (result.errors.length > 0) {
            for (const error of result.errors) {
              console.log(`  ${color('→', 'red')} ${error}`)
            }
          }
        }

        if (stopOnFail) {
          console.log(color('\nStopping on first failure', 'yellow'))
          break
        }
      }
    } catch (error) {
      failed++
      const errorMsg = error instanceof Error ? error.message : String(error)
      results.push({
        scenario,
        passed: false,
        duration: 0,
        errors: [`Unexpected error: ${errorMsg}`]
      })

      if (!verbose) {
        console.log(color('✗ ERROR', 'red'))
        console.log(`  ${color('→', 'red')} ${errorMsg}`)
      }

      if (stopOnFail) {
        console.log(color('\nStopping on first failure', 'yellow'))
        break
      }
    }
  }

  const totalDuration = Date.now() - startTime
  const avgDuration = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length)
    : 0

  // Summary
  console.log(`
${color('═'.repeat(60), 'dim')}

${color('Summary', 'bright')}

  Total:    ${scenarios.length}
  Passed:   ${color(passed.toString(), 'green')}
  Failed:   ${color(failed.toString(), failed > 0 ? 'red' : 'green')}
  Duration: ${totalDuration}ms (avg: ${avgDuration}ms per scenario)
`)

  // Category breakdown
  const byCategory = new Map<string, { passed: number; failed: number }>()
  for (const result of results) {
    const cat = result.scenario.category
    const current = byCategory.get(cat) || { passed: 0, failed: 0 }
    if (result.passed) {
      current.passed++
    } else {
      current.failed++
    }
    byCategory.set(cat, current)
  }

  console.log(color('By Category:', 'bright'))
  for (const [category, counts] of byCategory) {
    const status = counts.failed > 0 ? color('✗', 'red') : color('✓', 'green')
    console.log(`  ${status} ${category.padEnd(15)} ${counts.passed}/${counts.passed + counts.failed}`)
  }

  // Failed scenarios
  const failedScenarios = results.filter(r => !r.passed)
  if (failedScenarios.length > 0) {
    console.log(`\n${color('Failed Scenarios:', 'red')}`)
    for (const result of failedScenarios) {
      console.log(`  ${color('✗', 'red')} ${result.scenario.id}: ${result.scenario.name}`)
      for (const error of result.errors) {
        console.log(`    ${color('→', 'dim')} ${error}`)
      }
    }
  }

  console.log('')

  // Exit code
  if (failed > 0) {
    process.exit(1)
  }
}

// Run
main().catch(err => {
  console.error(color('Fatal error:', 'red'), err)
  process.exit(1)
})
