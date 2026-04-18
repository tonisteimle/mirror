/**
 * Mirror Test Framework - Test Runner
 *
 * Executes test cases and collects results.
 * Supports setup, teardown, filtering, and reporting.
 */

import type {
  TestCase,
  TestResult,
  TestSuiteResult,
  TestAPI,
  EditorAPI,
  StateAPI,
  UtilsAPI,
  DOMAPI,
  PanelAPI,
  ZagAPI,
  StudioAPI,
} from './types'

// Re-export types for convenience
export type { TestCase, TestResult, TestSuiteResult, TestSuite, TestAPI } from './types'
import { PreviewInspector } from './inspector'
import { Assertions, AssertionCollector } from './assertions'
import { Interactions } from './interactions'
import { createDOMBridge } from './dom-bridge'
import { createPanelAPI } from './panel-api'
import { createZagAPI } from './zag-api'
import { createStudioAPI } from './studio-api'
import { createFixturesAPI } from './fixtures'

// =============================================================================
// Editor API Implementation
// =============================================================================

class EditorAPIImpl implements EditorAPI {
  private get editor(): any {
    return (window as any).editor
  }

  private get studio(): any {
    return (window as any).__mirrorStudio__
  }

  getCode(): string {
    return this.editor?.state?.doc?.toString() ?? ''
  }

  async setCode(code: string): Promise<void> {
    if (!this.editor) throw new Error('Editor not available')

    const cm = (window as any).__codemirror
    const compileTestCode = (window as any).__compileTestCode

    // Use setCodeWithHistory for proper undo tracking
    if (cm?.setCodeWithHistory) {
      cm.setCodeWithHistory(code)
    } else {
      // Fallback: standard approach
      const transaction = this.editor.state.update({
        changes: { from: 0, to: this.editor.state.doc.length, insert: code },
      })
      this.editor.dispatch(transaction)
    }

    // Compile directly if available (updates AST and SourceMap properly)
    if (compileTestCode) {
      compileTestCode(code)
      // Small delay for DOM updates
      await new Promise(resolve => setTimeout(resolve, 150))
      return
    }

    // Wait for compilation with code verification
    await this.waitForCompileWithCode(code)
  }

