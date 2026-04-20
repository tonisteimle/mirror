/**
 * Studio Test API
 *
 * Comprehensive testing framework for Mirror Studio.
 * Provides:
 * - Event-based waiting for picker/trigger state changes
 * - DOM inspection and assertions
 * - User interaction simulation
 * - Test execution framework
 *
 * Usage in browser console:
 *   __mirrorTest.inspect('node-1')
 *   __mirrorTest.expect('node-1').hasText('Hello')
 *   __mirrorTest.run(tests)
 */

import { events, type StudioEvents } from '../core/events'
import { getTriggerManager } from '../editor/trigger-manager'
import { createLogger } from '../../compiler/utils/logger'
import { PreviewInspector } from './inspector'
import { Assertions, AssertionCollector, ElementAssert } from './assertions'
import { Interactions, enableHoverSimulation } from './interactions'
import { TestRunner, test, testWithSetup, testOnly, testSkip, describe } from './test-runner'
import {
  layoutAssertions,
  getLayoutInfo,
  assertDirection,
  assertSize,
  assertAlignment,
  assertGap,
  assertLayout,
  // New pixel-accurate assertions
  assertActualGap,
  assertFillsSpace,
  assertRelativePosition,
  assertExactSize,
  assertCentered,
  type LayoutInfo,
  type LayoutExpectation,
  type AssertionResult,
  type Direction,
  type Alignment,
} from './layout-assertions'
import {
  DOMBridge,
  createDOMBridge,
  type DOMExpectation,
  type TreeExpectation,
  type VerifyResult,
} from './dom-bridge'
import { createFixturesAPI, type Fixture, type FixturesAPI } from './fixtures'
import { createStudioAPI } from './studio-api'
import { createSnappingAPI, setupSnappingAPI, type SnappingAPI } from './snapping-api'
import type { TestCase, TestSuiteResult, ElementInfo } from './types'

const log = createLogger('TestAPI')

// Re-export for external use
export * from './types'
export { PreviewInspector } from './inspector'
export { Assertions, AssertionCollector, ElementAssert } from './assertions'
export { Interactions } from './interactions'
export { TestRunner, test, testWithSetup, testOnly, testSkip, describe } from './test-runner'
export {
  layoutAssertions,
  getLayoutInfo,
  assertDirection,
  assertSize,
  assertAlignment,
  assertGap,
  assertLayout,
  // New pixel-accurate assertions
  assertActualGap,
  assertFillsSpace,
  assertRelativePosition,
  assertExactSize,
  assertCentered,
  type LayoutInfo,
  type LayoutExpectation,
  type AssertionResult as LayoutAssertionResult,
  type Direction,
  type Alignment,
} from './layout-assertions'
export {
  DOMBridge,
  createDOMBridge,
  type DOMExpectation,
  type TreeExpectation,
  type VerifyResult,
} from './dom-bridge'
export { PanelAPIImpl, createPanelAPI } from './panel-api'
export { ZagAPIImpl, createZagAPI } from './zag-api'
export { StudioAPIImpl, createStudioAPI } from './studio-api'
export {
  FixturesAPIImpl,
  createFixturesAPI,
  getFixtures,
  type Fixture,
  type FixtureSpec,
  type FixturesAPI,
} from './fixtures'
export {
  createSnappingAPI,
  getSnappingAPI,
  setupSnappingAPI,
  type SnappingAPI,
} from './snapping-api'

export interface StudioTestAPI {
  /** Wait for any picker to open */
  waitForPickerOpen(timeout?: number): Promise<{ pickerId: string; pickerType: string }>
  /** Wait for any picker to close */
  waitForPickerClose(timeout?: number): Promise<{ pickerId: string; reason: string }>
  /** Wait for a specific trigger to activate */
  waitForTrigger(
    triggerId: string,
    timeout?: number
  ): Promise<{ triggerId: string; startPos: number }>
  /** Wait for a specific trigger to deactivate */
  waitForTriggerDeactivate(triggerId: string, timeout?: number): Promise<{ triggerId: string }>
  /** Check if any picker is currently open */
  isPickerOpen(): boolean
  /** Get the type of the currently active picker */
  getActivePickerType(): string | null
  /** Get the ID of the currently active trigger */
  getActiveTrigger(): string | null
  /** Wait for any event of a specific type */
  waitForEvent<K extends keyof StudioEvents>(event: K, timeout?: number): Promise<StudioEvents[K]>
  /** Get the EventBus for direct access */
  getEventBus(): typeof events
}

