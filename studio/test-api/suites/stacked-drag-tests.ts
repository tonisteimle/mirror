/**
 * Stacked/Absolute Drag & Drop Tests
 *
 * Tests for dragging components into stacked containers
 * where elements are positioned with x/y coordinates.
 */

import { testWithSetup, describe } from '../test-runner'
import type { TestCase } from '../types'

// =============================================================================
// Helper: Verify x/y position in code
// =============================================================================

function verifyPosition(
  code: string,
  expectedX: number,
  expectedY: number,
  tolerance = 20
): { ok: boolean; actualX: number | null; actualY: number | null } {
  const xMatch = code.match(/\bx\s+(\d+)/i)
  const yMatch = code.match(/\by\s+(\d+)/i)

  const actualX = xMatch ? parseInt(xMatch[1], 10) : null
  const actualY = yMatch ? parseInt(yMatch[1], 10) : null

  const xOk = actualX !== null && Math.abs(actualX - expectedX) <= tolerance
  const yOk = actualY !== null && Math.abs(actualY - expectedY) <= tolerance

  return { ok: xOk && yOk, actualX, actualY }
}

// =============================================================================
// Basic Stacked Drop Tests
// =============================================================================

export const basicStackedTests: TestCase[] = describe('Basic Stacked Drop', [
  testWithSetup(
    'Drop Button into empty stacked Frame',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async api => {
      // Drop Button at position (100, 50)
      await api.interact.dragToPosition('Button', 'node-1', 100, 50)

      // Verify code contains x and y
      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      // Verify position is approximately correct
      const pos = verifyPosition(code, 100, 50, 30)
      api.assert.ok(pos.ok, `Position should be ~(100, 50), got (${pos.actualX}, ${pos.actualY})`)
    }
  ),

  testWithSetup(
    'Drop Icon into stacked with existing elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10',
    async api => {
      await api.interact.dragToPosition('Icon', 'node-1', 200, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)

      // Should have both the existing Button and new Icon with positions
      const buttonMatch = code.match(/Button "A", x 10, y 10/)
      api.assert.ok(buttonMatch !== null, 'Original Button should still exist')
    }
  ),

  testWithSetup(
    'Drop Text at top-left of stacked',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Text', 'node-1', 20, 20)

      const code = api.editor.getCode()
      api.assert.codeContains(/Text/)

      const pos = verifyPosition(code, 20, 20, 30)
      api.assert.ok(
        pos.ok ||
          (pos.actualX !== null && pos.actualX <= 50 && pos.actualY !== null && pos.actualY <= 50),
        `Position should be near top-left, got (${pos.actualX}, ${pos.actualY})`
      )
    }
  ),

  testWithSetup(
    'Drop Input into stacked center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Input', 'node-1', 200, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),
])

// =============================================================================
// Edge Case Tests
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Stacked Edge Cases', [
  testWithSetup(
    'Drop near edge clamps to bounds',
    'Frame stacked, w 200, h 200, bg #1a1a1a',
    async api => {
      // Try to drop at negative position (should clamp to 0)
      await api.interact.dragToPosition('Button', 'node-1', 5, 5)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)

      // Position should be clamped to valid bounds
      const pos = verifyPosition(code, 0, 0, 50)
      api.assert.ok(
        pos.actualX !== null && pos.actualX >= 0,
        `X should be >= 0, got ${pos.actualX}`
      )
      api.assert.ok(
        pos.actualY !== null && pos.actualY >= 0,
        `Y should be >= 0, got ${pos.actualY}`
      )
    }
  ),

  testWithSetup(
    'Multiple drops create multiple positioned elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async api => {
      // Drop first element
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.delay(200)

      // Drop second element
      await api.interact.dragToPosition('Text', 'node-1', 200, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)

      // Both should have positions
      const xMatches = code.match(/\bx\s+\d+/g)
      api.assert.ok(
        xMatches !== null && xMatches.length >= 2,
        `Should have 2 x positions, found ${xMatches?.length ?? 0}`
      )
    }
  ),
])

