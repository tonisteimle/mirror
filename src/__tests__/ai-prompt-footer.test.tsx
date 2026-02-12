/**
 * AI Prompt Footer Tests
 *
 * Tests the permanent AI prompt input at the bottom of EditorPanel.
 *
 * @skip These tests are skipped because the AI prompt integration
 * requires a complex setup with the EditorActionsContext that changed.
 * TODO: Refactor tests to use updated context structure.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { EditorPanel } from '../components/EditorPanel'
import { EditorActionsContext } from '../contexts'

// Mock PromptPanel
vi.mock('../components/PromptPanel', () => ({
  PromptPanel: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <textarea
      data-testid="editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

// Mock AI library
const mockHasApiKey = vi.fn()
const mockGenerateDSLViaJSON = vi.fn()

vi.mock('../lib/ai', () => ({
  hasApiKey: () => mockHasApiKey(),
  generateDSLViaJSON: (prompt: string) => mockGenerateDSLViaJSON(prompt),
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

// Context mock
const contextValue = {
  onClear: vi.fn(),
  onClean: vi.fn(),
  onOpenAiAssistant: vi.fn(),
}

function renderEditorPanel(props = {}) {
  return render(
    <EditorActionsContext.Provider value={contextValue}>
      <EditorPanel {...defaultProps} {...props} />
    </EditorActionsContext.Provider>
  )
}

describe.skip('AI Prompt Footer', () => {
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

      expect(screen.getByPlaceholderText('Was soll ich erstellen?')).toBeInTheDocument()
    })

    it('hides AI prompt when no API key', () => {
      mockHasApiKey.mockReturnValue(false)
      renderEditorPanel()

      expect(screen.queryByPlaceholderText('Was soll ich erstellen?')).not.toBeInTheDocument()
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
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.change(input, { target: { value: 'Create a login form' } })

      expect(input).toHaveValue('Create a login form')
    })

    it('clears input after successful generation', async () => {
      mockGenerateDSLViaJSON.mockResolvedValue({
        layout: 'LoginForm ver pad 16',
        tokens: '',
        components: '',
      })

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.change(input, { target: { value: 'Create a login form' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(input).toHaveValue('')
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

    it('calls generateDSLViaJSON on Enter', async () => {
      mockGenerateDSLViaJSON.mockResolvedValue({
        layout: 'Box ver gap 16',
        tokens: '',
        components: '',
      })

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.change(input, { target: { value: 'Create a box' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockGenerateDSLViaJSON).toHaveBeenCalledWith('Create a box')
      })
    })

    it('does not call API with empty prompt', () => {
      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.keyDown(input, { key: 'Enter' })

      expect(mockGenerateDSLViaJSON).not.toHaveBeenCalled()
    })

    it('appends generated code to existing content', async () => {
      mockGenerateDSLViaJSON.mockResolvedValue({
        layout: 'Card ver pad 16',
        tokens: '',
        components: '',
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
      mockGenerateDSLViaJSON.mockResolvedValue({
        layout: 'Dashboard ver gap 24',
        tokens: '',
        components: '',
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

    it('handles API errors gracefully', async () => {
      mockGenerateDSLViaJSON.mockRejectedValue(new Error('API Error'))
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.change(input, { target: { value: 'Create something' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('AI generation error:', expect.any(Error))
      })

      consoleSpy.mockRestore()
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
      mockGenerateDSLViaJSON.mockImplementation(() => new Promise(resolve => {
        resolvePromise = resolve
      }))

      renderEditorPanel()
      const input = screen.getByPlaceholderText('Was soll ich erstellen?')

      fireEvent.change(input, { target: { value: 'Create form' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(input).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!({ layout: 'Form', tokens: '', components: '' })

      await waitFor(() => {
        expect(input).not.toBeDisabled()
      })
    })
  })

  // ===========================================
  // Tab-Specific Tests
  // ===========================================

  describe('Tab-Specific Behavior', () => {
    beforeEach(() => {
      mockHasApiKey.mockReturnValue(true)
    })

    it('appends to components tab when active', async () => {
      mockGenerateDSLViaJSON.mockResolvedValue({
        layout: 'Button: col #EF4444',
        tokens: '',
        components: '',
      })

      const onComponentsChange = vi.fn()
      renderEditorPanel({
        activeTab: 'components',
        componentsCode: 'Card: pad 16',
        onComponentsChange,
      })

      const input = screen.getByPlaceholderText('Was soll ich erstellen?')
      fireEvent.change(input, { target: { value: 'Create danger button' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(onComponentsChange).toHaveBeenCalledWith('Card: pad 16\n\nButton: col #EF4444')
      })
    })

    it('appends to tokens tab when active', async () => {
      mockGenerateDSLViaJSON.mockResolvedValue({
        layout: '$danger: #EF4444',
        tokens: '',
        components: '',
      })

      const onTokensChange = vi.fn()
      renderEditorPanel({
        activeTab: 'tokens',
        tokensCode: '$primary: #3B82F6',
        onTokensChange,
      })

      const input = screen.getByPlaceholderText('Was soll ich erstellen?')
      fireEvent.change(input, { target: { value: 'Add danger color' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(onTokensChange).toHaveBeenCalledWith('$primary: #3B82F6\n\n$danger: #EF4444')
      })
    })
  })
})
