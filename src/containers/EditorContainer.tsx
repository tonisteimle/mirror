import { EditorPanel, type EditorTab } from '../components/EditorPanel'
import { EditorErrorBoundary } from '../components/boundaries'
import type { UseCodeParsingReturn, PreviewOverride } from '../hooks/useCodeParsing'

interface EditorContainerProps {
  width: number
  activeTab: EditorTab
  onTabChange: (tab: EditorTab) => void
  layoutCode: string
  componentsCode: string
  tokensCode: string
  onLayoutChange: (code: string) => void
  onComponentsChange: (code: string) => void
  onTokensChange: (code: string) => void
  highlightLine?: number
  parsing: UseCodeParsingReturn
  autoCompleteMode: 'always' | 'delay' | 'off'
  onPreviewChange?: (override: PreviewOverride | null) => void
  // Note: onOpenAiAssistant, onClear, onClean are now provided via EditorActionsContext
}

export function EditorContainer({
  width,
  activeTab,
  onTabChange,
  layoutCode,
  componentsCode,
  tokensCode,
  onLayoutChange,
  onComponentsChange,
  onTokensChange,
  highlightLine,
  parsing,
  autoCompleteMode,
  onPreviewChange,
}: EditorContainerProps) {
  return (
    <EditorErrorBoundary>
      <EditorPanel
        width={width}
        activeTab={activeTab}
        onTabChange={onTabChange}
        layoutCode={layoutCode}
        componentsCode={componentsCode}
        tokensCode={tokensCode}
        onLayoutChange={onLayoutChange}
        onComponentsChange={onComponentsChange}
        onTokensChange={onTokensChange}
        highlightLine={highlightLine}
        designTokens={parsing.parseResult.tokens}
        autoCompleteMode={autoCompleteMode}
        onPreviewChange={onPreviewChange}
      />
    </EditorErrorBoundary>
  )
}
