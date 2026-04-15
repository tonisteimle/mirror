/**
 * JUnit XML Reporter
 *
 * Generates JUnit XML format for CI integration.
 * Compatible with GitHub Actions, Jenkins, etc.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Reporter, TestResult, TestSuite, TestRunSummary } from '../types'

// =============================================================================
// JUnit Reporter
// =============================================================================

export class JUnitReporter implements Reporter {
  private outputPath: string

  constructor(outputPath: string) {
    this.outputPath = outputPath
    this.ensureDir()
  }

  onSuiteStart(_suite: string): void {}
  onTestStart(_test: string): void {}
  onTestPass(_result: TestResult): void {}
  onTestFail(_result: TestResult): void {}
  onTestSkip(_name: string): void {}
  onSuiteEnd(_suite: TestSuite): void {}

  async onRunEnd(summary: TestRunSummary): Promise<void> {
    const xml = this.generateXML(summary)
    fs.writeFileSync(this.outputPath, xml, 'utf-8')
  }

  // =============================================================================
  // XML Generation
  // =============================================================================

  private generateXML(summary: TestRunSummary): string {
    const lines: string[] = ['<?xml version="1.0" encoding="UTF-8"?>', '<testsuites>']

    for (const suite of summary.suites) {
      lines.push(this.generateTestSuite(suite))
    }

    lines.push('</testsuites>')
    return lines.join('\n')
  }

  private generateTestSuite(suite: TestSuite): string {
    const failures = suite.tests.filter(t => !t.passed).length
    const skipped = suite.skipped || 0
    const timestamp = suite.timestamp.toISOString()

    const lines: string[] = [
      `  <testsuite name="${this.escape(suite.name)}" tests="${suite.tests.length}" failures="${failures}" skipped="${skipped}" time="${(suite.duration / 1000).toFixed(3)}" timestamp="${timestamp}">`,
    ]

    for (const test of suite.tests) {
      lines.push(this.generateTestCase(test, suite.name))
    }

    lines.push('  </testsuite>')
    return lines.join('\n')
  }

  private generateTestCase(test: TestResult, suiteName: string): string {
    const className = this.escape(suiteName)
    const name = this.escape(test.name)
    const time = (test.duration / 1000).toFixed(3)

    if (test.passed) {
      return `    <testcase classname="${className}" name="${name}" time="${time}" />`
    }

    const lines: string[] = [
      `    <testcase classname="${className}" name="${name}" time="${time}">`,
    ]

    if (test.error) {
      lines.push(`      <failure message="${this.escape(test.error)}">`)
      lines.push(`        ${this.escape(test.error)}`)
      if (test.consoleErrors?.length) {
        lines.push('')
        lines.push('Console errors:')
        for (const err of test.consoleErrors) {
          lines.push(`  ${this.escape(err)}`)
        }
      }
      lines.push('      </failure>')
    }

    if (test.screenshot) {
      lines.push(`      <system-out>Screenshot: ${this.escape(test.screenshot)}</system-out>`)
    }

    lines.push('    </testcase>')
    return lines.join('\n')
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }

  private ensureDir(): void {
    const dir = path.dirname(this.outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}
