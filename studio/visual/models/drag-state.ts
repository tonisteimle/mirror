/**
 * DragState Model - Pure drag state management
 *
 * No DOM dependencies. Fully testable with unit tests.
 *
 * Responsibilities:
 * - Track drag lifecycle (idle → pending → dragging → complete)
 * - Store positions and calculate deltas
 * - Detect drag threshold
 * - Track source and target information
 */

// ============================================================================
// Types
// ============================================================================

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

export type DragPhase = 'idle' | 'pending' | 'dragging' | 'complete'

export type DragSource =
  | { type: 'element'; nodeId: string; rect: Rect; grabOffset: Point }
  | { type: 'palette'; componentName: string; properties?: string; textContent?: string; defaultSize?: { width: number; height: number } }

export interface DragTarget {
  nodeId: string
  placement: 'before' | 'after' | 'inside' | 'absolute'
  insertionIndex?: number
  absolutePosition?: Point
}

export interface DragStateSnapshot {
  phase: DragPhase
  source: DragSource | null
  startPosition: Point | null
  currentPosition: Point | null
  delta: Point
  target: DragTarget | null
  isDuplicate: boolean
}

// ============================================================================
// Configuration
// ============================================================================

export interface DragConfig {
  /** Minimum movement in pixels before drag starts (default: 3) */
  threshold: number
  /** Grid size for snapping (0 = no grid) */
  gridSize: number
  /** Whether to create a copy instead of move */
  duplicate: boolean
}

const DEFAULT_CONFIG: DragConfig = {
  threshold: 3,
  gridSize: 0,
  duplicate: false,
}

// ============================================================================
// DragState Model
// ============================================================================

export class DragState {
  private phase: DragPhase = 'idle'
  private source: DragSource | null = null
  private startPosition: Point | null = null
  private currentPosition: Point | null = null
  private target: DragTarget | null = null
  private config: DragConfig
  private isDuplicate: boolean = false

  constructor(config: Partial<DragConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.isDuplicate = this.config.duplicate
  }

  // --------------------------------------------------------------------------
  // State Queries (Pure)
  // --------------------------------------------------------------------------

  getPhase(): DragPhase {
    return this.phase
  }

  isIdle(): boolean {
    return this.phase === 'idle'
  }

  isPending(): boolean {
    return this.phase === 'pending'
  }

  isDragging(): boolean {
    return this.phase === 'dragging'
  }

  isComplete(): boolean {
    return this.phase === 'complete'
  }

  getSource(): DragSource | null {
    return this.source
  }

  getTarget(): DragTarget | null {
    return this.target
  }

  getStartPosition(): Point | null {
    return this.startPosition
  }

  getCurrentPosition(): Point | null {
    return this.currentPosition
  }

  getDelta(): Point {
    if (!this.startPosition || !this.currentPosition) {
      return { x: 0, y: 0 }
    }
    return {
      x: this.currentPosition.x - this.startPosition.x,
      y: this.currentPosition.y - this.startPosition.y,
    }
  }

  getDistance(): number {
    const delta = this.getDelta()
    return Math.sqrt(delta.x * delta.x + delta.y * delta.y)
  }

  isDuplicating(): boolean {
    return this.isDuplicate
  }

  /**
   * Get complete state snapshot (for rendering/debugging)
   */
  getSnapshot(): DragStateSnapshot {
    return {
      phase: this.phase,
      source: this.source,
      startPosition: this.startPosition,
      currentPosition: this.currentPosition,
      delta: this.getDelta(),
      target: this.target,
      isDuplicate: this.isDuplicate,
    }
  }

  // --------------------------------------------------------------------------
  // State Transitions
  // --------------------------------------------------------------------------

  /**
   * Start a potential drag (mousedown/touchstart)
   * Transitions: idle → pending
   */
  start(source: DragSource, position: Point): boolean {
    if (this.phase !== 'idle') {
      return false
    }
    this.phase = 'pending'
    this.source = source
    this.startPosition = { ...position }
    this.currentPosition = { ...position }
    this.target = null
    this.isDuplicate = this.config.duplicate
    return true
  }

  /**
   * Update position during drag (mousemove/touchmove)
   * Transitions: pending → dragging (when threshold exceeded)
   * Returns: true if position changed
   */
  move(position: Point): boolean {
    if (this.phase !== 'pending' && this.phase !== 'dragging') {
      return false
    }

    this.currentPosition = { ...position }

    // Check threshold for pending → dragging transition
    if (this.phase === 'pending' && this.exceedsThreshold()) {
      this.phase = 'dragging'
    }

    return true
  }

