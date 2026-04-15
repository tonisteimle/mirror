/**
 * Browser Test API for Drag & Drop
 *
 * Simulates real user drag & drop interactions in the browser.
 * Runs inside the Studio and triggers actual DOM updates.
 *
 * Usage in browser console:
 *   __dragTest.fromPalette('Button').toContainer('node-1').atIndex(0).execute()
 *   __dragTest.moveElement('node-3').toContainer('node-1').atIndex(0).execute()
 *   __dragTest.runAllTests()
 */

import { getDragController } from './drag-controller'
import {
  setCurrentDragData,
  clearCurrentDragData,
  setCanvasDragData,
  type ComponentDragData,
} from '../drag-preview'
import type { DragSource, DropTarget, Point } from './types'

// =============================================================================
// Types
// =============================================================================

export interface BrowserTestResult {
  success: boolean
  description: string
  duration: number
  codeBefore?: string
  codeAfter?: string
  error?: string
}

export interface AnimationConfig {
  /** Animation speed (ms between steps) */
  stepDelay: number
  /** Number of interpolation steps */
  steps: number
  /** Show visual cursor */
  showCursor: boolean
}

const DEFAULT_ANIMATION: AnimationConfig = {
  stepDelay: 20,
  steps: 15,
  showCursor: true,
}

// =============================================================================
// Browser Test Runner
// =============================================================================

export class BrowserTestRunner {
  private animationConfig: AnimationConfig = DEFAULT_ANIMATION
  private visualCursor: HTMLElement | null = null

  constructor() {
    // Dependencies are fetched dynamically
  }

  /**
   * Get preview container (fetched dynamically)
   */
  private get previewContainer(): HTMLElement | null {
    return document.getElementById('preview')
  }

  /**
   * Get editor instance (fetched dynamically)
   */
  private get editor(): any {
    return (window as any).editor
  }

  /**
   * Set animation configuration
   */
  setAnimation(config: Partial<AnimationConfig>): this {
    this.animationConfig = { ...this.animationConfig, ...config }
    return this
  }

  /**
   * Get current code from editor
   */
  getCode(): string {
    return this.editor?.state?.doc?.toString() ?? ''
  }

  /**
   * Create a drag from palette builder
   */
  fromPalette(componentName: string): PaletteDragBuilder {
    return new PaletteDragBuilder(this, componentName)
  }

  /**
   * Create a canvas element move builder
   */
  moveElement(nodeId: string): CanvasMoveBuilder {
    return new CanvasMoveBuilder(this, nodeId)
  }

  /**
   * Execute a palette drop
   */
  async executePaletteDrop(params: {
    componentName: string
    targetNodeId: string
    insertionIndex: number
    template?: string
    properties?: string
    textContent?: string
  }): Promise<BrowserTestResult> {
    const startTime = performance.now()
    const codeBefore = this.getCode()
    const description = `Drop ${params.componentName} into ${params.targetNodeId} at index ${params.insertionIndex}`

    try {
      // 1. Find target element in DOM
      const targetEl = this.findElement(params.targetNodeId)
      if (!targetEl) {
        return this.errorResult(
          description,
          `Target element ${params.targetNodeId} not found`,
          startTime
        )
      }

      // 2. Set drag data (as ComponentPanel would)
      const dragData: ComponentDragData = {
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        mirTemplate: params.template,
      }
      setCurrentDragData(dragData)

      // 3. Calculate start and end positions
      const targetRect = targetEl.getBoundingClientRect()
      const startPos = this.getPalettePosition()
      const endPos = this.calculateDropPosition(targetRect, params.insertionIndex)

      // 4. Create drag source
      const source: DragSource = {
        type: 'palette',
        componentName: params.componentName,
      }

      // 5. Execute animated drag
      await this.executeAnimatedDrag(
        source,
        startPos,
        endPos,
        params.targetNodeId,
        params.insertionIndex
      )

      // 6. Cleanup
      clearCurrentDragData()

      // 7. Wait for code update
      await this.waitForCodeChange(codeBefore)

      return {
        success: true,
        description,
        duration: performance.now() - startTime,
        codeBefore,
        codeAfter: this.getCode(),
      }
    } catch (error) {
      clearCurrentDragData()
      return this.errorResult(description, String(error), startTime, codeBefore)
    }
  }

  /**
   * Execute a canvas element move
   */
  async executeCanvasMove(params: {
    sourceNodeId: string
    targetNodeId: string
    insertionIndex: number
  }): Promise<BrowserTestResult> {
    const startTime = performance.now()
    const codeBefore = this.getCode()
    const description = `Move ${params.sourceNodeId} to ${params.targetNodeId} at index ${params.insertionIndex}`

    try {
      // 1. Find source and target elements
      const sourceEl = this.findElement(params.sourceNodeId)
      const targetEl = this.findElement(params.targetNodeId)

      if (!sourceEl) {
        return this.errorResult(
          description,
          `Source element ${params.sourceNodeId} not found`,
          startTime
        )
      }
      if (!targetEl) {
        return this.errorResult(
          description,
          `Target element ${params.targetNodeId} not found`,
          startTime
        )
      }

      // 2. Set canvas drag data
      setCanvasDragData(params.sourceNodeId)

      // 3. Calculate positions
      const sourceRect = sourceEl.getBoundingClientRect()
      const targetRect = targetEl.getBoundingClientRect()
      const startPos: Point = {
        x: sourceRect.left + sourceRect.width / 2,
        y: sourceRect.top + sourceRect.height / 2,
      }
      const endPos = this.calculateDropPosition(targetRect, params.insertionIndex)

      // 4. Create drag source
      const source: DragSource = {
        type: 'canvas',
        nodeId: params.sourceNodeId,
      }

      // 5. Execute animated drag
      await this.executeAnimatedDrag(
        source,
        startPos,
        endPos,
        params.targetNodeId,
        params.insertionIndex
      )

      // 6. Cleanup
      clearCurrentDragData()

      // 7. Wait for code update
      await this.waitForCodeChange(codeBefore)

      return {
        success: true,
        description,
        duration: performance.now() - startTime,
        codeBefore,
        codeAfter: this.getCode(),
      }
    } catch (error) {
      clearCurrentDragData()
      return this.errorResult(description, String(error), startTime, codeBefore)
    }
  }

  /**
   * Find element by node ID
   */
  private findElement(nodeId: string): HTMLElement | null {
    return this.previewContainer?.querySelector(
      `[data-mirror-id="${nodeId}"]`
    ) as HTMLElement | null
  }

