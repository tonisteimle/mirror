/**
 * Resize Handle Drag Test Suite
 *
 * Tests for dragging resize handles to change element dimensions:
 * - Drag east handle to increase width
 * - Drag south handle to increase height
 * - Drag corner handles to change both dimensions
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

export const resizeHandleDragTests: TestCase[] = describe('Resize Handle Drag', [
  testWithSetup(
    'Drag east handle increases width',
    'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      // Get initial width from code
      const initialCode = window.editor?.state.doc.toString() || ''
      const initialWidthMatch = initialCode.match(/Frame w (\d+), h 50/)
      if (!initialWidthMatch) throw new Error('Could not find initial width')
      const initialWidth = parseInt(initialWidthMatch[1])

      // Drag east handle by 50px
      await api.interact.dragResizeHandle('node-2', 'e', 50, 0)
      await api.utils.waitForCompile()

      // Check that width increased in code
      const newCode = window.editor?.state.doc.toString() || ''
      const newWidthMatch = newCode.match(/Frame w (\d+), h 50/)

      if (!newWidthMatch) {
        // Width might have become 'full' if dragged to parent edge
        if (newCode.includes('w full')) {
          // This is acceptable - element was resized to fill parent
          return
        }
        throw new Error('Could not find width in code')
      }

      const newWidth = parseInt(newWidthMatch[1])

      if (newWidth <= initialWidth) {
        throw new Error(`Width should have increased. Initial: ${initialWidth}, New: ${newWidth}`)
      }
    }
  ),

  testWithSetup(
    'Drag south handle increases height',
    'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      // Drag south handle by 30px
      await api.interact.dragResizeHandle('node-2', 's', 0, 30)
      await api.utils.waitForCompile()

      // Check that height increased in code
      const newCode = window.editor?.state.doc.toString() || ''

      // Height should be > 50 or 'full'
      if (newCode.includes('h full')) {
        return // Acceptable
      }

      const heightMatch = newCode.match(/h (\d+)/)
      if (!heightMatch) {
        throw new Error('Could not find height in code')
      }

      const newHeight = parseInt(heightMatch[1])
      if (newHeight <= 50) {
        throw new Error(`Height should have increased from 50. Got: ${newHeight}`)
      }
    }
  ),

  testWithSetup(
    'Drag west handle decreases width',
    'Frame pad 16, w 400, h 300\n  Frame w 200, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      // Drag west handle right by 50px (decreases width)
      await api.interact.dragResizeHandle('node-2', 'w', 50, 0)
      await api.utils.waitForCompile()

      // Check that width decreased in code - look for the inner Frame (with h 50)
      const newCode = window.editor?.state.doc.toString() || ''
      const innerFrameMatch = newCode.match(/Frame w (\d+), h 50/)

      if (!innerFrameMatch) {
        throw new Error('Could not find inner Frame width in code')
      }

      const newWidth = parseInt(innerFrameMatch[1])
      if (newWidth >= 200) {
        throw new Error(`Width should have decreased from 200. Got: ${newWidth}`)
      }
    }
  ),

  testWithSetup(
    'Drag southeast corner changes both dimensions',
    'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      api.interact.clearSelection()
      await api.utils.delay(100)

      // Drag southeast corner by 40x40
      await api.interact.dragResizeHandle('node-2', 'se', 40, 40)
      await api.utils.waitForCompile()

      // Check that both dimensions changed
      const newCode = window.editor?.state.doc.toString() || ''

      // Check width
      const widthFull = newCode.includes('w full')
      const widthMatch = newCode.match(/w (\d+)/)
      const newWidth = widthFull ? 999 : widthMatch ? parseInt(widthMatch[1]) : 0

      // Check height
      const heightFull = newCode.includes('h full')
      const heightMatch = newCode.match(/Frame w.*h (\d+)/)
      const newHeight = heightFull ? 999 : heightMatch ? parseInt(heightMatch[1]) : 0

      if (newWidth <= 100 && !widthFull) {
        throw new Error(`Width should have increased from 100. Got: ${newWidth}`)
      }
      if (newHeight <= 50 && !heightFull) {
        throw new Error(`Height should have increased from 50. Got: ${newHeight}`)
      }
    }
  ),
])

export default resizeHandleDragTests
