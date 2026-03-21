/**
 * InteractionCoordinator - Unified interaction handling for preview elements
 *
 * Provides a single entry point for all drag/drop operations using DragController.
 *
 * Architecture:
 * - Single entry point for all drag operations
 * - Delegates to DragController for actual drag logic
 * - Emits events for state synchronization
 *
 * Usage:
 * ```typescript
 * const coordinator = createInteractionCoordinator(container, config)
 * coordinator.startDrag(element, event)
 * // ... drag operations handled automatically
 * ```
 */

import { events } from '../core/events'
import { state, actions, type SelectionOrigin, type DeferredSelection } from '../core/state'
import { DragController, createDragController, type DragCallbacks } from '../visual/controllers/drag-controller'
import type { DragSource, DragResult } from '../visual/models/drag-state'

// ============================================================================
// Types
// ============================================================================

export interface InteractionCoordinatorConfig {
  /** Grid size for snapping (0 = disabled) */
  gridSize?: number
  /** Enable smart guides */
  enableGuides?: boolean
  /** Enable alignment zones */
  enableAlignmentZones?: boolean
  /** Drag threshold in pixels */
  threshold?: number
}

export interface InteractionCallbacks {
  /** Called when a drag starts */
  onDragStart?: (source: DragSource) => void
  /** Called when a drag completes successfully */
  onDragComplete?: (result: DragResult) => void
  /** Called when a drag is cancelled */
  onDragCancel?: () => void
  /** Called when selection changes */
  onSelectionChange?: (nodeId: string | null, origin: SelectionOrigin) => void
}

// ============================================================================
// InteractionCoordinator
// ============================================================================

export class InteractionCoordinator {
  private container: HTMLElement
  private dragController: DragController | null = null
  private config: InteractionCoordinatorConfig
  private callbacks: InteractionCallbacks
  private isInitialized: boolean = false

  constructor(
    container: HTMLElement,
    config: InteractionCoordinatorConfig = {},
    callbacks: InteractionCallbacks = {}
  ) {
    this.container = container
    this.config = config
    this.callbacks = callbacks
  }

  // --------------------------------------------------------------------------
  // Initialization
  // --------------------------------------------------------------------------

  /**
   * Initialize the coordinator (lazy initialization)
   */
  private ensureInitialized(): void {
    if (this.isInitialized) return

    // Validate container before initialization
    if (!this.container) {
      console.error('[InteractionCoordinator] Cannot initialize: container is not available')
      return
    }

    // Create DragController with callbacks
    const controllerCallbacks: DragCallbacks = {
      onDragStart: (source) => {
        events.emit('drag:started', {
          nodeId: source.type === 'element' ? source.nodeId : 'palette',
          source: source.type === 'element' ? 'preview' : 'library',
        })
        this.callbacks.onDragStart?.(source)
      },
      onDragEnd: (result) => {
        if (result.target && result.source.type === 'element') {
          // Emit move:completed event
          const position = result.target.placement === 'absolute' ? 'inside' : result.target.placement
          events.emit('move:completed', {
            nodeId: result.source.nodeId,
            targetId: result.target.nodeId,
            position: position as 'before' | 'after' | 'inside',
            layoutTransition: result.target.absolutePosition ? {
              from: 'flex',
              to: 'absolute',
              absolutePosition: result.target.absolutePosition,
            } : undefined,
          })
        }
        events.emit('drag:ended', { success: !!result.target })
        this.callbacks.onDragComplete?.(result)
      },
      onDragCancel: () => {
        events.emit('drag:ended', { success: false })
        this.callbacks.onDragCancel?.()
      },
    }

    this.dragController = createDragController(
      this.container,
      {
        threshold: this.config.threshold,
        gridSize: this.config.gridSize,
        enableGuides: this.config.enableGuides,
        enableAlignmentZones: this.config.enableAlignmentZones,
        getScale: () => actions.getPreviewScale(),
      },
      controllerCallbacks
    )

    this.isInitialized = true
  }

  // --------------------------------------------------------------------------
  // Drag Operations
  // --------------------------------------------------------------------------