  private async waitForCompileWithCode(expectedCode: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()
    return new Promise((resolve, reject) => {
      const check = () => {
        // Verify the editor has the expected code
        const currentCode = this.editor?.state?.doc?.toString() ?? ''
        if (!currentCode.includes(expectedCode.substring(0, 20))) {
          if (Date.now() - startTime > timeout) {
            reject(new Error('Code not set'))
            return
          }
          setTimeout(check, 50)
          return
        }

        // Check for compiled nodes
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

  insertAt(code: string, line: number, indent = 0): void {
    if (!this.editor) throw new Error('Editor not available')

    const docString = this.editor.state.doc.toString()
    const indentStr = '  '.repeat(indent)
    const indentedCode = code
      .split('\n')
      .map((l: string) => indentStr + l)
      .join('\n')

    // Find position at end of specified line
    let pos = 0
    let currentLine = 0
    for (let i = 0; i < docString.length; i++) {
      if (currentLine >= line) {
        while (i < docString.length && docString[i] !== '\n') {
          i++
        }
        pos = i
        break
      }
      if (docString[i] === '\n') {
        currentLine++
      }
    }

    pos = Math.min(pos, this.editor.state.doc.length)
    const insertText =
      pos === this.editor.state.doc.length && !docString.endsWith('\n')
        ? '\n' + indentedCode
        : indentedCode + '\n'

    this.editor.dispatch({
      changes: { from: pos, to: pos, insert: insertText },
    })
  }

  getCursor(): { line: number; column: number } {
    if (!this.editor) return { line: 0, column: 0 }
    const pos = this.editor.state.selection.main.head
    const line = this.editor.state.doc.lineAt(pos)
    return {
      line: line.number,
      column: pos - line.from,
    }
  }

  setCursor(line: number, column: number): void {
    if (!this.editor) return
    const lineInfo = this.editor.state.doc.line(line)
    const pos = lineInfo.from + column
    this.editor.dispatch({
      selection: { anchor: pos, head: pos },
    })
  }

  triggerAutocomplete(): void {
    // Use window-exposed CodeMirror command (avoid dynamic require in bundled code)
    const cm = (window as any).__codemirror
    if (cm?.startCompletion) {
      cm.startCompletion()
    }
  }

  getCompletions(): string[] {
    // Use window-exposed CodeMirror function (avoid dynamic require in bundled code)
    const cm = (window as any).__codemirror
    if (!cm?.currentCompletions) return []

    const completions = cm.currentCompletions()
    if (!completions || !Array.isArray(completions)) return []

    return completions.map((c: any) => c.label)
  }

  undo(): void {
    // Use window-exposed CodeMirror command (avoid dynamic require in bundled code)
    const cm = (window as any).__codemirror
    if (cm?.undo) {
      cm.undo()
    }
  }

  redo(): void {
    // Use window-exposed CodeMirror command (avoid dynamic require in bundled code)
    const cm = (window as any).__codemirror
    if (cm?.redo) {
      cm.redo()
    }
  }

  private async waitForCompile(timeout = 2000): Promise<void> {
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
}

// =============================================================================
// State API Implementation
// =============================================================================

class StateAPIImpl implements StateAPI {
  private get studio(): any {
    return (window as any).__mirrorStudio__
  }

  getSelection(): string | null {
    return this.studio?.state?.get()?.selection?.nodeId ?? null
  }

  getMultiSelection(): string[] {
    return this.studio?.state?.get()?.multiSelection ?? []
  }

  getZagState(nodeId: string): unknown {
    // Access Zag machine state for component
    const preview = document.getElementById('preview')
    const element = preview?.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!element) return null

    // Zag stores state in data attributes or context
    const zagId = element.getAttribute('data-scope')
    if (!zagId) return null

    // Access global Zag state registry if available
    const zagRegistry = (window as any).__zagMachines__
    if (zagRegistry && zagRegistry[zagId]) {
      return zagRegistry[zagId].state
    }

    return null
  }

  getCustomState(nodeId: string): string | null {
    const preview = document.getElementById('preview')
    const element = preview?.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!element) return null

    // Check for custom state classes
    const classList = Array.from(element.classList)
    const stateClasses = classList.filter(
      c =>
        c.startsWith('state-') || ['on', 'off', 'open', 'closed', 'selected', 'active'].includes(c)
    )

    return stateClasses[0] || null
  }

  getSourceMap(): unknown {
    return this.studio?.state?.get()?.sourceMap ?? null
  }

  getPreludeOffset(): number {
    return this.studio?.state?.get()?.preludeOffset ?? 0
  }
}

// =============================================================================
// Utils API Implementation
// =============================================================================

class UtilsAPIImpl implements UtilsAPI {
  private inspector = new PreviewInspector()

  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async waitForCompile(timeout = 2000): Promise<void> {
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

  async waitUntil(condition: () => boolean, timeout = 2000): Promise<void> {
    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      if (condition()) return
      await this.delay(50)
    }
    throw new Error('Condition not met within timeout')
  }

  async waitForElement(nodeId: string, timeout = 2000): Promise<HTMLElement> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.previewContainer?.querySelector(
        `[data-mirror-id="${nodeId}"]`
      ) as HTMLElement | null

      if (element) return element
      await this.delay(50)
    }

    throw new Error(`Element ${nodeId} not found within ${timeout}ms`)
  }

  async waitForStyle(
    nodeId: string,
    property: string,
    expectedValue: string,
    timeout = 2000
  ): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.previewContainer?.querySelector(
        `[data-mirror-id="${nodeId}"]`
      ) as HTMLElement | null

      if (element) {
        const style = window.getComputedStyle(element)
        const actualValue = style.getPropertyValue(property) || (style as any)[property]

        if (actualValue === expectedValue) return
      }

      await this.delay(50)
    }

