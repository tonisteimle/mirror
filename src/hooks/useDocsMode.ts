/**
 * Hook for managing documentation mode.
 *
 * Allows switching between user's project and the built-in documentation.
 * When switching to docs mode:
 * - Current project state is saved
 * - Documentation is loaded from server (or static file as fallback)
 * - View switches to preview mode
 *
 * When switching back:
 * - User's project is restored
 * - View switches back to edit mode
 *
 * Server sync:
 * - Docs are loaded from /api/docs-load.php
 * - Docs can be saved to /api/docs-save.php (requires admin password)
 * - Password is stored in localStorage after first successful save
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { parseMirrorFile } from '../lib/mirror-file'
import type { PageData } from '../components/PageSidebar'

const ADMIN_KEY_STORAGE = 'mirror-admin-key'
const DOCS_STORAGE_KEY = 'mirror-docs-project'

export interface SavedProjectState {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  componentsCode: string
  tokensCode: string
  dataCode: string
}

interface DocsProjectState {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  componentsCode: string
  tokensCode: string
  dataCode?: string
}

interface UseDocsModeOptions {
  /** Current pages from page manager */
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  componentsCode: string
  tokensCode: string
  dataCode: string
  /** Callbacks to update project state */
  loadProject: (data: { pages: PageData[]; currentPageId: string; layoutCode: string }) => void
  setComponentsCode: (code: string) => void
  setTokensCode: (code: string) => void
  setDataCode: (code: string) => void
}

interface UseDocsModeReturn {
  /** Whether docs mode is active */
  isDocsMode: boolean
  /** Toggle between docs and project mode */
  toggleDocsMode: () => void
  /** Enable docs mode */
  enterDocsMode: () => void
  /** Exit docs mode (return to project) */
  exitDocsMode: () => void
  /** Whether docs are currently loading */
  isLoading: boolean
  /** Whether docs are currently saving */
  isSaving: boolean
  /** Error message if docs failed to load/save */
  error: string | null
  /** Save docs to server (requires admin password) */
  saveDocs: () => Promise<boolean>
  /** Whether user has admin access (password in localStorage) */
  hasAdminAccess: boolean
  /** Whether docs have unsaved changes */
  hasUnsavedChanges: boolean
}

// Cache for loaded documentation (from server)
let docsCache: DocsProjectState | null = null
// Track the last saved state to detect changes
let lastSavedState: string | null = null

/**
 * Prompt user for admin password
 */
function promptForPassword(): string | null {
  return window.prompt('Admin-Passwort eingeben:')
}

/**
 * Get admin key from localStorage
 */
function getStoredAdminKey(): string | null {
  return localStorage.getItem(ADMIN_KEY_STORAGE)
}

/**
 * Store admin key in localStorage
 */
function storeAdminKey(key: string): void {
  localStorage.setItem(ADMIN_KEY_STORAGE, key)
}