/**
 * Create the Studio Test API
 */
export function createStudioTestAPI(): StudioTestAPI {
  const DEFAULT_TIMEOUT = 5000

  /**
   * Generic event waiter
   */
  function waitForEvent<K extends keyof StudioEvents>(
    event: K,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<StudioEvents[K]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Timeout waiting for event: ${event}`))
      }, timeout)
      const unsubscribe = events.on(event, payload => {
        clearTimeout(timeoutId)
        unsubscribe()
        resolve(payload)
      })
    })
  }

  /**
   * Wait for a specific event with a filter condition
   */
  function waitForEventWithFilter<K extends keyof StudioEvents>(
    event: K,
    filter: (payload: StudioEvents[K]) => boolean,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<StudioEvents[K]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Timeout waiting for event: ${event}`))
      }, timeout)

      const unsubscribe = events.on(event, payload => {
        if (filter(payload)) {
          clearTimeout(timeoutId)
          unsubscribe()
          resolve(payload)
        }
      })
    })
  }

  const api: StudioTestAPI = {
    waitForPickerOpen(timeout = DEFAULT_TIMEOUT) {
      return waitForEvent('picker:opened', timeout)
    },

    waitForPickerClose(timeout = DEFAULT_TIMEOUT) {
      return waitForEvent('picker:closed', timeout)
    },

    waitForTrigger(triggerId: string, timeout = DEFAULT_TIMEOUT) {
      return waitForEventWithFilter(
        'trigger:activated',
        payload => payload.triggerId === triggerId,
        timeout
      )
    },

    waitForTriggerDeactivate(triggerId: string, timeout = DEFAULT_TIMEOUT) {
      return waitForEventWithFilter(
        'trigger:deactivated',
        payload => payload.triggerId === triggerId,
        timeout
      )
    },

    isPickerOpen() {
      const triggerManager = getTriggerManager()
      return triggerManager.isOpen()
    },

    getActivePickerType() {
      const triggerManager = getTriggerManager()
      const state = triggerManager.getState()
      if (!state.isOpen || !state.picker) return null

      // Try to get picker type from the picker instance
      const picker = state.picker as { pickerType?: string }
      return picker.pickerType ?? null
    },

    getActiveTrigger() {
      const triggerManager = getTriggerManager()
      return triggerManager.getActiveTrigger()
    },

    waitForEvent,

    getEventBus() {
      return events
    },
  }

  return api
}

// Singleton instance
let testAPI: StudioTestAPI | null = null

/**
 * Get or create the Studio Test API
 */
export function getStudioTestAPI(): StudioTestAPI {
  if (!testAPI) {
    testAPI = createStudioTestAPI()
  }
  return testAPI
}

/**
 * Initialize and register the test API on window object
 * Call this during app initialization (only in test/dev environments)
 *
 * @param _studio - Studio instance (optional, for future use)
 * @param _editor - CodeMirror editor instance (optional, for drag test API)
 */
