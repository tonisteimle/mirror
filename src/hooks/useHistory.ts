import { useState, useCallback, useRef } from 'react'
import { HISTORY } from '../constants'

export interface HistoryState {
  layoutCode: string
  componentsCode: string
}

export interface UseHistoryReturn {
  canUndo: boolean
  canRedo: boolean
  pushState: (state: HistoryState) => void
  undo: () => HistoryState | null
  redo: () => HistoryState | null
  clear: () => void
}

export function useHistory(initialState: HistoryState): UseHistoryReturn {
  // All history as a single array with current index
  const [history, setHistory] = useState<HistoryState[]>([initialState])
  const [currentIndex, setCurrentIndex] = useState(0)

  // Keep a ref to always have the latest currentIndex (avoids stale closure in setTimeout)
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex

  // For deduplication
  const lastPushedRef = useRef<HistoryState>(initialState)

  // Debounce timer
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingStateRef = useRef<HistoryState | null>(null)

  const pushState = useCallback((state: HistoryState) => {
    // Skip if state is identical to last pushed
    if (
      state.layoutCode === lastPushedRef.current.layoutCode &&
      state.componentsCode === lastPushedRef.current.componentsCode
    ) {
      return
    }

    pendingStateRef.current = state

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (pendingStateRef.current) {
        const idx = currentIndexRef.current
        setHistory(prev => {
          // Truncate any future states (redo) when new state is pushed
          const newHistory = prev.slice(0, idx + 1)
          newHistory.push(pendingStateRef.current!)

          // Limit history size
          if (newHistory.length > HISTORY.MAX_SIZE) {
            return newHistory.slice(-HISTORY.MAX_SIZE)
          }
          return newHistory
        })
        setCurrentIndex(prev => Math.min(prev + 1, HISTORY.MAX_SIZE - 1))
        lastPushedRef.current = pendingStateRef.current
        pendingStateRef.current = null
      }
    }, HISTORY.DEBOUNCE_MS)
  }, []) // No dependency on currentIndex since we use ref

  const undo = useCallback((): HistoryState | null => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    if (currentIndex <= 0) return null

    const newIndex = currentIndex - 1
    setCurrentIndex(newIndex)
    const previousState = history[newIndex]
    lastPushedRef.current = previousState
    return previousState
  }, [currentIndex, history])

  const redo = useCallback((): HistoryState | null => {
    if (currentIndex >= history.length - 1) return null

    const newIndex = currentIndex + 1
    setCurrentIndex(newIndex)
    const nextState = history[newIndex]
    lastPushedRef.current = nextState
    return nextState
  }, [currentIndex, history])

  const clear = useCallback(() => {
    const currentState = history[currentIndex]
    setHistory([currentState])
    setCurrentIndex(0)
    lastPushedRef.current = currentState
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }
    pendingStateRef.current = null
  }, [history, currentIndex])

  return {
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    pushState,
    undo,
    redo,
    clear,
  }
}
