/**
 * DragDropController
 *
 * Neuer, testbarer Orchestrator für Drag & Drop Operationen.
 * Nutzt die pure State Machine und Ports für alle externen Abhängigkeiten.
 *
 * Architektur:
 * - State Machine: Alle Zustandsübergänge (pure, testbar)
 * - Ports: Alle externen Abhängigkeiten (mockbar)
 * - Controller: Koordiniert Events → State Machine → Effects → Ports
 */

import type { DragSource, DropTarget, DropResult, Point, Rect } from '../types'
import type { ChildRect } from '../strategies/types'
import type { DragDropPorts, CleanupFn } from './ports'

import {
  transition,
  initialState,
  initialContext,
  isOverTarget,
  getSource,
  getResult,
  canDrop,
  type DragState,
  type DragContext,
  type DragEvent,
  type Effect,
  type TransitionResult,
} from './state-machine'
import { createLogger } from '../../../compiler/utils/logger'

const log = createLogger('DragDrop')

// ============================================
// Configuration
// ============================================

export interface DragDropControllerConfig {
  /** Enable duplicate on Alt+drop */
  enableAltDuplicate?: boolean

  /** Callback when drop is completed */
  onDrop?: (source: DragSource, result: DropResult) => void

  /** Callback when drag starts */
  onDragStart?: (source: DragSource) => void

  /** Callback when drag ends (success or cancel) */
  onDragEnd?: (source: DragSource, success: boolean) => void

  /** Callback when drop is a no-op (element dropped on itself or same position) */
  onNoOpDrop?: (source: DragSource, result: DropResult) => void
}

// ============================================
// Mode Debouncing
// ============================================

type DropMode = 'flex' | 'absolute'

interface ModeDebounceState {
  currentMode: DropMode | null
  lastStableModel: { result: DropResult; mode: DropMode } | null
  timer: ReturnType<typeof setTimeout> | null
}

/**
 * Debounce delay for mode transitions (flex ↔ absolute).
 *
 * When dragging near container edges, the cursor can rapidly cross the boundary
 * between flex and absolute drop zones, causing visual flickering. This delay
 * prevents mode switches until the cursor has "settled" in the new zone.
 *
 * Value derived empirically:
 * - 50ms: Still allows some flickering during fast diagonal drags
 * - 80ms: Good balance between responsiveness and stability
 * - 100ms+: Feels sluggish, noticeable delay when intentionally switching modes
 */
const MODE_TRANSITION_DEBOUNCE_MS = 80

// ============================================
// Controller
// ============================================

export class DragDropController {
  private state: DragState = initialState
  private context: DragContext = initialContext
  private cleanupFns: CleanupFn[] = []
  private dropExecuted = false

  // Mode debouncing
  private modeState: ModeDebounceState = {
    currentMode: null,
    lastStableModel: null,
    timer: null,
  }

  constructor(
    private ports: DragDropPorts,
    private config: DragDropControllerConfig = {}
  ) {}

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Initialize the controller - bind all event handlers.
   * Safe to call multiple times - existing handlers are cleaned up first.
   */
  init(): void {
    // Clean up any existing handlers to prevent accumulation
    for (const cleanup of this.cleanupFns) {
      cleanup()
    }
    this.cleanupFns = []

    // Drag events
    this.cleanupFns.push(
      this.ports.events.onDragStart((source, cursor) => {
        this.dispatch({ type: 'DRAG_START', source, cursor })
      })
    )

    this.cleanupFns.push(
      this.ports.events.onDragMove(cursor => {
        this.dispatch({ type: 'DRAG_MOVE', cursor })
        this.updateTargetDetection(cursor)
      })
    )

    this.cleanupFns.push(
      this.ports.events.onDragEnd(() => {
        this.dispatch({ type: 'DRAG_END' })
      })
    )

    this.cleanupFns.push(
      this.ports.events.onDragCancel(() => {
        this.dispatch({ type: 'DRAG_CANCEL' })
      })
    )

    // Keyboard events
    this.cleanupFns.push(
      this.ports.events.onKeyDown('Alt', () => {
        this.dispatch({ type: 'ALT_KEY_DOWN' })
      })
    )

    this.cleanupFns.push(
      this.ports.events.onKeyUp('Alt', () => {
        this.dispatch({ type: 'ALT_KEY_UP' })
      })
    )
  }

  /**
   * Disable drag operations temporarily.
   */
  disable(): void {
    this.dispatch({ type: 'DISABLE' })
  }

