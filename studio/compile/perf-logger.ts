/**
 * Performance Logger
 *
 * Logs compile timing metrics for slow compiles.
 */

import type { CompileTimings } from './types'

const SLOW_COMPILE_THRESHOLD = 50 // ms

export class PerfLogger {
  private timings: CompileTimings

  constructor() {
    this.timings = { start: performance.now() }
  }

  markPreludeEnd(): void {
    this.timings.preludeEnd = performance.now()
  }

  markParseEnd(): void {
    this.timings.parseEnd = performance.now()
  }

  markIREnd(): void {
    this.timings.irEnd = performance.now()
  }

  markCodegenEnd(): void {
    this.timings.codegenEnd = performance.now()
  }

  markPrepExecStart(): void {
    this.timings.prepExecStart = performance.now()
  }

  markExecEnd(): void {
    this.timings.execEnd = performance.now()
  }

  markUpdateStudioEnd(): void {
    this.timings.updateStudioEnd = performance.now()
  }

  markDomAppendEnd(): void {
    this.timings.domAppendEnd = performance.now()
  }

  markDraggablesEnd(): void {
    this.timings.draggablesEnd = performance.now()
  }

  markRefreshEnd(): void {
    this.timings.refreshEnd = performance.now()
  }

  markSyncEnd(): void {
    this.timings.syncEnd = performance.now()
  }

  logIfSlow(): void {
    const totalTime = performance.now() - this.timings.start
    if (totalTime <= SLOW_COMPILE_THRESHOLD) return

    this.logSlowCompile(totalTime)
  }

  private logSlowCompile(totalTime: number): void {
    console.log('[CompilePerf] ========== SLOW COMPILE ==========')
    console.log(`[CompilePerf] Total: ${totalTime.toFixed(1)}ms`)
    this.logPhase('Prelude', this.timings.start, this.timings.preludeEnd)
    this.logPhase('Parse', this.timings.preludeEnd, this.timings.parseEnd)
    this.logPhase('IR', this.timings.parseEnd, this.timings.irEnd)
    this.logPhase('Codegen', this.timings.irEnd, this.timings.codegenEnd)
    this.logExecutionPhases()
    console.log('[CompilePerf] ================================')
  }

  private logPhase(name: string, start?: number, end?: number): void {
    if (start === undefined || end === undefined) return
    console.log(`[CompilePerf] ${name}: ${(end - start).toFixed(1)}ms`)
  }

  private logExecutionPhases(): void {
    if (!this.timings.execEnd) return

    this.logPhase('Exec', this.timings.prepExecStart, this.timings.execEnd)
    this.logPhase('UpdateStudio', this.timings.execEnd, this.timings.updateStudioEnd)
    this.logPhase('DOM Append', this.timings.updateStudioEnd, this.timings.domAppendEnd)
    this.logPhase('Draggables', this.timings.domAppendEnd, this.timings.draggablesEnd)
    this.logPhase('Refresh', this.timings.draggablesEnd, this.timings.refreshEnd)
    this.logPhase('Sync', this.timings.refreshEnd, this.timings.syncEnd)
  }
}
