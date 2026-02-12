/**
 * PageSidebar Component Tests
 *
 * Using the test kit for concise, readable tests.
 */
import {
  componentTest,
  pageSidebarProps,
  screen,
  fireEvent,
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from './kit'
import { PageSidebar } from '../components/PageSidebar'

// Mock scrollIntoView which isn't available in JSDOM
Element.prototype.scrollIntoView = vi.fn()

const test = componentTest(PageSidebar, pageSidebarProps)

describe('PageSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // Rendering Tests
  // ===========================================

  test.shouldRender(['Pages', 'Home', 'About', 'Contact', '+'])

  describe('when currentPageId is page2', () => {
    it('highlights the current page', () => {
      const { container } = test.render({ currentPageId: 'page2' })
      const aboutPage = screen.getByText('About')
      expect(aboutPage.parentElement?.style.backgroundColor).toBeDefined()
    })
  })

  // ===========================================
  // Selection Tests
  // ===========================================

  describe('Selection', () => {
    test.clicking('About').calls('onSelectPage', 'page2')

    it('does not select page when editing', () => {
      const { props } = test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      fireEvent.click(screen.getByRole('textbox'))
      expect(props.onSelectPage).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // Add Page Tests
  // ===========================================

  describe('Add Page', () => {
    test.clicking('+').calls('onAddPage')
  })

  // ===========================================
  // Renaming Tests
  // ===========================================

  describe('Renaming', () => {
    it('enters edit mode on double-click', () => {
      test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      expect(screen.getByRole('textbox')).toBeDefined()
    })

    it('shows input field with current name', () => {
      test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('Home')
    })

    it('calls onRenamePage on Enter', () => {
      const { props } = test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Name' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onRenamePage).toHaveBeenCalledWith('page1', 'New Name')
    })

    it('cancels rename on Escape', () => {
      const { props } = test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'New Name' } })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(props.onRenamePage).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox')).toBeNull()
    })

    it('trims whitespace from name', () => {
      const { props } = test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '  Trimmed Name  ' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onRenamePage).toHaveBeenCalledWith('page1', 'Trimmed Name')
    })

    it('does not rename if name is empty', () => {
      const { props } = test.render()
      fireEvent.doubleClick(screen.getByText('Home'))
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: '' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(props.onRenamePage).not.toHaveBeenCalled()
    })
  })

  // ===========================================
  // Context Menu Tests
  // ===========================================

  describe('Context Menu', () => {
    it('opens on right-click', () => {
      test.render()
      fireEvent.contextMenu(screen.getByText('Home'))
      expect(screen.getByText('Rename')).toBeDefined()
    })

    it('shows rename and delete options', () => {
      test.render()
      fireEvent.contextMenu(screen.getByText('Home'))
      expect(screen.getByText('Rename')).toBeDefined()
      expect(screen.getByText('Delete')).toBeDefined()
    })

    it('starts rename from context menu', () => {
      test.render()
      fireEvent.contextMenu(screen.getByText('About'))
      fireEvent.click(screen.getByText('Rename'))
      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('About')
    })

    it('hides delete if only one page', () => {
      const singlePage = [{ id: 'page1', name: 'Home', layoutCode: 'Box' }]
      test.render({ pages: singlePage })
      fireEvent.contextMenu(screen.getByText('Home'))
      expect(screen.getByText('Rename')).toBeDefined()
      expect(screen.queryByText('Delete')).toBeNull()
    })
  })

  // ===========================================
  // Deletion Tests
  // ===========================================

  describe('Deletion', () => {
    it('calls onDeletePage when delete clicked', () => {
      const { props } = test.render()
      fireEvent.contextMenu(screen.getByText('About'))
      fireEvent.click(screen.getByText('Delete'))
      expect(props.onDeletePage).toHaveBeenCalledWith('page2')
    })

    it('shows error if page is referenced', () => {
      const onDeletePage = vi.fn(() => ['HomePage', 'ContactPage'])
      test.render({ onDeletePage })
      fireEvent.contextMenu(screen.getByText('About'))
      fireEvent.click(screen.getByText('Delete'))
      expect(screen.getByText(/Seite wird noch referenziert/)).toBeDefined()
      expect(screen.getByText(/HomePage, ContactPage/)).toBeDefined()
    })
  })

  // ===========================================
  // Drag & Drop Tests
  // ===========================================

  describe('Drag & Drop', () => {
    it('sets draggable attribute', () => {
      const { container } = test.render()
      const pageItems = container.querySelectorAll('[draggable="true"]')
      expect(pageItems.length).toBe(3)
    })

    it('calls onReorderPages on drop', () => {
      const { props, container } = test.render()
      const pageItems = container.querySelectorAll('[draggable="true"]')
      const firstPage = pageItems[0]
      const secondPage = pageItems[1]

      fireEvent.dragStart(firstPage, {
        dataTransfer: { effectAllowed: 'move', setData: vi.fn() },
      })
      fireEvent.dragOver(secondPage, {
        preventDefault: vi.fn(),
        dataTransfer: { dropEffect: 'move' },
      })
      fireEvent.drop(secondPage, {
        preventDefault: vi.fn(),
        dataTransfer: {},
      })

      expect(props.onReorderPages).toHaveBeenCalledWith(0, 1)
    })
  })
})
