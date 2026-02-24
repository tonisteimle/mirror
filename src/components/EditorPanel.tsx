/**
 * EditorPanel component containing the code editor tabs and AI prompt input.
 */

import { memo, useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { colors } from '../theme'
import { LazyPromptPanel } from './LazyPromptPanel'
import type { PromptPanelRef } from './PromptPanel'
import { TabButton, IconButton } from './editor-panel'
import { hasApiKey } from '../lib/ai'
import type { PreviewOverride } from '../hooks/useCodeParsing'
import { hasSchemas } from '../parser/data-parser'
import { generateDataWithAI } from '../lib/ai-data'
import { logger } from '../services/logger'
import { PageSidebar, type PageData } from './PageSidebar'
import { translateLine, type LineStatus } from '../services/nl-translation'
import { parse } from '../parser/parser'
import { applyAllFixes, validateMirrorCode } from '../lib/self-healing'
import { transformCode } from '../editor/shorthand-expansion'
import { clearDecorationCache } from '../editor/dsl-syntax'
import {
  getPropertyAtCursor,
  getComponentAtLine,
  getComponentBlock,
  getCurrentLineNumber,
  getCurrentLineText,
  generateTokenName,
  createTokenDefinition,
  createComponentDefinition,
  createComponentUsage,
  createComponentDefinitionWithChildren,
  replaceInEditor,
  replaceCurrentLine,
  replaceLines,
} from '../editor'

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
  // Picker Mode props
  /** Whether picker mode is enabled (autocomplete suggestions) */
  pickerModeEnabled?: boolean
  /** Callback when picker mode changes */
  onPickerModeChange?: (enabled: boolean) => void
  // Shorthand expansion props
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
  onDeletePage,
  onRenamePage,
  referencedPages = new Set(),
  pickerModeEnabled = true,
  onPickerModeChange,
  expandShorthand = true,
  onExpandShorthandChange,
  useTokenMode,
  onTokenModeChange,
  llmEnabled = true,
  onLlmEnabledChange,
}: EditorPanelProps) {
  // Delete error state for page management
  const [deleteError, setDeleteError] = useState<{ pageId: string; references: string[] } | null>(null)

  // AI generation state (for footer indicator)
  const [isAiGenerating, setIsAiGenerating] = useState(false)
  const [aiProgress, setAiProgress] = useState<{ currentStep: number; totalSteps: number; currentComponent: string } | undefined>()

  // Ref to the PromptPanel for triggering decoration refresh
  const promptPanelRef = useRef<PromptPanelRef>(null)

  // State for smooth transition during short/long toggle
  const [isTransforming, setIsTransforming] = useState(false)

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

  // Determine current full code and change handler based on active tab
  const fullCode = activeTab === 'layout' ? layoutCode
    : activeTab === 'components' ? componentsCode
    : activeTab === 'tokens' ? tokensCode
    : dataCode
  const fullCodeOnChange = activeTab === 'layout' ? onLayoutChange
    : activeTab === 'components' ? onComponentsChange
    : activeTab === 'tokens' ? onTokensChange
    : onDataCodeChange || (() => {})

  // Current code value and change handler
  const currentValue = fullCode
  const currentOnChange = fullCodeOnChange

  // Check if data tab has schema definitions (for showing Generate button)
  const dataHasSchemas = useMemo(() => hasSchemas(dataCode), [dataCode])

  // State for data generation
  const [isGeneratingData, setIsGeneratingData] = useState(false)

  // NL Mode translation state - tracks which lines are being translated
  const [nlTranslations, setNlTranslations] = useState<Map<number, LineStatus>>(new Map())

  // NL Mode undo history - stores original content before translation
  const [nlUndoHistory, setNlUndoHistory] = useState<Map<number, { original: string; translatedLineCount: number }>>(new Map())

  // NL Mode retry data - stores failed translation info for retry
  const [nlRetryData, setNlRetryData] = useState<Map<number, { content: string; allLines: string[] }>>(new Map())

  // Refs for NL translation timeout cleanup (K2 fix: prevent memory leaks)
  const nlTimeoutRefs = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const isMountedRef = useRef(true)

  // Cleanup NL timeouts on unmount
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      for (const timeoutId of nlTimeoutRefs.current) {
        clearTimeout(timeoutId)
      }
      nlTimeoutRefs.current.clear()
    }
  }, [])

  // Handle line validation and LLM translation
  // Flow: Parse → Self-Healing → LLM (only if healing fails)
  const handleNlTranslate = useCallback(async (lineIndex: number, content: string, allLines: string[]) => {
    const trimmed = content.trim()

    console.log('[NL Debug] handleNlTranslate called:', { lineIndex, content: trimmed.substring(0, 50) })

    // Skip empty lines, comments, section headers
    if (!trimmed || trimmed.startsWith('//') || (trimmed.startsWith('---') && trimmed.endsWith('---'))) {
      console.log('[NL Debug] Skipped: empty/comment/header')
      return
    }

    // Skip indented lines (children depend on context)
    if (content.startsWith('  ') || content.startsWith('\t')) {
      console.log('[NL Debug] Skipped: indented line')
      return
    }

    // Step 1: Try to parse
    try {
      const parseResult = parse(content)
      console.log('[NL Debug] Parse result:', { errors: parseResult.errors?.length, nodes: parseResult.nodes?.length, registry: parseResult.registry?.size })

      // If no errors and has nodes/registry → valid DSL, skip
      if ((!parseResult.errors || parseResult.errors.length === 0) &&
          ((parseResult.nodes && parseResult.nodes.length > 0) ||
           (parseResult.registry && parseResult.registry.size > 0))) {
        console.log('[NL Debug] Valid DSL, skipping LLM')
        return
      }
    } catch (e) {
      console.log('[NL Debug] Parse exception:', e)
      // Parse threw exception, continue to self-healing
    }

    // Step 2: Try self-healing
    console.log('[NL Debug] Trying self-healing')
    const healed = applyAllFixes(content)
    const validation = validateMirrorCode(healed, false, 'de')

    if (validation.valid) {
      // Self-healing worked! Replace the line with healed version
      logger.ai.debug('Self-healing fixed the line', { original: trimmed, healed: healed.trim() })

      if (healed.trim() !== trimmed) {
        const lines = layoutCode.split('\n')
        lines[lineIndex] = healed.trim()
        onLayoutChange(lines.join('\n'))
      }
      return
    }

    // Step 3: Self-healing failed → call LLM
    console.log('[NL Debug] Self-healing failed, calling LLM')
    logger.ai.debug('Self-healing failed, calling LLM', { content: trimmed, issues: validation.issues })

    // Prevent concurrent translations of the same line
    const currentStatus = nlTranslations.get(lineIndex)
    if (currentStatus === 'translating') {
      logger.ai.debug('Skipped - line already translating', { lineIndex })
      return
    }

    // Mark line as translating
    setNlTranslations(prev => new Map(prev).set(lineIndex, 'translating'))

    // Clear any previous retry data for this line
    setNlRetryData(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })

    try {
      // Build context options
      const contextOptions = {
        enabled: false,
        layoutCode,
        componentsCode,
      }

      const result = await translateLine(content, allLines, lineIndex, {
        onComplete: (res) => {
          if (!isMountedRef.current) return
          // Set status based on validation result
          const status = res.isValid === false ? 'warning' : 'done'
          setNlTranslations(prev => new Map(prev).set(lineIndex, status))

          // Log validation issues for debugging
          if (res.validationIssues && res.validationIssues.length > 0) {
            logger.ai.warn('NL translation has validation issues', res.validationIssues)
          }

          // Clear status after delay (longer for warnings)
          const clearDelay = status === 'warning' ? 4000 : 2000
          const timeoutId = setTimeout(() => {
            nlTimeoutRefs.current.delete(timeoutId)
            if (!isMountedRef.current) return
            setNlTranslations(prev => {
              const next = new Map(prev)
              next.delete(lineIndex)
              return next
            })
          }, clearDelay)
          nlTimeoutRefs.current.add(timeoutId)
        },
        onError: () => {
          if (!isMountedRef.current) return
          setNlTranslations(prev => new Map(prev).set(lineIndex, 'error'))
          // Store retry data so user can retry
          setNlRetryData(prev => new Map(prev).set(lineIndex, { content, allLines }))
          // Keep error status visible longer (don't auto-clear - let user dismiss or retry)
        },
      }, tokensCode, contextOptions)

      if (result.code && result.code !== content) {
        // Transform LLM output to match current short/long mode
        // LLM always outputs long form, so transform to short if needed
        const transformedCode = expandShorthand ? result.code : transformCode(result.code, false)

        // Save original for undo before replacing
        const translatedLines = transformedCode.split('\n')
        setNlUndoHistory(prev => new Map(prev).set(lineIndex, {
          original: content,
          translatedLineCount: translatedLines.length
        }))

        // Replace the line in layout code
        const lines = layoutCode.split('\n')
        // Handle multi-line results
        lines.splice(lineIndex, 1, ...translatedLines)
        onLayoutChange(lines.join('\n'))

        // Move cursor to the line after the translated content
        // Use longer timeout to ensure editor has synced with new content
        setTimeout(() => {
          const view = promptPanelRef.current?.getEditorView()
          if (!view) return

          const doc = view.state.doc
          const newCursorLine = lineIndex + translatedLines.length

          // Calculate proper indentation based on translated content
          // Use the indentation of the last translated line as reference
          const lastTranslatedLine = translatedLines[translatedLines.length - 1]
          const indentMatch = lastTranslatedLine.match(/^(\s*)/)
          const baseIndent = indentMatch ? indentMatch[1] : ''

          // For child components, add one level of indentation (2 spaces)
          // If the last line has content (not just whitespace), indent for potential child
          const shouldAddChildIndent = lastTranslatedLine.trim().length > 0 &&
            !lastTranslatedLine.trim().startsWith('//') &&
            !lastTranslatedLine.trim().startsWith('---')
          const newLineIndent = shouldAddChildIndent ? baseIndent + '  ' : baseIndent

          // If target line doesn't exist, add a new line with proper indentation
          if (newCursorLine >= doc.lines) {
            view.dispatch({
              changes: { from: doc.length, to: doc.length, insert: '\n' + newLineIndent },
              selection: { anchor: doc.length + 1 + newLineIndent.length },
              scrollIntoView: true,
            })
            view.focus()
          } else {
            // Position cursor at the existing line, but with proper indentation
            const targetLine = doc.line(newCursorLine + 1)
            const existingIndent = targetLine.text.match(/^(\s*)/)?.[1] || ''

            // If next line is empty or has only whitespace, add proper indentation
            if (targetLine.text.trim() === '') {
              view.dispatch({
                changes: { from: targetLine.from, to: targetLine.to, insert: newLineIndent },
                selection: { anchor: targetLine.from + newLineIndent.length },
                scrollIntoView: true,
              })
            } else {
              // Next line has content, just position cursor at start of content
              view.dispatch({
                selection: { anchor: targetLine.from + existingIndent.length },
                scrollIntoView: true,
              })
            }
            view.focus()
          }
        }, 100)
      }
    } catch (err) {
      logger.ai.error('NL translation failed', err)
      setNlTranslations(prev => new Map(prev).set(lineIndex, 'error'))
    }
  }, [layoutCode, componentsCode, onLayoutChange, tokensCode, expandShorthand, nlTranslations])

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

  // Handle NL mode retry - retry a failed translation
  const handleNlRetry = useCallback((lineIndex: number) => {
    const retryEntry = nlRetryData.get(lineIndex)
    if (!retryEntry) return

    // Clear error status and retry data
    setNlTranslations(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })
    setNlRetryData(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })

    // Retry the translation
    handleNlTranslate(lineIndex, retryEntry.content, retryEntry.allLines)
  }, [nlRetryData, handleNlTranslate])

  // Handle NL mode dismiss error - just clear the error without retry
  const handleNlDismissError = useCallback((lineIndex: number) => {
    setNlTranslations(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })
    setNlRetryData(prev => {
      const next = new Map(prev)
      next.delete(lineIndex)
      return next
    })
  }, [])

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

  // Handle Extract to Token
  const handleExtractToken = useCallback(() => {
    const view = promptPanelRef.current?.getEditorView()
    if (!view) return

    // Get property at cursor
    const propInfo = getPropertyAtCursor(view)
    if (!propInfo) {
      logger.ui.warn('No property found at cursor')
      return
    }

    // Get component name from current line
    const lineText = getCurrentLineText(view)
    const componentInfo = getComponentAtLine(lineText)
    const componentName = componentInfo?.name || 'token'

    // Generate token name and definition
    const tokenName = generateTokenName(componentName, propInfo.property)
    const tokenDef = createTokenDefinition(tokenName, propInfo.value)

    // Add token to tokens code (at the end)
    const newTokensCode = tokensCode.trim()
      ? `${tokensCode.trim()}\n${tokenDef}`
      : tokenDef
    onTokensChange(newTokensCode)

    // Replace value in editor with token reference
    replaceInEditor(view, propInfo.valueStart, propInfo.valueEnd, tokenName)
  }, [tokensCode, onTokensChange])

  // Handle Extract Component (with optional children via shift key)
  const handleExtractComponent = useCallback((includeChildren: boolean) => {
    const view = promptPanelRef.current?.getEditorView()
    if (!view) return

    const lineNum = getCurrentLineNumber(view)
    const lineText = getCurrentLineText(view)

    // Get component info
    const componentInfo = getComponentAtLine(lineText)
    if (!componentInfo) {
      logger.ui.warn('No component found at cursor line')
      return
    }

    if (includeChildren) {
      // Extract component with children
      const blockInfo = getComponentBlock(view, lineNum)
      if (!blockInfo || !blockInfo.componentInfo) return

      // Create definition with children
      const definition = createComponentDefinitionWithChildren(blockInfo)

      // Add to components code
      const newComponentsCode = componentsCode.trim()
        ? `${componentsCode.trim()}\n\n${definition}`
        : definition
      onComponentsChange(newComponentsCode)

      // Replace block with simple usage (just component name)
      const usage = ' '.repeat(blockInfo.componentInfo.indent) + blockInfo.componentInfo.name
      replaceLines(view, blockInfo.startLine, blockInfo.endLine, usage)
    } else {
      // Extract single component line
      // Create definition (without text content)
      const definition = createComponentDefinition(componentInfo)

      // Add to components code
      const newComponentsCode = componentsCode.trim()
        ? `${componentsCode.trim()}\n\n${definition}`
        : definition
      onComponentsChange(newComponentsCode)

      // Replace with usage (just name and text)
      const usage = ' '.repeat(componentInfo.indent) + createComponentUsage(componentInfo)
      replaceCurrentLine(view, usage)
    }
  }, [componentsCode, onComponentsChange])

  return (
    <div
      data-testid="editor-panel"
      style={{ padding: '4px 12px 12px 16px', width: `${width}px`, height: '100%', backgroundColor: colors.panel, borderRight: '1px solid #1a1a1a', boxSizing: 'border-box' }}
    >
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
              {/* Undo/Redo - always visible */}
              <IconButton
                onClick={() => {
                  const view = promptPanelRef.current?.getEditorView()
                  if (view) {
                    import('@codemirror/commands').then(({ undo }) => undo(view))
                  }
                }}
                title="Undo (⌘Z)"
                preventFocusLoss
                color="#666"
              >
                {/* Undo icon from Lucide */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v6h6"/>
                  <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
                </svg>
              </IconButton>
              <IconButton
                onClick={() => {
                  const view = promptPanelRef.current?.getEditorView()
                  if (view) {
                    import('@codemirror/commands').then(({ redo }) => redo(view))
                  }
                }}
                title="Redo (⌘⇧Z)"
                preventFocusLoss
                color="#666"
              >
                {/* Redo icon from Lucide */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 7v6h-6"/>
                  <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
                </svg>
              </IconButton>
              {activeTab === 'data' && dataHasSchemas && hasApiKey() && llmEnabled && (
                <IconButton
                  onClick={() => handleGenerateData()}
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
          {/* Page navigation - shown when multiple pages exist, OUTSIDE the sections container */}
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

          {/* Code Editor - hidden in preview mode */}
          {!previewMode && (
            <div style={{
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
              marginLeft: 0,
              visibility: isTransforming ? 'hidden' : 'visible',
              cursor: isAiGenerating ? 'wait' : undefined,
            }}>
              <LazyPromptPanel
              key={activeTab}
              ref={promptPanelRef}
              value={currentValue}
              onChange={currentOnChange}
              highlightLine={activeTab === 'layout' ? highlightLine : undefined}
              tab={activeTab === 'tokens' || activeTab === 'data' ? undefined : activeTab}
              getOtherTabCode={activeTab === 'tokens' || activeTab === 'data' ? undefined : () => activeTab === 'layout' ? componentsCode : layoutCode}
              tokensCode={tokensCode}
              componentsCode={componentsCode}
              layoutCode={layoutCode}
              designTokens={designTokens}
              autoCompleteMode={autoCompleteMode}
              onPreviewChange={activeTab === 'layout' ? onPreviewChange : undefined}
              onCursorChange={activeTab === 'layout' ? handleCursorChange : undefined}
              nlModeEnabled={hasApiKey() && llmEnabled}
              onNlTranslate={handleNlTranslate}
              nlTranslations={nlTranslations}
              pickerModeEnabled={pickerModeEnabled}
              expandShorthand={expandShorthand}
              onAiGenerating={(generating, progress) => {
                setIsAiGenerating(generating)
                setAiProgress(progress)
              }}
              onDataCodeGenerated={onDataCodeChange}
              useTokenMode={useTokenMode}
              onTokenModeChange={onTokenModeChange}
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
              {/* LLM Toggle - shows generation progress when active, otherwise clickable toggle */}
              {isAiGenerating ? (
                <div
                  title={aiProgress?.currentComponent
                    ? `Generiere ${aiProgress.currentStep}/${aiProgress.totalSteps}: ${aiProgress.currentComponent}`
                    : 'KI generiert...'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    height: '20px',
                    padding: '0 8px',
                    backgroundColor: '#3B82F620',
                    borderRadius: '4px',
                    cursor: 'default',
                  }}
                >
                  {/* Animated spinner */}
                  <div style={{
                    width: '10px',
                    height: '10px',
                    border: '2px solid #3B82F640',
                    borderTopColor: '#3B82F6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <span style={{ fontSize: '10px', color: '#3B82F6', fontWeight: 500 }}>
                    {aiProgress?.totalSteps && aiProgress.totalSteps > 1
                      ? `${aiProgress.currentStep}/${aiProgress.totalSteps}: ${aiProgress.currentComponent || 'Generiere...'}`
                      : aiProgress?.currentComponent || 'Generiere...'}
                  </span>
                </div>
              ) : (
                <div
                  onClick={() => hasApiKey() && onLlmEnabledChange?.(!llmEnabled)}
                  title={!hasApiKey()
                    ? 'LLM nicht verfügbar – API Key fehlt'
                    : llmEnabled
                      ? 'LLM aktiv – Klick zum Deaktivieren'
                      : 'LLM deaktiviert – Klick zum Aktivieren'}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    height: '20px',
                    padding: '0 8px',
                    backgroundColor: hasApiKey() && llmEnabled ? '#3B82F620' : 'transparent',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: hasApiKey() ? 'pointer' : 'not-allowed',
                    opacity: hasApiKey() ? 1 : 0.4,
                    boxSizing: 'border-box',
                  }}
                >
                  {/* Status dot */}
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: hasApiKey() && llmEnabled ? '#1E4A7A' : colors.textMuted,
                  }} />
                  <span style={{ fontSize: '10px', color: hasApiKey() && llmEnabled ? '#1E4A7A' : colors.textMuted, fontWeight: 500 }}>
                    LLM
                  </span>
                </div>
              )}

              {/* Autocomplete Toggle */}
              <div
                onClick={() => onPickerModeChange?.(!pickerModeEnabled)}
                title={pickerModeEnabled ? 'Autocomplete – Vorschläge beim Tippen (aktiv) ⌥K' : 'Autocomplete – Vorschläge beim Tippen ⌥K'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '20px',
                  padding: '0 8px',
                  backgroundColor: pickerModeEnabled ? '#10B98120' : 'transparent',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {/* List icon for autocomplete */}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={pickerModeEnabled ? '#0A5540' : colors.textMuted} strokeWidth="2.5">
                  <line x1="8" y1="6" x2="21" y2="6"/>
                  <line x1="8" y1="12" x2="21" y2="12"/>
                  <line x1="8" y1="18" x2="21" y2="18"/>
                  <line x1="3" y1="6" x2="3.01" y2="6"/>
                  <line x1="3" y1="12" x2="3.01" y2="12"/>
                  <line x1="3" y1="18" x2="3.01" y2="18"/>
                </svg>
                <span style={{ fontSize: '10px', color: pickerModeEnabled ? '#0A5540' : colors.textMuted, fontWeight: 500 }}>
                  Assist
                </span>
              </div>

              {/* Shorthand Expansion Toggle */}
              <div
                onClick={() => {
                  const newMode = !expandShorthand
                  // Hide editor immediately
                  setIsTransforming(true)

                  // Transform all code tabs
                  onLayoutChange(transformCode(layoutCode, newMode))
                  onComponentsChange(transformCode(componentsCode, newMode))
                  onTokensChange(transformCode(tokensCode, newMode))
                  clearDecorationCache()
                  onExpandShorthandChange?.(newMode)

                  // Show editor after decorations are ready
                  setTimeout(() => {
                    promptPanelRef.current?.refreshDecorations()
                    setIsTransforming(false)
                  }, 100)
                }}
                title={expandShorthand
                  ? 'Langform aktiv – Klick zum Deaktivieren'
                  : 'Langform deaktiviert – Klick zum Aktivieren'}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '20px',
                  padding: '0 8px',
                  backgroundColor: expandShorthand ? '#F59E0B20' : 'transparent',
                  borderRadius: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                {/* Text/Expand icon */}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={expandShorthand ? '#7A4A08' : colors.textMuted} strokeWidth="2.5">
                  <path d="M4 7V4h16v3"/>
                  <path d="M9 20h6"/>
                  <path d="M12 4v16"/>
                </svg>
                <span style={{ fontSize: '10px', color: expandShorthand ? '#7A4A08' : colors.textMuted, fontWeight: 500 }}>
                  Long
                </span>
              </div>

            </div>

            {/* NL Translation Status & Undo */}
            {hasApiKey() && (nlTranslations.size > 0 || nlUndoHistory.size > 0) && (
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {/* Show translating indicator */}
                {Array.from(nlTranslations.values()).some(s => s === 'translating') && (
                  <span
                    title="Übersetze..."
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      fontWeight: 500,
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#3B82F620',
                      color: '#3B82F6',
                    }}
                  >
                    <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>●</span>
                    Translating
                  </span>
                )}
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
                      height: '20px',
                      padding: '0 6px',
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
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M3 7v6h6"/>
                      <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.36 2.64L3 13"/>
                    </svg>
                  </button>
                )}
                {/* Translation status indicators (translating status shown inline in editor) */}
                {Array.from(nlTranslations.entries())
                  .filter(([, status]) => status !== 'translating') // translating spinner shown inline
                  .map(([line, status]) => {
                  const statusConfig: Record<string, { bg: string; color: string; label: string; title: string }> = {
                    done: { bg: '#10B98120', color: '#10B981', label: '✓', title: 'Übersetzt' },
                    warning: { bg: '#F59E0B20', color: '#F59E0B', label: '⚠', title: 'Übersetzt, aber Validierungsprobleme' },
                    error: { bg: '#EF444420', color: '#EF4444', label: '✗', title: 'Fehler bei Übersetzung' },
                    pending: { bg: '#6B728020', color: '#6B7280', label: '○', title: 'Warte...' },
                  }
                  const config = statusConfig[status]
                  if (!config) return null

                  // For errors, show retry and dismiss buttons
                  if (status === 'error') {
                    const hasRetryData = nlRetryData.has(line)
                    return (
                      <span
                        key={line}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: 500,
                          padding: '3px 6px',
                          borderRadius: '4px',
                          backgroundColor: config.bg,
                          color: config.color,
                        }}
                      >
                        <span title={config.title}>{config.label}</span>
                        {hasRetryData && (
                          <button
                            onClick={() => handleNlRetry(line)}
                            title="Erneut versuchen"
                            style={{
                              padding: '0 4px',
                              marginLeft: '2px',
                              background: 'transparent',
                              border: 'none',
                              color: 'inherit',
                              cursor: 'pointer',
                              fontSize: '10px',
                              fontWeight: 600,
                            }}
                          >
                            ↻
                          </button>
                        )}
                        <button
                          onClick={() => handleNlDismissError(line)}
                          title="Schließen"
                          style={{
                            padding: '0 2px',
                            background: 'transparent',
                            border: 'none',
                            color: 'inherit',
                            cursor: 'pointer',
                            fontSize: '10px',
                            opacity: 0.7,
                          }}
                        >
                          ×
                        </button>
                      </span>
                    )
                  }

                  return (
                    <span
                      key={line}
                      title={config.title}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontWeight: 500,
                        padding: '3px 8px',
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

            {/* AI Generation Status - shown inline in InlineAiPanel */}
          </div>
        )}


      </div>
    </div>
  )
})
