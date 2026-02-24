/**
 * useLibraryCloud - Cloud save/load for entire project
 *
 * Features:
 * - Saves ALL tabs: Tokens + Components + Data + Pages
 * - Auto-save to server with debounce (5 seconds after last change)
 * - Load from server on startup
 * - Manual save with ⌘S
 * - Visual feedback for save status
 * - Project IDs: ?project=xyz in URL for separate projects
 * - History: 100 backups per project for recovery
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import type { PageData } from '../components/PageSidebar'

// Server endpoint for project
const LIBRARY_ENDPOINT = 'https://ux-strategy.ch/mirror/save-library.php'

/**
 * Get project ID from URL, or use "default" if none specified.
 * Cloud save is always active.
 */
function getProjectId(): string {
  const params = new URLSearchParams(window.location.search)
  return params.get('project') || 'default'
}

// Debounce delay for auto-save (5 seconds)
const AUTO_SAVE_DELAY = 5000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

/** Full project state for cloud save */
export interface CloudProjectState {
  tokensCode: string
  componentsCode: string
  dataCode: string
  pages: PageData[]
  currentPageId: string
}

export interface UseLibraryCloudOptions {
  /** Current project state */
  projectState: CloudProjectState
  /** Callbacks to restore project state */
  setTokensCode: (code: string) => void
  setComponentsCode: (code: string) => void
  setDataCode: (code: string) => void
  restorePages: (pages: PageData[], currentPageId: string) => void
  /** Whether cloud sync is enabled */
  enabled?: boolean
}

export interface UseLibraryCloudReturn {
  /** Current save status */
  status: SaveStatus
  /** Last save timestamp */
  lastSaved: Date | null
  /** Manually trigger save */
  saveNow: () => Promise<void>
  /** Load from server */
  loadFromServer: () => Promise<void>
  /** Error message if any */
  error: string | null
  /** Current project ID (always set, defaults to "default") */
  projectId: string
}

export function useLibraryCloud({
  projectState,
  setTokensCode,
  setComponentsCode,
  setDataCode,
  restorePages,
  enabled = true,
}: UseLibraryCloudOptions): UseLibraryCloudReturn {
  // Get project ID from URL or use "default"
  const projectId = getProjectId()
  const isCloudEnabled = enabled

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedHashRef = useRef<string>('')
  const isInitialLoadRef = useRef(true)

  // Create a hash of the project state for change detection
  const getStateHash = useCallback((state: CloudProjectState): string => {
    return JSON.stringify({
      t: state.tokensCode,
      c: state.componentsCode,
      d: state.dataCode,
      p: state.pages.map(p => ({ id: p.id, name: p.name, code: p.layoutCode })),
      pid: state.currentPageId,
    })
  }, [])

  // Serialize project to JSON
  const serializeProject = useCallback((state: CloudProjectState): string => {
    return JSON.stringify({
      version: 2,
      tokensCode: state.tokensCode,
      componentsCode: state.componentsCode,
      dataCode: state.dataCode,
      pages: state.pages.map(p => ({
        id: p.id,
        name: p.name,
        layoutCode: p.layoutCode,
      })),
      currentPageId: state.currentPageId,
      savedAt: new Date().toISOString(),
    }, null, 2)
  }, [])

  // Save to server
  const saveToServer = useCallback(async (state: CloudProjectState) => {
    if (!isCloudEnabled) return

    const currentHash = getStateHash(state)

    // Don't save if nothing changed
    if (currentHash === lastSavedHashRef.current) {
      setStatus('saved')
      return
    }

    setStatus('saving')
    setError(null)

    try {
      const response = await fetch(`${LIBRARY_ENDPOINT}?id=${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: serializeProject(state),
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      lastSavedHashRef.current = currentHash
      setLastSaved(new Date())
      setStatus('saved')

      console.log(`[Cloud] ✓ Projekt "${projectId}" gespeichert`)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
      console.error('[Cloud] Speichern fehlgeschlagen:', err)
    }
  }, [isCloudEnabled, projectId, getStateHash, serializeProject])

  // Manual save
  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    await saveToServer(projectState)
  }, [projectState, saveToServer])

  // Load from server
  const loadFromServer = useCallback(async () => {
    if (!isCloudEnabled) return

    try {
      const response = await fetch(`${LIBRARY_ENDPOINT}?id=${projectId}`)

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const text = await response.text()

      if (!text || !text.trim() || text.trim().startsWith('//')) {
        // Empty or comment-only file, skip
        console.log('[Cloud] Keine gespeicherten Daten gefunden')
        setStatus('saved')
        return
      }

      const data = JSON.parse(text)

      // Restore all state
      if (data.tokensCode !== undefined) {
        setTokensCode(data.tokensCode)
      }
      if (data.componentsCode !== undefined) {
        setComponentsCode(data.componentsCode)
      }
      if (data.dataCode !== undefined) {
        setDataCode(data.dataCode)
      }
      if (data.pages && data.currentPageId) {
        const pages: PageData[] = data.pages.map((p: { id: string; name: string; layoutCode: string }) => ({
          id: p.id,
          name: p.name,
          layoutCode: p.layoutCode,
        }))
        restorePages(pages, data.currentPageId)
      }

      // Update hash so we don't immediately re-save
      lastSavedHashRef.current = getStateHash({
        tokensCode: data.tokensCode || '',
        componentsCode: data.componentsCode || '',
        dataCode: data.dataCode || '',
        pages: data.pages || [],
        currentPageId: data.currentPageId || '',
      })

      setStatus('saved')
      console.log(`[Cloud] ✓ Projekt "${projectId}" geladen`)
    } catch (err) {
      console.error('[Cloud] Laden fehlgeschlagen:', err)
      setError(err instanceof Error ? err.message : 'Laden fehlgeschlagen')
      setStatus('error')
    }
  }, [isCloudEnabled, projectId, setTokensCode, setComponentsCode, setDataCode, restorePages, getStateHash])

  // Load on mount
  useEffect(() => {
    if (isCloudEnabled && isInitialLoadRef.current) {
      isInitialLoadRef.current = false
      console.log(`[Cloud] Lade Projekt "${projectId}"...`)
      loadFromServer()
    }
  }, [isCloudEnabled, projectId, loadFromServer])

  // Auto-save with debounce
  useEffect(() => {
    if (!isCloudEnabled) return
    if (isInitialLoadRef.current) return // Don't save during initial load

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Schedule new save
    saveTimeoutRef.current = setTimeout(() => {
      saveToServer(projectState)
    }, AUTO_SAVE_DELAY)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [projectState, isCloudEnabled, saveToServer])

  // Keyboard shortcut ⌘S for manual save
  useEffect(() => {
    if (!isCloudEnabled) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        saveNow()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCloudEnabled, saveNow])

  return {
    status,
    lastSaved,
    saveNow,
    loadFromServer,
    error,
    projectId,
  }
}
