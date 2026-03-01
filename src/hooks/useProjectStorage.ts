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
import { generateMultiFileExport } from '../generator/multi-file-exporter'
import { parse } from '../parser/parser'
import JSZip from 'jszip'

export interface ProjectState {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  dataCode: string
  componentsCode: string
  tokensCode: string
  useTokenMode: boolean
  // Editor settings (persisted per project)
  pickerModeEnabled: boolean
  expandShorthand: boolean
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
    useTokenMode: boolean
    pickerModeEnabled: boolean
    expandShorthand: boolean
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
        useTokenMode: state.useTokenMode,
        pickerModeEnabled: state.pickerModeEnabled,
        expandShorthand: state.expandShorthand,
      }
      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(projectData))
    }, UI.DEBOUNCE_DELAY_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [state.pages, state.currentPageId, state.dataCode, state.componentsCode, state.tokensCode, state.useTokenMode, state.pickerModeEnabled, state.expandShorthand])

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

  // Export to React (complete project as ZIP)
  const exportReactCode = useCallback(async () => {
    try {
      // Parse the layout code to get AST nodes
      const parseResult = parse(state.layoutCode)

      // Generate multi-file export
      const exportResult = generateMultiFileExport(
        parseResult.nodes,
        state.componentsCode,
        state.tokensCode
      )

      // Create ZIP file
      const zip = new JSZip()

      // Add all files to ZIP
      for (const file of exportResult.files) {
        zip.file(file.path, file.content)
      }

      // Generate ZIP blob
      const zipBlob = await zip.generateAsync({ type: 'blob' })

      // Download ZIP
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mirror-react-export.zip'
      a.click()
      URL.revokeObjectURL(url)

      logger.storage.info('React project exported successfully', {
        fileCount: exportResult.files.length
      })
    } catch (error) {
      logger.storage.error('Export failed', error)
      onError({
        title: 'Export fehlgeschlagen',
        message: 'Das React-Projekt konnte nicht exportiert werden.',
        details: error instanceof Error ? error.message : String(error)
      })
    }
  }, [state.tokensCode, state.componentsCode, state.layoutCode, onError])

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
          useTokenMode: project.useTokenMode ?? false,
          pickerModeEnabled: project.pickerModeEnabled ?? true,
          expandShorthand: project.expandShorthand ?? true,
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
