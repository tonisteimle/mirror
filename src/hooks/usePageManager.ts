/**
 * Hook for managing pages in the Mirror application.
 * Handles page CRUD operations, navigation, and reference checking.
 *
 * Pages are code-driven:
 * - Created automatically when referenced via `page PageName` in code
 * - Can only be deleted when not referenced
 *
 * Uses Single Source of Truth: layoutCode is always derived from pages array.
 */

import { useState, useCallback, useMemo } from 'react'
import type { PageData } from '../components/PageSidebar'

export interface UsePageManagerOptions {
  initialPages?: PageData[]
  initialPageId?: string
  /** Components code (also scanned for page references) */
  componentsCode?: string
}

export interface UsePageManagerReturn {
  // State
  pages: PageData[]
  currentPageId: string
  currentPage: PageData | undefined
  layoutCode: string
  /** Set of page names referenced in code */
  referencedPages: Set<string>

  // Setters
  setPages: React.Dispatch<React.SetStateAction<PageData[]>>
  setLayoutCode: (code: string) => void
  setCurrentPageId: React.Dispatch<React.SetStateAction<string>>

  // Actions
  switchToPage: (pageId: string) => void
  addPage: () => void
  renamePage: (pageId: string, newName: string) => void
  deletePage: (pageId: string) => string[] | null
  reorderPages: (fromIndex: number, toIndex: number) => void
  navigateToPage: (pageName: string) => void
  loadProject: (data: { pages: PageData[]; currentPageId: string; layoutCode?: string }) => void
  /** Sync pages with code references (creates missing, allows delete of unreferenced) */
  syncPagesWithCode: (componentsCode: string) => void
  /** Restore pages from cloud save (replaces all pages) */
  restorePages: (pages: PageData[], currentPageId: string) => void

  // Utilities
  getPageReferences: (pageName: string) => string[]
}

/**
 * Extract all page names referenced in code via `page PageName` pattern.
 * This finds references like: onclick page Settings, page Dashboard, etc.
 */
export function extractPageReferences(code: string): Set<string> {
  const refs = new Set<string>()
  // Match: page followed by a page name (capitalized word)
  // Pattern: \bpage\s+([A-Z][a-zA-Z0-9]*)
  const pattern = /\bpage\s+([A-Z][a-zA-Z0-9]*)\b/g
  let match
  while ((match = pattern.exec(code)) !== null) {
    refs.add(match[1])
  }
  return refs
}

const DEFAULT_PAGE: PageData = {
  id: 'home',
  name: 'Home',
  layoutCode: ''
}

