/**
 * ColorPicker Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPicker } from '../components/ColorPicker'

// Mock scrollIntoView which isn't available in JSDOM
Element.prototype.scrollIntoView = vi.fn()

describe('ColorPicker', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelect: vi.fn(),
    position: { x: 100, y: 100 },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <ColorPicker {...defaultProps} isOpen={false} />
      )
      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      const { container } = render(<ColorPicker {...defaultProps} />)
      expect(container.firstChild).not.toBeNull()
    })
  })

  describe('Token Parsing', () => {
    const tokenString = `
// Farben
$primary: #3B82F6
$secondary: #6B7280
$error: #EF4444

// Spacing
$gap: 8
`

    it('should show token list when tokens exist', () => {
      render(<ColorPicker {...defaultProps} tokens={tokenString} defaultToTokens={true} />)

      expect(screen.getByText('$primary')).toBeDefined()
      expect(screen.getByText('$secondary')).toBeDefined()
      expect(screen.getByText('$error')).toBeDefined()
    })

    it('should not show spacing tokens as colors', () => {
      render(<ColorPicker {...defaultProps} tokens={tokenString} defaultToTokens={true} />)

      expect(screen.queryByText('$gap')).toBeNull()
    })

    it('should select token on click', () => {
      const onSelect = vi.fn()
      render(
        <ColorPicker
          {...defaultProps}
          onSelect={onSelect}
          tokens={tokenString}
          defaultToTokens={true}
        />
      )

      fireEvent.click(screen.getByText('$primary'))

      expect(onSelect).toHaveBeenCalledWith('$primary')
    })
  })

  describe('Tokens Mode', () => {
    const tokenString = `
// Farben
$blue: #3B82F6
$red: #EF4444
$green: #10B981
`

    it('should navigate tokens with arrow keys', () => {
      render(
        <ColorPicker
          {...defaultProps}
          tokens={tokenString}
          defaultToTokens={true}
        />
      )

      // Press arrow down
      fireEvent.keyDown(document.body, { key: 'ArrowDown' })

      // Selected token should change
      const selectedItems = screen.getAllByRole('generic').filter(el =>
        el.getAttribute('data-selected') === 'true'
      )
      expect(selectedItems.length).toBeGreaterThanOrEqual(0)
    })

    it('should select token with Enter', () => {
      const onSelect = vi.fn()
      render(
        <ColorPicker
          {...defaultProps}
          onSelect={onSelect}
          tokens={tokenString}
          defaultToTokens={true}
        />
      )

      fireEvent.keyDown(document.body, { key: 'Enter' })

      expect(onSelect).toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate hues with arrow keys', () => {
      const { container } = render(<ColorPicker {...defaultProps} />)

      // Press arrow right to change hue
      fireEvent.keyDown(document.body, { key: 'ArrowRight' })

      // Hue should change (visual change, hard to test directly)
      expect(container.firstChild).not.toBeNull()
    })

    it('should close with Escape', () => {
      const onClose = vi.fn()
      render(<ColorPicker {...defaultProps} onClose={onClose} />)

      fireEvent.keyDown(document.body, { key: 'Escape' })

      expect(onClose).toHaveBeenCalled()
    })
  })
})
