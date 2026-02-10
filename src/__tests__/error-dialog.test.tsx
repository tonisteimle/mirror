/**
 * Error Dialog Tests
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorDialog } from '../components/ErrorDialog'

describe('ErrorDialog', () => {
  it('should not render when isOpen is false', () => {
    render(
      <ErrorDialog
        isOpen={false}
        message="Test error"
        onClose={() => {}}
      />
    )

    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('should render when isOpen is true', () => {
    render(
      <ErrorDialog
        isOpen={true}
        message="Test error message"
        onClose={() => {}}
      />
    )

    expect(screen.getByRole('alertdialog')).toBeDefined()
    expect(screen.getByText('Fehler')).toBeDefined()
    expect(screen.getByText('Test error message')).toBeDefined()
  })

  it('should display custom title', () => {
    render(
      <ErrorDialog
        isOpen={true}
        title="Custom Error Title"
        message="Test message"
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Custom Error Title')).toBeDefined()
  })

  it('should display details when provided', () => {
    render(
      <ErrorDialog
        isOpen={true}
        message="Test message"
        details="Stack trace here"
        onClose={() => {}}
      />
    )

    expect(screen.getByText('Details anzeigen')).toBeDefined()
    expect(screen.getByText('Stack trace here')).toBeDefined()
  })

  it('should call onClose when OK button is clicked', () => {
    const onClose = vi.fn()

    render(
      <ErrorDialog
        isOpen={true}
        message="Test message"
        onClose={onClose}
      />
    )

    fireEvent.click(screen.getByText('OK'))
    expect(onClose).toHaveBeenCalled()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn()

    const { container } = render(
      <ErrorDialog
        isOpen={true}
        message="Test message"
        onClose={onClose}
      />
    )

    // Find and click the backdrop (first child div)
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
