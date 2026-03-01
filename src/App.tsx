import { useState, useCallback, useMemo } from 'react'
import { colors } from './theme'
import { ErrorDialog } from './components/ErrorDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { ProjectsDialog } from './components/ProjectsDialog'
import { NewProjectDialog } from './components/NewProjectDialog'
import { HeaderBar } from './components/HeaderBar'
import { EditorContainer } from './containers/EditorContainer'
import { PreviewContainer, type PreviewPanelMode } from './containers/PreviewContainer'
import { PropertyPanel } from './components/PropertyPanel'
import { EditorActionsProvider } from './contexts'
import { useAppState } from './hooks/useAppState'
import { useLibraryCloud } from './hooks/useLibraryCloud'

/** Width of collapsed panel in preview mode (section navigation only) */
const PREVIEW_PANEL_WIDTH = 160

function App() {
  const app = useAppState()

  // Cloud save for entire project (Tokens, Components, Data, Pages)
  const cloudSave = useLibraryCloud({
    projectState: {
      tokensCode: app.tokensCode,
      componentsCode: app.componentsCode,
      dataCode: app.dataCode,
      pages: app.pageManager.pages,
      currentPageId: app.pageManager.currentPageId,
    },
    setTokensCode: app.setTokensCode,
    setComponentsCode: app.setComponentsCode,
    setDataCode: app.setDataCode,
    restorePages: app.pageManager.restorePages,
    enabled: true,
  })

  // Selected element in preview (line number)
  const [selectedLine, setSelectedLine] = useState<number | null>(null)

  // Property panel visibility
  const [showPropertyPanel, setShowPropertyPanel] = useState(false)

  // Preview panel mode (preview or react code view)
  const [previewPanelMode, setPreviewPanelMode] = useState<PreviewPanelMode>('preview')

  // Handle tab change - auto-switches preview mode based on active tab
  const handleTabChange = useCallback((tab: 'layout' | 'components' | 'tokens' | 'data') => {
    app.editor.setActiveTab(tab)
    if (tab === 'components') {
      setPreviewPanelMode('components')
    } else if (tab === 'tokens') {
      setPreviewPanelMode('tokens')
    } else if (tab === 'layout') {
      setPreviewPanelMode('preview')
    }
  }, [app.editor])

  // Projects dialog
  const [isProjectsDialogOpen, setIsProjectsDialogOpen] = useState(false)
  const [isNewProjectDialogOpen, setIsNewProjectDialogOpen] = useState(false)
  const [existingProjectNames, setExistingProjectNames] = useState<string[]>([])

  // Handle project selection - updates URL and reloads
  const handleSelectProject = useCallback((projectId: string) => {
    const url = new URL(window.location.href)
    if (projectId) {
      url.searchParams.set('project', projectId)
    } else {
      url.searchParams.delete('project')
    }
    window.location.href = url.toString()
  }, [])

  // Handle new project creation from NewProjectDialog
  const handleCreateProject = useCallback(async (projectName: string, templateId: 'example' | 'empty') => {
    const LIBRARY_ENDPOINT = 'https://ux-strategy.ch/mirror/save-library.php'

    try {
      let projectContent: string

      if (templateId === 'example') {
        // Load from _template project
        try {
          const templateResponse = await fetch(`${LIBRARY_ENDPOINT}?id=_template`)
          if (templateResponse.ok) {
            const templateText = await templateResponse.text()
            if (templateText && templateText.trim() && !templateText.trim().startsWith('//')) {
              const templateData = JSON.parse(templateText)
              templateData.savedAt = new Date().toISOString()
              projectContent = JSON.stringify(templateData, null, 2)
              console.log('[Projects] Neues Projekt von _template erstellt')
            } else {
              throw new Error('Template leer')
            }
          } else {
            throw new Error('Template nicht gefunden')
          }
        } catch {
          // Fallback to empty if template not found
          console.log('[Projects] _template nicht gefunden, erstelle leeres Projekt')
          projectContent = JSON.stringify({
            version: 2,
            tokensCode: '',
            componentsCode: '',
            dataCode: '',
            pages: [{ id: 'page-1', name: 'Page 1', layoutCode: '' }],
            currentPageId: 'page-1',
            savedAt: new Date().toISOString(),
          }, null, 2)
        }
      } else {
        // Create empty project
        console.log('[Projects] Leeres Projekt erstellt')
        projectContent = JSON.stringify({
          version: 2,
          tokensCode: '',
          componentsCode: '',
          dataCode: '',
          pages: [{ id: 'page-1', name: 'Page 1', layoutCode: '' }],
          currentPageId: 'page-1',
          savedAt: new Date().toISOString(),
        }, null, 2)
      }

      // Save to server
      const response = await fetch(`${LIBRARY_ENDPOINT}?id=${projectName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: projectContent,
      })

      if (!response.ok) {
        throw new Error('Projekt konnte nicht erstellt werden')
      }

      // Navigate to new project
      handleSelectProject(projectName)
    } catch (err) {
      console.error('[Projects] Fehler beim Erstellen:', err)
    }
  }, [handleSelectProject])

  // Handle opening new project dialog (from ProjectsDialog)
  const handleOpenNewProject = useCallback(async () => {
    // Load existing project names
    try {
      const response = await fetch('https://ux-strategy.ch/mirror/save-library.php?list=1')
      if (response.ok) {
        const data = await response.json()
        setExistingProjectNames((data.projects || []).map((p: { id: string }) => p.id))
      }
    } catch {
      // Ignore errors
    }
    setIsProjectsDialogOpen(false)
    setIsNewProjectDialogOpen(true)
  }, [])

  // Handle element selection (single click)
  // Clicking on background (null) closes the property panel
  const handleElementSelect = useCallback((line: number | null) => {
    setSelectedLine(line)
    if (line === null) {
      setShowPropertyPanel(false)
    }
  }, [])

  // Handle element double-click (navigate to source in editor)
  const handleElementDoubleClick = useCallback((line: number) => {
    // Switch to layout tab if not active
    if (app.editor.activeTab !== 'layout') {
      app.editor.setActiveTab('layout')
    }
    // Set highlight line - this triggers goToLine in PromptPanel
    app.editor.setHighlightLine(line)
    // Also select the line for visual feedback
    setSelectedLine(line)
  }, [app.editor])

  // Handle element option-click (open property panel)
  const handleElementOptionClick = useCallback((line: number) => {
    setSelectedLine(line)
    setShowPropertyPanel(true)
  }, [])

  // Calculate the line offset where layoutCode starts in the combined code
  // The parser combines: tokensCode + '\n\n' + componentsCode + '\n\n' + layoutCode
  const layoutLineOffset = useMemo(() => {
    let offset = 0
    if (app.tokensCode.trim()) {
      offset += app.tokensCode.split('\n').length + 2 // +2 for '\n\n' separator
    }
    if (app.componentsCode.trim()) {
      offset += app.componentsCode.split('\n').length + 2 // +2 for '\n\n' separator
    }
    return offset
  }, [app.tokensCode, app.componentsCode])

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
          onExport={app.projectStorage.exportReactCode}
          onOpenSettings={app.dialogs.openSettings}
          viewMode={app.viewMode}
          onViewModeChange={app.setViewMode}
          showPropertyPanel={showPropertyPanel}
          onTogglePropertyPanel={() => setShowPropertyPanel(!showPropertyPanel)}
          previewPanelMode={previewPanelMode}
          onPreviewPanelModeChange={setPreviewPanelMode}
          cloudSaveStatus={cloudSave.status}
          cloudProjectId={cloudSave.projectId}
          onOpenProjects={() => setIsProjectsDialogOpen(true)}
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
                onTabChange={handleTabChange}
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
                pickerModeEnabled={app.pickerModeEnabled}
                onPickerModeChange={app.setPickerModeEnabled}
                expandShorthand={app.expandShorthand}
                onExpandShorthandChange={app.setExpandShorthand}
                useTokenMode={app.useTokenMode}
                onTokenModeChange={app.setUseTokenMode}
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
          onElementDoubleClick={isEditMode ? handleElementDoubleClick : undefined}
          onElementOptionClick={isEditMode ? handleElementOptionClick : undefined}
          selectedLine={showPropertyPanel ? selectedLine : null}
          previewPanelMode={previewPanelMode}
          layoutCode={app.layoutCode}
          componentsCode={app.componentsCode}
          tokensCode={app.tokensCode}
        />

        {/* Property Panel - only in edit mode when toggled on */}
        {isEditMode && showPropertyPanel && (
          <PropertyPanel
            selectedLine={selectedLine !== null ? selectedLine - layoutLineOffset : null}
            layoutCode={app.layoutCode}
            tokens={app.parsing.parseResult.tokens}
            onCodeChange={app.setLayoutCode}
            onClose={() => setShowPropertyPanel(false)}
          />
        )}
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={app.dialogs.isSettingsOpen}
        onClose={app.dialogs.closeSettings}
      />

      {/* Projects Dialog */}
      <ProjectsDialog
        isOpen={isProjectsDialogOpen}
        onClose={() => setIsProjectsDialogOpen(false)}
        currentProjectId={cloudSave.projectId}
        onSelectProject={handleSelectProject}
        onOpenNewProject={handleOpenNewProject}
      />

      {/* New Project Dialog */}
      <NewProjectDialog
        isOpen={isNewProjectDialogOpen}
        onClose={() => setIsNewProjectDialogOpen(false)}
        onCreateProject={handleCreateProject}
        existingProjectNames={existingProjectNames}
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
