import { useEffect, useCallback, useRef, useMemo, useState } from 'react'
import { logger } from '../services/logger'
import type { PageData } from '../components/PageSidebar'
import { isLibraryComponent, getLibraryDefinitions } from '../library/registry'
import { defaultComponentsCode, defaultTokensCode } from './useEditor'
import { STORAGE_KEYS } from '../constants'
import { useHistory } from './useHistory'
import { usePageManager } from './usePageManager'
import { useProjectStorage } from './useProjectStorage'
import { useEditorState } from './useEditorState'
import { usePanelResize } from './usePanelResize'
import { useDialogs } from './useDialogs'
import { useCodeParsing, type PreviewOverride } from './useCodeParsing'
import type { EditorActions } from '../contexts'

/** View mode for the app: edit (full), preview (pages only), fullscreen (preview only) */
export type ViewMode = 'edit' | 'preview' | 'fullscreen'

/**
 * Central app state hook that composes all domain-specific hooks.
 * This reduces complexity in App.tsx by aggregating state management.
 */
export function useAppState() {
  // View mode (edit, preview, fullscreen)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')

  // Token mode for panels (project-specific setting)
  const [useTokenMode, setUseTokenMode] = useState<boolean>(false)

  // Editor settings (project-specific, persisted with project)
  const [pickerModeEnabled, setPickerModeEnabled] = useState<boolean>(true)
  const [expandShorthand, setExpandShorthand] = useState<boolean>(true)

  // Page management
  const pageManager = usePageManager()
  const { pages, currentPageId, layoutCode, setLayoutCode } = pageManager

  // Editor state (tabs, code, autocomplete, data)
  const editor = useEditorState()
  const { componentsCode, setComponentsCode, tokensCode, setTokensCode, dataCode, setDataCode, dataSchemas, dataRecords } = editor

  // Panel resize
  const panel = usePanelResize()

  // Dialogs (error, settings)
  const dialogs = useDialogs()

  // Live preview for pickers (color, font, icon)
  const [previewOverride, setPreviewOverride] = useState<PreviewOverride | null>(null)

  // Track cursor line for diagnostic suppression while typing
  const [activeCursorLine, setActiveCursorLine] = useState<number | null>(null)


  // Code parsing - always show current page with all components and tokens
  const parsing = useCodeParsing(tokensCode, componentsCode, layoutCode, {
    debounceMs: 150,
    previewOverride,
    activeCursorLine,
  })

  // History for undo/redo
  const history = useHistory({ layoutCode, componentsCode })
  const isRestoringRef = useRef(false)
  const historyRef = useRef(history)
  historyRef.current = history

  // Push state to history when code changes (but not when restoring from undo/redo)
  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false
      return
    }
    history.pushState({ layoutCode, componentsCode })
  }, [layoutCode, componentsCode, history.pushState])

  // Keyboard shortcuts for undo/redo and view modes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape always works - exit preview/fullscreen modes
      if (e.key === 'Escape') {
        if (viewMode !== 'edit') {
          e.preventDefault()
          setViewMode('edit')
          return
        }
      }

      // Option+K (Mac) / Alt+K (Windows) - Toggle Autocomplete/Picker Mode (works even in editor)
      if (e.altKey && !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPickerModeEnabled(!pickerModeEnabled)
        return
      }

      // Don't trigger other shortcuts when typing in inputs or CodeMirror
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.cm-editor')) {
        return
      }

      // Cmd+. (Mac) or Ctrl+. - Toggle preview mode
      if ((e.metaKey || e.ctrlKey) && e.key === '.') {
        e.preventDefault()
        if (e.shiftKey) {
          // Cmd+Shift+. - Toggle fullscreen mode
          setViewMode(prev => prev === 'fullscreen' ? 'edit' : 'fullscreen')
        } else {
          // Cmd+. - Toggle preview mode
          setViewMode(prev => prev === 'preview' ? 'edit' : 'preview')
        }
        return
      }

      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo: Cmd+Shift+Z
          e.preventDefault()
          const state = historyRef.current.redo()
          if (state) {
            isRestoringRef.current = true
            setLayoutCode(state.layoutCode)
            setComponentsCode(state.componentsCode)
          }
        } else {
          // Undo: Cmd+Z
          e.preventDefault()
          const state = historyRef.current.undo()
          if (state) {
            isRestoringRef.current = true
            setLayoutCode(state.layoutCode)
            setComponentsCode(state.componentsCode)
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setLayoutCode, setComponentsCode, viewMode, pickerModeEnabled])

  // Auto-import library component definitions when used in layout
  useEffect(() => {
    // Find all component names used in layout (lines starting with ComponentName or indented ComponentName)
    const componentNames = new Set<string>()
    for (const line of layoutCode.split('\n')) {
      const match = line.match(/^\s*([A-Z][a-zA-Z0-9]*)/)
      if (match) {
        componentNames.add(match[1])
      }
    }

    // Check for library components that need definitions
    const missingDefinitions: string[] = []
    for (const name of componentNames) {
      if (isLibraryComponent(name)) {
        // Check if definitions already exist (look for the comment marker)
        const marker = `// ${name}`
        if (!componentsCode.includes(marker)) {
          const defs = getLibraryDefinitions(name)
          if (defs) {
            missingDefinitions.push(defs)
          }
        }
      }
    }

    // Add missing definitions
    if (missingDefinitions.length > 0) {
      const newDefs = missingDefinitions.join('\n\n')
      const newCode = componentsCode ? componentsCode + '\n\n' + newDefs : newDefs
      setComponentsCode(newCode)
    }
  }, [layoutCode, componentsCode, setComponentsCode])

  const handleClear = useCallback(() => {
    setLayoutCode('')
    setComponentsCode('')
  }, [setLayoutCode, setComponentsCode])

  // Create empty prototype with dark/light themes
  const handleNewEmpty = useCallback(() => {
    const emptyPage = { id: 'page-1', name: 'Page 1', layoutCode: '' }
    pageManager.loadProject({
      pages: [emptyPage],
      currentPageId: 'page-1',
      layoutCode: '',
    })
    // Use bound token format from defaults
    setTokensCode(defaultTokensCode)
    setComponentsCode(defaultComponentsCode)
    setDataCode('')
  }, [pageManager, setComponentsCode, setTokensCode, setDataCode])

  // Memoize editor actions for context
  const editorActions: EditorActions = useMemo(() => ({
    onClear: handleClear,
  }), [handleClear])

  // Project storage (auto-save, import, export)
  const projectStorage = useProjectStorage(
    { pages, currentPageId, layoutCode, dataCode, componentsCode, tokensCode, useTokenMode, pickerModeEnabled, expandShorthand },
    {
      onError: dialogs.setError,
      onImportSuccess: (data) => {
        pageManager.loadProject({
          pages: data.pages,
          currentPageId: data.currentPageId,
          layoutCode: data.layoutCode,
        })
        setDataCode(data.dataCode)
        setComponentsCode(data.componentsCode)
        setTokensCode(data.tokensCode)
        setUseTokenMode(data.useTokenMode)
        setPickerModeEnabled(data.pickerModeEnabled)
        setExpandShorthand(data.expandShorthand)
      },
    }
  )

  // Sync pages with code references (auto-create pages from `page PageName` patterns)
  useEffect(() => {
    pageManager.syncPagesWithCode(componentsCode)
  }, [componentsCode, layoutCode, pageManager.syncPagesWithCode])

  // Load from localStorage on mount, or load default library for first-time users
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PROJECT)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        if (data.pages?.length > 0) {
          const targetPageId = data.currentPageId || data.pages[0].id
          const targetPage = data.pages.find((p: PageData) => p.id === targetPageId)
          pageManager.loadProject({
            pages: data.pages,
            currentPageId: targetPageId,
            layoutCode: targetPage?.layoutCode || '',
          })
          if (data.dataCode) setDataCode(data.dataCode)
          if (data.componentsCode) setComponentsCode(data.componentsCode)
          if (data.tokensCode) setTokensCode(data.tokensCode)
          if (data.useTokenMode !== undefined) setUseTokenMode(data.useTokenMode)
          if (data.pickerModeEnabled !== undefined) setPickerModeEnabled(data.pickerModeEnabled)
          if (data.expandShorthand !== undefined) setExpandShorthand(data.expandShorthand)
        }
      } catch (e) {
        logger.storage.error('Failed to load project', e)
      }
    } else {
      // First-time user: create empty project with default tokens
      logger.storage.info('Creating empty project for first-time user')
      const emptyPage = { id: 'page-1', name: 'Page 1', layoutCode: '' }
      pageManager.loadProject({
        pages: [emptyPage],
        currentPageId: 'page-1',
        layoutCode: '',
      })
      // Use bound token format from defaults
      setTokensCode(defaultTokensCode)
      setComponentsCode(defaultComponentsCode)
      setDataCode('')
    }
  }, [pageManager.loadProject, setDataCode, setComponentsCode, setTokensCode])

  // Expose setLayoutCode for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mirrorTestHelper = {
        setLayoutCode,
        setComponentsCode,
        setTokensCode,
        setDataCode,
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__mirrorTestHelper
      }
    }
  }, [setLayoutCode, setComponentsCode, setTokensCode, setDataCode])

  return {
    // Domain state
    pageManager,
    editor,
    panel,
    dialogs,
    parsing,
    history,
    projectStorage,

    // View mode (edit, preview, fullscreen)
    viewMode,
    setViewMode,

    // Derived values
    layoutCode,
    componentsCode,
    tokensCode,

    // Setters
    setLayoutCode,
    setComponentsCode,
    setTokensCode,

    // Data tab state
    dataCode,
    setDataCode,
    dataSchemas,
    dataRecords,

    // Live preview
    previewOverride,
    setPreviewOverride,

    // Cursor tracking (for diagnostic suppression while typing)
    onCursorLineChange: setActiveCursorLine,

    // Token mode (project-specific setting for panels)
    useTokenMode,
    setUseTokenMode,

    // Editor settings (project-specific)
    pickerModeEnabled,
    setPickerModeEnabled,
    expandShorthand,
    setExpandShorthand,

    // Actions
    editorActions,
    handleClear,
    handleNewPrototype: handleNewEmpty,  // New prototype creates empty project
    handleNewEmpty,
  }
}

export type AppState = ReturnType<typeof useAppState>
