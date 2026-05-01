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
  adjustChangeForWrap,
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
import { PropertyExtractor, CodeModifier } from './code-modifier'
import { PropertyPanel, createPropertyPanel, SettingsPanel, createSettingsPanel } from './panels'
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
import type { AST, IR, SourceMap } from '../compiler'
import type { CodeChange } from './code-modifier'
import type { EditorView } from '@codemirror/view'
import { logBootstrap } from '../compiler/utils/logger'

export interface BootstrapConfig {
  /** CodeMirror EditorView instance */
  editor: EditorView
  previewContainer: HTMLElement
  propertyPanelContainer?: HTMLElement
  componentPanelContainer?: HTMLElement
  userComponentsPanelContainer?: HTMLElement
  explorerPanelContainer?: HTMLElement
  fileTreeContainer?: HTMLElement
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
  drawManager: DrawManager | null
  inlineEdit: InlineEditController | null
  /** Settings panel for studio configuration */
  settingsPanel: SettingsPanel | null
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
  drawManager: null,
  inlineEdit: null,
  settingsPanel: null,
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
    studio.settingsPanel?.dispose()

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
    studio.settingsPanel = null
  },
}

// Store property panel container for lazy initialization
let propertyPanelContainer: HTMLElement | null = null

// Store component panel container for lazy initialization
let componentPanelContainer: HTMLElement | null = null

// Store user components panel container for lazy initialization
let userComponentsPanelContainer: HTMLElement | null = null

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
  const { componentName, properties, textContent, children, mirTemplate } = dragData

  // 1. Use mirTemplate if provided (Pure Mirror components like Accordion, Select)
  if (mirTemplate) {
    return mirTemplate
  }

  // 2. Try template-based code generation from COMPONENT_TEMPLATES
  if (options?.componentId && options?.filename) {
    const fileType = getFileType(options.filename)
    const template = getComponentTemplate(options.componentId, fileType)
    if (template) {
      return template
    }
  }

  // 3. Fallback to property-based code generation
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

  // Create studio context with initial state
  studioContext = createStudioContext({
    source: config.initialSource || '',
    currentFile: config.currentFile || 'index.mir',
  })
  setStudioContext(studioContext)

  if (config.propertyPanelContainer) propertyPanelContainer = config.propertyPanelContainer
  if (config.componentPanelContainer) componentPanelContainer = config.componentPanelContainer
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
          // Insert component at cursor in editor
          events.emit('component:insert-requested', { item })
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
          // Insert component at cursor in editor
          events.emit('component:insert-requested', { item })
        },
        onRefresh: () => {
          logBootstrap.info(' UserComponentsPanel refreshed')
        },
      }
    )
    logBootstrap.info(' UserComponentsPanel initialized')
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

  // LLM-Edit-Flow: keymap + ghost-diff + edit-handler are wired up in
  // app.js where the EditorView is constructed. Bootstrap no longer owns
  // any AI-edit state — runEdit talks to the Tauri bridge directly.

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
    isWrappedWithApp: () => state.get().isWrappedWithApp,
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
      // Insert at cursor in editor
      if (studio.editor) {
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

  // ============================================
  // Settings Panel
  // ============================================
  studio.settingsPanel = createSettingsPanel(undefined, {
    onClose: () => {
      // Update activity bar when settings panel is closed
      globalActivityBar?.setActive('settings', false)
    },
  })

  // Cmd+, (macOS) / Ctrl+, (Windows/Linux) to open settings
  const handleSettingsShortcut = (e: KeyboardEvent) => {
    if (e.key === ',' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      studio.settingsPanel?.toggle()
      // Update activity bar state
      globalActivityBar?.setActive('settings', studio.settingsPanel?.isShowing() ?? false)
    }
  }
  document.addEventListener('keydown', handleSettingsShortcut)
  eventUnsubscribes.push(() => document.removeEventListener('keydown', handleSettingsShortcut))

  logBootstrap.info(' Settings Panel initialized (Cmd+, to open)')

  // Initialize panel visibility (MUST run first - sets up event listener)
  initializePanelVisibility()

  // Initialize Panel Toolbar (legacy View Menu)
  initializePanelToolbar()

  // Initialize global Activity Bar for panel toggles
  initializeActivityBar()

  // Expose studio on window for legacy code (PanelResizer)
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

  // Bottom items (settings)
  const bottomItems = [
    { id: 'settings', icon: ACTIVITY_BAR_ICONS.settings, tooltip: 'Settings (Cmd+,)' },
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
      bottomItems,
    },
    {
      onToggle: (id, active) => {
        // Update panel visibility via state action
        actions.setPanelVisibility(id as keyof typeof visibility, active)
      },
      onBottomItemClick: id => {
        if (id === 'settings') {
          studio.settingsPanel?.toggle()
          // Update active state based on panel visibility
          globalActivityBar?.setActive('settings', studio.settingsPanel?.isShowing() ?? false)
        }
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
            // Apply the change to the editor. The CodeModifier returns
            // offsets relative to the resolved (prelude + optional `App`-
            // wrapped + indented) source; the editor only contains the
            // user's source. Use the shared wrap-aware adjuster so this
            // path stays in sync with studio/app.js's
            // handleStudioCodeChange (single source of truth).
            const ctx = getCommandContext()
            if (ctx?.applyChange) {
              const s = state.get()
              const adjustedChange = adjustChangeForWrap(
                result.change,
                s.preludeOffset || 0,
                s.isWrappedWithApp || false,
                s.resolvedSource || ''
              )
              const editorSource = ctx.getSource?.() ?? ''
              if (
                adjustedChange.from >= 0 &&
                adjustedChange.to <= editorSource.length &&
                adjustedChange.from <= adjustedChange.to
              ) {
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
