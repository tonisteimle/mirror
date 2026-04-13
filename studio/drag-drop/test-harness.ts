/**
 * Drag Performance Test Harness
 *
 * Provides realistic drag simulation for performance testing.
 * Uses the actual event port trigger methods to go through the full code path.
 *
 * Usage (in browser console):
 *   // Basic test with 20 moves
 *   await window.__testDrag__.runPositionedDragTest('el_5', 20)
 *
 *   // Custom test with different move count and interval
 *   await window.__testDrag__.runPositionedDragTest('el_5', 50, 16)
 *
 *   // Manual control
 *   window.__testDrag__.startDrag('el_5')
 *   window.__testDrag__.move(100, 100)
 *   window.__testDrag__.endDrag()
 */

import { dragPerf } from './system/perf-logger'

export interface DragTestResult {
  success: boolean
  totalDuration: number
  moveCount: number
  moveDurations: number[]
  averageMoveDuration: number
  maxMoveDuration: number
  minMoveDuration: number
  slowMoves: number // moves > 50ms
  layoutType: string
  errors: string[]
}

export interface TestHarness {
  /** Run a complete positioned drag test with multiple moves */
  runPositionedDragTest: (
    nodeId: string,
    moveCount?: number,
    moveIntervalMs?: number
  ) => Promise<DragTestResult>

  /** Start a drag operation manually */
  startDrag: (nodeId: string) => boolean

  /** Move to position manually */
  move: (x: number, y: number) => void

  /** End drag operation manually */
  endDrag: () => void

  /** Cancel drag operation manually */
  cancelDrag: () => void

  /** Get current drag state */
  getState: () => any
}

/**
 * Creates a test harness that uses the real event port triggers
 */
