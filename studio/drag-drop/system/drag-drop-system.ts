/**
 * DragDropSystem
 *
 * Main orchestration class for drag & drop operations.
 * Integrates Pragmatic DnD with strategies, visual feedback, and code execution.
 */

import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview'

import type {
  DragSource,
  DropResult,
  DropTarget,
  PaletteItemData,
  Point,
  Rect,
} from '../types'
import type {
  DragDropConfig,
  DragDropSystem as IDragDropSystem,
  DragState,
} from './types'
import type { ChildRect } from '../strategies/types'

import { StrategyRegistry, createWebflowRegistry } from '../strategies/registry'
import { VisualSystem, createVisualSystem } from '../visual/system'
import {
  detectTarget,
  findClosestTarget,
  getChildRects,
  getContainerRect,
} from './target-detector'

const DEFAULT_NODE_ID_ATTR = 'data-mirror-id'

export class DragDropSystem implements IDragDropSystem {
  private config: DragDropConfig
  private registry: StrategyRegistry
  private visual: VisualSystem
  private state: DragState
  private disabled: boolean = false
  private cleanupFns: (() => void)[] = []
  private monitorCleanup: (() => void) | null = null
  private dropTargetCleanup: (() => void) | null = null
  private nodeIdAttr: string

  constructor(config: DragDropConfig) {
    this.config = config
    this.nodeIdAttr = config.nodeIdAttribute ?? DEFAULT_NODE_ID_ATTR
    this.registry = createWebflowRegistry()
    this.visual = createVisualSystem(config.container)
    this.state = {
      isActive: false,
      source: null,
      currentTarget: null,
      currentResult: null,
      isAltKeyPressed: false,
    }
  }

  /**
   * Initialize the system
   */
  init(): void {
    this.setupMonitor()
    this.setupDropTarget()
    this.setupNativeDragHandlers()
    this.setupKeyboardListeners()
  }

  /**
   * Set up global drag monitor
   */
  private setupMonitor(): void {
    this.monitorCleanup = monitorForElements({
      onDragStart: ({ source }) => {
        if (this.disabled) return

        const dragSource = this.extractDragSource(source)
        if (!dragSource) return

        this.state.isActive = true
        this.state.source = dragSource
        this.config.onDragStart?.(dragSource)
      },

      onDrag: ({ location }) => {
        // No visual update needed during drag - line indicator is shown on dragover
      },

      onDrop: ({ source, location }) => {
        if (!this.state.isActive) return

        const success = this.state.currentResult !== null
        const dragSource = this.state.source

        // Execute drop if we have a result
        if (success && dragSource && this.state.currentResult) {
          this.executeDrop(dragSource, this.state.currentResult)
        }

        // Clean up
        this.visual.clear()
        this.config.onDragEnd?.(dragSource!, success)

        this.resetState()
      },
    })
  }

  /**
   * Set up drop target on container using event delegation
   */
  private setupDropTarget(): void {
    this.dropTargetCleanup = dropTargetForElements({
      element: this.config.container,

      canDrop: ({ source }) => {
        if (this.disabled) return false
        return this.extractDragSource(source) !== null
      },

      onDragEnter: ({ location }) => {
        this.updateDropIndicator(location.current.input)
      },

      onDrag: ({ location }) => {
        this.updateDropIndicator(location.current.input)
      },

      onDragLeave: () => {
        this.visual.hideIndicator()
        this.visual.hideParentOutline()
        this.visual.hideZoneOverlay()
        this.state.currentTarget = null
        this.state.currentResult = null
      },

      onDrop: () => {
        // Drop is handled by monitor
      },
    })
  }

