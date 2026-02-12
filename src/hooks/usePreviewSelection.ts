import { useState } from 'react'

export interface UsePreviewSelectionReturn {
  selectedId: string | null
  setSelectedId: (id: string | null) => void
}

export function usePreviewSelection(): UsePreviewSelectionReturn {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return {
    selectedId,
    setSelectedId,
  }
}