  /**
   * Re-enable drag operations.
   */
  enable(): void {
    this.dispatch({ type: 'ENABLE' })
  }

  /**
   * Check if drag is disabled.
   */
  isDisabled(): boolean {
    return this.context.isDisabled
  }

  /**
   * Clean up all resources.
   * If a drag is active, fires onDragEnd with success=false.
   */
  dispose(): void {
    // If we're in a dragging state, notify that the drag ended unsuccessfully
    if (this.state.type === 'dragging' || this.state.type === 'over-target') {
      const source = getSource(this.state)
      if (source) {
        this.config.onDragEnd?.(source, false)
      }
    }

    this.dispatch({ type: 'RESET' })
    this.resetModeState()

    for (const cleanup of this.cleanupFns) {
      cleanup()
    }
    this.cleanupFns = []
  }

  // ============================================
  // State Machine Dispatch
  // ============================================

  /**
   * Dispatch an event to the state machine and execute resulting effects.
   */
  private dispatch(event: DragEvent): void {
    const result = transition(this.state, event, this.context)

    this.state = result.state
    this.context = result.context

    this.executeEffects(result.effects)
  }

  /**
   * Execute effects returned by the state machine.
   */
  private executeEffects(effects: Effect[]): void {
    for (const effect of effects) {
      switch (effect.type) {
        case 'HIDE_VISUALS':
          this.ports.visual.hideAll()
          this.resetModeState()
          // Clear drag-scoped caches
          this.ports.layout.clearCache?.()
          break

        case 'EXECUTE_DROP':
          this.executeDrop(effect.source, effect.result)
          break

        case 'NOTIFY_DRAG_START':
          this.dropExecuted = false
          this.config.onDragStart?.(effect.source)
          break

        case 'NOTIFY_DRAG_END':
          this.config.onDragEnd?.(effect.source, effect.success)
          break
      }
    }
  }

  // ============================================
  // Target Detection
  // ============================================

  /**
   * Update target detection based on cursor position.
   * Called on every DRAG_MOVE event.
   */
  private updateTargetDetection(cursor: Point): void {
    const source = getSource(this.state)
    if (!source) return

    try {
      // Find target under cursor
      const target = this.ports.targetDetection.findTarget(cursor, source)

      if (!target) {
        // Lost target
        if (isOverTarget(this.state)) {
          this.dispatch({ type: 'TARGET_LOST' })
        }
        return
      }

      // Get rects for calculation
      const childRects = this.ports.layout.getChildRects(target.element)
      const containerRect = this.ports.layout.getContainerRect(target.element)

      if (!containerRect) {
        if (isOverTarget(this.state)) {
          this.dispatch({ type: 'TARGET_LOST' })
        }
        return
      }

      // Calculate drop result
      const result = this.ports.targetDetection.calculateResult(
        cursor,
        target,
        source,
        childRects,
        containerRect
      )

      // Handle mode debouncing
      const newMode = this.getDropMode(target)
      const effectiveResult = this.handleModeTransition(newMode, result)

      // Dispatch appropriate event
      if (isOverTarget(this.state)) {
        // Already over a target - check if it changed
        if (this.state.target.nodeId !== target.nodeId) {
          this.dispatch({
            type: 'TARGET_FOUND',
            target,
            result: effectiveResult,
            childRects,
            containerRect,
          })
        } else {
          // Same target, just update result
          this.dispatch({ type: 'TARGET_UPDATED', result: effectiveResult })
        }
      } else {
        // New target found
        this.dispatch({
          type: 'TARGET_FOUND',
          target,
          result: effectiveResult,
          childRects,
          containerRect,
        })
      }

      // Update visuals
      this.updateVisuals(effectiveResult, childRects, containerRect)
    } catch (error) {
      log.error('Target detection failed:', error)
      // Cancel the drag operation gracefully
      if (isOverTarget(this.state)) {
        this.dispatch({ type: 'TARGET_LOST' })
      }
    }
  }

  /**
   * Update visual indicators based on current result.
   */
  private updateVisuals(result: DropResult, childRects: ChildRect[], containerRect: Rect): void {
    const hint = this.ports.targetDetection.getVisualHint(result, childRects, containerRect)

    if (hint) {
      this.ports.visual.showIndicator(hint)

      // Show parent outline for before/after/absolute placements
      if (
        result.placement === 'before' ||
        result.placement === 'after' ||
        result.placement === 'absolute'
      ) {
        this.ports.visual.showOutline(containerRect)
      }
    } else {
      this.ports.visual.hideAll()
    }
  }

