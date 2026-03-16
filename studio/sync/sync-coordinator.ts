/**
 * Sync Coordinator - Single point for all sync operations
 *
 * ARCHITECTURE:
 * - All selection changes go through actions.setSelection()
 * - SyncCoordinator LISTENS to selection:changed events
 * - On selection change, it syncs: Editor scroll, Preview highlight, PropertyPanel
 *
 * This ensures consistent behavior regardless of where selection originates:
 * - Editor cursor move
 * - Preview click
 * - Panel selection
 * - Commands (delete, insert, etc.)
 * - Drag & drop
 */

import { state, actions, events } from '../core'
import type { SelectionOrigin } from '../core/state'
import type { SourceMap } from '../../src/studio/source-map'
import { LineOffsetService } from './line-offset-service'

export interface SyncTargets {
  scrollEditorToLine?: (line: number) => void
  highlightPreviewElement?: (nodeId: string | null) => void
  updatePropertyPanel?: (nodeId: string | null) => void
}

export interface SyncCoordinatorOptions {
  cursorDebounce?: number
  debug?: boolean
  lineOffset?: LineOffsetService
}

export class SyncCoordinator {
  private sourceMap: SourceMap | null = null
  private targets: SyncTargets = {}
  private options: Required<Omit<SyncCoordinatorOptions, 'lineOffset'>>
  private syncInProgress = false
  private pendingCursorSync: ReturnType<typeof setTimeout> | null = null
  private lastCursorLine = -1
  private unsubscribe: (() => void) | null = null

  /** Line offset service for editor ↔ SourceMap translation */
  readonly lineOffset: LineOffsetService

  constructor(options: SyncCoordinatorOptions = {}) {
    this.options = { cursorDebounce: 150, debug: false, ...options }
    this.lineOffset = options.lineOffset ?? new LineOffsetService()
  }

  /**
   * Start listening to selection:changed events
   * Call this after setting targets
   */
  subscribe(): void {
    if (this.unsubscribe) return // Already subscribed

    this.unsubscribe = events.on('selection:changed', ({ nodeId, origin }) => {
      if (this.options.debug) {
        console.log('[SyncCoordinator] selection:changed event', { nodeId, origin })
      }
      this.doSync(nodeId, origin)
    })

    if (this.options.debug) {
      console.log('[SyncCoordinator] Subscribed to selection:changed')
    }
  }

