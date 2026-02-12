import { useEffect, useCallback, useRef, useMemo, useState } from 'react'
import { logger } from '../services/logger'
import { parse } from '../parser/parser'
import type { ASTNode } from '../parser/parser'
import type { PageData } from '../components/PageSidebar'
import { isLibraryComponent, getLibraryDefinitions } from '../library/registry'
import { propsToString } from '../utils/dsl-serializer'
import { STORAGE_KEYS, INTERNAL_NODES } from '../constants'
import { useHistory } from './useHistory'
import { usePageManager } from './usePageManager'
import { useProjectStorage } from './useProjectStorage'
import { useEditorState } from './useEditorState'
import { usePanelResize } from './usePanelResize'
import { useAiAssistant } from './useAiAssistant'
import { useDialogs } from './useDialogs'
import { useCodeParsing, type PreviewOverride } from './useCodeParsing'
import type { EditorActions } from '../contexts'

/**
 * Central app state hook that composes all domain-specific hooks.
 * This reduces complexity in App.tsx by aggregating state management.
 */
export function useAppState() {
  // Page management
  const pageManager = usePageManager()
  const { pages, currentPageId, layoutCode, setLayoutCode } = pageManager

  // Editor state (tabs, code, autocomplete)
  const editor = useEditorState()
  const { componentsCode, setComponentsCode, tokensCode, setTokensCode } = editor

  // Panel resize
  const panel = usePanelResize()

  // Dialogs (error, settings)
  const dialogs = useDialogs()

  // Live preview for pickers (color, font, icon)
  const [previewOverride, setPreviewOverride] = useState<PreviewOverride | null>(null)

  // Code parsing (with preview support)
  const parsing = useCodeParsing(tokensCode, componentsCode, layoutCode, 150, previewOverride)

  // AI Assistant
  const ai = useAiAssistant({
    onGenerated: setLayoutCode,
    onError: dialogs.setError,
  })

  // History for undo/redo
  const history = useHistory({ layoutCode, componentsCode })
  const isRestoringRef = useRef(false)

  // Push state to history when code changes (but not when restoring from undo/redo)
  useEffect(() => {
    if (isRestoringRef.current) {
      isRestoringRef.current = false
      return
    }
    history.pushState({ layoutCode, componentsCode })
  }, [layoutCode, componentsCode, history.pushState])

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs or CodeMirror
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.closest('.cm-editor')) {
        return
      }

      // Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          // Redo: Cmd+Shift+Z
          e.preventDefault()
          const state = history.redo()
          if (state) {
            isRestoringRef.current = true
            setLayoutCode(state.layoutCode)
            setComponentsCode(state.componentsCode)
          }
        } else {
          // Undo: Cmd+Z
          e.preventDefault()
          const state = history.undo()
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
  }, [history, setLayoutCode, setComponentsCode])

  // Extract styles to Components, keep structure in Layout
  const handleClean = useCallback(() => {
    // Parse the current layout to get AST
    const parseResult = parse(layoutCode)

    // Already defined in Components tab
    const existingDefs = new Set<string>()
    for (const line of componentsCode.split('\n')) {
      const match = line.match(/^([A-Z][a-zA-Z0-9_]*):/)
      if (match) existingDefs.add(match[1])
    }

    // Component definitions to add (name -> definition string)
    const componentDefs: Map<string, string> = new Map()

    // Extract style definitions from all nodes (recursively)
    function extractStyles(node: ASTNode) {
      if (node.name === INTERNAL_NODES.TEXT) return

      const props = propsToString(node.properties as Record<string, string | number | boolean>)

      // Only create definition if component has properties and isn't already defined
      if (props && !existingDefs.has(node.name) && !componentDefs.has(node.name)) {
        componentDefs.set(node.name, `${node.name}: ${props}`)
      }

      // Process children
      for (const child of node.children) {
        extractStyles(child)
      }
    }

    // Generate clean layout line (structure + content, no properties)
    function generateLayoutLines(node: ASTNode, indent: string = ''): string[] {
      if (node.name === INTERNAL_NODES.TEXT) {
        return node.content ? [`${indent}"${node.content}"`] : []
      }

      const lines: string[] = []

      // Component name with optional content
      if (node.content) {
        lines.push(`${indent}${node.name} "${node.content}"`)
      } else {
        lines.push(`${indent}${node.name}`)
      }

      // Add children with increased indent
      for (const child of node.children) {
        lines.push(...generateLayoutLines(child, indent + '  '))
      }

      return lines
    }

    // Process all root nodes
    for (const node of parseResult.nodes) {
      extractStyles(node)
    }

    // Generate cleaned layout with structure
    const cleanedLines: string[] = []
    for (const node of parseResult.nodes) {
      cleanedLines.push(...generateLayoutLines(node))
    }

    // Update components tab with new definitions
    if (componentDefs.size > 0) {
      const newDefs = Array.from(componentDefs.values())
      const newComponents = componentsCode.trim()
        ? newDefs.join('\n') + '\n\n' + componentsCode
        : newDefs.join('\n')
      setComponentsCode(newComponents)
    }

    // Update layout
    setLayoutCode(cleanedLines.join('\n'))
  }, [layoutCode, componentsCode, setComponentsCode, setLayoutCode])

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

  // Memoize editor actions for context
  const editorActions: EditorActions = useMemo(() => ({
    onOpenAiAssistant: ai.openAssistant,
    onClear: handleClear,
    onClean: handleClean,
  }), [ai.openAssistant, handleClear, handleClean])

  // Project storage (auto-save, import, export)
  const projectStorage = useProjectStorage(
    { pages, currentPageId, layoutCode, componentsCode, tokensCode },
    {
      onError: dialogs.setError,
      onImportSuccess: (data) => {
        pageManager.loadProject({
          pages: data.pages,
          currentPageId: data.currentPageId,
          layoutCode: data.layoutCode,
        })
        setComponentsCode(data.componentsCode)
        setTokensCode(data.tokensCode)
      },
    }
  )

  // Load from localStorage on mount
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
          if (data.componentsCode) setComponentsCode(data.componentsCode)
          if (data.tokensCode) setTokensCode(data.tokensCode)
        }
      } catch (e) {
        logger.storage.error('Failed to load project', e)
      }
    }
  }, [pageManager.loadProject, setComponentsCode, setTokensCode])

  return {
    // Domain state
    pageManager,
    editor,
    panel,
    dialogs,
    parsing,
    ai,
    history,
    projectStorage,

    // Derived values
    layoutCode,
    componentsCode,
    tokensCode,

    // Setters
    setLayoutCode,
    setComponentsCode,
    setTokensCode,

    // Live preview
    previewOverride,
    setPreviewOverride,

    // Actions
    editorActions,
    handleClear,
    handleClean,
  }
}

export type AppState = ReturnType<typeof useAppState>
