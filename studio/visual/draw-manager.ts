/**
 * DrawManager - Click-to-draw interaction system
 *
 * Allows users to create positioned components in absolute containers
 * by clicking a component and dragging to define size and position.
 */

import type { ComponentItem } from '../panels/components/types'
import type { CodeModifier, ModificationResult } from '../../src/studio/code-modifier'
import type { SourceMap } from '../../src/ir/source-map'
import { detectLayout } from '../../src/studio/utils/layout-detection'
import { DrawRectRenderer } from './draw-rect-renderer'
import { SnapIntegration, createSnapIntegration } from './snap-integration'
import { GuideRenderer } from './smart-guides/guide-renderer'
import { events } from '../core/events'

const MIN_SIZE = 10 // Minimum width/height in pixels

export type DrawMode = 'idle' | 'ready' | 'drawing'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Modifiers {
  shift: boolean   // Constrain to square
  alt: boolean     // Draw from center
  meta: boolean    // Disable snapping (Cmd/Ctrl)
}

export interface DrawState {
  component: ComponentItem
  containerElement: HTMLElement
  containerNodeId: string
  containerRect: DOMRect
  startPoint: Point
  currentPoint: Point
  currentRect: Rect
  modifiers: Modifiers
  scale: number
  lastClientX: number
  lastClientY: number
}

export interface DrawResult {
  success: boolean
  nodeId?: string
  properties: {
    x: number
    y: number
    w: number
    h: number
  }
  modificationResult?: ModificationResult
  error?: string
}

export interface DrawManagerConfig {
  container: HTMLElement
  getCodeModifier: () => CodeModifier
  sourceMap: () => SourceMap | null
  gridSize?: number
  enableSmartGuides?: boolean
  snapTolerance?: number
  minSize?: number
}

export class DrawManager {
  private mode: DrawMode = 'idle'
  private componentToDraw: ComponentItem | null = null
  private drawState: DrawState | null = null
  private config: Required<Omit<DrawManagerConfig, 'sourceMap' | 'getCodeModifier'>> & {
    sourceMap: () => SourceMap | null
    getCodeModifier: () => CodeModifier
  }

  private renderer: DrawRectRenderer
  private snapIntegration: SnapIntegration
  private guideRenderer: GuideRenderer
  private rafId: number | null = null
  private isDisposed: boolean = false

  // Event handlers (bound)
  private boundHandleMouseDown: (e: MouseEvent) => void
  private boundHandleMouseMove: (e: MouseEvent) => void
  private boundHandleMouseUp: (e: MouseEvent) => void
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private boundHandleKeyUp: (e: KeyboardEvent) => void

  // Callbacks
  public onDrawComplete?: (result: DrawResult) => void
  public onDrawCancel?: () => void
  public onError?: (error: Error) => void

  constructor(config: DrawManagerConfig) {
    this.config = {
      container: config.container,
      getCodeModifier: config.getCodeModifier,
      sourceMap: config.sourceMap,
      gridSize: config.gridSize ?? 0,
      enableSmartGuides: config.enableSmartGuides ?? false,
      snapTolerance: config.snapTolerance ?? 4,
      minSize: config.minSize ?? MIN_SIZE,
    }

    this.renderer = new DrawRectRenderer(config.container)

    // Initialize snap integration
    this.snapIntegration = createSnapIntegration({
      gridSize: this.config.gridSize,
      enableSmartGuides: this.config.enableSmartGuides,
      snapTolerance: this.config.snapTolerance,
      disableSnapping: false,
    })

    // Initialize guide renderer
    this.guideRenderer = new GuideRenderer(config.container)

    // Bind event handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleKeyUp = this.handleKeyUp.bind(this)
  }

  /**
   * Enter draw mode for a component
   */
  enterDrawMode(component: ComponentItem): void {
    if (this.mode !== 'idle') {
      console.warn('[DrawManager] Already in draw mode')
      return
    }

    this.componentToDraw = component
    this.transitionTo('ready')

    console.log('[DrawManager] Entered draw mode:', component.name)
  }

