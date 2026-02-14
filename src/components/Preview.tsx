import { memo, useCallback, useMemo } from 'react'
import type { ASTNode, ComponentTemplate, DataSchema, DataRecord, TokenValue } from '../parser/parser'
import { generateReactElement, OverlayPortal } from '../generator/react-generator.tsx'
import { PreviewProviders } from '../generator/preview-providers'
import { colors } from '../theme'

// Stable empty options object to prevent unnecessary re-renders
const EMPTY_OPTIONS = {} as const

// Stable empty token map to prevent unnecessary re-renders
const EMPTY_TOKENS = new Map<string, TokenValue>()

interface PreviewProps {
  nodes: ASTNode[]
  registry: Map<string, ComponentTemplate>
  onPageNavigate?: (pageName: string) => void
  /** Data records for data binding */
  dataRecords?: Map<string, DataRecord[]>
  /** Data schemas for data binding */
  dataSchemas?: DataSchema[]
  /** Design tokens for token inheritance in nested components (e.g., Playground) */
  tokens?: Map<string, TokenValue>
  /** Callback when an element is selected in the preview */
  onElementSelect?: (line: number | null) => void
  /** Currently selected line */
  selectedLine?: number | null
  /** Whether content edit mode is active (edit text directly in preview) */
  contentEditMode?: boolean
  /** Callback when text content changes in edit mode */
  onTextChange?: (sourceLine: number, newText: string, token?: string) => void
}

export const Preview = memo(function Preview({
  nodes,
  registry,
  onPageNavigate,
  dataRecords = new Map(),
  dataSchemas = [],
  tokens = EMPTY_TOKENS,
  onElementSelect,
  selectedLine,
  contentEditMode = false,
  onTextChange,
}: PreviewProps) {
  // Memoized render function for overlays
  const renderOverlayNode = useCallback((node: ASTNode) => {
    return generateReactElement([node], EMPTY_OPTIONS)
  }, [])

  // Handle click on preview to select element
  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    if (!onElementSelect) return

    // Find the closest element with data-source-line
    const target = e.target as HTMLElement
    const elementWithLine = target.closest('[data-source-line]') as HTMLElement | null

    if (elementWithLine) {
      const line = elementWithLine.getAttribute('data-source-line')
      if (line !== null) {
        e.stopPropagation()
        onElementSelect(parseInt(line, 10))
      }
    } else {
      // Clicked on background - deselect
      onElementSelect(null)
    }
  }, [onElementSelect])

  // Memoize generated elements to avoid re-generating on provider changes
  const generatedElements = useMemo(
    () => generateReactElement(nodes, EMPTY_OPTIONS),
    [nodes]
  )

  if (nodes.length === 0) {
    return <div style={{ height: '100%', backgroundColor: colors.preview, color: '#fff' }} />
  }

  // Add selection highlight styles
  const selectionStyles = selectedLine !== null ? `
    [data-source-line="${selectedLine}"] {
      outline: 2px solid #3B82F6 !important;
      outline-offset: 2px;
    }
  ` : ''

  return (
    <PreviewProviders
      registry={registry}
      onPageNavigate={onPageNavigate}
      dataRecords={dataRecords}
      dataSchemas={dataSchemas}
      tokens={tokens}
      contentEditMode={contentEditMode}
      onTextChange={onTextChange}
    >
      {selectionStyles && <style>{selectionStyles}</style>}
      <div
        style={{
          height: '100%',
          backgroundColor: colors.preview,
          color: '#fff',
          overflow: 'auto',
          position: 'relative',
          cursor: onElementSelect ? 'pointer' : 'default',
        }}
        onClick={handlePreviewClick}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-start',
          alignItems: 'center',
          width: '100%',
          minHeight: '100%',
          padding: '16px',
          boxSizing: 'border-box',
        }}>
          {generatedElements}
        </div>
      </div>
      <OverlayPortal renderNode={renderOverlayNode} />
    </PreviewProviders>
  )
})
