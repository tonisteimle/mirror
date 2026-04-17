/**
 * Image-to-Mirror Test Runner
 *
 * Orchestrates the roundtrip test:
 * Mirror Code → Render → PNG → Analyze → Generate → Compare
 */

import type { TestCase, TestResult, TestSuiteSummary, TestConfig, ImageAnalyzer } from './types'
import { defaultConfig, StubAnalyzer } from './types'
import { MirrorRenderer } from './renderer'
import { MirrorComparator } from './comparator'
import { launchChrome } from '../test-runner/chrome'
import { connectCDP, getPageTarget } from '../test-runner/cdp'
import type { CDPSession } from '../test-runner/types'

// =============================================================================
// Test Runner
// =============================================================================

export class ImageToMirrorTestRunner {
  private config: TestConfig
  private analyzer: ImageAnalyzer
  private comparator: MirrorComparator
  private cdp: CDPSession | null = null
  private chrome: { kill: () => void; wsEndpoint: string } | null = null
  private renderer: MirrorRenderer | null = null

  constructor(config: Partial<TestConfig> = {}, analyzer?: ImageAnalyzer) {
    this.config = { ...defaultConfig, ...config }
    this.analyzer = analyzer || new StubAnalyzer()
    this.comparator = new MirrorComparator(this.config.passThreshold)
  }

  /**
   * Initialize browser
   */
  async start(): Promise<void> {
    this.log('Starting Chrome...')
    this.chrome = await launchChrome({ headless: this.config.headless })

    const port = new URL(this.chrome.wsEndpoint).port
    const pageWsUrl = await getPageTarget(parseInt(port))

    this.log('Connecting to CDP...')
    this.cdp = await connectCDP(pageWsUrl)

    // Enable required domains
    await this.cdp.send('Runtime.enable')
    await this.cdp.send('Page.enable')
    await this.cdp.send('Console.enable')

    // Log console messages for debugging
    this.cdp.on('Console.messageAdded', (params: any) => {
      if (this.config.verbose) {
        console.log(`  [console.${params.message.level}] ${params.message.text}`)
      }
    })

    this.cdp.on('Runtime.exceptionThrown', (params: any) => {
      console.log(`  [ERROR] ${params.exceptionDetails.text}`)
      if (params.exceptionDetails.exception?.description) {
        console.log(`          ${params.exceptionDetails.exception.description}`)
      }
    })

    // Set viewport
    await this.cdp.send('Emulation.setDeviceMetricsOverride', {
      width: this.config.viewportWidth,
      height: this.config.viewportHeight,
      deviceScaleFactor: 1,
      mobile: false,
    })

    this.renderer = new MirrorRenderer(this.cdp, this.config)
    this.log('Browser ready')
  }

  /**
   * Run a single test case
   */
  async runTest(testCase: TestCase): Promise<TestResult> {
    if (!this.renderer || !this.cdp) {
      throw new Error('Runner not started. Call start() first.')
    }

    const startTime = Date.now()
    this.log(`Running: ${testCase.name}`)

    try {
      // Step 1: Render Mirror code to PNG
      this.log('  Rendering to PNG...')
      const image = await this.renderer.render(testCase.sourceCode, testCase.id)
      this.log(`  Screenshot: ${image.width}x${image.height}`)

      // Step 2: Analyze image (stub for now)
      this.log('  Analyzing image...')
      const analysis = await this.analyzer.analyze(image)
      this.log(`  Analyzer: ${this.analyzer.name} v${this.analyzer.version}`)

      // Step 3: Compare codes
      this.log('  Comparing codes...')
      const comparison = await this.comparator.compare(testCase.sourceCode, analysis.generatedCode)

      const duration = Date.now() - startTime
      const passed = comparison.passed

      if (passed) {
        this.log(`  ✅ PASSED (${comparison.score.toFixed(2)}) [${duration}ms]`)
      } else {
        this.log(`  ❌ FAILED (${comparison.score.toFixed(2)}) [${duration}ms]`)
      }

      return {
        testCase,
        passed,
        image,
        analysis,
        comparison,
        duration,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.log(`  ❌ ERROR: ${error}`)

      return {
        testCase,
        passed: false,
        image: {
          base64: '',
          buffer: Buffer.alloc(0),
          width: 0,
          height: 0,
        },
        analysis: null,
        comparison: null,
        duration,
        error: String(error),
      }
    }
  }

  /**
   * Run multiple test cases
   */
  async runTests(testCases: TestCase[]): Promise<TestSuiteSummary> {
    const startTime = Date.now()
    const results: TestResult[] = []

    this.log(`\n🧪 Running ${testCases.length} tests...\n`)

    for (const testCase of testCases) {
      const result = await this.runTest(testCase)
      results.push(result)
    }

    const summary: TestSuiteSummary = {
      total: testCases.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed && !r.error).length,
      skipped: 0,
      duration: Date.now() - startTime,
      results,
      timestamp: new Date(),
    }

    this.printSummary(summary)
    return summary
  }

