/**
 * QP tests for studio/compile/log-slow-compile.ts
 *
 * The perf logger is gated on a threshold. Pin: below threshold = no
 * output; above threshold = breakdown with phase deltas; missing
 * `execEnd` = no exec/dom/sync block.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logSlowCompile, type CompileTimings } from '../../studio/compile/log-slow-compile'
import { setLogLevel } from '../../compiler/utils/logger'

describe('logSlowCompile', () => {
  let logSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setLogLevel('debug')
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    setLogLevel('silent')
  })

  it('emits nothing below the threshold (default 50ms)', () => {
    logSlowCompile({}, 0, 25)
    expect(logSpy).not.toHaveBeenCalled()
  })

  it('emits the breakdown when total exceeds threshold', () => {
    const timings: CompileTimings = {
      preludeEnd: 10,
      parseEnd: 30,
      irEnd: 50,
      codegenEnd: 70,
    }
    logSlowCompile(timings, 0, 100)
    expect(logSpy).toHaveBeenCalled()
    // Header
    const calls = logSpy.mock.calls.flat().join('\n')
    expect(calls).toContain('SLOW COMPILE')
    expect(calls).toContain('Total: 100.0ms')
    expect(calls).toContain('Prelude: 10.0ms')
    expect(calls).toContain('Parse: 20.0ms')
    expect(calls).toContain('IR: 20.0ms')
    expect(calls).toContain('Codegen: 20.0ms')
  })

  it('omits exec/dom/sync block when execEnd is missing', () => {
    logSlowCompile(
      { preludeEnd: 10, parseEnd: 30, irEnd: 50, codegenEnd: 70 },
      0,
      100 // no execEnd → no exec block
    )
    const calls = logSpy.mock.calls.flat().join('\n')
    expect(calls).not.toContain('Exec:')
    expect(calls).not.toContain('UpdateStudio:')
    expect(calls).not.toContain('Sync:')
  })

  it('includes exec/dom/sync block when execEnd is set', () => {
    const timings: CompileTimings = {
      preludeEnd: 10,
      parseEnd: 30,
      irEnd: 50,
      codegenEnd: 70,
      prepExecStart: 70,
      execEnd: 80,
      updateStudioEnd: 85,
      domAppendEnd: 90,
      draggablesEnd: 95,
      refreshEnd: 97,
      syncEnd: 100,
    }
    logSlowCompile(timings, 0, 100)
    const calls = logSpy.mock.calls.flat().join('\n')
    expect(calls).toContain('Exec: 10.0ms')
    expect(calls).toContain('UpdateStudio: 5.0ms')
    expect(calls).toContain('DOM Append: 5.0ms')
    expect(calls).toContain('Draggables: 5.0ms')
    expect(calls).toContain('Refresh: 2.0ms')
    expect(calls).toContain('Sync: 3.0ms')
  })

  it('respects a custom threshold', () => {
    logSlowCompile({}, 0, 100, 200) // 100ms total, threshold 200 → silent
    expect(logSpy).not.toHaveBeenCalled()

    logSlowCompile({}, 0, 100, 50) // 100ms total, threshold 50 → emits
    expect(logSpy).toHaveBeenCalled()
  })

  it('handles missing phase timings gracefully (?? 0)', () => {
    // Only preludeEnd present — others undefined. Should not throw.
    expect(() => logSlowCompile({ preludeEnd: 10 }, 0, 100)).not.toThrow()
    const calls = logSpy.mock.calls.flat().join('\n')
    // Missing phases show negative deltas like "Parse: -10.0ms" — that's
    // intentional, it signals "phase didn't run" rather than crashing.
    expect(calls).toContain('Prelude: 10.0ms')
  })
})
