/**
 * MirrorStudioControl — high-level test API for editor + preview + property panel
 *
 * Wraps the legacy globals (window.editor, window.__mirrorStudio__,
 * window.__compileTestCode) behind a single class so test code stays
 * stable while those globals are migrated out of app.js.
 */

import type {
  ExtractedElementInfo,
  ExtractedPropertyInfo,
  PropertyModificationResult,
  TokenInfo,
} from './test-api-types'
import type { BrowserTestRunner } from './test-runner'
import type { Point } from './types'

export class MirrorStudioControl {
  /**
   * Optional drag runner — wired by setupBrowserDragTestAPI so the
   * executeReal* methods can drive real drag flows.
   */
  private runner: BrowserTestRunner | null = null

  setRunner(runner: BrowserTestRunner): void {
    this.runner = runner
  }

  private requireRunner(): BrowserTestRunner {
    if (!this.runner) {
      throw new Error(
        'MirrorStudioControl: runner not set. Wire it via setRunner() (setupBrowserDragTestAPI does this).'
      )
    }
    return this.runner
  }

  /**
   * Set editor code content
   * Note: You should call resetPreludeOffset() AFTER waitForCompile()
   * since compile will re-set the prelude offset from file system
   */
  setCode(code: string): void {
    const editor = window.editor
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
    const editor = window.editor
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
    const compileTestCode = window.__compileTestCode
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
    const events = window.__mirrorStudio__?.events
    if (events) {
      // Trigger recompile
      const code = this.getCode()
      events.emit('source:changed', { source: code, origin: 'external' })
      await this.waitForCompile()
    }
  }

  /**
   * Show/hide panels
   */
  setPanelVisibility(panel: string, visible: boolean): void {
    const actions = window.__mirrorStudio__?.actions
    if (actions?.setPanelVisibility) {
      actions.setPanelVisibility(panel as never, visible)
    }
  }

