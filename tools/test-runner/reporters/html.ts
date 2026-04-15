/**
 * HTML Reporter
 *
 * Generates an interactive HTML report with screenshots.
 */

import * as fs from 'fs'
import * as path from 'path'
import type { Reporter, TestResult, TestSuite, TestRunSummary } from '../types'

// =============================================================================
// HTML Reporter
// =============================================================================

export class HTMLReporter implements Reporter {
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
    const html = this.generateHTML(summary)
    fs.writeFileSync(this.outputPath, html, 'utf-8')
  }

  // =============================================================================
  // HTML Generation
  // =============================================================================

  private generateHTML(summary: TestRunSummary): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - ${summary.timestamp.toISOString()}</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <header>
    <h1>Mirror Studio Test Report</h1>
    <div class="summary">
      ${this.generateSummaryBadges(summary)}
    </div>
    <div class="meta">
      <span>Generated: ${summary.timestamp.toLocaleString()}</span>
      <span>Duration: ${this.formatDuration(summary.totalDuration)}</span>
    </div>
  </header>

  <main>
    ${summary.suites.map(suite => this.generateSuiteHTML(suite)).join('\n')}
  </main>

  <script>${this.getScript()}</script>
</body>
</html>`
  }

  private generateSummaryBadges(summary: TestRunSummary): string {
    return `
      <span class="badge passed">${summary.totalPassed} passed</span>
      <span class="badge failed">${summary.totalFailed} failed</span>
      ${summary.totalSkipped ? `<span class="badge skipped">${summary.totalSkipped} skipped</span>` : ''}
    `
  }

  private generateSuiteHTML(suite: TestSuite): string {
    const status = suite.failed > 0 ? 'failed' : 'passed'
    return `
    <section class="suite ${status}">
      <h2 class="suite-header" onclick="toggleSuite(this)">
        <span class="icon">${suite.failed > 0 ? '❌' : '✅'}</span>
        <span class="name">${this.escape(suite.name)}</span>
        <span class="stats">${suite.passed}/${suite.tests.length}</span>
        <span class="duration">${this.formatDuration(suite.duration)}</span>
      </h2>
      <div class="tests">
        ${suite.tests.map(test => this.generateTestHTML(test)).join('\n')}
      </div>
    </section>`
  }

  private generateTestHTML(test: TestResult): string {
    const status = test.passed ? 'passed' : 'failed'
    return `
      <div class="test ${status}">
        <div class="test-header" onclick="toggleTest(this)">
          <span class="icon">${test.passed ? '✅' : '❌'}</span>
          <span class="name">${this.escape(test.name)}</span>
          <span class="duration">${this.formatDuration(test.duration)}</span>
          ${test.retries ? `<span class="retries">🔄 ${test.retries}</span>` : ''}
        </div>
        ${!test.passed ? this.generateFailureDetails(test) : ''}
      </div>`
  }

  private generateFailureDetails(test: TestResult): string {
    let details = '<div class="details">'

    if (test.error) {
      details += `<pre class="error">${this.escape(test.error)}</pre>`
    }

    if (test.consoleErrors?.length) {
      details += `<div class="console-errors">
        <h4>Console Errors:</h4>
        ${test.consoleErrors.map(e => `<pre>${this.escape(e)}</pre>`).join('')}
      </div>`
    }

    if (test.screenshot) {
      const relativePath = path.relative(path.dirname(this.outputPath), test.screenshot)
      details += `<div class="screenshot">
        <h4>Screenshot:</h4>
        <img src="${relativePath}" alt="Failure screenshot" onclick="openImage(this.src)" />
      </div>`
    }

    details += '</div>'
    return details
  }

  private getStyles(): string {
    return `
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0a0a0a; color: #e0e0e0; }
      header { margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #333; }
      h1 { margin: 0 0 15px 0; color: #fff; }
      .summary { display: flex; gap: 10px; margin-bottom: 10px; }
      .badge { padding: 5px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; }
      .badge.passed { background: #10b981; color: white; }
      .badge.failed { background: #ef4444; color: white; }
      .badge.skipped { background: #f59e0b; color: white; }
      .meta { color: #888; font-size: 14px; display: flex; gap: 20px; }
      .suite { background: #1a1a1a; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
      .suite.failed { border-left: 3px solid #ef4444; }
      .suite.passed { border-left: 3px solid #10b981; }
      .suite-header { display: flex; align-items: center; gap: 10px; padding: 15px; cursor: pointer; margin: 0; font-size: 16px; }
      .suite-header:hover { background: #252525; }
      .suite-header .name { flex: 1; }
      .suite-header .stats { color: #888; }
      .suite-header .duration { color: #666; font-size: 14px; }
      .tests { display: none; padding: 0 15px 15px 15px; }
      .suite.open .tests { display: block; }
      .test { padding: 10px; border-radius: 6px; margin-bottom: 8px; background: #252525; }
      .test.failed { background: #2a1a1a; }
      .test-header { display: flex; align-items: center; gap: 8px; cursor: pointer; }
      .test-header .name { flex: 1; }
      .test-header .duration { color: #666; font-size: 13px; }
      .test-header .retries { color: #f59e0b; font-size: 13px; }
      .details { margin-top: 10px; padding-top: 10px; border-top: 1px solid #333; display: none; }
      .test.open .details { display: block; }
      .error { background: #1a0a0a; padding: 10px; border-radius: 4px; color: #ef4444; overflow-x: auto; font-size: 13px; white-space: pre-wrap; }
      .console-errors pre { background: #1a1a0a; padding: 8px; border-radius: 4px; color: #f59e0b; font-size: 12px; margin: 5px 0; }
      .screenshot img { max-width: 100%; border-radius: 4px; cursor: pointer; margin-top: 10px; }
      h4 { margin: 10px 0 5px 0; color: #888; font-size: 13px; }
    `
  }

  private getScript(): string {
    return `
      function toggleSuite(header) {
        header.parentElement.classList.toggle('open');
      }
      function toggleTest(header) {
        header.parentElement.classList.toggle('open');
      }
      function openImage(src) {
        window.open(src, '_blank');
      }
      // Auto-expand failed suites
      document.querySelectorAll('.suite.failed').forEach(s => s.classList.add('open'));
      document.querySelectorAll('.test.failed').forEach(t => t.classList.add('open'));
    `
  }

  private formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  private escape(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  private ensureDir(): void {
    const dir = path.dirname(this.outputPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }
}
