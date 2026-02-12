/**
 * Hook for project storage operations.
 * Handles auto-save, import, and export functionality.
 */

import { useEffect, useRef, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'
import { validateProject, formatValidationErrors } from '../schemas/project'
import { STORAGE_KEYS, UI } from '../constants'
import { z } from 'zod'
import { logger } from '../services/logger'

export interface ProjectState {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  componentsCode: string
  tokensCode: string
}

export interface UseProjectStorageOptions {
  onError: (error: { title: string; message: string; details?: string }) => void
  onImportSuccess: (data: {
    pages: PageData[]
    currentPageId: string
    layoutCode: string
    componentsCode: string
    tokensCode: string
  }) => void
}

export interface UseProjectStorageReturn {
  exportProject: () => void
  importProject: () => void
}

export function useProjectStorage(
  state: ProjectState,
  options: UseProjectStorageOptions
): UseProjectStorageReturn {
  const { onError, onImportSuccess } = options
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save to localStorage with debounce
  // Note: pages array is now always up-to-date (Single Source of Truth in usePageManager)
  useEffect(() => {
    // Clear previous timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Debounce save
    saveTimeoutRef.current = setTimeout(() => {
      const projectData = {
        pages: state.pages,
        currentPageId: state.currentPageId,
        componentsCode: state.componentsCode,
        tokensCode: state.tokensCode,
      }
      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectData))
    }, UI.DEBOUNCE_DELAY_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state.pages, state.currentPageId, state.componentsCode, state.tokensCode])

  // Export project to file
  // Note: pages array is now always up-to-date (Single Source of Truth in usePageManager)
  const exportProject = useCallback(() => {
    const projectData = {
      version: 1,
      pages: state.pages,
      currentPageId: state.currentPageId,
      componentsCode: state.componentsCode,
      tokensCode: state.tokensCode,
    }
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'mirror-project.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [state.pages, state.currentPageId, state.componentsCode, state.tokensCode])

  // Import project from file
  const importProject = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const rawData = JSON.parse(event.target?.result as string)

          // Validate project structure with Zod
          const data = validateProject(rawData)

          // Apply validated data
          const currentPage = data.pages.find(p => p.id === data.currentPageId)
          onImportSuccess({
            pages: data.pages,
            currentPageId: data.currentPageId,
            layoutCode: currentPage?.layoutCode || '',
            componentsCode: data.componentsCode,
            tokensCode: data.tokensCode,
          })
        } catch (err) {
          if (err instanceof z.ZodError) {
            onError({
              title: 'Ungültiges Projektformat',
              message: 'Die Datei entspricht nicht dem erwarteten Format.',
              details: formatValidationErrors(err),
            })
          } else if (err instanceof SyntaxError) {
            onError({
              title: 'Ungültige JSON-Datei',
              message: 'Die Datei enthält kein gültiges JSON.',
              details: err.message,
            })
          } else {
            logger.storage.error('Failed to import project', err)
            onError({
              title: 'Import fehlgeschlagen',
              message: 'Die Datei konnte nicht importiert werden.',
              details: err instanceof Error ? err.message : 'Unbekannter Fehler',
            })
          }
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [onError, onImportSuccess])

  return {
    exportProject,
    importProject,
  }
}