  /**
   * Start dragging an element
   */
  startDrag(element: HTMLElement, event: MouseEvent): void {
    this.ensureInitialized()
    if (!this.dragController) {
      console.warn('[InteractionCoordinator] startDrag failed: controller not initialized')
      return
    }
    this.dragController.startElementDrag(element, event)
  }

  /**
   * Start dragging from palette (new component)
   */
  startPaletteDrag(
    componentName: string,
    event: MouseEvent,
    options?: { properties?: string; textContent?: string; defaultSize?: { width: number; height: number } }
  ): void {
    this.ensureInitialized()
    if (!this.dragController) {
      console.warn('[InteractionCoordinator] startPaletteDrag failed: controller not initialized')
      return
    }
    this.dragController.startPaletteDrag(componentName, event, options)
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.dragController?.isDragging() ?? false
  }

  /**
   * Cancel current drag operation
   */
  cancelDrag(): void {
    this.dragController?.cancel()
  }

  /**
   * Update grid size during drag
   */
  setGridSize(size: number): void {
    this.dragController?.setGridSize(size)
  }

  // --------------------------------------------------------------------------
  // Selection Operations
  // --------------------------------------------------------------------------

  /**
   * Select a node
   */
  select(nodeId: string | null, origin: SelectionOrigin): void {
    actions.setSelection(nodeId, origin)
    this.callbacks.onSelectionChange?.(nodeId, origin)
  }

  /**
   * Clear selection
   */
  clearSelection(origin: SelectionOrigin = 'preview'): void {
    actions.clearSelection(origin)
    this.callbacks.onSelectionChange?.(null, origin)
  }

  /**
   * Get current selection
   */
  getSelection(): { nodeId: string | null; origin: SelectionOrigin } {
    return state.get().selection
  }

  // --------------------------------------------------------------------------
  // Multi-Selection Operations
  // --------------------------------------------------------------------------

  /**
   * Toggle a node in multi-selection
   */
  toggleMultiSelection(nodeId: string): void {
    actions.toggleMultiSelection(nodeId)
  }

  /**
   * Set multi-selection to specific nodes
   */
  setMultiSelection(nodeIds: string[]): void {
    actions.setMultiSelection(nodeIds)
  }

  /**
   * Clear multi-selection
   */
  clearMultiSelection(): void {
    actions.clearMultiSelection()
  }

  /**
   * Get current multi-selection
   */
  getMultiSelection(): string[] {
    return state.get().multiSelection
  }

  // --------------------------------------------------------------------------
  // Deferred Selection (for compile-time selection)
  // --------------------------------------------------------------------------

  /**
   * Set a deferred selection to be resolved after compile completes
   *
   * Use this when:
   * - Selecting by nodeId during compile (nodeId known, SourceMap not ready)
   * - Selecting by line after code insertion (nodeId not yet known)
   */
  setDeferredSelection(deferred: DeferredSelection): void {
    actions.setDeferredSelection(deferred)
  }

  /**
   * Convenience: defer selection by nodeId
   * Use when you know the nodeId but compile is in progress
   */
  deferSelectionById(nodeId: string, origin: SelectionOrigin): void {
    actions.setDeferredSelection({ type: 'nodeId', nodeId, origin })
  }

  /**
   * Convenience: defer selection by line
   * Use for drag-drop insertion when you only know the line number
   */
  deferSelectionByLine(line: number, componentName: string, origin: SelectionOrigin): void {
    actions.setDeferredSelection({ type: 'line', line, componentName, origin })
  }

  /**
   * Check if there's a deferred selection waiting
   */
  hasDeferredSelection(): boolean {
    return state.get().deferredSelection !== null
  }

  // --------------------------------------------------------------------------
  // Lifecycle
  // --------------------------------------------------------------------------

  /**
   * Dispose the coordinator
   */
  dispose(): void {
    this.dragController?.dispose()
    this.dragController = null
    this.isInitialized = false
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createInteractionCoordinator(
  container: HTMLElement,
  config?: InteractionCoordinatorConfig,
  callbacks?: InteractionCallbacks
): InteractionCoordinator {
  return new InteractionCoordinator(container, config, callbacks)
}
