/**
 * Test Runner Types
 *
 * Clean, focused type definitions.
 */

// =============================================================================
// Test Results
// =============================================================================

export interface TestResult {
  name: string
  category?: string
  passed: boolean
  duration: number
  error?: string
  retries?: number
  screenshot?: string
  consoleErrors?: string[]
}

export interface TestSuite {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  skipped: number
  duration: number
  timestamp: Date
}

export interface TestRunSummary {
  suites: TestSuite[]
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
  timestamp: Date
}

// =============================================================================
// Configuration
// =============================================================================

export interface TestConfig {
  // Browser
  headless: boolean
  url: string

  // Test selection
  filter?: string | RegExp
  category?: string
  tags?: string[]

  // Behavior
  bail: boolean
  retries: number
  timeout: number

  // Output
  screenshotOnFailure: boolean
  screenshotDir: string
  junitOutput?: string
  htmlOutput?: string

  // Watch mode
  watch: boolean
  watchPaths?: string[]

  // Parallel
  parallel: number

  // Verbosity
  verbose: boolean
  silent: boolean
}

export const defaultConfig: TestConfig = {
  headless: true,
  url: 'http://localhost:5173/studio/',
  bail: false,
  retries: 0,
  timeout: 30000,
  screenshotOnFailure: true,
  screenshotDir: 'test-results/screenshots',
  watch: false,
  parallel: 1,
  verbose: true,
  silent: false,
}

// =============================================================================
// CDP Types
// =============================================================================

export interface CDPSession {
  send: <T = unknown>(method: string, params?: Record<string, unknown>) => Promise<T>
  on: (event: string, handler: (params: unknown) => void) => void
  off: (event: string, handler: (params: unknown) => void) => void
  close: () => void
}

export interface ChromeInstance {
  wsEndpoint: string
  kill: () => void
}

// =============================================================================
// Console Types
// =============================================================================

export interface ConsoleMessage {
  type: 'log' | 'warn' | 'error' | 'info' | 'debug'
  text: string
  timestamp: Date
}

// =============================================================================
// Reporter Types
// =============================================================================

export interface Reporter {
  onSuiteStart(suite: string): void
  onTestStart(test: string): void
  onTestPass(result: TestResult): void
  onTestFail(result: TestResult): void
  onTestSkip(name: string): void
  onSuiteEnd(suite: TestSuite): void
  onRunEnd(summary: TestRunSummary): Promise<void>
}
