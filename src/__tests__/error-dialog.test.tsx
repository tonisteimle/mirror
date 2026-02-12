/**
 * ErrorDialog Component Tests
 *
 * Using the test kit for concise, readable tests.
 */
import {
  componentTest,
  errorDialogProps,
  screen,
  fireEvent,
  describe,
  it,
  expect,
} from './kit'
import { ErrorDialog } from '../components/ErrorDialog'

const test = componentTest(ErrorDialog, errorDialogProps)

describe('ErrorDialog', () => {
  // ===========================================
  // Visibility Tests
  // ===========================================

  test.whenNotRendered({ isOpen: false }).describe('should not render when isOpen is false')

  describe('when open', () => {
    it('renders dialog with default title', () => {
      test.render({ isOpen: true })
      expect(screen.getByRole('alertdialog')).toBeDefined()
      expect(screen.getByText('Fehler')).toBeDefined()
    })

    it('renders message', () => {
      test.render({ isOpen: true, message: 'Something went wrong' })
      expect(screen.getByText('Something went wrong')).toBeDefined()
    })

    it('renders custom title', () => {
      test.render({ isOpen: true, title: 'Custom Error Title' })
      expect(screen.getByText('Custom Error Title')).toBeDefined()
    })

    it('renders details when provided', () => {
      test.render({ isOpen: true, details: 'Stack trace here' })
      expect(screen.getByText('Details anzeigen')).toBeDefined()
      expect(screen.getByText('Stack trace here')).toBeDefined()
    })
  })

  // ===========================================
  // Interaction Tests
  // ===========================================

  describe('interactions', () => {
    it('calls onClose when OK button clicked', () => {
      const { props } = test.render({ isOpen: true })
      fireEvent.click(screen.getByText('OK'))
      expect(props.onClose).toHaveBeenCalled()
    })

    it('calls onClose when backdrop clicked', () => {
      const { props, container } = test.render({ isOpen: true })
      const backdrop = container.firstChild as HTMLElement
      fireEvent.click(backdrop)
      expect(props.onClose).toHaveBeenCalled()
    })
  })
})
