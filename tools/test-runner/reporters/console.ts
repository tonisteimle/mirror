/**
 * Console Reporter
 *
 * Outputs test results to the console with colors and formatting.
 */

import type { Reporter, TestResult, TestSuite, TestRunSummary } from '../types'

// =============================================================================
// ANSI Colors
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
}

const icons = {
  pass: '✅',
  fail: '❌',
  skip: '⏭️',
  suite: '🧪',
  time: '⏱️',
  retry: '🔄',
}

// =============================================================================
// Console Reporter
// =============================================================================

export class ConsoleReporter implements Reporter {
  private verbose: boolean
  private silent: boolean
  private currentSuite: string = ''

  constructor(options: { verbose?: boolean; silent?: boolean } = {}) {
    this.verbose = options.verbose ?? true
    this.silent = options.silent ?? false
  }

  onSuiteStart(suite: string): void {
    if (this.silent) return
    this.currentSuite = suite
    console.log(`\n${icons.suite} ${colors.bold}${suite}${colors.reset}\n`)
  }

  onTestStart(test: string): void {
    if (this.silent || !this.verbose) return
    process.stdout.write(`  ${colors.dim}Running: ${test}...${colors.reset}\r`)
  }

  onTestPass(result: TestResult): void {
    if (this.silent) return

    const duration = this.formatDuration(result.duration)
    const retry = result.retries ? ` ${colors.yellow}(retry ${result.retries})${colors.reset}` : ''
    console.log(`  ${icons.pass} ${result.name} ${colors.gray}(${duration})${colors.reset}${retry}`)
  }

  onTestFail(result: TestResult): void {
    if (this.silent) return

    const duration = this.formatDuration(result.duration)
    console.log(
      `  ${icons.fail} ${colors.red}${result.name}${colors.reset} ${colors.gray}(${duration})${colors.reset}`
    )

    if (result.error) {
      console.log(`     ${colors.red}${this.formatError(result.error)}${colors.reset}`)
    }

    if (result.screenshot) {
      console.log(`     ${colors.dim}Screenshot: ${result.screenshot}${colors.reset}`)
    }

    if (result.consoleErrors?.length) {
      console.log(`     ${colors.dim}Console errors:${colors.reset}`)
      for (const err of result.consoleErrors.slice(0, 3)) {
        console.log(`       ${colors.red}${err}${colors.reset}`)
      }
    }
  }

  onTestSkip(name: string): void {
    if (this.silent) return
    console.log(
      `  ${icons.skip} ${colors.yellow}${name}${colors.reset} ${colors.dim}(skipped)${colors.reset}`
    )
  }

  onSuiteEnd(suite: TestSuite): void {
    if (this.silent) return
    // Suite summary is handled in onRunEnd
  }

  async onRunEnd(summary: TestRunSummary): Promise<void> {
    if (this.silent) return

    const { totalPassed, totalFailed, totalSkipped, totalDuration } = summary

    console.log('\n' + '═'.repeat(60))
    console.log(this.formatSummary(totalPassed, totalFailed, totalSkipped))
    console.log(`${icons.time} Duration: ${this.formatDuration(totalDuration)}`)
    console.log('═'.repeat(60))

    // List failed tests
    const failedTests = summary.suites.flatMap(s => s.tests.filter(t => !t.passed))
    if (failedTests.length > 0) {
      console.log(`\n${colors.red}${colors.bold}Failed Tests:${colors.reset}`)
      for (const test of failedTests) {
        console.log(`  ${icons.fail} ${test.name}`)
        if (test.error) {
          console.log(`     ${colors.dim}${this.formatError(test.error)}${colors.reset}`)
        }
      }
    }
  }

  // =============================================================================
  // Formatting Helpers
  // =============================================================================

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  private formatError(error: string): string {
    // Truncate long errors
    const maxLength = 1000
    if (error.length > maxLength) {
      return error.slice(0, maxLength) + '...'
    }
    return error
  }

  private formatSummary(passed: number, failed: number, skipped: number): string {
    const parts: string[] = []

    if (passed > 0) {
      parts.push(`${colors.green}${passed} passed${colors.reset}`)
    }
    if (failed > 0) {
      parts.push(`${colors.red}${failed} failed${colors.reset}`)
    }
    if (skipped > 0) {
      parts.push(`${colors.yellow}${skipped} skipped${colors.reset}`)
    }

    return `Results: ${parts.join(', ')}`
  }
}
