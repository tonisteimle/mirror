/**
 * EditorPanel component containing the code editor tabs.
 */
import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { colors } from '../theme'
import { SimpleEditor, type SimpleEditorRef } from './SimpleEditor'
import { TabButton, IconButton } from './editor-panel'
import type { PreviewOverride } from '../hooks/useCodeParsing'
import { hasSchemas } from '../parser/data-parser'
import { PageSidebar, type PageData } from './PageSidebar'
import type { ComponentTemplate } from '../parser/parser'

export type EditorTab = 'layout' | 'components' | 'tokens' | 'data'

interface EditorPanelProps {
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
  designTokens?: Map<string, unknown>
  componentRegistry?: Map<string, ComponentTemplate>
  autoCompleteMode?: 'always' | 'delay' | 'off'
  onPreviewChange?: (override: PreviewOverride | null) => void
  onCursorLineChange?: (line: number) => void
  dataCode?: string
  onDataCodeChange?: (code: string) => void
  pages?: PageData[]
  currentPageId?: string
  onSelectPage?: (pageId: string) => void
  onDeletePage?: (pageId: string) => string[] | null
  onRenamePage?: (pageId: string, newName: string) => void
  referencedPages?: Set<string>
  previewMode?: boolean
  pickerModeEnabled?: boolean
  onPickerModeChange?: (enabled: boolean) => void
  expandShorthand?: boolean
  onExpandShorthandChange?: (enabled: boolean) => void
  useTokenMode?: boolean
  onTokenModeChange?: (mode: boolean) => void
}

export const EditorPanel = memo(function EditorPanel({
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
  designTokens,
  componentRegistry,
  onCursorLineChange,
  dataCode = '',
  onDataCodeChange,
  previewMode = false,
  pages = [],
  currentPageId,
  onSelectPage,
  onDeletePage,
  onRenamePage,
  referencedPages = new Set(),
}: EditorPanelProps) {
  const [deleteError, setDeleteError] = useState<{ pageId: string; references: string[] } | null>(null)
  const editorRef = useRef<SimpleEditorRef>(null)

  const deleteErrorRef = useRef(deleteError)
  deleteErrorRef.current = deleteError

  useEffect(() => {
    const handleClick = () => {
      if (deleteErrorRef.current) {
        setDeleteError(null)
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  const currentValue = activeTab === 'layout' ? layoutCode
    : activeTab === 'components' ? componentsCode
    : activeTab === 'tokens' ? tokensCode
    : dataCode

  const currentOnChange = activeTab === 'layout' ? onLayoutChange
    : activeTab === 'components' ? onComponentsChange
    : activeTab === 'tokens' ? onTokensChange
    : onDataCodeChange || (() => {})

  return (
    <div
      data-testid="editor-panel"
      style={{
        padding: '4px 12px 12px 16px',
        width: `${width}px`,
        height: '100%',
        backgroundColor: colors.panel,
        borderRight: '1px solid #1a1a1a',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.panel,
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Tab Toggle */}
        {!previewMode && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 4px',
          }}>
            <div role="tablist" aria-label="Editor tabs" data-testid="editor-tablist" style={{ display: 'flex', gap: '16px' }}>
              <TabButton
                label="Pages"
                isActive={activeTab === 'layout'}
                onClick={() => onTabChange('layout')}
                testId="editor-tab-pages"
              />
              <TabButton
                label="Components"
                isActive={activeTab === 'components'}
                onClick={() => onTabChange('components')}
                testId="editor-tab-components"
              />
              <TabButton
                label="Tokens"
                isActive={activeTab === 'tokens'}
                onClick={() => onTabChange('tokens')}
                testId="editor-tab-tokens"
              />
              <TabButton
                label="Data"
                isActive={activeTab === 'data'}
                onClick={() => onTabChange('data')}
                testId="editor-tab-data"
              />
            </div>
            <div style={{ display: 'flex', gap: '2px' }}>
              <IconButton
                onClick={() => {
                  const view = editorRef.current?.getEditorView()
                  if (view) {
                    import('@codemirror/commands').then(({ undo }) => undo(view))
                  }
                }}
                title="Undo"
                preventFocusLoss
                color="#666"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"/>
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
              </IconButton>
              <IconButton
                onClick={() => {
                  const view = editorRef.current?.getEditorView()
                  if (view) {
                    import('@codemirror/commands').then(({ redo }) => redo(view))
                  }
                }}
                title="Redo"
                preventFocusLoss
                color="#666"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6"/>
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
                </svg>
              </IconButton>
            </div>
          </div>
        )}

        {/* Delete Error Popup */}
        {deleteError && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              left: '200px',
              top: '120px',
              backgroundColor: '#1E1E2E',
              border: '1px solid #333',
              borderRadius: '6px',
              padding: '12px 16px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
              zIndex: 1001,
              maxWidth: '240px',
            }}
          >
            <div style={{ fontSize: '12px', color: '#999', marginBottom: '6px' }}>
              Seite wird referenziert von:
            </div>
            <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '10px' }}>
              {deleteError.references.join(', ')}
            </div>
            <button
              onClick={() => setDeleteError(null)}
              style={{
                padding: '4px 12px',
                fontSize: '11px',
                backgroundColor: '#333',
                color: '#999',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              OK
            </button>
          </div>
        )}

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex' }}>
          {/* Page navigation */}
          {!previewMode && activeTab === 'layout' && pages.length > 1 && onSelectPage && onDeletePage && onRenamePage && (
            <PageSidebar
              pages={pages}
              currentPageId={currentPageId || ''}
              onSelectPage={onSelectPage}
              onDeletePage={onDeletePage}
              onRenamePage={onRenamePage}
              referencedPages={referencedPages}
            />
          )}

          {/* Code Editor */}
          {!previewMode && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
              <SimpleEditor
                key={activeTab}
                ref={editorRef}
                value={currentValue}
                onChange={currentOnChange}
                highlightLine={activeTab === 'layout' ? highlightLine : undefined}
                designTokens={designTokens}
                componentRegistry={componentRegistry}
                enablePickers
                tokensCode={tokensCode}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})
