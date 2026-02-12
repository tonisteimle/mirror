/**
 * Tests for usePageManager hook.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePageManager } from '../../hooks/usePageManager'

describe('usePageManager', () => {
  describe('Initialization', () => {
    it('should initialize with default page when no options provided', () => {
      const { result } = renderHook(() => usePageManager())

      expect(result.current.pages).toHaveLength(1)
      expect(result.current.pages[0].id).toBe('home')
      expect(result.current.pages[0].name).toBe('Home')
      expect(result.current.currentPageId).toBe('home')
      expect(result.current.layoutCode).toBe('')
    })

    it('should initialize with provided pages', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: 'Box' },
        { id: 'page2', name: 'Page 2', layoutCode: 'Card' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      expect(result.current.pages).toHaveLength(2)
      expect(result.current.currentPageId).toBe('page1')
      expect(result.current.layoutCode).toBe('Box')
    })

    it('should use first page id if initialPageId not provided', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: 'Box' },
        { id: 'page2', name: 'Page 2', layoutCode: 'Card' },
      ]
      const { result } = renderHook(() => usePageManager({ initialPages }))

      expect(result.current.currentPageId).toBe('page1')
    })
  })

  describe('Page Switching', () => {
    it('should switch to a different page', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: 'Box' },
        { id: 'page2', name: 'Page 2', layoutCode: 'Card' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      act(() => {
        result.current.switchToPage('page2')
      })

      expect(result.current.currentPageId).toBe('page2')
      expect(result.current.layoutCode).toBe('Card')
    })

    it('should save current page layout before switching', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: 'Box' },
        { id: 'page2', name: 'Page 2', layoutCode: 'Card' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      // Modify layout code
      act(() => {
        result.current.setLayoutCode('Modified Box')
      })

      // Switch to page 2
      act(() => {
        result.current.switchToPage('page2')
      })

      // Switch back to page 1
      act(() => {
        result.current.switchToPage('page1')
      })

      expect(result.current.layoutCode).toBe('Modified Box')
    })
  })

  describe('Adding Pages', () => {
    it('should add a new page', () => {
      const { result } = renderHook(() => usePageManager())

      act(() => {
        result.current.addPage()
      })

      expect(result.current.pages).toHaveLength(2)
      expect(result.current.pages[1].name).toBe('Page 2')
      expect(result.current.currentPageId).toBe(result.current.pages[1].id)
      expect(result.current.layoutCode).toBe('')
    })

    it('should generate unique page IDs', async () => {
      const { result } = renderHook(() => usePageManager())

      await act(async () => {
        result.current.addPage()
      })

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10))

      await act(async () => {
        result.current.addPage()
      })

      const ids = result.current.pages.map(p => p.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('Renaming Pages', () => {
    it('should rename a page', () => {
      const { result } = renderHook(() => usePageManager())

      act(() => {
        result.current.renamePage('home', 'Dashboard')
      })

      expect(result.current.pages[0].name).toBe('Dashboard')
    })
  })

  describe('Deleting Pages', () => {
    it('should not delete the last page', () => {
      const { result } = renderHook(() => usePageManager())

      let references: string[] | null = null
      act(() => {
        references = result.current.deletePage('home')
      })

      expect(result.current.pages).toHaveLength(1)
      expect(references).toBeNull()
    })

    it('should delete a page when multiple exist', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: '' },
        { id: 'page2', name: 'Page 2', layoutCode: '' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      act(() => {
        result.current.deletePage('page2')
      })

      expect(result.current.pages).toHaveLength(1)
      expect(result.current.pages[0].id).toBe('page1')
    })

    it('should switch to another page when current page is deleted', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: 'Layout1' },
        { id: 'page2', name: 'Page 2', layoutCode: 'Layout2' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      act(() => {
        result.current.deletePage('page1')
      })

      expect(result.current.currentPageId).toBe('page2')
      expect(result.current.layoutCode).toBe('Layout2')
    })

    it('should return referencing pages when page is referenced', () => {
      const initialPages = [
        { id: 'page1', name: 'Page1', layoutCode: 'page Page2' },
        { id: 'page2', name: 'Page2', layoutCode: '' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      let references: string[] | null = null
      act(() => {
        references = result.current.deletePage('page2')
      })

      expect(references).toEqual(['Page1'])
      expect(result.current.pages).toHaveLength(2) // Page not deleted
    })
  })

  describe('Reordering Pages', () => {
    it('should reorder pages', () => {
      const initialPages = [
        { id: 'page1', name: 'Page 1', layoutCode: '' },
        { id: 'page2', name: 'Page 2', layoutCode: '' },
        { id: 'page3', name: 'Page 3', layoutCode: '' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      act(() => {
        result.current.reorderPages(0, 2)
      })

      expect(result.current.pages[0].id).toBe('page2')
      expect(result.current.pages[1].id).toBe('page3')
      expect(result.current.pages[2].id).toBe('page1')
    })
  })

  describe('Page Navigation', () => {
    it('should navigate to existing page by name', () => {
      const initialPages = [
        { id: 'page1', name: 'Home', layoutCode: 'HomeLayout' },
        { id: 'page2', name: 'About', layoutCode: 'AboutLayout' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      act(() => {
        result.current.navigateToPage('About')
      })

      expect(result.current.currentPageId).toBe('page2')
      expect(result.current.layoutCode).toBe('AboutLayout')
    })

    it('should create new page if name does not exist', () => {
      const { result } = renderHook(() => usePageManager())

      act(() => {
        result.current.navigateToPage('NewPage')
      })

      expect(result.current.pages).toHaveLength(2)
      expect(result.current.currentPage?.name).toBe('NewPage')
      expect(result.current.layoutCode).toBe('')
    })
  })

  describe('Load Project', () => {
    it('should load project data', () => {
      const { result } = renderHook(() => usePageManager())

      act(() => {
        result.current.loadProject({
          pages: [
            { id: 'loaded1', name: 'Loaded Page', layoutCode: 'LoadedLayout' },
          ],
          currentPageId: 'loaded1',
          layoutCode: 'LoadedLayout',
        })
      })

      expect(result.current.pages).toHaveLength(1)
      expect(result.current.pages[0].name).toBe('Loaded Page')
      expect(result.current.currentPageId).toBe('loaded1')
      expect(result.current.layoutCode).toBe('LoadedLayout')
    })
  })

  describe('Get Page References', () => {
    it('should find pages that reference a given page', () => {
      const initialPages = [
        { id: 'page1', name: 'Home', layoutCode: 'page About\npage Contact' },
        { id: 'page2', name: 'About', layoutCode: '' },
        { id: 'page3', name: 'Contact', layoutCode: 'page About' },
      ]
      const { result } = renderHook(() =>
        usePageManager({ initialPages, initialPageId: 'page1' })
      )

      const refs = result.current.getPageReferences('About')

      expect(refs).toContain('Home')
      expect(refs).toContain('Contact')
      expect(refs).not.toContain('About')
    })
  })
})
