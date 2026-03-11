/**
 * Sync Coordinator - Single point for all sync operations
 */

import { state, actions, events } from '../core'
import type { SelectionOrigin } from '../core/state'
import type { SourceMap } from '../../src/studio/source-map'

export interface SyncTargets {
  scrollEditorToLine?: (line: number) => void
  highlightPreviewElement?: (nodeId: string | null) => void
  updatePropertyPanel?: (nodeId: string | null) => void
  updateBreadcrumb?: (chain: Array<{ nodeId: string; name: string }>) => void
}

export interface SyncCoordinatorOptions {
  cursorDebounce?: number
  debug?: boolean
}

export class SyncCoordinator {
  private sourceMap: SourceMap | null = null
  private targets: SyncTargets = {}
  private options: Required<SyncCoordinatorOptions>
  private syncInProgress = false
  private pendingCursorSync: ReturnType<typeof setTimeout> | null = null
  private lastCursorLine = -1

  constructor(options: SyncCoordinatorOptions = {}) {
    this.options = { cursorDebounce: 150, debug: false, ...options }
  }

  setSourceMap(sourceMap: SourceMap | null): void {
    this.sourceMap = sourceMap
  }

  setTargets(targets: SyncTargets): void {
    this.targets = { ...this.targets, ...targets }
  }

  handleSelectionChange(nodeId: string | null, origin: SelectionOrigin): void {
    if (this.syncInProgress) return
    const currentSelection = state.get().selection
    if (currentSelection.nodeId === nodeId) return

    this.syncInProgress = true
    try {
      actions.setSelection(nodeId, origin)
      if (nodeId && this.sourceMap) {
        const node = this.sourceMap.getNodeById(nodeId)
        if (node && origin !== 'editor') {
          this.targets.scrollEditorToLine?.(node.position.line)
        }
        if (origin !== 'preview') {
          this.targets.highlightPreviewElement?.(nodeId)
        }
        this.targets.updatePropertyPanel?.(nodeId)
      }
    } finally {
      this.syncInProgress = false
    }
  }

  handleCursorMove(line: number, column: number): void {
    if (line === this.lastCursorLine) return
    this.lastCursorLine = line

    if (this.pendingCursorSync) clearTimeout(this.pendingCursorSync)
    this.pendingCursorSync = setTimeout(() => {
      this.executeCursorSync(line)
    }, this.options.cursorDebounce)
  }

  private executeCursorSync(line: number): void {
    if (!this.sourceMap) return
    const node = this.sourceMap.getNodeAtLine(line)
    if (node && node.nodeId) {
      this.handleSelectionChange(node.nodeId, 'editor')
    }
  }

  clearSelection(origin: SelectionOrigin): void {
    this.handleSelectionChange(null, origin)
  }
}

export function createSyncCoordinator(options?: SyncCoordinatorOptions): SyncCoordinator {
  return new SyncCoordinator(options)
}

let globalSync: SyncCoordinator | null = null

/**
 * @deprecated Use getStudioContext().sync instead
 */
export function getSyncCoordinator(): SyncCoordinator | null {
  return globalSync
}

/**
 * @deprecated Use setStudioContext() with context.sync instead
 */
export function setSyncCoordinator(coordinator: SyncCoordinator): void {
  globalSync = coordinator
}
