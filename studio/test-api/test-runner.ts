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
import { createCodeMirrorTestAPI, createEventTestAPI } from './codemirror-api'

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

    // IMPORTANT: Reset prelude offset to 0 for test code (no prelude)
    // This ensures SourceMap line numbers match editor line numbers
    const setPreludeOffset = (window as any).__setPreludeOffset
    if (setPreludeOffset) {
      setPreludeOffset(0)
    }

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

    // B5.2: Handle empty code specially - don't wait for nodes
    const isEmptyCode = expectedCode.trim().length === 0
    if (isEmptyCode) {
      return new Promise(resolve => {
        const check = () => {
          const currentCode = this.editor?.state?.doc?.toString() ?? ''
          if (currentCode.trim().length === 0) {
            // Empty code is set, wait a short time for any cleanup
            setTimeout(resolve, 100)
            return
          }
          if (Date.now() - startTime > timeout) {
            // Still resolve for empty code even on timeout
            resolve()
            return
          }
          setTimeout(check, 50)
        }
        setTimeout(check, 50)
      })
    }

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

  selectLines(fromLine: number, toLine: number): void {
    if (!this.editor) return
    // Select from start of fromLine to end of toLine
    const fromLineInfo = this.editor.state.doc.line(fromLine)
    const toLineInfo = this.editor.state.doc.line(toLine)
    const anchor = fromLineInfo.from
    const head = toLineInfo.to

    // Store pre-dispatch debug
    const preState = {
      docLines: this.editor.state.doc.lines,
      docLength: this.editor.state.doc.length,
      preSel: this.editor.state.selection.main,
      lineInfos: {
        fromLine: { from: fromLineInfo.from, to: fromLineInfo.to, text: fromLineInfo.text },
        toLine: { from: toLineInfo.from, to: toLineInfo.to, text: toLineInfo.text },
      },
    }

    // Get EditorSelection if available
    const cm = (window as any).__codemirror
    const EditorSelection = cm?.EditorSelection

    // Try both approaches: TransactionSpec and pre-created Transaction
    let transactionResult: any = null

    // Check state BEFORE dispatch
    const stateBefore = this.editor.state
    const selBefore = stateBefore.selection.main

    // Check focus state
    const editorDom = this.editor.dom
    const hasFocusBefore = this.editor.hasFocus
    const activeElementBefore = document.activeElement?.tagName

    if (EditorSelection) {
      const sel = EditorSelection.single(anchor, head)
      transactionResult = {
        selObj: {
          mainFrom: sel.main.from,
          mainTo: sel.main.to,
          mainAnchor: sel.main.anchor,
          mainHead: sel.main.head,
        },
        beforeSel: { from: selBefore.from, to: selBefore.to },
        focusBefore: hasFocusBefore,
        activeElBefore: activeElementBefore,
      }

      // NOTE: Don't call focus() before dispatch - it causes a separate update
      // that can interfere with the selection. dispatch() works without focus.

      // Try dispatching with TransactionSpec directly (not pre-created Transaction)
      this.editor.dispatch({ selection: sel })

      // Check state AFTER dispatch
      const stateAfter = this.editor.state
      const selAfter = stateAfter.selection.main

      transactionResult.afterSel = { from: selAfter.from, to: selAfter.to }
      transactionResult.afterAnchorHead = { anchor: selAfter.anchor, head: selAfter.head }
      transactionResult.focusAfter = this.editor.hasFocus
      transactionResult.sameEditorAsWindow = this.editor === (window as any).editor
    } else {
      this.editor.dispatch({
        selection: { anchor, head },
      })
    }

    // Store debug info for tests
    const newSel = this.editor.state.selection.main
    ;(window as any).__selectLinesDebug = {
      input: { fromLine, toLine },
      computed: { anchor, head },
      result: { from: newSel.from, to: newSel.to, anchor: newSel.anchor, head: newSel.head },
      preState,
      usedEditorSelection: !!EditorSelection,
      transactionResult,
    }
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

  /** Alias for delay */
  async sleep(ms: number): Promise<void> {
    return this.delay(ms)
  }

  async waitForCompile(timeout = 2000): Promise<void> {
    const startTime = Date.now()

    // B5.2: Check if editor has empty code - if so, don't wait for nodes
    const editor = (window as any).editor
    const editorCode = editor?.state?.doc?.toString() ?? ''

    return new Promise((resolve, reject) => {
      const check = () => {
        const preview = document.getElementById('preview')
        const hasNodes = preview?.querySelectorAll('[data-mirror-id]').length ?? 0

        // If we have nodes, we're done
        if (hasNodes > 0) {
          setTimeout(resolve, 100)
          return
        }

        // B5.2: If code is empty/whitespace, resolve without waiting for nodes
        const currentCode = editor?.state?.doc?.toString() ?? ''
        if (currentCode.trim().length === 0) {
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

  async waitForText(nodeId: string, expectedText: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.previewContainer?.querySelector(
        `[data-mirror-id="${nodeId}"]`
      ) as HTMLElement | null

      if (element) {
        const actualText = element.textContent?.trim() ?? ''
        if (actualText.includes(expectedText)) return
      }

      await this.delay(50)
    }

    const element = this.previewContainer?.querySelector(
      `[data-mirror-id="${nodeId}"]`
    ) as HTMLElement | null
    const actualText = element?.textContent?.trim() ?? '(element not found)'
    throw new Error(
      `Text "${expectedText}" not found in element ${nodeId} within ${timeout}ms (actual: "${actualText}")`
    )
  }

  async waitForVisible(nodeId: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.previewContainer?.querySelector(
        `[data-mirror-id="${nodeId}"]`
      ) as HTMLElement | null

      if (element) {
        const style = window.getComputedStyle(element)
        const isVisible =
          style.display !== 'none' && style.visibility !== 'hidden' && parseFloat(style.opacity) > 0

        if (isVisible) return
      }

      await this.delay(50)
    }

    throw new Error(`Element ${nodeId} did not become visible within ${timeout}ms`)
  }

  async waitForHidden(nodeId: string, timeout = 2000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const element = this.previewContainer?.querySelector(
        `[data-mirror-id="${nodeId}"]`
      ) as HTMLElement | null

      // Element doesn't exist = hidden
      if (!element) return

      const style = window.getComputedStyle(element)
      const isHidden =
        style.display === 'none' || style.visibility === 'hidden' || parseFloat(style.opacity) === 0

      if (isHidden) return

      await this.delay(50)
    }

    throw new Error(`Element ${nodeId} did not become hidden within ${timeout}ms`)
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

    // Create CodeMirror and Event APIs
    const codemirrorApi = createCodeMirrorTestAPI()
    const eventApi = createEventTestAPI()

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
      codemirror: codemirrorApi,
      events: eventApi,
    }
  }

  /**
   * Reset state between tests for isolation
   * This ensures each test starts with a clean slate
   */
  private resetTestState(): void {
    const studio = (window as any).__mirrorStudio__

    // =========================================================================
    // Selection State
    // =========================================================================

    // Clear selection
    if (studio?.actions?.clearSelection) {
      studio.actions.clearSelection('test')
    } else if (studio?.sync?.clearSelection) {
      studio.sync.clearSelection('test')
    }

    // Clear multi-selection
    if (studio?.actions?.clearMultiSelection) {
      studio.actions.clearMultiSelection()
    }

    // =========================================================================
    // Focus State - B1.3
    // =========================================================================

    // Blur any focused element in the preview
    const previewDoc = this.previewContainer
    if (previewDoc) {
      const focused = previewDoc.querySelector(':focus') as HTMLElement | null
      focused?.blur()
    }

    // Also blur from main document (e.g., editor focus)
    if (document.activeElement && document.activeElement !== document.body) {
      ;(document.activeElement as HTMLElement)?.blur?.()
    }

    // =========================================================================
    // Hover State - B1.3 / B5.1
    // =========================================================================

    // Remove any test hover classes
    document.querySelectorAll('.__test-hover').forEach(el => {
      el.classList.remove('.__test-hover')
    })

    // Remove data-hover attribute used by some components
    // Important: Dispatch mouseleave BEFORE removing attribute
    this.previewContainer?.querySelectorAll('[data-hover]').forEach(el => {
      el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }))
      el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }))
      el.removeAttribute('data-hover')
    })

    // Dispatch mouseleave on any element that might have hover state
    // Use a fresh query to avoid stale references
    const allMirrorElements = this.previewContainer?.querySelectorAll('[data-mirror-id]')
    allMirrorElements?.forEach(el => {
      // Only dispatch if element doesn't already have mouseleave dispatched
      if (!el.hasAttribute('data-hover-cleared')) {
        el.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true, cancelable: true }))
        el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true, cancelable: true }))
      }
    })

    // Remove data-focus attributes that might conflict with hover
    this.previewContainer?.querySelectorAll('[data-focus]').forEach(el => {
      el.removeAttribute('data-focus')
    })

    // Remove any inline hover styles that may have been applied
    // The Interactions class stores original styles in a WeakMap which resets naturally

    // =========================================================================
    // UI Mode State
    // =========================================================================

    // Exit any active edit modes (padding, margin)
    if (studio?.state?.get()?.paddingMode) {
      studio.events?.emit?.('padding-mode:toggle', { active: false })
    }
    if (studio?.state?.get()?.marginMode) {
      studio.events?.emit?.('margin-mode:toggle', { active: false })
    }

    // Exit play mode if active
    if (studio?.state?.get()?.playMode) {
      studio.actions?.togglePlayMode?.()
    }

    // =========================================================================
    // Dialog/Modal/Overlay State - B1.3
    // =========================================================================

    // Close any open dialogs
    this.previewContainer?.querySelectorAll('[data-state="open"]').forEach(el => {
      el.setAttribute('data-state', 'closed')
    })

    // Close any open select dropdowns
    this.previewContainer
      ?.querySelectorAll('[data-scope="select"][data-part="content"]')
      .forEach(el => {
        ;(el as HTMLElement).style.display = 'none'
      })

    // Dismiss any visible tooltips
    this.previewContainer?.querySelectorAll('[data-scope="tooltip"]').forEach(el => {
      ;(el as HTMLElement).style.visibility = 'hidden'
    })

    // =========================================================================
    // Custom State (toggle, exclusive)
    // =========================================================================

    // Reset custom states to initial values - this is tricky because we don't
    // know the initial state. For now, we don't reset these automatically.
    // Tests should set explicit initial states in their setup.
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
      // Reset state before each test for isolation
      this.resetTestState()

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

    // Count runnable tests
    const runnableTests = tests.filter(t => this.shouldRun(t, hasOnlyTests))
    const totalTests = runnableTests.length

    if (this.options.verbose) {
      console.group(`🧪 ${name}`)
    }

    // Send initial progress message for CDP
    console.log(`[TEST_PROGRESS] total:${totalTests} completed:0 passed:0 failed:0`)

    let completed = 0
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
      completed++

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

      // Send progress message for CDP after each test
      console.log(
        `[TEST_PROGRESS] total:${totalTests} completed:${completed} passed:${passed} failed:${failed} test:${result.name}`
      )
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
 * Define a skipped test with setup code
 */
export function testWithSetupSkip(
  name: string,
  setup: string,
  run: (api: TestAPI) => Promise<void>
): TestCase {
  return { name, setup, run, skip: true }
}

/**
 * Group tests by category
 */
export function describe(category: string, tests: TestCase[]): TestCase[] {
  return tests.map(t => ({ ...t, category }))
}
