/**
 * useHistory Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory } from '../../hooks/useHistory'

describe('useHistory', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const initialState = { layoutCode: 'initial', componentsCode: '' }

  it('should start with canUndo and canRedo as false', () => {
    const { result } = renderHook(() => useHistory(initialState))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('should allow undo after pushing a state', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'changed', componentsCode: '' })
      vi.advanceTimersByTime(500) // Wait for debounce
    })

    expect(result.current.canUndo).toBe(true)
  })

  it('should return previous state on undo', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'state1', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.pushState({ layoutCode: 'state2', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    let undoResult: ReturnType<typeof result.current.undo>
    act(() => {
      undoResult = result.current.undo()
    })

    expect(undoResult!).toEqual({ layoutCode: 'state1', componentsCode: '' })
    expect(result.current.canRedo).toBe(true)
  })

  it('should return next state on redo', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'state1', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.undo()
    })

    let redoResult: ReturnType<typeof result.current.redo>
    act(() => {
      redoResult = result.current.redo()
    })

    expect(redoResult!).toEqual({ layoutCode: 'state1', componentsCode: '' })
  })

  it('should clear future on new change after undo', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'state1', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.undo()
    })

    expect(result.current.canRedo).toBe(true)

    act(() => {
      result.current.pushState({ layoutCode: 'newState', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    expect(result.current.canRedo).toBe(false)
  })

  it('should not push duplicate states', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState(initialState) // Same as initial
      vi.advanceTimersByTime(500)
    })

    expect(result.current.canUndo).toBe(false)
  })

  it('should debounce rapid state changes', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'a', componentsCode: '' })
      result.current.pushState({ layoutCode: 'ab', componentsCode: '' })
      result.current.pushState({ layoutCode: 'abc', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    // Only one history entry despite multiple pushes
    let undoResult: ReturnType<typeof result.current.undo>
    act(() => {
      undoResult = result.current.undo()
    })

    expect(undoResult!).toEqual(initialState)
    expect(result.current.canUndo).toBe(false) // Only one entry was created
  })

  it('should clear history', () => {
    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'state1', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    expect(result.current.canUndo).toBe(true)

    act(() => {
      result.current.clear()
    })

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })
})
