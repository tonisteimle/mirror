/**
 * DragDropSystem Types
 */

import type {
  DragSource,
  DropTarget,
  DropResult,
  CodeExecutor,
  PaletteItemData,
} from '../types'

/**
 * System configuration
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
}

/**
 * DragDropSystem interface
 */
export interface DragDropSystem {
  /** Initialize the system */
  init(): void

  /** Register a palette item as draggable */
  registerPaletteItem(element: HTMLElement, data: PaletteItemData): () => void

  /** Enable canvas elements as drag sources */
  enableCanvasDrag(nodeId: string): () => void

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
 */
export interface TargetDetectionResult {
  target: DropTarget | null
  childRects: { nodeId: string; rect: DOMRect }[]
  containerRect: DOMRect | null
}