export function usePageManager(options: UsePageManagerOptions = {}): UsePageManagerReturn {
  const [pages, setPages] = useState<PageData[]>(
    options.initialPages || [DEFAULT_PAGE]
  )
  const [currentPageId, setCurrentPageId] = useState(
    options.initialPageId || options.initialPages?.[0]?.id || 'home'
  )
  const [componentsCodeRef, setComponentsCodeRef] = useState(options.componentsCode || '')

  // Single Source of Truth: derive layoutCode from pages array
  const currentPage = useMemo(
    () => pages.find(p => p.id === currentPageId),
    [pages, currentPageId]
  )
  const layoutCode = currentPage?.layoutCode ?? ''

  // Calculate referenced pages from all code
  const referencedPages = useMemo(() => {
    const allRefs = new Set<string>()
    // Scan all page layouts
    for (const page of pages) {
      const refs = extractPageReferences(page.layoutCode)
      refs.forEach(r => allRefs.add(r))
    }
    // Scan components code
    const compRefs = extractPageReferences(componentsCodeRef)
    compRefs.forEach(r => allRefs.add(r))
    return allRefs
  }, [pages, componentsCodeRef])

  // Update layout code by updating the current page in pages array
  const setLayoutCode = useCallback((code: string) => {
    console.log('B1-PAGES: start')
    setPages(prev => {
      console.log('B2-PAGES: updater running')
      return prev.map(p =>
        p.id === currentPageId ? { ...p, layoutCode: code } : p
      )
    })
    console.log('B3-PAGES: done')
  }, [currentPageId])

  // Switch to a different page (no need to save current - already saved)
  const switchToPage = useCallback((pageId: string) => {
    const page = pages.find(p => p.id === pageId)
    if (page) {
      setCurrentPageId(pageId)
    }
  }, [pages])

  // Add a new page
  const addPage = useCallback(() => {
    const pageNumber = pages.length + 1
    const newPage: PageData = {
      id: `page-${Date.now()}`,
      name: `Page ${pageNumber}`,
      layoutCode: ''
    }
    setPages(prev => [...prev, newPage])
    setCurrentPageId(newPage.id)
  }, [pages.length])

  // Rename a page
  const renamePage = useCallback((pageId: string, newName: string) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, name: newName } : p
    ))
  }, [])

  // Check which pages reference a given page name
  // (pages array is always up-to-date due to Single Source of Truth)
  const getPageReferences = useCallback((pageName: string): string[] => {
    const references: string[] = []
    for (const page of pages) {
      if (page.name === pageName) continue // Skip self
      // Check if layoutCode contains "page pageName" pattern
      const pattern = new RegExp(`\\bpage\\s+${pageName}\\b`, 'i')
      if (pattern.test(page.layoutCode)) {
        references.push(page.name)
      }
    }
    return references
  }, [pages])

  // Delete a page (returns referencing pages if deletion blocked)
  const deletePage = useCallback((pageId: string): string[] | null => {
    if (pages.length <= 1) return null

    const page = pages.find(p => p.id === pageId)
    if (!page) return null

    // Check if page is referenced in code
    if (referencedPages.has(page.name)) {
      // Find which pages reference it
      const references = getPageReferences(page.name)
      return references.length > 0 ? references : ['Code']
    }

    const pageIndex = pages.findIndex(p => p.id === pageId)
    const newPages = pages.filter(p => p.id !== pageId)
    setPages(newPages)

    // If we're deleting the current page, switch to another
    if (pageId === currentPageId) {
      const newIndex = Math.min(pageIndex, newPages.length - 1)
      setCurrentPageId(newPages[newIndex].id)
    }
    return null
  }, [pages, currentPageId, referencedPages, getPageReferences])

  // Reorder pages (drag & drop)
  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages(prev => {
      const newPages = [...prev]
      const [removed] = newPages.splice(fromIndex, 1)
      newPages.splice(toIndex, 0, removed)
      return newPages
    })
  }, [])

  // Navigate to a page by name (creates if doesn't exist)
  const navigateToPage = useCallback((pageName: string) => {
    // Find page by name
    const existingPage = pages.find(p => p.name === pageName)
    if (existingPage) {
      setCurrentPageId(existingPage.id)
    } else {
      // Auto-create new page
      const newPage: PageData = {
        id: `page-${Date.now()}`,
        name: pageName,
        layoutCode: ''
      }
      setPages(prev => [...prev, newPage])
      setCurrentPageId(newPage.id)
    }
  }, [pages])

  // Load project data (e.g., from localStorage or import)
  // If layoutCode is provided, it updates the current page's code
  const loadProject = useCallback((data: {
    pages: PageData[]
    currentPageId: string
    layoutCode?: string
  }) => {
    // If layoutCode is explicitly provided, update the current page
    if (data.layoutCode !== undefined) {
      const updatedPages = data.pages.map(p =>
        p.id === data.currentPageId ? { ...p, layoutCode: data.layoutCode! } : p
      )
      setPages(updatedPages)
    } else {
      setPages(data.pages)
    }
    setCurrentPageId(data.currentPageId)
  }, [])

  // Sync pages with code references
  // Creates pages for references that don't exist yet
  const syncPagesWithCode = useCallback((componentsCode: string) => {
    setComponentsCodeRef(componentsCode)

    // Get all references from all code
    const allRefs = new Set<string>()
    for (const page of pages) {
      const refs = extractPageReferences(page.layoutCode)
      refs.forEach(r => allRefs.add(r))
    }
    const compRefs = extractPageReferences(componentsCode)
    compRefs.forEach(r => allRefs.add(r))

    // Find references that don't have pages yet
    const existingNames = new Set(pages.map(p => p.name))
    const missingPages: string[] = []
    allRefs.forEach(ref => {
      if (!existingNames.has(ref)) {
        missingPages.push(ref)
      }
    })

    // Create missing pages
    if (missingPages.length > 0) {
      setPages(prev => [
        ...prev,
        ...missingPages.map(name => ({
          id: `page-${name.toLowerCase()}-${Date.now()}`,
          name,
          layoutCode: ''
        }))
      ])
    }
  }, [pages])

  // Restore pages from cloud save (replaces all pages)
  const restorePages = useCallback((newPages: PageData[], newCurrentPageId: string) => {
    if (newPages.length > 0) {
      setPages(newPages)
      // Ensure currentPageId exists in new pages
      const validPageId = newPages.find(p => p.id === newCurrentPageId)
        ? newCurrentPageId
        : newPages[0].id
      setCurrentPageId(validPageId)
    }
  }, [])

  return {
    pages,
    currentPageId,
    currentPage,
    layoutCode,
    referencedPages,
    setPages,
    setLayoutCode,
    setCurrentPageId,
    switchToPage,
    addPage,
    renamePage,
    deletePage,
    reorderPages,
    navigateToPage,
    getPageReferences,
    loadProject,
    syncPagesWithCode,
    restorePages,
  }
}
