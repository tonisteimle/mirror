/**
 * Studio Bootstrap - Integration with app.js
 */

import { state, actions, events, executor, setCommandContext, getStateSelectionAdapter, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, createStudioContext, setStudioContext, type Command, type CommandContext, type StudioContext } from './core'
import { SyncCoordinator, createSyncCoordinator, type SyncTargets } from './sync'
import { AutocompleteEngine, getAutocompleteEngine, type AutocompleteRequest, type AutocompleteResult } from './autocomplete'
import { EditorController, createEditorController, setEditorController } from './editor'
import { PreviewController, createPreviewController, setPreviewController } from './preview'
import { LLMBridge, getLLMBridge, getContextBuilder, getEditPrompt, type LLMResponse } from './llm'
import { PropertyExtractor, CodeModifier } from '../src/studio'
import { PropertyPanel, createPropertyPanel } from './panels/property-panel'
import type { AST } from '../src/parser/ast'
import type { IR } from '../src/ir/types'
import type { SourceMap } from '../src/studio/source-map'
import type { CodeChange } from '../src/studio/code-modifier'

export interface BootstrapConfig {
  editor: any
  previewContainer: HTMLElement
  propertyPanelContainer?: HTMLElement
  initialSource?: string
  currentFile?: string
}

export interface StudioInstance {
  state: typeof state
  actions: typeof actions
  events: typeof events
  executor: typeof executor
  editor: EditorController | null
  preview: PreviewController | null
  sync: SyncCoordinator | null
  propertyPanel: PropertyPanel | null
  autocomplete: AutocompleteEngine
  llm: LLMBridge
}

export const studio: StudioInstance = {
  state,
  actions,
  events,
  executor,
  editor: null,
  preview: null,
  sync: null,
  propertyPanel: null,
  autocomplete: getAutocompleteEngine(),
  llm: getLLMBridge(),
}

// Store property panel container for lazy initialization
let propertyPanelContainer: HTMLElement | null = null

// Global studio context
let studioContext: StudioContext | null = null

export function initializeStudio(config: BootstrapConfig): StudioInstance {
  console.log('[Studio] Initializing new architecture...')

  // Create studio context with initial state
  studioContext = createStudioContext({
    source: config.initialSource || '',
    currentFile: config.currentFile || 'index.mirror',
  })
  setStudioContext(studioContext)

  if (config.propertyPanelContainer) propertyPanelContainer = config.propertyPanelContainer

  // Editor
  const editorController = createEditorController({ container: config.editor.dom.parentElement })
  editorController.initialize(config.editor)
  setEditorController(editorController)
  studioContext.editor = editorController
  studio.editor = editorController

  // Preview
  const previewController = createPreviewController({ container: config.previewContainer, enableSelection: true, enableHover: true })
  previewController.attach()
  setPreviewController(previewController)
  studioContext.preview = previewController
  studio.preview = previewController

  // Sync
  const syncCoordinator = createSyncCoordinator({ cursorDebounce: 150 })
  syncCoordinator.setTargets({
    scrollEditorToLine: (line) => {
      // When editor has focus: only scroll (don't interrupt typing)
      // When preview has focus: scroll AND set cursor (code sync)
      if (state.get().editorHasFocus) {
        editorController.scrollToLine(line, true)
      } else {
        editorController.scrollToLineAndSelect(line)
      }
    },
    highlightPreviewElement: (nodeId) => nodeId ? previewController.select(nodeId) : previewController.clearSelection(),
    updatePropertyPanel: (nodeId) => nodeId && events.emit('panel:update-requested', { nodeId }),
  })
  studioContext.sync = syncCoordinator
  studio.sync = syncCoordinator

  // Command context
  setCommandContext({
    getSourceMap: () => state.get().sourceMap,
    getSource: () => state.get().source,
    applyChange: (change: CodeChange) => config.editor.dispatch({ changes: change }),
    compile: () => events.emit('compile:requested', {}),
  })

  // Wire events
  editorController.onContentChange((content) => state.set({ source: content }))
  editorController.onCursorMove((position) => {
    actions.setCursor(position.line, position.column)
    if (state.get().editorHasFocus && studioContext?.sync) {
      studioContext.sync.handleCursorMove(position.line, position.column)
    }
  })
  previewController.onSelect((nodeId) => {
    if (nodeId && studioContext?.sync) studioContext.sync.handleSelectionChange(nodeId, 'preview')
  })

  console.log('[Studio] New architecture initialized')
  return studio
}

