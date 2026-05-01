/**
 * Draggable Preview Elements Manager
 *
 * Wires every `[data-mirror-id]` element in the preview pane to the
 * studio drag-drop system. Called after each compile/render so newly
 * added elements pick up the drag handler and removed elements get
 * their cleanup callback invoked.
 *
 * State (cleanup callbacks + WeakSet of already-initialized elements)
 * is encapsulated inside the manager — each refresh() drops the prior
 * generation's listeners before re-attaching.
 *
 * The Mirror root (`data-mirror-root="true"`) is intentionally
 * skipped: the main component cannot be dragged out of itself, only
 * its children can.
 */

interface DragDropAPI {
  makeElementDraggable: (el: Element) => () => void
}

interface StudioWithDragDrop {
  dragDrop?: DragDropAPI
}

export interface DraggableElementsConfig {
  /** Returns the studio bridge (lazy — drag-drop may attach late). */
  getStudio: () => StudioWithDragDrop
  /** CSS selector for the preview container. Default `#preview`. */
  previewSelector?: string
}

export interface DraggableElementsManager {
  /** Re-bind drag handlers across the current preview DOM. */
  refresh: () => void
  /** Drop all currently-bound handlers (no rebind). */
  reset: () => void
}

export function createDraggableElementsManager(
  config: DraggableElementsConfig
): DraggableElementsManager {
  const cleanups: Array<() => void> = []
  const initialized = new WeakSet<Element>()
  const selector = config.previewSelector ?? '#preview'

  function reset(): void {
    cleanups.forEach(cleanup => cleanup())
    cleanups.length = 0
  }

  function refresh(): void {
    reset()

    const studio = config.getStudio()
    if (!studio.dragDrop) return

    const container = document.querySelector(selector)
    if (!container) return

    container.querySelectorAll('[data-mirror-id]').forEach(el => {
      const nodeId = el.getAttribute('data-mirror-id')
      if (!nodeId) return
      if (initialized.has(el)) return
      // The Mirror root cannot be dragged out of itself; allow its
      // children but skip the root element.
      if ((el as HTMLElement).dataset.mirrorRoot === 'true') return

      const cleanup = studio.dragDrop!.makeElementDraggable(el)
      cleanups.push(cleanup)
      initialized.add(el)
    })
  }

  return { refresh, reset }
}
