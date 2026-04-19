/**
 * Progress Reporter
 *
 * Shows a live progress bar with test counts during test execution.
 * Updates in real-time as tests complete via [TEST_PROGRESS] messages.
 * Optionally writes results to a log file.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Reporter, TestResult, TestSuite, TestRunSummary } from '../types'

// =============================================================================
// ANSI Codes
// =============================================================================

const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  clearLine: '\x1b[2K',
  cursorUp: '\x1b[1A',
  cursorStart: '\r',
  hideCursor: '\x1b[?25l',
  showCursor: '\x1b[?25h',
}

// =============================================================================
// Progress Message Parser
// =============================================================================

export interface ProgressUpdate {
  total: number
  completed: number
  passed: number
  failed: number
  testName?: string
}

/**
 * Parse a [TEST_PROGRESS] message from the browser
 */
export function parseProgressMessage(text: string): ProgressUpdate | null {
  if (!text.startsWith('[TEST_PROGRESS]')) return null

  const match = text.match(
    /total:(\d+)\s+completed:(\d+)\s+passed:(\d+)\s+failed:(\d+)(?:\s+test:(.+))?/
  )

  if (!match) return null

  return {
    total: parseInt(match[1], 10),
    completed: parseInt(match[2], 10),
    passed: parseInt(match[3], 10),
    failed: parseInt(match[4], 10),
    testName: match[5],
  }
}

// =============================================================================
// Progress Reporter
// =============================================================================

export class ProgressReporter implements Reporter {
  // Current suite progress
  private suiteTotal: number = 0
  private suiteCompleted: number = 0
  private suitePassed: number = 0
  private suiteFailed: number = 0

  // Global progress (across all suites)
  private globalTotal: number = 0
  private globalCompleted: number = 0
  private globalPassed: number = 0
  private globalFailed: number = 0

  private currentTest: string = ''
  private startTime: number = 0
  private barWidth: number = 30
  private lastLineCount: number = 0
  private failedTests: TestResult[] = []
  private isRendering: boolean = false
  private logFile: string | null = null
  private suiteName: string = ''
  private suiteCount: number = 0
  private currentSuiteIndex: number = 0

  constructor(options: { totalTests?: number; barWidth?: number; logFile?: string } = {}) {
    this.globalTotal = options.totalTests ?? 0
    this.barWidth = options.barWidth ?? 30
    this.logFile = options.logFile ?? null
  }

  /**
   * Set the total number of tests across all suites
   */
  setTotalTests(total: number, suiteCount: number = 1): void {
    this.globalTotal = total
    this.suiteCount = suiteCount
  }

  /**
   * Handle a progress update from the browser console
   */
  handleProgressUpdate(update: ProgressUpdate): void {
    // Calculate delta from last update
    const passedDelta = update.passed - this.suitePassed
    const failedDelta = update.failed - this.suiteFailed
    const completedDelta = update.completed - this.suiteCompleted

    // Update suite progress
    this.suiteTotal = update.total
    this.suiteCompleted = update.completed
    this.suitePassed = update.passed
    this.suiteFailed = update.failed

    // Update global progress
    this.globalCompleted += completedDelta
    this.globalPassed += passedDelta
    this.globalFailed += failedDelta

    // If we don't have a global total yet, use the suite total
    if (this.globalTotal === 0) {
      this.globalTotal = update.total
    }

    this.currentTest = update.testName || ''
    this.render()
  }

  onSuiteStart(suite: string): void {
    // Only set start time on first suite
    if (this.currentSuiteIndex === 0) {
      this.startTime = Date.now()
    }
    this.currentSuiteIndex++

    // Reset suite-level counters
    this.suiteTotal = 0
    this.suiteCompleted = 0
    this.suitePassed = 0
    this.suiteFailed = 0

    this.isRendering = true
    this.suiteName = suite

    // Hide cursor during progress
    process.stdout.write(ansi.hideCursor)

    // Show suite header with suite number if multiple suites
    const suiteHeader =
      this.suiteCount > 1 ? `${suite} [${this.currentSuiteIndex}/${this.suiteCount}]` : suite
    console.log(`\n${ansi.bold}🧪 ${suiteHeader}${ansi.reset}`)
    console.log('')
    this.render()
  }

