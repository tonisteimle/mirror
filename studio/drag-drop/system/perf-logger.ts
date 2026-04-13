/**
 * Performance Logger for Drag & Drop
 *
 * Tracks timing across all drag operations to identify bottlenecks.
 * Writes detailed logs to help find the 2000ms lag on stacked containers.
 */

interface TimingEntry {
  name: string
  start: number
  end?: number
  duration?: number
  metadata?: Record<string, unknown>
}

interface DragSession {
  id: number
  startTime: number
  endTime?: number
  layoutType?: string
  entries: TimingEntry[]
  moveCount: number
  slowMoves: number // moves > 16ms (drops below 60fps)
  verySlowMoves: number // moves > 100ms
}

class DragPerfLogger {
  private sessions: DragSession[] = []
  private currentSession: DragSession | null = null
  private sessionCounter = 0
  private enabled = true

  // Track nested timings
  private activeTimings: Map<string, number> = new Map()

  enable(): void {
    this.enabled = true
    console.log('[DragPerf] Logger enabled')
  }

  disable(): void {
    this.enabled = false
  }

  /**
   * Start a new drag session
   */
  startSession(layoutType?: string): void {
    if (!this.enabled) return

    this.sessionCounter++
    this.currentSession = {
      id: this.sessionCounter,
      startTime: performance.now(),
      layoutType,
      entries: [],
      moveCount: 0,
      slowMoves: 0,
      verySlowMoves: 0,
    }

    console.log(`[DragPerf] ========== SESSION ${this.sessionCounter} START ==========`)
    console.log(`[DragPerf] Layout type: ${layoutType || 'unknown'}`)
  }

  /**
   * End current drag session and print summary
   */
  endSession(success: boolean): void {
    if (!this.enabled || !this.currentSession) return

    this.currentSession.endTime = performance.now()
    const totalDuration = this.currentSession.endTime - this.currentSession.startTime

    console.log(`[DragPerf] ========== SESSION ${this.currentSession.id} END ==========`)
    console.log(`[DragPerf] Success: ${success}`)
    console.log(`[DragPerf] Total duration: ${totalDuration.toFixed(1)}ms`)
    console.log(`[DragPerf] Move events: ${this.currentSession.moveCount}`)
    console.log(`[DragPerf] Slow moves (>16ms): ${this.currentSession.slowMoves}`)
    console.log(`[DragPerf] Very slow moves (>100ms): ${this.currentSession.verySlowMoves}`)

    // Find slowest operations
    const slowEntries = this.currentSession.entries
      .filter(e => e.duration && e.duration > 5)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10)

    if (slowEntries.length > 0) {
      console.log(`[DragPerf] Top slow operations:`)
      slowEntries.forEach((e, i) => {
        console.log(`  ${i + 1}. ${e.name}: ${e.duration?.toFixed(1)}ms`, e.metadata || '')
      })
    }

    // Check for any operation over 100ms
    const criticalEntries = this.currentSession.entries.filter(e => e.duration && e.duration > 100)
    if (criticalEntries.length > 0) {
      console.warn(`[DragPerf] ⚠️ CRITICAL: ${criticalEntries.length} operations over 100ms:`)
      criticalEntries.forEach(e => {
        console.warn(`  - ${e.name}: ${e.duration?.toFixed(1)}ms`, e.metadata || '')
      })
    }

    // Store session for later analysis
    this.sessions.push(this.currentSession)
    if (this.sessions.length > 10) {
      this.sessions.shift() // Keep last 10 sessions
    }

    this.currentSession = null
    this.activeTimings.clear()
  }

  /**
   * Start timing an operation
   */
  start(name: string, metadata?: Record<string, unknown>): void {
    if (!this.enabled || !this.currentSession) return

    const start = performance.now()
    this.activeTimings.set(name, start)

    this.currentSession.entries.push({
      name,
      start,
      metadata,
    })
  }

  /**
   * End timing an operation
   */
  end(name: string): number {
    if (!this.enabled || !this.currentSession) return 0

    const start = this.activeTimings.get(name)
    if (start === undefined) return 0

    const end = performance.now()
    const duration = end - start

    // Update the entry
    const entry = this.currentSession.entries.find(e => e.name === name && !e.end)
    if (entry) {
      entry.end = end
      entry.duration = duration
    }

    this.activeTimings.delete(name)

    // Log slow operations immediately
    if (duration > 50) {
      console.warn(`[DragPerf] ⚠️ SLOW: ${name} took ${duration.toFixed(1)}ms`)
    }

    return duration
  }

  /**
   * Time a synchronous function
   */
  time<T>(name: string, fn: () => T, metadata?: Record<string, unknown>): T {
    if (!this.enabled) return fn()

    this.start(name, metadata)
    try {
      return fn()
    } finally {
      this.end(name)
    }
  }

  /**
   * Record a move event with total time
   */
  recordMove(totalTime: number, layoutType: string): void {
    if (!this.enabled || !this.currentSession) return

    this.currentSession.moveCount++
    this.currentSession.layoutType = layoutType

    if (totalTime > 16) {
      this.currentSession.slowMoves++
    }
    if (totalTime > 100) {
      this.currentSession.verySlowMoves++
      console.warn(`[DragPerf] ⚠️ VERY SLOW MOVE: ${totalTime.toFixed(1)}ms on ${layoutType}`)
    }
  }

  /**
   * Log a message with timestamp
   */
  log(message: string, data?: unknown): void {
    if (!this.enabled) return
    const timestamp = this.currentSession
      ? (performance.now() - this.currentSession.startTime).toFixed(1)
      : '0'
    console.log(`[DragPerf +${timestamp}ms] ${message}`, data || '')
  }

  /**
   * Get all sessions for analysis
   */
  getSessions(): DragSession[] {
    return [...this.sessions]
  }

  /**
   * Export sessions as JSON for file writing
   */
  exportJSON(): string {
    return JSON.stringify(this.sessions, null, 2)
  }
}

// Singleton instance
export const dragPerf = new DragPerfLogger()

// Expose globally for console access
if (typeof window !== 'undefined') {
  ;(window as any).__dragPerf__ = dragPerf
}