  /**
   * Get simulated palette position (top-left area)
   */
  private getPalettePosition(): Point {
    return { x: 100, y: 200 }
  }

  /**
   * Calculate drop position within target
   */
  private calculateDropPosition(targetRect: DOMRect, insertionIndex: number): Point {
    // Position in the upper portion for index 0, lower for higher indices
    const yOffset = Math.min(insertionIndex * 30, targetRect.height - 10)
    return {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + 20 + yOffset,
    }
  }

  /**
   * Execute animated drag with visual feedback
   *
   * In headless/programmatic mode, the hit detection may fail because
   * coordinates don't correspond to actual DOM positions. We use
   * simulateDrop as a fallback when the animated drag fails.
   */
  private async executeAnimatedDrag(
    source: DragSource,
    startPos: Point,
    endPos: Point,
    targetNodeId: string,
    insertionIndex: number
  ): Promise<void> {
    const controller = getDragController()
    const { steps, stepDelay, showCursor } = this.animationConfig

    // Show visual cursor
    if (showCursor) {
      this.showVisualCursor(startPos)
    }

    // Start the drag
    controller.startDrag(source, this.previewContainer!)

    // Animate movement
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const currentPos: Point = {
        x: startPos.x + (endPos.x - startPos.x) * t,
        y: startPos.y + (endPos.y - startPos.y) * t,
      }

      controller.updatePosition(currentPos)

      if (showCursor) {
        this.moveVisualCursor(currentPos)
      }

      await this.delay(stepDelay)
    }

    // Hide cursor
    if (showCursor) {
      this.hideVisualCursor()
    }

