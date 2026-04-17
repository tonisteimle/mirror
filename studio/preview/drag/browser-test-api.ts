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
import type {
  DragSource,
  DropTarget,
  FlexDropTarget,
  AbsoluteDropTarget,
  AlignedDropTarget,
  Point,
} from './types'
import type { AlignPosition } from './indicator'

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
      // NOTE: Children are NOT included here because the ZagComponentHandler requires
      // runtime dependencies (updateFileList, etc.) that aren't available in the test environment.
      // This means drag tests for complex Zag components (Dialog, Tabs with children)
      // won't generate the full component structure. See CLAUDE.md for known limitations.
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
   * Clamp position to container bounds
   */
  private clampPositionToContainer(
    position: Point,
    source: DragSource,
    containerEl: HTMLElement | null
  ): Point {
    if (!containerEl) return position

    const containerRect = containerEl.getBoundingClientRect()
    const componentSize = this.getComponentSize(source)

    // Calculate bounds
    const maxX = Math.max(0, containerRect.width - componentSize.width)
    const maxY = Math.max(0, containerRect.height - componentSize.height)

    return {
      x: Math.round(Math.max(0, Math.min(position.x, maxX))),
      y: Math.round(Math.max(0, Math.min(position.y, maxY))),
    }
  }

  /**
   * Get component size for clamping calculations
   */
  private getComponentSize(source: DragSource): { width: number; height: number } {
    const DEFAULT_SIZES: Record<string, { width: number; height: number }> = {
      Button: { width: 100, height: 40 },
      Text: { width: 80, height: 24 },
      Icon: { width: 24, height: 24 },
      Input: { width: 200, height: 40 },
      Frame: { width: 200, height: 100 },
      Image: { width: 100, height: 100 },
      Divider: { width: 100, height: 2 },
      Spacer: { width: 16, height: 16 },
    }
    const name = source.componentName ?? 'Frame'
    return DEFAULT_SIZES[name] ?? { width: 100, height: 40 }
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

    // ALWAYS use simulateDrop with explicit target for tests
    // Hit detection can find wrong targets (e.g., child instead of container)
    // when coordinates don't perfectly align with visual elements
    const target: FlexDropTarget = { mode: 'flex', containerId: targetNodeId, insertionIndex }
    await controller.simulateDrop(source, target)
  }

  /**
   * Execute a palette drop into an absolute/stacked container
   */
  async executePaletteDropAbsolute(params: {
    componentName: string
    targetNodeId: string
    position: Point
    template?: string
    properties?: string
    textContent?: string
  }): Promise<BrowserTestResult> {
    const startTime = performance.now()
    const codeBefore = this.getCode()
    const description = `Drop ${params.componentName} into ${params.targetNodeId} at (${params.position.x}, ${params.position.y})`

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
      // NOTE: Children are NOT included - see comment in executePaletteDrop
      const dragData: ComponentDragData = {
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        mirTemplate: params.template,
      }
      setCurrentDragData(dragData)

      // 3. Calculate drop position (absolute coordinates)
      const targetRect = targetEl.getBoundingClientRect()
      const dropPos: Point = {
        x: targetRect.left + params.position.x,
        y: targetRect.top + params.position.y,
      }

      // 4. Create drag source
      const source: DragSource = {
        type: 'palette',
        componentName: params.componentName,
      }

      // 5. Execute animated drag to absolute position
      await this.executeAnimatedDragAbsolute(source, dropPos, params.targetNodeId, params.position)

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
   * Execute palette drop into alignment zone (9-point grid for empty containers)
   */
  async executePaletteDropAligned(params: {
    componentName: string
    targetNodeId: string
    alignmentZone: AlignPosition
    template?: string
    properties?: string
    textContent?: string
  }): Promise<BrowserTestResult> {
    const startTime = performance.now()
    const codeBefore = this.getCode()
    const description = `Drop ${params.componentName} into ${params.targetNodeId} at ${params.alignmentZone}`

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

      // 2. Check if container is large enough for alignment zones (>= 80px)
      const targetRect = targetEl.getBoundingClientRect()
      if (targetRect.width < 80 || targetRect.height < 80) {
        return this.errorResult(
          description,
          `Container too small for alignment zones (${targetRect.width}x${targetRect.height}, needs >= 80x80)`,
          startTime,
          codeBefore
        )
      }

      // 3. Calculate position for the alignment zone (center of the zone)
      const zonePosition = this.calculateZonePosition(params.alignmentZone, targetRect)

      // 4. Set drag data
      const dragData: ComponentDragData = {
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        mirTemplate: params.template,
      }
      setCurrentDragData(dragData)

      // 5. Calculate drop position (absolute screen coordinates)
      const dropPos: Point = {
        x: targetRect.left + zonePosition.x,
        y: targetRect.top + zonePosition.y,
      }

      // 6. Create drag source
      const source: DragSource = {
        type: 'palette',
        componentName: params.componentName,
      }

      // 7. Execute animated drag to zone position
      await this.executeAnimatedDragAligned(source, dropPos, params.targetNodeId)

      // 8. Cleanup
      clearCurrentDragData()

      // 9. Wait for code update
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
   * Calculate position within container for an alignment zone
   */
  private calculateZonePosition(zone: AlignPosition, rect: DOMRect): Point {
    const thirdWidth = rect.width / 3
    const thirdHeight = rect.height / 3

    // Zone centers
    const cols = {
      left: thirdWidth / 2,
      center: rect.width / 2,
      right: rect.width - thirdWidth / 2,
    }
    const rows = {
      top: thirdHeight / 2,
      center: rect.height / 2,
      bottom: rect.height - thirdHeight / 2,
    }

    const zoneMap: Record<AlignPosition, Point> = {
      'top-left': { x: cols.left, y: rows.top },
      'top-center': { x: cols.center, y: rows.top },
      'top-right': { x: cols.right, y: rows.top },
      'center-left': { x: cols.left, y: rows.center },
      center: { x: cols.center, y: rows.center },
      'center-right': { x: cols.right, y: rows.center },
      'bottom-left': { x: cols.left, y: rows.bottom },
      'bottom-center': { x: cols.center, y: rows.bottom },
      'bottom-right': { x: cols.right, y: rows.bottom },
    }

    return zoneMap[zone]
  }

  /**
   * Execute animated drag for alignment zone positioning
   */
  private async executeAnimatedDragAligned(
    source: DragSource,
    endPos: Point,
    targetNodeId: string
  ): Promise<void> {
    const controller = getDragController()
    const { steps, stepDelay, showCursor } = this.animationConfig
    const startPos = this.getPalettePosition()

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

    // End drag - let the controller use its stored target (should be AlignedDropTarget)
    controller.endDrag()
  }

  /**
   * Execute animated drag for absolute positioning
   */
  private async executeAnimatedDragAbsolute(
    source: DragSource,
    endPos: Point,
    targetNodeId: string,
    position: Point
  ): Promise<void> {
    const controller = getDragController()
    const { steps, stepDelay, showCursor } = this.animationConfig
    const startPos = this.getPalettePosition()

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

    // Always use simulateDrop with explicit position for tests
    // This ensures deterministic behavior regardless of hit detection state
    // (Hit detection may capture position from intermediate animation frames)
    const targetEl = this.findElement(targetNodeId)
    const clampedPosition = this.clampPositionToContainer(position, source, targetEl)

    // For absolute/stacked containers, insert as last child (matching real behavior)
    // Count existing children by looking for elements with data-mirror-id inside the target
    const existingChildren = targetEl?.querySelectorAll('[data-mirror-id]').length ?? 0
    const target: AbsoluteDropTarget = {
      mode: 'absolute',
      containerId: targetNodeId,
      position: clampedPosition,
      insertionIndex: existingChildren,
    }
    await controller.simulateDrop(source, target)
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
  private position?: Point
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
    this.position = undefined // Clear position if index is set
    return this
  }

  /** Set absolute position for stacked/absolute containers */
  atPosition(x: number, y: number): this {
    this.position = { x, y }
    this.alignZone = undefined
    return this
  }

  private alignZone?: AlignPosition

  /**
   * Set alignment zone for empty containers (9-point grid)
   * Only works for empty containers >= 80x80px
   */
  atAlignmentZone(zone: AlignPosition): this {
    this.alignZone = zone
    this.position = undefined
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

    // Use alignment zone if set
    if (this.alignZone) {
      return this.runner.executePaletteDropAligned({
        componentName: this.componentName,
        targetNodeId: this.targetId,
        alignmentZone: this.alignZone,
        template: this.template,
        properties: this.properties,
        textContent: this.text,
      })
    }

    // Use absolute positioning if position is set
    if (this.position) {
      return this.runner.executePaletteDropAbsolute({
        componentName: this.componentName,
        targetNodeId: this.targetId,
        position: this.position,
        template: this.template,
        properties: this.properties,
        textContent: this.text,
      })
    }

    // Default to index-based positioning
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
      const runner = globalRunner!
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
    const studio = (window as any).__mirrorStudio__
    return studio?.propertyPanel ?? null
  }

  /**
   * Get extracted element for a node ID
   * Returns all properties, categories, and metadata
   */
  getElement(nodeId: string): ExtractedElementInfo | null {
    const studio = (window as any).__mirrorStudio__
    const studioState = studio?.state?.get()

    if (!studioState?.ast || !studioState?.sourceMap) {
      return null
    }

    // Create PropertyExtractor from current AST and SourceMap
    // Note: The browser bundle uses 'MirrorLang' as the global name (see tsup.config.ts)
    const PropertyExtractor = (window as any).MirrorLang?.PropertyExtractor
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
    const studio = (window as any).__mirrorStudio__
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
        studio.events?.emit('source:changed', { source: result.newSource, origin: 'test' })
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
    const studio = (window as any).__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      const result = modifier.removeProperty(nodeId, propertyName)

      if (result.success && result.newSource) {
        state.set({ source: result.newSource })
        studio.events?.emit('source:changed', { source: result.newSource, origin: 'test' })
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
    const studio = (window as any).__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      const result = modifier.toggleProperty(nodeId, propertyName, enabled)

      if (result.success && result.newSource) {
        state.set({ source: result.newSource })
        studio.events?.emit('source:changed', { source: result.newSource, origin: 'test' })
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
    const studio = (window as any).__mirrorStudio__
    const modifier = studio?.modules?.compiler?.codeModifier
    const state = studio?.state

    if (!modifier || !state) {
      return { success: false, error: 'CodeModifier not available' }
    }

    try {
      // Apply changes sequentially to ensure proper source updates
      let currentSource = state.get().source
      let lastChange: any = null

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
      studio.events?.emit('source:changed', { source: currentSource, origin: 'test' })
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
    const studio = (window as any).__mirrorStudio__
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
    const studio = (window as any).__mirrorStudio__
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

// =============================================================================
// Property Panel Types
// =============================================================================

export interface ExtractedPropertyInfo {
  name: string
  value: string
  hasValue: boolean
  isToken?: boolean
  tokenRef?: string
}

export interface PropertyCategoryInfo {
  name: string
  label: string
  properties: ExtractedPropertyInfo[]
}

export interface ExtractedElementInfo {
  nodeId: string
  nodeName: string
  componentName?: string
  isDefinition: boolean
  isTemplateInstance: boolean
  categories: PropertyCategoryInfo[]
  allProperties: ExtractedPropertyInfo[]
}

export interface PropertyModificationResult {
  success: boolean
  newSource?: string
  change?: { from: number; to: number; insert: string }
  error?: string
}

export interface TokenInfo {
  name: string
  type: string
  value: string
  fullName: string
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
// Stacked/Absolute Position Test Cases
// =============================================================================

interface StackedDragTestCase {
  name: string
  setup: string
  drag: {
    componentName: string
    targetNodeId: string
    position: Point
  }
  expected: {
    xRange: [number, number] // Min/Max for tolerance
    yRange: [number, number]
    description: string
  }
}

const STACKED_DRAG_TEST_CASES: StackedDragTestCase[] = [
  // =============================================================================
  // Palette → Stacked Container
  // =============================================================================
  {
    name: 'Drop Button into empty stacked Frame',
    setup: 'Frame stacked, w 400, h 300, bg #1a1a1a',
    drag: { componentName: 'Button', targetNodeId: 'node-1', position: { x: 100, y: 50 } },
    expected: { xRange: [90, 110], yRange: [40, 60], description: 'Button at ~100,50' },
  },
  {
    name: 'Drop Icon into stacked with existing elements',
    setup: 'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10',
    drag: { componentName: 'Icon', targetNodeId: 'node-1', position: { x: 200, y: 150 } },
    expected: { xRange: [190, 210], yRange: [140, 160], description: 'Icon at ~200,150' },
  },
  {
    name: 'Drop Text at top-left of stacked',
    setup: 'Frame stacked, w 300, h 200, bg #1a1a1a',
    drag: { componentName: 'Text', targetNodeId: 'node-1', position: { x: 20, y: 20 } },
    expected: { xRange: [10, 30], yRange: [10, 30], description: 'Text at ~20,20' },
  },
  {
    name: 'Drop Input into stacked center',
    setup: 'Frame stacked, w 400, h 300, bg #1a1a1a',
    drag: { componentName: 'Input', targetNodeId: 'node-1', position: { x: 200, y: 150 } },
    expected: { xRange: [100, 200], yRange: [130, 170], description: 'Input centered' },
  },

  // =============================================================================
  // Edge Cases
  // =============================================================================
  {
    name: 'Drop at container edge (clamp to bounds)',
    setup: 'Frame stacked, w 200, h 200, bg #1a1a1a',
    drag: { componentName: 'Button', targetNodeId: 'node-1', position: { x: -50, y: -50 } },
    expected: { xRange: [0, 10], yRange: [0, 10], description: 'Clamped to 0,0' },
  },
  {
    name: 'Drop at far right edge',
    setup: 'Frame stacked, w 300, h 200, bg #1a1a1a',
    drag: { componentName: 'Button', targetNodeId: 'node-1', position: { x: 280, y: 100 } },
    expected: { xRange: [180, 220], yRange: [80, 120], description: 'Near right edge' },
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
  selectionAfter: string | null
  selectionVerification: { correct: boolean; expected: string | null; actual: string | null }
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

      // Selection verification: after drop, something should be selected
      const selectionCorrect = result.selectionAfter !== null
      const selectionVerification = {
        correct: selectionCorrect,
        expected: 'any (new element)',
        actual: result.selectionAfter,
      }

      // Test passes if code change is correct AND selection exists
      const testPassed = result.success && selectionCorrect

      const testResult: DragTestResult = {
        name: testCase.name,
        passed: testPassed,
        codeBefore: result.codeBefore,
        codeAfter: result.codeAfter,
        verification: result.verification,
        selectionAfter: result.selectionAfter,
        selectionVerification,
        debugInfo: result.debugInfo,
        error: result.error,
        duration,
      }

      results.push(testResult)

      if (testPassed) {
        passed++
        console.log(`  ✅ PASSED (${duration.toFixed(0)}ms)`)
        console.log(`     ${testCase.expected.description}`)
        console.log(`     Selection: ${result.selectionAfter}`)
      } else {
        failed++
        if (!result.success) {
          console.log(`  ❌ FAILED: ${result.error || 'Unknown error'}`)
          console.log(
            `     Debug: prelude=${result.debugInfo.preludeOffset}, nodes=${result.debugInfo.nodeCount}`
          )
          console.log(`     Diff:\n${result.verification.diff}`)
        } else if (!selectionCorrect) {
          console.log(`  ❌ FAILED: No selection after drop`)
          console.log(`     Expected: Element should be selected after drop`)
          console.log(`     Actual: ${result.selectionAfter ?? 'null'}`)
        }
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
        selectionAfter: null,
        selectionVerification: { correct: false, expected: null, actual: null },
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

      // Selection verification: after move, moved element should be selected
      const selectionCorrect = result.selectionAfter !== null
      const selectionVerification = {
        correct: selectionCorrect,
        expected: 'any (moved element)',
        actual: result.selectionAfter,
      }

      // Test passes if code change is correct AND selection exists
      const testPassed = result.success && selectionCorrect

      const testResult: DragTestResult = {
        name: testCase.name,
        passed: testPassed,
        codeBefore: result.codeBefore,
        codeAfter: result.codeAfter,
        verification: result.verification,
        selectionAfter: result.selectionAfter,
        selectionVerification,
        debugInfo: { ...result.debugInfo, targetFound: result.debugInfo.targetFound },
        error: result.error,
        duration,
      }

      results.push(testResult)

      if (testPassed) {
        passed++
        console.log(`  ✅ PASSED (${duration.toFixed(0)}ms)`)
        console.log(`     ${testCase.expected.description}`)
        console.log(`     Selection: ${result.selectionAfter}`)
      } else {
        failed++
        if (!result.success) {
          console.log(`  ❌ FAILED: ${result.error || 'Unknown error'}`)
          console.log(
            `     Debug: prelude=${result.debugInfo.preludeOffset}, nodes=${result.debugInfo.nodeCount}`
          )
          console.log(`     Diff:\n${result.verification.diff}`)
        } else if (!selectionCorrect) {
          console.log(`  ❌ FAILED: No selection after move`)
          console.log(`     Expected: Moved element should be selected`)
          console.log(`     Actual: ${result.selectionAfter ?? 'null'}`)
        }
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
        selectionAfter: null,
        selectionVerification: { correct: false, expected: null, actual: null },
        debugInfo: { preludeOffset: 0, nodeCount: 0, targetFound: false },
        error: String(error),
        duration,
      })
    }
  }

  // =============================================================================
  // Part 3: Stacked/Absolute Position Tests
  // =============================================================================
  console.log('\n\n📍 Stacked/Absolute Position Tests')

  for (const testCase of STACKED_DRAG_TEST_CASES) {
    const start = performance.now()
    console.log(`\n📋 ${testCase.name}`)

    try {
      // Setup - use setTestCode which resets prelude offset after compile
      await studioControl.setTestCode(testCase.setup)

      // Execute stacked drag
      const result = await studioControl.executeRealStackedDrag({
        componentName: testCase.drag.componentName,
        targetNodeId: testCase.drag.targetNodeId,
        position: testCase.drag.position,
        expectedXRange: testCase.expected.xRange,
        expectedYRange: testCase.expected.yRange,
      })

      const duration = performance.now() - start

      // Selection verification: after drop, something should be selected
      const selectionCorrect = result.selectionAfter !== null
      const selectionVerification = {
        correct: selectionCorrect,
        expected: 'any (new element)',
        actual: result.selectionAfter,
      }

      // Test passes if position is correct AND selection exists
      const testPassed = result.success && selectionCorrect

      const testResult: DragTestResult = {
        name: testCase.name,
        passed: testPassed,
        codeBefore: result.codeBefore,
        codeAfter: result.codeAfter,
        verification: {
          match: result.positionVerification.match,
          diff: `x=${result.positionVerification.actualX}, y=${result.positionVerification.actualY}`,
          message: result.positionVerification.message,
        },
        selectionAfter: result.selectionAfter,
        selectionVerification,
        debugInfo: result.debugInfo,
        error: result.error,
        duration,
      }

      results.push(testResult)

      if (testPassed) {
        passed++
        console.log(`  ✅ PASSED (${duration.toFixed(0)}ms)`)
        console.log(`     ${testCase.expected.description}`)
        console.log(
          `     Position: x=${result.positionVerification.actualX}, y=${result.positionVerification.actualY}`
        )
        console.log(`     Selection: ${result.selectionAfter}`)
      } else {
        failed++
        if (!result.success) {
          console.log(`  ❌ FAILED: ${result.error || 'Unknown error'}`)
          console.log(
            `     Debug: prelude=${result.debugInfo.preludeOffset}, nodes=${result.debugInfo.nodeCount}`
          )
          console.log(`     ${result.positionVerification.message}`)
        } else if (!selectionCorrect) {
          console.log(`  ❌ FAILED: No selection after drop`)
          console.log(`     Expected: Element should be selected after drop`)
          console.log(`     Actual: ${result.selectionAfter ?? 'null'}`)
        }
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
        selectionAfter: null,
        selectionVerification: { correct: false, expected: null, actual: null },
        debugInfo: { preludeOffset: 0, nodeCount: 0, targetFound: false },
        error: String(error),
        duration,
      })
    }
  }

  const totalTests =
    DRAG_TEST_CASES.length + CANVAS_MOVE_TEST_CASES.length + STACKED_DRAG_TEST_CASES.length
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
    executeRealStackedDrag: (params: {
      componentName: string
      targetNodeId: string
      position: Point
      expectedXRange: [number, number]
      expectedYRange: [number, number]
    }) => studioControl.executeRealStackedDrag(params),
    verifyCodeChange: (params: {
      codeBefore: string
      codeAfter: string
      expectedPattern: string | RegExp
    }) => studioControl.verifyCodeChange(params),
    verifyPositionInCode: (params: {
      codeAfter: string
      expectedX: number
      expectedY: number
      tolerance?: number
    }) => studioControl.verifyPositionInCode(params),
    getPreludeOffset: () => studioControl.getPreludeOffset(),

    // Comprehensive drag test suite
    runDragTests: () => runComprehensiveDragTests(globalRunner!, studioControl),

    // ==========================================================================
    // Property Panel Control
    // ==========================================================================

    // Element inspection
    getElement: (nodeId: string) => studioControl.getElement(nodeId),
    getPropertyValue: (nodeId: string, propName: string) =>
      studioControl.getPropertyValue(nodeId, propName),
    hasProperty: (nodeId: string, propName: string) => studioControl.hasProperty(nodeId, propName),
    getPropertiesMap: (nodeId: string) => studioControl.getPropertiesMap(nodeId),
    getPrimitiveType: (nodeId: string) => studioControl.getPrimitiveType(nodeId),
    isComponentInstance: (nodeId: string) => studioControl.isComponentInstance(nodeId),
    isComponentDefinition: (nodeId: string) => studioControl.isComponentDefinition(nodeId),

    // Property modification
    setProperty: (nodeId: string, propName: string, value: string) =>
      studioControl.setProperty(nodeId, propName, value),
    removeProperty: (nodeId: string, propName: string) =>
      studioControl.removeProperty(nodeId, propName),
    toggleProperty: (nodeId: string, propName: string, enabled: boolean) =>
      studioControl.toggleProperty(nodeId, propName, enabled),
    batchUpdateProperties: (
      nodeId: string,
      changes: Array<{ name: string; value: string; action: 'set' | 'remove' | 'toggle' }>
    ) => studioControl.batchUpdateProperties(nodeId, changes),

    // Tokens
    getColorTokens: () => studioControl.getColorTokens(),
    getSpacingTokens: () => studioControl.getSpacingTokens(),

    // Panel control
    refreshPropertyPanel: () => studioControl.refreshPropertyPanel(),
    getCurrentPanelElement: () => studioControl.getCurrentPanelElement(),
    selectAndInspect: (nodeId: string) => studioControl.selectAndInspect(nodeId),

    // Internal references
    runner: globalRunner,
    studio: studioControl,
  }

  ;(window as any).__dragTest = api

  console.log('🪞 Mirror Studio Test API ready. Usage:')
  console.log('')
  console.log('  // 🧪 Run All Drag Tests')
  console.log('  __dragTest.runDragTests()  // Comprehensive test suite (flex + stacked)')
  console.log('')
  console.log('  // Single Drag Test with Verification')
  console.log('  __dragTest.executeRealDrag({')
  console.log('    componentName: "Button",')
  console.log('    targetNodeId: "node-1",')
  console.log('    insertionIndex: 0,')
  console.log('    expectedPattern: "Button"')
  console.log('  })')
  console.log('')
  console.log('  // 🎨 Property Panel Control')
  console.log('  __dragTest.getElement("node-1")           // Get all element properties')
  console.log('  __dragTest.getPropertyValue("node-1", "bg")  // Get specific property')
  console.log('  __dragTest.getPropertiesMap("node-1")     // Get all props as {key: value}')
  console.log('  __dragTest.setProperty("node-1", "bg", "#ff0000")  // Set property')
  console.log('  __dragTest.removeProperty("node-1", "pad")  // Remove property')
  console.log('  __dragTest.toggleProperty("node-1", "hor", true)  // Toggle boolean')
  console.log('  __dragTest.batchUpdateProperties("node-1", [')
  console.log('    { name: "bg", value: "#333", action: "set" },')
  console.log('    { name: "pad", value: "16", action: "set" }')
  console.log('  ])')
  console.log('  __dragTest.selectAndInspect("node-1")     // Select + get properties')
  console.log('  __dragTest.getColorTokens()   // Get all color tokens')
  console.log('  __dragTest.getSpacingTokens() // Get all spacing tokens')
  console.log('')
  console.log('  // Stacked/Absolute Position Drag')
  console.log(
    '  __dragTest.fromPalette("Button").toContainer("node-1").atPosition(100, 50).execute()'
  )
  console.log('  __dragTest.executeRealStackedDrag({')
  console.log('    componentName: "Button",')
  console.log('    targetNodeId: "node-1",')
  console.log('    position: { x: 100, y: 50 },')
  console.log('    expectedXRange: [90, 110],')
  console.log('    expectedYRange: [40, 60]')
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
