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
import type { TestCase, TestSuiteResult, ElementInfo } from './types'

const log = createLogger('TestAPI')

// Re-export for external use
export * from './types'
export { PreviewInspector } from './inspector'
export { Assertions, AssertionCollector, ElementAssert } from './assertions'
export { Interactions } from './interactions'
export { TestRunner, test, testWithSetup, testOnly, testSkip, describe } from './test-runner'

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

  // Utilities
  delay: (ms: number) => Promise<void>
  waitForCompile: () => Promise<void>
  snapshot: () => { code: string; nodeIds: string[]; selection: string | null }
}

/**
 * Create the comprehensive Mirror test API
 */
function createMirrorTestAPI(): MirrorTestAPI {
  const inspector = new PreviewInspector()
  const interactions = new Interactions()
  const runner = new TestRunner({ verbose: true })
  const collector = new AssertionCollector(false)

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

    // Utilities
    delay,
    waitForCompile,
    snapshot,
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

  console.log('🧪 Mirror Test Framework ready. Usage:')
  console.log('')
  console.log('  // Inspect elements')
  console.log('  __mirrorTest.inspect("node-1")')
  console.log('  __mirrorTest.getNodeIds()')
  console.log('')
  console.log('  // Interactions')
  console.log('  __mirrorTest.click("node-1")')
  console.log('  __mirrorTest.hover("node-2")')
  console.log('')
  console.log('  // Assertions')
  console.log('  __mirrorTest.expect("node-1").hasText("Hello").hasBackground("#2271C1")')
  console.log('')
  console.log('  // Run tests')
  console.log('  const { testWithSetup } = __mirrorTest')
  console.log('  __mirrorTest.run([')
  console.log('    testWithSetup("Button renders", "Button \\"Click\\"", async (api) => {')
  console.log('      api.assert.exists("node-1")')
  console.log('    })')
  console.log('  ])')
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
