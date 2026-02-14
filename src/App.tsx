import { useState, useCallback } from 'react'
import { colors } from './theme'
import { ErrorDialog } from './components/ErrorDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { HeaderBar } from './components/HeaderBar'
import { AiAssistantPanel } from './components/AiAssistantPanel'
import { EditorContainer } from './containers/EditorContainer'
import { PreviewContainer } from './containers/PreviewContainer'
import { PropertyPanel } from './components/PropertyPanel'
import { EditorActionsProvider } from './contexts'
import { useAppState } from './hooks/useAppState'

/** Width of collapsed panel in preview mode (section navigation only) */
const PREVIEW_PANEL_WIDTH = 160

function App() {
  const app = useAppState()

  // Selected element in preview (line number)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)

  // Property panel visibility
  const [showPropertyPanel, setShowPropertyPanel] = useState(false)

  // Content edit mode (edit text directly in preview)
  const [contentEditMode, setContentEditMode] = useState(false)

  // Handle text changes from content edit mode
  const handleTextChange = useCallback((sourceLine: number, newText: string, token?: string) => {
    console.log('[ContentEdit] handleTextChange called:', { sourceLine, newText, token })

    // Find the line in layoutCode that corresponds to this source line
    const lines = app.layoutCode.split('\n')

    // The sourceLine points to the 'text' component line (1-indexed)
    // We need to find and update the content within the multiline string
    // Convert to 0-indexed for array access
    const startIndex = Math.max(0, sourceLine - 1)

    console.log('[ContentEdit] Searching from line', startIndex, 'total lines:', lines.length)

    // Look for the token in the lines following sourceLine (inside the multiline string)
    for (let i = startIndex; i < lines.length && i < startIndex + 50; i++) {
      const line = lines[i]
      const trimmed = line.trimStart()

      // Check if this line has the token we're looking for
      if (token && trimmed.startsWith(`$${token} `)) {
        console.log('[ContentEdit] Found token at line', i, ':', line)
        // Found the line with this token - update it
        const indent = line.length - trimmed.length
        const prefix = line.substring(0, indent)
        const newLine = `${prefix}$${token} ${newText}`
        console.log('[ContentEdit] Updating to:', newLine)
        lines[i] = newLine
        app.setLayoutCode(lines.join('\n'))
        return
      }

      // Check if we've reached the end of the multiline string
      if (trimmed === "'" && i > startIndex) {
        console.log('[ContentEdit] Reached end of multiline string at line', i)
        break
      }
    }

    console.log('[ContentEdit] Token not found in search range')
  }, [app.layoutCode, app.setLayoutCode])

  // Handle element selection
  const handleElementSelect = useCallback((line: number | null) => {
    setSelectedLine(line)
  }, [])

  const isEditMode = app.viewMode === 'edit'
  const isPreviewMode = app.viewMode === 'preview'
  const isFullscreenMode = app.viewMode === 'fullscreen'

  // In preview mode, use collapsed width; in edit mode, use resizable width
  const panelWidth = isPreviewMode ? PREVIEW_PANEL_WIDTH : app.panel.panelWidth

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: colors.bg,
    }}>
      {/* Header - hidden in fullscreen mode */}
      {!isFullscreenMode && (
        <HeaderBar
          onNewPrototype={app.handleNewPrototype}
          onOpen={app.projectStorage.openProject}
          onSave={app.projectStorage.saveProject}
          onExport={app.projectStorage.exportReactCode}
          onOpenSettings={app.dialogs.openSettings}
          viewMode={app.viewMode}
          onViewModeChange={app.setViewMode}
          isDocsMode={app.docsMode.isDocsMode}
          onToggleDocsMode={app.handleToggleDocsMode}
          isDocsLoading={app.docsMode.isLoading}
          showPropertyPanel={showPropertyPanel}
          onTogglePropertyPanel={() => setShowPropertyPanel(!showPropertyPanel)}
          contentEditMode={contentEditMode}
          onToggleContentEditMode={() => setContentEditMode(!contentEditMode)}
        />
      )}

      {/* Main content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>

        {/* Editor Panel - shown in edit and preview mode (not fullscreen) */}
        {!isFullscreenMode && (
          <>
            <EditorActionsProvider actions={app.editorActions}>
              <EditorContainer
                width={panelWidth}
                activeTab={app.editor.activeTab}
                onTabChange={app.editor.setActiveTab}
                layoutCode={app.layoutCode}
                componentsCode={app.componentsCode}
                tokensCode={app.tokensCode}
                onLayoutChange={app.setLayoutCode}
                onComponentsChange={app.setComponentsCode}
                onTokensChange={app.setTokensCode}
                highlightLine={app.editor.highlightLine}
                parsing={app.parsing}
                autoCompleteMode={app.editor.autoCompleteMode}
                onPreviewChange={app.setPreviewOverride}
                onCursorLineChange={app.onCursorLineChange}
                dataCode={app.dataCode}
                onDataCodeChange={app.setDataCode}
                pages={app.pageManager.pages}
                currentPageId={app.pageManager.currentPageId}
                onSelectPage={app.pageManager.switchToPage}
                onDeletePage={app.pageManager.deletePage}
                onRenamePage={app.pageManager.renamePage}
                referencedPages={app.pageManager.referencedPages}
                previewMode={isPreviewMode}
                activeLayoutSection={app.activeLayoutSection}
                onActiveLayoutSectionChange={app.setActiveLayoutSection}
                isDocsMode={app.docsMode.isDocsMode}
                onSaveDocs={app.docsMode.saveDocs}
                isSavingDocs={app.docsMode.isSaving}
                hasUnsavedDocsChanges={app.docsMode.hasUnsavedChanges}
                hasAdminAccess={app.docsMode.hasAdminAccess}
                nlModeEnabled={app.editor.nlModeEnabled}
                onNlModeChange={app.editor.setNlModeEnabled}
                pickerModeEnabled={app.editor.pickerModeEnabled}
                onPickerModeChange={app.editor.setPickerModeEnabled}
              />
            </EditorActionsProvider>

            {/* Resizer - only in edit mode */}
            {isEditMode && (
              <div
                onMouseDown={app.panel.handleMouseDown}
                style={{
                  width: '8px',
                  cursor: 'col-resize',
                  backgroundColor: colors.preview,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '2px',
                    height: '24px',
                    borderRadius: '1px',
                    backgroundColor: app.panel.isDragging ? colors.accentBlue : '#444',
                    opacity: app.panel.isDragging ? 1 : 0.5,
                    transition: 'opacity 0.15s, background-color 0.15s',
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Preview */}
        <PreviewContainer
          parsing={app.parsing}
          onPageNavigate={app.pageManager.navigateToPage}
          dataRecords={app.dataRecords}
          dataSchemas={app.dataSchemas}
          onElementSelect={isEditMode && showPropertyPanel ? handleElementSelect : undefined}
          selectedLine={showPropertyPanel ? selectedLine : null}
          contentEditMode={contentEditMode}
          onTextChange={contentEditMode ? handleTextChange : undefined}
        />

        {/* Property Panel - only in edit mode when toggled on */}
        {isEditMode && showPropertyPanel && (
          <PropertyPanel
            selectedLine={selectedLine}
            layoutCode={app.layoutCode}
            tokens={app.parsing.parseResult.tokens}
            onCodeChange={app.setLayoutCode}
          />
        )}
      </div>

      {/* AI Assistant Panel */}
      <AiAssistantPanel
        isOpen={app.ai.isOpen}
        onClose={app.ai.closeAssistant}
        onSubmit={app.ai.generate}
        position={app.ai.position}
        isGenerating={app.ai.isGenerating}
      />

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={app.dialogs.isSettingsOpen}
        onClose={app.dialogs.closeSettings}
        autoCompleteMode={app.editor.autoCompleteMode}
        onAutoCompleteModeChange={app.editor.setAutoCompleteMode}
      />

      {/* Error Dialog */}
      <ErrorDialog
        isOpen={app.dialogs.error !== null}
        title={app.dialogs.error?.title}
        message={app.dialogs.error?.message || ''}
        details={app.dialogs.error?.details}
        onClose={app.dialogs.clearError}
      />

    </div>
  )
}

export default App