  /**
   * Set the current drop target
   */
  setTarget(target: DragTarget | null): void {
    if (this.phase === 'dragging') {
      this.target = target
    }
  }

  /**
   * Set duplicate mode (e.g., when Alt key is pressed)
   */
  setDuplicate(duplicate: boolean): void {
    this.isDuplicate = duplicate
  }

  /**
   * Complete the drag (mouseup/touchend)
   * Transitions: dragging → complete, pending → idle
   * Returns: Result if drag completed, null if cancelled
   */
  complete(): DragResult | null {
    if (this.phase === 'dragging' && this.source && this.target) {
      this.phase = 'complete'
      return {
        source: this.source,
        target: this.target,
        delta: this.getDelta(),
        isDuplicate: this.isDuplicate,
      }
    }
    // Pending drag that never started → cancel
    this.reset()
    return null
  }

  /**
   * Cancel the drag
   * Transitions: any → idle
   */
  cancel(): void {
    this.reset()
  }

  /**
   * Reset to idle state
   */
  reset(): void {
    this.phase = 'idle'
    this.source = null
    this.startPosition = null
    this.currentPosition = null
    this.target = null
    this.isDuplicate = this.config.duplicate
  }

  // --------------------------------------------------------------------------
  // Calculations (Pure)
  // --------------------------------------------------------------------------

  /**
   * Check if movement exceeds drag threshold
   */
  private exceedsThreshold(): boolean {
    return this.getDistance() >= this.config.threshold
  }

  /**
   * Apply grid snapping to a position
   */
  snapToGrid(position: Point): Point {
    if (this.config.gridSize <= 0) {
      return position
    }
    return {
      x: Math.round(position.x / this.config.gridSize) * this.config.gridSize,
      y: Math.round(position.y / this.config.gridSize) * this.config.gridSize,
    }
  }

  /**
   * Calculate new position for element based on drag delta
   */
  calculateNewPosition(originalRect: Rect): Point {
    const delta = this.getDelta()
    const newPosition = {
      x: originalRect.x + delta.x,
      y: originalRect.y + delta.y,
    }
    return this.snapToGrid(newPosition)
  }

  /**
   * Calculate ghost rect based on current cursor position and grab offset.
   * The ghost maintains the exact relative position where the user grabbed it.
   */
  calculateGhostRect(): Rect | null {
    if (!this.source || !this.currentPosition) {
      return null
    }

    if (this.source.type === 'element') {
      // Element drag: use grab offset to maintain relative cursor position
      const { rect, grabOffset } = this.source
      const ghostPosition = {
        x: this.currentPosition.x - grabOffset.x,
        y: this.currentPosition.y - grabOffset.y,
      }
      const snappedPosition = this.snapToGrid(ghostPosition)
      return {
        x: snappedPosition.x,
        y: snappedPosition.y,
        width: rect.width,
        height: rect.height,
      }
    } else {
      // Palette drag: center the default size on cursor
      const size = this.source.defaultSize || { width: 100, height: 40 }
      const ghostPosition = {
        x: this.currentPosition.x - size.width / 2,
        y: this.currentPosition.y - size.height / 2,
      }
      const snappedPosition = this.snapToGrid(ghostPosition)
      return {
        x: snappedPosition.x,
        y: snappedPosition.y,
        width: size.width,
        height: size.height,
      }
    }
  }

  /**
   * Get the grab offset for element sources
   */
  getGrabOffset(): Point | null {
    if (this.source?.type === 'element') {
      return this.source.grabOffset
    }
    return null
  }

  // --------------------------------------------------------------------------
  // Configuration
  // --------------------------------------------------------------------------

  setGridSize(size: number): void {
    this.config.gridSize = size
  }

  setThreshold(threshold: number): void {
    this.config.threshold = threshold
  }

  getConfig(): DragConfig {
    return { ...this.config }
  }
}

// ============================================================================
// Result Types
// ============================================================================

export interface DragResult {
  source: DragSource
  target: DragTarget
  delta: Point
  isDuplicate: boolean
}

// ============================================================================
// Factory
// ============================================================================

export function createDragState(config?: Partial<DragConfig>): DragState {
  return new DragState(config)
}
