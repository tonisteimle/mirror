import { memo } from 'react'
import { Preview } from '../components/Preview'
import { PreviewErrorBoundary } from '../components/boundaries'
import type { UseCodeParsingReturn } from '../hooks/useCodeParsing'
import type { DataRecord, DataSchema } from '../parser/types'

interface PreviewContainerProps {
  parsing: UseCodeParsingReturn
  onPageNavigate?: (pageName: string) => void
  /** Data records for data binding */
  dataRecords?: Map<string, DataRecord[]>
  /** Data schemas for data binding */
  dataSchemas?: DataSchema[]
  /** Callback when an element is selected in the preview */
  onElementSelect?: (line: number | null) => void
  /** Currently selected line */
  selectedLine?: number | null
  /** Whether content edit mode is active */
  contentEditMode?: boolean
  /** Callback when text content changes in edit mode */
  onTextChange?: (sourceLine: number, newText: string, token?: string) => void
}

export const PreviewContainer = memo(function PreviewContainer({
  parsing,
  onPageNavigate,
  dataRecords,
  dataSchemas,
  onElementSelect,
  selectedLine,
  contentEditMode,
  onTextChange,
}: PreviewContainerProps) {
  return (
    <div style={{ flex: 1, height: '100%', overflow: 'hidden' }} data-testid="preview-container">
      <PreviewErrorBoundary>
        <Preview
          nodes={parsing.parseResult.nodes}
          registry={parsing.parseResult.registry}
          tokens={parsing.parseResult.tokens}
          onPageNavigate={onPageNavigate}
          dataRecords={dataRecords}
          dataSchemas={dataSchemas}
          onElementSelect={onElementSelect}
          selectedLine={selectedLine}
          contentEditMode={contentEditMode}
          onTextChange={onTextChange}
        />
      </PreviewErrorBoundary>
    </div>
  )
})
