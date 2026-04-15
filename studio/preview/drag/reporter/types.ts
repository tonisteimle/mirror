/**
 * Drag Reporter System - Type Definitions
 *
 * All interfaces for the self-reporting drag system.
 * Components implement Reportable<T> to provide their state.
 */

import type { Point, FlexLayout, DragSource, DropTarget } from '../types'

// Re-export Point for convenience
export type { Point }

/**
 * Interface for reportable components
 */
export interface Reportable<T> {
  report(): T
}

/**
 * Escape zone detection details
 */
export interface EscapeZoneReport {
  detected: boolean
  childEnd: number | null
  containerEnd: number | null
  cursorPos: number | null
  usedParent: boolean
  parentId: string | null
}

/**
 * HitDetector report
 */
export interface HitReport {
  cursor: Point
  elementAtPoint: string | null
  containerId: string | null
  layout: FlexLayout | null
  containerRect: DOMRect | null
  escapeZone: EscapeZoneReport
}

/**
 * Midpoint comparison for insertion calculation
 */
export interface MidpointComparison {
  nodeId: string
  midpoint: number
  cursorPos: number
  comparison: 'before' | 'after'
}

/**
 * InsertionCalculator report
 */
export interface InsertionReport {
  index: number
  linePosition: Point
  lineSize: number
  orientation: 'horizontal' | 'vertical'
  childCount: number
  insertBefore: string | null
  insertAfter: string | null
  cursorMidpoints: MidpointComparison[]
}

/**
 * Indicator visibility and position report
 */
export interface IndicatorReport {
  lineVisible: boolean
  linePosition: Point | null
  highlightVisible: boolean
  highlightedContainerId: string | null
  highlightRect: DOMRect | null
}

/**
 * LayoutCache statistics report
 */
export interface CacheReport {
  elementCount: number
  containerCount: number
  isEmpty: boolean
  containerElement: string | null
}

/**
 * DragController state report
 */
export interface ControllerReport {
  state: 'idle' | 'dragging'
  source: DragSource | null
  target: DropTarget | null
}

/**
 * Summary for quick inspection
 */
export interface DragFrameSummary {
  isDragging: boolean
  hasTarget: boolean
  insertionDescription: string | null
}

/**
 * Complete frame snapshot - all component states at one point in time
 */
export interface DragFrame {
  frameId: number
  timestamp: number
  cursor: Point
  controller: ControllerReport
  hit: HitReport
  insertion: InsertionReport | null
  indicator: IndicatorReport
  cache: CacheReport
  summary: DragFrameSummary
}

/**
 * Session metadata
 */
export interface DragSession {
  sessionId: string
  startTime: number
  endTime: number | null
  frameCount: number
  source: DragSource | null
  finalTarget: DropTarget | null
  completed: boolean
}

/**
 * Adapter interface for receiving drag reports
 */
export interface ReportAdapter {
  /** Called when a drag session starts */
  onSessionStart(session: DragSession): void

  /** Called on each frame capture */
  onFrame(frame: DragFrame): void

  /** Called when a drag session ends */
  onSessionEnd(session: DragSession): void

  /** Optional cleanup */
  destroy?(): void
}

/**
 * Reporter configuration
 */
export interface ReporterConfig {
  /** Enable reporting (default: false) */
  enabled: boolean

  /** Throttle interval in ms (0 = no throttle, default: 0) */
  throttleMs: number

  /** Max frames to keep in memory (default: 1000) */
  maxFrames: number
}
