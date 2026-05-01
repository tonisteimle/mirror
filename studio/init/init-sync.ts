/**
 * Sync Coordinator Initialization
 *
 * Extracted from bootstrap.ts for modularity.
 * Handles Editor ↔ Preview ↔ Panel synchronization.
 */

import { getStateSelectionAdapter } from '../core'
import {
  createSyncCoordinatorWithPorts,
  createProductionSyncPorts,
  createLineOffsetService,
  type SyncCoordinatorV2 as SyncCoordinator,
  type ExtendedSyncPorts,
} from '../sync'
import type { EditorController } from '../editor'
import type { PreviewController } from '../preview'

export interface SyncInitConfig {
  /** Editor controller */
  editorController: EditorController
  /** Preview controller */
  previewController: PreviewController
  /** Cursor debounce in ms (default: 150) */
  cursorDebounce?: number
  /** Enable debug logging */
  debug?: boolean
}

export interface SyncInitResult {
  /** The sync coordinator instance */
  syncCoordinator: SyncCoordinator
  /** Cleanup function */
  dispose: () => void
}

/**
 * Initialize the Sync Coordinator
 *
 * Uses v2 hexagonal architecture with ports for testability.
 * LineOffsetService handles editor ↔ SourceMap line translation.
 */
export function initSync(config: SyncInitConfig): SyncInitResult {
  const { editorController, previewController, cursorDebounce = 150, debug = false } = config

  const lineOffset = createLineOffsetService()
  const syncPorts = createProductionSyncPorts() as ExtendedSyncPorts
  const syncCoordinator = createSyncCoordinatorWithPorts(syncPorts, {
    cursorDebounce,
    debug,
    lineOffset,
  })

  syncCoordinator.setTargets({
    scrollEditorToLine: editorLine => {
      // editorLine is already converted from SourceMap line by SyncCoordinator
      // Set cursor AND scroll to make the selection visible
      // The debouncing in handleCursorMove prevents sync loops
      editorController.scrollToLineAndSelect(editorLine)
    },
    highlightPreviewElement: nodeId =>
      nodeId ? previewController.select(nodeId) : previewController.clearSelection(),
    // Note: PropertyPanel receives updates directly via StateSelectionAdapter
    // which subscribes to selection:changed events. No callback needed here.
  })

  // Note: createSyncCoordinatorWithPorts() already subscribes to selection:changed events

  // Inject SyncCoordinator into SelectionAdapter for consistent selection handling
  const selectionAdapter = getStateSelectionAdapter()
  selectionAdapter.setSyncHandler({
    handleSelectionChange: (nodeId, origin) =>
      syncCoordinator.handleSelectionChange(nodeId, origin),
    clearSelection: origin => syncCoordinator.clearSelection(origin),
  })

  return {
    syncCoordinator,
    dispose: () => {
      syncCoordinator.dispose()
    },
  }
}
