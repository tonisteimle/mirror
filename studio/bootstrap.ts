/**
 * Studio Bootstrap - Integration with app.js
 */

import {
  state,
  actions,
  events,
  executor,
  setCommandContext,
  getCommandContext,
  getStateSelectionAdapter,
  SetPropertyCommand,
  RemovePropertyCommand,
  InsertComponentCommand,
  DeleteNodeCommand,
  createStudioContext,
  setStudioContext,
  type Command,
  type CommandContext,
  type StudioContext,
} from './core'
import { type SyncCoordinatorV2 as SyncCoordinator } from './sync'
import {
  AutocompleteEngine,
  getAutocompleteEngine,
  type AutocompleteRequest,
  type AutocompleteResult,
} from './autocomplete'
import { EditorController, createEditorController, setEditorController } from './editor'
import {
  PreviewController,
  createPreviewController,
  setPreviewController,
  PreviewBreadcrumb,
  createPreviewBreadcrumb,
} from './preview'
import { RenderPipeline, createRenderPipeline } from './preview/render-pipeline'
import { LLMBridge, getLLMBridge, getContextBuilder, getEditPrompt, type LLMResponse } from './llm'
import { initializeAgent, getAgentIntegration, type AgentIntegration } from './agent'
import { PropertyExtractor, CodeModifier, setGridSettingsProvider } from '../compiler/studio'
import { gridSettings } from './core/settings'
import { PropertyPanel, createPropertyPanel } from './panels'
import {
  ComponentPanel,
  createComponentPanel,
  UserComponentsPanel,
  createUserComponentsPanel,
  getComponentTemplate,
  getFileType,
  type ComponentDragData,
  type ComponentChild,
} from './panels/components'
import { ActivityBar, createActivityBar, ACTIVITY_BAR_ICONS } from './panels/explorer'
import type { DrawManager } from './visual/draw-manager'
import type { InlineEditController } from './inline-edit'
import { initDrawManager, initInlineEdit, initSync } from './bootstrap/index'
import { initUserSettings } from './storage/user-settings'
import { initStudioTestAPI } from './test-api'
import { triggerRename, isRenameActive, closeRename } from './rename'
import type { AST, IR, SourceMap, CodeChange } from '../compiler'
import type { EditorView } from '@codemirror/view'
import { logBootstrap, logAgent } from '../compiler/utils/logger'

export interface BootstrapConfig {
  /** CodeMirror EditorView instance */
  editor: EditorView
  previewContainer: HTMLElement
  propertyPanelContainer?: HTMLElement
  componentPanelContainer?: HTMLElement
  userComponentsPanelContainer?: HTMLElement
  explorerPanelContainer?: HTMLElement
  fileTreeContainer?: HTMLElement
  chatPanelContainer?: HTMLElement
  initialSource?: string
  currentFile?: string
  /** Callback to get all project source (for token extraction from all files) */
  getAllSource?: () => string
  /** Callback to get current file name */
  getCurrentFile?: () => string
  /** Callback to get all project files with types */
  getFiles?: () => {
    name: string
    type: 'tokens' | 'components' | 'component' | 'layout' | 'data' | 'unknown'
    code: string
  }[]
  /** Callback to update file content */
  updateFile?: (filename: string, content: string) => void
  /** Callback to switch to file */
  switchToFile?: (filename: string) => void
  /** OpenRouter API key for AI agent */
  agentApiKey?: string
}

export interface StudioInstance {
  state: typeof state
  actions: typeof actions
  events: typeof events
  executor: typeof executor
  editor: EditorController | null
  preview: PreviewController | null
  renderPipeline: RenderPipeline | null
  sync: SyncCoordinator | null
  propertyPanel: PropertyPanel | null
  componentPanel: ComponentPanel | null
  userComponentsPanel: UserComponentsPanel | null
  breadcrumb: PreviewBreadcrumb | null
  autocomplete: AutocompleteEngine
  llm: LLMBridge
  agent: AgentIntegration | null
  drawManager: DrawManager | null
  inlineEdit: InlineEditController | null
  /** Cleanup all event subscriptions and resources */
  dispose: () => void
}