export function initStudioTestAPI(_studio?: unknown, _editor?: unknown): void {
  const api = getStudioTestAPI()

  // Register on window for Playwright access
  if (typeof window !== 'undefined') {
    ;(window as Window & { __STUDIO_TEST__?: StudioTestAPI }).__STUDIO_TEST__ = api
  }

  // Initialize drag test API (available at window.__testDragDrop)
  try {
    const { setupGlobalDragTestAPI } = require('../preview/drag/test-api/global')
    setupGlobalDragTestAPI(_editor)
    log.info('Drag Test API initialized at window.__testDragDrop')
  } catch (e) {
    log.warn('Failed to initialize Drag Test API:', e)
  }

  // Initialize browser drag test API (available at window.__dragTest)
  // This API uses real DOM events for visual testing
  try {
    const { setupBrowserDragTestAPI } = require('../preview/drag/browser-test-api')
    setupBrowserDragTestAPI()
    log.info('Browser Drag Test API initialized at window.__dragTest')
  } catch (e) {
    log.warn('Failed to initialize Browser Drag Test API:', e)
  }

  // Initialize comprehensive Mirror test API (available at window.__mirrorTest)
  try {
    setupMirrorTestAPI()
    log.info('Mirror Test API initialized at window.__mirrorTest')
  } catch (e) {
    log.warn('Failed to initialize Mirror Test API:', e)
  }

  log.info('Test API initialized')
}

// =============================================================================
// Mirror Test API (Comprehensive Testing Framework)
// =============================================================================

export interface MirrorTestAPI {
  // Quick inspection
  inspect: (nodeId: string) => ElementInfo | null
  getNodeIds: () => string[]
  findByText: (text: string) => ElementInfo | null

  // Quick interactions
  click: (nodeId: string) => Promise<void>
  hover: (nodeId: string) => Promise<void>
  type: (nodeId: string, text: string) => Promise<void>
  select: (nodeId: string) => void

  // Editor control
  getCode: () => string
  setCode: (code: string) => Promise<void>

  // Quick assertions (chainable)
  expect: (nodeId: string) => ElementAssert

  // Layout assertions (for verifying rendered positions)
  layout: {
    getInfo: (nodeId: string) => LayoutInfo | null
    assertDirection: (info: LayoutInfo, expected: Direction) => AssertionResult
    assertSize: (
      info: LayoutInfo,
      dimension: 'width' | 'height',
      expected: number | 'hug' | 'full',
      parentInfo?: LayoutInfo
    ) => AssertionResult
    assertAlignment: (
      info: LayoutInfo,
      expected: { main?: Alignment; cross?: Alignment }
    ) => AssertionResult
    assertGap: (info: LayoutInfo, expected: number) => AssertionResult
    assertLayout: (nodeId: string, expectations: LayoutExpectation) => AssertionResult[]
    // New pixel-accurate assertions
    assertActualGap: (parentId: string, expectedGap: number, tolerance?: number) => AssertionResult
    assertFillsSpace: (
      nodeId: string,
      dimension: 'width' | 'height',
      tolerance?: number
    ) => AssertionResult
    assertRelativePosition: (
      nodeA: string,
      nodeB: string,
      relation: 'above' | 'below' | 'left-of' | 'right-of',
      minGap?: number
    ) => AssertionResult
    assertExactSize: (
      nodeId: string,
      width: number,
      height: number,
      tolerance?: number
    ) => AssertionResult
    assertCentered: (
      nodeId: string,
      axis: 'horizontal' | 'vertical' | 'both',
      tolerance?: number
    ) => AssertionResult
  }

  // Assertion API (comprehensive assertions)
  assert: Assertions

  // DOM Bridge - declarative DOM validation using Mirror DSL properties
  dom: {
    /** Verify element matches expectations, returns result */
    verify: (nodeId: string, expect: DOMExpectation) => VerifyResult
    /** Verify element matches expectations, throws on failure */
    expect: (nodeId: string, expect: DOMExpectation) => void
    /** Verify multiple elements */
    verifyAll: (expectations: Record<string, DOMExpectation>) => VerifyResult[]
    /** Verify a tree structure */
    verifyTree: (rootId: string, tree: TreeExpectation) => VerifyResult[]
    /** Get the bridge instance for advanced use */
    bridge: DOMBridge
  }

  // Test running
  run: (tests: TestCase[], name?: string) => Promise<TestSuiteResult>
  runOne: (test: TestCase) => Promise<void>

  // Test definition helpers
  test: typeof test
  testWithSetup: typeof testWithSetup
  testOnly: typeof testOnly
  testSkip: typeof testSkip
  describe: typeof describe

  // Full APIs
  preview: PreviewInspector
  interact: Interactions
  runner: TestRunner