  /**
   * Set up native HTML5 drag handlers for ComponentPanel items
   *
   * ComponentPanel uses native HTML5 drag events with `application/mirror-component`
   * data type. This method handles those events alongside Pragmatic DnD.
   */
  private setupNativeDragHandlers(): void {
    const container = this.config.container

    const handleDragOver = (e: DragEvent) => {
      if (this.disabled) return
      if (!e.dataTransfer?.types.includes('application/mirror-component')) return

      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'

      // If not already active from Pragmatic DnD, handle natively
      if (!this.state.isActive) {
        const source = this.extractNativeDragSource(e)
        if (!source) return

        this.state.isActive = true
        this.state.source = source
        this.config.onDragStart?.(source)
      }

      // Update drop indicator (line showing insertion point)
      this.updateDropIndicator({ clientX: e.clientX, clientY: e.clientY })
    }

    const handleDragEnter = (e: DragEvent) => {
      if (this.disabled) return
      if (!e.dataTransfer?.types.includes('application/mirror-component')) return

      e.preventDefault()
    }

    const handleDragLeave = (e: DragEvent) => {
      if (this.disabled) return
      if (!e.dataTransfer?.types.includes('application/mirror-component')) return

      // Only handle if leaving the container entirely
      const relatedTarget = e.relatedTarget as HTMLElement | null
      if (relatedTarget && container.contains(relatedTarget)) return

      this.visual.hideIndicator()
      this.visual.hideParentOutline()
      this.visual.hideZoneOverlay()
    }

    const handleDrop = (e: DragEvent) => {
      if (this.disabled) return
      if (!e.dataTransfer?.types.includes('application/mirror-component')) return

      e.preventDefault()

      console.log('[DragDrop] Native handleDrop called at', { x: e.clientX, y: e.clientY })

      // Extract source from the actual drop data (may differ from dragover)
      const jsonData = e.dataTransfer.getData('application/mirror-component')
      if (!jsonData) {
        console.log('[DragDrop] No JSON data in drop')
        this.visual.clear()
        this.resetState()
        return
      }

      const dragData = JSON.parse(jsonData)
      const source: DragSource = {
        type: 'palette',
        componentId: dragData.componentId,
        componentName: dragData.componentName,
        properties: dragData.properties,
        textContent: dragData.textContent,
        children: dragData.children,
      }

      console.log('[DragDrop] Drop source:', source)
      console.log('[DragDrop] Current result BEFORE update:', this.state.currentResult)

      // Update indicator one last time
      this.updateDropIndicator({ clientX: e.clientX, clientY: e.clientY })

      console.log('[DragDrop] Current result AFTER update:', this.state.currentResult)

      // Execute drop if we have a result
      if (this.state.currentResult) {
        console.log('[DragDrop] Executing drop with:', {
          targetId: this.state.currentResult.targetId,
          placement: this.state.currentResult.placement,
          insertionIndex: this.state.currentResult.insertionIndex,
          targetNodeId: this.state.currentResult.target?.nodeId,
        })
        this.executeDrop(source, this.state.currentResult)
        this.config.onDragEnd?.(source, true)
      } else {
        console.log('[DragDrop] No currentResult, drop cancelled')
        this.config.onDragEnd?.(source, false)
      }

      // Clean up
      this.visual.clear()
      this.resetState()
    }

    // Attach listeners
    container.addEventListener('dragover', handleDragOver)
    container.addEventListener('dragenter', handleDragEnter)
    container.addEventListener('dragleave', handleDragLeave)
    container.addEventListener('drop', handleDrop)

    // Store cleanup
    this.cleanupFns.push(() => {
      container.removeEventListener('dragover', handleDragOver)
      container.removeEventListener('dragenter', handleDragEnter)
      container.removeEventListener('dragleave', handleDragLeave)
      container.removeEventListener('drop', handleDrop)
    })
  }

  /**
   * Extract DragSource from native HTML5 drag event
   */
  private extractNativeDragSource(e: DragEvent): DragSource | null {
    // We can't read the actual data during dragover (security restriction)
    // So we just know it's a palette item, but not the specifics
    // The actual data is read on drop
    return {
      type: 'palette',
      componentName: 'Component', // Placeholder - actual data read on drop
    }
  }

