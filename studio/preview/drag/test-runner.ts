/**
 * BrowserTestRunner + fluent drag builders
 *
 * Executes simulated drag-and-drop interactions against the Mirror Studio
 * preview. Builder classes (PaletteDragBuilder, CanvasMoveBuilder) live here
 * because they hold a back-reference to the runner.
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
import { lookupComponentByName } from './test-api-helpers'
import type { AnimationConfig, BrowserTestResult } from './test-api-types'
import { DEFAULT_ANIMATION } from './test-api-types'

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
    children?: any[]
  }): Promise<BrowserTestResult> {
    const startTime = performance.now()
    const codeBefore = this.getCode()
    const description = `Drop ${params.componentName} into ${params.targetNodeId} at index ${params.insertionIndex}`

    try {
      // 1. Find target element in DOM
      const targetEl = this.findElement(params.targetNodeId)

      // Handle empty canvas case - directly insert as root element
      if (!targetEl && codeBefore.trim() === '') {
        return this.handleEmptyCanvasDrop(params, startTime, codeBefore, description)
      }

      if (!targetEl) {
        return this.errorResult(
          description,
          `Target element ${params.targetNodeId} not found`,
          startTime
        )
      }

      // 2. Set drag data (as ComponentPanel would)
      // Include children for complex components (Dialog, Tabs, etc.)
      const dragData: ComponentDragData = {
        fromComponentPanel: true,
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        mirTemplate: params.template,
        children: params.children,
      }
      setCurrentDragData(dragData)

      // 3. Calculate start and end positions. For an empty container that
      //    is large enough for the 9-zone alignment grid, an `index 0`
      //    drop semantically means "anywhere inside" — there are no
      //    existing children to insert before. Aim for the visual centre
      //    so the live drag-controller promotes this to an aligned
      //    `center` target (matching the manual-drag UX), instead of
      //    landing at `top+20` and producing a `top-center` zone.
      const targetRect = targetEl.getBoundingClientRect()
      const startPos = this.getPalettePosition()
      const isEmptyTarget = !targetEl.querySelector('[data-mirror-id]')
      const endPos =
        params.insertionIndex === 0 && isEmptyTarget
          ? this.calculateContainerCenter(targetRect)
          : this.calculateDropPosition(targetRect, params.insertionIndex)

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
   * Handle dropping onto an empty canvas (no existing code)
   * Directly inserts the component as a root element
   */
  private async handleEmptyCanvasDrop(
    params: {
      componentName: string
      targetNodeId: string
      insertionIndex: number
      template?: string
      properties?: string
      textContent?: string
      children?: any[]
    },
    startTime: number,
    codeBefore: string,
    description: string
  ): Promise<BrowserTestResult> {
    try {
      // Build the component code
      let componentCode = params.componentName

      // Add text content if provided
      if (params.textContent) {
        componentCode += ` "${params.textContent}"`
      }

      // Add properties if provided
      if (params.properties) {
        componentCode += params.textContent ? `, ${params.properties}` : ` ${params.properties}`
      }

      // Use template if provided (for complex components)
      if (params.template) {
        componentCode = params.template
      }

      // Set the code directly
      const editor = (window as any).editor
      if (!editor) {
        return this.errorResult(description, 'Editor not available', startTime, codeBefore)
      }

      const transaction = editor.state.update({
        changes: { from: 0, to: editor.state.doc.length, insert: componentCode },
      })
      editor.dispatch(transaction)

      // Wait for compile
      await this.delay(100)
      await this.waitForCodeChange('')

      return {
        success: true,
        description: `${description} (empty canvas - created root)`,
        duration: performance.now() - startTime,
        codeBefore,
        codeAfter: this.getCode(),
      }
    } catch (error) {
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
   * Execute a canvas element move to an alignment zone
   */
  async executeCanvasMoveToAlignmentZone(params: {
    sourceNodeId: string
    targetNodeId: string
    alignmentZone:
      | 'top-left'
      | 'top-center'
      | 'top-right'
      | 'center-left'
      | 'center'
      | 'center-right'
      | 'bottom-left'
      | 'bottom-center'
      | 'bottom-right'
  }): Promise<BrowserTestResult> {
    const startTime = performance.now()
    const codeBefore = this.getCode()
    const description = `Move ${params.sourceNodeId} to ${params.targetNodeId} alignment zone ${params.alignmentZone}`

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

      // 2. Verify container is large enough for alignment zones
      const targetRect = targetEl.getBoundingClientRect()
      if (targetRect.width < 80 || targetRect.height < 80) {
        return this.errorResult(
          description,
          `Container too small for alignment zones (${targetRect.width}x${targetRect.height}, needs >= 80x80)`,
          startTime,
          codeBefore
        )
      }

      // 3. Set canvas drag data
      setCanvasDragData(params.sourceNodeId)

      // 4. Calculate zone position within target
      const zonePosition = this.calculateZonePosition(params.alignmentZone, targetRect)

      // 5. Calculate drop position (absolute screen coordinates)
      const dropPos: Point = {
        x: targetRect.left + zonePosition.x,
        y: targetRect.top + zonePosition.y,
      }

      // 6. Create drag source
      const source: DragSource = {
        type: 'canvas',
        nodeId: params.sourceNodeId,
      }

      // 7. Execute animated drag to zone position (same as palette alignment drop)
      await this.executeAnimatedDragAligned(
        source,
        dropPos,
        params.targetNodeId,
        params.alignmentZone
      )

      // 8. Cleanup
      clearCurrentDragData()

      // 9. Wait for code update with verification
      const codeChanged = await this.waitForCodeChange(codeBefore, 2000)
      const codeAfter = this.getCode()

      if (!codeChanged) {
        // Code didn't change - this likely means callbacks weren't set
        return this.errorResult(
          description,
          `Code did not change after drop. This may indicate DragController callbacks are not set. ` +
            `Ensure DragPreview is initialized before running tests.`,
          startTime,
          codeBefore
        )
      }

      return {
        success: true,
        description,
        duration: performance.now() - startTime,
        codeBefore,
        codeAfter,
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

  /** Visual centre of a container — used for empty-target drops so the
   *  live drag-controller promotes the drop to a `center` alignment zone. */
  private calculateContainerCenter(targetRect: DOMRect): Point {
    return {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
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

    // Prefer the target the live controller computed for the *same*
    // container during the animation: empty large containers naturally
    // promote to a 9-zone alignment target (see DragController.
    // updatePosition → storeAlignedTarget). Falling back to an explicit
    // flex target keeps the deterministic behaviour for the cases where
    // hit detection lands on a wrong element or stays unset.
    const computed = controller.getTestState().target
    let target: DropTarget
    if (computed && computed.mode === 'aligned' && computed.containerId === targetNodeId) {
      target = computed
    } else {
      target = { mode: 'flex', containerId: targetNodeId, insertionIndex }
    }
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
    children?: any[]
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
      // Include children for complex components
      const dragData: ComponentDragData = {
        fromComponentPanel: true,
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        mirTemplate: params.template,
        children: params.children,
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
    children?: any[]
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
        fromComponentPanel: true,
        componentName: params.componentName,
        properties: params.properties,
        textContent: params.textContent,
        mirTemplate: params.template,
        children: params.children,
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
      await this.executeAnimatedDragAligned(
        source,
        dropPos,
        params.targetNodeId,
        params.alignmentZone
      )

      // 8. Cleanup
      clearCurrentDragData()

      // 9. Wait for code update with verification
      const codeChanged = await this.waitForCodeChange(codeBefore, 2000)
      const codeAfter = this.getCode()

      if (!codeChanged) {
        return this.errorResult(
          description,
          `Code did not change after drop. This may indicate DragController callbacks are not set.`,
          startTime,
          codeBefore
        )
      }

      return {
        success: true,
        description,
        duration: performance.now() - startTime,
        codeBefore,
        codeAfter,
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
    targetNodeId: string,
    alignmentZone: AlignPosition
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

    // Import the alignment property map
    const { ALIGN_TO_PROPERTY } = await import('./indicator')

    // Use simulateDrop with AlignedDropTarget for deterministic behavior
    const target: AlignedDropTarget = {
      mode: 'aligned',
      containerId: targetNodeId,
      alignmentProperty: ALIGN_TO_PROPERTY[alignmentZone],
    }
    await controller.simulateDrop(source, target)
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
   * @returns true if code changed, false if timed out
   */
  private async waitForCodeChange(originalCode: string, timeout = 1000): Promise<boolean> {
    const startTime = performance.now()
    while (performance.now() - startTime < timeout) {
      if (this.getCode() !== originalCode) {
        return true
      }
      await this.delay(50)
    }
    return false
  }

  /**
   * Check if DragController callbacks are set (required for drops to work)
   */
  private hasCallbacksSet(): boolean {
    const controller = getDragController()
    const state = controller.getTestState()
    // The controller exposes source/target but not callbacks directly
    // We can check by attempting a dry run or by checking internal state
    // For now, we'll trust that if DragPreview was initialized, callbacks are set
    // This is validated during startDrag/simulateDrop
    return true
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
  private mirTemplate?: string
  private children?: any[]

  constructor(runner: BrowserTestRunner, componentName: string) {
    this.runner = runner

    // Look up component definition from palette sections
    const componentDef = lookupComponentByName(componentName)
    if (componentDef) {
      // Use the actual template (e.g., 'Frame' for 'Column')
      this.componentName = componentDef.template
      this.properties = componentDef.properties
      this.text = componentDef.textContent
      this.mirTemplate = componentDef.mirTemplate
      this.children = componentDef.children
    } else {
      // Fallback: use component name directly (for primitives like 'Button')
      this.componentName = componentName
    }
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
        template: this.template ?? this.mirTemplate,
        properties: this.properties,
        textContent: this.text,
        children: this.children,
      })
    }

    // Use absolute positioning if position is set
    if (this.position) {
      return this.runner.executePaletteDropAbsolute({
        componentName: this.componentName,
        targetNodeId: this.targetId,
        position: this.position,
        template: this.template ?? this.mirTemplate,
        properties: this.properties,
        textContent: this.text,
        children: this.children,
      })
    }

    // Default to index-based positioning
    return this.runner.executePaletteDrop({
      componentName: this.componentName,
      targetNodeId: this.targetId,
      insertionIndex: this.index,
      template: this.template ?? this.mirTemplate,
      properties: this.properties,
      textContent: this.text,
      children: this.children,
    })
  }
}

type AlignmentZone =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'center-left'
  | 'center'
  | 'center-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right'

class CanvasMoveBuilder {
  private runner: BrowserTestRunner
  private sourceId: string
  private targetId: string = ''
  private index: number = 0
  private alignmentZone?: AlignmentZone

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

  /**
   * Move element to an alignment zone (9-point grid)
   * Used when moving the only child of a container
   */
  atAlignmentZone(zone: AlignmentZone): this {
    this.alignmentZone = zone
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

    // Use alignment zone execution if specified
    if (this.alignmentZone) {
      return this.runner.executeCanvasMoveToAlignmentZone({
        sourceNodeId: this.sourceId,
        targetNodeId: this.targetId,
        alignmentZone: this.alignmentZone,
      })
    }

    return this.runner.executeCanvasMove({
      sourceNodeId: this.sourceId,
      targetNodeId: this.targetId,
      insertionIndex: this.index,
    })
  }
}