  /**
   * Cancel current drawing operation
   */
  cancel(): void {
    console.log('[DrawManager] Cancelling draw mode')
    this.cleanup()
    this.transitionTo('idle')
    this.onDrawCancel?.()
  }

  /**
   * Check if in draw mode
   */
  isInDrawMode(): boolean {
    return this.mode !== 'idle'
  }

  /**
   * Get current mode
   */
  getMode(): DrawMode {
    return this.mode
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.isDisposed = true
    this.cancel()
    this.renderer.dispose()
    this.guideRenderer.dispose()
  }

  /**
   * Transition to new state
   */
  private transitionTo(newMode: DrawMode): void {
    const oldMode = this.mode
    this.mode = newMode

    console.log(`[DrawManager] ${oldMode} → ${newMode}`)

    // State exit actions
    if (oldMode === 'ready') {
      this.detachReadyListeners()
    } else if (oldMode === 'drawing') {
      this.detachDrawingListeners()
    }

    // State entry actions
    if (newMode === 'ready') {
      this.attachReadyListeners()
      this.setCursor('crosshair')
    } else if (newMode === 'drawing') {
      this.attachDrawingListeners()
    } else if (newMode === 'idle') {
      this.setCursor('default')
      this.componentToDraw = null
    }
  }

  /**
   * Attach listeners for ready state
   */
  private attachReadyListeners(): void {
    document.addEventListener('mousedown', this.boundHandleMouseDown, true)
    document.addEventListener('keydown', this.boundHandleKeyDown)
  }

  /**
   * Detach listeners for ready state
   */
  private detachReadyListeners(): void {
    document.removeEventListener('mousedown', this.boundHandleMouseDown, true)
    document.removeEventListener('keydown', this.boundHandleKeyDown)
  }

  /**
   * Attach listeners for drawing state
   */
  private attachDrawingListeners(): void {
    document.addEventListener('mousemove', this.boundHandleMouseMove)
    document.addEventListener('mouseup', this.boundHandleMouseUp)
    document.addEventListener('keydown', this.boundHandleKeyDown)
    document.addEventListener('keyup', this.boundHandleKeyUp)
  }

  /**
   * Detach listeners for drawing state
   */
  private detachDrawingListeners(): void {
    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    document.removeEventListener('mouseup', this.boundHandleMouseUp)
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    document.removeEventListener('keyup', this.boundHandleKeyUp)
  }

  /**
   * Handle mousedown (start drawing)
   */
  private handleMouseDown(e: MouseEvent): void {
    if (this.mode !== 'ready') return

    e.preventDefault()
    e.stopPropagation()

    // Find container at point
    const containerElement = this.findContainerAtPoint(e.clientX, e.clientY)
    if (!containerElement) {
      this.showError('No container found at this position')
      return
    }

    // Validate container
    if (!this.isValidDrawTarget(containerElement)) {
      this.showError('Can only draw in absolute containers (stacked layout)')
      return
    }

    // Get container info
    const containerNodeId = containerElement.dataset.mirrorId!
    const containerRect = containerElement.getBoundingClientRect()
    const layout = detectLayout(containerElement)
    const scale = layout.scale

    // Convert to container coordinates
    const startPoint = this.screenToContainerCoords(e.clientX, e.clientY, containerRect, scale)

    // Initialize draw state
    this.drawState = {
      component: this.componentToDraw!,
      containerElement,
      containerNodeId,
      containerRect,
      startPoint,
      currentPoint: startPoint,
      currentRect: { x: startPoint.x, y: startPoint.y, width: 0, height: 0 },
      modifiers: { shift: e.shiftKey, alt: e.altKey, meta: e.metaKey || e.ctrlKey },
      scale,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
    }

    this.transitionTo('drawing')
  }