  /**
   * Stop listening to events
   */
  dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe()
      this.unsubscribe = null
    }
    if (this.pendingCursorSync) {
      clearTimeout(this.pendingCursorSync)
      this.pendingCursorSync = null
    }
  }

  setSourceMap(sourceMap: SourceMap | null): void {
    // Clear pending cursor sync to prevent stale sync with old SourceMap
    if (this.pendingCursorSync) {
      clearTimeout(this.pendingCursorSync)
      this.pendingCursorSync = null
    }
    this.sourceMap = sourceMap
  }

  setTargets(targets: SyncTargets): void {
    this.targets = { ...this.targets, ...targets }
  }

  /**
   * Handle cursor move in editor (editor line, not combined)
   * Converts to SourceMap line and triggers selection
   */
  handleCursorMove(editorLine: number): void {
    if (this.options.debug) {
      console.log('[SyncCoordinator] handleCursorMove', {
        editorLine,
        lastLine: this.lastCursorLine,
        offset: this.lineOffset.getOffset()
      })
    }

    // Convert editor line to SourceMap line
    const sourceMapLine = this.lineOffset.editorToSourceMap(editorLine)

    if (sourceMapLine === this.lastCursorLine) return
    this.lastCursorLine = sourceMapLine

    if (this.pendingCursorSync) clearTimeout(this.pendingCursorSync)
    this.pendingCursorSync = setTimeout(() => {
      this.executeCursorSync(sourceMapLine)
    }, this.options.cursorDebounce)
  }

  /**
   * Handle click in preview - just set selection, sync happens via event
   */
  handlePreviewClick(nodeId: string): void {
    if (this.options.debug) {
      console.log('[SyncCoordinator] handlePreviewClick', { nodeId })
    }
    actions.setSelection(nodeId, 'preview')
  }

  /**
   * Handle selection change from any origin
   * This is kept for backward compatibility but now just calls setSelection
   * The actual sync happens in doSync() triggered by the event
   */
  handleSelectionChange(nodeId: string | null, origin: SelectionOrigin): void {
    if (this.syncInProgress) return

    const currentSelection = state.get().selection
    const isReselection = currentSelection.nodeId === nodeId

    // Skip if same selection from same origin (prevents unnecessary updates)
    if (isReselection && currentSelection.origin === origin) return

    // Just set selection - sync will be triggered by selection:changed event
    actions.setSelection(nodeId, origin)
  }

  /**
   * Clear selection
   */
  clearSelection(origin: SelectionOrigin): void {
    actions.setSelection(null, origin)
  }

  /**
   * Internal: Do the actual sync (scroll, highlight, property panel)
   * Called when selection:changed event is received
   */
  private doSync(nodeId: string | null, origin: SelectionOrigin): void {
    if (this.syncInProgress) return

    this.syncInProgress = true
    try {
      if (nodeId && this.sourceMap) {
        const node = this.sourceMap.getNodeById(nodeId)

        // Scroll editor when selection comes from non-editor origin
        if (node && origin !== 'editor') {
          const editorLine = this.lineOffset.sourceMapToEditor(node.position.line)
          if (this.lineOffset.isInCurrentFile(node.position.line)) {
            this.targets.scrollEditorToLine?.(editorLine)
          }
        }

        // Highlight preview when selection comes from non-preview origin
        if (origin !== 'preview') {
          this.targets.highlightPreviewElement?.(nodeId)
        }

        // Always update property panel
        this.targets.updatePropertyPanel?.(nodeId)
      } else {
        // Selection cleared
        this.targets.highlightPreviewElement?.(null)
        this.targets.updatePropertyPanel?.(null)
      }

      // Update breadcrumb using DOM hierarchy
      const breadcrumb = this.computeBreadcrumbFromDOM(nodeId)
      actions.setBreadcrumb(breadcrumb)
    } finally {
      this.syncInProgress = false
    }
  }

  private executeCursorSync(sourceMapLine: number): void {
    if (this.options.debug) {
      console.log('[SyncCoordinator] executeCursorSync', { sourceMapLine, hasSourceMap: !!this.sourceMap })
    }
    if (!this.sourceMap) return
    const node = this.sourceMap.getNodeAtLine(sourceMapLine)
    if (this.options.debug) {
      console.log('[SyncCoordinator] node at line', { node: node?.nodeId })
    }
    if (node && node.nodeId) {
      // Set selection - sync will be triggered by event
      actions.setSelection(node.nodeId, 'editor')
    }
  }

  /**
   * Compute breadcrumb by traversing DOM hierarchy
   */
  private computeBreadcrumbFromDOM(nodeId: string | null): Array<{ nodeId: string; name: string }> {
    if (!nodeId || !this.sourceMap) return []

    const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!element) return []

    const path: Array<{ nodeId: string; name: string }> = []
    let current: Element | null = element

    while (current) {
      const mirrorId = current.getAttribute('data-mirror-id')
      if (mirrorId) {
        const node = this.sourceMap.getNodeById(mirrorId)
        if (node) {
          path.unshift({ nodeId: mirrorId, name: node.componentName })
        }
      }

      current = current.parentElement
      if (current?.id === 'preview' || current?.classList.contains('mirror-root')) {
        break
      }
    }

    return path
  }
}

export function createSyncCoordinator(options?: SyncCoordinatorOptions): SyncCoordinator {
  return new SyncCoordinator(options)
}
