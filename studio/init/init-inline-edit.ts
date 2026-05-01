/**
 * Inline Edit Controller Initialization
 *
 * Extracted from bootstrap.ts for modularity.
 * Handles Figma-style text editing directly in the preview.
 */

import { state, executor, events } from '../core'
import { SetTextContentCommand } from '../core'
import { InlineEditController, createInlineEditController } from '../inline-edit'
import type { PreviewController } from '../preview'

export interface InlineEditInitConfig {
  /** Preview container element */
  container: HTMLElement
  /** Preview controller instance */
  previewController: PreviewController
}

export interface InlineEditInitResult {
  /** The inline edit controller instance */
  controller: InlineEditController
  /** Cleanup function */
  dispose: () => void
}

/**
 * Initialize the InlineEditController for Figma-style text editing
 */
export function initInlineEdit(config: InlineEditInitConfig): InlineEditInitResult {
  const { container, previewController } = config
  const eventUnsubscribes: Array<() => void> = []

  const inlineEditController = createInlineEditController({
    container,
    onEditEnd: (nodeId, newText, saved) => {
      if (saved && newText) {
        // Execute SetTextContentCommand for undo/redo support
        executor.execute(new SetTextContentCommand({ nodeId, text: newText }))
      }
    },
  })
  inlineEditController.attach()

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

  return {
    controller: inlineEditController,
    dispose: () => {
      for (const unsubscribe of eventUnsubscribes) {
        unsubscribe()
      }
      inlineEditController.dispose()
    },
  }
}