export function useDocsMode(options: UseDocsModeOptions): UseDocsModeReturn {
  const {
    pages,
    currentPageId,
    layoutCode,
    componentsCode,
    tokensCode,
    dataCode,
    loadProject,
    setComponentsCode,
    setTokensCode,
    setDataCode,
  } = options

  const [isDocsMode, setIsDocsMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasAdminAccess, setHasAdminAccess] = useState(() => !!getStoredAdminKey())

  // Store the user's project state when entering docs mode
  const savedProjectRef = useRef<SavedProjectState | null>(null)

  // Check for unsaved changes
  const currentDocsState = isDocsMode ? JSON.stringify({ pages, componentsCode, tokensCode }) : null
  const hasUnsavedChanges = isDocsMode && currentDocsState !== lastSavedState

  // Auto-save docs to localStorage when in docs mode
  useEffect(() => {
    if (isDocsMode && pages.length > 0) {
      const docsState: DocsProjectState = {
        pages,
        currentPageId,
        layoutCode,
        componentsCode,
        tokensCode,
      }
      localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docsState))
    }
  }, [isDocsMode, pages, currentPageId, layoutCode, componentsCode, tokensCode])

  // Load documentation from server (with fallbacks)
  const loadDocs = useCallback(async (): Promise<DocsProjectState | null> => {
    // Use cache if available
    if (docsCache) {
      return docsCache
    }

    // Try loading from server first
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/docs-load.php`)
      if (response.ok) {
        const data = await response.json()

        // Check if it's a .mirror file response
        if (data.type === 'mirror' && data.content) {
          const result = parseMirrorFile(data.content)
          if (result.success && result.project) {
            const project = result.project
            const firstPage = project.pages[0]
            docsCache = {
              pages: project.pages.map(p => ({
                id: p.id,
                name: p.name,
                layoutCode: p.layoutCode,
              })),
              currentPageId: firstPage?.id || '',
              layoutCode: firstPage?.layoutCode || '',
              componentsCode: project.componentsCode,
              tokensCode: project.tokensCode,
            }
            lastSavedState = JSON.stringify({ pages: docsCache.pages, componentsCode: docsCache.componentsCode, tokensCode: docsCache.tokensCode })
            return docsCache
          }
        } else if (data.pages) {
          // Direct JSON format
          docsCache = data as DocsProjectState
          lastSavedState = JSON.stringify({ pages: docsCache.pages, componentsCode: docsCache.componentsCode, tokensCode: docsCache.tokensCode })
          return docsCache
        }
      }
    } catch (err) {
      console.log('Server load failed, trying fallbacks:', err)
    }

    // Try loading from localStorage (draft)
    try {
      const stored = localStorage.getItem(DOCS_STORAGE_KEY)
      if (stored) {
        const data = JSON.parse(stored) as DocsProjectState
        if (data.pages?.length > 0) {
          console.log('Loaded docs from localStorage')
          docsCache = data
          return docsCache
        }
      }
    } catch (err) {
      console.log('localStorage load failed:', err)
    }

    // Fallback to static .mirror file
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}mirror-docs.mirror`)
      if (!response.ok) {
        throw new Error(`Failed to load documentation: ${response.status}`)
      }

      const content = await response.text()
      const result = parseMirrorFile(content)

      if (!result.success || !result.project) {
        throw new Error(result.error || 'Failed to parse documentation')
      }

      const project = result.project
      const firstPage = project.pages[0]

      docsCache = {
        pages: project.pages.map(p => ({
          id: p.id,
          name: p.name,
          layoutCode: p.layoutCode,
        })),
        currentPageId: firstPage?.id || '',
        layoutCode: firstPage?.layoutCode || '',
        componentsCode: project.componentsCode,
        tokensCode: project.tokensCode,
      }

      lastSavedState = JSON.stringify({ pages: docsCache.pages, componentsCode: docsCache.componentsCode, tokensCode: docsCache.tokensCode })
      return docsCache
    } catch (err) {
      console.error('Failed to load documentation:', err)
      throw err
    }
  }, [])

  // Save docs to server
  const saveDocs = useCallback(async (): Promise<boolean> => {
    if (!isDocsMode) return false

    // Get admin key from localStorage or prompt
    let adminKey = getStoredAdminKey()
    if (!adminKey) {
      adminKey = promptForPassword()
      if (!adminKey) {
        return false // User cancelled
      }
    }

    setIsSaving(true)
    setError(null)

    try {
      const docsState: DocsProjectState = {
        pages,
        currentPageId,
        layoutCode,
        componentsCode,
        tokensCode,
      }

      const response = await fetch(`${import.meta.env.BASE_URL}api/docs-save.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify(docsState),
      })

      if (response.status === 401) {
        // Invalid password
        localStorage.removeItem(ADMIN_KEY_STORAGE)
        setHasAdminAccess(false)
        setError('Ungültiges Passwort')
        return false
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Speichern fehlgeschlagen')
      }

      // Success - store the admin key
      storeAdminKey(adminKey)
      setHasAdminAccess(true)

      // Update last saved state
      lastSavedState = JSON.stringify({ pages, componentsCode, tokensCode })

      // Update cache
      docsCache = docsState

      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen')
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isDocsMode, pages, currentPageId, layoutCode, componentsCode, tokensCode])

  // Save current project state
  const saveCurrentProject = useCallback(() => {
    savedProjectRef.current = {
      pages: [...pages],
      currentPageId,
      layoutCode,
      componentsCode,
      tokensCode,
      dataCode,
    }
  }, [pages, currentPageId, layoutCode, componentsCode, tokensCode, dataCode])

  // Restore saved project
  const restoreProject = useCallback(() => {
    const saved = savedProjectRef.current
    if (!saved) return

    loadProject({
      pages: saved.pages,
      currentPageId: saved.currentPageId,
      layoutCode: saved.layoutCode,
    })
    setComponentsCode(saved.componentsCode)
    setTokensCode(saved.tokensCode)
    setDataCode(saved.dataCode)

    savedProjectRef.current = null
  }, [loadProject, setComponentsCode, setTokensCode, setDataCode])

  // Enter docs mode
  const enterDocsMode = useCallback(async () => {
    if (isDocsMode) return

    setIsLoading(true)
    setError(null)

    try {
      // Save current project first
      saveCurrentProject()

      // Load documentation
      const docs = await loadDocs()
      if (!docs) {
        throw new Error('Documentation not available')
      }

      // Apply documentation to editor
      loadProject({
        pages: docs.pages,
        currentPageId: docs.currentPageId,
        layoutCode: docs.layoutCode,
      })
      setComponentsCode(docs.componentsCode)
      setTokensCode(docs.tokensCode)
      // Don't set dataCode - docs don't have data

      setIsDocsMode(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documentation')
      // Restore project on error
      restoreProject()
    } finally {
      setIsLoading(false)
    }
  }, [isDocsMode, saveCurrentProject, loadDocs, loadProject, setComponentsCode, setTokensCode, restoreProject])

  // Exit docs mode
  const exitDocsMode = useCallback(() => {
    if (!isDocsMode) return

    // Clear cache so next load gets fresh data
    docsCache = null

    restoreProject()
    setIsDocsMode(false)
    setError(null)
  }, [isDocsMode, restoreProject])

  // Toggle docs mode
  const toggleDocsMode = useCallback(() => {
    if (isDocsMode) {
      exitDocsMode()
    } else {
      enterDocsMode()
    }
  }, [isDocsMode, enterDocsMode, exitDocsMode])

  return {
    isDocsMode,
    toggleDocsMode,
    enterDocsMode,
    exitDocsMode,
    isLoading,
    isSaving,
    error,
    saveDocs,
    hasAdminAccess,
    hasUnsavedChanges,
  }
}
