/**
 * State Store for Studio
 */

import type { AST, ParseError } from '../../src/parser/ast'
import type { IR } from '../../src/ir/types'
import type { SourceMap } from '../../src/ir/source-map'
import { events } from './events'

// Debug flag - set to true to enable verbose state logging
const DEBUG_STATE = false

export type SelectionOrigin = 'editor' | 'preview' | 'panel' | 'llm' | 'keyboard' | 'drag-drop'

export interface BreadcrumbItem {
  nodeId: string
  name: string
}

/**
 * Compile result - atomically updated together
 */
export interface CompileResult {
  ast: AST
  ir: IR
  sourceMap: SourceMap
  errors: ParseError[]
  version: number  // Incremented on each compile
  timestamp: number
}

/**
 * Deferred selection - resolved after compile completes
 *
 * Two modes:
 * - 'nodeId': When the nodeId is known but SourceMap isn't ready (e.g., undo/redo during compile)
 * - 'line': When only the line number is known (e.g., drag-drop insert)
 */
export type DeferredSelection =
  | {
      type: 'nodeId'
      /** The nodeId to select once SourceMap is available */
      nodeId: string
      /** Origin of the selection request */
      origin: SelectionOrigin
    }
  | {
      type: 'line'
      /** Line number in the current file (1-based) where the element was inserted */
      line: number
      /** Component name that was inserted (e.g., "Frame", "Text") */
      componentName: string
      /** Origin of the selection request */
      origin: SelectionOrigin
    }

/**
 * @deprecated Use DeferredSelection with type: 'line' instead
 * Kept for backward compatibility
 */
export interface PendingSelection {
  /** Line number in the current file (1-based) where the element was inserted */
  line: number
  /** Component name that was inserted (e.g., "Frame", "Text") */
  componentName: string
  /** Origin of the selection request */
  origin: SelectionOrigin
}

/**
 * Panel visibility state for individual panels
 */
export interface PanelVisibility {
  prompt: boolean
  files: boolean
  code: boolean
  components: boolean
  preview: boolean
  property: boolean
}

export interface StudioState {
  source: string
  /** Resolved source = prelude + current file (used by CodeModifier to match SourceMap positions) */
  resolvedSource: string
  ast: AST | null
  ir: IR | null
  sourceMap: SourceMap | null
  errors: ParseError[]
  /** Compile version - use to detect stale SourceMap */
  compileVersion: number
  /** Timestamp of last successful compile */
  compileTimestamp: number
  /** True while compilation is in progress */
  compiling: boolean
  selection: { nodeId: string | null; origin: SelectionOrigin }
  /** Multi-selection for grouping operations (Shift+Click) */
  multiSelection: string[]
  breadcrumb: BreadcrumbItem[]
  cursor: { line: number; column: number }
  editorHasFocus: boolean
  currentFile: string
  files: Record<string, string>
  fileTypes: Record<string, string>
  panels: { left: boolean; right: boolean }
  /** Individual panel visibility */
  panelVisibility: PanelVisibility
  mode: 'mirror' | 'react'
  /** Character offset where current file starts in resolvedSource */
  preludeOffset: number
  /** Pending selection to be resolved after compile completes (line-based) */
  pendingSelection: PendingSelection | null
  /** Queued selection when SourceMap not yet available (nodeId-based) */
  queuedSelection: { nodeId: string; origin: SelectionOrigin } | null
  /** Unified deferred selection - replaces pendingSelection and queuedSelection */
  deferredSelection: DeferredSelection | null
  /** Inline text editing state */
  inlineEditActive: boolean
  /** Node ID currently being inline edited */
  inlineEditNodeId: string | null
  /** Preview zoom level (100 = 100%) */
  previewZoom: number
  /** Play mode - disables editor interactions, allows component testing */
  playMode: boolean
}

export type Subscriber<T> = (state: T, prevState: T) => void
export type Selector<T, R> = (state: T) => R

class Store<T extends object> {
  private state: T
  private subscribers: Set<Subscriber<T>> = new Set()

  constructor(initialState: T) {
    this.state = initialState
  }

  get(): Readonly<T> {
    return this.state
  }

  set(partial: Partial<T>): void {
    const prevState = this.state
    this.state = { ...this.state, ...partial }
    this.notify(prevState)
  }