  // ============================================
  // Mode Debouncing
  // ============================================

  private getDropMode(target: DropTarget): DropMode {
    return target.layoutType === 'positioned' ? 'absolute' : 'flex'
  }

  private handleModeTransition(newMode: DropMode, newResult: DropResult): DropResult {
    // Initialize mode on first calculation
    if (this.modeState.currentMode === null) {
      this.modeState.currentMode = newMode
      this.modeState.lastStableModel = { result: newResult, mode: newMode }
      return newResult
    }

    // Same mode - no transition needed
    if (this.modeState.currentMode === newMode) {
      this.clearModeTimer()
      this.modeState.lastStableModel = { result: newResult, mode: newMode }
      return newResult
    }

    // Mode changed - start debounce timer
    if (!this.modeState.timer) {
      this.modeState.timer = setTimeout(() => {
        this.modeState.currentMode = newMode
        this.modeState.lastStableModel = { result: newResult, mode: newMode }
        this.modeState.timer = null
      }, MODE_TRANSITION_DEBOUNCE_MS)
    }

    // During transition, use last stable model if available
    return this.modeState.lastStableModel?.result ?? newResult
  }

  private clearModeTimer(): void {
    if (this.modeState.timer) {
      clearTimeout(this.modeState.timer)
      this.modeState.timer = null
    }
  }

  private resetModeState(): void {
    this.clearModeTimer()
    this.modeState.currentMode = null
    this.modeState.lastStableModel = null
  }

  // ============================================
  // Drop Execution
  // ============================================

  private executeDrop(source: DragSource, result: DropResult): void {
    // Prevent double execution
    if (this.dropExecuted) return
    this.dropExecuted = true

    // Detect no-op drops (element dropped on itself or same position)
    if (this.isNoOpDrop(source, result)) {
      this.config.onNoOpDrop?.(source, result)
      return
    }

    const isAltKey = this.context.isAltKeyPressed
    const shouldDuplicate = Boolean(
      this.config.enableAltDuplicate &&
      isAltKey &&
      source.type === 'canvas' &&
      this.ports.execution.canDuplicate(source)
    )

    const execResult = this.ports.execution.execute(source, result, shouldDuplicate)

    if (execResult.success) {
      this.config.onDrop?.(source, result)
    }
  }

  /**
   * Check if a drop operation would be a no-op.
   *
   * A no-op occurs when:
   * - Canvas element is dropped inside itself
   * - Canvas element is dropped before/after itself
   */
  private isNoOpDrop(source: DragSource, result: DropResult): boolean {
    // Only canvas moves can be no-ops (palette drops always add new elements)
    if (source.type !== 'canvas' || !source.nodeId) {
      return false
    }

    // Dropping an element on itself
    if (source.nodeId === result.targetId) {
      return true
    }

    // Dropping an element before or after itself
    if (source.nodeId === result.target.nodeId) {
      return true
    }

    return false
  }

  // ============================================
  // Public Queries
  // ============================================

  /**
   * Get current state (for testing).
   */
  getState(): Readonly<DragState> {
    return this.state
  }

  /**
   * Get current context (for testing).
   */
  getContext(): Readonly<DragContext> {
    return this.context
  }

  /**
   * Check if currently over a valid drop target.
   */
  isOverValidTarget(): boolean {
    return canDrop(this.state)
  }

  /**
   * Get the current drop result (if any).
   */
  getCurrentResult(): DropResult | null {
    return getResult(this.state)
  }

  // ============================================
  // Test APIs - Programmatic Simulation
  // ============================================