  /**
   * Toggle a panel
   */
  togglePanel(panel: string): void {
    const actions = window.__mirrorStudio__?.actions
    if (actions?.togglePanelVisibility) {
      actions.togglePanelVisibility(panel as never)
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
    const studio = window.__mirrorStudio__
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
    const studio = window.__mirrorStudio__
    return studio?.state?.get()?.selection?.nodeId ?? null
  }

  /**
   * Clear selection
   */
  clearSelection(): void {
    const studio = window.__mirrorStudio__
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
    const studio = window.__mirrorStudio__
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
    const editor = window.editor
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
    const studio = window.__mirrorStudio__
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
    const setOffset = window.__setPreludeOffset
    if (setOffset) {
      setOffset(0)
    } else {
      // Fallback: try just setting state
      const studio = window.__mirrorStudio__
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
   * Verify that x/y position in code matches expected range
   * Finds the LAST x/y occurrence (newly added element)
   */
  verifyPositionInCode(params: {
    codeAfter: string
    expectedX: number
    expectedY: number
    tolerance?: number
  }): { match: boolean; actualX: number | null; actualY: number | null; message: string } {
    const tolerance = params.tolerance ?? 20

    // Match ALL x and y properties, use the LAST one (newly added element)
    const xMatches = [...params.codeAfter.matchAll(/\bx\s+(\d+)/gi)]
    const yMatches = [...params.codeAfter.matchAll(/\by\s+(\d+)/gi)]

    const lastXMatch = xMatches.length > 0 ? xMatches[xMatches.length - 1] : null
    const lastYMatch = yMatches.length > 0 ? yMatches[yMatches.length - 1] : null

    const actualX = lastXMatch ? parseInt(lastXMatch[1], 10) : null
    const actualY = lastYMatch ? parseInt(lastYMatch[1], 10) : null

    const xOk = actualX !== null && Math.abs(actualX - params.expectedX) <= tolerance
    const yOk = actualY !== null && Math.abs(actualY - params.expectedY) <= tolerance

    const match = xOk && yOk

    let message: string
    if (match) {
      message = `Position OK: x=${actualX} (expected ~${params.expectedX}), y=${actualY} (expected ~${params.expectedY})`
    } else if (actualX === null || actualY === null) {
      message = `Position NOT found in code. Found: x=${actualX}, y=${actualY}`
    } else {
      message = `Position mismatch: x=${actualX} (expected ${params.expectedX}±${tolerance}), y=${actualY} (expected ${params.expectedY}±${tolerance})`
    }

    return { match, actualX, actualY, message }
  }

  /**
   * Execute a real drag operation for stacked/absolute positioning
   */
  async executeRealStackedDrag(params: {
    componentName: string
    targetNodeId: string
    position: Point
    expectedXRange: [number, number]
    expectedYRange: [number, number]
  }): Promise<{
    success: boolean
    codeBefore: string
    codeAfter: string
    positionVerification: {
      match: boolean
      actualX: number | null
      actualY: number | null
      message: string
    }
    selectionAfter: string | null
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
        positionVerification: {
          match: false,
          actualX: null,
          actualY: null,
          message: `Target ${params.targetNodeId} not found`,
        },
        selectionAfter: null,
        error: `Target node ${params.targetNodeId} not found. Available: ${nodeIds.join(', ')}`,
        debugInfo,
      }
    }

    try {
      // Use the BrowserTestRunner for the drag operation
      const runner = this.requireRunner()
      const result = await runner.executePaletteDropAbsolute({
        componentName: params.componentName,
        targetNodeId: params.targetNodeId,
        position: params.position,
      })

      const codeAfter = this.getCode()

      // Calculate expected center from range
      const expectedX = (params.expectedXRange[0] + params.expectedXRange[1]) / 2
      const expectedY = (params.expectedYRange[0] + params.expectedYRange[1]) / 2
      const toleranceX = (params.expectedXRange[1] - params.expectedXRange[0]) / 2
      const toleranceY = (params.expectedYRange[1] - params.expectedYRange[0]) / 2
      const tolerance = Math.max(toleranceX, toleranceY)

      const positionVerification = this.verifyPositionInCode({
        codeAfter,
        expectedX,
        expectedY,
        tolerance,
      })

      // Get selection after drop
      const selectionAfter = this.getSelection()

      return {
        success: result.success && positionVerification.match,
        codeBefore,
        codeAfter,
        positionVerification,
        selectionAfter,
        error: result.success
          ? positionVerification.match
            ? undefined
            : positionVerification.message
          : result.error,
        debugInfo,
      }
    } catch (error) {
      return {
        success: false,
        codeBefore,
        codeAfter: this.getCode(),
        positionVerification: {
          match: false,
          actualX: null,
          actualY: null,
          message: String(error),
        },
        selectionAfter: null,
        error: String(error),
        debugInfo,
      }
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
    selectionAfter: string | null
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
        selectionAfter: null,
        error: `Target node ${params.targetNodeId} not found. Available: ${nodeIds.join(', ')}`,
        debugInfo,
      }
    }

    try {
      // Use the BrowserTestRunner for the drag operation
      const runner = this.requireRunner()
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

      // Get selection after drop
      const selectionAfter = this.getSelection()

      return {
        success: result.success && verification.match,
        codeBefore,
        codeAfter,
        verification,
        selectionAfter,
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
        selectionAfter: null,
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
    selectionAfter: string | null
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
        selectionAfter: null,
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
        selectionAfter: null,
        error: `Target node ${params.targetNodeId} not found. Available: ${nodeIds.join(', ')}`,
        debugInfo,
      }
    }

    try {
      // Use the BrowserTestRunner for the canvas move operation
      const runner = this.requireRunner()
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

      // Get selection after move
      const selectionAfter = this.getSelection()

      return {
        success: result.success && verification.match,
        codeBefore,
        codeAfter,
        verification,
        selectionAfter,
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
        selectionAfter: null,
        error: String(error),
        debugInfo,
      }
    }
  }

  // ===========================================================================
  // Property Panel Control
  // ===========================================================================

  /**
   * Get the property panel instance
   */
  private getPropertyPanel(): any {
    const studio = window.__mirrorStudio__
    return studio?.propertyPanel ?? null
  }

  /**
   * Get extracted element for a node ID
   * Returns all properties, categories, and metadata
   */
  getElement(nodeId: string): ExtractedElementInfo | null {
    const studio = window.__mirrorStudio__
    const studioState = studio?.state?.get()

    if (!studioState?.ast || !studioState?.sourceMap) {
      return null
    }

    // Create PropertyExtractor from current AST and SourceMap
    // Note: The browser bundle uses 'MirrorLang' as the global name (see tsup.config.ts)
    const PropertyExtractor = window.MirrorLang?.PropertyExtractor
    if (!PropertyExtractor) {
      // Fallback: try to get from property panel
      const panel = studio?.propertyPanel
      if (panel?.getCurrentElement) {
        const current = panel.getCurrentElement()
        if (current?.nodeId === nodeId) {
          return this.formatElement(current)
        }
      }
      return null
    }

    const extractor = new PropertyExtractor(studioState.ast, studioState.sourceMap)
    const element = extractor.getProperties(nodeId)
    if (!element) return null

    return this.formatElement(element)
  }

