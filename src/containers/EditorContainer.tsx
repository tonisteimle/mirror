import { EditorPanel, type EditorTab } from '../components/EditorPanel'
import { EditorErrorBoundary } from '../components/boundaries'
import type { UseCodeParsingReturn } from '../hooks/useCodeParsing'

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
  onOpenAiAssistant: (position: { x: number; y: number }) => void
  onClear: () => void
  onClean: () => void
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
  onOpenAiAssistant,
  onClear,
  onClean,
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
        onOpenAiAssistant={onOpenAiAssistant}
        onClear={onClear}
        onClean={onClean}
      />
    </EditorErrorBoundary>
  )
}