  /**
   * Run tests with filtering
   */
  async runTestsWithFilter(
    testCases: TestCase[],
    filter: { tags?: string[]; pattern?: string }
  ): Promise<TestSuiteSummary> {
    let filtered = testCases

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(tc => tc.tags?.some(tag => filter.tags!.includes(tag)))
    }

    if (filter.pattern) {
      const regex = new RegExp(filter.pattern, 'i')
      filtered = filtered.filter(tc => regex.test(tc.name) || regex.test(tc.id))
    }

    return this.runTests(filtered)
  }

  /**
   * Stop browser
   */
  async stop(): Promise<void> {
    this.log('Stopping Chrome...')
    this.cdp?.close()
    this.chrome?.kill()
  }

  /**
   * Set a custom analyzer
   */
  setAnalyzer(analyzer: ImageAnalyzer): void {
    this.analyzer = analyzer
  }

  // =============================================================================
  // Helpers
  // =============================================================================

  private printSummary(summary: TestSuiteSummary): void {
    console.log('\n' + '='.repeat(50))
    console.log('TEST SUMMARY')
    console.log('='.repeat(50))
    console.log(`Total:   ${summary.total}`)
    console.log(`Passed:  ${summary.passed} ✅`)
    console.log(`Failed:  ${summary.failed} ❌`)
    console.log(`Skipped: ${summary.skipped} ⏭️`)
    console.log(`Duration: ${summary.duration}ms`)
    console.log('='.repeat(50))

    // Show failed tests
    const failed = summary.results.filter(r => !r.passed)
    if (failed.length > 0) {
      console.log('\nFailed Tests:')
      for (const result of failed) {
        console.log(`  - ${result.testCase.name}`)
        if (result.error) {
          console.log(`    Error: ${result.error}`)
        } else if (result.comparison) {
          console.log(`    Score: ${result.comparison.score.toFixed(2)}`)
        }
      }
    }
  }

  private log(message: string): void {
    if (this.config.verbose) {
      console.log(message)
    }
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a test case
 */
export function createTestCase(
  id: string,
  name: string,
  sourceCode: string,
  options: { description?: string; tags?: string[] } = {}
): TestCase {
  return {
    id,
    name,
    sourceCode,
    description: options.description,
    tags: options.tags,
  }
}

/**
 * Quick test runner for single code snippet
 */
export async function quickTest(
  mirrorCode: string,
  options: { headed?: boolean; analyzer?: ImageAnalyzer } = {}
): Promise<TestResult> {
  const runner = new ImageToMirrorTestRunner(
    { headless: !options.headed, verbose: true },
    options.analyzer
  )

  try {
    await runner.start()
    const testCase = createTestCase('quick-test', 'Quick Test', mirrorCode)
    return await runner.runTest(testCase)
  } finally {
    await runner.stop()
  }
}