export function createTestHarness(): TestHarness {
  // Access the global drag-drop system
  const getDragDropV2 = () => (window as any).__mirrorDragDropV2__

  return {
    async runPositionedDragTest(
      nodeId: string,
      moveCount: number = 20,
      moveIntervalMs: number = 16 // ~60fps
    ): Promise<DragTestResult> {
      const result: DragTestResult = {
        success: false,
        totalDuration: 0,
        moveCount: 0,
        moveDurations: [],
        averageMoveDuration: 0,
        maxMoveDuration: 0,
        minMoveDuration: Infinity,
        slowMoves: 0,
        layoutType: 'unknown',
        errors: [],
      }

      const dragDrop = getDragDropV2()
      if (!dragDrop) {
        result.errors.push('window.__mirrorDragDropV2__ not available')
        return result
      }

      const { eventPort, controller } = dragDrop

      // Find the element - use #preview which contains .mirror-root
      const container = document.querySelector('#preview') as HTMLElement
      if (!container) {
        result.errors.push('Preview container #preview not found')
        return result
      }

      const element = container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      if (!element) {
        result.errors.push(`Element with nodeId "${nodeId}" not found`)
        return result
      }

      // Get element position and parent info
      const rect = element.getBoundingClientRect()
      const parent = element.parentElement
      const parentRect = parent?.getBoundingClientRect()

      // Detect layout type
      const dataLayout = parent?.getAttribute('data-layout')
      result.layoutType =
        dataLayout === 'absolute' || dataLayout === 'stacked' ? 'positioned' : 'flex'

      console.log('[TestHarness] Starting positioned drag test:', {
        nodeId,
        moveCount,
        moveIntervalMs,
        layoutType: result.layoutType,
        elementRect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      })

      // Start perf logger session
      dragPerf.startSession(result.layoutType)

      const totalStart = performance.now()

      try {
        // 1. Start drag
        const source = {
          type: 'canvas' as const,
          nodeId,
          element,
          size: { width: rect.width, height: rect.height },
        }

        const startCursor = {
          x: rect.x + rect.width / 2,
          y: rect.y + rect.height / 2,
        }

        console.log('[TestHarness] Triggering drag start...')
        eventPort.triggerDragStart(source, startCursor)

        // 2. Simulate moves within the parent container
        for (let i = 0; i < moveCount; i++) {
          // Calculate move position - move in a pattern within parent
          const progress = i / moveCount
          const angle = progress * Math.PI * 2 // Full circle

          // Stay within parent bounds if positioned
          let x: number, y: number
          if (parentRect && result.layoutType === 'positioned') {
            const centerX = parentRect.x + parentRect.width / 2
            const centerY = parentRect.y + parentRect.height / 2
            const radiusX = (parentRect.width - rect.width) / 3
            const radiusY = (parentRect.height - rect.height) / 3
            x = centerX + Math.cos(angle) * radiusX
            y = centerY + Math.sin(angle) * radiusY
          } else {
            // For flex, move vertically
            x = startCursor.x
            y = startCursor.y + i * 20 - moveCount * 10
          }

          const moveStart = performance.now()
          eventPort.triggerDragMove({ x, y })
          const moveDuration = performance.now() - moveStart

          result.moveDurations.push(moveDuration)
          result.moveCount++

          if (moveDuration > 50) {
            result.slowMoves++
            console.log(`[TestHarness] Slow move #${i}: ${moveDuration.toFixed(2)}ms`)
          }

          // Wait for next frame
          if (moveIntervalMs > 0 && i < moveCount - 1) {
            await new Promise(resolve => setTimeout(resolve, moveIntervalMs))
          }
        }

        // 3. End drag
        console.log('[TestHarness] Triggering drag end...')
        eventPort.triggerDragEnd()

        result.success = true
      } catch (error) {
        result.errors.push(String(error))
        console.error('[TestHarness] Error:', error)
        // Try to cancel on error
        try {
          eventPort.triggerDragCancel()
        } catch (e) {
          // Ignore cancel errors
        }
      }

      result.totalDuration = performance.now() - totalStart

      // Calculate statistics
      if (result.moveDurations.length > 0) {
        result.averageMoveDuration =
          result.moveDurations.reduce((a, b) => a + b, 0) / result.moveDurations.length
        result.maxMoveDuration = Math.max(...result.moveDurations)
        result.minMoveDuration = Math.min(...result.moveDurations)
      }

      // Print summary
      console.log('\n[TestHarness] ===== RESULTS =====')
      console.log(`Layout Type: ${result.layoutType}`)
      console.log(`Total Duration: ${result.totalDuration.toFixed(2)}ms`)
      console.log(`Move Count: ${result.moveCount}`)
      console.log(`Average Move: ${result.averageMoveDuration.toFixed(2)}ms`)
      console.log(`Min Move: ${result.minMoveDuration.toFixed(2)}ms`)
      console.log(`Max Move: ${result.maxMoveDuration.toFixed(2)}ms`)
      console.log(`Slow Moves (>50ms): ${result.slowMoves}`)
      console.log(`Success: ${result.success}`)
      if (result.errors.length > 0) {
        console.log(`Errors: ${result.errors.join(', ')}`)
      }
      console.log('================================\n')

      // End perf logger session (prints summary automatically)
      dragPerf.endSession(result.success)

      return result
    },

    startDrag(nodeId: string): boolean {
      const dragDrop = getDragDropV2()
      if (!dragDrop) {
        console.error('[TestHarness] window.__mirrorDragDropV2__ not available')
        return false
      }

      const container = document.querySelector('#preview') as HTMLElement
      const element = container?.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement

      if (!element) {
        console.error(`[TestHarness] Element with nodeId "${nodeId}" not found in #preview`)
        return false
      }

      const rect = element.getBoundingClientRect()
      const source = {
        type: 'canvas' as const,
        nodeId,
        element,
        size: { width: rect.width, height: rect.height },
      }

      const cursor = {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      }

      dragDrop.eventPort.triggerDragStart(source, cursor)
      console.log('[TestHarness] Drag started:', nodeId)
      return true
    },

    move(x: number, y: number): void {
      const dragDrop = getDragDropV2()
      if (!dragDrop) {
        console.error('[TestHarness] window.__mirrorDragDropV2__ not available')
        return
      }

      const start = performance.now()
      dragDrop.eventPort.triggerDragMove({ x, y })
      const duration = performance.now() - start
      console.log(`[TestHarness] Move to (${x}, ${y}): ${duration.toFixed(2)}ms`)
    },

    endDrag(): void {
      const dragDrop = getDragDropV2()
      if (!dragDrop) {
        console.error('[TestHarness] window.__mirrorDragDropV2__ not available')
        return
      }

      dragDrop.eventPort.triggerDragEnd()
      console.log('[TestHarness] Drag ended')
    },

    cancelDrag(): void {
      const dragDrop = getDragDropV2()
      if (!dragDrop) {
        console.error('[TestHarness] window.__mirrorDragDropV2__ not available')
        return
      }

      dragDrop.eventPort.triggerDragCancel()
      console.log('[TestHarness] Drag cancelled')
    },

    getState(): any {
      const dragDrop = getDragDropV2()
      if (!dragDrop) {
        return { error: 'window.__mirrorDragDropV2__ not available' }
      }

      return dragDrop.controller.getState()
    },
  }
}

/**
 * Initialize the test harness and expose it globally
 */
export function initTestHarness(): void {
  if (typeof window === 'undefined') return

  const harness = createTestHarness()
  ;(window as any).__testDrag__ = harness

  console.log('[TestHarness] Initialized. Available commands:')
  console.log('  await window.__testDrag__.runPositionedDragTest("el_5", 20)')
  console.log('  window.__testDrag__.startDrag("el_5")')
  console.log('  window.__testDrag__.move(100, 100)')
  console.log('  window.__testDrag__.endDrag()')
}
