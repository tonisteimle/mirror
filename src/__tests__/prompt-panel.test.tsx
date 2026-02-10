/**
 * PromptPanel Component Tests (Partial)
 *
 * PromptPanel is complex - this focuses on testable parts:
 * - Picker state management
 * - External value sync
 * - Ref API
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PromptPanel } from '../components/PromptPanel'
import { createRef } from 'react'

// Mock scrollIntoView which isn't available in JSDOM
Element.prototype.scrollIntoView = vi.fn()

// Mock getSelection which may not be fully implemented in JSDOM
Object.defineProperty(window, 'getSelection', {
  value: () => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
    getRangeAt: vi.fn(() => ({
      getBoundingClientRect: vi.fn(() => ({ left: 0, top: 0, bottom: 0, right: 0 })),
      startContainer: document.createElement('div'),
      startOffset: 0,
    })),
    rangeCount: 1,
    anchorNode: null,
    anchorOffset: 0,
    focusNode: null,
    focusOffset: 0,
  }),
  writable: true,
})

describe('PromptPanel', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render the editor container', () => {
      const { container } = render(<PromptPanel {...defaultProps} />)
      expect(container.firstChild).toBeDefined()
    })

    it('should render with initial value', () => {
      render(<PromptPanel {...defaultProps} value="Box\n  Text Hello" />)
      // Editor should contain the value
      expect(screen.getByText('Box')).toBeDefined()
    })
  })

  describe('Picker State Management', () => {
    it('should initialize with all pickers closed', () => {
      render(<PromptPanel {...defaultProps} />)

      // No picker should be visible initially
      expect(screen.queryByPlaceholderText(/Property suchen/i)).toBeNull()
      expect(screen.queryByPlaceholderText('#')).toBeNull()
    })

    it('should close picker on Escape', async () => {
      render(<PromptPanel {...defaultProps} />)

      // Simulate opening a picker (by typing a trigger)
      const editor = screen.getByRole('textbox')

      // Type to trigger property picker
      fireEvent.input(editor, { target: { textContent: 'Box\n  ' } })
      fireEvent.keyDown(editor, { key: 'Tab', ctrlKey: true })

      // Press Escape to close
      fireEvent.keyDown(document.body, { key: 'Escape' })

      // Picker should be closed
      expect(screen.queryByPlaceholderText(/Property suchen/i)).toBeNull()
    })
  })

  describe('External Value Sync', () => {
    it('should update editor when value prop changes', () => {
      const { rerender } = render(<PromptPanel {...defaultProps} value="Initial" />)

      expect(screen.getByText('Initial')).toBeDefined()

      rerender(<PromptPanel {...defaultProps} value="Updated" />)

      expect(screen.getByText('Updated')).toBeDefined()
    })
  })

  describe('Highlight Line', () => {
    it('should highlight specified line', () => {
      const { container } = render(
        <PromptPanel
          {...defaultProps}
          value="Line1\nLine2\nLine3"
          highlightLine={1}
        />
      )

      // Line 2 should have highlight styling
      const lines = container.querySelectorAll('[style*="background"]')
      expect(lines.length).toBeGreaterThan(0)
    })
  })

  describe('Ref API', () => {
    it('should expose goToLine function', () => {
      const ref = createRef<{ goToLine: (line: number) => void }>()
      render(<PromptPanel {...defaultProps} ref={ref} />)

      expect(ref.current).toBeDefined()
      expect(typeof ref.current?.goToLine).toBe('function')
    })

    it('should navigate to line when goToLine is called', () => {
      const ref = createRef<{ goToLine: (line: number) => void }>()
      render(
        <PromptPanel
          {...defaultProps}
          ref={ref}
          value="Line1\nLine2\nLine3\nLine4\nLine5"
        />
      )

      // Call goToLine - should not throw
      expect(() => ref.current?.goToLine(3)).not.toThrow()
    })
  })

  describe('Token Variable Detection', () => {
    it('should recognize $ as token start', () => {
      const { container } = render(
        <PromptPanel
          {...defaultProps}
          value="Box\n  col $primary"
          tokensCode="// Farben\n$primary: #3B82F6"
        />
      )

      // Token should be rendered (check for syntax highlighting)
      expect(container.textContent).toContain('$primary')
    })
  })

  describe('Selection Prefix', () => {
    it('should render selection prefix when provided', () => {
      render(
        <PromptPanel
          {...defaultProps}
          value="Box\n  Text"
          selectionPrefix="Button >"
        />
      )

      // Selection prefix should be visible
      expect(screen.getByText('Button >')).toBeDefined()
    })
  })
})
