/**
 * EditorPanel component containing the code editor tabs and AI prompt input.
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { colors } from '../theme'
import { LazyPromptPanel } from './LazyPromptPanel'
import { TabButton, IconButton, SubMenu } from './editor-panel'
import { hasApiKey } from '../lib/ai'
import type { PreviewOverride } from '../hooks/useCodeParsing'
import { hasSchemas } from '../parser/data-parser'
import { generateDataWithAI } from '../lib/ai-data'
import { logger } from '../services/logger'
import type { PageData } from './PageSidebar'
import { translateLine, shouldTranslate, type LineStatus } from '../services/nl-translation'

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
  // Deep Thinking Mode props
  /** Whether deep thinking mode is enabled (Opus 4.5 with full context) */
  deepThinkingEnabled?: boolean
  /** Callback when deep thinking mode changes */
  onDeepThinkingChange?: (enabled: boolean) => void
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
  nlModeEnabled = false,
  onNlModeChange,
  pickerModeEnabled = true,
  onPickerModeChange,
  deepThinkingEnabled = false,
  onDeepThinkingChange,
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

  // NL Mode translation state - tracks which lines are being translated
  const [nlTranslations, setNlTranslations] = useState<Map<number, LineStatus>>(new Map())

  // NL Mode undo history - stores original content before translation
  const [nlUndoHistory, setNlUndoHistory] = useState<Map<number, { original: string; translatedLineCount: number }>>(new Map())

  // Handle NL mode translation
  const handleNlTranslate = useCallback(async (lineIndex: number, content: string, allLines: string[]) => {
    // Skip if line shouldn't be translated
    if (!shouldTranslate(content)) {
      return
    }

    // Mark line as translating
    setNlTranslations(prev => new Map(prev).set(lineIndex, 'translating'))

    try {
      // Build deep thinking options if enabled
      const deepThinkingOptions = deepThinkingEnabled ? {
        enabled: true,
        layoutCode,
        componentsCode,
      } : undefined

      const result = await translateLine(content, allLines, lineIndex, {
        onComplete: (res) => {
          // Set status based on validation result
          const status = res.isValid === false ? 'warning' : 'done'
          setNlTranslations(prev => new Map(prev).set(lineIndex, status))

          // Log validation issues for debugging
          if (res.validationIssues && res.validationIssues.length > 0) {
            logger.ai.warn('NL translation has validation issues', res.validationIssues)
          }

          // Clear status after delay (longer for warnings, even longer for deep thinking success)
          const clearDelay = status === 'warning' ? 4000 : (deepThinkingEnabled ? 3000 : 2000)
          setTimeout(() => {
            setNlTranslations(prev => {
              const next = new Map(prev)
              next.delete(lineIndex)
              return next
            })
          }, clearDelay)
        },
        onError: () => {
          setNlTranslations(prev => new Map(prev).set(lineIndex, 'error'))
          // Clear error status after 3 seconds
          setTimeout(() => {
            setNlTranslations(prev => {
              const next = new Map(prev)
              next.delete(lineIndex)
              return next
            })
          }, 3000)
        },
      }, tokensCode, deepThinkingOptions)

      if (result.code && result.code !== content) {
        // Save original for undo before replacing
        const translatedLines = result.code.split('\n')
        setNlUndoHistory(prev => new Map(prev).set(lineIndex, {
          original: content,
          translatedLineCount: translatedLines.length
        }))

        // Replace the line in layout code
        const lines = layoutCode.split('\n')
        // Handle multi-line results
        lines.splice(lineIndex, 1, ...translatedLines)
        onLayoutChange(lines.join('\n'))
      }
    } catch (err) {
      logger.ai.error('NL translation failed', err)
      setNlTranslations(prev => new Map(prev).set(lineIndex, 'error'))
    }
  }, [layoutCode, componentsCode, onLayoutChange, tokensCode, deepThinkingEnabled])

  // Handle NL mode undo - restore original content
  const handleNlUndo = useCallback((lineIndex: number) => {
    const undoEntry = nlUndoHistory.get(lineIndex)
    if (!undoEntry) return

    const lines = layoutCode.split('\n')
    // Remove the translated lines and restore original
    lines.splice(lineIndex, undoEntry.translatedLineCount, undoEntry.original)
    onLayoutChange(lines.join('\n'))

    // Clear undo history and status for this line
    setNlUndoHistory(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })
    setNlTranslations(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })
  }, [layoutCode, onLayoutChange, nlUndoHistory])

  // Track cursor position for context-aware generation (with full position info)
  const handleCursorChange = useCallback((pos: { line: number; column: number }) => {
    // Also call the parent handler if provided (backward compatibility)
    onCursorLineChange?.(pos.line)
  }, [onCursorLineChange])

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
            <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', marginLeft: '-4px' }}>
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
              nlModeEnabled={nlModeEnabled}
              onNlTranslate={handleNlTranslate}
              nlTranslations={nlTranslations}
              pickerModeEnabled={pickerModeEnabled}
              />
            </div>
          )}
        </div>

        {/* Editor Mode Toggles - shown in all tabs */}
        {!previewMode && (
          <div
            style={{
              padding: '6px 8px',
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexShrink: 0,
              backgroundColor: colors.panel,
            }}
          >
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              {/* NL Mode Toggle */}
              <div
                onClick={() => onNlModeChange?.(!nlModeEnabled)}
                title={nlModeEnabled ? 'Natural Language – Enter übersetzt Freitext zu DSL (aktiv)' : 'Natural Language – Enter übersetzt Freitext zu DSL'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '24px',
                  padding: '0 10px',
                  backgroundColor: nlModeEnabled ? '#3B82F620' : 'transparent',
                  borderRadius: '4px',
                  border: nlModeEnabled ? 'none' : `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {/* Zap icon */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={nlModeEnabled ? '#3B82F6' : colors.textMuted} strokeWidth="2.5">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <span style={{ fontSize: '11px', color: nlModeEnabled ? '#3B82F6' : colors.textMuted, fontWeight: 500 }}>
                  LLM
                </span>
              </div>

              {/* Deep Thinking Toggle - only shown when NL is enabled */}
              {nlModeEnabled && (
                <div
                  onClick={() => onDeepThinkingChange?.(!deepThinkingEnabled)}
                  title={deepThinkingEnabled
                    ? 'Deep Thinking – Opus 4.5 mit vollem Kontext (aktiv, ~3-5s)'
                    : 'Deep Thinking – Opus 4.5 für komplexe Komponenten (~3-5s)'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '24px',
                    padding: '0 10px',
                    backgroundColor: deepThinkingEnabled ? '#8B5CF620' : 'transparent',
                    borderRadius: '4px',
                    border: deepThinkingEnabled ? 'none' : `1px solid ${colors.border}`,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Brain icon for deep thinking */}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={deepThinkingEnabled ? '#8B5CF6' : colors.textMuted} strokeWidth="2">
                    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/>
                    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/>
                    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/>
                    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/>
                    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/>
                    <path d="M3.477 10.896a4 4 0 0 1 .585-.396"/>
                    <path d="M19.938 10.5a4 4 0 0 1 .585.396"/>
                    <path d="M6 18a4 4 0 0 1-1.967-.516"/>
                    <path d="M19.967 17.484A4 4 0 0 1 18 18"/>
                  </svg>
                  <span style={{ fontSize: '11px', color: deepThinkingEnabled ? '#8B5CF6' : colors.textMuted, fontWeight: 500 }}>
                    Deep
                  </span>
                </div>
              )}

              {/* Autocomplete Toggle - with spacing from NL/DT group */}
              <div
                onClick={() => onPickerModeChange?.(!pickerModeEnabled)}
                title={pickerModeEnabled ? 'Autocomplete – Vorschläge beim Tippen (aktiv)' : 'Autocomplete – Vorschläge beim Tippen'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  height: '24px',
                  padding: '0 10px',
                  marginLeft: '12px',
                  backgroundColor: pickerModeEnabled ? '#10B98120' : 'transparent',
                  borderRadius: '4px',
                  border: pickerModeEnabled ? 'none' : `1px solid ${colors.border}`,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {/* List icon for autocomplete */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={pickerModeEnabled ? '#10B981' : colors.textMuted} strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <span style={{ fontSize: '11px', color: pickerModeEnabled ? '#10B981' : colors.textMuted, fontWeight: 500 }}>
                  Assist
                </span>
              </div>
            </div>

            {/* NL Translation Status & Undo */}
            {nlModeEnabled && (nlTranslations.size > 0 || nlUndoHistory.size > 0) && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {/* Show undo button if there's undo history */}
                {nlUndoHistory.size > 0 && (
                  <button
                    onClick={() => {
                      // Undo the most recent translation
                      const lastKey = Array.from(nlUndoHistory.keys()).pop()
                      if (lastKey !== undefined) handleNlUndo(lastKey)
                    }}
                    title="Letzte Übersetzung rückgängig (Undo)"
                    style={{
                      height: '24px',
                      padding: '0 8px',
                      borderRadius: '4px',
                      backgroundColor: 'transparent',
                      border: `1px solid ${colors.border}`,
                      color: colors.textMuted,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      boxSizing: 'border-box',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 7v6h6"/>
                      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13"/>
                    </svg>
                  </button>
                )}
                {/* Translation status indicators */}
                {Array.from(nlTranslations.entries()).map(([line, status]) => {
                  const statusConfig = {
                    translating: { bg: '#F59E0B20', color: '#F59E0B', label: '...', title: 'Übersetze...' },
                    done: { bg: '#10B98120', color: '#10B981', label: '✓', title: 'Übersetzt & validiert' },
                    warning: { bg: '#F59E0B20', color: '#F59E0B', label: '⚠', title: 'Übersetzt, aber Validierungsprobleme' },
                    error: { bg: '#EF444420', color: '#EF4444', label: '✗', title: 'Fehler bei Übersetzung' },
                    pending: { bg: '#6B728020', color: '#6B7280', label: '○', title: 'Warte...' },
                  }
                  const config = statusConfig[status]
                  return (
                    <span
                      key={line}
                      title={config.title}
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '4px 10px',
                        borderRadius: '4px',
                        backgroundColor: config.bg,
                        color: config.color,
                        cursor: 'help',
                      }}
                    >
                      {config.label}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )}


      </div>
    </div>
  )
})
