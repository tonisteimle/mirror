import { Preview } from '../components/Preview'
import { PreviewErrorBoundary } from '../components/boundaries'
import type { UseCodeParsingReturn } from '../hooks/useCodeParsing'
import type { UsePreviewSelectionReturn } from '../hooks/usePreviewSelection'

interface PreviewContainerProps {
  preview: UsePreviewSelectionReturn
  parsing: UseCodeParsingReturn
  onSelect: (id: string) => void
  onPageNavigate?: (pageName: string) => void
}

export function PreviewContainer({
  preview,
  parsing,
  onSelect,
  onPageNavigate,
}: PreviewContainerProps) {
  return (
    <div style={{ flex: 1 }}>
      <PreviewErrorBoundary>
        <Preview
          nodes={parsing.parseResult.nodes}
          registry={parsing.parseResult.registry}
          inspectMode={preview.inspectMode}
          hoveredId={preview.hoveredId}
          selectedId={preview.selectedId}
          onHover={preview.setHoveredId}
          onSelect={onSelect}
          onPageNavigate={onPageNavigate}
        />
      </PreviewErrorBoundary>
    </div>
  )
}
