/**
 * Hook for project storage operations.
 * Handles auto-save, import, and export functionality.
 *
 * Supports:
 * - .mirror text format (new, preferred)
 * - .json format (legacy, for backwards compatibility)
 * - React export (App.tsx + styles.css)
 */

import { useEffect, useRef, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'
import { STORAGE_KEYS, UI } from '../constants'
import { logger } from '../services/logger'
import {
  serializeMirrorFile,
  parseProjectFile,
  type MirrorProject
} from '../lib/mirror-file'
import { exportReact } from '../generator/export'

export interface ProjectState {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  dataCode: string
  componentsCode: string
  tokensCode: string
}

export interface UseProjectStorageOptions {
  onError: (error: { title: string; message: string; details?: string }) => void
  onImportSuccess: (data: {
    pages: PageData[]
    currentPageId: string
    layoutCode: string
    dataCode: string
    componentsCode: string
    tokensCode: string
  }) => void
}

export interface UseProjectStorageReturn {
  /** Open a .mirror project file */
  openProject: () => void
  /** Save project as .mirror file */
  saveProject: () => void
  /** Export to React (App.tsx + styles.css) */
  exportReactCode: () => void
}

export function useProjectStorage(
  state: ProjectState,
  options: UseProjectStorageOptions
): UseProjectStorageReturn {
  const { onError, onImportSuccess } = options
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save to localStorage with debounce
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const projectData = {
        pages: state.pages,
        currentPageId: state.currentPageId,
        dataCode: state.dataCode,
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
  }, [state.pages, state.currentPageId, state.dataCode, state.componentsCode, state.tokensCode])

  // Save project to .mirror file
  const saveProject = useCallback(() => {
    const mirrorProject: MirrorProject = {
      version: 1,
      dataCode: state.dataCode,
      tokensCode: state.tokensCode,
      componentsCode: state.componentsCode,
      pages: state.pages.map(p => ({
        id: p.id,
        name: p.name,
        layoutCode: p.layoutCode
      })),
      currentPageId: state.currentPageId,
    }

    const content = serializeMirrorFile(mirrorProject)
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'project.mirror'
    a.click()
    URL.revokeObjectURL(url)
  }, [state.pages, state.currentPageId, state.dataCode, state.componentsCode, state.tokensCode])

  // Export to React (App.tsx + styles.css as ZIP)
  const exportReactCode = useCallback(() => {
    // Combine all code for export
    const fullCode = [state.tokensCode, state.componentsCode, state.layoutCode]
      .filter(Boolean)
      .join('\n\n')

    const result = exportReact(fullCode)

    // Create and download files
    // App.tsx
    const tsxBlob = new Blob([result.tsx], { type: 'text/typescript' })
    const tsxUrl = URL.createObjectURL(tsxBlob)
    const tsxLink = document.createElement('a')
    tsxLink.href = tsxUrl
    tsxLink.download = 'App.tsx'
    tsxLink.click()
    URL.revokeObjectURL(tsxUrl)

    // styles.css (after small delay to avoid browser blocking)
    setTimeout(() => {
      const cssBlob = new Blob([result.css], { type: 'text/css' })
      const cssUrl = URL.createObjectURL(cssBlob)
      const cssLink = document.createElement('a')
      cssLink.href = cssUrl
      cssLink.download = 'styles.css'
      cssLink.click()
      URL.revokeObjectURL(cssUrl)
    }, 100)
  }, [state.tokensCode, state.componentsCode, state.layoutCode])

  // Open project from file (supports .mirror and .json)
  const openProject = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mirror,.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (event) => {
        const content = event.target?.result as string

        // Parse file (handles both .mirror and .json formats)
        const result = parseProjectFile(content)

        if (!result.success || !result.project) {
          onError({
            title: 'Import fehlgeschlagen',
            message: 'Die Datei konnte nicht gelesen werden.',
            details: result.error || 'Unbekanntes Format',
          })
          return
        }

        const project = result.project
        const currentPage = project.pages.find(p => p.id === project.currentPageId)

        onImportSuccess({
          pages: project.pages,
          currentPageId: project.currentPageId,
          layoutCode: currentPage?.layoutCode || '',
          dataCode: project.dataCode,
          componentsCode: project.componentsCode,
          tokensCode: project.tokensCode,
        })
      }

      reader.onerror = () => {
        logger.storage.error('Failed to read file')
        onError({
          title: 'Lesefehler',
          message: 'Die Datei konnte nicht gelesen werden.',
        })
      }

      reader.readAsText(file)
    }
    input.click()
  }, [onError, onImportSuccess])

  return {
    openProject,
    saveProject,
    exportReactCode,
  }
}