  onTestStart(test: string): void {
    this.currentTest = test
    this.render()
  }

  onTestPass(result: TestResult): void {
    // Progress is now handled via handleProgressUpdate
    // But we still track failed tests for the summary
  }

  onTestFail(result: TestResult): void {
    // Track failed tests for the summary
    this.failedTests.push(result)
  }

  onTestSkip(name: string): void {
    // Don't count skipped tests in progress
  }

  onSuiteEnd(suite: TestSuite): void {
    // Final render
    this.render(true)
    this.isRendering = false

    // Show cursor again
    process.stdout.write(ansi.showCursor)
  }

  async onRunEnd(summary: TestRunSummary): Promise<void> {
    const duration = this.formatDuration(summary.totalDuration)

    // Clear progress and show final summary
    if (this.isRendering) {
      this.clearProgress()
    }

    console.log('')
    console.log('═'.repeat(60))
    console.log(this.formatSummary(summary.totalPassed, summary.totalFailed, summary.totalSkipped))
    console.log(`⏱️  Duration: ${duration}`)
    console.log('═'.repeat(60))

    // Show failed tests
    const allFailedTests = summary.suites.flatMap(s => s.tests.filter(t => !t.passed))
    if (allFailedTests.length > 0) {
      console.log('')
      console.log(`${ansi.red}${ansi.bold}Failed Tests:${ansi.reset}`)
      for (const test of allFailedTests) {
        console.log(`  ❌ ${test.name}`)
        if (test.error) {
          const shortError = test.error.length > 100 ? test.error.slice(0, 100) + '...' : test.error
          console.log(`     ${ansi.dim}${shortError}${ansi.reset}`)
        }
      }
    }

    console.log('')

    // Write results to log file
    if (this.logFile) {
      await this.writeLogFile(summary, allFailedTests)
    }
  }

  /**
   * Write test results to a log file
   */
  private async writeLogFile(summary: TestRunSummary, failedTests: TestResult[]): Promise<void> {
    const timestamp = new Date().toISOString()
    const duration = this.formatDuration(summary.totalDuration)

    const lines: string[] = [
      '═'.repeat(70),
      `Test Run: ${timestamp}`,
      '═'.repeat(70),
      '',
      `Suite: ${this.suiteName}`,
      `Duration: ${duration}`,
      '',
      `Results: ${summary.totalPassed} passed, ${summary.totalFailed} failed, ${summary.totalSkipped} skipped`,
      '',
    ]

    // List all tests with status
    lines.push('─'.repeat(70))
    lines.push('All Tests:')
    lines.push('─'.repeat(70))

    for (const suite of summary.suites) {
      for (const test of suite.tests) {
        const status = test.passed ? '✓' : '✗'
        const time = `${Math.round(test.duration)}ms`
        lines.push(`  ${status} ${test.name} (${time})`)
      }
    }

    // List failed tests with details
    if (failedTests.length > 0) {
      lines.push('')
      lines.push('─'.repeat(70))
      lines.push('Failed Tests (Details):')
      lines.push('─'.repeat(70))

      for (const test of failedTests) {
        lines.push('')
        lines.push(`  ✗ ${test.name}`)
        if (test.error) {
          lines.push(`    Error: ${test.error}`)
        }
        if (test.consoleErrors && test.consoleErrors.length > 0) {
          lines.push('    Console Errors:')
          for (const err of test.consoleErrors) {
            lines.push(`      - ${err}`)
          }
        }
        if (test.screenshot) {
          lines.push(`    Screenshot: ${test.screenshot}`)
        }
      }
    }

    lines.push('')
    lines.push('═'.repeat(70))
    lines.push('')

    // Ensure directory exists
    const dir = path.dirname(this.logFile!)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Append to file (or create new)
    fs.appendFileSync(this.logFile!, lines.join('\n'))

    console.log(`📄 Results logged to: ${this.logFile}`)
  }