  /**
   * Format an ExtractedElement to ExtractedElementInfo
   */
  private formatElement(element: any): ExtractedElementInfo {
    return {
      nodeId: element.nodeId,
      // nodeName is the component/primitive name (Frame, Button, etc.)
      nodeName: element.componentName,
      componentName: element.componentName,
      isDefinition: element.isDefinition ?? false,
      isTemplateInstance: element.isTemplateInstance ?? false,
      categories: (element.categories || []).map((cat: any) => ({
        name: cat.name,
        label: cat.label,
        properties: (cat.properties || []).map((prop: any) => ({
          name: prop.name,
          value: prop.value,
          hasValue: prop.hasValue,
          isToken: prop.isToken,
          tokenRef: prop.tokenRef,
        })),
      })),
      allProperties: (element.allProperties || []).map((prop: any) => ({
        name: prop.name,
        value: prop.value,
        hasValue: prop.hasValue,
        isToken: prop.isToken,
        tokenRef: prop.tokenRef,
      })),
    }
  }

  /**
   * Get a specific property value for a node
   */
  getPropertyValue(nodeId: string, propertyName: string): string | null {
    const element = this.getElement(nodeId)
    if (!element) return null

    const prop = element.allProperties.find(p => p.name === propertyName)
    return prop?.hasValue ? prop.value : null
  }

  /**
   * Check if a property is set on a node
   */
  hasProperty(nodeId: string, propertyName: string): boolean {
    const element = this.getElement(nodeId)
    if (!element) return false

    const prop = element.allProperties.find(p => p.name === propertyName)
    return prop?.hasValue ?? false
  }