    throw new Error(`Style ${property} did not become "${expectedValue}" within ${timeout}ms`)
  }

  async waitForCount(selector: string, count: number, timeout = 2000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const elements = this.previewContainer?.querySelectorAll(selector)
      if (elements && elements.length === count) return
      await this.delay(50)
    }

    const actual = this.previewContainer?.querySelectorAll(selector).length ?? 0
    throw new Error(`Expected ${count} elements matching "${selector}", found ${actual}`)
  }

  async waitForAnimation(nodeId?: string, timeout = 2000): Promise<void> {
    // Get all elements or specific element
    const elements = nodeId
      ? [this.previewContainer?.querySelector(`[data-mirror-id="${nodeId}"]`)]
      : Array.from(this.previewContainer?.querySelectorAll('*') ?? [])

    // Check each element for running animations/transitions
    const checkAnimations = (): boolean => {
      for (const el of elements) {
        if (!el) continue

        // Check for CSS animations
        const animations = (el as HTMLElement).getAnimations?.()
        if (animations && animations.length > 0) {
          const running = animations.some(
            a => a.playState === 'running' || a.playState === 'pending'
          )
          if (running) return false
        }

        // Check for transitions (via transitionDuration)
        const style = window.getComputedStyle(el as Element)
        const duration = style.transitionDuration
        if (duration && duration !== '0s') {
          // Transition might be in progress - we can't easily detect this
          // so we'll do a conservative delay
        }
      }
      return true
    }

    const startTime = Date.now()
    while (Date.now() - startTime < timeout) {
      if (checkAnimations()) {
        // Extra buffer for transition completion
        await this.delay(100)
        return
      }
      await this.delay(50)
    }

    // Timeout is not an error for animations - they might just be long
    this.log(`Animation wait timed out after ${timeout}ms`)
  }

  async waitForIdle(timeout = 2000): Promise<void> {
    // Wait for requestAnimationFrame to complete
    await new Promise<void>(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => resolve())
      })
    })

    // Wait for any microtasks
    await Promise.resolve()

    // Buffer for async operations to settle (Zag state machines, history updates, etc.)
    await this.delay(100)
  }

  log(message: string): void {
    console.log(`[MirrorTest] ${message}`)
  }

  snapshot(): { code: string; nodeIds: string[]; selection: string | null } {
    const editor = (window as any).editor
    const studio = (window as any).__mirrorStudio__
    return {
      code: editor?.state?.doc?.toString() ?? '',
      nodeIds: this.inspector.getNodeIds(),
      selection: studio?.state?.get()?.selection?.nodeId ?? null,
    }
  }
}

// =============================================================================
// Test Runner
// =============================================================================

export interface TestRunnerOptions {
  /** Stop on first failure */
  bail?: boolean
  /** Filter tests by name pattern */
  filter?: string | RegExp
  /** Filter tests by tag */
  tags?: string[]
  /** Timeout per test (ms) */
  timeout?: number
  /** Run only 'only' tests */
  runOnly?: boolean
  /** Verbose output */
  verbose?: boolean
}

export class TestRunner {
  private options: TestRunnerOptions
  private inspector: PreviewInspector
  private interactions: Interactions
  private editorApi: EditorAPIImpl
  private stateApi: StateAPIImpl
  private utilsApi: UtilsAPIImpl

  constructor(options: TestRunnerOptions = {}) {
    this.options = {
      bail: false,
      timeout: 30000, // 30 seconds for complex UI tests
      runOnly: false,
      verbose: true,
      ...options,
    }
    this.inspector = new PreviewInspector()
    this.interactions = new Interactions()
    this.editorApi = new EditorAPIImpl()
    this.stateApi = new StateAPIImpl()
    this.utilsApi = new UtilsAPIImpl()
  }

  /**
   * Create test API for a test case
   */
  private createTestAPI(collector: AssertionCollector): TestAPI {
    const assertions = new Assertions(
      this.inspector,
      collector,
      () => this.editorApi.getCode(),
      () => this.stateApi.getSelection()
    )

    // Create DOM Bridge for declarative validation
    const domBridge = createDOMBridge(this.inspector)
    const domApi: DOMAPI = {
      expect: (nodeId, expectations) => domBridge.expect(nodeId, expectations),
      verify: (nodeId, expectations) => domBridge.verify(nodeId, expectations),
      verifyAll: expectations => domBridge.verifyAll(expectations),
      verifyTree: (rootId, tree) => domBridge.verifyTree(rootId, tree),
    }

    // Create Panel, Zag, Studio, and Fixtures APIs
    const panelApi = createPanelAPI()
    const zagApi = createZagAPI()
    const studioApi = createStudioAPI()
    const fixturesApi = createFixturesAPI()

    return {
      editor: this.editorApi,
      preview: this.inspector,
      interact: this.interactions,
      assert: assertions,
      dom: domApi,
      state: this.stateApi,
      utils: this.utilsApi,
      panel: panelApi,
      zag: zagApi,
      studio: studioApi,
      fixtures: fixturesApi,
    }
  }

