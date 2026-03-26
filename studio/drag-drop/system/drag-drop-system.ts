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

import type {
  DragSource,
  DropResult,
  PaletteItemData,
  Point,
  Rect,
} from '../types'
import type {
  DragDropConfig,
  DragDropSystem as IDragDropSystem,
  DragState,
} from './types'

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

        // Show ghost
        const location = source.element.getBoundingClientRect()
        const center: Point = {
          x: location.x + location.width / 2,
          y: location.y + location.height / 2,
        }
        this.visual.showGhost(dragSource, center)

        this.config.onDragStart?.(dragSource)
      },

      onDrag: ({ location }) => {
        if (!this.state.isActive || !this.state.source) return

        const cursor: Point = {
          x: location.current.input.clientX,
          y: location.current.input.clientY,
        }

        // Update ghost position
        this.visual.updateGhost(cursor)
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
        // Extract drag source from native drag data
        const source = this.extractNativeDragSource(e)
        if (!source) return

        this.state.isActive = true
        this.state.source = source

        // Show ghost
        this.visual.showGhost(source, { x: e.clientX, y: e.clientY })
        this.config.onDragStart?.(source)
      }

      // Update ghost and indicator
      this.visual.updateGhost({ x: e.clientX, y: e.clientY })
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
      this.visual.hideZoneOverlay()
    }

    const handleDrop = (e: DragEvent) => {
      if (this.disabled) return
      if (!e.dataTransfer?.types.includes('application/mirror-component')) return

      e.preventDefault()

      // Extract source from the actual drop data (may differ from dragover)
      const jsonData = e.dataTransfer.getData('application/mirror-component')
      if (!jsonData) {
        this.visual.clear()
        this.resetState()
        return
      }

      const dragData = JSON.parse(jsonData)
      const source: DragSource = {
        type: 'palette',
        componentName: dragData.componentName,
        properties: dragData.properties,
        textContent: dragData.textContent,
        children: dragData.children,
      }

      // Update indicator one last time
      this.updateDropIndicator({ clientX: e.clientX, clientY: e.clientY })

      // Execute drop if we have a result
      if (this.state.currentResult) {
        this.executeDrop(source, this.state.currentResult)
        this.config.onDragEnd?.(source, true)
      } else {
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
    const target = findClosestTarget(elementUnderCursor, this.nodeIdAttr)
    if (!target) {
      this.visual.hideIndicator()
      this.visual.hideZoneOverlay()
      this.state.currentTarget = null
      this.state.currentResult = null
      return
    }

    // Find strategy for this target (Webflow-style: no positioned container handling)
    const strategy = this.registry.findStrategy(target)
    if (!strategy) {
      this.visual.hideIndicator()
      return
    }

    // Get child rects for calculation
    const childRects = getChildRects(target.element, this.nodeIdAttr)
    const containerRect = getContainerRect(target.element)

    // Calculate drop result
    const calcResult = strategy.calculate(cursor, target, this.state.source, childRects)

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
    this.visual.showIndicator(visualHint)
    this.visual.hideZoneOverlay()
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
   */
  private executeDrop(source: DragSource, result: DropResult): void {
    const executor = this.config.codeExecutor
    if (!executor) {
      // Just call the callback if no executor
      this.config.onDrop?.(source, result)
      return
    }

    // Duplicate if Alt is pressed and this is a canvas element
    if (this.config.enableAltDuplicate && this.state.isAltKeyPressed && source.type === 'canvas') {
      const execResult = executor.duplicate(source, result)
      if (!execResult.success) {
        console.error('Duplicate failed:', execResult.error)
      }
    } else {
      const execResult = executor.execute(source, result)
      if (!execResult.success) {
        console.error('Drop failed:', execResult.error)
      }
    }

    this.config.onDrop?.(source, result)
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
    })

    this.cleanupFns.push(cleanup)
    return cleanup
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