// Extend Window interface for global properties
declare global {
  interface Window {
    MirrorStudio?: StudioInstance
  }
}

// Track event subscriptions for cleanup
const eventUnsubscribes: Array<() => void> = []

export const studio: StudioInstance = {
  state,
  actions,
  events,
  executor,
  editor: null,
  preview: null,
  renderPipeline: null,
  sync: null,
  propertyPanel: null,
  componentPanel: null,
  userComponentsPanel: null,
  breadcrumb: null,
  autocomplete: getAutocompleteEngine(),
  llm: getLLMBridge(),
  agent: null,
  drawManager: null,
  inlineEdit: null,
  dispose: () => {
    // Unsubscribe all event listeners
    for (const unsubscribe of eventUnsubscribes) {
      unsubscribe()
    }
    eventUnsubscribes.length = 0

    // Dispose components
    studio.sync?.dispose()
    studio.renderPipeline?.dispose()
    studio.propertyPanel?.detach()
    studio.componentPanel?.dispose()
    studio.userComponentsPanel?.dispose()
    studio.drawManager?.dispose()
    studio.inlineEdit?.dispose()
    studio.preview?.dispose()

    // Clear references
    studio.editor = null
    studio.preview = null
    studio.renderPipeline = null
    studio.sync = null
    studio.propertyPanel = null
    studio.componentPanel = null
    studio.userComponentsPanel = null
    studio.breadcrumb = null
    studio.drawManager = null
    studio.inlineEdit = null
    studio.agent = null
  },
}

// Store property panel container for lazy initialization
let propertyPanelContainer: HTMLElement | null = null

// Store component panel container for lazy initialization
let componentPanelContainer: HTMLElement | null = null

// Store user components panel container for lazy initialization
let userComponentsPanelContainer: HTMLElement | null = null

// Store chat panel container for lazy initialization
let chatPanelContainer: HTMLElement | null = null

// Store agent API key
let agentApiKey: string | null = null

// Store getAllSource callback for token extraction from all files
let getAllSourceCallback: (() => string) | null = null

// Store getCurrentFile callback for template selection
let getCurrentFileCallback: (() => string) | null = null

/**
 * Robust fallback for getAllSource when callback is not provided.
 * Uses window.desktopFiles if available, otherwise returns current source.
 * This ensures tokens from all project files are available.
 */
function getDefaultAllSource(): string {
  // Try to get all files from desktop-files module (includes all preloaded files)
  const desktopFiles = (window as any).desktopFiles?.getFiles?.()
  if (desktopFiles && typeof desktopFiles === 'object') {
    // Concatenate all file contents (tokens should be included)
    return Object.values(desktopFiles).filter(Boolean).join('\n')
  }
  // Fallback to current source only (not ideal, but better than nothing)
  return state.get().source
}

// Global studio context
let studioContext: StudioContext | null = null

/**
 * Generate Mirror component code from drag data
 *
 * Returns code with relative indentation only (no base indent).
 * The base indent is applied by insertComponentCode based on drop position.
 *
 * @param dragData - Component drag data (componentName, properties, etc.)
 * @param options - Optional settings
 * @param options.componentId - Component ID for template lookup (e.g., 'zag-dialog')
 * @param options.filename - Current filename to determine file type (.mir or .com)
 */
export function generateComponentCodeFromDragData(
  dragData: ComponentDragData,
  options?: { componentId?: string; filename?: string }
): string {
  const { componentName, properties, textContent, children } = dragData

  // Try template-based code generation first
  if (options?.componentId && options?.filename) {
    const fileType = getFileType(options.filename)
    const template = getComponentTemplate(options.componentId, fileType)
    if (template) {
      return template
    }
  }

  // Fallback to property-based code generation
  let code = componentName
  if (properties) {
    code += ` ${properties}`
  }
  if (textContent) {
    code += ` "${textContent}"`
  }

  // Add children if present (with relative indentation starting at 1 level)
  if (children && children.length > 0) {
    for (const child of children) {
      const childCode = generateChildCode(child, 1)
      code += '\n' + childCode
    }
  }

  return code
}

