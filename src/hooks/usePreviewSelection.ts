import { useState, useEffect } from 'react'

export interface UsePreviewSelectionReturn {
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  hoveredId: string | null
  setHoveredId: (id: string | null) => void
  inspectMode: boolean
  setInspectMode: (mode: boolean) => void
}

export function usePreviewSelection(): UsePreviewSelectionReturn {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [inspectMode, setInspectMode] = useState(false)

  // Listen for Shift key to enable inspect mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setInspectMode(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setInspectMode(false)
        setHoveredId(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return {
    selectedId,
    setSelectedId,
    hoveredId,
    setHoveredId,
    inspectMode,
    setInspectMode,
  }
}
