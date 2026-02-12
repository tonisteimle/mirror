/**
 * Hook for managing pages in the Mirror application.
 * Handles page CRUD operations, navigation, and reference checking.
 *
 * Uses Single Source of Truth: layoutCode is always derived from pages array.
 */

import { useState, useCallback, useMemo } from 'react'
import type { PageData } from '../components/PageSidebar'

export interface UsePageManagerOptions {
  initialPages?: PageData[]
  initialPageId?: string
}

export interface UsePageManagerReturn {
  // State
  pages: PageData[]
  currentPageId: string
  currentPage: PageData | undefined
  layoutCode: string

  // Setters
  setPages: React.Dispatch<React.SetStateAction<PageData[]>>
  setLayoutCode: (code: string) => void

  // Actions
  switchToPage: (pageId: string) => void
  addPage: () => void
  renamePage: (pageId: string, newName: string) => void
  deletePage: (pageId: string) => string[] | null
  reorderPages: (fromIndex: number, toIndex: number) => void
  navigateToPage: (pageName: string) => void
  loadProject: (data: { pages: PageData[]; currentPageId: string; layoutCode?: string }) => void

  // Utilities
  getPageReferences: (pageName: string) => string[]
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

  // Single Source of Truth: derive layoutCode from pages array
  const currentPage = useMemo(
    () => pages.find(p => p.id === currentPageId),
    [pages, currentPageId]
  )
  const layoutCode = currentPage?.layoutCode ?? ''

  // Update layout code by updating the current page in pages array
  const setLayoutCode = useCallback((code: string) => {
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode: code } : p
    ))
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

    // Check for references
    const references = getPageReferences(page.name)
    if (references.length > 0) {
      return references // Return referencing pages instead of deleting
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
  }, [pages, currentPageId, getPageReferences])

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

  return {
    pages,
    currentPageId,
    currentPage,
    layoutCode,
    setPages,
    setLayoutCode,
    switchToPage,
    addPage,
    renamePage,
    deletePage,
    reorderPages,
    navigateToPage,
    getPageReferences,
    loadProject,
  }
}