  /**
   * Update drop indicator based on cursor position
   */
  private updateDropIndicator(input: { clientX: number; clientY: number }): void {
    if (!this.state.source) return

    const cursor: Point = { x: input.clientX, y: input.clientY }

    // Find element under cursor
    const elementUnderCursor = document.elementFromPoint(cursor.x, cursor.y) as HTMLElement | null

    // Find closest drop target
    let target = findClosestTarget(elementUnderCursor, this.nodeIdAttr)
    if (!target) {
      this.visual.hideIndicator()
      this.visual.hideZoneOverlay()
      this.state.currentTarget = null
      this.state.currentResult = null
      return
    }

    // Find strategy for this target (Webflow-style: no positioned container handling)
    let strategy = this.registry.findStrategy(target)
    if (!strategy) {
      this.visual.hideIndicator()
      return
    }

    // Get child rects for calculation
    let childRects = getChildRects(target.element, this.nodeIdAttr)

    // For non-container targets, use parent's rect for the indicator width
    let containerRect: DOMRect
    if (target.layoutType === 'none' && target.element.parentElement) {
      containerRect = getContainerRect(target.element.parentElement)
    } else {
      containerRect = getContainerRect(target.element)
    }

    // Calculate drop result
    let calcResult = strategy.calculate(cursor, target, this.state.source, childRects)

    // Check if we should redirect to a sibling container
    // This handles the case where user drags just below a container (like Card)
    // and we should insert at the end of that container instead of before the next sibling
    const redirectResult = this.checkContainerRedirect(cursor, target, calcResult, childRects)
    if (redirectResult) {
      target = redirectResult.target
      strategy = this.registry.findStrategy(target)!
      childRects = getChildRects(target.element, this.nodeIdAttr)
      containerRect = getContainerRect(target.element)
      calcResult = strategy.calculate(cursor, target, this.state.source, childRects)
      // Force placement to 'after' the last child for container redirect
      calcResult = {
        ...calcResult,
        placement: 'after',
        targetId: childRects.length > 0 ? childRects[childRects.length - 1].nodeId : target.nodeId,
        insertionIndex: childRects.length,
      }
    }

    // Build full drop result
    const dropResult: DropResult = {
      target,
      placement: calcResult.placement,
      targetId: calcResult.targetId,
      insertionIndex: calcResult.insertionIndex,
      position: calcResult.position,
      zone: calcResult.zone,
    }

    this.state.currentTarget = target
    this.state.currentResult = dropResult

    // Get visual hint and show indicator (Webflow-style: no zone overlay)
    const visualHint = strategy.getVisualHint(calcResult, childRects, domRectToRect(containerRect))

    // If no visual hint (no-op position), hide indicator but keep result for drop
    if (visualHint) {
      this.visual.showIndicator(visualHint)
      // Show parent outline for before/after placements
      if (calcResult.placement === 'before' || calcResult.placement === 'after') {
        this.visual.showParentOutline(domRectToRect(containerRect))
      } else {
        this.visual.hideParentOutline()
      }
    } else {
      this.visual.hideIndicator()
      this.visual.hideParentOutline()
    }

    this.visual.hideZoneOverlay()
  }