  subscribe(subscriber: Subscriber<T>): () => void {
    this.subscribers.add(subscriber)
    return () => this.subscribers.delete(subscriber)
  }

  private notify(prevState: T): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(this.state, prevState)
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        console.error('[State] Subscriber error:', error.message, error.stack)
        // Emit error event for centralized error handling
        events.emit('state:error', {
          error,
          context: 'subscriber notification',
        })
      }
    }
  }
}

/**
 * Default panel visibility
 */
const defaultPanelVisibility: PanelVisibility = {
  prompt: true,
  files: true,
  code: true,
  components: true,
  preview: true,
  property: true,
}

/**
 * Load panel visibility defaults
 */
function loadPanelVisibility(): PanelVisibility {
  return { ...defaultPanelVisibility }
}

const initialState: StudioState = {
  source: '',
  resolvedSource: '',
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
  files: {},
  fileTypes: {},
  panels: { left: true, right: true },
  panelVisibility: loadPanelVisibility(),
  mode: 'mirror',
  preludeOffset: 0,
  pendingSelection: null,
  queuedSelection: null,
  deferredSelection: null,
  inlineEditActive: false,
  inlineEditNodeId: null,
  previewZoom: 100,
  playMode: false,
}

export const state = new Store<StudioState>(initialState)

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
    events.emit(compiling ? 'compile:started' : 'compile:idle', undefined as any)
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
        DEBUG_STATE && console.log('[State] Resolving queued selection:', queued.nodeId)
        actions.setSelection(queued.nodeId, queued.origin)
      } else {
        // Node no longer exists - find a fallback
        console.warn('[State] Queued selection no longer exists:', queued.nodeId)
        const fallbackId = actions.findFallbackSelection(queued.nodeId, result.sourceMap)
        if (fallbackId) {
          DEBUG_STATE && console.log('[State] Using fallback for queued selection:', fallbackId)
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

    // Resolve deferred selection (unified API - preferred)
    // IMPORTANT: Synchronous resolution to prevent race conditions with rapid compiles
    // Previously used Promise.resolve().then() which could lose selections (PREV-005)
    if (hasDeferredSelection) {
      try {
        const resolvedNodeId = actions.resolveDeferredSelection()
        if (resolvedNodeId) {
          DEBUG_STATE && console.log('[State] Deferred selection resolved after compile:', resolvedNodeId)
        }
      } catch (error) {
        console.error('[State] Error resolving deferred selection:', error)
        events.emit('state:error', { error, context: 'deferred selection resolution' })
      }
      return // Skip selection validation when we have deferred selection
    }

    // Resolve pending selection (line-based) - legacy API
    // IMPORTANT: Synchronous resolution to prevent race conditions (PREV-005)
    if (hasPendingSelection && !hasQueuedSelection) {
      try {
        const resolvedNodeId = actions.resolvePendingSelection()
        if (resolvedNodeId) {
          DEBUG_STATE && console.log('[State] Pending selection resolved after compile:', resolvedNodeId)
        }
      } catch (error) {
        console.error('[State] Error resolving pending selection:', error)
        events.emit('state:error', { error, context: 'pending selection resolution' })
      }
      return // Skip selection validation when we have pending selection
    }

    // Validate current selection against new SourceMap
    // IMPORTANT: Re-read selection state here as it may have changed during compile:completed handlers
    const latestState = state.get()
    const currentSelection = latestState.selection.nodeId
    if (currentSelection && result.sourceMap) {
      const nodeExists = result.sourceMap.getNodeById(currentSelection) !== null
      if (!nodeExists) {
        console.warn(`[State] Selection ${currentSelection} no longer exists after compile`)

        // Find a fallback selection instead of clearing
        const fallbackId = actions.findFallbackSelection(currentSelection, result.sourceMap)

        if (fallbackId) {
          console.log(`[State] Fallback selection: ${fallbackId}`)
          state.set({ selection: { nodeId: fallbackId, origin: latestState.selection.origin } })
          events.emit('selection:changed', { nodeId: fallbackId, origin: latestState.selection.origin })
        } else {
          console.warn(`[State] No fallback found, clearing selection`)
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
        console.log(`[State] Deferring selection during compile: ${nodeId}`)
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
        console.warn(`[State] Cannot select non-existent node: ${nodeId}`)
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
    events.emit(hasFocus ? 'editor:focused' : 'editor:blurred', undefined as any)
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
   * Toggle panel visibility and persist to server
   */
  togglePanelVisibility(panel: keyof PanelVisibility): void {
    const current = state.get().panelVisibility
    const newVisibility: PanelVisibility = {
      ...current,
      [panel]: !current[panel],
    }
    state.set({ panelVisibility: newVisibility })
    events.emit('panel:visibility-changed', { panel, visible: newVisibility[panel] })
  },

  /**
   * Set panel visibility directly
   */
  setPanelVisibility(panel: keyof PanelVisibility, visible: boolean): void {
    const current = state.get().panelVisibility
    if (current[panel] === visible) return

    const newVisibility: PanelVisibility = {
      ...current,
      [panel]: visible,
    }
    state.set({ panelVisibility: newVisibility })
    events.emit('panel:visibility-changed', { panel, visible })
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
    DEBUG_STATE && console.log('[State] Pending selection set:', pending)
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
      console.warn('[State] Cannot resolve pending selection: no SourceMap')
      state.set({ pendingSelection: null })
      return null
    }

    // Calculate the line number in resolved source (prelude offset + current file line)
    const preludeLines = currentState.preludeOffset
    const resolvedLine = preludeLines + pending.line

    DEBUG_STATE && console.log('[State] Resolving pending selection:', {
      originalLine: pending.line,
      preludeOffset: preludeLines,
      resolvedLine,
      componentName: pending.componentName,
    })

    // Clear pending selection first
    state.set({ pendingSelection: null })

    // Find node at the resolved line
    const node = sourceMap.getNodeAtLine(resolvedLine)

    if (node && node.nodeId) {
      DEBUG_STATE && console.log('[State] Resolved pending selection to:', node.nodeId)
      // Set selection - SyncCoordinator will automatically handle sync via event
      actions.setSelection(node.nodeId, pending.origin)
      return node.nodeId
    }

    // Fallback: search by component name in nearby lines
    DEBUG_STATE && console.log('[State] Node not found at exact line, searching nearby...')
    for (let offset = -2; offset <= 2; offset++) {
      const searchLine = resolvedLine + offset
      const nearbyNode = sourceMap.getNodeAtLine(searchLine)
      if (nearbyNode && nearbyNode.componentName === pending.componentName) {
        DEBUG_STATE && console.log('[State] Found node by component name at line', searchLine, ':', nearbyNode.nodeId)
        // Set selection - SyncCoordinator will automatically handle sync via event
        actions.setSelection(nearbyNode.nodeId, pending.origin)
        return nearbyNode.nodeId
      }
    }

    console.warn('[State] Could not resolve pending selection')
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
    DEBUG_STATE && console.log('[State] Deferred selection set:', deferred)
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
      console.warn('[State] Cannot resolve deferred selection: no SourceMap')
      state.set({ deferredSelection: null })
      return null
    }

    // Clear deferred selection first
    state.set({ deferredSelection: null })

    if (deferred.type === 'nodeId') {
      // Direct nodeId selection - validate and select
      if (sourceMap.getNodeById(deferred.nodeId)) {
        DEBUG_STATE && console.log('[State] Resolved deferred nodeId selection:', deferred.nodeId)
        actions.setSelection(deferred.nodeId, deferred.origin)
        return deferred.nodeId
      }

      // Node doesn't exist - find fallback
      console.warn('[State] Deferred nodeId no longer exists:', deferred.nodeId)
      const fallbackId = actions.findFallbackSelection(deferred.nodeId, sourceMap)
      if (fallbackId) {
        DEBUG_STATE && console.log('[State] Using fallback for deferred selection:', fallbackId)
        actions.setSelection(fallbackId, deferred.origin)
        return fallbackId
      }
      return null
    }

    // Line-based selection - find node at line
    const preludeLines = currentState.preludeOffset
    const resolvedLine = preludeLines + deferred.line

    DEBUG_STATE && console.log('[State] Resolving deferred line selection:', {
      originalLine: deferred.line,
      preludeOffset: preludeLines,
      resolvedLine,
      componentName: deferred.componentName,
    })

    // Find node at the resolved line
    const node = sourceMap.getNodeAtLine(resolvedLine)

    if (node && node.nodeId) {
      DEBUG_STATE && console.log('[State] Resolved deferred selection to:', node.nodeId)
      actions.setSelection(node.nodeId, deferred.origin)
      return node.nodeId
    }

    // Fallback: search by component name in nearby lines
    for (let offset = -2; offset <= 2; offset++) {
      const searchLine = resolvedLine + offset
      const nearbyNode = sourceMap.getNodeAtLine(searchLine)
      if (nearbyNode && nearbyNode.componentName === deferred.componentName) {
        DEBUG_STATE && console.log('[State] Found node by component name at line', searchLine, ':', nearbyNode.nodeId)
        actions.setSelection(nearbyNode.nodeId, deferred.origin)
        return nearbyNode.nodeId
      }
    }

    console.warn('[State] Could not resolve deferred selection')
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
   * Set preview zoom level
   * @param zoom - Zoom percentage (e.g., 100 = 100%)
   */
  setPreviewZoom(zoom: number): void {
    state.set({ previewZoom: zoom })
    events.emit('preview:zoom', { zoom, scale: zoom / 100 })
  },

  /**
   * Get current preview zoom scale (0-1 range)
   */
  getPreviewScale(): number {
    return state.get().previewZoom / 100
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
  getPreviewZoom: () => state.get().previewZoom,
}

/**
 * Memoized selector factory
 * Caches result based on dependency values
 */
function createSelector<TDeps extends unknown[], TResult>(
  getDeps: (s: StudioState) => TDeps,
  compute: (...deps: TDeps) => TResult
): () => TResult {
  let cachedDeps: TDeps | null = null
  let cachedResult: TResult

  return () => {
    const currentState = state.get()
    const deps = getDeps(currentState)

    // Check if dependencies changed (shallow comparison)
    const depsChanged = cachedDeps === null || deps.some((dep, i) => dep !== cachedDeps![i])

    if (depsChanged) {
      cachedDeps = deps
      cachedResult = compute(...deps)
    }

    return cachedResult
  }
}

/**
 * Computed selectors - memoized derived values
 */
export const computed = {
  /**
   * Get the currently selected node (memoized)
   */
  getSelectedNode: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return null
      return sourceMap.getNodeById(nodeId)
    }
  ),

  /**
   * Get the parent of the selected node (memoized)
   */
  getSelectedNodeParent: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return null
      const node = sourceMap.getNodeById(nodeId)
      if (!node?.parentId) return null
      return sourceMap.getNodeById(node.parentId)
    }
  ),

  /**
   * Get all nodes in multi-selection (memoized)
   */
  getMultiSelectedNodes: createSelector(
    (s) => [s.multiSelection, s.sourceMap] as const,
    (nodeIds, sourceMap) => {
      if (!sourceMap || nodeIds.length === 0) return []
      return nodeIds
        .map(id => sourceMap.getNodeById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null)
    }
  ),

  /**
   * Check if multi-selection nodes are siblings (same parent)
   */
  isValidGroupSelection: createSelector(
    (s) => [s.multiSelection, s.sourceMap] as const,
    (nodeIds, sourceMap) => {
      if (!sourceMap || nodeIds.length < 2) return false
      const nodes = nodeIds
        .map(id => sourceMap.getNodeById(id))
        .filter((n): n is NonNullable<typeof n> => n !== null)
      if (nodes.length !== nodeIds.length) return false

      // All nodes must have the same parent
      const firstParent = nodes[0].parentId
      return nodes.every(n => n.parentId === firstParent)
    }
  ),

  /**
   * Get breadcrumb path from root to selected node (memoized)
   */
  getSelectionBreadcrumb: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return []

      const path: BreadcrumbItem[] = []
      let currentId: string | undefined = nodeId

      while (currentId) {
        const node = sourceMap.getNodeById(currentId)
        if (!node) break
        path.unshift({ nodeId: currentId, name: node.componentName })
        currentId = node.parentId
      }

      return path
    }
  ),

  /**
   * Get children of the selected node (memoized)
   */
  getSelectedNodeChildren: createSelector(
    (s) => [s.selection.nodeId, s.sourceMap] as const,
    (nodeId, sourceMap) => {
      if (!nodeId || !sourceMap) return []
      return sourceMap.getChildren(nodeId)
    }
  ),
}