/**
 * Generate code for child components
 *
 * Handles:
 * - isSlot: adds ":" suffix (e.g., "ItemGroup:")
 * - isItem: simple item with text content (e.g., 'Item "Option"')
 * - Regular components with properties and nested children
 */
function generateChildCode(child: ComponentChild, indent: number): string {
  const spaces = '  '.repeat(indent)

  // Handle slot syntax (e.g., "Trigger:", "ItemGroup:")
  if (child.isSlot) {
    let code = spaces + child.template + ':'
    if (child.properties) {
      code += '\n' + spaces + '  ' + child.properties
    }
    // Recursively add nested children
    if (child.children && child.children.length > 0) {
      for (const nested of child.children) {
        code += '\n' + generateChildCode(nested, indent + 1)
      }
    }
    return code
  }

  // Handle item syntax (e.g., 'Item "Option A"')
  if (child.isItem) {
    let code = spaces + child.template
    if (child.textContent) {
      code += ` "${child.textContent}"`
    }
    if (child.properties) {
      code += `, ${child.properties}`
    }
    return code
  }

  // Standard component syntax
  let code = spaces + child.template

  if (child.properties) {
    code += ` ${child.properties}`
  }
  if (child.textContent) {
    code += ` "${child.textContent}"`
  }

  // Recursively add nested children
  if (child.children && child.children.length > 0) {
    for (const subChild of child.children) {
      code += '\n' + generateChildCode(subChild, indent + 1)
    }
  }

  return code
}

