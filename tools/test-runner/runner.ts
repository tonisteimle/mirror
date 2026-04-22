/**
 * Test Runner
 *
 * Orchestrates test execution with proper separation of concerns.
 */

import type {
  TestConfig,
  TestResult,
  TestSuite,
  TestRunSummary,
  CDPSession,
  Reporter,
} from './types'
import { defaultConfig } from './types'
import { launchChrome } from './chrome'
import { connectCDP, getPageTarget } from './cdp'
import { ConsoleCollector } from './console-collector'
import { ScreenshotCapture } from './screenshot'
import { FileExplorer } from './file-explorer'
import { parseProgressMessage, type ProgressUpdate } from './reporters/progress'

// =============================================================================
// Test Runner
// =============================================================================

export class TestRunner {
  private config: TestConfig
  private cdp: CDPSession | null = null
  private chrome: { kill: () => void } | null = null
  private console: ConsoleCollector
  private screenshot: ScreenshotCapture | null = null
  private reporters: Reporter[] = []
  private progressCallback: ((update: ProgressUpdate) => void) | null = null

  constructor(config: Partial<TestConfig> = {}) {
    this.config = { ...defaultConfig, ...config }
    this.console = new ConsoleCollector()
  }

  /**
   * Set a callback to receive progress updates from browser tests
   */
  onProgress(callback: (update: ProgressUpdate) => void): this {
    this.progressCallback = callback
    return this
  }

  /**
   * Add a reporter
   */
  addReporter(reporter: Reporter): this {
    this.reporters.push(reporter)
    return this
  }

  /**
   * Initialize browser and CDP connection
   */
  async start(): Promise<void> {
    this.log('Starting Chrome...')
    this.chrome = await launchChrome({ headless: this.config.headless })

    const port = new URL(this.chrome.wsEndpoint).port
    const pageWsUrl = await getPageTarget(parseInt(port))

    this.log('Connecting to CDP...')
    this.cdp = await connectCDP(pageWsUrl)

    await this.enableCDPDomains()
    this.console.attach(this.cdp)

    // Forward browser console to Node console for debugging
    // Handle progress updates and errors
    // Use Set to deduplicate messages (they come from two CDP events)
    const seenMessages = new Set<string>()
    this.console.onMessage(msg => {
      // Deduplicate messages
      const msgKey = `${msg.type}:${msg.text}`
      if (seenMessages.has(msgKey)) return
      seenMessages.add(msgKey)
      // Clear old messages after 1000 to prevent memory leak
      if (seenMessages.size > 1000) seenMessages.clear()

      // Check for progress updates
      const progressUpdate = parseProgressMessage(msg.text)
      if (progressUpdate && this.progressCallback) {
        this.progressCallback(progressUpdate)
        return
      }

      if (msg.type === 'error') {
        console.log(`[Browser] ${msg.text}`)
      }
    })

    if (this.config.screenshotOnFailure) {
      this.screenshot = new ScreenshotCapture(this.cdp, this.config.screenshotDir)
    }

    this.log('Browser ready')
  }

  /**
   * Navigate to URL and wait for page load
   */
  async navigate(url: string): Promise<void> {
    if (!this.cdp) throw new Error('Not started')

    this.log(`Loading ${url}...`)
    await this.cdp.send('Page.navigate', { url })
    await this.waitForPageLoad()
    await this.sleep(1000) // Extra wait for JS init
    this.log('Page loaded')
  }

  /**
   * Execute JavaScript in the browser
   */
  async evaluate<T>(expression: string): Promise<T> {
    if (!this.cdp) throw new Error('Not started')

    const result = await this.cdp.send<{
      result: { value: T }
      exceptionDetails?: { text: string }
    }>('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    })

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text)
    }

