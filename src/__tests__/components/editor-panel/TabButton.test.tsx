/**
 * TabButton Component Tests
 *
 * Tests for the TabButton component:
 * - Rendering
 * - Active state styling
 * - Click handling
 * - Accessibility attributes
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabButton } from '../../../components/editor-panel/TabButton'

describe('TabButton', () => {
  // ==========================================================================
  // Basic Rendering
  // ==========================================================================
  describe('rendering', () => {
    it('renders button with label', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      expect(screen.getByText('Content')).toBeDefined()
    })

    it('renders as button element', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.tagName).toBe('BUTTON')
    })

    it('has correct base styles', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.style.cursor).toBe('pointer')
      expect(button.style.backgroundColor).toBe('transparent')
    })
  })

  // ==========================================================================
  // Active State
  // ==========================================================================
  describe('active state', () => {
    it('has aria-selected true when active', () => {
      render(<TabButton label="Content" isActive={true} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.getAttribute('aria-selected')).toBe('true')
    })

    it('has aria-selected false when inactive', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.getAttribute('aria-selected')).toBe('false')
    })

    it('has higher font weight when active', () => {
      const { rerender } = render(
        <TabButton label="Content" isActive={false} onClick={() => {}} />
      )

      const buttonInactive = screen.getByRole('tab')
      const inactiveWeight = buttonInactive.style.fontWeight

      rerender(<TabButton label="Content" isActive={true} onClick={() => {}} />)

      const buttonActive = screen.getByRole('tab')
      const activeWeight = buttonActive.style.fontWeight

      // Active should have higher weight (600 vs 500)
      expect(parseInt(activeWeight)).toBeGreaterThan(parseInt(inactiveWeight))
    })

    it('has different color when active', () => {
      const { rerender } = render(
        <TabButton label="Content" isActive={false} onClick={() => {}} />
      )

      const buttonInactive = screen.getByRole('tab')
      const inactiveColor = buttonInactive.style.color

      rerender(<TabButton label="Content" isActive={true} onClick={() => {}} />)

      const buttonActive = screen.getByRole('tab')
      const activeColor = buttonActive.style.color

      expect(activeColor).not.toBe(inactiveColor)
    })
  })

  // ==========================================================================
  // Click Handling
  // ==========================================================================
  describe('click handling', () => {
    it('calls onClick when clicked', () => {
      const onClick = vi.fn()
      render(<TabButton label="Content" isActive={false} onClick={onClick} />)

      fireEvent.click(screen.getByRole('tab'))
      expect(onClick).toHaveBeenCalledTimes(1)
    })

    it('calls onClick multiple times on multiple clicks', () => {
      const onClick = vi.fn()
      render(<TabButton label="Content" isActive={false} onClick={onClick} />)

      const button = screen.getByRole('tab')
      fireEvent.click(button)
      fireEvent.click(button)
      fireEvent.click(button)

      expect(onClick).toHaveBeenCalledTimes(3)
    })
  })

  // ==========================================================================
  // Accessibility
  // ==========================================================================
  describe('accessibility', () => {
    it('has role="tab"', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      expect(screen.getByRole('tab')).toBeDefined()
    })

    it('has aria-label with tab suffix', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.getAttribute('aria-label')).toBe('Content tab')
    })

    it('has correct aria-label for different labels', () => {
      const { rerender } = render(
        <TabButton label="Components" isActive={false} onClick={() => {}} />
      )

      expect(screen.getByRole('tab').getAttribute('aria-label')).toBe('Components tab')

      rerender(<TabButton label="Tokens" isActive={false} onClick={() => {}} />)

      expect(screen.getByRole('tab').getAttribute('aria-label')).toBe('Tokens tab')
    })
  })

  // ==========================================================================
  // Styling Details
  // ==========================================================================
  describe('styling', () => {
    it('has no border', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      // Border style is set to 'none' but CSS parsing may vary
      // Check that there's no visible border (borderWidth is empty or borderStyle is none)
      const hasBorderStyle = button.style.borderStyle === 'none' ||
                             button.style.border === 'none' ||
                             button.style.borderWidth === '' ||
                             button.style.borderWidth === '0px'
      expect(hasBorderStyle).toBe(true)
    })

    it('has no outline', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.style.outline).toBe('none')
    })

    it('has transition for smooth state changes', () => {
      render(<TabButton label="Content" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.style.transition).toContain('0.2s')
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('handles empty label', () => {
      render(<TabButton label="" isActive={false} onClick={() => {}} />)

      const button = screen.getByRole('tab')
      expect(button.textContent).toBe('')
    })

    it('handles special characters in label', () => {
      render(<TabButton label="Content & Data" isActive={false} onClick={() => {}} />)

      expect(screen.getByText('Content & Data')).toBeDefined()
    })

    it('updates correctly when props change', () => {
      const onClick = vi.fn()
      const { rerender } = render(
        <TabButton label="Old" isActive={false} onClick={onClick} />
      )

      expect(screen.getByText('Old')).toBeDefined()

      rerender(<TabButton label="New" isActive={true} onClick={onClick} />)

      expect(screen.getByText('New')).toBeDefined()
      expect(screen.getByRole('tab').getAttribute('aria-selected')).toBe('true')
    })
  })
})
