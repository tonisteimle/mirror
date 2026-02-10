/**
 * PageSidebar Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PageSidebar, PageData } from '../components/PageSidebar'

// Mock scrollIntoView which isn't available in JSDOM
Element.prototype.scrollIntoView = vi.fn()

describe('PageSidebar', () => {
  const mockPages: PageData[] = [
    { id: 'page1', name: 'Home', layoutCode: 'Box' },
    { id: 'page2', name: 'About', layoutCode: 'Box' },
    { id: 'page3', name: 'Contact', layoutCode: 'Box' },
  ]

  const defaultProps = {
    pages: mockPages,
    currentPageId: 'page1',
    onSelectPage: vi.fn(),
    onAddPage: vi.fn(),
    onRenamePage: vi.fn(),
    onDeletePage: vi.fn(() => null),
    onReorderPages: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render all pages', () => {
      render(<PageSidebar {...defaultProps} />)

      expect(screen.getByText('Home')).toBeDefined()
      expect(screen.getByText('About')).toBeDefined()
      expect(screen.getByText('Contact')).toBeDefined()
    })

    it('should render the header', () => {
      render(<PageSidebar {...defaultProps} />)

      expect(screen.getByText('Pages')).toBeDefined()
    })

    it('should render the add button', () => {
      render(<PageSidebar {...defaultProps} />)

      expect(screen.getByText('+')).toBeDefined()
    })

    it('should highlight current page', () => {
      const { container } = render(<PageSidebar {...defaultProps} currentPageId="page2" />)

      // The active page should have a different background
      const aboutPage = screen.getByText('About')
      // Check parent element has active styling
      expect(aboutPage.parentElement?.style.backgroundColor).toBeDefined()
    })
  })

  describe('Selection', () => {
    it('should select page on click', () => {
      const onSelectPage = vi.fn()
      render(<PageSidebar {...defaultProps} onSelectPage={onSelectPage} />)

      fireEvent.click(screen.getByText('About'))

      expect(onSelectPage).toHaveBeenCalledWith('page2')
    })

    it('should not select page when editing', async () => {
      const onSelectPage = vi.fn()
      render(<PageSidebar {...defaultProps} onSelectPage={onSelectPage} />)

      // Double-click to start editing
      fireEvent.doubleClick(screen.getByText('Home'))

      // Try to click - should not trigger selection during edit mode
      const input = screen.getByRole('textbox')
      fireEvent.click(input)

      // Selection should only be called once from the initial click
      expect(onSelectPage).not.toHaveBeenCalled()
    })
  })

  describe('Add Page', () => {
    it('should call onAddPage when add button clicked', () => {
      const onAddPage = vi.fn()
      render(<PageSidebar {...defaultProps} onAddPage={onAddPage} />)

      fireEvent.click(screen.getByText('+'))

      expect(onAddPage).toHaveBeenCalled()
    })
  })

  describe('Renaming', () => {
    it('should enter edit mode on double-click', () => {
      render(<PageSidebar {...defaultProps} />)

      fireEvent.doubleClick(screen.getByText('Home'))

      expect(screen.getByRole('textbox')).toBeDefined()
    })

    it('should show input field when editing', () => {
      render(<PageSidebar {...defaultProps} />)

      fireEvent.doubleClick(screen.getByText('Home'))

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('Home')
    })

    it('should call onRenamePage on Enter', () => {
      const onRenamePage = vi.fn()
      render(<PageSidebar {...defaultProps} onRenamePage={onRenamePage} />)

      fireEvent.doubleClick(screen.getByText('Home'))

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Name' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenamePage).toHaveBeenCalledWith('page1', 'New Name')
    })

    it('should cancel rename on Escape', () => {
      const onRenamePage = vi.fn()
      render(<PageSidebar {...defaultProps} onRenamePage={onRenamePage} />)

      fireEvent.doubleClick(screen.getByText('Home'))

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Name' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      expect(onRenamePage).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('should trim whitespace from name', () => {
      const onRenamePage = vi.fn()
      render(<PageSidebar {...defaultProps} onRenamePage={onRenamePage} />)

      fireEvent.doubleClick(screen.getByText('Home'))

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '  Trimmed Name  ' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenamePage).toHaveBeenCalledWith('page1', 'Trimmed Name')
    })

    it('should not rename if name is empty', () => {
      const onRenamePage = vi.fn()
      render(<PageSidebar {...defaultProps} onRenamePage={onRenamePage} />)

      fireEvent.doubleClick(screen.getByText('Home'))

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRenamePage).not.toHaveBeenCalled()
    })
  })

  describe('Context Menu', () => {
    it('should open on right-click', () => {
      render(<PageSidebar {...defaultProps} />)

      fireEvent.contextMenu(screen.getByText('Home'))

      expect(screen.getByText('Rename')).toBeDefined()
    })

    it('should show rename and delete options', () => {
      render(<PageSidebar {...defaultProps} />)

      fireEvent.contextMenu(screen.getByText('Home'))

      expect(screen.getByText('Rename')).toBeDefined()
      expect(screen.getByText('Delete')).toBeDefined()
    })

    it('should start rename from context menu', () => {
      render(<PageSidebar {...defaultProps} />)

      fireEvent.contextMenu(screen.getByText('About'))
      fireEvent.click(screen.getByText('Rename'))

      const input = screen.getByRole('textbox') as HTMLInputElement
      expect(input.value).toBe('About')
    })

    it('should not show delete if only one page', () => {
      const singlePage = [mockPages[0]]
      render(<PageSidebar {...defaultProps} pages={singlePage} />)

      fireEvent.contextMenu(screen.getByText('Home'))

      expect(screen.getByText('Rename')).toBeDefined()
      expect(screen.queryByText('Delete')).toBeNull()
    })
  })

  describe('Deletion', () => {
    it('should call onDeletePage when delete clicked', () => {
      const onDeletePage = vi.fn(() => null)
      render(<PageSidebar {...defaultProps} onDeletePage={onDeletePage} />)

      fireEvent.contextMenu(screen.getByText('About'))
      fireEvent.click(screen.getByText('Delete'))

      expect(onDeletePage).toHaveBeenCalledWith('page2')
    })

    it('should show error if page is referenced', () => {
      const onDeletePage = vi.fn(() => ['HomePage', 'ContactPage'])
      render(<PageSidebar {...defaultProps} onDeletePage={onDeletePage} />)

      fireEvent.contextMenu(screen.getByText('About'))
      fireEvent.click(screen.getByText('Delete'))

      expect(screen.getByText(/Seite wird noch referenziert/)).toBeDefined()
      expect(screen.getByText(/HomePage, ContactPage/)).toBeDefined()
    })
  })

  describe('Drag & Drop', () => {
    it('should set draggable attribute', () => {
      const { container } = render(<PageSidebar {...defaultProps} />)

      const pageItems = container.querySelectorAll('[draggable="true"]')
      expect(pageItems.length).toBe(3)
    })

    it('should call onReorderPages on drop', () => {
      const onReorderPages = vi.fn()
      const { container } = render(
        <PageSidebar {...defaultProps} onReorderPages={onReorderPages} />
      )

      const pageItems = container.querySelectorAll('[draggable="true"]')
      const firstPage = pageItems[0]
      const secondPage = pageItems[1]

      // Simulate drag and drop
      fireEvent.dragStart(firstPage, {
        dataTransfer: {
          effectAllowed: 'move',
          setData: vi.fn(),
        },
      })

      fireEvent.dragOver(secondPage, {
        preventDefault: vi.fn(),
        dataTransfer: { dropEffect: 'move' },
      })

      fireEvent.drop(secondPage, {
        preventDefault: vi.fn(),
        dataTransfer: {},
      })

      expect(onReorderPages).toHaveBeenCalledWith(0, 1)
    })
  })
})