  // Fixtures
  fixtures: {
    /** List all available fixtures */
    list: () => string[]
    /** Load fixture into editor */
    load: (name: string) => Promise<void>
    /** Load code directly */
    loadCode: (code: string) => Promise<void>
    /** Get fixture by name */
    get: (name: string) => Fixture | undefined
    /** Get fixtures by category */
    getByCategory: (category: string) => Fixture[]
    /** Register custom fixture */
    register: (fixture: Fixture) => void
  }

  // Utilities
  delay: (ms: number) => Promise<void>
  waitForCompile: () => Promise<void>
  waitForElement: (nodeId: string, timeout?: number) => Promise<HTMLElement>
  waitForIdle: () => Promise<void>
  snapshot: () => { code: string; nodeIds: string[]; selection: string | null }

  // Test isolation
  reset: () => Promise<void>

  // Filter API (convenience methods for running subsets of tests)
  /** Run tests matching a pattern (case-insensitive) */
  filter: (pattern: string) => Promise<TestSuiteResult>
  /** Run all tests in a category */
  category: (category: string) => Promise<TestSuiteResult>
  /** Run a single test by exact or partial name match */
  only: (testName: string) => Promise<TestSuiteResult>
  /** List all available tests, optionally filtered by category */
  list: (category?: string) => void

  // Debug Mode
  /** Run a single test in debug mode with step-by-step execution */
  debug: (testName: string) => Promise<void>
  /** Continue to next step in debug mode */
  step: () => void
  /** Abort debug mode */
  abort: () => void

  // Snapping Debug API
  /** Snapping service debug API */
  snapping: SnappingAPI
}

/**
 * Create the comprehensive Mirror test API
 */
