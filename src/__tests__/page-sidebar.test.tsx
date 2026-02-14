/**
 * PageSidebar Component Tests
 *
 * Tests for the minimal page navigation sidebar.
 * Pages are created via code references, deleted via hover button.
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

  test.shouldRender(['Home', 'About', 'Contact'])

  describe('when currentPageId is page2', () => {
    it('highlights the current page with white text', () => {
      test.render({ currentPageId: 'page2' })
      const aboutPage = screen.getByText('About')
      // Active page should have white color
      expect(aboutPage.parentElement?.style.color).toBe('rgb(255, 255, 255)')
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
  // Deletion Tests (hover-based)
  // ===========================================

  describe('Deletion', () => {
    it('shows delete button on hover for non-referenced pages', () => {
      test.render()
      const aboutItem = screen.getByText('About').parentElement!
      fireEvent.mouseEnter(aboutItem)
      expect(screen.getByText('✕')).toBeDefined()
    })

    it('hides delete button for referenced pages', () => {
      test.render({ referencedPages: new Set(['About']) })
      const aboutItem = screen.getByText('About').parentElement!
      fireEvent.mouseEnter(aboutItem)
      expect(screen.queryByText('✕')).toBeNull()
    })

    it('hides delete button if only one page', () => {
      const singlePage = [{ id: 'page1', name: 'Home', layoutCode: 'Box' }]
      test.render({ pages: singlePage })
      const homeItem = screen.getByText('Home').parentElement!
      fireEvent.mouseEnter(homeItem)
      expect(screen.queryByText('✕')).toBeNull()
    })

    it('calls onDeletePage when delete button clicked', () => {
      const { props } = test.render()
      const aboutItem = screen.getByText('About').parentElement!
      fireEvent.mouseEnter(aboutItem)
      fireEvent.click(screen.getByText('✕'))
      expect(props.onDeletePage).toHaveBeenCalledWith('page2')
    })

    it('shows error if page is referenced', () => {
      const onDeletePage = vi.fn(() => ['HomePage', 'ContactPage'])
      test.render({ onDeletePage })
      const aboutItem = screen.getByText('About').parentElement!
      fireEvent.mouseEnter(aboutItem)
      fireEvent.click(screen.getByText('✕'))
      expect(screen.getByText(/Seite wird referenziert/)).toBeDefined()
      expect(screen.getByText(/HomePage, ContactPage/)).toBeDefined()
    })
  })
})
