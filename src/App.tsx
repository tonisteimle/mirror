import { colors } from './theme'
import { ErrorDialog } from './components/ErrorDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { HeaderBar } from './components/HeaderBar'
import { AiAssistantPanel } from './components/AiAssistantPanel'
import { EditorContainer } from './containers/EditorContainer'
import { PreviewContainer } from './containers/PreviewContainer'
import { EditorActionsProvider } from './contexts'
import { useAppState } from './hooks/useAppState'

function App() {
  const app = useAppState()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: colors.bg,
    }}>
      {/* Header */}
      <HeaderBar
        onImport={app.projectStorage.importProject}
        onExport={app.projectStorage.exportProject}
        onOpenSettings={app.dialogs.openSettings}
      />

      {/* Main content */}
      <div style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
      }}>

        {/* Editor - wrapped in EditorActionsProvider for context-based callbacks */}
        <EditorActionsProvider actions={app.editorActions}>
          <EditorContainer
            width={app.panel.panelWidth}
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
          />
        </EditorActionsProvider>

        {/* Resizer */}
        <div
          onMouseDown={app.panel.handleMouseDown}
          style={{
            width: '4px',
            cursor: 'col-resize',
            backgroundColor: app.panel.isDragging ? colors.accentBlue : colors.preview,
          }}
        />

        {/* Preview */}
        <PreviewContainer
          parsing={app.parsing}
          onPageNavigate={app.pageManager.navigateToPage}
        />
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