export function initializeStudio(config: BootstrapConfig): StudioInstance {
  logBootstrap.info(' Initializing new architecture...')

  // Load user settings from server (non-blocking)
  initUserSettings().catch(err => {
    logBootstrap.warn(' Failed to load user settings:', err)
  })

  // Initialize grid settings provider (breaks circular dependency)
  setGridSettingsProvider(gridSettings)

  // Create studio context with initial state
  studioContext = createStudioContext({
    source: config.initialSource || '',
    currentFile: config.currentFile || 'index.mir',
  })
  setStudioContext(studioContext)

  if (config.propertyPanelContainer) propertyPanelContainer = config.propertyPanelContainer
  if (config.componentPanelContainer) componentPanelContainer = config.componentPanelContainer
  if (config.chatPanelContainer) chatPanelContainer = config.chatPanelContainer
  if (config.agentApiKey) agentApiKey = config.agentApiKey
  if (config.getAllSource) getAllSourceCallback = config.getAllSource
  if (config.getCurrentFile) getCurrentFileCallback = config.getCurrentFile

  // Initialize Component Panel if container provided
  if (config.componentPanelContainer) {
    componentPanelContainer = config.componentPanelContainer
    const getFilesCallback = config.getFiles
    studio.componentPanel = createComponentPanel(
      {
        container: componentPanelContainer,
        showTabBar: true,
        defaultTab: 'basic',
        // Include user components from all files (definitions can be in any file)
        getComFiles: getFilesCallback
          ? () => {
              const files = getFilesCallback()
              // Parse all files for component definitions, not just .com files
              return files
                .filter(f => f.type !== 'tokens' && f.type !== 'data')
                .map(f => ({ name: f.name, content: f.code }))
            }
          : undefined,
      },
      {
        onDragStart: (item, event) => {
          events.emit('component:drag-start', { item, event })
        },
        onDragEnd: (item, event) => {
          events.emit('component:drag-end', { item, event })
        },
        onClick: item => {
          // Enter draw mode if DrawManager is available
          if (studio.drawManager) {
            studio.drawManager.enterDrawMode(item)
          } else {
            // Fallback to event emission (legacy behavior)
            events.emit('component:insert-requested', { item })
          }
        },
      }
    )
    logBootstrap.info(' ComponentPanel initialized')
  }

  // Initialize User Components Panel if container and getFiles provided
  if (config.userComponentsPanelContainer) {
    userComponentsPanelContainer = config.userComponentsPanelContainer
  }
  if (userComponentsPanelContainer && config.getFiles) {
    const getFilesCallback = config.getFiles
    studio.userComponentsPanel = createUserComponentsPanel(
      {
        container: userComponentsPanelContainer,
        getComFiles: () => {
          const files = getFilesCallback()
          // Parse all files for component definitions, not just .com files
          return files
            .filter(f => f.type !== 'tokens' && f.type !== 'data')
            .map(f => ({ name: f.name, content: f.code }))
        },
      },
      {
        onDragStart: (item, event) => {
          events.emit('component:drag-start', { item, event })
        },
        onDragEnd: (item, event) => {
          events.emit('component:drag-end', { item, event })
        },
        onClick: item => {
          // Enter draw mode if DrawManager is available
          if (studio.drawManager) {
            studio.drawManager.enterDrawMode(item)
          } else {
            // Fallback to event emission (legacy behavior)
            events.emit('component:insert-requested', { item })
          }
        },
        onRefresh: () => {
          logBootstrap.info(' UserComponentsPanel refreshed')
        },
      }
    )
    logBootstrap.info(' UserComponentsPanel initialized')
  }

  // Initialize AI Agent if API key provided
  if (agentApiKey && chatPanelContainer) {
    studio.agent = initializeAgent({
      apiKey: agentApiKey,
      chatContainer: chatPanelContainer,
      getCurrentFile: config.getCurrentFile,
      getFiles: config.getFiles,
      getAllCode: config.getAllSource,
      updateFile: config.updateFile,
      switchToFile: config.switchToFile,
      onCommand: command => {
        logAgent.info(' Command executed:', command.type)
      },
      onError: error => {
        logAgent.error(' Error:', error)
      },
    })
    logBootstrap.info(' AI Agent initialized')
  }

  // Editor
  const editorContainer = config.editor.dom.parentElement
  if (!editorContainer) {
    throw new Error('[Studio] Editor parent element not found')
  }
  const editorController = createEditorController({ container: editorContainer })
  editorController.initialize(config.editor)
  setEditorController(editorController)
  studioContext.editor = editorController
  studio.editor = editorController

  // Editor Drop Handler is now handled by createComponentDropExtension in app.js
  // Uses CodeMirror's native extension system for proper drop handling

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

  // Render Pipeline - orchestrates layout extraction after render
  // Subscribes to compile:completed and extracts layoutInfo using double-RAF
  const renderPipeline = createRenderPipeline({
    container: config.previewContainer,
    autoExtract: true,
    onLayoutExtracted: () => {
      logBootstrap.debug(' Layout extracted, version:', state.get().layoutVersion)
    },
  })
  studio.renderPipeline = renderPipeline

  // Breadcrumb (hierarchy display above preview)
  const breadcrumbContainer = config.previewContainer.parentElement?.querySelector(
    '#preview-breadcrumb'
  ) as HTMLElement | null
  if (breadcrumbContainer) {
    const breadcrumb = createPreviewBreadcrumb({
      container: breadcrumbContainer,
      events,
      onItemClick: nodeId => {
        // Navigate to parent element when breadcrumb item is clicked
        if (studio.sync) {
          studio.sync.handleSelectionChange(nodeId, 'panel')
        }
      },
    })
    studio.breadcrumb = breadcrumb
  }

  // Wire handle drag events to code modification
  eventUnsubscribes.push(
    events.on('handle:drag-end', ({ nodeId, property, value }) => {
      // Use executor to apply property change (supports undo/redo)
      executor.execute(new SetPropertyCommand({ nodeId, property, value: String(value) }))
    })
  )

  // Sync Coordinator - uses hexagonal architecture with ports
  const { syncCoordinator } = initSync({
    editorController,
    previewController,
    cursorDebounce: 150,
    debug: false,
  })

  studioContext.sync = syncCoordinator
  studio.sync = syncCoordinator

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
    clearSelection: origin => syncCoordinator.clearSelection(origin),
  })

  // Wire events
  editorController.onContentChange(content => state.set({ source: content }))
  editorController.onCursorMove(position => {
    actions.setCursor(position.line, position.column)
    // Cursor changes only happen when editor is focused, so always sync
    // (editorHasFocus state may be stale due to event timing)
    if (studioContext?.sync) {
      studioContext.sync.handleCursorMove(position.line)
    }
  })
  previewController.onSelect(nodeId => {
    if (nodeId && studioContext?.sync) studioContext.sync.handlePreviewClick(nodeId)
  })

  // Initialize InlineEditController for Figma-style text editing
  const inlineEditResult = initInlineEdit({
    container: config.previewContainer,
    previewController,
  })
  studio.inlineEdit = inlineEditResult.controller
  eventUnsubscribes.push(inlineEditResult.dispose)

  // ============================================
  // F2 Rename Symbol Handler
  // ============================================
  const handleF2Rename = (e: KeyboardEvent) => {
    // Only handle F2 when editor has focus
    if (e.key !== 'F2' || e.ctrlKey || e.metaKey || e.altKey) return
    if (!state.get().editorHasFocus) return

    e.preventDefault()
    e.stopPropagation()

    // Trigger rename at cursor position
    triggerRename({
      editor: editorController,
      getFiles: () => {
        // Get all project files for cross-file rename
        if (config.getFiles) {
          return config.getFiles().map(f => ({ name: f.name, content: f.code }))
        }
        // Fallback: only current file
        return [{ name: state.get().currentFile, content: editorController.getContent() }]
      },
      getCurrentFile: () => config.getCurrentFile?.() || state.get().currentFile,
    })
  }

  document.addEventListener('keydown', handleF2Rename)
  eventUnsubscribes.push(() => document.removeEventListener('keydown', handleF2Rename))

  logBootstrap.info(' F2 Rename Symbol handler initialized')

  // Initialize DrawManager for component drawing
  const drawManagerResult = initDrawManager({
    container: config.previewContainer,
    editor: config.editor,
    editorController,
  })
  studio.drawManager = drawManagerResult.drawManager
  eventUnsubscribes.push(drawManagerResult.dispose)

  // Initialize test API (includes drag-drop test API at window.__testDragDrop)
  initStudioTestAPI(studio, config.editor)

  // ============================================
  // Component Event Handlers
  // ============================================

  // Handle component insert request (click on component in palette)
  eventUnsubscribes.push(
    events.on('component:insert-requested', ({ item }) => {
      // Try DrawManager first, fallback to editor insert
      if (studio.drawManager && studio.preview) {
        // Convert ComponentPanelItem to ComponentItem with defaults
        const componentItem = {
          ...item,
          category: item.category ?? 'custom',
          icon: (item.icon ?? 'box') as import('./panels/components/types').ComponentIcon,
        }
        studio.drawManager.enterDrawMode(componentItem)
      } else if (studio.editor) {
        // Insert at cursor in editor (use template based on file type)
        const currentFile = getCurrentFileCallback?.() || 'index.mir'
        const code = generateComponentCodeFromDragData(
          {
            componentName: item.template,
            componentId: item.id,
            properties: item.properties,
            textContent: item.textContent,
            children: item.children,
            fromComponentPanel: true,
          },
          {
            componentId: item.id,
            filename: currentFile,
          }
        )
        studio.editor.insertAtCursor('\n' + code)
      }
    })
  )

  // Handle component tab changes
  eventUnsubscribes.push(
    events.on('components:tab-changed', ({ tab }) => {
      logBootstrap.info(' Component tab changed to:', tab)
    })
  )

  // Initialize panel visibility (MUST run first - sets up event listener)
  initializePanelVisibility()

  // Initialize Panel Toolbar (legacy View Menu)
  initializePanelToolbar()

  // Initialize global Activity Bar for panel toggles
  initializeActivityBar()

  // Expose studio on window for legacy code (PanelResizer, cleanup.js)
  window.MirrorStudio = studio

  logBootstrap.info(' New architecture initialized')
  return studio
}

