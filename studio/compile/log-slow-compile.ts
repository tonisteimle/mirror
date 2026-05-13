/**
 * Slow-compile perf logger.
 *
 * `compile()` records per-phase timestamps (`prelude`, `parse`, `ir`,
 * `codegen`, optionally `exec` through `sync`) and dumps a breakdown
 * to log.debug if total time exceeds a threshold. Pre-2026-05-13 the
 * dump was a ~40-line block inlined into compile(); pulling it out so
 * the compile body stays focused on the actual pipeline.
 *
 * All `timings.*` reads use `?? 0` so the perf log degrades gracefully
 * if a phase never ran (e.g. early-return when preview was empty); the
 * outer gate `timings.execEnd` keeps the exec block coherent.
 */

import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('App')

export interface CompileTimings {
  preludeEnd?: number
  parseEnd?: number
  irEnd?: number
  codegenEnd?: number
  prepExecStart?: number
  execEnd?: number
  updateStudioEnd?: number
  domAppendEnd?: number
  draggablesEnd?: number
  refreshEnd?: number
  syncEnd?: number
}

/** Log slow compiles (over `thresholdMs`, default 50ms) to log.debug. */
export function logSlowCompile(
  timings: CompileTimings,
  compileStart: number,
  compileEnd: number,
  thresholdMs = 50
): void {
  const totalTime = compileEnd - compileStart
  if (totalTime <= thresholdMs) return

  const t = (v: number | undefined) => v ?? 0

  log.debug('[CompilePerf] ========== SLOW COMPILE ==========')
  log.debug(`[CompilePerf] Total: ${totalTime.toFixed(1)}ms`)
  log.debug(`[CompilePerf] Prelude: ${(t(timings.preludeEnd) - compileStart).toFixed(1)}ms`)
  log.debug(`[CompilePerf] Parse: ${(t(timings.parseEnd) - t(timings.preludeEnd)).toFixed(1)}ms`)
  log.debug(`[CompilePerf] IR: ${(t(timings.irEnd) - t(timings.parseEnd)).toFixed(1)}ms`)
  log.debug(`[CompilePerf] Codegen: ${(t(timings.codegenEnd) - t(timings.irEnd)).toFixed(1)}ms`)
  if (timings.execEnd) {
    log.debug(`[CompilePerf] Exec: ${(t(timings.execEnd) - t(timings.prepExecStart)).toFixed(1)}ms`)
    log.debug(
      `[CompilePerf] UpdateStudio: ${(t(timings.updateStudioEnd) - t(timings.execEnd)).toFixed(1)}ms`
    )
    log.debug(
      `[CompilePerf] DOM Append: ${(t(timings.domAppendEnd) - t(timings.updateStudioEnd)).toFixed(1)}ms`
    )
    log.debug(
      `[CompilePerf] Draggables: ${(t(timings.draggablesEnd) - t(timings.domAppendEnd)).toFixed(1)}ms`
    )
    log.debug(
      `[CompilePerf] Refresh: ${(t(timings.refreshEnd) - t(timings.draggablesEnd)).toFixed(1)}ms`
    )
    log.debug(`[CompilePerf] Sync: ${(t(timings.syncEnd) - t(timings.refreshEnd)).toFixed(1)}ms`)
  }
  log.debug('[CompilePerf] ================================')
}
