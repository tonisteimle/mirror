/**
 * State Store for Studio
 *
 * Central state management for the Mirror Studio.
 * Types are defined in state-types.ts, Store class in store.ts.
 */

import type { AST, ParseError } from '../../compiler/parser/ast'
import type { IR } from '../../compiler/ir/types'
import type { SourceMap } from '../../compiler/ir/source-map'
import { events } from './events'
import { Store } from './store'
import { initSelectors, computed, createSelector } from './selectors'
import { logState } from '../../compiler/utils/logger'
import type {
  SelectionOrigin,
  BreadcrumbItem,
  CompileResult,
  DeferredSelection,
  PendingSelection,
  PanelVisibility,
  PanelSizes,
  PanelSettings,
  LayoutRect,
  HandleMode,
  StudioState,
  Subscriber,
  Selector,
} from './state-types'

// Re-export types for backward compatibility
export type {
  SelectionOrigin,
  BreadcrumbItem,
  CompileResult,
  DeferredSelection,
  PendingSelection,
  PanelVisibility,
  PanelSizes,
  PanelSettings,
  LayoutRect,
  HandleMode,
  StudioState,
  Subscriber,
  Selector,
}

const PANEL_SETTINGS_KEY = 'mirror-panel-settings'

/**
 * Default panel visibility
 */
const defaultPanelVisibility: PanelVisibility = {
  prompt: true,
  files: true,
  code: true,
  components: true, // Standalone components panel
  tokens: true, // Standalone tokens panel
  'design-system': true, // Component preview in all states
  preview: true,
  property: true,
}

/**
 * Default panel sizes (pixels)
 */
const defaultPanelSizes: PanelSizes = {
  sidebar: 200,
  components: 240,
  tokens: 280,
  editor: 400,
  preview: 400,
  property: 280,
}

/**
 * Load panel settings from localStorage
 */
function loadPanelSettings(): { visibility: PanelVisibility; sizes: PanelSizes } {
  try {
    const stored = localStorage.getItem(PANEL_SETTINGS_KEY)
    if (stored) {
      const settings = JSON.parse(stored) as Partial<PanelSettings>
      return {
        visibility: { ...defaultPanelVisibility, ...settings.visibility },
        sizes: { ...defaultPanelSizes, ...settings.sizes },
      }
    }
  } catch (e) {
    logState.warn(' Failed to load panel settings from localStorage:', e)
  }
  return {
    visibility: { ...defaultPanelVisibility },
    sizes: { ...defaultPanelSizes },
  }
}

/**
 * Save panel settings to localStorage
 */
function savePanelSettings(visibility: PanelVisibility, sizes: PanelSizes): void {
  try {
    const settings: PanelSettings = { visibility, sizes }
    localStorage.setItem(PANEL_SETTINGS_KEY, JSON.stringify(settings))
  } catch (e) {
    logState.warn(' Failed to save panel settings to localStorage:', e)
  }
}

// Load panel settings once at startup
const loadedPanelSettings = loadPanelSettings()

const initialState: StudioState = {
  source: '',
  resolvedSource: '',
  validatedSource: '',
  ast: null,
  ir: null,
  sourceMap: null,
  errors: [],
  compileVersion: 0,
  compileTimestamp: 0,
  compiling: false,
  selection: { nodeId: null, origin: 'editor' },
  multiSelection: [],
  breadcrumb: [],
  cursor: { line: 1, column: 1 },
  editorHasFocus: true,
  currentFile: 'index.mir',
  previewFile: 'index.mir',
  files: {},
  fileTypes: {},
  panels: { left: true, right: true },
  panelVisibility: loadedPanelSettings.visibility,
  panelSizes: loadedPanelSettings.sizes,
  mode: 'mirror',
  preludeOffset: 0,
  preludeLineOffset: 0,
  isWrappedWithApp: false,
  pendingSelection: null,
  queuedSelection: null,
  deferredSelection: null,
  inlineEditActive: false,
  inlineEditNodeId: null,
  playMode: false,
  layoutInfo: new Map(),
  layoutVersion: 0,
  handleMode: 'resize',
}

