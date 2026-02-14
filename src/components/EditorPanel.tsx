/**
 * EditorPanel component containing the code editor tabs and AI prompt input.
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { colors } from '../theme'
import { LazyPromptPanel } from './LazyPromptPanel'
import { TabButton, IconButton, SubMenu } from './editor-panel'
import { generateWithCodeIntelligence, hasApiKey } from '../lib/ai'
import type { PreviewOverride } from '../hooks/useCodeParsing'
import { hasSchemas } from '../parser/data-parser'
import { generateDataWithAI } from '../lib/ai-data'
import { logger } from '../services/logger'
import type { PageData } from './PageSidebar'

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
  autoCompleteMode: 'always' | 'delay' | 'off'
  onPreviewChange?: (override: PreviewOverride | null) => void
  /** Called when cursor line changes in layout editor (0-indexed) */
  onCursorLineChange?: (line: number) => void
  /** Data tab: schema+instances code */
  dataCode?: string
  /** Data tab: code change handler */
  onDataCodeChange?: (code: string) => void
  /** Page management */
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
  autoCompleteMode,
  onPreviewChange,
  onCursorLineChange,
  dataCode = '',
  onDataCodeChange,
  previewMode = false,
  pages = [],
  currentPageId,
  onSelectPage,
  activeLayoutSection: controlledActiveLayoutSection,
  onActiveLayoutSectionChange,
  isDocsMode = false,
  onSaveDocs,
  isSavingDocs = false,
  hasUnsavedDocsChanges = false,
  hasAdminAccess = false,
}: EditorPanelProps) {
  // Delete error state for page management
  const [deleteError, setDeleteError] = useState<{ pageId: string; references: string[] } | null>(null)

  // Close delete error on outside click - stable handler with ref
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
  }, []) // Empty deps - handler is stable via ref

  // Extract sections from code using --- Name --- syntax
  const extractSections = useCallback((code: string): string[] => {
    const sections: string[] = []
    for (const line of code.split('\n')) {
      const match = line.match(/^---\s*(.+?)\s*---\s*$/)
      if (match) sections.push(match[1])
    }
    return sections
  }, [])

  // Extract code for a specific section
  const extractSectionCode = useCallback((code: string, sectionName: string): string => {
    const lines = code.split('\n')
    let inSection = false
    const sectionLines: string[] = []

    for (const line of lines) {
      const match = line.match(/^---\s*(.+?)\s*---\s*$/)
      if (match) {
        if (inSection) {
          // Found next section, stop
          break
        }
        if (match[1] === sectionName) {
          inSection = true
          sectionLines.push(line) // Include the section header
        }
      } else if (inSection) {
        sectionLines.push(line)
      }
    }

    return sectionLines.join('\n')
  }, [])

  // Replace code for a specific section in full code
  const replaceSectionCode = useCallback((fullCode: string, sectionName: string, newSectionCode: string): string => {
    const lines = fullCode.split('\n')
    const result: string[] = []
    let inSection = false
    let sectionReplaced = false

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const match = line.match(/^---\s*(.+?)\s*---\s*$/)

      if (match) {
        if (inSection) {
          // Found next section, end current section replacement
          inSection = false
        }
        if (match[1] === sectionName) {
          inSection = true
          sectionReplaced = true
          // Add the new section code (which includes its header)
          result.push(...newSectionCode.split('\n'))
          continue
        }
      }

      if (!inSection) {
        result.push(line)
      }
    }

    // If section wasn't found, append it
    if (!sectionReplaced) {
      result.push(...newSectionCode.split('\n'))
    }

    return result.join('\n')
  }, [])

  // Extract sections from each tab's code
  const layoutSections = useMemo(() => extractSections(layoutCode), [layoutCode, extractSections])
  const componentSections = useMemo(() => extractSections(componentsCode), [componentsCode, extractSections])
  const tokenSections = useMemo(() => extractSections(tokensCode), [tokensCode, extractSections])
  const dataSections = useMemo(() => extractSections(dataCode), [dataCode, extractSections])

  // Active section state per tab (layout can be controlled)
  const [internalActiveLayoutSection, setInternalActiveLayoutSection] = useState<string | null>(null)
  const [activeComponentSection, setActiveComponentSection] = useState<string | null>(null)
  const [activeTokenSection, setActiveTokenSection] = useState<string | null>(null)
  const [activeDataSection, setActiveDataSection] = useState<string | null>(null)

  // Use controlled state for layout section if provided
  const activeLayoutSection = controlledActiveLayoutSection !== undefined
    ? controlledActiveLayoutSection
    : internalActiveLayoutSection

  const setActiveLayoutSection = useCallback((section: string | null) => {
    if (onActiveLayoutSectionChange) {
      onActiveLayoutSectionChange(section)
    } else {
      setInternalActiveLayoutSection(section)
    }
  }, [onActiveLayoutSectionChange])

  // Auto-select first section when sections change
  useEffect(() => {
    if (layoutSections.length > 0 && !layoutSections.includes(activeLayoutSection || '')) {
      setActiveLayoutSection(layoutSections[0])
    }
  }, [layoutSections, activeLayoutSection, setActiveLayoutSection])

  useEffect(() => {
    if (componentSections.length > 0 && !componentSections.includes(activeComponentSection || '')) {
      setActiveComponentSection(componentSections[0])
    }
  }, [componentSections, activeComponentSection])

  useEffect(() => {
    if (tokenSections.length > 0 && !tokenSections.includes(activeTokenSection || '')) {
      setActiveTokenSection(tokenSections[0])
    }
  }, [tokenSections, activeTokenSection])

  useEffect(() => {
    if (dataSections.length > 0 && !dataSections.includes(activeDataSection || '')) {
      setActiveDataSection(dataSections[0])
    }
  }, [dataSections, activeDataSection])

  // Get active section for current tab
  const activeSection = activeTab === 'layout' ? activeLayoutSection
    : activeTab === 'components' ? activeComponentSection
    : activeTab === 'tokens' ? activeTokenSection
    : activeDataSection

  const setActiveSection = activeTab === 'layout' ? setActiveLayoutSection
    : activeTab === 'components' ? setActiveComponentSection
    : activeTab === 'tokens' ? setActiveTokenSection
    : setActiveDataSection

  // Get current sections list
  const currentSections = activeTab === 'layout' ? layoutSections
    : activeTab === 'components' ? componentSections
    : activeTab === 'tokens' ? tokenSections
    : dataSections

  // Determine current full code and change handler based on active tab
  const fullCode = activeTab === 'layout' ? layoutCode
    : activeTab === 'components' ? componentsCode
    : activeTab === 'tokens' ? tokensCode
    : dataCode
  const fullCodeOnChange = activeTab === 'layout' ? onLayoutChange
    : activeTab === 'components' ? onComponentsChange
    : activeTab === 'tokens' ? onTokensChange
    : onDataCodeChange || (() => {})

  // If there are sections and one is active, show only that section's code
  const currentValue = (currentSections.length > 0 && activeSection)
    ? extractSectionCode(fullCode, activeSection)
    : fullCode

  // When editing section code, replace it in full code
  const currentOnChange = useCallback((newCode: string) => {
    if (currentSections.length > 0 && activeSection) {
      const updatedFullCode = replaceSectionCode(fullCode, activeSection, newCode)
      fullCodeOnChange(updatedFullCode)
    } else {
      fullCodeOnChange(newCode)
    }
  }, [currentSections.length, activeSection, fullCode, fullCodeOnChange, replaceSectionCode])

  // Check if data tab has schema definitions (for showing Generate button)
  const dataHasSchemas = useMemo(() => hasSchemas(dataCode), [dataCode])

  // State for data generation
  const [isGeneratingData, setIsGeneratingData] = useState(false)

  // AI prompt state
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Cursor position tracking for context-aware generation
  const cursorPositionRef = useRef<{ line: number; column: number } | null>(null)

  // Surrounding code context for LLM
  const getSurroundingContext = useCallback((line: number) => {
    const lines = layoutCode.split('\n')
    const startLine = Math.max(0, line - 3)
    const endLine = Math.min(lines.length - 1, line + 3)

    return {
      before: lines.slice(startLine, line).join('\n'),
      currentLine: lines[line] || '',
      after: lines.slice(line + 1, endLine + 1).join('\n'),
      lineNumber: line + 1, // 1-indexed for display
    }
  }, [layoutCode])

  // Handle AI generation with context awareness
  const handleGenerate = useCallback(async () => {
    if (!aiPrompt.trim() || isGenerating) return

    setIsGenerating(true)
    try {
      // Build full source code for analysis
      const fullSourceCode = [
        tokensCode.trim(),
        componentsCode.trim(),
        layoutCode.trim()
      ].filter(Boolean).join('\n\n')

      // Get cursor position if we're on the layout tab
      const cursor = activeTab === 'layout' && cursorPositionRef.current
        ? cursorPositionRef.current
        : undefined

      // Build enhanced prompt with cursor context
      let enhancedPrompt = aiPrompt.trim()
      if (cursor) {
        const context = getSurroundingContext(cursor.line)
        // Add explicit cursor context to prompt
        enhancedPrompt = `${aiPrompt.trim()}

[Cursor-Position: Zeile ${context.lineNumber}]
[Code vor Cursor:]
${context.before || '(Anfang des Dokuments)'}
[Aktuelle Zeile:]
${context.currentLine || '(leere Zeile)'}
[Code nach Cursor:]
${context.after || '(Ende des Dokuments)'}`
      }

      // Generate with code intelligence
      const result = await generateWithCodeIntelligence(enhancedPrompt, {
        sourceCode: fullSourceCode,
        cursor,
      })

      if (result.code) {
        const generatedCode = result.code.trim()
        let newCode: string
        let newCursorLine: number | undefined

        if (cursor && result.insertAt) {
          // Insert at cursor position (after current line)
          const lines = layoutCode.split('\n')
          const insertLine = Math.min(cursor.line + 1, lines.length)

          // Ensure proper spacing around inserted code
          const needsNewlineBefore = insertLine > 0 && lines[insertLine - 1]?.trim() !== ''
          const needsNewlineAfter = insertLine < lines.length && lines[insertLine]?.trim() !== ''

          const codeToInsert = (needsNewlineBefore ? '\n' : '') + generatedCode + (needsNewlineAfter ? '\n' : '')
          const codeLines = codeToInsert.split('\n')
          lines.splice(insertLine, 0, ...codeLines)
          newCode = lines.join('\n')

          // Calculate new cursor position (end of inserted code)
          newCursorLine = insertLine + codeLines.length - 1
        } else {
          // Append at end
          newCode = layoutCode.trim()
            ? layoutCode.trimEnd() + '\n\n' + generatedCode
            : generatedCode

          // Cursor at end
          newCursorLine = newCode.split('\n').length - 1
        }

        onLayoutChange(newCode)
        setAiPrompt('')

        // Update cursor position ref for next generation
        if (newCursorLine !== undefined) {
          cursorPositionRef.current = { line: newCursorLine, column: 0 }
        }
      }
    } catch (err) {
      logger.ai.error('AI generation error', err)
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      alert(message)
    } finally {
      setIsGenerating(false)
    }
  }, [aiPrompt, isGenerating, tokensCode, componentsCode, layoutCode, activeTab, onLayoutChange, getSurroundingContext])

  // Track cursor position for context-aware generation (with full position info)
  const handleCursorChange = useCallback((pos: { line: number; column: number }) => {
    cursorPositionRef.current = pos
    // Also call the parent handler if provided (backward compatibility)
    onCursorLineChange?.(pos.line)
  }, [onCursorLineChange])

  // Handle keyboard in prompt
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && aiPrompt.trim() && !isGenerating) {
      e.preventDefault()
      handleGenerate()
    }
  }, [aiPrompt, isGenerating, handleGenerate])

  // Handle data generation for Data tab
  const handleGenerateData = useCallback(async () => {
    if (isGeneratingData || !dataHasSchemas || !onDataCodeChange) return

    setIsGeneratingData(true)
    try {
      const result = await generateDataWithAI(dataCode)
      if (result.success && result.code) {
        // Append generated instances to current code
        const newCode = dataCode.trim() + '\n\n' + result.code
        onDataCodeChange(newCode)
      } else if (result.error) {
        alert(result.error)
      }
    } catch (err) {
      logger.ai.error('Data generation error', err)
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      alert(message)
    } finally {
      setIsGeneratingData(false)
    }
  }, [isGeneratingData, dataHasSchemas, dataCode, onDataCodeChange])

  return (
    <div style={{ padding: '4px 12px 12px 16px', width: `${width}px`, height: '100%', backgroundColor: colors.panel, boxSizing: 'border-box' }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: colors.panel,
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {/* Tab Toggle - hidden in preview mode (pages shown instead) */}
        {!previewMode && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '2px 4px',
          }}>
            <div role="tablist" aria-label="Editor tabs" style={{ display: 'flex', gap: '16px' }}>
              <TabButton
                label="Content"
                isActive={activeTab === 'layout'}
                onClick={() => onTabChange('layout')}
              />
              <TabButton
                label="Components"
                isActive={activeTab === 'components'}
                onClick={() => onTabChange('components')}
              />
              <TabButton
                label="Tokens"
                isActive={activeTab === 'tokens'}
                onClick={() => onTabChange('tokens')}
              />
              <TabButton
                label="Data"
                isActive={activeTab === 'data'}
                onClick={() => onTabChange('data')}
              />
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {activeTab === 'data' && dataHasSchemas && hasApiKey() && (
                <IconButton
                  onClick={handleGenerateData}
                  title="Generate Data"
                  isLoading={isGeneratingData}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                  </svg>
                </IconButton>
              )}
              {/* Save Docs Button - only in docs mode with admin access */}
              {isDocsMode && hasAdminAccess && onSaveDocs && (
                <IconButton
                  onClick={() => onSaveDocs()}
                  title={hasUnsavedDocsChanges ? 'Änderungen speichern' : 'Keine Änderungen'}
                  isLoading={isSavingDocs}
                  color={hasUnsavedDocsChanges ? '#3B82F6' : undefined}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/>
                    <polyline points="7 3 7 8 15 8"/>
                  </svg>
                </IconButton>
              )}
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
          {/* Preview mode: Show sections navigation (same as edit mode for layout tab) */}
          {previewMode && layoutSections.length > 0 && (
            <SubMenu
              items={layoutSections.map(name => ({ id: name, name }))}
              activeId={activeLayoutSection || undefined}
              onSelect={setActiveLayoutSection}
            />
          )}

          {/* Edit mode: Show sections for current tab */}
          {!previewMode && activeTab === 'layout' && layoutSections.length > 0 && (
            <SubMenu
              items={layoutSections.map(name => ({ id: name, name }))}
              activeId={activeLayoutSection || undefined}
              onSelect={setActiveLayoutSection}
            />
          )}

          {!previewMode && activeTab === 'components' && componentSections.length > 0 && (
            <SubMenu
              items={componentSections.map(name => ({ id: name, name }))}
              activeId={activeComponentSection || undefined}
              onSelect={setActiveComponentSection}
            />
          )}

          {!previewMode && activeTab === 'tokens' && tokenSections.length > 0 && (
            <SubMenu
              items={tokenSections.map(name => ({ id: name, name }))}
              activeId={activeTokenSection || undefined}
              onSelect={setActiveTokenSection}
            />
          )}

          {!previewMode && activeTab === 'data' && dataSections.length > 0 && (
            <SubMenu
              items={dataSections.map(name => ({ id: name, name }))}
              activeId={activeDataSection || undefined}
              onSelect={setActiveDataSection}
            />
          )}

          {/* Code Editor - hidden in preview mode */}
          {!previewMode && (
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', paddingLeft: '4px' }}>
              <LazyPromptPanel
              value={currentValue}
              onChange={currentOnChange}
              highlightLine={activeTab === 'layout' ? highlightLine : undefined}
              tab={activeTab === 'tokens' || activeTab === 'data' ? undefined : activeTab}
              getOtherTabCode={activeTab === 'tokens' || activeTab === 'data' ? undefined : () => activeTab === 'layout' ? componentsCode : layoutCode}
              tokensCode={tokensCode}
              designTokens={designTokens}
              autoCompleteMode={autoCompleteMode}
              onPreviewChange={activeTab === 'layout' ? onPreviewChange : undefined}
              onCursorChange={activeTab === 'layout' ? handleCursorChange : undefined}
              />
            </div>
          )}
        </div>

        {/* AI Prompt Footer - hidden in preview mode and docs mode */}
        {!previewMode && !isDocsMode && hasApiKey() && activeTab !== 'data' && (
          <div style={{
              padding: '8px 4px',
              display: 'flex',
              gap: '8px',
              alignItems: 'center',
              flexShrink: 0,
              backgroundColor: colors.panel,
            }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isGenerating ? '#F59E0B' : colors.textMuted}
                strokeWidth="2"
                style={{ flexShrink: 0 }}
              >
                <path d="M12 2a10 10 0 1 0 10 10H12V2Z"/>
                <path d="M12 12 2.1 12"/>
                <path d="m5 19 5-5"/>
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Was soll ich erstellen?"
                aria-label="AI generation prompt"
                disabled={isGenerating}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontFamily: 'system-ui, sans-serif',
                  backgroundColor: isGenerating ? '#252525' : '#1A1A1A',
                  color: isGenerating ? colors.textMuted : colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  outline: 'none',
                  opacity: isGenerating ? 0.7 : 1,
                }}
              />
              {isGenerating && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid #333',
                  borderTop: '2px solid #F59E0B',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  flexShrink: 0,
                }} />
              )}
              <style>{`
                @keyframes spin {
                  to { transform: rotate(360deg); }
                }
              `}</style>
          </div>
        )}

      </div>
    </div>
  )
})
