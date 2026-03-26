/**
 * Studio Bootstrap - Integration with app.js
 */

import { state, actions, events, executor, setCommandContext, getStateSelectionAdapter, SetPropertyCommand, RemovePropertyCommand, InsertComponentCommand, DeleteNodeCommand, SetTextContentCommand, createStudioContext, setStudioContext, type Command, type CommandContext, type StudioContext } from './core'
import { createSyncCoordinator, createLineOffsetService, type SyncCoordinator } from './sync'
import { AutocompleteEngine, getAutocompleteEngine, type AutocompleteRequest, type AutocompleteResult } from './autocomplete'
import { EditorController, createEditorController, setEditorController, EditorDropHandler, createEditorDropHandler } from './editor'
import { PreviewController, createPreviewController, setPreviewController, PreviewBreadcrumb, createPreviewBreadcrumb } from './preview'
import { LLMBridge, getLLMBridge, getContextBuilder, getEditPrompt, type LLMResponse } from './llm'
import { initializeAgent, getAgentIntegration, type AgentIntegration } from './agent'
import { PropertyExtractor, CodeModifier, setGridSettingsProvider } from '../src/studio'
import { gridSettings } from './core/settings'
import { PropertyPanel, createPropertyPanel } from './panels/property-panel'
import { ComponentPanel, createComponentPanel, UserComponentsPanel, createUserComponentsPanel, getComponentTemplate, getFileType } from './panels/components'
import { ExplorerPanel, createExplorerPanel } from './panels/explorer'
import { DrawManager, createDrawManager } from './visual/draw-manager'
import { InlineEditController, createInlineEditController } from './inline-edit'
import { createDragDropSystem, createCodeExecutor, type DragDropSystem } from './drag-drop'
import { initUserSettings } from './storage/user-settings'
import type { AST } from '../src/parser/ast'
import type { IR } from '../src/ir/types'
import type { SourceMap } from '../src/ir/source-map'
import type { CodeChange } from '../src/studio/code-modifier'

