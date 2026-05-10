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
  /** Optional viewport override "WxH" (e.g. "1280x800"). */
  windowSize?: string

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

  /**
   * When true, install the OS-mouse bridge so step-runner scenarios with
   * `inputMode: 'os'` drive the real macOS cursor via nut-js. Requires
   * Accessibility permission for the node process; visibly moves the
   * cursor. Off by default — opt in with --os-mouse on the CLI.
   */
  osMouse?: boolean

  /**
   * When set, install the snapshot bridge so step-runner scenarios can
   * capture viewport screenshots and pixel-diff against a baseline.
   * Provide `dir` (where this run's PNGs land) and optionally
   * `baselineDir` (golden snapshots to compare against) and `threshold`
   * (pixelmatch 0..1, default 0.1). Off by default — opt in with
   * --snapshots=DIR [--baseline=DIR] [--snapshot-threshold=N] on the CLI.
   */
  snapshots?: { dir: string; baselineDir?: string; threshold?: number }

  /**
   * Multiply effective CPU time by this rate via Emulation.setCPUThrottlingRate.
   * 1 = no throttle (default), 4 = 4× slower (mid-range mobile), 6 = 6×
   * slower (low-end mobile). Surfaces timing-sensitive bugs (debounce
   * misuse, animation flicker, race conditions) that pass on a fast dev
   * machine. Off by default — opt in with --cpu-throttle=N.
   */
  cpuThrottle?: number

  /**
   * Network emulation profile. 'offline' / 'slow-3g' / 'fast-3g' / '4g'
   * map to canonical CDP Network.emulateNetworkConditions presets.
   * Useful for catching auto-save / debounced-fetch timeouts that
   * never happen on localhost. Off by default — opt in with
   * --network=PROFILE.
   */
  networkThrottle?: 'offline' | 'slow-3g' | 'fast-3g' | '4g'
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