  /**
   * TEST API: Simulate a complete drop operation programmatically.
   * Bypasses mouse events and directly executes the drop logic.
   *
   * @param params - Drop parameters
   * @returns Result object with success status and optional error
   */
  simulateDrop(params: { source: DragSource; target: DropTarget; result: DropResult }): {
    success: boolean
    error?: string
  } {
    try {
      // Reset dropExecuted flag
      this.dropExecuted = false

      // Execute drop through the normal path
      this.executeDrop(params.source, params.result)

      return { success: true }
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
   * @param source - The drag source
   * @param cursor - The cursor position
   * @returns The calculated DropResult or null if no valid drop target
   */
  simulateDragTo(source: DragSource, cursor: Point): DropResult | null {
    // Find target under cursor
    const target = this.ports.targetDetection.findTarget(cursor, source)
    if (!target) return null

    // Get rects for calculation
    const childRects = this.ports.layout.getChildRects(target.element)
    const containerRect = this.ports.layout.getContainerRect(target.element)
    if (!containerRect) return null

    // Calculate drop result
    let result = this.ports.targetDetection.calculateResult(
      cursor,
      target,
      source,
      childRects,
      containerRect
    )

    // Check for container redirect
    const redirect = this.ports.targetDetection.checkContainerRedirect?.(
      cursor,
      target,
      result,
      childRects
    )
    if (redirect) {
      result = redirect.result
    }

    return result
  }

  /**
   * TEST API: Simulate moving a canvas element.
   *
   * @param sourceNodeId - Node ID of element to move
   * @param targetNodeId - Node ID of target container/element
   * @param placement - Where to place ('before', 'after', 'inside')
   * @param container - Container element to search in
   * @param nodeIdAttr - Attribute name for node IDs
   */
  simulateMove(params: {
    sourceNodeId: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    container: HTMLElement
    nodeIdAttr?: string
  }): { success: boolean; error?: string } {
    const {
      sourceNodeId,
      targetNodeId,
      placement,
      container,
      nodeIdAttr = 'data-mirror-id',
    } = params

    // Prevent self-drop
    if (sourceNodeId === targetNodeId && placement === 'inside') {
      return { success: false, error: 'Cannot drop element onto itself' }
    }

    // Find source element
    const sourceElement = container.querySelector(
      `[${nodeIdAttr}="${sourceNodeId}"]`
    ) as HTMLElement | null

    if (!sourceElement) {
      return { success: false, error: `Source element "${sourceNodeId}" not found` }
    }

    // Find target element
    const targetElement = container.querySelector(
      `[${nodeIdAttr}="${targetNodeId}"]`
    ) as HTMLElement | null

    if (!targetElement) {
      return { success: false, error: `Target element "${targetNodeId}" not found` }
    }

    const source: DragSource = {
      type: 'canvas',
      nodeId: sourceNodeId,
      element: sourceElement,
    }

    const target: DropTarget = {
      nodeId: targetNodeId,
      element: targetElement,
      layoutType: this.ports.style.getLayoutType(targetElement),
      direction: this.ports.style.getDirection(targetElement),
      hasChildren: targetElement.children.length > 0,
      isPositioned: false,
    }

    const result: DropResult = {
      target,
      placement,
      targetId: targetNodeId,
    }

    return this.simulateDrop({ source, target, result })
  }

  /**
   * TEST API: Simulate inserting a new component.
   *
   * @param componentName - Name of component to insert
   * @param targetNodeId - Node ID of target container/element
   * @param placement - Where to place ('before', 'after', 'inside')
   * @param container - Container element to search in
   * @param nodeIdAttr - Attribute name for node IDs
   */
  simulateInsert(params: {
    componentName: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    properties?: string
    textContent?: string
    container: HTMLElement
    nodeIdAttr?: string
  }): { success: boolean; error?: string } {
    const {
      componentName,
      targetNodeId,
      placement,
      properties,
      textContent,
      container,
      nodeIdAttr = 'data-mirror-id',
    } = params

    // Find target element
    const targetElement = container.querySelector(
      `[${nodeIdAttr}="${targetNodeId}"]`
    ) as HTMLElement | null

    if (!targetElement) {
      return { success: false, error: `Target element "${targetNodeId}" not found` }
    }

    const source: DragSource = {
      type: 'palette',
      componentName,
      properties,
      textContent,
    }

    const target: DropTarget = {
      nodeId: targetNodeId,
      element: targetElement,
      layoutType: this.ports.style.getLayoutType(targetElement),
      direction: this.ports.style.getDirection(targetElement),
      hasChildren: targetElement.children.length > 0,
      isPositioned: false,
    }

    const result: DropResult = {
      target,
      placement,
      targetId: targetNodeId,
    }

    return this.simulateDrop({ source, target, result })
  }

  /**
   * TEST API: Simulate duplicating a canvas element.
   * Creates a copy of the element at a new position (like Alt+Drop).
   *
   * @param sourceNodeId - Node ID of element to duplicate
   * @param targetNodeId - Node ID of target container/element
   * @param placement - Where to place ('before', 'after', 'inside')
   * @param container - Container element to search in
   * @param nodeIdAttr - Attribute name for node IDs
   */
  simulateDuplicate(params: {
    sourceNodeId: string
    targetNodeId: string
    placement: 'before' | 'after' | 'inside'
    container: HTMLElement
    nodeIdAttr?: string
  }): { success: boolean; error?: string } {
    const {
      sourceNodeId,
      targetNodeId,
      placement,
      container,
      nodeIdAttr = 'data-mirror-id',
    } = params

    // Prevent self-drop when inside
    if (sourceNodeId === targetNodeId && placement === 'inside') {
      return { success: false, error: 'Cannot duplicate element into itself' }
    }

    // Find source element
    const sourceElement = container.querySelector(
      `[${nodeIdAttr}="${sourceNodeId}"]`
    ) as HTMLElement | null

    if (!sourceElement) {
      return { success: false, error: `Source element "${sourceNodeId}" not found` }
    }

    // Find target element
    const targetElement = container.querySelector(
      `[${nodeIdAttr}="${targetNodeId}"]`
    ) as HTMLElement | null

    if (!targetElement) {
      return { success: false, error: `Target element "${targetNodeId}" not found` }
    }

    const source: DragSource = {
      type: 'canvas',
      nodeId: sourceNodeId,
      element: sourceElement,
    }

    const target: DropTarget = {
      nodeId: targetNodeId,
      element: targetElement,
      layoutType: this.ports.style.getLayoutType(targetElement),
      direction: this.ports.style.getDirection(targetElement),
      hasChildren: targetElement.children.length > 0,
      isPositioned: false,
    }

    const result: DropResult = {
      target,
      placement,
      targetId: targetNodeId,
    }

    // Execute as duplicate (force shouldDuplicate = true)
    try {
      const canDuplicate = this.ports.execution.canDuplicate(source)
      if (!canDuplicate) {
        return { success: false, error: 'Element cannot be duplicated' }
      }

      const execResult = this.ports.execution.execute(source, result, true) // shouldDuplicate = true
      return { success: execResult.success, error: execResult.error }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
  }

  /**
   * TEST API: Simulate inserting a new component with absolute positioning.
   * Used for inserting into stacked/pos containers where x/y coordinates are needed.
   *
   * @param componentName - Name of component to insert
   * @param targetNodeId - Node ID of target container
   * @param position - The x/y position relative to the container
   * @param container - Container element to search in
   * @param nodeIdAttr - Attribute name for node IDs
   */
  simulateInsertAbsolute(params: {
    componentName: string
    targetNodeId: string
    position: Point
    properties?: string
    textContent?: string
    container: HTMLElement
    nodeIdAttr?: string
  }): { success: boolean; error?: string } {
    const {
      componentName,
      targetNodeId,
      position,
      properties,
      textContent,
      container,
      nodeIdAttr = 'data-mirror-id',
    } = params

    // Find target element
    const targetElement = container.querySelector(
      `[${nodeIdAttr}="${targetNodeId}"]`
    ) as HTMLElement | null

    if (!targetElement) {
      return { success: false, error: `Target element "${targetNodeId}" not found` }
    }

    // Build properties with x/y coordinates
    const positionProps = `x ${Math.round(position.x)}, y ${Math.round(position.y)}`
    const finalProperties = properties ? `${positionProps}, ${properties}` : positionProps

    const source: DragSource = {
      type: 'palette',
      componentName,
      properties: finalProperties,
      textContent,
    }

    const target: DropTarget = {
      nodeId: targetNodeId,
      element: targetElement,
      layoutType: 'positioned', // Force positioned for absolute insert
      direction: null,
      hasChildren: targetElement.children.length > 0,
      isPositioned: true,
    }

    const result: DropResult = {
      target,
      placement: 'inside', // Absolute positioned elements go inside
      targetId: targetNodeId,
      position, // Include position for the executor
    }

    return this.simulateDrop({ source, target, result })
  }

  /**
   * TEST API: Get visual system state for assertions.
   * Note: Requires VisualPort to implement getState() method.
   */
  getVisualState(): {
    hasIndicator: boolean
    hasOutline: boolean
  } {
    // This is a simplified implementation.
    // The actual visual state would need to be tracked by the VisualPort.
    return {
      hasIndicator: this.state.type === 'over-target',
      hasOutline:
        this.state.type === 'over-target' &&
        (this.state.result.placement === 'before' ||
          this.state.result.placement === 'after' ||
          this.state.result.placement === 'absolute'),
    }
  }
}

// ============================================
// Factory
// ============================================

export function createDragDropController(
  ports: DragDropPorts,
  config?: DragDropControllerConfig
): DragDropController {
  return new DragDropController(ports, config)
}
