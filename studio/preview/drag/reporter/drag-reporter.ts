/**
 * DragReporter - Central coordinator for drag state reporting
 *
 * Collects reports from all drag components into unified DragFrames
 * and distributes them to registered adapters.
 *
 * Usage:
 *   const reporter = new DragReporter()
 *   reporter.addAdapter(new ConsoleAdapter())
 *   reporter.enable()
 *   // ... drag operations happen ...
 *   reporter.disable()
 */

import type {
  Point,
  DragFrame,
  DragSession,
  ReportAdapter,
  ReporterConfig,
  HitReport,
  InsertionReport,
  IndicatorReport,
  CacheReport,
  ControllerReport,
  Reportable,
} from './types'
import { createLogger } from '../../../../compiler/utils/logger'

const log = createLogger('DragReporter')

/**
 * Reportable components interface
 */
export interface ReportableComponents {
  hitDetector: Reportable<HitReport>
  insertionCalculator: Reportable<InsertionReport | null>
  indicator: Reportable<IndicatorReport>
  cache: Reportable<CacheReport>
  controller: Reportable<ControllerReport>
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ReporterConfig = {
  enabled: false,
  throttleMs: 0,
  maxFrames: 1000,
}

export class DragReporter {
  private config: ReporterConfig
  private adapters: ReportAdapter[] = []
  private components: ReportableComponents | null = null
  private currentSession: DragSession | null = null
  private frames: DragFrame[] = []
  private frameCounter = 0
  private lastFrameTime = 0

  constructor(config: Partial<ReporterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Enable reporting
   */
  enable(): void {
    this.config.enabled = true
    log.info('Reporting enabled')
  }

  /**
   * Disable reporting
   */
  disable(): void {
    this.config.enabled = false
    log.info('Reporting disabled')
  }

  /**
   * Check if reporting is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled
  }

  /**
   * Set throttle interval
   */
  setThrottle(ms: number): void {
    this.config.throttleMs = ms
  }

  /**
   * Register reportable components
   */
  registerComponents(components: ReportableComponents): void {
    this.components = components
    log.debug('Components registered')
  }

  /**
   * Add a report adapter
   */
  addAdapter(adapter: ReportAdapter): void {
    this.adapters.push(adapter)
    log.debug('Adapter added, total:', this.adapters.length)
  }

  /**
   * Remove a report adapter
   */
  removeAdapter(adapter: ReportAdapter): void {
    const index = this.adapters.indexOf(adapter)
    if (index >= 0) {
      this.adapters.splice(index, 1)
      log.debug('Adapter removed')
    }
  }

  /**
   * Clear all adapters
   */
  clearAdapters(): void {
    this.adapters.forEach(a => a.destroy?.())
    this.adapters = []
  }

  /**
   * Start a new drag session
   */
  startSession(source: import('../types').DragSource | null): void {
    if (!this.config.enabled) return

    this.currentSession = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      endTime: null,
      frameCount: 0,
      source,
      finalTarget: null,
      completed: false,
    }
    this.frames = []
    this.frameCounter = 0
    this.lastFrameTime = 0

    this.adapters.forEach(a => a.onSessionStart(this.currentSession!))
    log.info('Session started:', this.currentSession.sessionId)
  }

  /**
   * Capture a frame at current cursor position
   */
  captureFrame(cursor: Point): void {
    if (!this.config.enabled || !this.currentSession || !this.components) return
    const now = Date.now()
    if (this.config.throttleMs > 0 && now - this.lastFrameTime < this.config.throttleMs) return
    this.lastFrameTime = now
    const frame = this.buildFrame(cursor)
    this.storeFrame(frame)
    this.adapters.forEach(a => a.onFrame(frame))
    this.currentSession.frameCount++
  }

  /**
   * End the current session
   */
  endSession(target: import('../types').DropTarget | null, completed: boolean): void {
    if (!this.config.enabled || !this.currentSession) return

    this.currentSession.endTime = Date.now()
    this.currentSession.finalTarget = target
    this.currentSession.completed = completed

    this.adapters.forEach(a => a.onSessionEnd(this.currentSession!))
    log.info(
      'Session ended:',
      this.currentSession.sessionId,
      'frames:',
      this.currentSession.frameCount,
      'completed:',
      completed
    )

    this.currentSession = null
  }

  /**
   * Get all captured frames (for RecordingAdapter)
   */
  getFrames(): DragFrame[] {
    return [...this.frames]
  }

  /**
   * Get current session info
   */
  getCurrentSession(): DragSession | null {
    return this.currentSession
  }

  /**
   * Build a complete DragFrame from all components
   */
  private buildFrame(cursor: Point): DragFrame {
    const hit = this.components!.hitDetector.report()
    const insertion = this.components!.insertionCalculator.report()
    const indicator = this.components!.indicator.report()
    const cache = this.components!.cache.report()
    const controller = this.components!.controller.report()

    return {
      frameId: this.frameCounter++,
      timestamp: Date.now(),
      cursor,
      controller,
      hit,
      insertion,
      indicator,
      cache,
      summary: this.buildSummary(controller, hit, insertion),
    }
  }

  /**
   * Build a human-readable summary
   */
  private buildSummary(
    controller: ControllerReport,
    hit: HitReport,
    insertion: InsertionReport | null
  ): import('./types').DragFrameSummary {
    const isDragging = controller.state === 'dragging'
    const hasTarget = hit.containerId !== null

    let insertionDescription: string | null = null
    if (insertion) {
      if (insertion.insertBefore) {
        insertionDescription = `Insert before ${insertion.insertBefore} (index ${insertion.index})`
      } else if (insertion.insertAfter) {
        insertionDescription = `Insert after ${insertion.insertAfter} (index ${insertion.index})`
      } else {
        insertionDescription = `Insert at index ${insertion.index}`
      }
    }

    return { isDragging, hasTarget, insertionDescription }
  }

  /**
   * Store frame with max limit
   */
  private storeFrame(frame: DragFrame): void {
    this.frames.push(frame)
    if (this.frames.length > this.config.maxFrames) {
      this.frames.shift()
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `drag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.clearAdapters()
    this.components = null
    this.currentSession = null
    this.frames = []
  }
}

// Singleton instance
let reporterInstance: DragReporter | null = null

/**
 * Get the singleton DragReporter instance
 */
export function getDragReporter(): DragReporter {
  if (!reporterInstance) {
    reporterInstance = new DragReporter()
  }
  return reporterInstance
}

/**
 * Reset the singleton (for testing)
 */
export function resetDragReporter(): void {
  if (reporterInstance) {
    reporterInstance.destroy()
    reporterInstance = null
  }
}
