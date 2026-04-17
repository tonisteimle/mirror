/**
 * Resize Handle Double-Click Test Suite
 *
 * Tests for double-clicking resize handles to set dimensions to full:
 * - n/s handles: set h full
 * - e/w handles: set w full
 * - corner handles (nw/ne/sw/se): set both w full and h full
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Horizontal Handles (e/w) - Width Full
// =============================================================================

export const horizontalHandleTests: TestCase[] = describe(
  'Resize Handle Double-Click - Width Full',
  [
    testWithSetup(
      'Double-click east handle sets w full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the east resize handle on inner Frame
        await api.interact.doubleClickResizeHandle('node-2', 'e')
        await api.utils.waitForCompile()

        // Verify w full was added
        api.assert.codeContains(/\bw\s+full\b/)
        // Height should NOT have changed
        api.assert.codeContains(/\bh\s+50\b/)
      }
    ),

    testWithSetup(
      'Double-click west handle sets w full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the west resize handle
        await api.interact.doubleClickResizeHandle('node-2', 'w')
        await api.utils.waitForCompile()

        // Verify w full was added
        api.assert.codeContains(/\bw\s+full\b/)
        // Height should NOT have changed
        api.assert.codeContains(/\bh\s+50\b/)
      }
    ),
  ]
)

// =============================================================================
// Vertical Handles (n/s) - Height Full
// =============================================================================

export const verticalHandleTests: TestCase[] = describe(
  'Resize Handle Double-Click - Height Full',
  [
    testWithSetup(
      'Double-click north handle sets h full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the north resize handle
        await api.interact.doubleClickResizeHandle('node-2', 'n')
        await api.utils.waitForCompile()

        // Verify h full was added
        api.assert.codeContains(/\bh\s+full\b/)
        // Width should NOT have changed
        api.assert.codeContains(/\bw\s+100\b/)
      }
    ),

    testWithSetup(
      'Double-click south handle sets h full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the south resize handle
        await api.interact.doubleClickResizeHandle('node-2', 's')
        await api.utils.waitForCompile()

        // Verify h full was added
        api.assert.codeContains(/\bh\s+full\b/)
        // Width should NOT have changed
        api.assert.codeContains(/\bw\s+100\b/)
      }
    ),
  ]
)

// =============================================================================
// Corner Handles - Both Dimensions Full
// =============================================================================

export const cornerHandleTests: TestCase[] = describe(
  'Resize Handle Double-Click - Corner Handles (Both Full)',
  [
    testWithSetup(
      'Double-click northeast handle sets both w full and h full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the northeast corner handle
        await api.interact.doubleClickResizeHandle('node-2', 'ne')
        await api.utils.waitForCompile()

        // Verify both dimensions are full
        api.assert.codeContains(/\bw\s+full\b/)
        api.assert.codeContains(/\bh\s+full\b/)
      }
    ),

    testWithSetup(
      'Double-click southeast handle sets both w full and h full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the southeast corner handle
        await api.interact.doubleClickResizeHandle('node-2', 'se')
        await api.utils.waitForCompile()

        // Verify both dimensions are full
        api.assert.codeContains(/\bw\s+full\b/)
        api.assert.codeContains(/\bh\s+full\b/)
      }
    ),

    testWithSetup(
      'Double-click southwest handle sets both w full and h full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the southwest corner handle
        await api.interact.doubleClickResizeHandle('node-2', 'sw')
        await api.utils.waitForCompile()

        // Verify both dimensions are full
        api.assert.codeContains(/\bw\s+full\b/)
        api.assert.codeContains(/\bh\s+full\b/)
      }
    ),

    testWithSetup(
      'Double-click northwest handle sets both w full and h full',
      'Frame pad 16, w 400, h 300\n  Frame w 100, h 50, bg #333',
      async (api: TestAPI) => {
        await api.utils.waitForCompile()
        api.interact.clearSelection()
        await api.utils.delay(100)

        // Double-click the northwest corner handle
        await api.interact.doubleClickResizeHandle('node-2', 'nw')
        await api.utils.waitForCompile()

        // Verify both dimensions are full
        api.assert.codeContains(/\bw\s+full\b/)
        api.assert.codeContains(/\bh\s+full\b/)
      }
    ),
  ]
)

// =============================================================================
// Export All
// =============================================================================

export const allResizeHandleDblClickTests: TestCase[] = [
  ...horizontalHandleTests,
  ...verticalHandleTests,
  ...cornerHandleTests,
]