function createMirrorTestAPI(): MirrorTestAPI {
  const inspector = new PreviewInspector()
  const interactions = new Interactions()
  const runner = new TestRunner({ verbose: true })
  const collector = new AssertionCollector(false)
  const fixturesApi = createFixturesAPI()
  const studioApi = createStudioAPI()

  // Debug mode state
  let debugResolver: (() => void) | null = null
  let debugAborted = false

  const getCode = (): string => {
    const editor = (window as any).editor
    return editor?.state?.doc?.toString() ?? ''
  }

  const setCode = async (code: string): Promise<void> => {
    const editor = (window as any).editor
    if (!editor) throw new Error('Editor not available')

    const transaction = editor.state.update({
      changes: { from: 0, to: editor.state.doc.length, insert: code },
    })
    editor.dispatch(transaction)

    await waitForCompile()
  }

  const waitForCompile = async (timeout = 2000): Promise<void> => {
    const startTime = Date.now()
    return new Promise((resolve, reject) => {
      const check = () => {
        const preview = document.getElementById('preview')
        const hasNodes = preview?.querySelectorAll('[data-mirror-id]').length ?? 0
        if (hasNodes > 0) {
          setTimeout(resolve, 100)
          return
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error('Compile timeout'))
          return
        }
        setTimeout(check, 50)
      }
      setTimeout(check, 150)
    })
  }

  const delay = (ms: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  const snapshot = () => {
    const studio = (window as any).__mirrorStudio__
    return {
      code: getCode(),
      nodeIds: inspector.getNodeIds(),
      selection: studio?.state?.get()?.selection?.nodeId ?? null,
    }
  }

  return {
    // Quick inspection
    inspect: nodeId => inspector.inspect(nodeId),
    getNodeIds: () => inspector.getNodeIds(),
    findByText: text => inspector.findByText(text),

    // Quick interactions
    click: nodeId => interactions.click(nodeId),
    hover: nodeId => interactions.hover(nodeId),
    type: (nodeId, text) => interactions.type(nodeId, text),
    select: nodeId => interactions.select(nodeId),

    // Editor control
    getCode,
    setCode,

    // Quick assertions
    expect: nodeId => new ElementAssert(inspector, collector, nodeId),

    // Layout assertions
    layout: {
      getInfo: getLayoutInfo,
      assertDirection,
      assertSize,
      assertAlignment,
      assertGap,
      assertLayout,
      // New pixel-accurate assertions
      assertActualGap,
      assertFillsSpace,
      assertRelativePosition,
      assertExactSize,
      assertCentered,
    },

    // Comprehensive assertions API
    assert: new Assertions(inspector, collector, getCode, () => {
      const studio = (window as any).__mirrorStudio__
      return studio?.state?.get()?.selection?.nodeId ?? null
    }),

    // DOM Bridge
    dom: (() => {
      const bridge = createDOMBridge(inspector)
      return {
        verify: (nodeId: string, expect: DOMExpectation) => bridge.verify(nodeId, expect),
        expect: (nodeId: string, expect: DOMExpectation) => bridge.expect(nodeId, expect),
        verifyAll: (expectations: Record<string, DOMExpectation>) => bridge.verifyAll(expectations),
        verifyTree: (rootId: string, tree: TreeExpectation) => bridge.verifyTree(rootId, tree),
        bridge,
      }
    })(),

    // Test running
    run: (tests, name = 'Mirror Tests') => runner.runSuite(name, tests),
    runOne: async testCase => {
      const result = await runner.runTest(testCase)
      if (result.passed) {
        console.log(`✅ ${testCase.name} PASSED`)
      } else {
        console.log(`❌ ${testCase.name} FAILED: ${result.error}`)
      }
    },

    // Test definition helpers
    test,
    testWithSetup,
    testOnly,
    testSkip,
    describe,

    // Full APIs
    preview: inspector,
    interact: interactions,
    runner,

    // Fixtures
    fixtures: {
      list: () => fixturesApi.list(),
      load: name => fixturesApi.load(name),
      loadCode: code => fixturesApi.loadCode(code),
      get: name => fixturesApi.get(name),
      getByCategory: category => fixturesApi.getByCategory(category),
      register: fixture => fixturesApi.register(fixture),
    },

    // Utilities
    delay,
    waitForCompile,
    waitForElement: async (nodeId: string, timeout = 2000): Promise<HTMLElement> => {
      const startTime = Date.now()
      while (Date.now() - startTime < timeout) {
        const preview = document.getElementById('preview')
        const element = preview?.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
        if (element) return element
        await delay(50)
      }
      throw new Error(`Element ${nodeId} not found within ${timeout}ms`)
    },
    waitForIdle: async (): Promise<void> => {
      // Wait for requestAnimationFrame to complete
      await new Promise<void>(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve())
        })
      })
      await Promise.resolve()
      await delay(50)
    },
    snapshot,

    // Test isolation
    reset: () => studioApi.reset(),

    // Filter API
    filter: async (pattern: string) => {
      const suites = (window as any).__mirrorTestSuites
      if (!suites?.tests?.all) {
        console.error('Test suites not loaded. Ensure setupTestSuites() has completed.')
        return { passed: 0, failed: 0, skipped: 0, duration: 0, results: [] }
      }
      const regex = new RegExp(pattern, 'i')
      const filtered = suites.tests.all.filter((t: TestCase) => regex.test(t.name))
      console.log(`Found ${filtered.length} tests matching "${pattern}"`)
      return runner.runSuite(`Tests matching "${pattern}"`, filtered)
    },

    category: async (categoryName: string) => {
      const suites = (window as any).__mirrorTestSuites
      if (!suites?.tests) {
        console.error('Test suites not loaded. Ensure setupTestSuites() has completed.')
        return { passed: 0, failed: 0, skipped: 0, duration: 0, results: [] }
      }
      const tests = suites.tests[categoryName]
      if (!tests) {
        const available = Object.keys(suites.tests).filter(k => k !== 'all')
        console.error(`Unknown category: "${categoryName}". Available: ${available.join(', ')}`)
        return { passed: 0, failed: 0, skipped: 0, duration: 0, results: [] }
      }
      console.log(`Running ${tests.length} tests in category "${categoryName}"`)
      return runner.runSuite(`${categoryName} Tests`, tests)
    },

    only: async (testName: string) => {
      const suites = (window as any).__mirrorTestSuites
      if (!suites?.tests?.all) {
        console.error('Test suites not loaded.')
        return { passed: 0, failed: 0, skipped: 0, duration: 0, results: [] }
      }
      const test = suites.tests.all.find(
        (t: TestCase) =>
          t.name === testName || t.name.toLowerCase().includes(testName.toLowerCase())
      )
      if (!test) {
        console.error(`Test not found: "${testName}"`)
        // Show suggestions
        const matches = suites.tests.all
          .filter((t: TestCase) => t.name.toLowerCase().includes(testName.toLowerCase()))
          .slice(0, 5)
        if (matches.length > 0) {
          console.log('Did you mean:')
          matches.forEach((t: TestCase) => console.log(`  - ${t.name}`))
        }
        return { passed: 0, failed: 1, skipped: 0, duration: 0, results: [] }
      }
      return runner.runSuite(`Single Test: ${test.name}`, [test])
    },

    list: (categoryName?: string) => {
      const suites = (window as any).__mirrorTestSuites
      if (!suites?.tests) {
        console.error('Test suites not loaded.')
        return
      }

      if (categoryName) {
        const tests = suites.tests[categoryName]
        if (!tests) {
          const available = Object.keys(suites.tests).filter(k => k !== 'all')
          console.error(`Unknown category: "${categoryName}". Available: ${available.join(', ')}`)
          return
        }
        console.log(`\n${categoryName} Tests (${tests.length}):`)
        tests.forEach((t: TestCase, i: number) => console.log(`  ${i + 1}. ${t.name}`))
      } else {
        // List all categories with counts
        console.log('\nAvailable Test Categories:')
        const categories = Object.keys(suites.tests).filter(k => k !== 'all')
        categories.forEach(cat => {
          console.log(`  ${cat}: ${suites.tests[cat].length} tests`)
        })
        console.log(`\nTotal: ${suites.tests.all.length} tests`)
        console.log('\nUsage:')
        console.log('  __mirrorTest.list("layout")       // List tests in category')
        console.log('  __mirrorTest.category("layout")   // Run category')
        console.log('  __mirrorTest.filter("Button")     // Run matching tests')
        console.log('  __mirrorTest.only("Frame hor")    // Run single test')
      }
    },

    // Debug Mode
    debug: async (testName: string) => {
      const suites = (window as any).__mirrorTestSuites
      if (!suites?.tests?.all) {
        console.error('Test suites not loaded.')
        return
      }

      const test = suites.tests.all.find(
        (t: TestCase) =>
          t.name === testName || t.name.toLowerCase().includes(testName.toLowerCase())
      )
      if (!test) {
        console.error(`Test not found: "${testName}"`)
        return
      }

      debugAborted = false
      console.log(`\n🐛 DEBUG MODE: ${test.name}`)
      console.log('━'.repeat(50))
      console.log('Controls:')
      console.log('  __mirrorTest.step()  - Continue to next step')
      console.log('  __mirrorTest.abort() - Abort test')
      console.log('  Press Enter in console to continue')
      console.log('━'.repeat(50))

      // Create debug runner with step-by-step execution
      const debugRunner = new TestRunner({ verbose: true, timeout: 600000 }) // 10 min timeout for debug

      // Wrap the test to add debug pauses
      const debugTest: TestCase = {
        ...test,
        run: async api => {
          // Setup pause
          if (test.setup) {
            console.log('\n📝 Setup: Loading code...')
            await api.editor.setCode(test.setup)
            console.log('   Code loaded. Continue with __mirrorTest.step() or Enter')
            await waitForDebugStep()
            if (debugAborted) throw new Error('Debug aborted')
          }

          // Run test with debug wrapper
          console.log('\n▶️  Running test...')
          await test.run(api)
          console.log('\n✅ Test completed')
        },
      }

      async function waitForDebugStep(): Promise<void> {
        return new Promise(resolve => {
          debugResolver = resolve
        })
      }

      try {
        await debugRunner.runTest(debugTest)
      } catch (e) {
        if (debugAborted) {
          console.log('\n⚠️  Debug aborted')
        } else {
          console.error('\n❌ Test failed:', e)
        }
      } finally {
        debugResolver = null
      }
    },

    step: () => {
      if (debugResolver) {
        console.log('   → Continuing...')
        debugResolver()
        debugResolver = null
      } else {
        console.log('Not in debug mode')
      }
    },

    abort: () => {
      debugAborted = true
      if (debugResolver) {
        debugResolver()
        debugResolver = null
      }
      console.log('🛑 Aborting debug...')
    },

    // Snapping Debug API
    snapping: createSnappingAPI(),
  }
}

