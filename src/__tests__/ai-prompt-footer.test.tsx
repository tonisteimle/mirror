/**
 * AI Prompt Footer Tests
 *
 * Tests the permanent AI prompt input at the bottom of EditorPanel.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditorPanel } from '../components/EditorPanel'
import { EditorActionsContext } from '../contexts'

// Mock LazyPromptPanel
vi.mock('../components/LazyPromptPanel', () => ({
  LazyPromptPanel: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// Mock AI library
const mockHasApiKey = vi.fn()
const mockGenerateWithCodeIntelligence = vi.fn()

vi.mock('../lib/ai', () => ({
  hasApiKey: () => mockHasApiKey(),
  generateWithCodeIntelligence: (prompt: string, options?: unknown) => mockGenerateWithCodeIntelligence(prompt, options),
}))

// Default props
const defaultProps = {
  width: 400,
  activeTab: 'layout' as const,
  onTabChange: vi.fn(),
  layoutCode: 'Box',
  componentsCode: 'Button: col #3B82F6',
  tokensCode: '$primary: #3B82F6',
  onLayoutChange: vi.fn(),
  onComponentsChange: vi.fn(),
  onTokensChange: vi.fn(),
  autoCompleteMode: 'always' as const,
}

// Context mock - only onClear is used now
const contextValue = {
  onClear: vi.fn(),
}

function renderEditorPanel(props = {}) {
  return render(
    <EditorActionsContext.Provider value={contextValue}>
      <EditorPanel {...defaultProps} {...props} />
    </EditorActionsContext.Provider>
  )
}

describe('AI Prompt Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // Visibility Tests
  // ===========================================

  describe('Visibility', () => {
    it('shows AI prompt when API key is set', () => {
      mockHasApiKey.mockReturnValue(true)
      renderEditorPanel()

      const input = screen.queryByPlaceholderText('Was soll ich erstellen?')
      expect(input).toBeTruthy()
    })

    it('hides AI prompt when no API key', () => {
      mockHasApiKey.mockReturnValue(false)
      renderEditorPanel()

      const input = screen.queryByPlaceholderText('Was soll ich erstellen?')
      expect(input).toBeNull()
    })
  })

  // ===========================================
  // Input Behavior Tests
  // ===========================================

  describe('Input Behavior', () => {
    beforeEach(() => {
      mockHasApiKey.mockReturnValue(true)
    })

    it('allows typing in the prompt field', () => {
      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Create a login form' } })

      expect(input.value).toBe('Create a login form')
    })

    it('clears input after successful generation', async () => {
      mockGenerateWithCodeIntelligence.mockResolvedValue({
        code: 'LoginForm ver pad 16',
      })

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Create a login form' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(input.value).toBe('')
      })
    })
  })

  // ===========================================
  // Generation Tests
  // ===========================================

  describe('Generation', () => {
    beforeEach(() => {
      mockHasApiKey.mockReturnValue(true)
    })

    it('calls generateWithCodeIntelligence on Enter', async () => {
      mockGenerateWithCodeIntelligence.mockResolvedValue({
        code: 'Box ver gap 16',
      })

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.change(input, { target: { value: 'Create a box' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockGenerateWithCodeIntelligence).toHaveBeenCalledWith(
          'Create a box',
          expect.objectContaining({
            sourceCode: expect.any(String),
          })
        )
      })
    })

    it('does not call API with empty prompt', () => {
      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockGenerateWithCodeIntelligence).not.toHaveBeenCalled()
    })

    it('appends generated code to existing content', async () => {
      mockGenerateWithCodeIntelligence.mockResolvedValue({
        code: 'Card ver pad 16',
      })

      const onLayoutChange = vi.fn()
      renderEditorPanel({ layoutCode: 'Box', onLayoutChange })

      const input = screen.getByPlaceholderText('Was soll ich erstellen?')
      fireEvent.change(input, { target: { value: 'Add a card' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(onLayoutChange).toHaveBeenCalledWith('Box\n\nCard ver pad 16')
      })
    })

    it('sets code directly when editor is empty', async () => {
      mockGenerateWithCodeIntelligence.mockResolvedValue({
        code: 'Dashboard ver gap 24',
      })

      const onLayoutChange = vi.fn()
      renderEditorPanel({ layoutCode: '', onLayoutChange })

      const input = screen.getByPlaceholderText('Was soll ich erstellen?')
      fireEvent.change(input, { target: { value: 'Create dashboard' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(onLayoutChange).toHaveBeenCalledWith('Dashboard ver gap 24')
      })
    })
  })

  // ===========================================
  // Loading State Tests
  // ===========================================

  describe('Loading State', () => {
    beforeEach(() => {
      mockHasApiKey.mockReturnValue(true)
    })

    it('disables input while generating', async () => {
      let resolvePromise: (value: unknown) => void
      mockGenerateWithCodeIntelligence.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve
      }))

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?') as HTMLInputElement

      fireEvent.change(input, { target: { value: 'Create form' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(input.disabled).toBe(true)
      })

      // Resolve the promise
      resolvePromise!({ code: 'Form ver pad 16' })

      await waitFor(() => {
        expect(input.disabled).toBe(false)
      })
    })
  })
})
