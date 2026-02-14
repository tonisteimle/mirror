/**
 * HeaderBar Component Tests
 *
 * Tests for the header bar with dropdown menu.
 */
import {
  componentTest,
  headerBarProps,
  screen,
  fireEvent,
  describe,
  it,
  expect,
  vi,
} from './kit'
import { HeaderBar } from '../components/HeaderBar'

const test = componentTest(HeaderBar, headerBarProps)

describe('HeaderBar', () => {
  // ===========================================
  // Rendering Tests
  // ===========================================

  it('renders logo', () => {
    test.render()
    expect(screen.getByAltText('mirror')).toBeDefined()
  })

  it('renders docs mode button when onToggleDocsMode is provided', () => {
    test.render({ onToggleDocsMode: vi.fn() })
    expect(screen.getByTitle('Dokumentation')).toBeDefined()
  })

  it('renders menu button', () => {
    test.render()
    expect(screen.getByTitle('Menu')).toBeDefined()
  })

  // ===========================================
  // Menu Interaction Tests
  // ===========================================

  describe('Menu Interactions', () => {
    it('opens menu on click', () => {
      test.render()
      const menuBtn = screen.getByTitle('Menu')
      fireEvent.click(menuBtn)

      expect(screen.getByText('New')).toBeDefined()
      expect(screen.getByText('Open')).toBeDefined()
      expect(screen.getByText('Save')).toBeDefined()
      expect(screen.getByText('Export')).toBeDefined()
      expect(screen.getByText('Settings')).toBeDefined()
    })

    it('calls onNewPrototype when New is clicked', () => {
      const props = headerBarProps()

      test.render(props)
      fireEvent.click(screen.getByTitle('Menu'))
      fireEvent.click(screen.getByText('New'))

      expect(props.onNewPrototype).toHaveBeenCalledTimes(1)
    })

    it('calls onOpen when Open is clicked', () => {
      const props = headerBarProps()

      test.render(props)
      fireEvent.click(screen.getByTitle('Menu'))
      fireEvent.click(screen.getByText('Open'))

      expect(props.onOpen).toHaveBeenCalledTimes(1)
    })

    it('calls onSave when Save is clicked', () => {
      const props = headerBarProps()

      test.render(props)
      fireEvent.click(screen.getByTitle('Menu'))
      fireEvent.click(screen.getByText('Save'))

      expect(props.onSave).toHaveBeenCalledTimes(1)
    })

    it('calls onExport when Export is clicked', () => {
      const props = headerBarProps()

      test.render(props)
      fireEvent.click(screen.getByTitle('Menu'))
      fireEvent.click(screen.getByText('Export'))

      expect(props.onExport).toHaveBeenCalledTimes(1)
    })

    it('calls onOpenSettings when Settings is clicked', () => {
      const props = headerBarProps()

      test.render(props)
      fireEvent.click(screen.getByTitle('Menu'))
      fireEvent.click(screen.getByText('Settings'))

      expect(props.onOpenSettings).toHaveBeenCalledTimes(1)
    })

    it('closes menu after selecting an item', () => {
      test.render()
      fireEvent.click(screen.getByTitle('Menu'))
      fireEvent.click(screen.getByText('Open'))

      // Menu should be closed - queryByText returns null for missing elements
      expect(screen.queryByText('Save')).toBeNull()
    })

    it('closes menu when clicking menu button again', () => {
      test.render()
      const menuBtn = screen.getByTitle('Menu')

      // Open
      fireEvent.click(menuBtn)
      expect(screen.getByText('Open')).toBeDefined()

      // Close
      fireEvent.click(menuBtn)
      expect(screen.queryByText('Open')).toBeNull()
    })
  })

  // ===========================================
  // Documentation Mode Toggle Test
  // ===========================================

  describe('Docs Mode Toggle', () => {
    it('calls onToggleDocsMode when clicked', () => {
      const mockToggleDocsMode = vi.fn()
      test.render({ onToggleDocsMode: mockToggleDocsMode })

      fireEvent.click(screen.getByTitle('Dokumentation'))

      expect(mockToggleDocsMode).toHaveBeenCalledTimes(1)
    })
  })
})