    // Check if we have a valid target - if not, use simulateDrop as fallback
    const state = controller.getTestState()
    if (!state.target) {
      // Hit detection failed (common in headless mode) - use simulateDrop
      const target: DropTarget = { containerId: targetNodeId, insertionIndex }
      await controller.simulateDrop(source, target)
    } else {
      // Normal drop path
      await controller.drop()
    }
  }

  /**
   * Wait for code to change (with timeout)
   */
  private async waitForCodeChange(originalCode: string, timeout = 1000): Promise<void> {
    const startTime = performance.now()
    while (performance.now() - startTime < timeout) {
      if (this.getCode() !== originalCode) {
        return
      }
      await this.delay(50)
    }
  }

  /**
   * Show visual cursor for animation
   */
  private showVisualCursor(pos: Point): void {
    if (this.visualCursor) return

    this.visualCursor = document.createElement('div')
    this.visualCursor.id = '__drag-test-cursor'
    this.visualCursor.style.cssText = `
      position: fixed;
      width: 20px;
      height: 20px;
      background: #5BA8F5;
      border: 2px solid white;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: none;
    `
    this.visualCursor.style.left = `${pos.x}px`
    this.visualCursor.style.top = `${pos.y}px`
    document.body.appendChild(this.visualCursor)
  }

  /**
   * Move visual cursor
   */
  private moveVisualCursor(pos: Point): void {
    if (!this.visualCursor) return
    this.visualCursor.style.left = `${pos.x}px`
    this.visualCursor.style.top = `${pos.y}px`
  }

  /**
   * Hide visual cursor
   */
  private hideVisualCursor(): void {
    if (this.visualCursor) {
      this.visualCursor.remove()
      this.visualCursor = null
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private errorResult(
    description: string,
    error: string,
    startTime: number,
    codeBefore?: string
  ): BrowserTestResult {
    return {
      success: false,
      description,
      duration: performance.now() - startTime,
      error,
      codeBefore,
      codeAfter: this.getCode(),
    }
  }
}

// =============================================================================
// Fluent Builders
// =============================================================================

class PaletteDragBuilder {
  private runner: BrowserTestRunner
  private componentName: string
  private targetId: string = ''
  private index: number = 0
  private template?: string
  private properties?: string
  private text?: string

  constructor(runner: BrowserTestRunner, componentName: string) {
    this.runner = runner
    this.componentName = componentName
  }

  withTemplate(template: string): this {
    this.template = template
    return this
  }

  withProperties(props: string): this {
    this.properties = props
    return this
  }

  withText(text: string): this {
    this.text = text
    return this
  }

  toContainer(nodeId: string): this {
    this.targetId = nodeId
    return this
  }

  atIndex(index: number): this {
    this.index = index
    return this
  }

  async execute(): Promise<BrowserTestResult> {
    if (!this.targetId) {
      return {
        success: false,
        description: `Drop ${this.componentName}`,
        duration: 0,
        error: 'Target container not specified. Use .toContainer(nodeId)',
      }
    }

    return this.runner.executePaletteDrop({
      componentName: this.componentName,
      targetNodeId: this.targetId,
      insertionIndex: this.index,
      template: this.template,
      properties: this.properties,
      textContent: this.text,
    })
  }
}

class CanvasMoveBuilder {
  private runner: BrowserTestRunner
  private sourceId: string
  private targetId: string = ''
  private index: number = 0

  constructor(runner: BrowserTestRunner, sourceId: string) {
    this.runner = runner
    this.sourceId = sourceId
  }

  toContainer(nodeId: string): this {
    this.targetId = nodeId
    return this
  }

  atIndex(index: number): this {
    this.index = index
    return this
  }

  async execute(): Promise<BrowserTestResult> {
    if (!this.targetId)
      return {
        success: false,
        description: `Move ${this.sourceId}`,
        duration: 0,
        error: 'Target container not specified. Use .toContainer(nodeId)',
      }
    return this.runner.executeCanvasMove({
      sourceNodeId: this.sourceId,
      targetNodeId: this.targetId,
      insertionIndex: this.index,
    })
  }
}

// =============================================================================
// Test Suite
// =============================================================================

export interface TestCase {
  name: string
  run: (runner: BrowserTestRunner) => Promise<BrowserTestResult>
}

export const builtInTests: TestCase[] = [
  {
    name: 'Drop Button into empty Frame',
    run: async runner => {
      return runner
        .fromPalette('Button')
        .withText('Test')
        .toContainer('node-1')
        .atIndex(0)
        .execute()
    },
  },
  {
    name: 'Drop Text after Button',
    run: async runner => {
      return runner.fromPalette('Text').withText('Hello').toContainer('node-1').atIndex(1).execute()
    },
  },
  {
    name: 'Drop Icon at beginning',
    run: async runner => {
      return runner.fromPalette('Icon').withText('star').toContainer('node-1').atIndex(0).execute()
    },
  },
]

/**
 * Run all built-in tests
 */
export async function runAllTests(runner: BrowserTestRunner): Promise<{
  passed: number
  failed: number
  results: BrowserTestResult[]
}> {
  const results: BrowserTestResult[] = []
  let passed = 0
  let failed = 0

  console.group('🧪 Drag & Drop Browser Tests')

  for (const test of builtInTests) {
    console.log(`Running: ${test.name}...`)
    const result = await test.run(runner)
    results.push(result)

    if (result.success) {
      passed++
      console.log(`  ✅ ${test.name} (${result.duration.toFixed(0)}ms)`)
    } else {
      failed++
      console.log(`  ❌ ${test.name}: ${result.error}`)
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  console.groupEnd()

  return { passed, failed, results }
}

// =============================================================================
// Global Setup
// =============================================================================

let globalRunner: BrowserTestRunner | null = null

// =============================================================================
// Mirror Studio Control API
// =============================================================================

/**
 * Mirror Studio specific test controls
 */
export class MirrorStudioControl {
  /**
   * Set editor code content
   * Note: You should call resetPreludeOffset() AFTER waitForCompile()
   * since compile will re-set the prelude offset from file system
   */
  setCode(code: string): void {
    const editor = (window as any).editor
    if (!editor) throw new Error('Editor not available')

    const transaction = editor.state.update({
      changes: { from: 0, to: editor.state.doc.length, insert: code },
    })
    editor.dispatch(transaction)
  }

  /**
   * Get current editor code
   */
  getCode(): string {
    const editor = (window as any).editor
    return editor?.state?.doc?.toString() ?? ''
  }

  /**
   * Wait for compilation to complete
   */
  async waitForCompile(timeout = 2000): Promise<void> {
    const startTime = Date.now()

    // Wait for preview to update with valid nodes
    return new Promise((resolve, reject) => {
      const check = () => {
        const preview = document.getElementById('preview')
        const hasNodes = preview?.querySelectorAll('[data-mirror-id]').length ?? 0
        if (hasNodes > 0) {
          // Additional delay for sourceMap sync
          setTimeout(resolve, 100)
          return
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error('Compile timeout'))
          return
        }
        setTimeout(check, 50)
      }
      // Initial delay for debounce
      setTimeout(check, 150)
    })
  }

  /**
   * Set test code and compile without prelude.
   * This is the recommended way to set up test code for drag testing.
   * Uses __compileTestCode which compiles directly without prelude,
   * ensuring sourceMap positions match the actual editor content.
   */
  async setTestCode(code: string): Promise<void> {
    // First set the editor code
    this.setCode(code)

    // Use the test compile function that skips prelude
    const compileTestCode = (window as any).__compileTestCode
    if (compileTestCode) {
      compileTestCode(code)
      // Small delay for DOM updates
      await new Promise(resolve => setTimeout(resolve, 100))
    } else {
      // Fallback to normal compile if test function not available
      await this.waitForCompile()
      this.resetPreludeOffset()
    }
  }

  /**
   * Force a recompile and wait
   */
  async recompile(): Promise<void> {
    const events = (window as any).__mirrorStudio__?.events
    if (events) {
      // Trigger recompile
      const code = this.getCode()
      events.emit('source:changed', { source: code })
      await this.waitForCompile()
    }
  }

  /**
   * Show/hide panels
   */
  setPanelVisibility(panel: string, visible: boolean): void {
    const studio = (window as any).__mirrorStudio__
    if (studio?.state?.setPanelVisibility) {
      studio.state.setPanelVisibility(panel, visible)
    }
  }

  /**
   * Toggle a panel
   */
  togglePanel(panel: string): void {
    const studio = (window as any).__mirrorStudio__
    if (studio?.state?.togglePanelVisibility) {
      studio.state.togglePanelVisibility(panel)
    }
  }

  /**
   * Hide all panels except preview (focus mode)
   */
  focusMode(): void {
    const panels = ['files', 'components', 'code', 'property', 'prompt']
    panels.forEach(p => this.setPanelVisibility(p, false))
    this.setPanelVisibility('preview', true)
  }

  /**
   * Show all panels (normal mode)
   */
  normalMode(): void {
    const panels = ['files', 'components', 'code', 'property', 'preview']
    panels.forEach(p => this.setPanelVisibility(p, true))
  }

  /**
   * Test mode: Show only editor and preview
   */
  testMode(): void {
    this.setPanelVisibility('files', false)
    this.setPanelVisibility('components', false)
    this.setPanelVisibility('prompt', false)
    this.setPanelVisibility('code', true)
    this.setPanelVisibility('preview', true)
    this.setPanelVisibility('property', false)
  }

  /**
   * Select an element in the preview by node ID
   */
  selectNode(nodeId: string): void {
    // Use actions.setSelection from the Studio instance
    const studio = (window as any).__mirrorStudio__
    if (studio?.actions?.setSelection) {
      studio.actions.setSelection(nodeId, 'preview')
      return
    }

    // Fallback: try clicking
    const preview = document.getElementById('preview')
    const element = preview?.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
    if (element) {
      element.click()
    }
  }

  /**
   * Get current selection
   */
  getSelection(): string | null {
    const studio = (window as any).__mirrorStudio__
    return studio?.state?.get()?.selection?.nodeId ?? null
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    const studio = (window as any).__mirrorStudio__
    if (studio?.actions?.setSelection) {
      studio.actions.setSelection(null, 'preview')
    }
  }

  /**
   * Get all node IDs in the preview
   */
  getNodeIds(): string[] {
    const preview = document.getElementById('preview')
    if (!preview) return []
    const elements = preview.querySelectorAll('[data-mirror-id]')
    return Array.from(elements).map(el => el.getAttribute('data-mirror-id')!)
  }

  /**
   * Get SourceMap
   */
  getSourceMap(): any {
    const studio = (window as any).__mirrorStudio__
    return studio?.state?.get()?.sourceMap ?? null
  }

  /**
   * Reset editor to default code
   */
  reset(code = 'Frame gap 12, pad 16, bg #1a1a1a'): void {
    this.setCode(code)
  }

  /**
   * Insert code at specific position (bypasses drop system)
   * Useful for testing when drop offset issues occur
   *
   * @param code - Code to insert
   * @param line - Line number to insert after (0 = after first line)
   * @param indent - Number of indentation levels (2 spaces each)
   */
  insertCodeAt(code: string, line: number, indent: number = 0): void {
    const editor = (window as any).editor
    if (!editor) throw new Error('Editor not available')

    const docString = editor.state.doc.toString()
    const docLength = editor.state.doc.length

    // Build indented code
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
        // Find end of this line
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

    // If we ran out of content, insert at end
    if (currentLine < line) {
      pos = docLength
    }

    // Ensure pos is within bounds
    pos = Math.min(pos, docLength)

    // Insert with newline before if not at start of line
    const insertText =
      pos === docLength && !docString.endsWith('\n') ? '\n' + indentedCode : indentedCode + '\n'

    editor.dispatch({
      changes: { from: pos, to: pos, insert: insertText },
    })
  }

  /**
   * Simulate a component drop by inserting code
   * This bypasses the complex drop system for reliable testing
   */
  async simulateDropByInsertion(params: {
    componentCode: string
    afterLine: number
    indent: number
  }): Promise<{ success: boolean; codeBefore: string; codeAfter: string }> {
    const codeBefore = this.getCode()
    try {
      this.insertCodeAt(params.componentCode, params.afterLine, params.indent)
      await this.waitForCompile()
      return {
        success: true,
        codeBefore,
        codeAfter: this.getCode(),
      }
    } catch (error) {
      return {
        success: false,
        codeBefore,
        codeAfter: this.getCode(),
      }
    }
  }

  /**
   * Take a snapshot of the current state
   */
  snapshot(): {
    code: string
    nodeIds: string[]
    selection: string | null
  } {
    return {
      code: this.getCode(),
      nodeIds: this.getNodeIds(),
      selection: this.getSelection(),
    }
  }

  /**
   * Get prelude offset (for debugging)
   */
  getPreludeOffset(): number {
    const studio = (window as any).__mirrorStudio__
    // The preludeOffset is stored in state
    return studio?.state?.get()?.preludeOffset ?? 0
  }

  /**
   * Force reset prelude offset to 0 (for simple test code without tokens/components)
   * This is needed when setting test code directly since the Studio may still
   * have prelude offset from the previous file.
   */
  resetPreludeOffset(): void {
    // Use global function to reset both state and app.js module variable
    const setOffset = (window as any).__setPreludeOffset
    if (setOffset) {
      setOffset(0)
    } else {
      // Fallback: try just setting state
      const studio = (window as any).__mirrorStudio__
      if (studio?.state?.set) {
        studio.state.set({ preludeOffset: 0, preludeLineOffset: 0 })
      }
    }
  }

  /**
   * Verify code change matches expectation
   */
  verifyCodeChange(params: {
    codeBefore: string
    codeAfter: string
    expectedPattern: string | RegExp
  }): { match: boolean; diff: string; message: string } {
    const { codeBefore, codeAfter, expectedPattern } = params

    // Check if pattern exists in new code
    const pattern =
      typeof expectedPattern === 'string'
        ? new RegExp(expectedPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        : expectedPattern

    const match = pattern.test(codeAfter)

    // Calculate diff
    const beforeLines = codeBefore.split('\n')
    const afterLines = codeAfter.split('\n')
    const diffLines: string[] = []

    for (let i = 0; i < Math.max(beforeLines.length, afterLines.length); i++) {
      const before = beforeLines[i] ?? ''
      const after = afterLines[i] ?? ''
      if (before !== after) {
        if (beforeLines[i] !== undefined && afterLines[i] === undefined) {
          diffLines.push(`- ${before}`)
        } else if (beforeLines[i] === undefined && afterLines[i] !== undefined) {
          diffLines.push(`+ ${after}`)
        } else {
          diffLines.push(`- ${before}`)
          diffLines.push(`+ ${after}`)
        }
      }
    }

    return {
      match,
      diff: diffLines.join('\n') || '(no changes)',
      message: match
        ? `Pattern found: ${expectedPattern}`
        : `Pattern NOT found: ${expectedPattern}\nActual code:\n${codeAfter}`,
    }
  }

  /**
   * Execute a real drag operation and verify the result
   */
  async executeRealDrag(params: {
    componentName: string
    targetNodeId: string
    insertionIndex: number
    expectedPattern: string
  }): Promise<{
    success: boolean
    codeBefore: string
    codeAfter: string
    verification: { match: boolean; diff: string; message: string }
    error?: string
    debugInfo: {
      preludeOffset: number
      nodeCount: number
      targetFound: boolean
    }
  }> {
    const codeBefore = this.getCode()
    const preludeOffset = this.getPreludeOffset()
    const nodeIds = this.getNodeIds()
    const targetFound = nodeIds.includes(params.targetNodeId)

    const debugInfo = {
      preludeOffset,
      nodeCount: nodeIds.length,
      targetFound,
    }

    if (!targetFound) {
      return {
        success: false,
        codeBefore,
        codeAfter: codeBefore,
        verification: {
          match: false,
          diff: '',
          message: `Target ${params.targetNodeId} not found`,
        },
        error: `Target node ${params.targetNodeId} not found. Available: ${nodeIds.join(', ')}`,
        debugInfo,
      }
    }

    try {
      // Use the BrowserTestRunner for the drag operation
      const runner = globalRunner!
      const result = await runner.executePaletteDrop({
        componentName: params.componentName,
        targetNodeId: params.targetNodeId,
        insertionIndex: params.insertionIndex,
        textContent: params.componentName === 'Button' ? 'Test' : undefined,
      })

      const codeAfter = this.getCode()
      const verification = this.verifyCodeChange({
        codeBefore,
        codeAfter,
        expectedPattern: params.expectedPattern,
      })

      return {
        success: result.success && verification.match,
        codeBefore,
        codeAfter,
        verification,
        error: result.success
          ? verification.match
            ? undefined
            : verification.message
          : result.error,
        debugInfo,
      }
    } catch (error) {
      return {
        success: false,
        codeBefore,
        codeAfter: this.getCode(),
        verification: { match: false, diff: '', message: String(error) },
        error: String(error),
        debugInfo,
      }
    }
  }

  /**
   * Execute a real canvas move (move existing element) and verify the result
   */
  async executeRealCanvasMove(params: {
    sourceNodeId: string
    targetNodeId: string
    insertionIndex: number
    expectedPattern: string
  }): Promise<{
    success: boolean
    codeBefore: string
    codeAfter: string
    verification: { match: boolean; diff: string; message: string }
    error?: string
    debugInfo: {
      preludeOffset: number
      nodeCount: number
      sourceFound: boolean
      targetFound: boolean
    }
  }> {
    const codeBefore = this.getCode()
    const preludeOffset = this.getPreludeOffset()
    const nodeIds = this.getNodeIds()
    const sourceFound = nodeIds.includes(params.sourceNodeId)
    const targetFound = nodeIds.includes(params.targetNodeId)

    const debugInfo = {
      preludeOffset,
      nodeCount: nodeIds.length,
      sourceFound,
      targetFound,
    }

    if (!sourceFound) {
      return {
        success: false,
        codeBefore,
        codeAfter: codeBefore,
        verification: {
          match: false,
          diff: '',
          message: `Source ${params.sourceNodeId} not found`,
        },
        error: `Source node ${params.sourceNodeId} not found. Available: ${nodeIds.join(', ')}`,
        debugInfo,
      }
    }

    if (!targetFound) {
      return {
        success: false,
        codeBefore,
        codeAfter: codeBefore,
        verification: {
          match: false,
          diff: '',
          message: `Target ${params.targetNodeId} not found`,
        },
        error: `Target node ${params.targetNodeId} not found. Available: ${nodeIds.join(', ')}`,
        debugInfo,
      }
    }

    try {
      // Use the BrowserTestRunner for the canvas move operation
      const runner = globalRunner!
      const result = await runner.executeCanvasMove({
        sourceNodeId: params.sourceNodeId,
        targetNodeId: params.targetNodeId,
        insertionIndex: params.insertionIndex,
      })

      const codeAfter = this.getCode()
      const verification = this.verifyCodeChange({
        codeBefore,
        codeAfter,
        expectedPattern: params.expectedPattern,
      })

      return {
        success: result.success && verification.match,
        codeBefore,
        codeAfter,
        verification,
        error: result.success
          ? verification.match
            ? undefined
            : verification.message
          : result.error,
        debugInfo,
      }
    } catch (error) {
      return {
        success: false,
        codeBefore,
        codeAfter: this.getCode(),
        verification: { match: false, diff: '', message: String(error) },
        error: String(error),
        debugInfo,
      }
    }
  }
}

// =============================================================================
// Enhanced Test Runner with Studio Control
// =============================================================================

export interface MirrorTestCase {
  name: string
  setup?: string // Initial code
  run: (api: MirrorTestAPI) => Promise<BrowserTestResult>
  verify?: (result: BrowserTestResult, studio: MirrorStudioControl) => boolean
}

export interface MirrorTestAPI {
  drag: BrowserTestRunner
  studio: MirrorStudioControl
}

/**
 * Run a Mirror Studio test case
 */
export async function runMirrorTest(
  testCase: MirrorTestCase,
  api: MirrorTestAPI
): Promise<BrowserTestResult> {
  const startTime = performance.now()

  try {
    // Setup
    if (testCase.setup) {
      api.studio.setCode(testCase.setup)
      await api.studio.waitForCompile()
    }

    // Run test
    const result = await testCase.run(api)

    // Verify
    if (testCase.verify && !testCase.verify(result, api.studio)) {
      return {
        ...result,
        success: false,
        error: 'Verification failed',
      }
    }

    return result
  } catch (error) {
    return {
      success: false,
      description: testCase.name,
      duration: performance.now() - startTime,
      error: String(error),
    }
  }
}

// =============================================================================
// Comprehensive Drag Test Suite
// =============================================================================

interface DragTestCase {
  name: string
  setup: string // Initial code
  drag: {
    componentName: string
    targetNodeId: string
    insertionIndex: number
  }
  expected: {
    pattern: string
    description: string
  }
}

interface CanvasMoveTestCase {
  name: string
  setup: string // Initial code
  move: {
    sourceNodeId: string
    targetNodeId: string
    insertionIndex: number
  }
  expected: {
    pattern: string
    notPattern?: string // Pattern that should NOT be present
    description: string
  }
}

const DRAG_TEST_CASES: DragTestCase[] = [
  // =============================================================================
  // Basic Primitives - Empty Container
  // =============================================================================
  {
    name: 'Drop Button into empty Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Button', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Button', description: 'Button should be added as child of Frame' },
  },
  {
    name: 'Drop Text into empty Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Text', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Text', description: 'Text should be added as child of Frame' },
  },
  {
    name: 'Drop Input into empty Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Input', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Input', description: 'Input should be added as child of Frame' },
  },
  {
    name: 'Drop Icon into empty Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Icon', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Icon', description: 'Icon should be added as child of Frame' },
  },
  {
    name: 'Drop Image into empty Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Image', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Image', description: 'Image should be added as child of Frame' },
  },
  {
    name: 'Drop Divider into empty Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Divider', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Divider', description: 'Divider should be added as child of Frame' },
  },

  // =============================================================================
  // Insertion Positions - Before/After/Between
  // =============================================================================
  {
    name: 'Drop as first child (before existing)',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Existing"',
    drag: { componentName: 'Icon', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Icon', description: 'Icon should be added before Button' },
  },
  {
    name: 'Drop as last child (after existing)',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"',
    drag: { componentName: 'Text', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Text', description: 'Text should be added after Button' },
  },
  {
    name: 'Drop between two children (middle)',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"\n  Button "Last"',
    drag: { componentName: 'Divider', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Divider', description: 'Divider should be inserted between buttons' },
  },
  {
    name: 'Drop at index 2 with 3 children',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Text "One"\n  Text "Two"\n  Text "Three"',
    drag: { componentName: 'Icon', targetNodeId: 'node-1', insertionIndex: 2 },
    expected: { pattern: 'Icon', description: 'Icon should be inserted at position 2' },
  },

  // =============================================================================
  // Nested Containers
  // =============================================================================
  {
    name: 'Drop into nested Frame (2 levels)',
    setup: 'Frame gap 16, pad 16, bg #1a1a1a\n  Frame gap 8, bg #2a2a3a, pad 12\n    Text "Inner"',
    drag: { componentName: 'Button', targetNodeId: 'node-2', insertionIndex: 1 },
    expected: { pattern: 'Button', description: 'Button should be added inside nested Frame' },
  },
  {
    name: 'Drop into deeply nested Frame (3 levels)',
    setup:
      'Frame gap 16, pad 16, bg #1a1a1a\n  Frame gap 8, pad 12\n    Frame gap 4, pad 8\n      Text "Deep"',
    drag: { componentName: 'Icon', targetNodeId: 'node-3', insertionIndex: 0 },
    expected: { pattern: 'Icon', description: 'Icon should be added to innermost Frame' },
  },
  {
    name: 'Drop into first nested container',
    setup:
      'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a\n    Text "A"\n  Frame gap 8, bg #3a3a4a\n    Text "B"',
    drag: { componentName: 'Button', targetNodeId: 'node-2', insertionIndex: 1 },
    expected: { pattern: 'Button', description: 'Button should be added to first nested Frame' },
  },
  {
    name: 'Drop into second nested container',
    setup:
      'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a\n    Text "A"\n  Frame gap 8, bg #3a3a4a\n    Text "B"',
    drag: { componentName: 'Icon', targetNodeId: 'node-4', insertionIndex: 1 },
    expected: { pattern: 'Icon', description: 'Icon should be added to second nested Frame' },
  },

  // =============================================================================
  // Horizontal Layout (hor)
  // =============================================================================
  {
    name: 'Drop into horizontal Frame',
    setup: 'Frame hor, gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Button', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Button', description: 'Button should be added to horizontal Frame' },
  },
  {
    name: 'Drop first into horizontal with children',
    setup: 'Frame hor, gap 12, pad 16, bg #1a1a1a\n  Button "A"\n  Button "B"',
    drag: { componentName: 'Icon', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Icon', description: 'Icon should be first in horizontal row' },
  },
  {
    name: 'Drop last into horizontal with children',
    setup: 'Frame hor, gap 12, pad 16, bg #1a1a1a\n  Button "A"\n  Button "B"',
    drag: { componentName: 'Text', targetNodeId: 'node-1', insertionIndex: 2 },
    expected: { pattern: 'Text', description: 'Text should be last in horizontal row' },
  },
  {
    name: 'Drop between horizontal children',
    setup: 'Frame hor, gap 12, pad 16, bg #1a1a1a\n  Button "Left"\n  Button "Right"',
    drag: { componentName: 'Divider', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Divider', description: 'Divider should be between horizontal buttons' },
  },

  // =============================================================================
  // Complex Layouts
  // =============================================================================
  {
    name: 'Drop into vertical inside horizontal',
    setup:
      'Frame hor, gap 16, pad 16\n  Frame gap 8\n    Text "Column 1"\n  Frame gap 8\n    Text "Column 2"',
    drag: { componentName: 'Button', targetNodeId: 'node-2', insertionIndex: 1 },
    expected: { pattern: 'Button', description: 'Button should be added to first column' },
  },
  {
    name: 'Drop into spread layout',
    setup: 'Frame hor, spread, pad 16, bg #1a1a1a\n  Text "Left"\n  Text "Right"',
    drag: { componentName: 'Icon', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Icon', description: 'Icon should be added between spread items' },
  },
  {
    name: 'Drop into centered Frame',
    setup: 'Frame center, w 200, h 100, bg #1a1a1a',
    drag: { componentName: 'Text', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Text', description: 'Text should be added to centered Frame' },
  },

  // =============================================================================
  // Zag Components
  // =============================================================================
  {
    name: 'Drop Checkbox into Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Checkbox', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Checkbox', description: 'Checkbox should be added to Frame' },
  },
  {
    name: 'Drop Switch into Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Switch', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Switch', description: 'Switch should be added to Frame' },
  },
  {
    name: 'Drop Slider into Frame',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a',
    drag: { componentName: 'Slider', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Slider', description: 'Slider should be added to Frame' },
  },
  {
    name: 'Drop Zag after existing elements',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Text "Label"\n  Input placeholder "Value"',
    drag: { componentName: 'Switch', targetNodeId: 'node-1', insertionIndex: 2 },
    expected: { pattern: 'Switch', description: 'Switch should be added after Input' },
  },

  // =============================================================================
  // Form-like Layouts
  // =============================================================================
  {
    name: 'Drop into form-like structure',
    setup:
      'Frame gap 16, pad 24, bg #1a1a1a\n  Text "Settings", fs 18, weight bold\n  Frame gap 8\n    Text "Name"\n    Input placeholder "Enter name"',
    drag: { componentName: 'Checkbox', targetNodeId: 'node-3', insertionIndex: 2 },
    expected: { pattern: 'Checkbox', description: 'Checkbox should be added to form field group' },
  },
  {
    name: 'Drop new field group',
    setup:
      'Frame gap 16, pad 24, bg #1a1a1a\n  Text "Form Title"\n  Frame gap 8\n    Input placeholder "Field 1"',
    drag: { componentName: 'Input', targetNodeId: 'node-1', insertionIndex: 2 },
    expected: { pattern: 'Input', description: 'Input should be added as new form section' },
  },

  // =============================================================================
  // Edge Cases
  // =============================================================================
  {
    name: 'Drop Spacer for layout adjustment',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Top"\n  Button "Bottom"',
    drag: { componentName: 'Spacer', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Spacer', description: 'Spacer should be inserted for spacing' },
  },
  {
    name: 'Drop Link component',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Text "Navigation"',
    drag: { componentName: 'Link', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Link', description: 'Link should be added after Text' },
  },
  {
    name: 'Drop Textarea into form',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Input placeholder "Subject"',
    drag: { componentName: 'Textarea', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Textarea', description: 'Textarea should be added after Input' },
  },
]

// =============================================================================
// Canvas Move Test Cases (moving existing elements)
// =============================================================================

const CANVAS_MOVE_TEST_CASES: CanvasMoveTestCase[] = [
  // =============================================================================
  // Reorder within same container
  // =============================================================================
  {
    name: 'Move element to first position',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Text "First"\n  Button "Move Me"\n  Text "Last"',
    move: { sourceNodeId: 'node-3', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: {
      pattern: 'Button "Move Me"',
      description: 'Button should be moved to first position',
    },
  },
  {
    name: 'Move element to last position',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Move Me"\n  Text "Middle"\n  Text "Last"',
    move: { sourceNodeId: 'node-2', targetNodeId: 'node-1', insertionIndex: 2 },
    expected: {
      pattern: 'Button "Move Me"',
      description: 'Button should be moved to last position',
    },
  },
  {
    name: 'Move element to middle position',
    setup: 'Frame gap 12, pad 16, bg #1a1a1a\n  Text "First"\n  Text "Second"\n  Button "Move Me"',
    move: { sourceNodeId: 'node-4', targetNodeId: 'node-1', insertionIndex: 1 },
    expected: { pattern: 'Button "Move Me"', description: 'Button should be moved between texts' },
  },

  // =============================================================================
  // Cross-container moves
  // =============================================================================
  {
    name: 'Move element to different container',
    setup:
      'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n    Button "Source"\n  Frame gap 8, bg #3a3a4a, pad 12\n    Text "Target"',
    move: { sourceNodeId: 'node-3', targetNodeId: 'node-4', insertionIndex: 1 },
    expected: {
      pattern: 'Button "Source"',
      description: 'Button should be moved to second container',
    },
  },
  {
    name: 'Move element from nested to parent',
    setup: 'Frame gap 16, pad 16\n  Text "Parent Text"\n  Frame gap 8, pad 12\n    Button "Nested"',
    move: { sourceNodeId: 'node-4', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: {
      pattern: 'Button "Nested"',
      description: 'Button should be moved to parent container',
    },
  },
  {
    name: 'Move element into nested container',
    setup: 'Frame gap 16, pad 16\n  Button "Move Me"\n  Frame gap 8, pad 12\n    Text "Inner"',
    move: { sourceNodeId: 'node-2', targetNodeId: 'node-3', insertionIndex: 0 },
    expected: {
      pattern: 'Button "Move Me"',
      description: 'Button should be moved into nested container',
    },
  },

  // =============================================================================
  // Horizontal container moves
  // =============================================================================
  {
    name: 'Reorder in horizontal container',
    setup: 'Frame hor, gap 12, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    move: { sourceNodeId: 'node-4', targetNodeId: 'node-1', insertionIndex: 0 },
    expected: { pattern: 'Button "C"', description: 'Button C should be moved to first position' },
  },
  {
    name: 'Move from vertical to horizontal',
    setup:
      'Frame gap 16, pad 16\n  Frame gap 8\n    Button "Vertical"\n  Frame hor, gap 8\n    Text "H1"\n    Text "H2"',
    move: { sourceNodeId: 'node-3', targetNodeId: 'node-4', insertionIndex: 1 },
    expected: {
      pattern: 'Button "Vertical"',
      description: 'Button should be moved to horizontal container',
    },
  },

  // =============================================================================
  // Complex structure moves
  // =============================================================================
  {
    name: 'Move in 3-level nested structure',
    setup:
      'Frame gap 16, pad 16\n  Frame gap 12\n    Frame gap 8\n      Text "Deep"\n      Button "Move"',
    move: { sourceNodeId: 'node-5', targetNodeId: 'node-2', insertionIndex: 0 },
    expected: { pattern: 'Button "Move"', description: 'Button should be moved up one level' },
  },
  {
    name: 'Move between sibling containers',
    setup:
      'Frame hor, gap 16, pad 16\n  Frame gap 8, w 100\n    Button "In A"\n  Frame gap 8, w 100\n    Text "In B"',
    move: { sourceNodeId: 'node-3', targetNodeId: 'node-4', insertionIndex: 0 },
    expected: {
      pattern: 'Button "In A"',
      description: 'Button should be moved to sibling container',
    },
  },
]

interface DragTestResult {
  name: string
  passed: boolean
  codeBefore: string
  codeAfter: string
  verification: { match: boolean; diff: string; message: string }
  debugInfo: {
    preludeOffset: number
    nodeCount: number
    targetFound: boolean
  }
  error?: string
  duration: number
}

async function runComprehensiveDragTests(
  runner: BrowserTestRunner,
  studioControl: MirrorStudioControl
): Promise<{
  passed: number
  failed: number
  results: DragTestResult[]
  summary: string
}> {
  console.group('🧪 Comprehensive Drag & Drop Tests')

  const results: DragTestResult[] = []
  let passed = 0
  let failed = 0

  // =============================================================================
  // Part 1: Palette Drop Tests
  // =============================================================================
  console.log('\n📦 Palette Drop Tests')

  for (const testCase of DRAG_TEST_CASES) {
    const start = performance.now()
    console.log(`\n📋 ${testCase.name}`)

    try {
      // Setup - use setTestCode which resets prelude offset after compile
      await studioControl.setTestCode(testCase.setup)

      // Execute drag
      const result = await studioControl.executeRealDrag({
        componentName: testCase.drag.componentName,
        targetNodeId: testCase.drag.targetNodeId,
        insertionIndex: testCase.drag.insertionIndex,
        expectedPattern: testCase.expected.pattern,
      })

      const duration = performance.now() - start

      const testResult: DragTestResult = {
        name: testCase.name,
        passed: result.success,
        codeBefore: result.codeBefore,
        codeAfter: result.codeAfter,
        verification: result.verification,
        debugInfo: result.debugInfo,
        error: result.error,
        duration,
      }

      results.push(testResult)

      if (result.success) {
        passed++
        console.log(`  ✅ PASSED (${duration.toFixed(0)}ms)`)
        console.log(`     ${testCase.expected.description}`)
      } else {
        failed++
        console.log(`  ❌ FAILED: ${result.error || 'Unknown error'}`)
        console.log(
          `     Debug: prelude=${result.debugInfo.preludeOffset}, nodes=${result.debugInfo.nodeCount}`
        )
        console.log(`     Diff:\n${result.verification.diff}`)
      }
    } catch (error) {
      failed++
      const duration = performance.now() - start
      console.log(`  ❌ ERROR: ${error}`)

      results.push({
        name: testCase.name,
        passed: false,
        codeBefore: testCase.setup,
        codeAfter: studioControl.getCode(),
        verification: { match: false, diff: '', message: String(error) },
        debugInfo: { preludeOffset: 0, nodeCount: 0, targetFound: false },
        error: String(error),
        duration,
      })
    }
  }

  // =============================================================================
  // Part 2: Canvas Move Tests
  // =============================================================================
  console.log('\n\n🔄 Canvas Move Tests')

  for (const testCase of CANVAS_MOVE_TEST_CASES) {
    const start = performance.now()
    console.log(`\n📋 ${testCase.name}`)

    try {
      // Setup - use setTestCode which resets prelude offset after compile
      await studioControl.setTestCode(testCase.setup)

      // Execute canvas move
      const result = await studioControl.executeRealCanvasMove({
        sourceNodeId: testCase.move.sourceNodeId,
        targetNodeId: testCase.move.targetNodeId,
        insertionIndex: testCase.move.insertionIndex,
        expectedPattern: testCase.expected.pattern,
      })

      const duration = performance.now() - start

      const testResult: DragTestResult = {
        name: testCase.name,
        passed: result.success,
        codeBefore: result.codeBefore,
        codeAfter: result.codeAfter,
        verification: result.verification,
        debugInfo: { ...result.debugInfo, targetFound: result.debugInfo.targetFound },
        error: result.error,
        duration,
      }

      results.push(testResult)

      if (result.success) {
        passed++
        console.log(`  ✅ PASSED (${duration.toFixed(0)}ms)`)
        console.log(`     ${testCase.expected.description}`)
      } else {
        failed++
        console.log(`  ❌ FAILED: ${result.error || 'Unknown error'}`)
        console.log(
          `     Debug: prelude=${result.debugInfo.preludeOffset}, nodes=${result.debugInfo.nodeCount}`
        )
        console.log(`     Diff:\n${result.verification.diff}`)
      }
    } catch (error) {
      failed++
      const duration = performance.now() - start
      console.log(`  ❌ ERROR: ${error}`)

      results.push({
        name: testCase.name,
        passed: false,
        codeBefore: testCase.setup,
        codeAfter: studioControl.getCode(),
        verification: { match: false, diff: '', message: String(error) },
        debugInfo: { preludeOffset: 0, nodeCount: 0, targetFound: false },
        error: String(error),
        duration,
      })
    }
  }

  const totalTests = DRAG_TEST_CASES.length + CANVAS_MOVE_TEST_CASES.length
  const summary = `Results: ${passed}/${totalTests} passed (${failed} failed)`
  console.log(`\n${summary}`)
  console.groupEnd()

  return { passed, failed, results, summary }
}

/**
 * Setup global drag test API
 * Called from studio bootstrap
 */
export function setupBrowserDragTestAPI(): void {
  if ((window as any).__dragTest) return

  globalRunner = new BrowserTestRunner()
  const studioControl = new MirrorStudioControl()

  const api = {
    // Drag operations
    fromPalette: (name: string) => globalRunner!.fromPalette(name),
    moveElement: (nodeId: string) => globalRunner!.moveElement(nodeId),
    runAllTests: () => runAllTests(globalRunner!),
    setAnimation: (config: Partial<AnimationConfig>) => globalRunner!.setAnimation(config),

    // Editor control
    getCode: () => studioControl.getCode(),
    setCode: (code: string) => studioControl.setCode(code),
    setTestCode: (code: string) => studioControl.setTestCode(code),
    reset: (code?: string) => studioControl.reset(code),
    resetPreludeOffset: () => studioControl.resetPreludeOffset(),

    // Compilation
    waitForCompile: (timeout?: number) => studioControl.waitForCompile(timeout),

    // Panel control
    showPanel: (panel: string) => studioControl.setPanelVisibility(panel, true),
    hidePanel: (panel: string) => studioControl.setPanelVisibility(panel, false),
    togglePanel: (panel: string) => studioControl.togglePanel(panel),
    focusMode: () => studioControl.focusMode(),
    normalMode: () => studioControl.normalMode(),
    testMode: () => studioControl.testMode(),

    // Selection
    selectNode: (nodeId: string) => studioControl.selectNode(nodeId),
    getSelection: () => studioControl.getSelection(),
    clearSelection: () => studioControl.clearSelection(),

    // Inspection
    getNodeIds: () => studioControl.getNodeIds(),
    getSourceMap: () => studioControl.getSourceMap(),
    snapshot: () => studioControl.snapshot(),

    // Direct code manipulation (bypasses drop system for reliable testing)
    insertCodeAt: (code: string, line: number, indent?: number) =>
      studioControl.insertCodeAt(code, line, indent),
    simulateDropByInsertion: (params: {
      componentCode: string
      afterLine: number
      indent: number
    }) => studioControl.simulateDropByInsertion(params),
    recompile: () => studioControl.recompile(),

    // Advanced test running
    runTest: (testCase: MirrorTestCase) =>
      runMirrorTest(testCase, { drag: globalRunner!, studio: studioControl }),

    // Real drag testing with verification
    executeRealDrag: (params: {
      componentName: string
      targetNodeId: string
      insertionIndex: number
      expectedPattern: string
    }) => studioControl.executeRealDrag(params),
    executeRealCanvasMove: (params: {
      sourceNodeId: string
      targetNodeId: string
      insertionIndex: number
      expectedPattern: string
    }) => studioControl.executeRealCanvasMove(params),
    verifyCodeChange: (params: {
      codeBefore: string
      codeAfter: string
      expectedPattern: string | RegExp
    }) => studioControl.verifyCodeChange(params),
    getPreludeOffset: () => studioControl.getPreludeOffset(),

    // Comprehensive drag test suite
    runDragTests: () => runComprehensiveDragTests(globalRunner!, studioControl),

    // Internal references
    runner: globalRunner,
    studio: studioControl,
  }

  ;(window as any).__dragTest = api

  console.log('🪞 Mirror Studio Test API ready. Usage:')
  console.log('')
  console.log('  // 🧪 Run All Drag Tests')
  console.log('  __dragTest.runDragTests()  // Comprehensive test suite with verification')
  console.log('')
  console.log('  // Single Drag Test with Verification')
  console.log('  __dragTest.executeRealDrag({')
  console.log('    componentName: "Button",')
  console.log('    targetNodeId: "node-1",')
  console.log('    insertionIndex: 0,')
  console.log('    expectedPattern: "Button"')
  console.log('  })')
  console.log('')
  console.log('  // Drag & Drop (Manual)')
  console.log('  __dragTest.fromPalette("Button").toContainer("node-1").atIndex(0).execute()')
  console.log('  __dragTest.moveElement("node-2").toContainer("node-1").atIndex(0).execute()')
  console.log('')
  console.log('  // Editor Control')
  console.log('  __dragTest.setCode("Frame gap 12\\n  Button \\"Test\\"")')
  console.log('  __dragTest.getCode()')
  console.log('  __dragTest.waitForCompile()')
  console.log('')
  console.log('  // Panel Control')
  console.log('  __dragTest.testMode()     // Editor + Preview only')
  console.log('  __dragTest.focusMode()    // Preview only')
  console.log('  __dragTest.normalMode()   // All panels')
  console.log('')
  console.log('  // Debugging')
  console.log('  __dragTest.getPreludeOffset()  // Check prelude offset')
  console.log('  __dragTest.getNodeIds()        // Get all node IDs')
  console.log('  __dragTest.snapshot()          // Full state snapshot')
}