  /**
   * Set a property value on a node
   * Returns modification result with success status and new source
   */
  async setProperty(
    nodeId: string,
    propertyName: string,
    value: string
  ): Promise<PropertyModificationResult> {
    const studio = window.__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      const result = modifier.setProperty(nodeId, propertyName, value)

      if (result.success && result.newSource) {
        // Update state and trigger compile
        state.set({ source: result.newSource })
        studio.events?.emit('source:changed', { source: result.newSource, origin: 'external' })
        studio.events?.emit('compile:requested', {})

        // Wait for compile
        await this.waitForCompile()

        return {
          success: true,
          newSource: result.newSource,
          change: result.change,
        }
      }

      return { success: false, error: result.error || 'Unknown error' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Remove a property from a node
   */
  async removeProperty(nodeId: string, propertyName: string): Promise<PropertyModificationResult> {
    const studio = window.__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      const result = modifier.removeProperty(nodeId, propertyName)

      if (result.success && result.newSource) {
        state.set({ source: result.newSource })
        studio.events?.emit('source:changed', { source: result.newSource, origin: 'external' })
        studio.events?.emit('compile:requested', {})

        await this.waitForCompile()

        return {
          success: true,
          newSource: result.newSource,
          change: result.change,
        }
      }

      return { success: false, error: result.error || 'Unknown error' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Toggle a boolean property (add or remove)
   */
  async toggleProperty(
    nodeId: string,
    propertyName: string,
    enabled: boolean
  ): Promise<PropertyModificationResult> {
    const studio = window.__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      const result = modifier.toggleProperty(nodeId, propertyName, enabled)

      if (result.success && result.newSource) {
        state.set({ source: result.newSource })
        studio.events?.emit('source:changed', { source: result.newSource, origin: 'external' })
        studio.events?.emit('compile:requested', {})

        await this.waitForCompile()

        return {
          success: true,
          newSource: result.newSource,
          change: result.change,
        }
      }

      return { success: false, error: result.error || 'Unknown error' }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Apply multiple property changes at once
   */
  async batchUpdateProperties(
    nodeId: string,
    changes: Array<{ name: string; value: string; action: 'set' | 'remove' | 'toggle' }>
  ): Promise<PropertyModificationResult> {
    const studio = window.__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      // Apply changes sequentially to ensure proper source updates
      let currentSource = state.get().source
      let lastChange: { from: number; to: number; insert: string } | undefined

      for (const change of changes) {
        // Re-get modifier with updated source
        let result
        if (change.action === 'set') {
          result = modifier.setProperty(nodeId, change.name, change.value)
        } else if (change.action === 'remove') {
          result = modifier.removeProperty(nodeId, change.name)
        } else {
          result = modifier.toggleProperty(nodeId, change.name, change.value === 'true')
        }

        if (!result.success) {
          return {
            success: false,
            error: result.error || `Failed to apply ${change.action} on ${change.name}`,
          }
        }

        if (result.newSource) {
          currentSource = result.newSource
          lastChange = result.change
          // Update state for next change
          state.set({ source: currentSource })
        }
      }

      // Trigger compile after all changes
      studio.events?.emit('source:changed', { source: currentSource, origin: 'external' })
      studio.events?.emit('compile:requested', {})
      await this.waitForCompile()

      return {
        success: true,
        newSource: currentSource,
        change: lastChange,
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  /**
   * Get available color tokens
   */
  getColorTokens(): TokenInfo[] {
    const studio = window.__mirrorStudio__
    const state = studio?.state?.get()
    if (!state?.source) return []

    // Simple token extraction from source
    const tokens: TokenInfo[] = []
    const lines = state.source.split('\n')

    for (const line of lines) {
      // Match: name.bg: #color or name.col: #color
      const match = line.match(/^(\w+)\.(bg|col|boc|ic):\s*(#[a-fA-F0-9]{3,8}|rgba?\([^)]+\))/)
      if (match) {
        tokens.push({
          name: match[1],
          type: match[2] as 'bg' | 'col' | 'boc' | 'ic',
          value: match[3],
          fullName: `${match[1]}.${match[2]}`,
        })
      }
    }

    return tokens
  }

  /**
   * Get available spacing tokens
   */
  getSpacingTokens(): TokenInfo[] {
    const studio = window.__mirrorStudio__
    const state = studio?.state?.get()
    if (!state?.source) return []

    const tokens: TokenInfo[] = []
    const lines = state.source.split('\n')

    for (const line of lines) {
      // Match: name.pad: 12 or name.gap: 8, etc.
      const match = line.match(/^(\w+)\.(pad|gap|mar|rad):\s*(\d+)/)
      if (match) {
        tokens.push({
          name: match[1],
          type: match[2] as 'pad' | 'gap' | 'mar' | 'rad',
          value: match[3],
          fullName: `${match[1]}.${match[2]}`,
        })
      }
    }

    return tokens
  }

  /**
   * Refresh the property panel
   */
  refreshPropertyPanel(): void {
    const panel = this.getPropertyPanel()
    if (panel?.refresh) {
      panel.refresh()
    }
  }

  /**
   * Get the currently displayed element in the property panel
   */
  getCurrentPanelElement(): ExtractedElementInfo | null {
    const panel = this.getPropertyPanel()
    if (!panel) return null

    const element = panel.getCurrentElement?.()
    if (!element) return null

    return {
      nodeId: element.nodeId,
      nodeName: element.nodeName,
      componentName: element.componentName,
      isDefinition: element.isDefinition ?? false,
      isTemplateInstance: element.isTemplateInstance ?? false,
      categories:
        element.categories?.map((cat: any) => ({
          name: cat.name,
          label: cat.label,
          properties:
            cat.properties?.map((prop: any) => ({
              name: prop.name,
              value: prop.value,
              hasValue: prop.hasValue,
              isToken: prop.isToken,
              tokenRef: prop.tokenRef,
            })) ?? [],
        })) ?? [],
      allProperties:
        element.allProperties?.map((prop: any) => ({
          name: prop.name,
          value: prop.value,
          hasValue: prop.hasValue,
          isToken: prop.isToken,
          tokenRef: prop.tokenRef,
        })) ?? [],
    }
  }

  /**
   * Select an element and wait for the property panel to update
   */
  async selectAndInspect(nodeId: string): Promise<ExtractedElementInfo | null> {
    this.selectNode(nodeId)
    await new Promise(resolve => setTimeout(resolve, 100))
    this.refreshPropertyPanel()
    await new Promise(resolve => setTimeout(resolve, 50))
    return this.getElement(nodeId)
  }

  /**
   * Get all properties as a simple key-value map
   */
  getPropertiesMap(nodeId: string): Record<string, string> {
    const element = this.getElement(nodeId)
    if (!element) return {}

    const map: Record<string, string> = {}
    for (const prop of element.allProperties) {
      if (prop.hasValue) {
        map[prop.name] = prop.value
      }
    }
    return map
  }

  /**
   * Get element's primitive type (Frame, Button, Text, etc.)
   */
  getPrimitiveType(nodeId: string): string | null {
    const element = this.getElement(nodeId)
    return element?.nodeName ?? null
  }

  /**
   * Check if element is a component instance
   */
  isComponentInstance(nodeId: string): boolean {
    const element = this.getElement(nodeId)
    return element?.isTemplateInstance ?? false
  }

  /**
   * Check if element is a component definition
   */
  isComponentDefinition(nodeId: string): boolean {
    const element = this.getElement(nodeId)
    return element?.isDefinition ?? false
  }
}