export function updateStudioState(ast: AST, ir: IR | null, sourceMap: SourceMap, source: string): void {
  state.set({ ast, ir, sourceMap, source, errors: ast.errors || [] })
  studio.sync?.setSourceMap(sourceMap)
  studio.preview?.setSourceMap(sourceMap)

  // Initialize or update PropertyPanel
  if (propertyPanelContainer) {
    const propertyExtractor = new PropertyExtractor(ast, sourceMap)
    const codeModifier = new CodeModifier(source, sourceMap)

    if (!studio.propertyPanel) {
      // Lazy initialization on first compile
      // Use context's selectionAdapter (implements same interface as SelectionManager)
      const selectionAdapter = studioContext?.selectionAdapter ?? getStateSelectionAdapter()
      studio.propertyPanel = createPropertyPanel(
        propertyPanelContainer,
        selectionAdapter,
        propertyExtractor,
        codeModifier,
        (result) => {
          if (result.success && result.newSource) {
            state.set({ source: result.newSource })
            events.emit('source:changed', { source: result.newSource, origin: 'panel' })
            events.emit('compile:requested', {})
          }
        },
        {
          getAllSource: () => state.get().source,
        }
      )
      console.log('[Studio] PropertyPanel initialized')
    } else {
      // Update dependencies on subsequent compiles
      studio.propertyPanel.updateDependencies(propertyExtractor, codeModifier)
    }
  }

  events.emit('compile:completed', { ast, ir, sourceMap })
}

export function getCompletions(request: AutocompleteRequest): AutocompleteResult {
  return studio.autocomplete.getCompletions(request)
}

export function executeLLMResponse(response: LLMResponse | string): { success: boolean; error?: string } {
  return typeof response === 'string' ? studio.llm.executeJSON(response) : studio.llm.executeResponse(response)
}

export function buildLLMPrompt(userRequest: string): string {
  return getEditPrompt(userRequest)
}

export function getLLMContext() {
  return getContextBuilder().buildContext()
}

export function handleSelectionChange(nodeId: string | null, origin: 'editor' | 'preview' | 'panel' | 'keyboard'): void {
  if (studio.sync) {
    nodeId ? studio.sync.handleSelectionChange(nodeId, origin) : studio.sync.clearSelection(origin)
  }
}

export function setProperty(nodeId: string, property: string, value: string): boolean {
  return executor.execute(new SetPropertyCommand({ nodeId, property, value })).success
}

export function removeProperty(nodeId: string, property: string): boolean {
  return executor.execute(new RemovePropertyCommand({ nodeId, property })).success
}

export function insertComponent(parentId: string, component: string, options?: { position?: 'first' | 'last' | number; properties?: string }): boolean {
  return executor.execute(new InsertComponentCommand({ parentId, component, ...options })).success
}

export function deleteNode(nodeId: string): boolean {
  return executor.execute(new DeleteNodeCommand({ nodeId })).success
}

export function onSelectionChange(callback: (nodeId: string | null, origin: string) => void): () => void {
  return events.on('selection:changed', ({ nodeId, origin }) => callback(nodeId, origin))
}

export function onSourceChange(callback: (source: string, origin: string) => void): () => void {
  return events.on('source:changed', ({ source, origin }) => callback(source, origin))
}

export function onCompileComplete(callback: (data: { ast: AST; ir: IR | null; sourceMap: SourceMap }) => void): () => void {
  return events.on('compile:completed', callback)
}