    return result.result.value
  }

  /**
   * Take a screenshot and save to file
   */
  async takeScreenshot(filename: string): Promise<string> {
    if (!this.cdp) throw new Error('Not started')

    // Initialize screenshot capture if needed
    if (!this.screenshot) {
      this.screenshot = new ScreenshotCapture(this.cdp, this.config.screenshotDir)
    }

    return this.screenshot.capturePage(filename)
  }

  /**
   * Wait for test API to be available
   */
  async waitForTestAPI(timeout = 10000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const hasAPI = await this.evaluate<boolean>(`typeof window.__dragTest !== 'undefined'`)
      if (hasAPI) return true
      await this.sleep(200)
    }
    return false
  }

  /**
   * Wait for test suites to be loaded
   */
  async waitForTestSuites(timeout = 15000): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      const hasSuites = await this.evaluate<boolean>(`
        (function() {
          const s = window.__mirrorTestSuites;
          return s && s.tests && Object.keys(s.tests).length > 0;
        })()
      `)
      if (hasSuites) return true
      await this.sleep(200)
    }
    return false
  }

  /**
   * Run a test suite from the browser
   */
  async runBrowserSuite(suiteCommand: string, suiteName: string): Promise<TestSuite> {
    this.notifyReporters('onSuiteStart', suiteName)

    const suite: TestSuite = {
      name: suiteName,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      timestamp: new Date(),
    }

    const startTime = Date.now()

    try {
      const result = await this.evaluate<{
        passed: number
        failed: number
        results: Array<{
          name: string
          passed: boolean
          duration: number
          error?: string
        }>
      }>(suiteCommand)

      for (const test of result.results || []) {
        const testResult = await this.processTestResult(test)
        suite.tests.push(testResult)

        if (testResult.passed) {
          suite.passed++
          this.notifyReporters('onTestPass', testResult)
        } else {
          suite.failed++
          this.notifyReporters('onTestFail', testResult)
        }
      }
    } catch (err) {
      const testResult: TestResult = {
        name: 'Suite Execution',
        passed: false,
        duration: Date.now() - startTime,
        error: String(err),
      }
      suite.tests.push(testResult)
      suite.failed++
      this.notifyReporters('onTestFail', testResult)
    }

    suite.duration = Date.now() - startTime
    this.notifyReporters('onSuiteEnd', suite)
    return suite
  }

  /**
   * Run a single test with retry support
   */
  async runSingleTest(
    testExpression: string,
    testName: string,
    verify?: (code: string) => boolean
  ): Promise<TestResult> {
    let lastError: string | undefined
    let retries = 0

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      this.console.clear()
      const startTime = Date.now()

      try {
        this.notifyReporters('onTestStart', testName)

        const result = await this.evaluate<{
          success: boolean
          error?: string
        }>(testExpression)

        // Additional verification if provided
        if (verify && result.success) {
          const code = await this.evaluate<string>(`__dragTest.getCode()`)
          if (!verify(code)) {
            result.success = false
            result.error = 'Verification failed'
          }
        }

        if (result.success) {
          return {
            name: testName,
            passed: true,
            duration: Date.now() - startTime,
            retries: attempt > 0 ? attempt : undefined,
          }
        }

        lastError = result.error
      } catch (err) {
        lastError = String(err)
      }

      retries = attempt
      if (attempt < this.config.retries) {
        this.log(`  Retrying ${testName} (attempt ${attempt + 2}/${this.config.retries + 1})`)
        await this.sleep(500)
      }
    }

    // Test failed after all retries
    const result: TestResult = {
      name: testName,
      passed: false,
      duration: 0,
      error: lastError,
      retries: retries > 0 ? retries : undefined,
      consoleErrors: this.console.getErrors().map(e => e.text),
    }

    // Capture screenshot on failure
    if (this.screenshot && this.config.screenshotOnFailure) {
      try {
        result.screenshot = await this.screenshot.captureFailure(testName)
      } catch {
        // Ignore screenshot errors
      }
    }

    return result
  }

  /**
   * Run Mirror test suite
   */
  async runMirrorTests(category?: string, filter?: string | RegExp): Promise<TestSuite> {
    // If filter is provided, use __mirrorTest.filter()
    if (filter) {
      const filterPattern = typeof filter === 'string' ? filter : filter.source
      const escapedPattern = filterPattern.replace(/'/g, "\\'")
      const suiteName = `Mirror Tests (filter: ${filterPattern})`
      const command = `__mirrorTest.filter('${escapedPattern}')`
      return this.runBrowserSuite(command, suiteName)
    }

    const suiteName = category ? `Mirror Tests (${category})` : 'Mirror Tests'
    const command = category
      ? `__mirrorTestSuites.runCategory('${category}')`
      : `__mirrorTestSuites.runAll()`

    return this.runBrowserSuite(command, suiteName)
  }

  /**
   * Run a single test by exact name
   */
  async runSingleTestByName(testName: string): Promise<TestSuite> {
    const suiteName = `Single Test: ${testName}`
    // Escape quotes in test name for JavaScript
    const escapedName = testName.replace(/'/g, "\\'").replace(/"/g, '\\"')
    const command = `__mirrorTestSuites.runSingleTest('${escapedName}')`

    return this.runBrowserSuite(command, suiteName)
  }

  /**
   * Get available test categories with counts
   */
  async getCategories(): Promise<{ name: string; count: number }[]> {
    if (!this.cdp) throw new Error('Not started')

    const result = await this.evaluate<{ name: string; count: number }[]>(`
      (() => {
        const counts = window.__mirrorTestSuites?.testCounts;
        if (!counts) return [];
        return Object.entries(counts)
          .filter(([name]) => name !== 'total')
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => a.name.localeCompare(b.name));
      })()
    `)

    return result || []
  }

  /**
   * Get total test count across all categories
   */
  async getTotalTestCount(): Promise<number> {
    if (!this.cdp) throw new Error('Not started')

    const result = await this.evaluate<number>(`
      (() => {
        return window.__mirrorTestSuites?.testCounts?.total || 0;
      })()
    `)

    return result || 0
  }

  /**
   * Get a FileExplorer for inspecting project files
   */
  getFileExplorer(): FileExplorer {
    if (!this.cdp) throw new Error('Not started')
    return new FileExplorer(this.cdp)
  }

  /**
   * Stop browser and cleanup
   */
  async stop(): Promise<void> {
    this.log('Stopping Chrome...')
    this.cdp?.close()
    this.chrome?.kill()
  }

  /**
   * Finalize and generate reports
   */
  async finalize(suites: TestSuite[]): Promise<TestRunSummary> {
    const summary: TestRunSummary = {
      suites,
      totalPassed: suites.reduce((sum, s) => sum + s.passed, 0),
      totalFailed: suites.reduce((sum, s) => sum + s.failed, 0),
      totalSkipped: suites.reduce((sum, s) => sum + s.skipped, 0),
      totalDuration: suites.reduce((sum, s) => sum + s.duration, 0),
      timestamp: new Date(),
    }

    for (const reporter of this.reporters) {
      await reporter.onRunEnd(summary)
    }

    return summary
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async enableCDPDomains(): Promise<void> {
    if (!this.cdp) return
    await this.cdp.send('Runtime.enable')
    await this.cdp.send('Page.enable')
    await this.cdp.send('Console.enable')
  }

  private async waitForPageLoad(): Promise<void> {
    return new Promise(resolve => {
      this.cdp!.on('Page.loadEventFired', () => resolve())
    })
  }

  private async processTestResult(test: {
    name: string
    passed: boolean
    duration: number
    error?: string
  }): Promise<TestResult> {
    const result: TestResult = {
      name: test.name,
      passed: test.passed,
      duration: test.duration,
      error: test.error,
    }

    if (!test.passed) {
      result.consoleErrors = this.console.getErrors().map(e => e.text)

      if (this.screenshot && this.config.screenshotOnFailure) {
        try {
          result.screenshot = await this.screenshot.captureFailure(test.name)
        } catch {
          // Ignore screenshot errors
        }
      }
    }

    return result
  }

  private notifyReporters(method: keyof Reporter, ...args: unknown[]): void {
    for (const reporter of this.reporters) {
      const fn = reporter[method] as (...args: unknown[]) => void
      fn.apply(reporter, args)
    }
  }

  private log(message: string): void {
    if (!this.config.silent) {
      console.log(`🔧 ${message}`)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
