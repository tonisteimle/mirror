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

  constructor(
    ports: ExtendedSyncPorts,
    config: SyncCoordinatorConfig = {}
  ) {
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
      if (this.config.debug) {
        console.log('[SyncCoordinator] selection:changed event', { nodeId, origin })
      }
      this.doSync(nodeId, origin)
    })

    this.cleanupFns.push(cleanup)

    if (this.config.debug) {
      console.log('[SyncCoordinator] Subscribed to selection:changed')
    }
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
      (this.ports.sourceMap as SourceMapPortWithSetter).setSourceMap(sourceMap as any)
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
          console.log('[SyncCoordinator] Initial sync with existing selection', {
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
          console.log('[SyncCoordinator] Initial sync - selecting root element', {
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
      console.log('[SyncCoordinator] handleCursorMove', {
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
      console.log('[SyncCoordinator] handlePreviewClick', { nodeId })
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
        console.log('[SyncCoordinator] Queuing sync (already in progress)', { nodeId, origin })
      }
      this.pendingSync = { nodeId, origin }
      return
    }

    // Capture version to detect sourceMap changes during sync
    const capturedVersion = this.sourceMapVersion

    this.syncInProgress = true
    try {
      if (this.config.debug) {
        console.log('[SyncCoordinator] doSync', {
          nodeId,
          origin,
          hasScrollTarget: !!this.targets.scrollEditorToLine,
        })
      }

      // Abort if sourceMap changed during sync setup
      if (this.sourceMapVersion !== capturedVersion) {
        if (this.config.debug) {
          console.log('[SyncCoordinator] Aborting sync - sourceMap changed')
        }
        return
      }

      if (nodeId) {
        const node = this.ports.sourceMap.getNodeById(nodeId)

        if (this.config.debug) {
          console.log('[SyncCoordinator] node lookup', {
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
            console.log('[SyncCoordinator] scroll check', {
              sourceMapLine,
              editorLine,
              isInFile,
              willScroll: isInFile && !!this.targets.scrollEditorToLine,
            })
          }

          if (isInFile) {
            this.targets.scrollEditorToLine?.(editorLine)
          }
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
          console.log('[SyncCoordinator] Processing queued sync', pending)
        }
        this.doSync(pending.nodeId, pending.origin)
      }
    }
  }

  /**
   * Execute cursor sync - find node at line and select it.
   */
  private executeCursorSync(sourceMapLine: number): void {
    if (this.config.debug) {
      console.log('[SyncCoordinator] executeCursorSync', { sourceMapLine })
    }

    // First try to find an instance node
    const node = this.ports.sourceMap.getNodeAtLine(sourceMapLine)
    if (this.config.debug) {
      console.log('[SyncCoordinator] node at line', { node: node?.nodeId })
    }

    if (node && node.nodeId) {
      this.ports.stateStore.setSelection(node.nodeId, 'editor')
      return
    }

    // If no instance found, try to find a definition (for .com files)
    const definition = this.ports.sourceMap.getDefinitionAtLine(sourceMapLine)
    if (this.config.debug) {
      console.log('[SyncCoordinator] definition at line', { definition: definition?.componentName })
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