  /**
   * Check if test should run
   */
  private shouldRun(test: TestCase, hasOnlyTests: boolean): boolean {
    // Skip if marked
    if (test.skip) return false

    // If there are 'only' tests, only run those
    if (hasOnlyTests && !test.only) return false

    // Filter by name
    if (this.options.filter) {
      const pattern =
        typeof this.options.filter === 'string'
          ? new RegExp(this.options.filter, 'i')
          : this.options.filter
      if (!pattern.test(test.name)) return false
    }

    // Filter by tags
    if (this.options.tags && this.options.tags.length > 0) {
      if (!test.tags || !test.tags.some(t => this.options.tags!.includes(t))) {
        return false
      }
    }

    return true
  }

  /**
   * Run a single test
   */
  async runTest(test: TestCase): Promise<TestResult> {
    const startTime = performance.now()
    const collector = new AssertionCollector(true)
    const api = this.createTestAPI(collector)

    const codeBefore = this.editorApi.getCode()
    let error: string | undefined

    try {
      // Setup
      if (test.setup) {
        await this.editorApi.setCode(test.setup)
      }

      // Run test with timeout
      await Promise.race([
        test.run(api),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Test timeout')), this.options.timeout)
        ),
      ])

      // Cleanup
      if (test.cleanup) {
        await test.cleanup(api)
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e)
    }

    const duration = performance.now() - startTime
    const assertions = collector.getResults()
    const passed = !error && assertions.every(a => a.passed)

    return {
      name: test.name,
      category: test.category,
      passed,
      duration,
      assertions,
      error,
      codeBefore,
      codeAfter: this.editorApi.getCode(),
    }
  }

  /**
   * Run a suite of tests
   */
  async runSuite(name: string, tests: TestCase[]): Promise<TestSuiteResult> {
    const startTime = performance.now()
    const results: TestResult[] = []
    let passed = 0
    let failed = 0
    let skipped = 0

    // Check for 'only' tests
    const hasOnlyTests = tests.some(t => t.only)

    if (this.options.verbose) {
      console.group(`🧪 ${name}`)
    }

    for (const test of tests) {
      if (!this.shouldRun(test, hasOnlyTests)) {
        skipped++
        if (this.options.verbose) {
          console.log(`  ⏭️  ${test.name} (skipped)`)
        }
        continue
      }

      if (this.options.verbose) {
        console.log(`  📋 ${test.name}...`)
      }

      const result = await this.runTest(test)
      results.push(result)

      if (result.passed) {
        passed++
        if (this.options.verbose) {
          console.log(`     ✅ PASSED (${result.duration.toFixed(0)}ms)`)
        }
      } else {
        failed++
        if (this.options.verbose) {
          console.log(`     ❌ FAILED: ${result.error || 'Assertion failed'}`)
          for (const assertion of result.assertions) {
            if (!assertion.passed) {
              console.log(`        - ${assertion.message}`)
            }
          }
        }

        if (this.options.bail) {
          console.log('  ⚠️  Bailing out due to failure')
          break
        }
      }
    }

    const duration = performance.now() - startTime

    if (this.options.verbose) {
      console.log('')
      console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`)
      console.log(`  Duration: ${duration.toFixed(0)}ms`)
      console.groupEnd()
    }

    return {
      name,
      passed,
      failed,
      skipped,
      duration,
      results,
    }
  }
}

// =============================================================================
// Test Definition Helpers
// =============================================================================

/**
 * Define a test case
 */
export function test(name: string, run: (api: TestAPI) => Promise<void>): TestCase {
  return { name, run }
}

/**
 * Define a test with setup code
 */
export function testWithSetup(
  name: string,
  setup: string,
  run: (api: TestAPI) => Promise<void>
): TestCase {
  return { name, setup, run }
}

/**
 * Define a test that only runs alone
 */
export function testOnly(name: string, run: (api: TestAPI) => Promise<void>): TestCase {
  return { name, run, only: true }
}

/**
 * Define a skipped test
 */
export function testSkip(name: string, run: (api: TestAPI) => Promise<void>): TestCase {
  return { name, run, skip: true }
}

/**
 * Group tests by category
 */
export function describe(category: string, tests: TestCase[]): TestCase[] {
  return tests.map(t => ({ ...t, category }))
}