  /**
   * Check if drop should be redirected to a sibling container
   *
   * When the user drags just below a container (like Card), we should insert
   * at the end of that container instead of before the next sibling.
   *
   * This provides a more intuitive UX where the "insert after last child"
   * zone extends slightly beyond the container boundary.
   */
  private checkContainerRedirect(
    cursor: Point,
    target: DropTarget,
    calcResult: DropResult,
    childRects: ChildRect[]
  ): { target: DropTarget } | null {
    // Only check for 'before' placement (not first child)
    if (calcResult.placement !== 'before') return null
    if (calcResult.insertionIndex === undefined || calcResult.insertionIndex <= 0) return null

    // Find the previous sibling element
    const prevIndex = calcResult.insertionIndex - 1
    if (prevIndex < 0 || prevIndex >= childRects.length) return null

    const prevChildRect = childRects[prevIndex]
    const prevElement = target.element.querySelector(
      `[${this.nodeIdAttr}="${prevChildRect.nodeId}"]`
    ) as HTMLElement | null
    if (!prevElement) return null

    // Check if previous sibling is a flex container
    const prevStyle = window.getComputedStyle(prevElement)
    const isFlexContainer =
      prevStyle.display === 'flex' ||
      prevStyle.display === 'inline-flex' ||
      prevStyle.display === 'grid' ||
      prevStyle.display === 'inline-grid'
    if (!isFlexContainer) return null

    // Check if cursor is within the redirect threshold below the container
    const prevRect = prevChildRect.rect
    const containerBottom = prevRect.y + prevRect.height
    const redirectThreshold = 30 // pixels below container to still redirect

    // Only redirect if cursor is below the container but within threshold
    if (cursor.y < containerBottom || cursor.y > containerBottom + redirectThreshold) {
      return null
    }

    // Also check cursor is horizontally within the container bounds
    if (cursor.x < prevRect.x || cursor.x > prevRect.x + prevRect.width) {
      return null
    }

    // Create a new target for the previous sibling container
    const redirectTarget = detectTarget(prevElement, this.nodeIdAttr)
    if (!redirectTarget || redirectTarget.layoutType !== 'flex') return null

    return { target: redirectTarget }
  }