  /**
   * Handle mousemove (update drawing)
   */
  private handleMouseMove(e: MouseEvent): void {
    if (this.mode !== 'drawing' || !this.drawState || this.isDisposed) return

    // RAF throttle
    if (this.rafId !== null) return

    this.rafId = requestAnimationFrame(() => {
      // Guard against disposal during RAF queue
      if (this.isDisposed || !this.drawState) {
        this.rafId = null
        return
      }
      this.updateDrawing(e.clientX, e.clientY, e.shiftKey, e.altKey, e.metaKey || e.ctrlKey)
      this.rafId = null
    })
  }

  /**
   * Handle mouseup (finish drawing)
   */
  private handleMouseUp(e: MouseEvent): void {
    if (this.mode !== 'drawing') return

    e.preventDefault()
    e.stopPropagation()

    this.finishDrawing()
  }

  /**
   * Handle keydown
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel()
      return
    }

    // Update modifiers during drawing
    if (this.mode === 'drawing' && this.drawState) {
      const oldModifiers = { ...this.drawState.modifiers }
      this.drawState.modifiers = {
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey || e.ctrlKey,
      }

      // Re-render if modifiers changed
      if (JSON.stringify(oldModifiers) !== JSON.stringify(this.drawState.modifiers)) {
        this.updateDrawing(
          this.drawState.lastClientX,
          this.drawState.lastClientY,
          e.shiftKey,
          e.altKey,
          e.metaKey || e.ctrlKey
        )
      }
    }
  }

  /**
   * Handle keyup
   */
  private handleKeyUp(e: KeyboardEvent): void {
    if (this.mode === 'drawing' && this.drawState) {
      this.drawState.modifiers = {
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey || e.ctrlKey,
      }
    }
  }

  /**
   * Update drawing
   */
  private updateDrawing(clientX: number, clientY: number, shift: boolean, alt: boolean, meta: boolean): void {
    if (!this.drawState) return

    const { containerRect, scale, startPoint, containerElement } = this.drawState

    // Cache screen coordinates for keyboard modifier updates
    this.drawState.lastClientX = clientX
    this.drawState.lastClientY = clientY

    // Convert to container coordinates
    const currentPoint = this.screenToContainerCoords(clientX, clientY, containerRect, scale)
    this.drawState.currentPoint = currentPoint

    // Update modifiers
    this.drawState.modifiers = { shift, alt, meta }

    // Calculate rectangle
    let rect = this.calculateRect(startPoint, currentPoint, this.drawState.modifiers)

    // Apply snapping (unless meta key is held)
    const siblings = this.getSiblings(containerElement)
    const snapResult = this.snapIntegration.snap(rect, siblings, containerRect, meta)
    rect = snapResult.rect
    this.drawState.currentRect = rect

    // Render rectangle
    this.renderer.render(rect, containerRect, scale)

    // Render guides
    this.guideRenderer.render(snapResult.guides)
  }

