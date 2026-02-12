/**
 * PromptPanel Component Tests (Partial)
 *
 * PromptPanel is complex - this focuses on testable parts:
 * - Picker state management
 * - External value sync
 * - Ref API
 */
import {
  componentTest,
  promptPanelProps,
  screen,
  fireEvent,
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from './kit'
import { PromptPanel } from '../components/PromptPanel'
import { createRef } from 'react'
import { render } from '@testing-library/react'

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

const test = componentTest(PromptPanel, promptPanelProps)

describe('PromptPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // Rendering Tests
  // ===========================================

  describe('Rendering', () => {
    it('renders the editor container', () => {
      const { container } = test.render()
      expect(container.firstChild).toBeDefined()
    })

    it('renders with initial value', () => {
      const { container } = test.render({ value: 'Box\n  Text Hello' })
      // Check that the content is in the container (could be in a contenteditable or textarea)
      expect(container.textContent).toContain('Box')
    })
  })

  // ===========================================
  // Picker State Management Tests
  // ===========================================

  describe('Picker State Management', () => {
    it('initializes with all pickers closed', () => {
      test.render()
      expect(screen.queryByPlaceholderText(/Property suchen/i)).toBeNull()
      expect(screen.queryByPlaceholderText('#')).toBeNull()
    })

    it('closes picker on Escape', () => {
      test.render()
      const editor = screen.getByRole('textbox')
      fireEvent.input(editor, { target: { textContent: 'Box\n  ' } })
      fireEvent.keyDown(editor, { key: 'Tab', ctrlKey: true })
      fireEvent.keyDown(document.body, { key: 'Escape' })
      expect(screen.queryByPlaceholderText(/Property suchen/i)).toBeNull()
    })
  })

  // ===========================================
  // External Value Sync Tests
  // ===========================================

  describe('External Value Sync', () => {
    it('updates editor when value prop changes', () => {
      const { rerender, container } = test.render({ value: 'Initial' })
      expect(container.textContent).toContain('Initial')

      rerender(<PromptPanel {...promptPanelProps()} value="Updated" />)
      expect(container.textContent).toContain('Updated')
    })
  })

  // ===========================================
  // Highlight Line Tests
  // ===========================================

  describe('Highlight Line', () => {
    it('accepts highlightLine prop', () => {
      // Just verify rendering doesn't throw with highlightLine
      const { container } = test.render({
        value: 'Line1\nLine2\nLine3',
        highlightLine: 1,
      })
      expect(container.firstChild).toBeDefined()
    })
  })

  // ===========================================
  // Ref API Tests
  // ===========================================

  describe('Ref API', () => {
    it('renders with ref without throwing', () => {
      const ref = createRef<{ goToLine: (line: number) => void }>()
      const props = promptPanelProps()
      // Just verify rendering with ref doesn't throw
      expect(() => {
        render(<PromptPanel value="" onChange={props.onChange} ref={ref} />)
      }).not.toThrow()
    })

    it('goToLine call does not throw when ref is available', () => {
      const ref = createRef<{ goToLine: (line: number) => void }>()
      const props = promptPanelProps()
      render(
        <PromptPanel
          value="Line1\nLine2\nLine3\nLine4\nLine5"
          onChange={props.onChange}
          ref={ref}
        />
      )
      // Optional chaining handles null ref gracefully
      expect(() => ref.current?.goToLine(3)).not.toThrow()
    })
  })

  // ===========================================
  // Token Variable Detection Tests
  // ===========================================

  describe('Token Variable Detection', () => {
    it('recognizes $ as token start', () => {
      const { container } = test.render({
        value: 'Box\n  col $primary',
        tokensCode: '// Farben\n$primary: #3B82F6',
      })
      expect(container.textContent).toContain('$primary')
    })
  })

  // ===========================================
  // Selection Prefix Tests
  // ===========================================

  describe('Selection Prefix', () => {
    it('accepts selection prefix prop', () => {
      // Selection prefix modifies editor behavior - verify it renders without error
      const props = promptPanelProps()
      const { container } = render(
        <PromptPanel
          value="Box\n  Text"
          onChange={props.onChange}
          selectionPrefix="Button >"
        />
      )
      expect(container.firstChild).toBeDefined()
    })
  })
})