/**
 * Setup global Mirror test API
 */
export function setupMirrorTestAPI(): void {
  if ((window as any).__mirrorTest) return

  const api = createMirrorTestAPI()
  ;(window as any).__mirrorTest = api

  enableHoverSimulation()

  // Setup snapping debug API
  setupSnappingAPI()

  // Also expose test suites for CDP access
  setupTestSuites()

  console.log('🧪 Mirror Test Framework ready. Usage:')
  console.log('')
  console.log('  // Filter & Run Tests')
  console.log('  __mirrorTest.filter("Button")         // Run tests matching pattern')
  console.log('  __mirrorTest.category("zag")          // Run all Zag tests')
  console.log('  __mirrorTest.only("Checkbox toggle")  // Run single test')
  console.log('  __mirrorTest.list()                   // List all categories')
  console.log('  __mirrorTest.list("drag")             // List tests in category')
  console.log('')
  console.log('  // Debug Mode')
  console.log('  __mirrorTest.debug("Checkbox")        // Step-by-step debug')
  console.log('  __mirrorTest.step()                   // Continue to next step')
  console.log('  __mirrorTest.abort()                  // Abort debug')
  console.log('')
  console.log('  // Inspect & Interact')
  console.log('  __mirrorTest.inspect("node-1")')
  console.log('  __mirrorTest.click("node-1")')
  console.log('  __mirrorTest.expect("node-1").hasText("Hello")')
}