  /**
   * Finish drawing
   */
  private finishDrawing(): void {
    if (!this.drawState) return

    const { currentRect, containerNodeId, component } = this.drawState

    // Validate minimum size
    if (currentRect.width < this.config.minSize || currentRect.height < this.config.minSize) {
      this.showError(`Element too small (minimum ${this.config.minSize}×${this.config.minSize})`)
      this.cleanup()
      this.transitionTo('ready')
      return
    }

    // Round to integers
    const x = Math.round(currentRect.x)
    const y = Math.round(currentRect.y)
    const w = Math.round(currentRect.width)
    const h = Math.round(currentRect.height)

    // Build properties string
    const properties = `x ${x}, y ${y}, w ${w}, h ${h}`

    // Insert component
    try {
      const codeModifier = this.config.getCodeModifier()
      const result = codeModifier.addChild(
        containerNodeId,
        component.template,
        {
          properties,
          textContent: component.textContent,
          position: 'last',
        }
      )

      if (result.success) {
        console.log('[DrawManager] Component created:', result.nodeId)

        this.onDrawComplete?.({
          success: true,
          nodeId: result.nodeId,
          properties: { x, y, w, h },
          modificationResult: result,
        })

        this.cleanup()
        this.transitionTo('idle')
      } else {
        throw new Error(result.error || 'Failed to create component')
      }
    } catch (error) {
      console.error('[DrawManager] Error creating component:', error)
      this.showError(error instanceof Error ? error.message : 'Failed to create component')
      this.cleanup()
      this.transitionTo('idle')

      this.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Calculate rectangle from two points
   */
  private calculateRect(start: Point, current: Point, modifiers: Modifiers): Rect {
    // Basic rectangle (handles all 4 corners)
    let x = Math.min(start.x, current.x)
    let y = Math.min(start.y, current.y)
    let width = Math.abs(current.x - start.x)
    let height = Math.abs(current.y - start.y)

    // Enforce minimum size
    width = Math.max(width, this.config.minSize)
    height = Math.max(height, this.config.minSize)

    // Constrain to square (Shift)
    if (modifiers.shift) {
      const size = Math.max(width, height)
      width = size
      height = size
    }

    // Draw from center (Alt)
    if (modifiers.alt) {
      x = start.x - width / 2
      y = start.y - height / 2
    }

    return { x, y, width, height }
  }

  /**
   * Convert screen coordinates to container coordinates
   */
  private screenToContainerCoords(
    screenX: number,
    screenY: number,
    containerRect: DOMRect,
    scale: number
  ): Point {
    return {
      x: (screenX - containerRect.left) / scale,
      y: (screenY - containerRect.top) / scale,
    }
  }

  /**
   * Find container element at point
   */
  private findContainerAtPoint(clientX: number, clientY: number): HTMLElement | null {
    let current = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    if (!current) return null

    // Traverse up until we find a valid absolute container
    while (current) {
      if (current.dataset.mirrorId && this.isValidDrawTarget(current)) {
        return current
      }
      current = current.parentElement
    }

    return null
  }

  /**
   * Get siblings of container for snapping
   */
  private getSiblings(containerElement: HTMLElement): Map<string, DOMRect> {
    const siblings = new Map<string, DOMRect>()

    // Get only direct children with mirror-id (not nested descendants)
    const children = containerElement.querySelectorAll(':scope > [data-mirror-id]')
    for (const child of children) {
      const element = child as HTMLElement
      const nodeId = element.dataset.mirrorId
      if (nodeId) {
        siblings.set(nodeId, element.getBoundingClientRect())
      }
    }

    return siblings
  }

  /**
   * Validate if element is a valid draw target
   */
  private isValidDrawTarget(element: HTMLElement): boolean {
    // Must have mirror-id
    if (!element.dataset.mirrorId) {
      return false
    }

    // Must be absolute container
    const layout = detectLayout(element)
    if (layout.type !== 'absolute') {
      return false
    }

    return true
  }

  /**
   * Set cursor style
   */
  private setCursor(cursor: 'crosshair' | 'default'): void {
    if (cursor === 'crosshair') {
      document.body.classList.add('draw-cursor-crosshair')
    } else {
      document.body.classList.remove('draw-cursor-crosshair')
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    console.warn('[DrawManager]', message)
    // Emit error event for centralized notification handling
    events.emit('draw:error', { message })
  }

  /**
   * Cleanup drawing state
   */
  private cleanup(): void {
    // Cancel RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    // Hide renderer
    this.renderer.hide()

    // Hide guides
    this.guideRenderer.hide()

    // Clear state
    this.drawState = null
  }
}

/**
 * Create a DrawManager instance
 */
export function createDrawManager(config: DrawManagerConfig): DrawManager {
  return new DrawManager(config)
}
