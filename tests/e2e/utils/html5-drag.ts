/**
 * HTML5 Drag-Drop Test Utilities
 *
 * Playwright's dragTo() and mouse events don't properly trigger HTML5 drag-and-drop
 * with custom MIME types. This utility dispatches real DragEvent objects with
 * correctly configured dataTransfer.
 *
 * CRITICAL INSIGHT: The browser's drag-drop system requires TWO dragover events:
 * 1. First dragover: Starts the drag operation
 * 2. Second dragover: Triggers target detection and calculates drop position
 * 3. Drop: Executes the drop action (only works when target is detected)
 *
 * @see https://github.com/microsoft/playwright/issues/13855
 */

import { Page } from '@playwright/test'

export interface DragOptions {
  /** MIME type for the drag data (e.g., 'application/json', 'text/plain') */
  mimeType: string
  /** Data to transfer (will be JSON.stringified if object) */
  data: unknown
  /** CSS selector for the drop target */
  targetSelector: string
  /** Optional: Specific drop position (defaults to center of target) */
  position?: { x: number; y: number }
  /** Optional: Number of dragover events to dispatch (default: 2) */
  dragoverCount?: number
  /** Optional: Delay between events in ms (default: 50) */
  eventDelay?: number
}

export interface DragResult {
  success: boolean
  error?: string
  targetFound: boolean
  eventsPrevented: {
    dragover: boolean
    drop: boolean
  }
}

/**
 * Simulate HTML5 drag-and-drop with custom MIME types.
 *
 * @example
 * ```typescript
 * await simulateHtml5Drag(page, {
 *   mimeType: 'application/mirror-component',
 *   data: { componentName: 'Button', componentId: 'button' },
 *   targetSelector: '[data-mirror-id="frame-1"]'
 * })
 * ```
 */
export async function simulateHtml5Drag(page: Page, options: DragOptions): Promise<DragResult> {
  const { mimeType, data, targetSelector, position, dragoverCount = 2, eventDelay = 50 } = options

  const dataString = typeof data === 'string' ? data : JSON.stringify(data)

  return page.evaluate(
    ({ mimeType, dataString, targetSelector, position, dragoverCount, eventDelay }) => {
      return new Promise<DragResult>(resolve => {
        const target = document.querySelector(targetSelector) as HTMLElement
        if (!target) {
          resolve({
            success: false,
            error: `Target not found: ${targetSelector}`,
            targetFound: false,
            eventsPrevented: { dragover: false, drop: false },
          })
          return
        }

        const rect = target.getBoundingClientRect()
        const dropX = position?.x ?? rect.left + rect.width / 2
        const dropY = position?.y ?? rect.top + rect.height / 2

        // Helper to create a mock dataTransfer
        const createDataTransfer = () => ({
          types: [mimeType],
          dropEffect: 'copy' as DataTransfer['dropEffect'],
          effectAllowed: 'copy' as DataTransfer['effectAllowed'],
          getData: (type: string) => (type === mimeType ? dataString : ''),
          setData: () => {},
          setDragImage: () => {},
          clearData: () => {},
          items: [] as unknown as DataTransferItemList,
          files: [] as unknown as FileList,
        })

        let dragoverPrevented = false
        let dropPrevented = false

        // Dispatch multiple dragover events (required for proper target detection)
        const dispatchDragovers = (count: number, callback: () => void) => {
          let dispatched = 0
          const dispatchNext = () => {
            if (dispatched >= count) {
              callback()
              return
            }

            const dragOverEvent = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              clientX: dropX,
              clientY: dropY,
            })
            Object.defineProperty(dragOverEvent, 'dataTransfer', {
              value: createDataTransfer(),
            })

            const prevented = !target.dispatchEvent(dragOverEvent)
            if (prevented) dragoverPrevented = true

            dispatched++
            setTimeout(dispatchNext, eventDelay)
          }
          dispatchNext()
        }

        // Dispatch dragovers, then drop
        dispatchDragovers(dragoverCount, () => {
          setTimeout(() => {
            const dropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              clientX: dropX,
              clientY: dropY,
            })
            Object.defineProperty(dropEvent, 'dataTransfer', {
              value: createDataTransfer(),
            })

            dropPrevented = !target.dispatchEvent(dropEvent)

            // Also dispatch dragend to clean up
            const dragEndEvent = new DragEvent('dragend', {
              bubbles: true,
              cancelable: true,
            })
            Object.defineProperty(dragEndEvent, 'dataTransfer', {
              value: createDataTransfer(),
            })
            target.dispatchEvent(dragEndEvent)

            setTimeout(() => {
              resolve({
                success: true,
                targetFound: true,
                eventsPrevented: {
                  dragover: dragoverPrevented,
                  drop: dropPrevented,
                },
              })
            }, 100)
          }, eventDelay)
        })
      })
    },
    { mimeType, dataString, targetSelector, position, dragoverCount, eventDelay }
  )
}

/**
 * Simulate dragging a component from a panel to a preview container.
 * Specialized helper for Mirror's component drag-drop.
 *
 * @example
 * ```typescript
 * await simulateMirrorComponentDrag(page, {
 *   componentName: 'Button',
 *   targetNodeId: 'frame-1',
 *   placement: 'inside' // or 'before', 'after'
 * })
 * ```
 */
export async function simulateMirrorComponentDrag(
  page: Page,
  options: {
    componentName: string
    componentId?: string
    targetNodeId: string
    position?: { x: number; y: number }
  }
): Promise<DragResult> {
  const { componentName, componentId, targetNodeId, position } = options

  return simulateHtml5Drag(page, {
    mimeType: 'application/mirror-component',
    data: {
      componentId: componentId ?? componentName.toLowerCase(),
      componentName,
      fromComponentPanel: true,
    },
    targetSelector: `[data-mirror-id="${targetNodeId}"]`,
    position,
  })
}

/**
 * Simulate dragging an element within the preview (move operation).
 *
 * @example
 * ```typescript
 * await simulateMirrorElementMove(page, {
 *   sourceNodeId: 'button-1',
 *   targetNodeId: 'frame-2',
 * })
 * ```
 */
export async function simulateMirrorElementMove(
  page: Page,
  options: {
    sourceNodeId: string
    targetNodeId: string
    position?: { x: number; y: number }
    duplicate?: boolean
  }
): Promise<DragResult> {
  const { sourceNodeId, targetNodeId, position, duplicate = false } = options

  return simulateHtml5Drag(page, {
    mimeType: 'application/mirror-element',
    data: {
      nodeId: sourceNodeId,
      action: duplicate ? 'duplicate' : 'move',
    },
    targetSelector: `[data-mirror-id="${targetNodeId}"]`,
    position,
  })
}

/**
 * Get the bounding rect of an element by its Mirror node ID.
 */
export async function getMirrorElementRect(
  page: Page,
  nodeId: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate(nodeId => {
    const el = document.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }, nodeId)
}

/**
 * Get all Mirror node IDs in the preview.
 */
export async function getMirrorNodeIds(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('[data-mirror-id]')
    return Array.from(elements).map(el => el.getAttribute('data-mirror-id') || '')
  })
}

/**
 * Wait for a Mirror node to appear in the preview.
 */
export async function waitForMirrorNode(
  page: Page,
  nodeIdOrSelector: string,
  timeout = 5000
): Promise<boolean> {
  const selector = nodeIdOrSelector.startsWith('[')
    ? nodeIdOrSelector
    : `[data-mirror-id="${nodeIdOrSelector}"]`

  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}
