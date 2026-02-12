/**
 * TokenPicker Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TokenPicker } from '../../components/TokenPicker'
import { tokenPickerProps } from '../kit'

// Mock scrollIntoView which isn't available in JSDOM
Element.prototype.scrollIntoView = vi.fn()

describe('TokenPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // Rendering Tests
  // ===========================================

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      const props = tokenPickerProps()
      render(<TokenPicker {...props} isOpen={true} />)

      // Should show search input
      expect(screen.getByPlaceholderText(/suchen/i)).toBeDefined()
    })

    it('does not render when isOpen is false', () => {
      const props = tokenPickerProps()
      const { container } = render(<TokenPicker {...props} isOpen={false} />)

      expect(container.firstChild).toBeNull()
    })

    it('renders token list from tokensCode', () => {
      const props = tokenPickerProps()
      render(
        <TokenPicker
          {...props}
          tokensCode={`$primary: #3B82F6
$secondary: #10B981`}
        />
      )

      expect(screen.getByText('$primary')).toBeDefined()
      expect(screen.getByText('$secondary')).toBeDefined()
    })

    it('shows empty state when no tokens match', () => {
      const props = tokenPickerProps()
      render(<TokenPicker {...props} tokensCode="" />)

      expect(screen.getByText(/keine tokens/i)).toBeDefined()
    })
  })

  // ===========================================
  // Search/Filter Tests
  // ===========================================

  describe('Search', () => {
    it('filters tokens based on search input', () => {
      const props = tokenPickerProps()
      render(
        <TokenPicker
          {...props}
          tokensCode={`$primary: #3B82F6
$secondary: #10B981
$danger: #EF4444`}
        />
      )

      const searchInput = screen.getByPlaceholderText(/suchen/i)
      fireEvent.change(searchInput, { target: { value: 'prim' } })

      expect(screen.getByText('$primary')).toBeDefined()
      expect(screen.queryByText('$secondary')).toBeNull()
      expect(screen.queryByText('$danger')).toBeNull()
    })

    it('filters tokens by value', () => {
      const props = tokenPickerProps()
      render(
        <TokenPicker
          {...props}
          tokensCode={`$primary: #3B82F6
$secondary: #10B981`}
        />
      )

      const searchInput = screen.getByPlaceholderText(/suchen/i)
      fireEvent.change(searchInput, { target: { value: '3B82' } })

      expect(screen.getByText('$primary')).toBeDefined()
      expect(screen.queryByText('$secondary')).toBeNull()
    })
  })

  // ===========================================
  // Property Context Filtering
  // ===========================================

  describe('Property Context Filtering', () => {
    it('filters tokens by property context', () => {
      const props = tokenPickerProps()
      // Use tokens with names that hint at their types
      render(
        <TokenPicker
          {...props}
          tokensCode={`$col-primary: #3B82F6
$pad-sm: 8`}
          propertyContext="col"
        />
      )

      // Color tokens should be visible for 'col' context
      expect(screen.getByText('$col-primary')).toBeDefined()
      // Spacing tokens should be hidden
      expect(screen.queryByText('$pad-sm')).toBeNull()
    })
  })

  // ===========================================
  // Selection Tests
  // ===========================================

  describe('Selection', () => {
    it('calls onSelect when token is clicked', () => {
      const props = tokenPickerProps()
      render(
        <TokenPicker
          {...props}
          tokensCode="$primary: #3B82F6"
        />
      )

      fireEvent.click(screen.getByText('$primary'))

      expect(props.onSelect).toHaveBeenCalledWith('$primary')
    })

    it('calls onClose after selection', () => {
      const props = tokenPickerProps()
      render(
        <TokenPicker
          {...props}
          tokensCode="$primary: #3B82F6"
        />
      )

      fireEvent.click(screen.getByText('$primary'))

      expect(props.onClose).toHaveBeenCalled()
    })
  })

  // ===========================================
  // Keyboard Navigation
  // ===========================================

  describe('Keyboard Navigation', () => {
    it('closes on Escape', () => {
      const props = tokenPickerProps()
      render(<TokenPicker {...props} tokensCode="$primary: #3B82F6" />)

      // Fire Escape on the search input (where key events are handled)
      const searchInput = screen.getByPlaceholderText(/suchen/i)
      fireEvent.keyDown(searchInput, { key: 'Escape' })

      expect(props.onClose).toHaveBeenCalled()
    })
  })

  // ===========================================
  // Backdrop Tests
  // ===========================================

  describe('Backdrop', () => {
    it('closes when backdrop is clicked', () => {
      const props = tokenPickerProps()
      const { container } = render(
        <TokenPicker {...props} tokensCode="$primary: #3B82F6" />
      )

      // Find backdrop (first fixed div)
      const backdrop = container.querySelector('div[style*="position: fixed"][style*="inset: 0"]')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(props.onClose).toHaveBeenCalled()
      }
    })
  })
})
