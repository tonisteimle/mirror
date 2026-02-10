/**
 * Hook for managing pages in the Mirror application.
 * Handles page CRUD operations, navigation, and reference checking.
 */

import { useState, useCallback } from 'react'
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
  updateCurrentPageLayoutCode: () => void
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
  const [layoutCode, setLayoutCodeState] = useState(() => {
    const initialPage = options.initialPages?.find(p => p.id === (options.initialPageId || options.initialPages?.[0]?.id))
    return initialPage?.layoutCode || ''
  })

  // Get current page
  const currentPage = pages.find(p => p.id === currentPageId)

  // Update layout code and sync to pages
  const setLayoutCode = useCallback((code: string) => {
    setLayoutCodeState(code)
  }, [])

  // Update current page's layout code in pages array
  const updateCurrentPageLayoutCode = useCallback(() => {
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))
  }, [currentPageId, layoutCode])

  // Switch to a different page
  const switchToPage = useCallback((pageId: string) => {
    // Save current page's layout code first
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))

    // Load new page's layout code
    const page = pages.find(p => p.id === pageId)
    if (page) {
      setLayoutCodeState(page.layoutCode)
      setCurrentPageId(pageId)
    }
  }, [currentPageId, layoutCode, pages])

  // Add a new page
  const addPage = useCallback(() => {
    // Save current page first
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))

    const pageNumber = pages.length + 1
    const newPage: PageData = {
      id: `page-${Date.now()}`,
      name: `Page ${pageNumber}`,
      layoutCode: ''
    }
    setPages(prev => [...prev, newPage])
    setLayoutCodeState('')
    setCurrentPageId(newPage.id)
  }, [currentPageId, layoutCode, pages.length])

  // Rename a page
  const renamePage = useCallback((pageId: string, newName: string) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, name: newName } : p
    ))
  }, [])

  // Check which pages reference a given page name
  const getPageReferences = useCallback((pageName: string): string[] => {
    const references: string[] = []
    // Check all pages (including current with latest layoutCode)
    const allPages = pages.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    )
    for (const page of allPages) {
      if (page.name === pageName) continue // Skip self
      // Check if layoutCode contains "page pageName" pattern
      const pattern = new RegExp(`\\bpage\\s+${pageName}\\b`, 'i')
      if (pattern.test(page.layoutCode)) {
        references.push(page.name)
      }
    }
    return references
  }, [pages, currentPageId, layoutCode])

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
      const newCurrentPage = newPages[newIndex]
      setLayoutCodeState(newCurrentPage.layoutCode)
      setCurrentPageId(newCurrentPage.id)
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
    // Save current page first
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))

    // Find page by name
    const existingPage = pages.find(p => p.name === pageName)
    if (existingPage) {
      setLayoutCodeState(existingPage.layoutCode)
      setCurrentPageId(existingPage.id)
    } else {
      // Auto-create new page
      const newPage: PageData = {
        id: `page-${Date.now()}`,
        name: pageName,
        layoutCode: ''
      }
      setPages(prev => [...prev, newPage])
      setLayoutCodeState('')
      setCurrentPageId(newPage.id)
    }
  }, [currentPageId, layoutCode, pages])

  // Load project data (e.g., from localStorage or import)
  const loadProject = useCallback((data: {
    pages: PageData[]
    currentPageId: string
    layoutCode?: string
  }) => {
    setPages(data.pages)
    setCurrentPageId(data.currentPageId)
    const page = data.pages.find(p => p.id === data.currentPageId)
    setLayoutCodeState(data.layoutCode ?? page?.layoutCode ?? '')
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
    updateCurrentPageLayoutCode,
    loadProject,
  }
}
