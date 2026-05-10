/**
 * RAF-throttled mouse-move handler.
 *
 * Coalesces a stream of mousemove events into one process-call per
 * animation frame. Used by the four drag-handle managers
 * (resize/padding/margin/gap) so all live drag previews render in lock-
 * step with the browser's compositor instead of running the heavy work
 * once per emitted mousemove (which can be 1 kHz on high-poll mice).
 *
 * Usage:
 *   private throttle = new RafMouseThrottle(e => this.processMouseMove(e))
 *
 *   onMouseMove(e: MouseEvent) { this.throttle.schedule(e) }
 *   dispose()                   { this.throttle.cancel() }
 */
export class RafMouseThrottle {
  private rafId: number | null = null
  private pending: MouseEvent | null = null

  constructor(private readonly process: (e: MouseEvent) => void) {}

  /**
   * Queue a mousemove for processing on the next animation frame.
   * Subsequent calls within the same frame replace the pending event —
   * the browser only ever sees the most-recent position when the RAF
   * fires.
   */
  schedule(e: MouseEvent): void {
    this.pending = e
    if (this.rafId !== null) return
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null
      const ev = this.pending
      if (ev) {
        this.pending = null
        this.process(ev)
      }
    })
  }

  /**
   * Cancel any pending RAF and drop the queued event. Safe to call
   * unconditionally from dispose paths.
   */
  cancel(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pending = null
  }
}
