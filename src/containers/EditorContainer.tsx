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
  /** Preview mode - hides editor, shows only section navigation */
  previewMode?: boolean
  // Section navigation props
  /** Active section for layout tab (controlled) */
  activeLayoutSection?: string | null
  /** Callback when layout section changes */
  onActiveLayoutSectionChange?: (section: string | null) => void
  // Docs mode props
  /** Whether docs mode is active */
  isDocsMode?: boolean
  /** Callback to save docs to server */
  onSaveDocs?: () => Promise<boolean>
  /** Whether docs are saving */
  isSavingDocs?: boolean
  /** Whether docs have unsaved changes */
  hasUnsavedDocsChanges?: boolean
  /** Whether user has admin access */
  hasAdminAccess?: boolean
  // NL Mode props
  /** Whether NL mode is enabled */
  nlModeEnabled?: boolean
  /** Callback when NL mode changes */
  onNlModeChange?: (enabled: boolean) => void
  // Picker Mode props
  /** Whether picker mode is enabled (autocomplete suggestions) */
  pickerModeEnabled?: boolean
  /** Callback when picker mode changes */
  onPickerModeChange?: (enabled: boolean) => void
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
  activeLayoutSection,
  onActiveLayoutSectionChange,
  isDocsMode,
  onSaveDocs,
  isSavingDocs,
  hasUnsavedDocsChanges,
  hasAdminAccess,
  nlModeEnabled,
  onNlModeChange,
  pickerModeEnabled,
  onPickerModeChange,
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
        activeLayoutSection={activeLayoutSection}
        onActiveLayoutSectionChange={onActiveLayoutSectionChange}
        isDocsMode={isDocsMode}
        onSaveDocs={onSaveDocs}
        isSavingDocs={isSavingDocs}
        hasUnsavedDocsChanges={hasUnsavedDocsChanges}
        hasAdminAccess={hasAdminAccess}
        nlModeEnabled={nlModeEnabled}
        onNlModeChange={onNlModeChange}
        pickerModeEnabled={pickerModeEnabled}
        onPickerModeChange={onPickerModeChange}
      />
    </EditorErrorBoundary>
  )
}
