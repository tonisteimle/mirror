import { useState, useCallback } from 'react'
import type { PageData } from '../components/PageSidebar'

const defaultLayoutCode = `Page
  Header
    Logo "Mirror"
    Nav
      NavItem "Home"
      NavItem "Features"
      NavItem "Docs"
    Button "Get Started"

  Hero
    Title "Design with Code"
    Subtitle "Ein visueller Editor für UI-Prototypen"
    hor gap 16
      Button "Loslegen"
      ButtonSecondary "Mehr erfahren"`

export interface UsePagesReturn {
  pages: PageData[]
  currentPageId: string
  layoutCode: string
  setLayoutCode: (code: string) => void
  switchToPage: (pageId: string) => void
  addPage: () => void
  renamePage: (pageId: string, newName: string) => void
  deletePage: (pageId: string) => string[] | null
  reorderPages: (fromIndex: number, toIndex: number) => void
  navigateToPage: (pageName: string) => void
  setPages: React.Dispatch<React.SetStateAction<PageData[]>>
  setCurrentPageId: React.Dispatch<React.SetStateAction<string>>
  getCurrentPagesWithLayout: () => PageData[]
}

export function usePages(): UsePagesReturn {
  const [pages, setPages] = useState<PageData[]>([
    { id: 'home', name: 'Home', layoutCode: defaultLayoutCode }
  ])
  const [currentPageId, setCurrentPageId] = useState('home')
  const [layoutCode, setLayoutCode] = useState(defaultLayoutCode)

  // Get all pages with current layout code updated
  const getCurrentPagesWithLayout = useCallback(() => {
    return pages.map(p => p.id === currentPageId ? { ...p, layoutCode } : p)
  }, [pages, currentPageId, layoutCode])

  // Check which pages reference a given page name
  const getPageReferences = useCallback((pageName: string): string[] => {
    const references: string[] = []
    const allPages = getCurrentPagesWithLayout()
    for (const page of allPages) {
      if (page.name === pageName) continue
      const pattern = new RegExp(`\\bpage\\s+${pageName}\\b`, 'i')
      if (pattern.test(page.layoutCode)) {
        references.push(page.name)
      }
    }
    return references
  }, [getCurrentPagesWithLayout])

  const switchToPage = useCallback((pageId: string) => {
    // Save current page's layout code
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))
    // Load new page's layout code
    const page = pages.find(p => p.id === pageId)
    if (page) {
      setLayoutCode(page.layoutCode)
      setCurrentPageId(pageId)
    }
  }, [currentPageId, layoutCode, pages])

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
    setLayoutCode('')
    setCurrentPageId(newPage.id)
  }, [currentPageId, layoutCode, pages.length])

  const renamePage = useCallback((pageId: string, newName: string) => {
    setPages(prev => prev.map(p =>
      p.id === pageId ? { ...p, name: newName } : p
    ))
  }, [])

  const deletePage = useCallback((pageId: string): string[] | null => {
    if (pages.length <= 1) return null

    const page = pages.find(p => p.id === pageId)
    if (!page) return null

    // Check for references
    const references = getPageReferences(page.name)
    if (references.length > 0) {
      return references
    }

    const pageIndex = pages.findIndex(p => p.id === pageId)
    const newPages = pages.filter(p => p.id !== pageId)
    setPages(newPages)

    // If we're deleting the current page, switch to another
    if (pageId === currentPageId) {
      const newIndex = Math.min(pageIndex, newPages.length - 1)
      const newCurrentPage = newPages[newIndex]
      setLayoutCode(newCurrentPage.layoutCode)
      setCurrentPageId(newCurrentPage.id)
    }
    return null
  }, [pages, currentPageId, getPageReferences])

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    setPages(prev => {
      const newPages = [...prev]
      const [removed] = newPages.splice(fromIndex, 1)
      newPages.splice(toIndex, 0, removed)
      return newPages
    })
  }, [])

  const navigateToPage = useCallback((pageName: string) => {
    // Save current page first
    setPages(prev => prev.map(p =>
      p.id === currentPageId ? { ...p, layoutCode } : p
    ))

    // Find page by name
    const existingPage = pages.find(p => p.name === pageName)
    if (existingPage) {
      setLayoutCode(existingPage.layoutCode)
      setCurrentPageId(existingPage.id)
    } else {
      // Auto-create new page
      const newPage: PageData = {
        id: `page-${Date.now()}`,
        name: pageName,
        layoutCode: ''
      }
      setPages(prev => [...prev, newPage])
      setLayoutCode('')
      setCurrentPageId(newPage.id)
    }
  }, [currentPageId, layoutCode, pages])

  return {
    pages,
    currentPageId,
    layoutCode,
    setLayoutCode,
    switchToPage,
    addPage,
    renamePage,
    deletePage,
    reorderPages,
    navigateToPage,
    setPages,
    setCurrentPageId,
    getCurrentPagesWithLayout,
  }
}
