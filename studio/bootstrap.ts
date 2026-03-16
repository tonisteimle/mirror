/**
 * Studio Bootstrap - Integration with app.js
 */

import { state, actions, events, executor, setCommandContext, getStateSelectionAdapter, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, createStudioContext, setStudioContext, type Command, type CommandContext, type StudioContext } from './core'
import { createSyncCoordinator, createLineOffsetService, type SyncCoordinator } from './sync'
import { AutocompleteEngine, getAutocompleteEngine, type AutocompleteRequest, type AutocompleteResult } from './autocomplete'
import { EditorController, createEditorController, setEditorController } from './editor'
import { PreviewController, createPreviewController, setPreviewController, PreviewBreadcrumb, createPreviewBreadcrumb } from './preview'
import { LLMBridge, getLLMBridge, getContextBuilder, getEditPrompt, type LLMResponse } from './llm'
import { PropertyExtractor, CodeModifier } from '../src/studio'
import { PropertyPanel, createPropertyPanel } from './panels/property-panel'
import { ComponentPanel, createComponentPanel } from './panels/components'
import type { AST } from '../src/parser/ast'
import type { IR } from '../src/ir/types'
import type { SourceMap } from '../src/studio/source-map'
import type { CodeChange } from '../src/studio/code-modifier'

export interface BootstrapConfig {
  editor: any
  previewContainer: HTMLElement
  propertyPanelContainer?: HTMLElement
  componentPanelContainer?: HTMLElement
  initialSource?: string
  currentFile?: string
  /** Callback to get all project source (for token extraction from all files) */
  getAllSource?: () => string
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
  componentPanel: ComponentPanel | null
  breadcrumb: PreviewBreadcrumb | null
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
  componentPanel: null,
  breadcrumb: null,
  autocomplete: getAutocompleteEngine(),
  llm: getLLMBridge(),
}

// Store property panel container for lazy initialization
let propertyPanelContainer: HTMLElement | null = null

// Store component panel container for lazy initialization
let componentPanelContainer: HTMLElement | null = null

