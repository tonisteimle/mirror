/**
 * SyncCoordinator (Hexagonal Architecture)
 *
 * Testable sync coordinator that uses ports for all external dependencies.
 * This is the new implementation that replaces direct global state coupling.
 *
 * Architecture:
 * ```
 * SyncCoordinator (pure orchestration logic)
 *        │
 *        ├── EventBusPort (event subscription/emission)
 *        ├── StateStorePort (selection, breadcrumb state)
 *        ├── DOMQueryPort (preview element queries)
 *        ├── ClockPort (timers, animation frames)
 *        └── SourceMapPort (node/definition lookups)
 * ```
 */

import type {
  SyncPorts,
  EventBusPort,
  StateStorePort,
  DOMQueryPort,
  ClockPort,
  SourceMapPort,
  SelectionOrigin,
  BreadcrumbItem,
  CleanupFn,
} from './ports'
import { LineOffsetService } from './line-offset-service'
import { logSync } from '../../compiler/utils/logger'
import type { SourceMapPortWithSetter } from './adapters/production-adapters'

// ============================================
// Configuration
// ============================================

export interface SyncTargets {
  scrollEditorToLine?: (line: number) => void
  highlightPreviewElement?: (nodeId: string | null) => void
}

export interface SyncCoordinatorConfig {
  /** Debounce delay for cursor sync (ms). Default: 50 */
  cursorDebounce?: number
  /** Enable debug logging */
  debug?: boolean
  /** Line offset service for editor ↔ SourceMap translation */
  lineOffset?: LineOffsetService
}

// ============================================
// Extended SyncPorts with SourceMap setter
// ============================================

export interface ExtendedSyncPorts extends SyncPorts {
  sourceMap: SourceMapPort & { setSourceMap?: (sourceMap: unknown) => void }
}

// ============================================
// SyncCoordinator
// ============================================

export class SyncCoordinator {
  private ports: ExtendedSyncPorts
  private config: Required<Omit<SyncCoordinatorConfig, 'lineOffset'>>
  private targets: SyncTargets = {}

  // State
  private sourceMapVersion = 0
  private syncInProgress = false
  private pendingSync: { nodeId: string | null; origin: SelectionOrigin } | null = null
  private pendingCursorSyncId: number | null = null
  private lastCursorLine = -1
  private cleanupFns: CleanupFn[] = []
  private initialSyncDone = false

  /** Line offset service for editor ↔ SourceMap translation */
  readonly lineOffset: LineOffsetService

