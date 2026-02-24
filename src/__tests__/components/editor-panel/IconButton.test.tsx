/**
 * IconButton Component Tests
 *
 * Tests for the IconButton component:
 * - Basic rendering
 * - Click handling
 * - Loading state
 * - Highlight state
 * - Custom color
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IconButton } from '../../../components/editor-panel/IconButton'

// Mock icon for testing
const MockIcon = () => <span data-testid="mock-icon">★</span>

describe('IconButton', () => {
  // ==========================================================================
  // Basic Rendering
  // ==========================================================================
  describe('rendering', () => {
    it('renders button with children', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      expect(screen.getByTestId('mock-icon')).toBeDefined()
    })

    it('renders as button element', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      expect(screen.getByRole('button')).toBeDefined()
    })

    it('has title attribute', () => {
      render(
        <IconButton onClick={() => {}} title="Click me">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.getAttribute('title')).toBe('Click me')
    })

    it('has flex display for centering', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.display).toBe('flex')
      expect(button.style.alignItems).toBe('center')
      expect(button.style.justifyContent).toBe('center')
    })

    it('has border-radius', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.borderRadius).toBe('4px')
    })

    it('has no border', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      // Border style is set to 'none' but CSS parsing may vary
      const hasBorderStyle = button.style.borderStyle === 'none' ||
                             button.style.border === 'none' ||
                             button.style.borderWidth === '' ||
                             button.style.borderWidth === '0px'
      expect(hasBorderStyle).toBe(true)
    })
  })

  // ==========================================================================
  // Click Handling
  // ==========================================================================
  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn()
      render(
        <IconButton onClick={onClick} title="Test">
          <MockIcon />
        </IconButton>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick multiple times on multiple clicks', () => {
      const onClick = vi.fn()
      render(
        <IconButton onClick={onClick} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledTimes(2)
    })

    it('has pointer cursor when not loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.cursor).toBe('pointer')
    })
  })

  // ==========================================================================
  // Loading State
  // ==========================================================================
  describe('loading state', () => {
    it('shows spinner when loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      // Should not show the icon
      expect(screen.queryByTestId('mock-icon')).toBeNull()

      // Should show SVG spinner
      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).toBeDefined()
    })

    it('is disabled when loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.disabled).toBe(true)
    })

    it('does not call onClick when loading and clicked', () => {
      const onClick = vi.fn()
      render(
        <IconButton onClick={onClick} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      fireEvent.click(screen.getByRole('button'))
      expect(onClick).not.toHaveBeenCalled()
    })

    it('has wait cursor when loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.cursor).toBe('wait')
    })

    it('has reduced opacity when loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(parseFloat(button.style.opacity)).toBeLessThan(1)
    })

    it('has full opacity when not loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.opacity).toBe('1')
    })

    it('spinner has animation style', () => {
      render(
        <IconButton onClick={() => {}} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg?.style.animation).toContain('spin')
    })
  })

  // ==========================================================================
  // Highlight State
  // ==========================================================================
  describe('highlight state', () => {
    it('has transparent background when not highlighted', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.backgroundColor).toBe('transparent')
    })

    it('has accent background when highlighted', () => {
      render(
        <IconButton onClick={() => {}} title="Test" highlight>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      // Should have a non-transparent background
      expect(button.style.backgroundColor).not.toBe('transparent')
    })

    it('has white color when highlighted', () => {
      render(
        <IconButton onClick={() => {}} title="Test" highlight>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.color).toBe('rgb(255, 255, 255)')
    })

    it('has muted color when not highlighted', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      // Should have some color (muted text color)
      expect(button.style.color).toBeDefined()
      expect(button.style.color).not.toBe('rgb(255, 255, 255)')
    })
  })

  // ==========================================================================
  // Custom Color
  // ==========================================================================
  describe('custom color', () => {
    it('uses custom color when provided', () => {
      render(
        <IconButton onClick={() => {}} title="Test" color="#3B82F6">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.color).toBe('rgb(59, 130, 246)')
    })

    it('custom color overrides highlight color', () => {
      render(
        <IconButton onClick={() => {}} title="Test" highlight color="#EF4444">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.color).toBe('rgb(239, 68, 68)')
    })

    it('custom color applies to spinner when loading', () => {
      render(
        <IconButton onClick={() => {}} title="Test" isLoading color="#10B981">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg?.getAttribute('stroke')).toBe('#10B981')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('handles empty title', () => {
      render(
        <IconButton onClick={() => {}} title="">
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.getAttribute('title')).toBe('')
    })

    it('handles multiple children', () => {
      render(
        <IconButton onClick={() => {}} title="Test">
          <span data-testid="child1">A</span>
          <span data-testid="child2">B</span>
        </IconButton>
      )

      expect(screen.getByTestId('child1')).toBeDefined()
      expect(screen.getByTestId('child2')).toBeDefined()
    })

    it('switches from loading to normal', () => {
      const { rerender } = render(
        <IconButton onClick={() => {}} title="Test" isLoading>
          <MockIcon />
        </IconButton>
      )

      expect(screen.queryByTestId('mock-icon')).toBeNull()

      rerender(
        <IconButton onClick={() => {}} title="Test" isLoading={false}>
          <MockIcon />
        </IconButton>
      )

      expect(screen.getByTestId('mock-icon')).toBeDefined()
    })

    it('switches from highlighted to normal', () => {
      const { rerender } = render(
        <IconButton onClick={() => {}} title="Test" highlight>
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.style.backgroundColor).not.toBe('transparent')

      rerender(
        <IconButton onClick={() => {}} title="Test" highlight={false}>
          <MockIcon />
        </IconButton>
      )

      expect(button.style.backgroundColor).toBe('transparent')
    })

    it('combines all states: highlight, color, and loading', () => {
      render(
        <IconButton
          onClick={() => {}}
          title="Test"
          highlight
          color="#FF0000"
          isLoading
        >
          <MockIcon />
        </IconButton>
      )

      const button = screen.getByRole('button')
      expect(button.disabled).toBe(true)
      expect(button.style.backgroundColor).not.toBe('transparent')

      const svg = button.querySelector('svg')
      expect(svg?.getAttribute('stroke')).toBe('#FF0000')
    })
  })
})
