/**
 * playwright-html5-drag
 *
 * HTML5 drag-and-drop simulation for Playwright with custom MIME type support.
 *
 * Playwright's built-in dragTo() doesn't support custom dataTransfer MIME types.
 * This library dispatches real DragEvent objects with properly configured dataTransfer.
 *
 * CRITICAL INSIGHT: The browser's drag-drop system requires TWO dragover events:
 * 1. First dragover: Starts the drag operation
 * 2. Second dragover: Triggers target detection and calculates drop position
 * 3. Drop: Executes the drop action (only works when target is detected)
 *
 * @see https://github.com/microsoft/playwright/issues/13855
 */

import type { Page } from '@playwright/test'

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
  /** Whether the drag operation completed successfully */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Whether the target element was found */
  targetFound: boolean
  /** Which events had their default prevented */
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
 * import { drag } from 'playwright-html5-drag'
 *
 * await drag(page, {
 *   mimeType: 'application/json',
 *   data: { type: 'widget', id: 42 },
 *   targetSelector: '#drop-zone'
 * })
 * ```
 *
 * @example With position
 * ```typescript
 * await drag(page, {
 *   mimeType: 'text/plain',
 *   data: 'Hello World',
 *   targetSelector: '.canvas',
 *   position: { x: 100, y: 200 }
 * })
 * ```
 */
export async function drag(page: Page, options: DragOptions): Promise<DragResult> {
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
 * Get the bounding rectangle of an element.
 */
export async function getElementRect(
  page: Page,
  selector: string
): Promise<{ x: number; y: number; width: number; height: number } | null> {
  return page.evaluate(selector => {
    const el = document.querySelector(selector)
    if (!el) return null
    const rect = el.getBoundingClientRect()
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
  }, selector)
}

/**
 * Wait for an element to appear.
 */
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout })
    return true
  } catch {
    return false
  }
}

/**
 * Simulate drag with multiple MIME types.
 *
 * @example
 * ```typescript
 * await dragMultiMime(page, {
 *   data: {
 *     'application/json': { type: 'widget' },
 *     'text/plain': 'Widget'
 *   },
 *   targetSelector: '#drop-zone'
 * })
 * ```
 */
export async function dragMultiMime(
  page: Page,
  options: {
    data: Record<string, unknown>
    targetSelector: string
    position?: { x: number; y: number }
    dragoverCount?: number
    eventDelay?: number
  }
): Promise<DragResult> {
  const { data, targetSelector, position, dragoverCount = 2, eventDelay = 50 } = options

  // Serialize all data
  const serializedData: Record<string, string> = {}
  for (const [mimeType, value] of Object.entries(data)) {
    serializedData[mimeType] = typeof value === 'string' ? value : JSON.stringify(value)
  }

  return page.evaluate(
    ({ serializedData, targetSelector, position, dragoverCount, eventDelay }) => {
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

        const mimeTypes = Object.keys(serializedData)

        const createDataTransfer = () => ({
          types: mimeTypes,
          dropEffect: 'copy' as DataTransfer['dropEffect'],
          effectAllowed: 'copy' as DataTransfer['effectAllowed'],
          getData: (type: string) => serializedData[type] || '',
          setData: () => {},
          setDragImage: () => {},
          clearData: () => {},
          items: [] as unknown as DataTransferItemList,
          files: [] as unknown as FileList,
        })

        let dragoverPrevented = false
        let dropPrevented = false

        const dispatchDragovers = (count: number, callback: () => void) => {
          let dispatched = 0
          const dispatchNext = () => {
            if (dispatched >= count) {
              callback()
              return
            }

            const event = new DragEvent('dragover', {
              bubbles: true,
              cancelable: true,
              clientX: dropX,
              clientY: dropY,
            })
            Object.defineProperty(event, 'dataTransfer', { value: createDataTransfer() })
            if (!target.dispatchEvent(event)) dragoverPrevented = true

            dispatched++
            setTimeout(dispatchNext, eventDelay)
          }
          dispatchNext()
        }

        dispatchDragovers(dragoverCount, () => {
          setTimeout(() => {
            const dropEvent = new DragEvent('drop', {
              bubbles: true,
              cancelable: true,
              clientX: dropX,
              clientY: dropY,
            })
            Object.defineProperty(dropEvent, 'dataTransfer', { value: createDataTransfer() })
            dropPrevented = !target.dispatchEvent(dropEvent)

            const dragEndEvent = new DragEvent('dragend', { bubbles: true, cancelable: true })
            Object.defineProperty(dragEndEvent, 'dataTransfer', { value: createDataTransfer() })
            target.dispatchEvent(dragEndEvent)

            setTimeout(() => {
              resolve({
                success: true,
                targetFound: true,
                eventsPrevented: { dragover: dragoverPrevented, drop: dropPrevented },
              })
            }, 100)
          }, eventDelay)
        })
      })
    },
    { serializedData, targetSelector, position, dragoverCount, eventDelay }
  )
}

// Re-export for convenience
export default drag
