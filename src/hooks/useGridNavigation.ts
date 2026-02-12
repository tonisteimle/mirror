/**
 * useGridNavigation Hook
 *
 * Keyboard navigation for 2D grids (row/col).
 * Used by ColorPicker for the color variations grid.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface GridPosition {
  row: number
  col: number
}

export interface UseGridNavigationConfig {
  /** Whether navigation is active */
  isActive: boolean
  /** Number of rows in the grid */
  rowCount: number
  /** Number of columns in the grid (can vary per row) */
  getColCount: (row: number) => number
  /** Initial position */
  initialPosition?: GridPosition
  /** Callback when Enter/Space is pressed */
  onSelect?: (position: GridPosition) => void
  /** Callback when Escape is pressed */
  onClose?: () => void
  /** Callback when Tab is pressed */
  onTab?: () => void
}

export interface UseGridNavigationReturn {
  /** Current grid position */
  position: GridPosition
  /** Set position directly */
  setPosition: (position: GridPosition | ((prev: GridPosition) => GridPosition)) => void
  /** Reset to initial position */
  reset: (newPosition?: GridPosition) => void
  /** Ref to access current position in callbacks */
  positionRef: React.MutableRefObject<GridPosition>
}

export function useGridNavigation({
  isActive,
  rowCount,
  getColCount,
  initialPosition = { row: 0, col: 0 },
  onSelect,
  onClose,
  onTab,
}: UseGridNavigationConfig): UseGridNavigationReturn {
  const [position, setPosition] = useState<GridPosition>(initialPosition)

  // Refs for accessing current values in event listener
  const positionRef = useRef(position)
  const rowCountRef = useRef(rowCount)
  const getColCountRef = useRef(getColCount)

  positionRef.current = position
  rowCountRef.current = rowCount
  getColCountRef.current = getColCount

  // Reset helper
  const reset = useCallback((newPosition?: GridPosition) => {
    setPosition(newPosition ?? initialPosition)
  }, [initialPosition])

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const currentPos = positionRef.current
      const currentRowCount = rowCountRef.current
      const currentGetColCount = getColCountRef.current

      switch (e.key) {
        case 'Escape':
          onClose?.()
          break

        case 'Enter':
        case ' ':
          e.preventDefault()
          onSelect?.(currentPos)
          break

        case 'ArrowUp':
          e.preventDefault()
          setPosition(prev => ({
            ...prev,
            row: Math.max(0, prev.row - 1)
          }))
          break

        case 'ArrowDown':
          e.preventDefault()
          setPosition(prev => ({
            ...prev,
            row: Math.min(currentRowCount - 1, prev.row + 1)
          }))
          break

        case 'ArrowLeft':
          e.preventDefault()
          setPosition(prev => ({
            ...prev,
            col: Math.max(0, prev.col - 1)
          }))
          break

        case 'ArrowRight':
          e.preventDefault()
          setPosition(prev => ({
            ...prev,
            col: Math.min(currentGetColCount(prev.row) - 1, prev.col + 1)
          }))
          break

        case 'Tab':
          e.preventDefault()
          onTab?.()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, onSelect, onClose, onTab])

  return {
    position,
    setPosition,
    reset,
    positionRef,
  }
}
