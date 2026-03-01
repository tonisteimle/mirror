import { memo } from 'react'
import { Preview } from '../components/Preview'
import { ReactCodePanel } from '../components/ReactCodePanel'
import { ComponentLibraryView } from '../components/ComponentLibraryView'
import { TokensPreview } from '../components/TokensPreview'
import { PreviewErrorBoundary } from '../components/boundaries'
import { useReactExport } from '../hooks/useReactExport'
import type { UseCodeParsingReturn } from '../hooks/useCodeParsing'
import type { DataRecord, DataSchema } from '../parser/types'

/** Preview panel mode: 'preview' shows live render, 'react' shows generated code, 'components' shows component library, 'tokens' shows token preview */
export type PreviewPanelMode = 'preview' | 'react' | 'components' | 'tokens'

interface PreviewContainerProps {
  parsing: UseCodeParsingReturn
  onPageNavigate?: (pageName: string) => void
  /** Data records for data binding */
  dataRecords?: Map<string, DataRecord[]>
  /** Data schemas for data binding */
  dataSchemas?: DataSchema[]
  /** Callback when an element is selected in the preview (single click) */
  onElementSelect?: (line: number | null) => void
  /** Callback when an element is double-clicked (navigates to source) */
  onElementDoubleClick?: (line: number) => void
  /** Callback when an element is option-clicked (opens property panel) */
  onElementOptionClick?: (line: number) => void
  /** Currently selected line */
  selectedLine?: number | null
  /** Preview panel mode (preview or react code view) */
  previewPanelMode?: PreviewPanelMode
  /** Layout code for React export */
  layoutCode?: string
  /** Components code for React export */
  componentsCode?: string
  /** Tokens code for React export */
  tokensCode?: string
}

export const PreviewContainer = memo(function PreviewContainer({
  parsing,
  onPageNavigate,
  dataRecords,
  dataSchemas,
  onElementSelect,
  onElementDoubleClick,
  onElementOptionClick,
  selectedLine,
  previewPanelMode = 'preview',
  componentsCode = '',
  tokensCode = '',
}: PreviewContainerProps) {
  // Generate React code for the React code panel
  const { files } = useReactExport({
    nodes: parsing.parseResult.nodes,
    componentsCode,
    tokensCode,
  })

  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden' }} data-testid="preview-container">
      {previewPanelMode === 'preview' && (
        <PreviewErrorBoundary>
          <Preview
            nodes={parsing.parseResult.nodes}
            registry={parsing.parseResult.registry}
            tokens={parsing.parseResult.tokens}
            onPageNavigate={onPageNavigate}
            dataRecords={dataRecords}
            dataSchemas={dataSchemas}
            onElementSelect={onElementSelect}
            onElementDoubleClick={onElementDoubleClick}
            onElementOptionClick={onElementOptionClick}
            selectedLine={selectedLine}
          />
        </PreviewErrorBoundary>
      )}
      {previewPanelMode === 'react' && (
        <ReactCodePanel files={files} />
      )}
      {previewPanelMode === 'components' && (
        <PreviewErrorBoundary>
          <ComponentLibraryView
            registry={parsing.parseResult.registry}
            tokens={parsing.parseResult.tokens}
          />
        </PreviewErrorBoundary>
      )}
      {previewPanelMode === 'tokens' && (
        <TokensPreview
          tokens={parsing.parseResult.tokens}
          tokensCode={tokensCode}
        />
      )}
    </div>
  )
})