// =============================================================================
// Layout Detection Tests
// =============================================================================

export const layoutDetectionTests: TestCase[] = describe('Layout Detection', [
  testWithSetup(
    'Detects stacked layout by keyword',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Button', 'node-1', 100, 100)

      const code = api.editor.getCode()
      // Should use position-based drop (x/y) not index-based
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Detects absolute children layout',
    'Frame w 300, h 200, bg #1a1a1a, relative\n  Button "Existing", x 10, y 10',
    async api => {
      // Container has an absolute child, should detect as absolute layout
      await api.interact.dragToPosition('Icon', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
    }
  ),
])

// =============================================================================
// Precise Position Tests
// =============================================================================

export const precisePositionTests: TestCase[] = describe('Precise Position Verification', [
  testWithSetup(
    'Drop at exact center position',
    'Frame stacked, w 400, h 400, bg #1a1a1a',
    async api => {
      // Drop at exact center (200, 200) - accounting for component size ~50x20
      await api.interact.dragToPosition('Button', 'node-1', 200, 200)

      const code = api.editor.getCode()
      const pos = verifyPosition(code, 200, 200, 60) // 60px tolerance for component centering
      api.assert.ok(pos.ok, `Position should be ~(200, 200), got (${pos.actualX}, ${pos.actualY})`)
    }
  ),

  testWithSetup(
    'Drop at bottom-right corner',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async api => {
      // Drop near bottom-right, but within bounds
      await api.interact.dragToPosition('Text', 'node-1', 250, 160)

      const code = api.editor.getCode()
      const pos = verifyPosition(code, 250, 160, 80)
      api.assert.ok(
        pos.actualX !== null && pos.actualX >= 150,
        `X should be >= 150 (right side), got ${pos.actualX}`
      )
      api.assert.ok(
        pos.actualY !== null && pos.actualY >= 100,
        `Y should be >= 100 (bottom half), got ${pos.actualY}`
      )
    }
  ),

  testWithSetup(
    'Sequential drops maintain separate positions',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async api => {
      // Drop three elements at different positions
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.delay(200)
      await api.interact.dragToPosition('Text', 'node-1', 200, 100)
      await api.utils.delay(200)
      await api.interact.dragToPosition('Icon', 'node-1', 350, 250)

      const code = api.editor.getCode()

      // Count x positions - should have 3
      const xMatches = code.match(/\bx\s+\d+/g) || []
      const yMatches = code.match(/\by\s+\d+/g) || []

      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions, found ${xMatches.length}`)
      api.assert.ok(yMatches.length >= 3, `Should have 3 y positions, found ${yMatches.length}`)

      // Verify all three components exist
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/Icon/)
    }
  ),
])

// =============================================================================
// Stacked Container with States Tests
// =============================================================================

export const stackedWithStatesTests: TestCase[] = describe('Stacked with States', [
  testWithSetup(
    'Drop into stacked Frame with hover state',
    `Frame stacked, w 300, h 200, bg #1a1a1a
  hover:
    bg #333`,
    async api => {
      // This tests the bug fix - container has state blocks but no children
      await api.interact.dragToPosition('Button', 'node-1', 100, 80)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
      // State block should still exist
      api.assert.codeContains(/hover:/)
    }
  ),

  testWithSetup(
    'Drop into stacked Frame with multiple states',
    `Frame stacked, w 300, h 200, bg #1a1a1a
  hover:
    bg #333
  active:
    scale 0.95`,
    async api => {
      await api.interact.dragToPosition('Text', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Text/)
      // Both state blocks should still exist
      api.assert.codeContains(/hover:/)
      api.assert.codeContains(/active:/)
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allStackedDragTests: TestCase[] = [
  ...basicStackedTests,
  ...edgeCaseTests,
  ...layoutDetectionTests,
  ...precisePositionTests,
  ...stackedWithStatesTests,
]

export default allStackedDragTests
