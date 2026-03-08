/**
 * EditorSyncManager - Synchronizes editor cursor with preview selection
 *
 * Performance-first design:
 * - Only syncs on cursor movement, NOT during typing
 * - Debounced to avoid excessive updates
 * - Uses requestIdleCallback for non-blocking sync
 * - Tracks sync origin to prevent infinite loops
 */

import type { SourceMap } from './source-map'
import type { SelectionManager } from './selection-manager'

/**
 * Origin of sync to prevent loops
 */
export type SyncOrigin = 'editor' | 'preview' | 'property-panel' | null

/**
 * Options for EditorSyncManager
 */
export interface EditorSyncManagerOptions {
  /** Debounce time in ms (default: 150) */
  debounceMs?: number
  /** Use requestIdleCallback for sync (default: true) */
  useIdleCallback?: boolean
  /** Callback to scroll editor to line */
  scrollToLine?: (line: number) => void
}

/**
 * EditorSyncManager class
 */
export class EditorSyncManager {
  private sourceMap: SourceMap
  private selectionManager: SelectionManager
  private options: Required<Omit<EditorSyncManagerOptions, 'scrollToLine'>> & Pick<EditorSyncManagerOptions, 'scrollToLine'>

  private pendingSync: number | null = null
  private lastLine: number = -1
  private currentOrigin: SyncOrigin = null
  private originResetTimer: number | null = null

  private unsubscribeSelection: (() => void) | null = null

  constructor(
    sourceMap: SourceMap,
    selectionManager: SelectionManager,
    options: EditorSyncManagerOptions = {}
  ) {
    this.sourceMap = sourceMap
    this.selectionManager = selectionManager
    this.options = {
      debounceMs: options.debounceMs ?? 150,
      useIdleCallback: options.useIdleCallback ?? true,
      scrollToLine: options.scrollToLine,
    }

    // Subscribe to selection changes for reverse sync (preview → editor)
    this.unsubscribeSelection = this.selectionManager.subscribe((nodeId) => {
      this.handleSelectionChange(nodeId)
    })
  }

  /**
   * Called by EditorView.updateListener when cursor moves
   * IMPORTANT: Only call this when selection changed WITHOUT doc change
   */
  onCursorMove(line: number): void {
    // Same line? Skip
    if (line === this.lastLine) return
    this.lastLine = line

    // Cancel any pending sync
    this.cancelPending()

    // Schedule debounced sync
    this.pendingSync = window.setTimeout(() => {
      this.pendingSync = null
      this.executeSyncToPreview(line)
    }, this.options.debounceMs)
  }

  /**
   * Execute sync from editor to preview
   */
  private executeSyncToPreview(line: number): void {
    // Mark origin to prevent reverse sync
    this.setOrigin('editor')

    const syncFn = () => {
      const node = this.sourceMap.getNodeAtLine(line)
      if (node) {
        this.selectionManager.select(node.nodeId)
      }
    }

    // Use idle callback if available and enabled
    if (this.options.useIdleCallback && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(syncFn, { timeout: 100 })
    } else {
      syncFn()
    }
  }

  /**
   * Handle selection change (for reverse sync: preview → editor)
   */
  private handleSelectionChange(nodeId: string | null): void {
    // Skip if sync originated from editor
    if (this.currentOrigin === 'editor') return

    // Skip if no scroll callback
    if (!this.options.scrollToLine) return

    // Skip if no selection
    if (!nodeId) return

    // Find node and scroll to its line
    const node = this.sourceMap.getNodeById(nodeId)
    if (node) {
      this.setOrigin('preview')
      this.options.scrollToLine(node.position.line)
    }
  }

  /**
   * Set sync origin with auto-reset
   */
  private setOrigin(origin: SyncOrigin): void {
    this.currentOrigin = origin

    // Clear any existing reset timer
    if (this.originResetTimer) {
      clearTimeout(this.originResetTimer)
    }

    // Reset origin after a frame to allow sync to complete
    this.originResetTimer = window.setTimeout(() => {
      this.currentOrigin = null
      this.originResetTimer = null
    }, 50)
  }

  /**
   * Get current sync origin (for external checks)
   */
  getOrigin(): SyncOrigin {
    return this.currentOrigin
  }

  /**
   * Update source map reference (after recompile)
   */
  updateSourceMap(sourceMap: SourceMap): void {
    this.sourceMap = sourceMap
  }

  /**
   * Cancel any pending sync
   */
  private cancelPending(): void {
    if (this.pendingSync) {
      clearTimeout(this.pendingSync)
      this.pendingSync = null
    }
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    this.cancelPending()

    if (this.originResetTimer) {
      clearTimeout(this.originResetTimer)
      this.originResetTimer = null
    }

    if (this.unsubscribeSelection) {
      this.unsubscribeSelection()
      this.unsubscribeSelection = null
    }
  }
}

/**
 * Create an EditorSyncManager
 */
export function createEditorSyncManager(
  sourceMap: SourceMap,
  selectionManager: SelectionManager,
  options?: EditorSyncManagerOptions
): EditorSyncManager {
  return new EditorSyncManager(sourceMap, selectionManager, options)
}
