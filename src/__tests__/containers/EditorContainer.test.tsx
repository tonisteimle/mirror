/**
 * EditorContainer Tests
 *
 * Integration tests for the EditorContainer component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditorContainer } from '../../containers/EditorContainer'
import type { UseCodeParsingReturn } from '../../hooks/useCodeParsing'

// Mock the EditorPanel component to avoid complex dependencies
vi.mock('../../components/EditorPanel', () => ({
  EditorPanel: ({ activeTab, layoutCode }: { activeTab: string; layoutCode: string }) => (
    <div data-testid="editor-panel" data-active-tab={activeTab} data-layout-code={layoutCode}>
      Editor Panel Mock
    </div>
  ),
}))

// Mock the error boundary
vi.mock('../../components/boundaries', () => ({
  EditorErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="error-boundary">{children}</div>
  ),
}))

const mockParseResult: UseCodeParsingReturn = {
  mergedCode: '',
  debouncedCode: '',
  parseResult: {
    nodes: [],
    errors: [],
    diagnostics: [],
    parseIssues: [],
    registry: new Map(),
    tokens: new Map(),
    styles: new Map(),
    commands: [],
    centralizedEvents: [],
  },
  diagnostics: [],
  isValid: true,
  findNodeById: vi.fn(),
}

const defaultProps = {
  width: 500,
  activeTab: 'layout' as const,
  onTabChange: vi.fn(),
  layoutCode: 'Box "test"',
  componentsCode: '',
  tokensCode: '',
  onLayoutChange: vi.fn(),
  onComponentsChange: vi.fn(),
  onTokensChange: vi.fn(),
  parsing: mockParseResult,
  autoCompleteMode: 'always' as const,
}

describe('EditorContainer', () => {
  it('should render EditorPanel inside error boundary', () => {
    render(<EditorContainer {...defaultProps} />)

    expect(screen.getByTestId('error-boundary')).toBeTruthy()
    expect(screen.getByTestId('editor-panel')).toBeTruthy()
  })

  it('should pass activeTab to EditorPanel', () => {
    render(<EditorContainer {...defaultProps} activeTab="components" />)

    const panel = screen.getByTestId('editor-panel')
    expect(panel.getAttribute('data-active-tab')).toBe('components')
  })

  it('should pass layoutCode to EditorPanel', () => {
    const layoutCode = 'Card pad 16 "Hello"'
    render(<EditorContainer {...defaultProps} layoutCode={layoutCode} />)

    const panel = screen.getByTestId('editor-panel')
    expect(panel.getAttribute('data-layout-code')).toBe(layoutCode)
  })

  it('should render with all required props', () => {
    const { container } = render(<EditorContainer {...defaultProps} />)

    expect(container.firstChild).toBeTruthy()
  })

  it('should render with optional page management props', () => {
    const pageProps = {
      pages: [{ id: 'home', name: 'Home', layoutCode: '' }],
      currentPageId: 'home',
      onSelectPage: vi.fn(),
      onDeletePage: vi.fn(),
      onRenamePage: vi.fn(),
      referencedPages: new Set<string>(),
    }

    const { container } = render(<EditorContainer {...defaultProps} {...pageProps} />)

    expect(container.firstChild).toBeTruthy()
  })

  it('should render with optional data tab props', () => {
    const dataProps = {
      dataCode: 'schema User { name: string }',
      onDataCodeChange: vi.fn(),
    }

    const { container } = render(<EditorContainer {...defaultProps} {...dataProps} />)

    expect(container.firstChild).toBeTruthy()
  })

  it('should render with optional preview change handler', () => {
    const { container } = render(
      <EditorContainer {...defaultProps} onPreviewChange={vi.fn()} />
    )

    expect(container.firstChild).toBeTruthy()
  })

  it('should render with optional cursor line change handler', () => {
    const { container } = render(
      <EditorContainer {...defaultProps} onCursorLineChange={vi.fn()} />
    )

    expect(container.firstChild).toBeTruthy()
  })

  it('should render with highlight line', () => {
    const { container } = render(
      <EditorContainer {...defaultProps} highlightLine={5} />
    )

    expect(container.firstChild).toBeTruthy()
  })
})

describe('EditorContainer error handling', () => {
  it('should wrap EditorPanel in error boundary', () => {
    render(<EditorContainer {...defaultProps} />)

    const errorBoundary = screen.getByTestId('error-boundary')
    const editorPanel = screen.getByTestId('editor-panel')

    // Check that error boundary contains editor panel
    expect(errorBoundary.contains(editorPanel)).toBe(true)
  })
})