  constructor(ports: ExtendedSyncPorts, config: SyncCoordinatorConfig = {}) {
    this.ports = ports
    this.config = {
      cursorDebounce: 50,
      debug: false,
      ...config,
    }
    this.lineOffset = config.lineOffset ?? new LineOffsetService()
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Start listening to selection:changed events.
   * Call this after setting targets.
   */
  subscribe(): void {
    if (this.cleanupFns.length > 0) return // Already subscribed
    const cleanup = this.ports.eventBus.onSelectionChanged(({ nodeId, origin }) => {
      if (this.config.debug) logSync.debug(' selection:changed event', { nodeId, origin })
      this.doSync(nodeId, origin)
    })
    this.cleanupFns.push(cleanup)
    if (this.config.debug) logSync.debug(' Subscribed to selection:changed')
  }

  /**
   * Stop listening to events and clean up resources.
   */
  dispose(): void {
    for (const cleanup of this.cleanupFns) {
      cleanup()
    }
    this.cleanupFns = []

    if (this.pendingCursorSyncId !== null) {
      this.ports.clock.clearTimeout(this.pendingCursorSyncId)
      this.pendingCursorSyncId = null
    }
  }

  /**
   * Check if coordinator is subscribed.
   */
  isSubscribed(): boolean {
    return this.cleanupFns.length > 0
  }

  // ============================================
  // SourceMap Management
  // ============================================

  /**
   * Update the SourceMap. Call this after compilation.
   */
  setSourceMap(sourceMap: unknown): void {
    // Increment version to invalidate any in-progress syncs
    this.sourceMapVersion++

    // Clear pending cursor sync to prevent stale sync with old SourceMap
    if (this.pendingCursorSyncId !== null) {
      this.ports.clock.clearTimeout(this.pendingCursorSyncId)
      this.pendingCursorSyncId = null
    }

    // Clear pending sync as it references old sourceMap
    this.pendingSync = null

    // Update the SourceMap port if it supports setSourceMap
    if (this.ports.sourceMap && 'setSourceMap' in this.ports.sourceMap) {
      ;(this.ports.sourceMap as SourceMapPortWithSetter).setSourceMap(sourceMap as any)
    }
  }

  // ============================================
  // Targets
  // ============================================

  /**
   * Set sync targets (callbacks for scrolling editor, highlighting preview).
   */
  setTargets(targets: SyncTargets): void {
    this.targets = { ...this.targets, ...targets }
  }

  // ============================================
  // Initial Sync
  // ============================================

  /**
   * Trigger initial sync after first compile and preview render.
   * Call this after preview DOM has been updated.
   */
  triggerInitialSync(): void {
    if (this.initialSyncDone) return

    // Check if SourceMap is available
    const testNode = this.ports.sourceMap.getNodeById('__test__')
    if (testNode === null) {
      // No SourceMap yet - try to detect by checking if any node can be found
      const rootElement = this.ports.domQuery.findRootMirrorElement()
      if (!rootElement) return
    }

    this.initialSyncDone = true

    // Use requestAnimationFrame to ensure DOM is ready
    this.ports.clock.requestAnimationFrame(() => {
      // Check if there's already a selection
      const currentSelection = this.ports.stateStore.getSelection()
      if (currentSelection.nodeId) {
        if (this.config.debug) {
          logSync.debug(' Initial sync with existing selection', {
            nodeId: currentSelection.nodeId,
          })
        }
        this.doSync(currentSelection.nodeId, 'editor')
        return
      }

      // Find root element in preview
      const rootElement = this.ports.domQuery.findRootMirrorElement()
      if (rootElement) {
        if (this.config.debug) {
          logSync.debug(' Initial sync - selecting root element', {
            nodeId: rootElement.nodeId,
          })
        }
        // Set selection without triggering editor scroll (use 'preview' origin)
        this.ports.stateStore.setSelection(rootElement.nodeId, 'preview')
      }
    })
  }

  /**
   * Reset initial sync flag (call when switching files).
   */
  resetInitialSync(): void {
    this.initialSyncDone = false
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Handle cursor move in editor (editor line, not combined).
   * Converts to SourceMap line and triggers selection.
   */
  handleCursorMove(editorLine: number): void {
    if (this.config.debug) {
      logSync.debug(' handleCursorMove', {
        editorLine,
        lastLine: this.lastCursorLine,
        offset: this.lineOffset.getOffset(),
      })
    }

    // Convert editor line to SourceMap line
    const sourceMapLine = this.lineOffset.editorToSourceMap(editorLine)

    if (sourceMapLine === this.lastCursorLine) return
    this.lastCursorLine = sourceMapLine

    if (this.pendingCursorSyncId !== null) {
      this.ports.clock.clearTimeout(this.pendingCursorSyncId)
    }

    this.pendingCursorSyncId = this.ports.clock.setTimeout(() => {
      this.pendingCursorSyncId = null
      this.executeCursorSync(sourceMapLine)
    }, this.config.cursorDebounce)
  }

  /**
   * Handle multi-line selection in editor.
   * Finds all nodeIds in the line range and sets multiSelection.
   */
  handleEditorSelection(fromEditorLine: number, toEditorLine: number): void {
    // Convert editor lines to SourceMap lines
    const fromLine = this.lineOffset.editorToSourceMap(fromEditorLine)
    const toLine = this.lineOffset.editorToSourceMap(toEditorLine)

    // DEBUG: Store debug info globally for tests
    if (!(window as any).__handleEditorSelectionDebug) {
      ;(window as any).__handleEditorSelectionDebug = []
    }
    const debugEntry: any = {
      fromEditorLine,
      toEditorLine,
      fromLine,
      toLine,
      nodesFound: [] as string[],
    }

    if (this.config.debug) {
      logSync.debug(' handleEditorSelection', {
        fromEditorLine,
        toEditorLine,
        fromLine,
        toLine,
      })
    }

    // Find all nodeIds in the line range
    const nodeIds: string[] = []

    for (let line = fromLine; line <= toLine; line++) {
      const node = this.ports.sourceMap.getNodeAtLine(line)
      debugEntry.nodesFound.push(`L${line}:${node?.nodeId ?? 'null'}`)
      if (node?.nodeId) {
        // Only add if not already in the list
        if (!nodeIds.includes(node.nodeId)) {
          nodeIds.push(node.nodeId)
        }
      }
    }

    debugEntry.nodeIds = [...nodeIds]
    ;(window as any).__handleEditorSelectionDebug.push(debugEntry)

    // Filter to only root elements (no children of already-selected parents)
    // This prevents selecting both parent and child when parent's lines are selected
    const filteredNodeIds = nodeIds.filter(nodeId => {
      const element = this.ports.domQuery.findElementByMirrorId(nodeId)
      if (!element) return true

      // Check if any ancestor is in our selection
      let parent = this.ports.domQuery.getParentWithMirrorId(element)
      while (parent) {
        if (nodeIds.includes(parent.nodeId)) {
          return false // This is a child of another selected element
        }
        if (this.ports.domQuery.isPreviewBoundary(parent)) {
          break
        }
        parent = this.ports.domQuery.getParentWithMirrorId(parent)
      }
      return true
    })

    if (this.config.debug) {
      logSync.debug(' handleEditorSelection nodeIds', {
        all: nodeIds,
        filtered: filteredNodeIds,
      })
    }

    // Set multiselection if more than one element, otherwise single selection
    if (filteredNodeIds.length === 0) {
      // No valid nodes found - clear selection
      this.ports.stateStore.clearMultiSelection()
    } else if (filteredNodeIds.length === 1) {
      // Single element - use regular selection
      this.ports.stateStore.clearMultiSelection()
      this.ports.stateStore.setSelection(filteredNodeIds[0], 'editor')
    } else {
      // Multiple elements - use multiselection
      this.ports.stateStore.setMultiSelection(filteredNodeIds)
      // Also set primary selection to first element for property panel
      this.ports.stateStore.setSelection(filteredNodeIds[0], 'editor')
    }
  }

  /**
   * Handle click in preview - set selection, sync happens via event.
   * Cancels any pending cursor sync to prevent cursor jumping back.
   */
  handlePreviewClick(nodeId: string): void {
    // Cancel pending cursor sync - preview click takes priority
    if (this.pendingCursorSyncId !== null) {
      this.ports.clock.clearTimeout(this.pendingCursorSyncId)
      this.pendingCursorSyncId = null
    }

    if (this.config.debug) {
      logSync.debug(' handlePreviewClick', { nodeId })
    }

    this.ports.stateStore.setSelection(nodeId, 'preview')
  }

  /**
   * Handle selection change from any origin.
   * For backward compatibility - just calls setSelection.
   */
  handleSelectionChange(nodeId: string | null, origin: SelectionOrigin): void {
    if (this.syncInProgress) return

    const currentSelection = this.ports.stateStore.getSelection()
    const isReselection = currentSelection.nodeId === nodeId

    // Skip if same node is already selected (prevents sync loops)
    if (isReselection) return

    this.ports.stateStore.setSelection(nodeId, origin)
  }

  /**
   * Clear selection.
   */
  clearSelection(origin: SelectionOrigin): void {
    this.ports.stateStore.setSelection(null, origin)
  }

  // ============================================
  // Internal: Sync Logic
  // ============================================

  /**
   * Do the actual sync (scroll, highlight, breadcrumb).
   * Called when selection:changed event is received.
   */
  private doSync(nodeId: string | null, origin: SelectionOrigin): void {
    // Queue sync if one is already in progress
    if (this.syncInProgress) {
      if (this.config.debug) {
        logSync.debug(' Queuing sync (already in progress)', { nodeId, origin })
      }
      this.pendingSync = { nodeId, origin }
      return
    }

    // Capture version to detect sourceMap changes during sync
    const capturedVersion = this.sourceMapVersion

    this.syncInProgress = true
    try {
      if (this.config.debug) {
        logSync.debug(' doSync', {
          nodeId,
          origin,
          hasScrollTarget: !!this.targets.scrollEditorToLine,
        })
      }

      // Abort if sourceMap changed during sync setup
      if (this.sourceMapVersion !== capturedVersion) {
        if (this.config.debug) {
          logSync.debug(' Aborting sync - sourceMap changed')
        }
        return
      }

      if (nodeId) {
        const node = this.ports.sourceMap.getNodeById(nodeId)

        if (this.config.debug) {
          logSync.debug(' node lookup', {
            found: !!node,
            position: node?.position,
            offset: this.lineOffset.getOffset(),
          })
        }

        // Scroll editor when selection comes from non-editor origin
        if (node?.position && origin !== 'editor') {
          const sourceMapLine = node.position.line
          const editorLine = this.lineOffset.sourceMapToEditor(sourceMapLine)
          const isInFile = this.lineOffset.isInCurrentFile(sourceMapLine)

          if (this.config.debug) {
            logSync.debug(' scroll check', {
              sourceMapLine,
              editorLine,
              isInFile,
              willScroll: isInFile && !!this.targets.scrollEditorToLine,
            })
          }

          if (isInFile) {
            // DEBUG: Track when scrollEditorToLine is called
            console.log('[SYNC DEBUG] scrollEditorToLine called', { origin, editorLine, nodeId })
            this.targets.scrollEditorToLine?.(editorLine)
          }
        } else if (node?.position) {
          // DEBUG: Track when scroll is SKIPPED
          console.log('[SYNC DEBUG] scrollEditorToLine SKIPPED (origin=editor)', { origin, nodeId })
        }

        // Highlight preview when selection comes from non-preview origin
        if (origin !== 'preview') {
          this.targets.highlightPreviewElement?.(nodeId)
        }
      } else {
        // Selection cleared
        this.targets.highlightPreviewElement?.(null)
      }

      // Update breadcrumb using DOM hierarchy
      const breadcrumb = this.computeBreadcrumbFromDOM(nodeId)
      this.ports.stateStore.setBreadcrumb(breadcrumb)
    } finally {
      this.syncInProgress = false

      // Process queued sync if any
      if (this.pendingSync) {
        const pending = this.pendingSync
        this.pendingSync = null
        if (this.config.debug) {
          logSync.debug(' Processing queued sync', pending)
        }
        this.doSync(pending.nodeId, pending.origin)
      }
    }
  }

  /**
   * Execute cursor sync - find node at line and select it.
   * Single cursor position clears multiselection.
   */
  private executeCursorSync(sourceMapLine: number): void {
    if (this.config.debug) {
      logSync.debug(' executeCursorSync', { sourceMapLine })
    }

    // Single cursor position (not multi-line selection) clears multiselection
    this.ports.stateStore.clearMultiSelection()

    // First try to find an instance node
    const node = this.ports.sourceMap.getNodeAtLine(sourceMapLine)
    if (this.config.debug) {
      logSync.debug(' node at line', { node: node?.nodeId })
    }

    if (node && node.nodeId) {
      this.ports.stateStore.setSelection(node.nodeId, 'editor')
      return
    }

    // If no instance found, try to find a definition (for .com files)
    const definition = this.ports.sourceMap.getDefinitionAtLine(sourceMapLine)
    if (this.config.debug) {
      logSync.debug(' definition at line', { definition: definition?.componentName })
    }

    if (definition && definition.componentName) {
      this.ports.eventBus.emitDefinitionSelected(definition.componentName, 'editor')
    }
  }

  /**
   * Compute breadcrumb by traversing DOM hierarchy.
   */
  private computeBreadcrumbFromDOM(nodeId: string | null): BreadcrumbItem[] {
    if (!nodeId) return []

    const element = this.ports.domQuery.findElementByMirrorId(nodeId)
    if (!element) return []

    const path: BreadcrumbItem[] = []
    let current = element

    while (current) {
      const node = this.ports.sourceMap.getNodeById(current.nodeId)
      if (node) {
        path.unshift({ nodeId: current.nodeId, name: node.componentName })
      }

      const parent = this.ports.domQuery.getParentWithMirrorId(current)
      if (!parent || this.ports.domQuery.isPreviewBoundary(parent)) {
        break
      }
      current = parent
    }

    return path
  }

  // ============================================
  // Test APIs
  // ============================================

  /**
   * TEST API: Get the ports (for inspection in tests).
   */
  getPorts(): ExtendedSyncPorts {
    return this.ports
  }

  /**
   * TEST API: Get the sourceMap version counter.
   */
  getSourceMapVersion(): number {
    return this.sourceMapVersion
  }

  /**
   * TEST API: Check if a cursor sync is pending.
   */
  hasPendingCursorSync(): boolean {
    return this.pendingCursorSyncId !== null
  }

  /**
   * TEST API: Check if a sync is pending.
   */
  hasPendingSync(): boolean {
    return this.pendingSync !== null
  }
}

// ============================================
// Factory Function
// ============================================

export function createSyncCoordinatorWithPorts(
  ports: ExtendedSyncPorts,
  config?: SyncCoordinatorConfig
): SyncCoordinator {
  const coordinator = new SyncCoordinator(ports, config)
  coordinator.subscribe()
  return coordinator
}