export const state = new Store<StudioState>(initialState)

// Initialize selectors with state getter
initSelectors(() => state.get())

// Re-export selectors for backward compatibility
export { computed, createSelector }

export const actions = {
  setSource(source: string, origin: 'editor' | 'command' | 'external' = 'external'): void {
    state.set({ source })
    events.emit('source:changed', { source, origin })
  },

  /**
   * Set compiling status - call before starting compilation
   */
  setCompiling(compiling: boolean): void {
    state.set({ compiling })
    events.emit(compiling ? 'compile:started' : 'compile:idle')
  },

  /**
   * Atomically set compile result - AST, IR, SourceMap, and errors together
   * This ensures all compile artifacts are consistent with each other
   * Also resolves any pending selection after state update
   */
  setCompileResult(result: { ast: AST; ir: IR; sourceMap: SourceMap; errors: ParseError[] }): void {
    const currentState = state.get()
    const newVersion = currentState.compileVersion + 1
    const hasPendingSelection = currentState.pendingSelection !== null
    const hasQueuedSelection = currentState.queuedSelection !== null
    const hasDeferredSelection = currentState.deferredSelection !== null

    // Validate multi-selection against new SourceMap
    const validMultiSelection = currentState.multiSelection.filter(
      id => result.sourceMap.getNodeById(id) !== null
    )
    const multiSelectionChanged = validMultiSelection.length !== currentState.multiSelection.length

    // Atomic update - all fields together
    state.set({
      ast: result.ast,
      ir: result.ir,
      sourceMap: result.sourceMap,
      errors: result.errors,
      compileVersion: newVersion,
      compileTimestamp: Date.now(),
      compiling: false,
      // Clean up invalid multi-selections
      ...(multiSelectionChanged ? { multiSelection: validMultiSelection } : {}),
    })

    events.emit('compile:completed', {
      ast: result.ast,
      ir: result.ir,
      sourceMap: result.sourceMap,
      version: newVersion,
      hasErrors: result.errors.length > 0,
    })

    // Resolve queued selection first (direct nodeId-based)
    // This takes priority over pending selection but doesn't skip validation
    if (hasQueuedSelection) {
      const queued = currentState.queuedSelection!
      state.set({ queuedSelection: null })
      // Validate that node still exists
      if (result.sourceMap.getNodeById(queued.nodeId)) {
        logState.info(' Resolving queued selection:', queued.nodeId)
        actions.setSelection(queued.nodeId, queued.origin)
      } else {
        // Node no longer exists - find a fallback
        logState.warn(' Queued selection no longer exists:', queued.nodeId)
        const fallbackId = actions.findFallbackSelection(queued.nodeId, result.sourceMap)
        if (fallbackId) {
          logState.info(' Using fallback for queued selection:', fallbackId)
          actions.setSelection(fallbackId, queued.origin)
          // Notify that fallback was used
          events.emit('selection:fallback', {
            requestedId: queued.nodeId,
            resolvedId: fallbackId,
            reason: 'node_deleted',
          })
        }
      }
      // Continue to check pendingSelection (don't return early)
    }

    // Resolve pending selection FIRST (line-based, from drop operations)
    // This takes priority over deferredSelection because it's more specific
    // (targeting the exact line where code was inserted)
    // IMPORTANT: Synchronous resolution to prevent race conditions (PREV-005)
    if (hasPendingSelection) {
      try {
        const resolvedNodeId = actions.resolvePendingSelection()
        if (resolvedNodeId) {
          logState.info('Pending selection resolved after compile:', resolvedNodeId)
          // Clear any deferred selection that might have been set during compile
          if (hasDeferredSelection) {
            state.set({ deferredSelection: null })
          }
        }
      } catch (error) {
        logState.error('Error resolving pending selection:', error)
        events.emit('state:error', { error, context: 'pending selection resolution' })
      }
      return // Skip selection validation when we have pending selection
    }

    // Resolve deferred selection (unified API - for programmatic selections during compile)
    // IMPORTANT: Synchronous resolution to prevent race conditions with rapid compiles
    // Previously used Promise.resolve().then() which could lose selections (PREV-005)
    if (hasDeferredSelection) {
      try {
        const resolvedNodeId = actions.resolveDeferredSelection()
        if (resolvedNodeId) {
          logState.info(' Deferred selection resolved after compile:', resolvedNodeId)
        }
      } catch (error) {
        logState.error(' Error resolving deferred selection:', error)
        events.emit('state:error', { error, context: 'deferred selection resolution' })
      }
      return // Skip selection validation when we have deferred selection
    }

    // Validate current selection against new SourceMap
    // IMPORTANT: Re-read selection state here as it may have changed during compile:completed handlers
    const latestState = state.get()
    const currentSelection = latestState.selection.nodeId
    if (currentSelection && result.sourceMap) {
      const nodeExists = result.sourceMap.getNodeById(currentSelection) !== null
      if (!nodeExists) {
        logState.warn(` Selection ${currentSelection} no longer exists after compile`)

        // Find a fallback selection instead of clearing
        const fallbackId = actions.findFallbackSelection(currentSelection, result.sourceMap)

        if (fallbackId) {
          logState.info(` Fallback selection: ${fallbackId}`)
          state.set({ selection: { nodeId: fallbackId, origin: latestState.selection.origin } })
          events.emit('selection:changed', {
            nodeId: fallbackId,
            origin: latestState.selection.origin,
          })
        } else {
          logState.warn(` No fallback found, clearing selection`)
          state.set({ selection: { nodeId: null, origin: latestState.selection.origin } })
        }
        events.emit('selection:invalidated', { nodeId: currentSelection })
      }
    }
  },

  /**
   * Set selection with validation
   * Only allows selecting nodes that exist in the current SourceMap
   * Deduplicates: won't emit if same nodeId is already selected
   * Queues selection if SourceMap not yet available (during compile)
   */
  setSelection(nodeId: string | null, origin: SelectionOrigin): void {
    const currentState = state.get()

    // Deduplicate: don't emit if same nodeId AND origin already selected
    // This prevents sync loops when cursor is set after preview click
    if (currentState.selection.nodeId === nodeId && currentState.selection.origin === origin) {
      return
    }

    // Handle missing SourceMap during compile - defer for later
    if (nodeId !== null && !currentState.sourceMap) {
      if (currentState.compiling) {
        // Use unified deferred selection mechanism
        logState.info(` Deferring selection during compile: ${nodeId}`)
        state.set({
          deferredSelection: { type: 'nodeId', nodeId, origin },
          // Also set legacy queuedSelection for backward compatibility
          queuedSelection: { nodeId, origin },
        })
        return
      }
      // No SourceMap and not compiling - allow selection (for tests/initial state)
      // In production, SourceMap is always available before user can select
      state.set({ selection: { nodeId, origin } })
      events.emit('selection:changed', { nodeId, origin })
      return
    }

    // Validate nodeId exists in SourceMap
    if (nodeId !== null && currentState.sourceMap) {
      const node = currentState.sourceMap.getNodeById(nodeId)
      if (!node) {
        logState.warn(` Cannot select non-existent node: ${nodeId}`)
        return
      }
    }

    state.set({ selection: { nodeId, origin } })
    events.emit('selection:changed', { nodeId, origin })
  },

  /**
   * Clear selection (convenience method)
   * Deduplicates: won't emit if already cleared
   */
  clearSelection(origin: SelectionOrigin = 'editor'): void {
    const currentState = state.get()
    if (currentState.selection.nodeId === null) {
      return // Already cleared
    }
    state.set({ selection: { nodeId: null, origin } })
    events.emit('selection:changed', { nodeId: null, origin })
  },

  setBreadcrumb(breadcrumb: BreadcrumbItem[]): void {
    state.set({ breadcrumb })
    events.emit('breadcrumb:changed', { breadcrumb })
  },
  setCursor(line: number, column: number): void {
    state.set({ cursor: { line, column } })
    events.emit('editor:cursor-moved', { line, column })
  },
  setEditorFocus(hasFocus: boolean): void {
    state.set({ editorHasFocus: hasFocus })
    events.emit(hasFocus ? 'editor:focused' : 'editor:blurred')
  },

  /**
   * Set the preview file (layout rendered in the preview pane).
   * Decoupled from currentFile so editing tokens/components keeps the
   * layout visible.
   */
  setPreviewFile(path: string | null): void {
    const current = state.get().previewFile
    if (current === path) return
    state.set({ previewFile: path })
    events.emit('preview:file-changed', { path })
  },

  /**
   * Toggle a node in multi-selection (for Shift+Click)
   */
  toggleMultiSelection(nodeId: string): void {
    const current = state.get().multiSelection
    const index = current.indexOf(nodeId)

    if (index >= 0) {
      state.set({ multiSelection: current.filter(id => id !== nodeId) })
    } else {
      state.set({ multiSelection: [...current, nodeId] })
    }
    events.emit('multiselection:changed', { nodeIds: state.get().multiSelection })
  },

  /**
   * Set multi-selection to specific nodes
   */
  setMultiSelection(nodeIds: string[]): void {
    state.set({ multiSelection: nodeIds })
    events.emit('multiselection:changed', { nodeIds })
  },

  /**
   * Clear multi-selection
   */
  clearMultiSelection(): void {
    state.set({ multiSelection: [] })
    events.emit('multiselection:changed', { nodeIds: [] })
  },

  /**
   * Set the handle mode (resize, padding, margin)
   */
  setHandleMode(mode: HandleMode): void {
    const prevMode = state.get().handleMode
    if (prevMode !== mode) {
      state.set({ handleMode: mode })
      events.emit('handleMode:changed', { mode, prevMode })
    }
  },

  /**
   * Toggle panel visibility and persist to localStorage
   */
  togglePanelVisibility(panel: keyof PanelVisibility): void {
    const currentState = state.get()
    const newVisibility: PanelVisibility = {
      ...currentState.panelVisibility,
      [panel]: !currentState.panelVisibility[panel],
    }
    state.set({ panelVisibility: newVisibility })
    savePanelSettings(newVisibility, currentState.panelSizes)
    events.emit('panel:visibility-changed', { panel, visible: newVisibility[panel] })
  },

  /**
   * Set panel visibility directly and persist to localStorage
   */
  setPanelVisibility(panel: keyof PanelVisibility, visible: boolean): void {
    const currentState = state.get()
    if (currentState.panelVisibility[panel] === visible) return

    const newVisibility: PanelVisibility = {
      ...currentState.panelVisibility,
      [panel]: visible,
    }
    state.set({ panelVisibility: newVisibility })
    savePanelSettings(newVisibility, currentState.panelSizes)
    events.emit('panel:visibility-changed', { panel, visible })
  },

  /**
   * Set panel sizes and persist to localStorage
   */
  setPanelSizes(sizes: PanelSizes): void {
    const currentState = state.get()
    state.set({ panelSizes: sizes })
    savePanelSettings(currentState.panelVisibility, sizes)
    events.emit('panel:sizes-changed', { sizes })
  },

  /**
   * Get current panel sizes
   */
  getPanelSizes(): PanelSizes {
    return state.get().panelSizes
  },

  /**
   * Get current compile version - use to check if SourceMap is stale
   */
  getCompileVersion(): number {
    return state.get().compileVersion
  },

  /**
   * Check if currently compiling
   */
  isCompiling(): boolean {
    return state.get().compiling
  },

  /**
   * Set pending selection - call BEFORE compile to queue a selection
   * The pending selection will be resolved after compile completes
   */
  setPendingSelection(pending: PendingSelection): void {
    state.set({ pendingSelection: pending })
    logState.info(' Pending selection set:', pending)
  },

  /**
   * Clear pending selection without resolving
   */
  clearPendingSelection(): void {
    state.set({ pendingSelection: null })
  },

  /**
   * Resolve pending selection using the current SourceMap
   * Called automatically by setCompileResult after compile completes
   *
   * This calls actions.setSelection() which emits selection:changed.
   * SyncCoordinator listens to this event and automatically syncs:
   * - Editor scroll (if origin is not editor)
   * - Preview highlight (if origin is not preview)
   * - Property panel update
   *
   * Returns the nodeId if found, null otherwise
   */
  resolvePendingSelection(): string | null {
    const currentState = state.get()
    const pending = currentState.pendingSelection

    if (!pending) {
      return null
    }

    const sourceMap = currentState.sourceMap
    if (!sourceMap) {
      logState.warn('Cannot resolve pending selection: no SourceMap')
      state.set({ pendingSelection: null })
      return null
    }

    // Calculate the line number in resolved source (prelude line offset + current file line)
    const preludeLines = currentState.preludeLineOffset
    const resolvedLine = preludeLines + pending.line

    logState.info('Resolving pending selection:', {
      originalLine: pending.line,
      preludeLineOffset: preludeLines,
      resolvedLine,
      componentName: pending.componentName,
    })

    // Clear pending selection first
    state.set({ pendingSelection: null })

    // Find node at the resolved line
    const node = sourceMap.getNodeAtLine(resolvedLine)

    if (node && node.nodeId) {
      logState.info('Resolved pending selection to:', node.nodeId)
      // Set selection - SyncCoordinator will automatically handle sync via event
      actions.setSelection(node.nodeId, pending.origin)
      return node.nodeId
    }

    // Fallback: search by component name in nearby lines
    logState.info('Node not found at exact line, searching nearby...')
    for (let offset = -2; offset <= 2; offset++) {
      const searchLine = resolvedLine + offset
      const nearbyNode = sourceMap.getNodeAtLine(searchLine)
      if (nearbyNode && nearbyNode.componentName === pending.componentName) {
        logState.info('Found node by component name at line', searchLine, ':', nearbyNode.nodeId)
        // Set selection - SyncCoordinator will automatically handle sync via event
        actions.setSelection(nearbyNode.nodeId, pending.origin)
        return nearbyNode.nodeId
      }
    }

    logState.warn('Could not resolve pending selection')
    return null
  },

  // ==========================================================================
  // Unified Deferred Selection (new API - preferred over pending/queued)
  // ==========================================================================

  /**
   * Set a deferred selection to be resolved after compile completes
   *
   * This is the unified API that replaces both setPendingSelection and queuedSelection.
   *
   * @param deferred - Either { type: 'nodeId', nodeId, origin } or { type: 'line', line, componentName, origin }
   */
  setDeferredSelection(deferred: DeferredSelection): void {
    state.set({ deferredSelection: deferred })
    logState.info(' Deferred selection set:', deferred)
  },

  /**
   * Clear deferred selection without resolving
   */
  clearDeferredSelection(): void {
    state.set({ deferredSelection: null })
  },

  /**
   * Resolve deferred selection using the current SourceMap
   * Called automatically by setCompileResult after compile completes
   *
   * Returns the nodeId if found, null otherwise
   */
  resolveDeferredSelection(): string | null {
    const currentState = state.get()
    const deferred = currentState.deferredSelection

    if (!deferred) {
      return null
    }

    const sourceMap = currentState.sourceMap
    if (!sourceMap) {
      logState.warn(' Cannot resolve deferred selection: no SourceMap')
      state.set({ deferredSelection: null })
      return null
    }

    // Clear deferred selection first
    state.set({ deferredSelection: null })

    if (deferred.type === 'nodeId') {
      // Direct nodeId selection - validate and select
      if (sourceMap.getNodeById(deferred.nodeId)) {
        logState.info(' Resolved deferred nodeId selection:', deferred.nodeId)
        actions.setSelection(deferred.nodeId, deferred.origin)
        return deferred.nodeId
      }

      // Node doesn't exist - find fallback
      logState.warn(' Deferred nodeId no longer exists:', deferred.nodeId)
      const fallbackId = actions.findFallbackSelection(deferred.nodeId, sourceMap)
      if (fallbackId) {
        logState.info(' Using fallback for deferred selection:', fallbackId)
        actions.setSelection(fallbackId, deferred.origin)
        return fallbackId
      }
      return null
    }

    if (deferred.type === 'lastChildOf') {
      // Select child of parent by index (for palette drops)
      const children = sourceMap.getChildren(deferred.parentNodeId)

      if (children.length === 0) {
        logState.warn(' No children found for parent:', deferred.parentNodeId)
        return null
      }

      // Sort children by source position (line number) to match document order
      const sortedChildren = children.sort((a, b) => a.position.line - b.position.line)

      // Determine which child to select
      let childIndex: number
      if (deferred.insertionIndex !== undefined) {
        // Select at specific index
        childIndex = Math.min(deferred.insertionIndex, sortedChildren.length - 1)
      } else {
        // Select last child
        childIndex = sortedChildren.length - 1
      }

      const child = sortedChildren[childIndex]
      if (child && child.nodeId) {
        logState.info(' Resolved lastChildOf selection:', child.nodeId, 'at index', childIndex)
        actions.setSelection(child.nodeId, deferred.origin)
        return child.nodeId
      }

      logState.warn(' Could not resolve lastChildOf selection')
      return null
    }

    // Line-based selection - find node at line
    const preludeLines = currentState.preludeLineOffset
    const resolvedLine = preludeLines + deferred.line

    logState.info(' Resolving deferred line selection:', {
      originalLine: deferred.line,
      preludeLineOffset: preludeLines,
      resolvedLine,
      componentName: deferred.componentName,
    })

    // Find node at the resolved line
    const node = sourceMap.getNodeAtLine(resolvedLine)

    if (node && node.nodeId) {
      logState.info(' Resolved deferred selection to:', node.nodeId)
      actions.setSelection(node.nodeId, deferred.origin)
      return node.nodeId
    }

    // Fallback: search by component name in nearby lines
    for (let offset = -2; offset <= 2; offset++) {
      const searchLine = resolvedLine + offset
      const nearbyNode = sourceMap.getNodeAtLine(searchLine)
      if (nearbyNode && nearbyNode.componentName === deferred.componentName) {
        logState.info(' Found node by component name at line', searchLine, ':', nearbyNode.nodeId)
        actions.setSelection(nearbyNode.nodeId, deferred.origin)
        return nearbyNode.nodeId
      }
    }

    logState.warn(' Could not resolve deferred selection')
    return null
  },

  /**
   * Set inline edit state
   */
  setInlineEditActive(active: boolean, nodeId: string | null): void {
    state.set({ inlineEditActive: active, inlineEditNodeId: nodeId })
  },

  /**
   * Check if inline editing is active
   */
  isInlineEditing(): boolean {
    return state.get().inlineEditActive
  },

  /**
   * Find a fallback selection when the current selection becomes invalid
   * Priority: next sibling → previous sibling → parent → first root
   *
   * @param invalidNodeId - The node ID that is no longer valid
   * @param sourceMap - The current SourceMap to search in
   * @returns The fallback node ID, or null if no fallback found
   */
  findFallbackSelection(invalidNodeId: string, sourceMap: SourceMap): string | null {
    // Guard against mock/incomplete SourceMap implementations
    if (!sourceMap || typeof sourceMap.getRootNodes !== 'function') {
      return null
    }

    // For setCompileResult, we don't have the old sourceMap
    // So we need a different approach - find any selectable element
    const roots = sourceMap.getRootNodes()
    if (roots.length > 0) {
      return roots[0].nodeId
    }

    return null
  },

  /**
   * Find a fallback selection with pre-computed sibling/parent info
   * Use this when you have access to the node info before deletion
   *
   * Priority: next sibling → previous sibling → parent → first root
   */
  findFallbackWithInfo(
    info: { nextSiblingId?: string; prevSiblingId?: string; parentId?: string },
    sourceMap: SourceMap
  ): string | null {
    // Guard against missing sourceMap
    if (!sourceMap || typeof sourceMap.getNodeById !== 'function') {
      return null
    }

    // Try next sibling
    if (info.nextSiblingId && sourceMap.getNodeById(info.nextSiblingId)) {
      return info.nextSiblingId
    }

    // Try previous sibling
    if (info.prevSiblingId && sourceMap.getNodeById(info.prevSiblingId)) {
      return info.prevSiblingId
    }

    // Try parent
    if (info.parentId && sourceMap.getNodeById(info.parentId)) {
      return info.parentId
    }

    // Fallback to first root (if method exists)
    if (typeof sourceMap.getRootNodes === 'function') {
      const roots = sourceMap.getRootNodes()
      if (roots.length > 0) {
        return roots[0].nodeId
      }
    }

    return null
  },

  /**
   * Set play mode - when active, editor interactions are disabled
   * and components can be tested/interacted with normally
   */
  setPlayMode(active: boolean): void {
    state.set({ playMode: active })
    events.emit('preview:playmode', { active })
  },

  /**
   * Toggle play mode
   */
  togglePlayMode(): void {
    const current = state.get().playMode
    actions.setPlayMode(!current)
  },

  // ==========================================================================
  // Layout Info (Phase 1 of Preview Architecture Refactoring)
  // ==========================================================================

  /**
   * Set layout information for all elements
   * Called by LayoutExtractor after render completes
   * @param layoutInfo - Map from nodeId to LayoutRect
   */
  setLayoutInfo(layoutInfo: Map<string, LayoutRect>): void {
    const currentVersion = state.get().layoutVersion
    state.set({
      layoutInfo,
      layoutVersion: currentVersion + 1,
    })
    events.emit('layout:updated', { version: currentVersion + 1, count: layoutInfo.size })
  },

  /**
   * Get layout rect for a specific node
   * @param nodeId - The node ID to get layout for
   * @returns LayoutRect or null if not found
   */
  getLayoutRect(nodeId: string): LayoutRect | null {
    return state.get().layoutInfo.get(nodeId) ?? null
  },

  /**
   * Clear layout info (e.g., when switching files)
   */
  clearLayoutInfo(): void {
    state.set({
      layoutInfo: new Map(),
      layoutVersion: 0,
    })
  },

  /**
   * Invalidate layout info (e.g., after scroll, zoom, or resize)
   * This clears the cache so the next access will trigger fresh DOM reads.
   *
   * Call this when:
   * - Preview container scrolls
   * - Preview zoom level changes
   * - Window resizes
   * - Transform changes
   *
   * @param reason - Why the layout was invalidated (for debugging)
   */
  invalidateLayoutInfo(
    reason: 'scroll' | 'zoom' | 'resize' | 'transform' | 'manual' = 'manual'
  ): void {
    if (state.get().layoutInfo.size === 0) return
    logState.info(' Invalidating layoutInfo:', reason)
    state.set({ layoutInfo: new Map() })
    events.emit('layout:invalidated', { reason })
  },

  /**
   * Check if layout info is currently valid (has cached data)
   */
  hasLayoutInfo(): boolean {
    return state.get().layoutInfo.size > 0
  },
}

/**
 * Simple selectors - direct state access
 */
export const selectors = {
  getSource: () => state.get().source,
  getSelection: () => state.get().selection,
  getCursor: () => state.get().cursor,
  getCompileVersion: () => state.get().compileVersion,
  isCompiling: () => state.get().compiling,
  getSourceMap: () => state.get().sourceMap,
  getAST: () => state.get().ast,
  getLayoutInfo: () => state.get().layoutInfo,
  getLayoutVersion: () => state.get().layoutVersion,
}
