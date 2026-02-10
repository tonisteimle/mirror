/**
 * Undo/Redo Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useHistory, type HistoryState } from '../hooks/useHistory'

describe('Undo/Redo Keyboard Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should integrate with code editor state', () => {
    const initialState: HistoryState = {
      layoutCode: 'Page\n  Header',
      componentsCode: 'Page: ver full',
    }

    const { result } = renderHook(() => useHistory(initialState))

    // Simulate user typing
    act(() => {
      result.current.pushState({
        layoutCode: 'Page\n  Header\n  Content',
        componentsCode: 'Page: ver full',
      })
      vi.advanceTimersByTime(500)
    })

    expect(result.current.canUndo).toBe(true)

    // Undo should restore previous state
    let undoneState: HistoryState | null = null
    act(() => {
      undoneState = result.current.undo()
    })

    expect(undoneState).toEqual(initialState)
    expect(result.current.canRedo).toBe(true)
  })

  it('should handle multiple sequential changes', () => {
    const initialState: HistoryState = {
      layoutCode: 'A',
      componentsCode: '',
    }

    const { result } = renderHook(() => useHistory(initialState))

    // Push two states (like the working test in use-history.test.ts)
    act(() => {
      result.current.pushState({ layoutCode: 'AB', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.pushState({ layoutCode: 'ABC', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    // Now undo twice to get back to initial
    let state1: HistoryState | null
    act(() => { state1 = result.current.undo() })
    expect(state1!.layoutCode).toBe('AB')

    let state2: HistoryState | null
    act(() => { state2 = result.current.undo() })
    expect(state2!.layoutCode).toBe('A')

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('should handle undo followed by new change (clearing redo)', () => {
    const initialState: HistoryState = {
      layoutCode: 'A',
      componentsCode: '',
    }

    const { result } = renderHook(() => useHistory(initialState))

    act(() => {
      result.current.pushState({ layoutCode: 'B', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    act(() => {
      result.current.undo()
    })

    expect(result.current.canRedo).toBe(true)

    // Make a new change
    act(() => {
      result.current.pushState({ layoutCode: 'C', componentsCode: '' })
      vi.advanceTimersByTime(500)
    })

    // Redo should now be unavailable (future was cleared)
    expect(result.current.canRedo).toBe(false)
    expect(result.current.canUndo).toBe(true)
  })

  it('should track both layoutCode and componentsCode changes', () => {
    const initialState: HistoryState = {
      layoutCode: 'Page',
      componentsCode: '',
    }

    const { result } = renderHook(() => useHistory(initialState))

    // Change components only
    act(() => {
      result.current.pushState({
        layoutCode: 'Page',
        componentsCode: 'Page: ver',
      })
      vi.advanceTimersByTime(500)
    })

    expect(result.current.canUndo).toBe(true)

    let undoneState: HistoryState | null
    act(() => {
      undoneState = result.current.undo()
    })

    expect(undoneState!.componentsCode).toBe('')
    expect(undoneState!.layoutCode).toBe('Page')
  })
})
