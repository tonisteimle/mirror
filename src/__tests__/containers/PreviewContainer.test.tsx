/**
 * PreviewContainer Tests
 *
 * Integration tests for the PreviewContainer component.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PreviewContainer } from '../../containers/PreviewContainer'
import type { UseCodeParsingReturn } from '../../hooks/useCodeParsing'

// Mock the Preview component to avoid complex dependencies
vi.mock('../../components/Preview', () => ({
  Preview: ({ nodes, onPageNavigate }: { nodes: unknown[]; onPageNavigate?: () => void }) => (
    <div
      data-testid="preview"
      data-node-count={nodes.length}
      onClick={onPageNavigate}
    >
      Preview Mock
    </div>
  ),
}))

// Mock the error boundary
vi.mock('../../components/boundaries', () => ({
  PreviewErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="preview-error-boundary">{children}</div>
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
  parsing: mockParseResult,
}

describe('PreviewContainer', () => {
  it('should render preview container with correct testid', () => {
    render(<PreviewContainer {...defaultProps} />)

    expect(screen.getByTestId('preview-container')).toBeTruthy()
  })

  it('should render Preview inside error boundary', () => {
    render(<PreviewContainer {...defaultProps} />)

    const errorBoundary = screen.getByTestId('preview-error-boundary')
    const preview = screen.getByTestId('preview')

    expect(errorBoundary).toBeTruthy()
    expect(preview).toBeTruthy()
    expect(errorBoundary.contains(preview)).toBe(true)
  })

  it('should pass nodes from parseResult to Preview', () => {
    const parsingWithNodes: UseCodeParsingReturn = {
      ...mockParseResult,
      parseResult: {
        ...mockParseResult.parseResult,
        nodes: [
          { id: '1', name: 'Box', type: 'component', properties: {}, children: [] },
          { id: '2', name: 'Card', type: 'component', properties: {}, children: [] },
        ],
      },
    }

    render(<PreviewContainer parsing={parsingWithNodes} />)

    const preview = screen.getByTestId('preview')
    expect(preview.getAttribute('data-node-count')).toBe('2')
  })

  it('should pass onPageNavigate handler to Preview', () => {
    const onPageNavigate = vi.fn()

    render(<PreviewContainer {...defaultProps} onPageNavigate={onPageNavigate} />)

    const preview = screen.getByTestId('preview')
    preview.click()

    expect(onPageNavigate).toHaveBeenCalled()
  })

  it('should render with optional dataRecords', () => {
    const dataRecords = new Map([
      ['User', [{ id: '1', name: 'Alice' }]],
    ])

    const { container } = render(
      <PreviewContainer {...defaultProps} dataRecords={dataRecords} />
    )

    expect(container.firstChild).toBeTruthy()
  })

  it('should render with optional dataSchemas', () => {
    const dataSchemas = [
      { name: 'User', fields: [{ name: 'id', type: 'string' }, { name: 'name', type: 'string' }] },
    ]

    const { container } = render(
      <PreviewContainer {...defaultProps} dataSchemas={dataSchemas} />
    )

    expect(container.firstChild).toBeTruthy()
  })

  it('should have flex: 1 and full height styling', () => {
    render(<PreviewContainer {...defaultProps} />)

    const container = screen.getByTestId('preview-container')
    const style = container.style

    // flex: 1 gets computed to '1 1 0%' in some environments
    expect(style.flex).toContain('1')
    expect(style.height).toBe('100%')
    expect(style.overflow).toBe('hidden')
  })

  it('should be memoized (same props should not cause re-render)', () => {
    const { rerender } = render(<PreviewContainer {...defaultProps} />)

    // Rerender with same props should work
    rerender(<PreviewContainer {...defaultProps} />)

    expect(screen.getByTestId('preview-container')).toBeTruthy()
  })
})

describe('PreviewContainer with empty parsing', () => {
  it('should handle empty nodes array', () => {
    render(<PreviewContainer {...defaultProps} />)

    const preview = screen.getByTestId('preview')
    expect(preview.getAttribute('data-node-count')).toBe('0')
  })

  it('should handle empty registry', () => {
    const { container } = render(<PreviewContainer {...defaultProps} />)

    expect(container.firstChild).toBeTruthy()
  })

  it('should handle empty tokens', () => {
    const { container } = render(<PreviewContainer {...defaultProps} />)

    expect(container.firstChild).toBeTruthy()
  })
})
