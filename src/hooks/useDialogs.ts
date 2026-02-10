import { useState, useCallback } from 'react'

export interface ErrorState {
  title: string
  message: string
  details?: string
}

export interface UseDialogsReturn {
  error: ErrorState | null
  setError: (error: ErrorState | null) => void
  showError: (title: string, message: string, details?: string) => void
  clearError: () => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
  openSettings: () => void
  closeSettings: () => void
}

export function useDialogs(): UseDialogsReturn {
  const [error, setError] = useState<ErrorState | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  const showError = useCallback((title: string, message: string, details?: string) => {
    setError({ title, message, details })
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true)
  }, [])

  const closeSettings = useCallback(() => {
    setIsSettingsOpen(false)
  }, [])

  return {
    error,
    setError,
    showError,
    clearError,
    isSettingsOpen,
    setIsSettingsOpen,
    openSettings,
    closeSettings,
  }
}