// Shared panel element mapping
const panelElements: Record<string, HTMLElement | null> = {}

/**
 * Initialize panel visibility - ALWAYS runs
 * Sets up event listener and applies initial state to DOM
 */
function initializePanelVisibility(): void {
  // Build panel element mapping
  panelElements.prompt = document.getElementById('chat-panel')
  panelElements.files =
    document.getElementById('explorer-panel') || document.querySelector('.sidebar')
  panelElements.code = document.querySelector('.editor-panel')
  panelElements.components = document.getElementById('components-panel')
  panelElements.preview = document.querySelector('.preview-panel')
  panelElements.property = document.getElementById('property-panel')

  // Apply initial state from store
  const visibility = state.get().panelVisibility
  for (const [panelKey, panel] of Object.entries(panelElements)) {
    const isVisible = visibility[panelKey as keyof typeof visibility]
    if (panel) {
      panel.classList.toggle('panel-hidden', !isVisible)
    }
  }

  // Listen for visibility changes - this ALWAYS runs
  eventUnsubscribes.push(
    events.on('panel:visibility-changed', ({ panel, visible }) => {
      const panelEl = panelElements[panel]
      if (panelEl) {
        panelEl.classList.toggle('panel-hidden', !visible)
      }
      logBootstrap.debug(` ${panel}: ${visible}`)
    })
  )

  logBootstrap.info(' Panel visibility initialized')
}

