import { EditorPanel, type EditorTab } from '../components/EditorPanel'
import { EditorErrorBoundary } from '../components/boundaries'
import type { UseCodeParsingReturn, PreviewOverride } from '../hooks/useCodeParsing'
import type { PageData } from '../components/PageSidebar'

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
  /** Called when cursor line changes in layout editor (0-indexed) */
  onCursorLineChange?: (line: number) => void
  // Data tab props
  dataCode?: string
  onDataCodeChange?: (code: string) => void
  // Page management props
  pages?: PageData[]
  currentPageId?: string
  onSelectPage?: (pageId: string) => void
  onDeletePage?: (pageId: string) => string[] | null
  onRenamePage?: (pageId: string, newName: string) => void
  referencedPages?: Set<string>
  /** Preview mode - hides editor, shows only page navigation */
  previewMode?: boolean
  // Picker Mode props
  /** Whether picker mode is enabled (autocomplete suggestions) */
  pickerModeEnabled?: boolean
  /** Callback when picker mode changes */
  onPickerModeChange?: (enabled: boolean) => void
  // Expand Shorthand props
  /** Whether to expand shorthand to long form (e.g., p → padding). Default: true */
  expandShorthand?: boolean
  /** Callback when expand shorthand changes */
  onExpandShorthandChange?: (enabled: boolean) => void
  // Token mode (project setting)
  /** Token mode for picker panels (project-specific setting) */
  useTokenMode?: boolean
  /** Callback when token mode changes */
  onTokenModeChange?: (mode: boolean) => void
  // LLM enabled toggle
  /** Whether LLM features are enabled (translation, generation) */
  llmEnabled?: boolean
  /** Callback when LLM enabled changes */
  onLlmEnabledChange?: (enabled: boolean) => void
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
  onCursorLineChange,
  dataCode,
  onDataCodeChange,
  pages,
  currentPageId,
  onSelectPage,
  onDeletePage,
  onRenamePage,
  referencedPages,
  previewMode,
  pickerModeEnabled,
  onPickerModeChange,
  expandShorthand,
  onExpandShorthandChange,
  useTokenMode,
  onTokenModeChange,
  llmEnabled,
  onLlmEnabledChange,
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
        onCursorLineChange={onCursorLineChange}
        dataCode={dataCode}
        onDataCodeChange={onDataCodeChange}
        pages={pages}
        currentPageId={currentPageId}
        onSelectPage={onSelectPage}
        onDeletePage={onDeletePage}
        onRenamePage={onRenamePage}
        referencedPages={referencedPages}
        previewMode={previewMode}
        pickerModeEnabled={pickerModeEnabled}
        onPickerModeChange={onPickerModeChange}
        expandShorthand={expandShorthand}
        onExpandShorthandChange={onExpandShorthandChange}
        useTokenMode={useTokenMode}
        onTokenModeChange={onTokenModeChange}
        llmEnabled={llmEnabled}
        onLlmEnabledChange={onLlmEnabledChange}
      />
    </EditorErrorBoundary>
  )
}