  // =============================================================================
  // Rendering
  // =============================================================================

  private render(final: boolean = false): void {
    this.clearProgress()

    const elapsed = Date.now() - this.startTime

    // Use global progress if we have multiple suites, otherwise suite progress
    const showGlobal = this.suiteCount > 1 && this.globalTotal > 0
    const total = showGlobal ? this.globalTotal : this.suiteTotal
    const completed = showGlobal ? this.globalCompleted : this.suiteCompleted
    const passed = showGlobal ? this.globalPassed : this.suitePassed
    const failed = showGlobal ? this.globalFailed : this.suiteFailed

    const progress = total > 0 ? completed / total : 0
    const percent = Math.round(progress * 100)

    // Progress bar
    const filledWidth = Math.round(progress * this.barWidth)
    const emptyWidth = this.barWidth - filledWidth
    const bar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth)

    // Color the bar based on failed count
    const barColor = failed > 0 ? ansi.yellow : ansi.green

    // Stats line
    const stats = [
      `${ansi.green}${passed} passed${ansi.reset}`,
      failed > 0 ? `${ansi.red}${failed} failed${ansi.reset}` : null,
    ]
      .filter(Boolean)
      .join(', ')

    // Time elapsed
    const time = this.formatDuration(elapsed)

    // Remaining time calculation (only show after some tests completed for accuracy)
    let remainingStr = ''
    if (completed >= 3 && completed < total && !final) {
      const avgTimePerTest = elapsed / completed
      const remainingTests = total - completed
      const remainingTime = avgTimePerTest * remainingTests
      remainingStr = `  ${ansi.cyan}~${this.formatDuration(remainingTime)} remaining${ansi.reset}`
    }

    // Current test (truncated)
    let currentLine = ''
    if (this.currentTest && !final) {
      const maxLen = 50
      const testName =
        this.currentTest.length > maxLen
          ? this.currentTest.slice(0, maxLen - 3) + '...'
          : this.currentTest
      currentLine = `${ansi.dim}Running: ${testName}${ansi.reset}`
    }

    // Output
    const lines: string[] = []

    // Show global progress bar with remaining time
    lines.push(
      `  ${barColor}${bar}${ansi.reset} ${percent}%  ${ansi.dim}(${completed}/${total})${ansi.reset}${remainingStr}`
    )
    lines.push(`  ${stats}  ${ansi.dim}${time}${ansi.reset}`)

    // If showing global progress, also show current suite progress
    if (showGlobal && this.suiteTotal > 0) {
      const suiteProgress = this.suiteTotal > 0 ? this.suiteCompleted / this.suiteTotal : 0
      const suitePercent = Math.round(suiteProgress * 100)
      lines.push(
        `  ${ansi.dim}Suite: ${this.suiteCompleted}/${this.suiteTotal} (${suitePercent}%)${ansi.reset}`
      )
    }

    if (currentLine) {
      lines.push(`  ${currentLine}`)
    }

    for (const line of lines) {
      console.log(line)
    }

    this.lastLineCount = lines.length
  }

  private clearProgress(): void {
    for (let i = 0; i < this.lastLineCount; i++) {
      process.stdout.write(ansi.cursorUp + ansi.clearLine)
    }
    process.stdout.write(ansi.cursorStart)
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.round((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  private formatSummary(passed: number, failed: number, skipped: number): string {
    const parts: string[] = []

    if (passed > 0) {
      parts.push(`${ansi.green}${passed} passed${ansi.reset}`)
    }
    if (failed > 0) {
      parts.push(`${ansi.red}${failed} failed${ansi.reset}`)
    }
    if (skipped > 0) {
      parts.push(`${ansi.yellow}${skipped} skipped${ansi.reset}`)
    }

    return `Results: ${parts.join(', ')}`
  }
}
