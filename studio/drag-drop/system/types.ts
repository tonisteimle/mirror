/**
 * DragDropSystem Types
 *
 * @deprecated This file contains legacy types for backwards compatibility.
 * The new architecture uses:
 * - DragDropController (orchestrator)
 * - State Machine (pure state transitions)
 * - Ports & Adapters (hexagonal architecture)
 *
 * See: ./drag-drop-controller.ts, ./state-machine.ts, ./ports.ts
 */

import type { DragSource, DropTarget, DropResult, CodeExecutor, PaletteItemData } from '../types'
import type { LayoutRect } from '../../core/state'
import type { DOMAdapter } from './dom-adapter'

/**
 * System configuration
 *
 * @deprecated Use DragDropBootstrapConfig from ./bootstrap-example.ts instead.
 * This interface is kept for backwards compatibility with legacy code.
 */
export interface DragDropConfig {
  /** Container element for drop targets (preview container) */
  container: HTMLElement

  /** Code executor for applying changes */
  codeExecutor?: CodeExecutor

  /** Callback when drop is completed */
  onDrop?: (source: DragSource, result: DropResult) => void

  /** Callback when drag starts */
  onDragStart?: (source: DragSource) => void

  /** Callback when drag ends (success or cancel) */
  onDragEnd?: (source: DragSource, success: boolean) => void

  /** Enable duplicate on Alt+drop */
  enableAltDuplicate?: boolean

  /** Custom attribute for node IDs */
  nodeIdAttribute?: string

  /** Get cached layout info from state (Phase 5 optimization) */
  getLayoutInfo?: () => Map<string, LayoutRect> | null

  /** DOM adapter for testability (defaults to real DOM) */
  domAdapter?: DOMAdapter
}

/**
 * DragDropSystem interface
 *
 * @deprecated Use DragDropController from ./drag-drop-controller.ts instead.
 * This interface is kept as a facade for legacy app.js compatibility.
 * The actual implementation delegates to DragDropController internally.
 *
 * Migration:
 * - init() → controller.init()
 * - registerPaletteItem() → eventPort.registerPaletteDrag()
 * - enableCanvasDrag() → eventPort.registerCanvasDrag()
 * - disable/enable/isDisabled → controller methods
 */
export interface DragDropSystem {
  /** Initialize the system */
  init(): void

  /** Register a palette item as draggable */
  registerPaletteItem(element: HTMLElement, data: PaletteItemData): () => void

  /** Enable canvas elements as drag sources */
  enableCanvasDrag(nodeId: string): () => void

  /**
   * Legacy: Make an element draggable (preview canvas element)
   * @deprecated Use enableCanvasDrag instead
   */
  makeElementDraggable?(element: HTMLElement): () => void

  /** Temporarily disable drag operations (e.g., during compile) */
  disable(): void

  /** Re-enable drag operations */
  enable(): void

  /** Check if drag is currently disabled */
  isDisabled(): boolean

  /** Clean up all resources */
  dispose(): void
}

/**
 * Internal drag state
 *
 * @deprecated Use DragState from ./state-machine.ts instead.
 * The new state machine provides type-safe discriminated union states:
 * IdleState | DraggingState | OverTargetState | DroppedState
 */
export interface DragState {
  isActive: boolean
  source: DragSource | null
  currentTarget: DropTarget | null
  currentResult: DropResult | null
  isAltKeyPressed: boolean
}

/**
 * DropTarget detection result
 *
 * @deprecated Not used. Target detection now returns DropTarget directly.
 * See: TargetDetectionPort in ./ports.ts
 */
export interface TargetDetectionResult {
  target: DropTarget | null
  childRects: { nodeId: string; rect: DOMRect }[]
  containerRect: DOMRect | null
}