/**
 * Initialize the View Menu for panel visibility (legacy, optional)
 */
function initializePanelToolbar(): void {
  const menuButton = document.getElementById('view-menu-button')
  const menu = document.getElementById('view-menu')
  if (!menuButton || !menu) return

  // Apply initial state to checkboxes
  const visibility = state.get().panelVisibility
  for (const panelKey of Object.keys(panelElements)) {
    const isVisible = visibility[panelKey as keyof typeof visibility]
    const checkbox = menu.querySelector(
      `[data-panel="${panelKey}"] input`
    ) as HTMLInputElement | null
    if (checkbox) {
      checkbox.checked = isVisible
    }
  }

  // Toggle menu open/close
  const handleMenuButtonClick = (e: Event) => {
    e.stopPropagation()
    menu.classList.toggle('open')
    menuButton.classList.toggle('active', menu.classList.contains('open'))
  }
  menuButton.addEventListener('click', handleMenuButtonClick)

  // Close menu when clicking outside
  const handleDocumentClick = (e: Event) => {
    if (!menu.contains(e.target as Node) && !menuButton.contains(e.target as Node)) {
      menu.classList.remove('open')
      menuButton.classList.remove('active')
    }
  }
  document.addEventListener('click', handleDocumentClick)

  // Handle checkbox changes
  const handleMenuChange = (e: Event) => {
    const target = e.target as HTMLInputElement
    if (target.type !== 'checkbox') return

    const menuItem = target.closest('.view-menu-item') as HTMLElement | null
    const panelKey = menuItem?.dataset.panel as keyof typeof visibility
    if (!panelKey) return

    actions.setPanelVisibility(panelKey, target.checked)
  }
  menu.addEventListener('change', handleMenuChange)

  // Track cleanup for DOM event listeners
  eventUnsubscribes.push(() => {
    menuButton.removeEventListener('click', handleMenuButtonClick)
    document.removeEventListener('click', handleDocumentClick)
    menu.removeEventListener('change', handleMenuChange)
  })

  // Sync checkboxes with visibility changes
  eventUnsubscribes.push(
    events.on('panel:visibility-changed', ({ panel, visible }) => {
      const checkbox = menu.querySelector(
        `[data-panel="${panel}"] input`
      ) as HTMLInputElement | null
      if (checkbox) {
        checkbox.checked = visible
      }
    })
  )

  logBootstrap.info(' View menu initialized')
}

// Store global Activity Bar instance
let globalActivityBar: ActivityBar | null = null

/**
 * Initialize the global Activity Bar for panel toggles
 */
function initializeActivityBar(): void {
  const container = document.getElementById('activity-bar-container')
  if (!container) {
    logBootstrap.warn(' Activity bar container not found')
    return
  }

  // Activity Bar items for all panels
  const items = [
    { id: 'files', icon: ACTIVITY_BAR_ICONS.files, tooltip: 'Files' },
    { id: 'components', icon: ACTIVITY_BAR_ICONS.components, tooltip: 'Components' },
    { id: 'code', icon: ACTIVITY_BAR_ICONS.code, tooltip: 'Code Editor' },
    { id: 'preview', icon: ACTIVITY_BAR_ICONS.preview, tooltip: 'Preview' },
    { id: 'property', icon: ACTIVITY_BAR_ICONS.properties, tooltip: 'Properties' },
  ]

  // Get initial visibility from state
  const visibility = state.get().panelVisibility
  const activeItems = Object.entries(visibility)
    .filter(([_, visible]) => visible)
    .map(([key]) => key)

  // Create Activity Bar
  globalActivityBar = createActivityBar(
    {
      container,
      items,
      activeItems,
    },
    {
      onToggle: (id, active) => {
        // Update panel visibility via state action
        actions.setPanelVisibility(id as keyof typeof visibility, active)
      },
    }
  )
  globalActivityBar.render()

  // Listen for visibility changes to sync Activity Bar state
  eventUnsubscribes.push(
    events.on('panel:visibility-changed', ({ panel, visible }) => {
      globalActivityBar?.setActive(panel, visible)
    })
  )

  logBootstrap.info(' Activity Bar initialized')
}