  /**
   * Set up keyboard listeners for Alt key
   */
  private setupKeyboardListeners(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        this.state.isAltKeyPressed = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Alt') {
        this.state.isAltKeyPressed = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    this.cleanupFns.push(() => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    })
  }

  /**
   * Execute the drop action
   * Uses a flag to prevent double execution when both native HTML5 and Pragmatic DnD fire
   */
  private dropExecuted = false

  private executeDrop(source: DragSource, result: DropResult): { success: boolean; error?: string } {
    // Prevent double execution
    if (this.dropExecuted) {
      console.log('[DragDrop] Drop already executed, skipping')
      return { success: false, error: 'Drop already executed' }
    }
    this.dropExecuted = true

    console.log('[DragDrop] executeDrop called', { source, result })

    const executor = this.config.codeExecutor
    if (!executor) {
      console.warn('[DragDrop] No code executor configured')
      // Just call the callback if no executor
      this.config.onDrop?.(source, result)
      return { success: true }
    }

    let execResult: { success: boolean; error?: string }

    // Duplicate if Alt is pressed and this is a canvas element
    if (this.config.enableAltDuplicate && this.state.isAltKeyPressed && source.type === 'canvas') {
      console.log('[DragDrop] Executing duplicate')
      execResult = executor.duplicate(source, result)
      if (!execResult.success) {
        console.error('[DragDrop] Duplicate failed:', execResult.error)
      } else {
        console.log('[DragDrop] Duplicate successful')
      }
    } else {
      console.log('[DragDrop] Executing drop')
      execResult = executor.execute(source, result)
      if (!execResult.success) {
        console.error('[DragDrop] Drop failed:', execResult.error)
      } else {
        console.log('[DragDrop] Drop successful')
      }
    }

    this.config.onDrop?.(source, result)

    return execResult
  }

  /**
   * Extract DragSource from Pragmatic DnD source
   */
  private extractDragSource(
    source: { element: Element; data: Record<string, unknown> }
  ): DragSource | null {
    const data = source.data

    // Palette source
    if (data.type === 'palette' && data.componentName) {
      return {
        type: 'palette',
        componentName: data.componentName as string,
        properties: data.properties as string | undefined,
        textContent: data.textContent as string | undefined,
        children: data.children as DragSource['children'],
      }
    }

    // Canvas source
    if (data.type === 'canvas' && data.nodeId) {
      return {
        type: 'canvas',
        nodeId: data.nodeId as string,
        element: source.element as HTMLElement,
      }
    }

    return null
  }

  /**
   * Register a palette item as draggable
   */
  registerPaletteItem(element: HTMLElement, data: PaletteItemData): () => void {
    const cleanup = draggable({
      element,
      getInitialData: () => ({
        type: 'palette' as const,
        componentName: data.componentName,
        properties: data.properties,
        textContent: data.textContent,
        children: data.children,
      }),
    })

    this.cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * Enable a canvas element as drag source
   */
  enableCanvasDrag(nodeId: string): () => void {
    const element = this.config.container.querySelector(
      `[${this.nodeIdAttr}="${nodeId}"]`
    ) as HTMLElement | null

    if (!element) {
      console.warn(`Cannot enable drag: element with nodeId ${nodeId} not found`)
      return () => {}
    }

    const cleanup = draggable({
      element,
      getInitialData: () => ({
        type: 'canvas' as const,
        nodeId,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            this.renderDragPreview(container, element)
          },
        })
      },
    })

    this.cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * Render an invisible drag preview.
   * We use visual indicators (line, highlight) instead of a ghost.
   */
  private renderDragPreview(container: HTMLElement, _element: HTMLElement): void {
    // Create a minimal transparent preview (1x1 pixel)
    // The browser requires some content, but we don't want a visible ghost
    Object.assign(container.style, {
      width: '1px',
      height: '1px',
      opacity: '0',
    })
  }

  /**
   * Temporarily disable drag operations
   */
  disable(): void {
    this.disabled = true

    // Cancel any active drag
    if (this.state.isActive) {
      this.visual.clear()
      this.resetState()
    }
  }

  /**
   * Re-enable drag operations
   */
  enable(): void {
    this.disabled = false
  }

  /**
   * Check if drag is disabled
   */
  isDisabled(): boolean {
    return this.disabled
  }

  /**
   * Reset internal state
   */
  private resetState(): void {
    this.state = {
      isActive: false,
      source: null,
      currentTarget: null,
      currentResult: null,
      isAltKeyPressed: this.state.isAltKeyPressed,
    }
    this.dropExecuted = false
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.monitorCleanup?.()
    this.dropTargetCleanup?.()

    for (const cleanup of this.cleanupFns) {
      cleanup()
    }

    this.cleanupFns = []
    this.visual.dispose()
  }

  // ========================================
  // Backward compatibility methods (legacy API)
  // ========================================

  /**
   * Legacy: Make an element draggable (preview canvas element)
   * @deprecated Use enableCanvasDrag instead
   */
  makeElementDraggable(element: HTMLElement): () => void {
    const nodeId = element.getAttribute(this.nodeIdAttr)
    if (!nodeId) {
      console.warn('makeElementDraggable: element has no nodeId attribute')
      return () => {}
    }

    const cleanup = draggable({
      element,
      getInitialData: () => ({
        type: 'canvas' as const,
        nodeId,
      }),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            this.renderDragPreview(container, element)
          },
        })
      },
    })

    this.cleanupFns.push(cleanup)
    return cleanup
  }

  /**
   * Legacy: Make a palette item draggable
   * @deprecated Use registerPaletteItem instead
   */
  makePaletteItemDraggable(
    element: HTMLElement,
    componentName: string,
    options?: { properties?: string; textContent?: string; children?: DragSource['children'] }
  ): () => void {
    return this.registerPaletteItem(element, {
      componentName,
      properties: options?.properties,
      textContent: options?.textContent,
      children: options?.children,
    })
  }

  // ========================================
  // Test API - Programmatic drag & drop
  // ========================================

  /**
   * TEST API: Simulate a complete drop operation programmatically.
   * This method bypasses mouse events and directly executes the drop logic,
   * following the same code path as real user interactions.
   *
   * @param params - Drop parameters
   * @returns Result object with success status and optional error
   */
  simulateDrop(params: {
    source: DragSource
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    insertionIndex?: number
  }): { success: boolean; error?: string } {
    const { source, targetNodeId, placement, insertionIndex } = params

    // Find target element
    const targetElement = this.config.container.querySelector(
      `[${this.nodeIdAttr}="${targetNodeId}"]`
    ) as HTMLElement | null

    if (!targetElement) {
      return { success: false, error: `Target element with nodeId "${targetNodeId}" not found` }
    }

    // Detect target properties
    const target = detectTarget(targetElement, this.nodeIdAttr)
    if (!target) {
      return { success: false, error: `Could not detect target properties for "${targetNodeId}"` }
    }

    // Build drop result
    const result: DropResult = {
      target,
      placement,
      targetId: targetNodeId,
      insertionIndex,
    }

    // Execute drop through same path as real drops
    try {
      // Reset dropExecuted flag before executing (normally reset in onDragStart)
      this.dropExecuted = false
      const execResult = this.executeDrop(source, result)
      return execResult
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * TEST API: Simulate dragging to a position and get the calculated drop result.
   * Does NOT execute the drop - only calculates where it would land.
   *
   * @param cursor - The cursor position (clientX, clientY)
   * @returns The calculated DropResult or null if no valid drop target
   */
  simulateDragTo(cursor: Point): DropResult | null {
    // Temporarily set a placeholder source for calculation
    const originalSource = this.state.source
    const originalActive = this.state.isActive

    this.state.source = { type: 'palette', componentName: '__test__' }
    this.state.isActive = true

    // Run the calculation (this also updates visual indicators)
    this.updateDropIndicator({ clientX: cursor.x, clientY: cursor.y })

    // Capture the result
    const result = this.state.currentResult

    // Restore original state
    this.state.source = originalSource
    this.state.isActive = originalActive

    return result
  }

  /**
   * TEST API: Get the current internal drag state.
   * Useful for assertions in tests.
   *
   * @returns A readonly copy of the current state
   */
  getState(): Readonly<DragState> {
    return { ...this.state }
  }

  /**
   * TEST API: Get the visual system state for assertions.
   *
   * @returns Visual state including indicator visibility and rects
   */
  getVisualState(): {
    indicatorVisible: boolean
    indicatorRect: Rect | null
    parentOutlineVisible: boolean
    parentOutlineRect: Rect | null
  } {
    return this.visual.getState()
  }

  /**
   * TEST API: Move an element from one position to another.
   * Convenience method that wraps simulateDrop for canvas elements.
   *
   * @param params - Move parameters
   * @returns Result object with success status
   */
  simulateMove(params: {
    sourceNodeId: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
  }): { success: boolean; error?: string } {
    const { sourceNodeId, targetNodeId, placement } = params

    // Find source element
    const sourceElement = this.config.container.querySelector(
      `[${this.nodeIdAttr}="${sourceNodeId}"]`
    ) as HTMLElement | null

    if (!sourceElement) {
      return { success: false, error: `Source element with nodeId "${sourceNodeId}" not found` }
    }

    const source: DragSource = {
      type: 'canvas',
      nodeId: sourceNodeId,
      element: sourceElement,
    }

    return this.simulateDrop({
      source,
      targetNodeId,
      placement,
    })
  }

  /**
   * TEST API: Insert a new component at a specific position.
   * Convenience method that wraps simulateDrop for palette items.
   *
   * @param params - Insert parameters
   * @returns Result object with success status
   */
  simulateInsert(params: {
    componentName: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    properties?: string
    textContent?: string
  }): { success: boolean; error?: string } {
    const { componentName, targetNodeId, placement, properties, textContent } = params

    const source: DragSource = {
      type: 'palette',
      componentName,
      properties,
      textContent,
    }

    return this.simulateDrop({
      source,
      targetNodeId,
      placement,
    })
  }
}

/**
 * Helper to convert DOMRect to our Rect type
 */
function domRectToRect(domRect: DOMRect): Rect {
  return {
    x: domRect.x,
    y: domRect.y,
    width: domRect.width,
    height: domRect.height,
  }
}

/**
 * Create a DragDropSystem instance
 */
export function createDragDropSystem(config: DragDropConfig): DragDropSystem {
  return new DragDropSystem(config)
}
