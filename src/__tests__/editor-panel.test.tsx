/**
 * Tests for EditorPanel component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorPanel } from '../components/EditorPanel'

// Mock PromptPanel since it has complex CodeMirror dependencies
vi.mock('../components/PromptPanel', () => ({
  PromptPanel: vi.fn(({ value, onChange }) => (
    <textarea
      data-testid="mock-prompt-panel"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )),
}))

describe('EditorPanel', () => {
  const defaultProps = {
    width: 420,
    activeTab: 'layout' as const,
    onTabChange: vi.fn(),
    layoutCode: 'Box',
    componentsCode: 'Button: col #3B82F6',
    tokensCode: '$primary: #3B82F6',
    onLayoutChange: vi.fn(),
    onComponentsChange: vi.fn(),
    onTokensChange: vi.fn(),
    highlightLine: undefined,
    autoCompleteMode: 'always' as const,
    onOpenAiAssistant: vi.fn(),
    onClear: vi.fn(),
    onClean: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Tab Rendering', () => {
    it('should render Page tab', () => {
      render(<EditorPanel {...defaultProps} />)
      expect(screen.getByText('Page')).toBeDefined()
    })

    it('should render Components tab', () => {
      render(<EditorPanel {...defaultProps} />)
      expect(screen.getByText('Components')).toBeDefined()
    })

    it('should render Tokens tab', () => {
      render(<EditorPanel {...defaultProps} />)
      expect(screen.getByText('Tokens')).toBeDefined()
    })

    it('should render Clear button', () => {
      render(<EditorPanel {...defaultProps} />)
      expect(screen.getByTitle('Clear')).toBeDefined()
    })

    it('should render Extract button', () => {
      render(<EditorPanel {...defaultProps} />)
      expect(screen.getByTitle('Extract')).toBeDefined()
    })
  })

  describe('Tab Selection', () => {
    it('should call onTabChange when Page tab clicked', () => {
      render(<EditorPanel {...defaultProps} activeTab="components" />)
      fireEvent.click(screen.getByText('Page'))
      expect(defaultProps.onTabChange).toHaveBeenCalledWith('layout')
    })

    it('should call onTabChange when Components tab clicked', () => {
      render(<EditorPanel {...defaultProps} activeTab="layout" />)
      fireEvent.click(screen.getByText('Components'))
      expect(defaultProps.onTabChange).toHaveBeenCalledWith('components')
    })

    it('should call onTabChange when Tokens tab clicked', () => {
      render(<EditorPanel {...defaultProps} activeTab="layout" />)
      fireEvent.click(screen.getByText('Tokens'))
      expect(defaultProps.onTabChange).toHaveBeenCalledWith('tokens')
    })
  })

  describe('Action Buttons', () => {
    it('should call onClear when Clear button clicked', () => {
      render(<EditorPanel {...defaultProps} />)
      fireEvent.click(screen.getByTitle('Clear'))
      expect(defaultProps.onClear).toHaveBeenCalledTimes(1)
    })

    it('should call onClean when Extract button clicked', () => {
      render(<EditorPanel {...defaultProps} />)
      fireEvent.click(screen.getByTitle('Extract'))
      expect(defaultProps.onClean).toHaveBeenCalledTimes(1)
    })
  })

  describe('Editor Content', () => {
    it('should pass layoutCode to editor when layout tab active', () => {
      render(<EditorPanel {...defaultProps} activeTab="layout" />)
      const editor = screen.getByTestId('mock-prompt-panel') as HTMLTextAreaElement
      expect(editor.value).toBe('Box')
    })

    it('should pass componentsCode to editor when components tab active', () => {
      render(<EditorPanel {...defaultProps} activeTab="components" />)
      const editor = screen.getByTestId('mock-prompt-panel') as HTMLTextAreaElement
      expect(editor.value).toBe('Button: col #3B82F6')
    })

    it('should pass tokensCode to editor when tokens tab active', () => {
      render(<EditorPanel {...defaultProps} activeTab="tokens" />)
      const editor = screen.getByTestId('mock-prompt-panel') as HTMLTextAreaElement
      expect(editor.value).toBe('$primary: #3B82F6')
    })

    it('should call correct onChange when editor content changes', () => {
      render(<EditorPanel {...defaultProps} activeTab="layout" />)
      const editor = screen.getByTestId('mock-prompt-panel')
      fireEvent.change(editor, { target: { value: 'NewBox' } })
      expect(defaultProps.onLayoutChange).toHaveBeenCalledWith('NewBox')
    })
  })

  describe('Width', () => {
    it('should apply width from props', () => {
      const { container } = render(<EditorPanel {...defaultProps} width={500} />)
      const panel = container.firstChild as HTMLElement
      expect(panel.style.width).toBe('500px')
    })
  })
})