/**
 * Update studio state after compilation
 * Uses atomic setCompileResult to ensure consistency
 */
export function updateStudioState(
  ast: AST,
  ir: IR | null,
  sourceMap: SourceMap,
  source: string
): void {
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
        result => {
          if (result.success && result.newSource && result.change) {
            // Apply the change to the editor
            const ctx = getCommandContext()
            if (ctx?.applyChange) {
              // Adjust for prelude offset
              const preludeOffset = state.get().preludeOffset || 0
              const adjustedChange = {
                from: result.change.from - preludeOffset,
                to: result.change.to - preludeOffset,
                insert: result.change.insert,
              }
              // Validate before applying
              const editorSource = ctx.getSource?.() ?? ''
              if (adjustedChange.from >= 0 && adjustedChange.to <= editorSource.length) {
                ctx.applyChange(adjustedChange)
              }
            }
            state.set({ source: result.newSource })
            events.emit('source:changed', { source: result.newSource, origin: 'panel' })
            events.emit('compile:requested', {})
          } else if (!result.success) {
            // Emit error notification for user feedback
            events.emit('notification:error', {
              message: result.error || 'Failed to update property',
            })
          }
        },
        {
          getAllSource: getAllSourceCallback ?? getDefaultAllSource,
        }
      )
      logBootstrap.info(' PropertyPanel initialized')
    } else {
      // Update dependencies on subsequent compiles
      studio.propertyPanel.updateDependencies(propertyExtractor, codeModifier)
    }
  }

  // Refresh Component Panel if needed
  if (studio.componentPanel) {
    studio.componentPanel.refresh()
  }

  // Refresh User Components Panel if needed
  if (studio.userComponentsPanel) {
    studio.userComponentsPanel.refresh()
  }

  // Note: compile:completed is now emitted by setCompileResult action
}

export function getCompletions(request: AutocompleteRequest): AutocompleteResult {
  return studio.autocomplete.getCompletions(request)
}

export function executeLLMResponse(response: LLMResponse | string): {
  success: boolean
  error?: string
} {
  return typeof response === 'string'
    ? studio.llm.executeJSON(response)
    : studio.llm.executeResponse(response)
}

export function buildLLMPrompt(userRequest: string): string {
  return getEditPrompt(userRequest)
}

export function getLLMContext() {
  return getContextBuilder().buildContext()
}

export function handleSelectionChange(
  nodeId: string | null,
  origin: 'editor' | 'preview' | 'panel' | 'keyboard'
): void {
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

export function insertComponent(
  parentId: string,
  component: string,
  options?: { position?: 'first' | 'last' | number; properties?: string }
): boolean {
  return executor.execute(new InsertComponentCommand({ parentId, component, ...options })).success
}

export function deleteNode(nodeId: string): boolean {
  return executor.execute(new DeleteNodeCommand({ nodeId })).success
}

export function onSelectionChange(
  callback: (nodeId: string | null, origin: string) => void
): () => void {
  return events.on('selection:changed', ({ nodeId, origin }) => callback(nodeId, origin))
}

export function onSourceChange(callback: (source: string, origin: string) => void): () => void {
  return events.on('source:changed', ({ source, origin }) => callback(source, origin))
}

export function onCompileComplete(
  callback: (data: { ast: AST; ir: IR | null; sourceMap: SourceMap }) => void
): () => void {
  return events.on('compile:completed', callback)
}