// Store getAllSource callback for token extraction from all files
let getAllSourceCallback: (() => string) | null = null

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
  if (config.componentPanelContainer) componentPanelContainer = config.componentPanelContainer
  if (config.getAllSource) getAllSourceCallback = config.getAllSource

  // Initialize Component Panel if container provided
  if (componentPanelContainer) {
    studio.componentPanel = createComponentPanel(
      { container: componentPanelContainer },
      {
        onDragStart: (item, event) => {
          events.emit('component:drag-start', { item, event })
        },
        onDragEnd: (item, event) => {
          events.emit('component:drag-end', { item, event })
        },
        onClick: (item) => {
          events.emit('component:insert-requested', { item })
        },
      }
    )
    console.log('[Studio] ComponentPanel initialized')
  }

  // Editor
  const editorController = createEditorController({ container: config.editor.dom.parentElement })
  editorController.initialize(config.editor)
  setEditorController(editorController)
  studioContext.editor = editorController
  studio.editor = editorController

  // Preview (with direct manipulation handles, keyboard shortcuts, context menu, visual code system, and element move)
  const previewController = createPreviewController({
    container: config.previewContainer,
    enableSelection: true,
    enableHover: true,
    enableHandles: true,
    enableKeyboardShortcuts: true,
    enableContextMenu: true,
    enableVisualCode: true,
  })
  previewController.attach()
  setPreviewController(previewController)
  studioContext.preview = previewController
  studio.preview = previewController

  // Breadcrumb (hierarchy display above preview)
  const breadcrumbContainer = config.previewContainer.parentElement?.querySelector('#preview-breadcrumb') as HTMLElement | null
  if (breadcrumbContainer) {
    const breadcrumb = createPreviewBreadcrumb({
      container: breadcrumbContainer,
      events,
      onItemClick: (nodeId) => {
        // Navigate to parent element when breadcrumb item is clicked
        if (studio.sync) {
          studio.sync.handleSelectionChange(nodeId, 'panel')
        }
      },
    })
    studio.breadcrumb = breadcrumb
  }

  // Wire handle drag events to code modification
  events.on('handle:drag-end', ({ nodeId, property, value }) => {
    // Use executor to apply property change (supports undo/redo)
    executor.execute(new SetPropertyCommand({ nodeId, property, value: String(value) }))
  })

  // Sync - LineOffsetService handles editor ↔ SourceMap line translation
  const lineOffset = createLineOffsetService()
  const syncCoordinator = createSyncCoordinator({ cursorDebounce: 150, debug: false, lineOffset })
  syncCoordinator.setTargets({
    scrollEditorToLine: (editorLine) => {
      // editorLine is already converted from SourceMap line by SyncCoordinator
      // Always scroll only (don't set cursor) to avoid triggering another sync cycle
      // The selection state is already managed by SyncCoordinator
      editorController.scrollToLine(editorLine, true)
    },
    highlightPreviewElement: (nodeId) => nodeId ? previewController.select(nodeId) : previewController.clearSelection(),
    updatePropertyPanel: (nodeId) => nodeId && events.emit('panel:update-requested', { nodeId }),
  })

  // Subscribe to selection:changed events for automatic sync
  // This is the key: all selection changes trigger sync automatically
  syncCoordinator.subscribe()

  studioContext.sync = syncCoordinator
  studio.sync = syncCoordinator

  // Inject SyncCoordinator into SelectionAdapter for consistent selection handling
  const selectionAdapter = getStateSelectionAdapter()
  selectionAdapter.setSyncHandler({
    handleSelectionChange: (nodeId, origin) => syncCoordinator.handleSelectionChange(nodeId, origin),
    clearSelection: (origin) => syncCoordinator.clearSelection(origin),
  })

  // Command context
  // getSource returns editor content (current file only)
  // getResolvedSource returns prelude + current file (for CodeModifier to match SourceMap)
  setCommandContext({
    getSourceMap: () => state.get().sourceMap,
    getSource: () => editorController.getContent(),
    getResolvedSource: () => {
      // Resolved source = prelude + current file, used by CodeModifier
      // Falls back to editor source if resolvedSource not yet set
      const resolved = state.get().resolvedSource
      return resolved || editorController.getContent()
    },
    getPreludeOffset: () => state.get().preludeOffset,
    applyChange: (change: CodeChange) => config.editor.dispatch({ changes: change }),
    compile: () => events.emit('compile:requested', {}),
    clearSelection: (origin) => syncCoordinator.clearSelection(origin),
  })

  // Wire events
  editorController.onContentChange((content) => state.set({ source: content }))
  editorController.onCursorMove((position) => {
    actions.setCursor(position.line, position.column)
    // Cursor changes only happen when editor is focused, so always sync
    // (editorHasFocus state may be stale due to event timing)
    if (studioContext?.sync) {
      studioContext.sync.handleCursorMove(position.line)
    }
  })
  previewController.onSelect((nodeId) => {
    if (nodeId && studioContext?.sync) studioContext.sync.handlePreviewClick(nodeId)
  })

  console.log('[Studio] New architecture initialized')
  return studio
}

/**
 * Update studio state after compilation
 * Uses atomic setCompileResult to ensure consistency
 */
export function updateStudioState(ast: AST, ir: IR | null, sourceMap: SourceMap, source: string): void {
  // Use atomic compile result update - this ensures AST, IR, SourceMap, and errors
  // are all updated together with a new compile version
  actions.setCompileResult({
    ast,
    ir: ir || ({ nodes: [], components: new Map() } as unknown as IR),
    sourceMap,
    errors: ast.errors || [],
  })

  // Also update source if it changed (e.g., from normalization)
  const currentSource = state.get().source
  if (currentSource !== source) {
    state.set({ source })
  }

  // Update sync coordinator and preview with new SourceMap
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
          } else if (!result.success) {
            // Emit error notification for user feedback
            events.emit('notification:error', {
              message: result.error || 'Failed to update property'
            })
          }
        },
        {
          getAllSource: getAllSourceCallback ?? (() => state.get().source),
        }
      )
      console.log('[Studio] PropertyPanel initialized')
    } else {
      // Update dependencies on subsequent compiles
      studio.propertyPanel.updateDependencies(propertyExtractor, codeModifier)
    }
  }

  // Update Component Panel with new AST (for user-defined components)
  if (studio.componentPanel) {
    studio.componentPanel.update(ast)
  }

  // Note: compile:completed is now emitted by setCompileResult action
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
