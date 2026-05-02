/**
 * studio/core/debounce
 *
 * Debounce utility with cancel(). Used by app.ts to throttle
 * compile + auto-save and to cancel pending saves on file switch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { debounce } from '../../studio/core/debounce'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('debounce', () => {
  it('delays the call by the given ms', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(99)
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('forwards arguments to fn', () => {
    const fn = vi.fn()
    const d = debounce(fn, 50)
    d('a', 1, true)
    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledWith('a', 1, true)
  })

  it('coalesces rapid calls into the last one', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d('first')
    vi.advanceTimersByTime(50)
    d('second')
    vi.advanceTimersByTime(50)
    d('third')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('third')
  })

  it('cancel() drops a pending call', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d()
    d.cancel()
    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel() before any call is a no-op', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    expect(() => d.cancel()).not.toThrow()
    expect(fn).not.toHaveBeenCalled()
  })

  it('subsequent call after cancel re-arms the timer', () => {
    const fn = vi.fn()
    const d = debounce(fn, 100)
    d('a')
    d.cancel()
    d('b')
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('b')
  })

  it('multiple debounced wrappers are independent', () => {
    const fnA = vi.fn()
    const fnB = vi.fn()
    const a = debounce(fnA, 50)
    const b = debounce(fnB, 50)
    a()
    b()
    a.cancel()
    vi.advanceTimersByTime(50)
    expect(fnA).not.toHaveBeenCalled()
    expect(fnB).toHaveBeenCalledOnce()
  })

  it('zero delay still defers to next tick', () => {
    const fn = vi.fn()
    const d = debounce(fn, 0)
    d()
    expect(fn).not.toHaveBeenCalled()
    vi.advanceTimersByTime(0)
    expect(fn).toHaveBeenCalledOnce()
  })
})