export interface BootstrapConfig {
  editor: any
  previewContainer: HTMLElement
  propertyPanelContainer?: HTMLElement
  componentPanelContainer?: HTMLElement
  explorerPanelContainer?: HTMLElement
  fileTreeContainer?: HTMLElement
  explorerComponentsContainer?: HTMLElement
  explorerUserComponentsContainer?: HTMLElement
  chatPanelContainer?: HTMLElement
  initialSource?: string
  currentFile?: string
  /** Callback to get all project source (for token extraction from all files) */
  getAllSource?: () => string
  /** Callback to get current file name */
  getCurrentFile?: () => string
  /** Callback to get all project files with types */
  getFiles?: () => { name: string; type: 'tokens' | 'components' | 'component' | 'layout' | 'unknown'; code: string }[]
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
  sync: SyncCoordinator | null
  propertyPanel: PropertyPanel | null
  componentPanel: ComponentPanel | null
  userComponentsPanel: UserComponentsPanel | null
  explorerPanel: ExplorerPanel | null
  editorDropHandler: EditorDropHandler | null
  breadcrumb: PreviewBreadcrumb | null
  autocomplete: AutocompleteEngine
  llm: LLMBridge
  agent: AgentIntegration | null
  drawManager: DrawManager | null
  inlineEdit: InlineEditController | null
  dragDrop: DragDropSystem | null
  /** Cleanup all event subscriptions and resources */
  dispose: () => void
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
  sync: null,
  propertyPanel: null,
  componentPanel: null,
  userComponentsPanel: null,
  explorerPanel: null,
  editorDropHandler: null,
  breadcrumb: null,
  autocomplete: getAutocompleteEngine(),
  llm: getLLMBridge(),
  agent: null,
  drawManager: null,
  inlineEdit: null,
  dragDrop: null,
  dispose: () => {
    // Unsubscribe all event listeners
    for (const unsubscribe of eventUnsubscribes) {
      unsubscribe()
    }
    eventUnsubscribes.length = 0

    // Dispose components
    studio.sync?.dispose()
    studio.propertyPanel?.detach()
    studio.componentPanel?.dispose()
    studio.userComponentsPanel?.dispose()
    studio.explorerPanel?.dispose()
    studio.editorDropHandler?.detach()
    studio.drawManager?.dispose()
    studio.inlineEdit?.dispose()
    studio.dragDrop?.dispose()
    studio.preview?.dispose()

    // Clear references
    studio.editor = null
    studio.preview = null
    studio.sync = null
    studio.propertyPanel = null
    studio.componentPanel = null
    studio.userComponentsPanel = null
    studio.explorerPanel = null
    studio.editorDropHandler = null
    studio.breadcrumb = null
    studio.drawManager = null
    studio.inlineEdit = null
    studio.dragDrop = null
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
  dragData: any,
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
function generateChildCode(child: any, indent: number): string {
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
  console.log('[Studio] Initializing new architecture...')

  // Load user settings from server (non-blocking)
  initUserSettings().catch(err => {
    console.warn('[Studio] Failed to load user settings:', err)
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

  // Initialize Explorer Panel if containers provided
  if (config.explorerPanelContainer && config.fileTreeContainer && config.explorerComponentsContainer) {
    studio.explorerPanel = createExplorerPanel(
      {
        container: config.explorerPanelContainer,
        fileTreeContainer: config.fileTreeContainer,
        componentPanelContainer: config.explorerComponentsContainer,
        userComponentsPanelContainer: config.explorerUserComponentsContainer,
        defaultView: 'files',
      },
      {
        onViewChange: (view) => {
          console.log('[Explorer] View changed:', view)
        },
      }
    )
    studio.explorerPanel.initialize()
    console.log('[Studio] ExplorerPanel initialized')

    // Use explorer's component container for ComponentPanel
    componentPanelContainer = config.explorerComponentsContainer

    // Use explorer's user components container for UserComponentsPanel
    userComponentsPanelContainer = config.explorerUserComponentsContainer ?? null
  }

  // Initialize Component Panel if container provided
  if (componentPanelContainer) {
    // Enable tab bar when inside explorer panel
    const isInsideExplorer = !!config.explorerPanelContainer
    studio.componentPanel = createComponentPanel(
      {
        container: componentPanelContainer,
        showTabBar: isInsideExplorer,
        defaultTab: 'basic',
      },
      {
        onDragStart: (item, event) => {
          events.emit('component:drag-start', { item, event })
        },
        onDragEnd: (item, event) => {
          events.emit('component:drag-end', { item, event })
        },
        onClick: (item) => {
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
    console.log('[Studio] ComponentPanel initialized')
  }

  // Initialize User Components Panel if container and getFiles provided
  if (userComponentsPanelContainer && config.getFiles) {
    const getFilesCallback = config.getFiles
    studio.userComponentsPanel = createUserComponentsPanel(
      {
        container: userComponentsPanelContainer,
        getComFiles: () => {
          const files = getFilesCallback()
          return files
            .filter(f => f.type === 'components' || f.type === 'component')
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
        onClick: (item) => {
          // Enter draw mode if DrawManager is available
          if (studio.drawManager) {
            studio.drawManager.enterDrawMode(item)
          } else {
            // Fallback to event emission (legacy behavior)
            events.emit('component:insert-requested', { item })
          }
        },
        onRefresh: () => {
          console.log('[Studio] UserComponentsPanel refreshed')
        },
      }
    )
    console.log('[Studio] UserComponentsPanel initialized')
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
      onCommand: (command) => {
        console.log('[Agent] Command executed:', command.type)
      },
      onError: (error) => {
        console.error('[Agent] Error:', error)
      }
    })
    console.log('[Studio] AI Agent initialized')
  }

  // Editor
  const editorController = createEditorController({ container: config.editor.dom.parentElement })
  editorController.initialize(config.editor)
  setEditorController(editorController)
  studioContext.editor = editorController
  studio.editor = editorController

  // Editor Drop Handler - allows dragging components into code editor
  const editorView = editorController.getEditorView()
  if (editorView) {
    studio.editorDropHandler = createEditorDropHandler({
      editor: editorView,
      onDrop: (dragData, position) => {
        // Generate component code (use template based on file type)
        const currentFile = getCurrentFileCallback?.() || 'index.mir'
        const code = generateComponentCodeFromDragData(dragData, {
          componentId: dragData.componentId,
          filename: currentFile,
        })
        studio.editorDropHandler?.insertComponentCode(code, position)
        console.log('[Studio] Component dropped into editor:', dragData.componentName)
      },
    })
    studio.editorDropHandler.attach()
    console.log('[Studio] EditorDropHandler initialized')
  }

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
  eventUnsubscribes.push(
    events.on('handle:drag-end', ({ nodeId, property, value }) => {
      // Use executor to apply property change (supports undo/redo)
      executor.execute(new SetPropertyCommand({ nodeId, property, value: String(value) }))
    })
  )

  // Sync - LineOffsetService handles editor ↔ SourceMap line translation
  const lineOffset = createLineOffsetService()
  const syncCoordinator = createSyncCoordinator({ cursorDebounce: 150, debug: false, lineOffset })
  syncCoordinator.setTargets({
    scrollEditorToLine: (editorLine) => {
      // editorLine is already converted from SourceMap line by SyncCoordinator
      // Set cursor AND scroll to make the selection visible
      // The debouncing in handleCursorMove prevents sync loops
      editorController.scrollToLineAndSelect(editorLine)
    },
    highlightPreviewElement: (nodeId) => nodeId ? previewController.select(nodeId) : previewController.clearSelection(),
    // Note: PropertyPanel receives updates directly via StateSelectionAdapter
    // which subscribes to selection:changed events. No callback needed here.
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

  // Initialize InlineEditController for Figma-style text editing
  const inlineEditController = createInlineEditController({
    container: config.previewContainer,
    onEditEnd: (nodeId, newText, saved) => {
      if (saved && newText) {
        // Execute SetTextContentCommand for undo/redo support
        executor.execute(new SetTextContentCommand({ nodeId, text: newText }))
      }
    },
  })
  inlineEditController.attach()
  studio.inlineEdit = inlineEditController

  // Listen for double-click events from PreviewController
  eventUnsubscribes.push(
    events.on('preview:element-dblclicked', ({ nodeId }) => {
      inlineEditController.startEdit(nodeId)
    })
  )

  // Hide resize handles during inline editing
  eventUnsubscribes.push(
    events.on('inline-edit:started', () => {
      previewController.getResizeManager()?.hideHandles()
      previewController.getHandleManager()?.hideHandles()
    })
  )

  // Restore resize handles after inline editing ends
  eventUnsubscribes.push(
    events.on('inline-edit:ended', () => {
      const selectedNodeId = state.get().selection.nodeId
      if (selectedNodeId) {
        previewController.getResizeManager()?.showHandles(selectedNodeId)
        previewController.getHandleManager()?.showHandles(selectedNodeId)
      }
    })
  )

  // Update InlineEditController's sourceMap after compile
  eventUnsubscribes.push(
    events.on('compile:completed', () => {
      inlineEditController.setSourceMap(state.get().sourceMap)
    })
  )

  // Initialize DrawManager
  const drawManager = createDrawManager({
    container: config.previewContainer,
    getCodeModifier: () => {
      const source = state.get().source
      const sourceMap = state.get().sourceMap
      return new CodeModifier(source, sourceMap)
    },
    sourceMap: () => state.get().sourceMap,
    gridSize: 8,  // 8px grid snapping
    enableSmartGuides: true,  // Enable alignment guides
    snapTolerance: 4,  // 4px snap threshold
  })

  drawManager.onDrawComplete = (result) => {
    if (result.success && result.modificationResult) {
      console.log('[DrawManager] Component created:', result.nodeId)

      // Apply code change to editor (adjust for prelude offset)
      const preludeOffset = state.get().preludeOffset
      const change = result.modificationResult.change

      const adjustedChange = {
        from: change.from - preludeOffset,
        to: change.to - preludeOffset,
        insert: change.insert
      }

      // Validate adjusted change range
      const docLength = editorController.getContent().length
      if (adjustedChange.from >= 0 && adjustedChange.to <= docLength && adjustedChange.from <= adjustedChange.to) {
        // Apply change to editor
        config.editor.dispatch({
          changes: adjustedChange
        })

        // Compile will be triggered automatically by editor change
        console.log('[DrawManager] Editor updated')
      } else {
        console.warn('[DrawManager] Invalid change range, forcing recompile', {
          original: change,
          adjusted: adjustedChange,
          preludeOffset,
          docLength
        })
        // Force recompile
        events.emit('compile:requested', {})
      }
    }
  }

  drawManager.onDrawCancel = () => {
    console.log('[DrawManager] Drawing cancelled')
  }

  drawManager.onError = (error) => {
    console.error('[DrawManager] Error:', error)
  }

  studio.drawManager = drawManager

  // ============================================
  // Drag & Drop System - Webflow Style
  // ============================================
  //
  // Handles both NEW components (from palette) and MOVING elements (in preview).
  // Uses line indicators to show insertion point.
  // No absolute positioning, no 9-zone system.

  // Create code executor for drag-drop operations
  const codeExecutor = createCodeExecutor({
    getSource: () => editorController.getContent(),
    getResolvedSource: () => {
      // Resolved source = prelude + current file (matches SourceMap positions)
      const resolved = state.get().resolvedSource
      return resolved || editorController.getContent()
    },
    getPreludeOffset: () => state.get().preludeOffset,
    getSourceMap: () => state.get().sourceMap,
    getCurrentFile: () => getCurrentFileCallback?.() || 'index.mir',
    applyChange: (newSource: string) => {
      const currentContent = editorController.getContent()
      if (newSource !== currentContent) {
        config.editor.dispatch({
          changes: { from: 0, to: currentContent.length, insert: newSource }
        })
      }
    },
    recompile: async () => {
      events.emit('compile:requested', {})
    },
    createModifier: (source: string, sourceMap: SourceMap) => {
      return new CodeModifier(source, sourceMap)
    },
  })

  // Initialize drag-drop system (Webflow-style)
  const dragDropSystem = createDragDropSystem({
    container: config.previewContainer,
    codeExecutor,
    enableAltDuplicate: true,
    onDragStart: (source) => {
      if (source.type === 'canvas') {
        console.log('[DragDrop] Move started:', source.nodeId)
      } else {
        console.log('[DragDrop] Insert started:', source.componentName)
      }
    },
    onDrop: (source, result) => {
      console.log('[DragDrop] Drop:', source.type, result.placement, result.targetId)
      if (result.target?.nodeId) {
        actions.setDeferredSelection({
          type: 'nodeId',
          nodeId: result.target.nodeId,
          origin: 'preview',
        })
      }
    },
    onDragEnd: (source, success) => {
      console.log('[DragDrop] End:', success ? 'success' : 'cancelled')
    },
  })

  dragDropSystem.init()
  studio.dragDrop = dragDropSystem

  // Disable drag during compile to prevent stale SourceMap issues
  eventUnsubscribes.push(
    events.on('compile:requested', () => {
      dragDropSystem.disable()
    })
  )

  eventUnsubscribes.push(
    events.on('compile:completed', () => {
      dragDropSystem.enable()
    })
  )

  console.log('[Studio] Drag-drop initialized (Webflow-style)')

  // ============================================
  // Component Event Handlers
  // ============================================

  // Handle component insert request (click on component in palette)
  eventUnsubscribes.push(
    events.on('component:insert-requested', ({ item }) => {
      // Try DrawManager first, fallback to editor insert
      if (studio.drawManager && studio.preview) {
        studio.drawManager.enterDrawMode(item)
      } else if (studio.editor) {
        // Insert at cursor in editor (use template based on file type)
        const currentFile = getCurrentFileCallback?.() || 'index.mir'
        const code = generateComponentCodeFromDragData({
          componentName: item.template,
          componentId: item.id,
          properties: item.properties,
          textContent: item.textContent,
          children: item.children,
        }, {
          componentId: item.id,
          filename: currentFile,
        })
        studio.editor.insertAtCursor('\n' + code)
      }
    })
  )

  // Handle explorer view changes
  eventUnsubscribes.push(
    events.on('explorer:view-changed', ({ view }) => {
      // Could persist preference or update UI state
      console.log('[Studio] Explorer view changed to:', view)
    })
  )

  // Handle component tab changes
  eventUnsubscribes.push(
    events.on('components:tab-changed', ({ tab }) => {
      console.log('[Studio] Component tab changed to:', tab)
    })
  )

  // Initialize Panel Toolbar
  initializePanelToolbar()

  console.log('[Studio] New architecture initialized')
  return studio
}

/**
 * Initialize the View Menu for panel visibility
 */
function initializePanelToolbar(): void {
  const menuButton = document.getElementById('view-menu-button')
  const menu = document.getElementById('view-menu')
  if (!menuButton || !menu) return

  // Panel ID to DOM element mapping
  const panelElements: Record<string, HTMLElement | null> = {
    prompt: document.getElementById('chat-panel'),
    files: document.getElementById('explorer-panel') || document.querySelector('.sidebar'),
    code: document.querySelector('.editor-panel'),
    components: document.getElementById('components-panel'),
    preview: document.querySelector('.preview-panel'),
    property: document.getElementById('property-panel'),
  }

  // Apply initial state (defaults, then loaded from server after login)
  const visibility = state.get().panelVisibility
  for (const [panelKey, panel] of Object.entries(panelElements)) {
    const isVisible = visibility[panelKey as keyof typeof visibility]
    const checkbox = menu.querySelector(`[data-panel="${panelKey}"] input`) as HTMLInputElement | null

    if (panel) {
      panel.classList.toggle('panel-hidden', !isVisible)
    }
    if (checkbox) {
      checkbox.checked = isVisible
    }
  }

  // Toggle menu open/close
  menuButton.addEventListener('click', (e) => {
    e.stopPropagation()
    menu.classList.toggle('open')
    menuButton.classList.toggle('active', menu.classList.contains('open'))
  })

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target as Node) && !menuButton.contains(e.target as Node)) {
      menu.classList.remove('open')
      menuButton.classList.remove('active')
    }
  })

  // Handle checkbox changes
  menu.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement
    if (target.type !== 'checkbox') return

    const menuItem = target.closest('.view-menu-item') as HTMLElement | null
    const panelKey = menuItem?.dataset.panel as keyof typeof visibility
    if (!panelKey) return

    actions.setPanelVisibility(panelKey, target.checked)
  })

  // Listen for visibility changes (from state)
  eventUnsubscribes.push(
    events.on('panel:visibility-changed', ({ panel, visible }) => {
      const panelEl = panelElements[panel]
      const checkbox = menu.querySelector(`[data-panel="${panel}"] input`) as HTMLInputElement | null

      if (panelEl) {
        panelEl.classList.toggle('panel-hidden', !visible)
      }
      if (checkbox) {
        checkbox.checked = visible
      }

      console.log(`[ViewMenu] ${panel} visibility: ${visible}`)
    })
  )

  console.log('[Studio] View menu initialized')
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