/**
 * Setup test suites on window for CDP access
 */
async function setupTestSuites(): Promise<void> {
  try {
    // Dynamically import test suites
    const suites = await import('./suites')

    const suitesAPI = {
      // Test counts
      testCounts: suites.testCounts,

      // Run all tests
      runAll: () => suites.runAllTests(),

      // Run by category
      runCategory: (category: string) => suites.runCategory(category as any),

      // Run a single test by name
      runSingleTest: (testName: string) => suites.runSingleTest(testName),

      // Run quick tests
      runQuick: () => suites.runQuickTests(),

      // Print summary
      printSummary: () => suites.printTestSummary(),

      // Individual test arrays (for custom running)
      tests: {
        primitives: suites.allPrimitivesTests,
        layout: suites.allLayoutTests,
        layoutShortcuts: suites.allLayoutShortcutTests,
        layoutVerification: suites.allLayoutVerificationTests,
        styling: suites.allStylingTests,
        zag: suites.allZagTests,
        interactions: suites.allInteractionTests,
        bidirectional: suites.allBidirectionalTests,
        undoRedo: suites.allUndoRedoTests,
        autocomplete: suites.allAutocompleteTests,
        stackedDrag: suites.allStackedDragTests,
        flexReorder: suites.allFlexReorderTests,
        propertyPanel: suites.allPropertyPanelTests,
        charts: suites.allChartTests,
        workflow: suites.allWorkflowTests,
        stress: suites.allStressTests,
        playMode: suites.allPlayModeTests,
        all: suites.allTests,
      },
    }

    ;(window as any).__mirrorTestSuites = suitesAPI

    console.log(`📊 Test suites loaded: ${suites.testCounts.total} tests available`)
  } catch (e) {
    console.warn('Failed to load test suites:', e)
  }
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Playwright
  if ((window as any).__playwright) return true

  // Check for test query param
  const params = new URLSearchParams(window.location.search)
  if (params.has('test')) return true

  // Check for NODE_ENV
  if (process.env.NODE_ENV === 'test') return true

  return false
}
