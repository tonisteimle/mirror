import { Preview } from '../components/Preview'
import { PreviewErrorBoundary } from '../components/boundaries'
import type { UseCodeParsingReturn } from '../hooks/useCodeParsing'

interface PreviewContainerProps {
  parsing: UseCodeParsingReturn
  onPageNavigate?: (pageName: string) => void
}

export function PreviewContainer({
  parsing,
  onPageNavigate,
}: PreviewContainerProps) {
  return (
    <div style={{ flex: 1 }} data-testid="preview-container">
      <PreviewErrorBoundary>
        <Preview
          nodes={parsing.parseResult.nodes}
          registry={parsing.parseResult.registry}
          onPageNavigate={onPageNavigate}
        />
      </PreviewErrorBoundary>
    </div>
  )
}
