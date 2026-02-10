import { useState, useEffect, useCallback } from 'react'
import { UI } from '../constants'

export interface UsePanelResizeReturn {
  panelWidth: number
  setPanelWidth: (width: number) => void
  isDragging: boolean
  handleMouseDown: () => void
}

export function usePanelResize(defaultWidth = UI.PANEL_DEFAULT_WIDTH): UsePanelResizeReturn {
  const [panelWidth, setPanelWidth] = useState<number>(defaultWidth)
  const [isDragging, setIsDragging] = useState(false)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(UI.PANEL_MIN_WIDTH, Math.min(UI.PANEL_MAX_WIDTH, e.clientX))
      setPanelWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  return {
    panelWidth,
    setPanelWidth,
    isDragging,
    handleMouseDown,
  }
}
