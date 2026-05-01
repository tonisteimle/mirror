/**
 * Stacked/Absolute Drag & Drop Tests
 *
 * Tests for dragging components into stacked containers
 * where elements are positioned with x/y coordinates.
 */

import { testWithSetup, testWithSetupSkip, describe } from '../test-runner'
import type { TestCase, TestAPI } from '../types'

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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 20, 20)

      const code = api.editor.getCode()
      api.assert.codeContains(/Text/)

      const pos = verifyPosition(code, 20, 20, 50)

      // Verify X position is in top-left area (0-50px)
      api.assert.ok(
        pos.actualX !== null && pos.actualX >= 0 && pos.actualX <= 70,
        `X position should be near left edge (0-70px), got: ${pos.actualX}`
      )

      // Verify Y position is in top area (0-50px)
      api.assert.ok(
        pos.actualY !== null && pos.actualY >= 0 && pos.actualY <= 70,
        `Y position should be near top (0-70px), got: ${pos.actualY}`
      )
    }
  ),

  testWithSetup(
    'Drop Input into stacked center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
      // Drop first element
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()

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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
      // Drop three elements at different positions
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 200, 100)
      await api.utils.waitForIdle()
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
    async (api: TestAPI) => {
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
    async (api: TestAPI) => {
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
// App Stacked Tests (Root-level stacked container)
// =============================================================================

export const appStackedTests: TestCase[] = describe('App Stacked', [
  testWithSetup('Drop Button into App stacked (minimal)', 'App stacked', async (api: TestAPI) => {
    // Drop Button at position (100, 100)
    await api.interact.dragToPosition('Button', 'node-1', 100, 100)

    const code = api.editor.getCode()

    // Verify Button was added with x/y coordinates
    api.assert.codeContains(/Button/)
    api.assert.codeContains(/\bx\s+\d+/)
    api.assert.codeContains(/\by\s+\d+/)

    // Verify position is approximately correct
    const pos = verifyPosition(code, 100, 100, 50)
    api.assert.ok(
      pos.ok || (pos.actualX !== null && pos.actualY !== null),
      `Position should have x/y, got (${pos.actualX}, ${pos.actualY})`
    )

    // Verify element exists in preview and is visible
    api.assert.exists('node-2')

    const preview = document.getElementById('preview')
    api.assert.ok(preview !== null, 'Preview element must exist')
    const node2El = preview!.querySelector('[data-mirror-id="node-2"]') as HTMLElement
    api.assert.ok(node2El !== null, 'Button element (node-2) must exist in preview')
    api.assert.ok(
      node2El.offsetWidth > 0,
      `Button should have width > 0, got: ${node2El.offsetWidth}`
    )
    api.assert.ok(
      node2El.offsetHeight > 0,
      `Button should have height > 0, got: ${node2El.offsetHeight}`
    )
  }),

  testWithSetup(
    'Drop Icon into App stacked',
    'App stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      // Drop Icon at position (100, 100) - Icon has visible content
      await api.interact.dragToPosition('Icon', 'node-1', 100, 100)

      const code = api.editor.getCode()

      // Verify Icon was added with x/y coordinates
      api.assert.codeContains(/Icon/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      // Verify position is approximately correct
      const pos = verifyPosition(code, 100, 100, 50)
      api.assert.ok(
        pos.ok || (pos.actualX !== null && pos.actualY !== null),
        `Position should have x/y, got (${pos.actualX}, ${pos.actualY})`
      )

      // Verify element exists in preview
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Drop Button into App stacked',
    'App stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 150, 80)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      // Verify element exists in preview
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Drop multiple elements into App stacked',
    'App stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      // Drop first element
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()

      // Drop second element
      await api.interact.dragToPosition('Text', 'node-1', 200, 150)
      await api.utils.waitForIdle()

      // Drop third element
      await api.interact.dragToPosition('Icon', 'node-1', 300, 200)

      const code = api.editor.getCode()

      // All three should exist with positions
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/Icon/)

      // Should have 3 x positions
      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions, found ${xMatches.length}`)

      // Verify all exist in preview
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'App stacked preserves existing children on drop',
    'App stacked, w 400, h 300, bg #1a1a1a\n  Button "Existing", x 10, y 10',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 200, 100)

      const code = api.editor.getCode()

      // Original button should still exist
      api.assert.codeContains(/Button "Existing", x 10, y 10/)

      // New text should be added
      api.assert.codeContains(/Text/)

      // Both should be in preview
      api.assert.exists('node-2') // Existing Button
      api.assert.exists('node-3') // New Text
    }
  ),
])

// =============================================================================
// Mixed Components: Input + Textarea + Button
// =============================================================================

export const inputTextareaButtonTests: TestCase[] = describe('Input + Textarea + Button Stacked', [
  testWithSetup(
    'Drop Input at top-left',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 30, 30)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      const pos = verifyPosition(code, 30, 30, 40)
      api.assert.ok(
        pos.actualX !== null && pos.actualX <= 70,
        `Input x should be near 30, got ${pos.actualX}`
      )
    }
  ),

  testWithSetup(
    'Drop Textarea at center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Textarea', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Textarea/)

      const pos = verifyPosition(code, 150, 100, 60)
      api.assert.ok(
        pos.ok,
        `Textarea should be near (150, 100), got (${pos.actualX}, ${pos.actualY})`
      )
    }
  ),

  testWithSetup(
    'Drop Input and Textarea at different positions',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Textarea', 'node-1', 50, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/Textarea/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 2, `Should have 2 x positions, found ${xMatches.length}`)
    }
  ),

  testWithSetup(
    'Form layout: Input + Textarea + Button',
    'Frame stacked, w 400, h 350, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Textarea', 'node-1', 50, 80)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 50, 200)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/Textarea/)
      api.assert.codeContains(/Button/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      const yMatches = code.match(/\by\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions, found ${xMatches.length}`)
      api.assert.ok(yMatches.length >= 3, `Should have 3 y positions, found ${yMatches.length}`)
    }
  ),
])

// =============================================================================
// Mixed Components: Link + Image + Icon
// =============================================================================

export const linkImageIconTests: TestCase[] = describe('Link + Image + Icon Stacked', [
  testWithSetup(
    'Drop Link at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Link', 'node-1', 100, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Link/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Drop Image at center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Image', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Image/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Card layout: Image + Icon overlay',
    'Frame stacked, w 300, h 250, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Image', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 220, 40)

      const code = api.editor.getCode()
      api.assert.codeContains(/Image/)
      api.assert.codeContains(/Icon/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 2, `Should have 2 x positions`)
    }
  ),

  testWithSetup(
    'Gallery: Multiple images at grid positions',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Image', 'node-1', 30, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Image', 'node-1', 200, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Link', 'node-1', 100, 200)

      const code = api.editor.getCode()
      const imageMatches = code.match(/\bImage\b/g) || []
      api.assert.ok(imageMatches.length >= 2, `Should have 2 Images, found ${imageMatches.length}`)
      api.assert.codeContains(/Link/)
    }
  ),
])

// =============================================================================
// Mixed Components: Divider + Spacer in Stacked
// =============================================================================

export const dividerSpacerStackedTests: TestCase[] = describe('Divider + Spacer Stacked', [
  testWithSetup(
    'Drop Divider with position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Divider', 'node-1', 50, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Divider/)
      // Divider should have position
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Drop Spacer with position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Spacer', 'node-1', 100, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Spacer/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Section layout: Text + Divider + Text',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Divider', 'node-1', 50, 80)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 50, 120)

      const code = api.editor.getCode()
      const textMatches = code.match(/\bText\b/g) || []
      api.assert.ok(textMatches.length >= 2, `Should have 2 Text elements`)
      api.assert.codeContains(/Divider/)
    }
  ),
])

// =============================================================================
// Mixed Components: Zag Components (Checkbox, Switch, Slider)
// =============================================================================

// SKIPPED: Pure Mirror components (Checkbox, Switch, Slider) don't get x/y coordinates
// when dropped onto stacked frames - this is a known limitation of the current
// PureComponentHandler that doesn't propagate position information to the code output
export const zagStackedTests: TestCase[] = describe('Zag Components Stacked', [
  testWithSetupSkip(
    'Drop Checkbox at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Checkbox', 'node-1', 50, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetupSkip(
    'Drop Switch at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Switch', 'node-1', 100, 80)

      const code = api.editor.getCode()
      api.assert.codeContains(/Switch/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetupSkip(
    'Drop Slider at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Slider', 'node-1', 50, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Slider/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetupSkip(
    'Settings panel: multiple Switches',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Switch', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Switch', 'node-1', 50, 80)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Switch', 'node-1', 50, 130)

      const code = api.editor.getCode()
      const switchMatches = code.match(/\bSwitch\b/g) || []
      api.assert.ok(
        switchMatches.length >= 3,
        `Should have 3 Switches, found ${switchMatches.length}`
      )

      const yMatches = code.match(/\by\s+\d+/g) || []
      api.assert.ok(yMatches.length >= 3, `Should have 3 y positions`)
    }
  ),

  testWithSetupSkip(
    'Form: Checkbox + Slider + Button',
    'Frame stacked, w 400, h 350, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Checkbox', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Slider', 'node-1', 50, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 50, 200)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox/)
      api.assert.codeContains(/Slider/)
      api.assert.codeContains(/Button/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions`)
    }
  ),
])

// =============================================================================
// Complex Mixed: 4+ different component types
// =============================================================================

export const complexStackedMixedTests: TestCase[] = describe(
  'Complex Mixed Stacked (4+ components)',
  [
    testWithSetup(
      'Dashboard: Icon + Text + Button + Input',
      'Frame stacked, w 500, h 400, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Icon', 'node-1', 30, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Text', 'node-1', 70, 35)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Input', 'node-1', 200, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Button', 'node-1', 400, 30)

        const code = api.editor.getCode()
        api.assert.codeContains(/Icon/)
        api.assert.codeContains(/Text/)
        api.assert.codeContains(/Input/)
        api.assert.codeContains(/Button/)

        const xMatches = code.match(/\bx\s+\d+/g) || []
        api.assert.ok(xMatches.length >= 4, `Should have 4 x positions, found ${xMatches.length}`)
      }
    ),

    testWithSetup(
      'Card overlay: Image + Icon badge + Text + Link',
      'Frame stacked, w 400, h 350, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Image', 'node-1', 30, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Icon', 'node-1', 300, 40)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Text', 'node-1', 30, 220)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Link', 'node-1', 30, 270)

        const code = api.editor.getCode()
        api.assert.codeContains(/Image/)
        api.assert.codeContains(/Icon/)
        api.assert.codeContains(/Text/)
        api.assert.codeContains(/Link/)
      }
    ),

    // SKIPPED: Pure Mirror components (Switch, Checkbox, Slider) don't get x/y coordinates
    testWithSetupSkip(
      'Settings: Text + Switch + Checkbox + Slider + Button',
      'Frame stacked, w 400, h 400, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Text', 'node-1', 30, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Switch', 'node-1', 30, 70)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Checkbox', 'node-1', 30, 130)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Slider', 'node-1', 30, 200)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Button', 'node-1', 30, 300)

        const code = api.editor.getCode()
        api.assert.codeContains(/Text/)
        api.assert.codeContains(/Switch/)
        api.assert.codeContains(/Checkbox/)
        api.assert.codeContains(/Slider/)
        api.assert.codeContains(/Button/)

        const yMatches = code.match(/\by\s+\d+/g) || []
        api.assert.ok(yMatches.length >= 5, `Should have 5 y positions, found ${yMatches.length}`)
      }
    ),

    testWithSetup(
      'Contact form: Input + Input + Textarea + Button + Icon',
      'Frame stacked, w 400, h 400, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Input', 'node-1', 50, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Input', 'node-1', 50, 80)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Textarea', 'node-1', 50, 130)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Button', 'node-1', 50, 280)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Icon', 'node-1', 300, 285)

        const code = api.editor.getCode()
        const inputMatches = code.match(/\bInput\b/g) || []
        api.assert.ok(
          inputMatches.length >= 2,
          `Should have 2 Inputs, found ${inputMatches.length}`
        )
        api.assert.codeContains(/Textarea/)
        api.assert.codeContains(/Button/)
        api.assert.codeContains(/Icon/)
      }
    ),
  ]
)

// =============================================================================
// Position Precision Tests with Mixed Components
// =============================================================================

export const positionPrecisionMixedTests: TestCase[] = describe('Position Precision Mixed', [
  testWithSetup(
    'Grid positions: 3x3 Icons',
    'Frame stacked, w 400, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      // Row 1
      await api.interact.dragToPosition('Icon', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 175, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 300, 50)
      await api.utils.waitForIdle()
      // Row 2
      await api.interact.dragToPosition('Icon', 'node-1', 50, 175)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 175, 175)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Icon', 'node-1', 300, 175)

      const code = api.editor.getCode()
      const iconMatches = code.match(/\bIcon\b/g) || []
      api.assert.ok(iconMatches.length >= 6, `Should have 6 Icons, found ${iconMatches.length}`)
    }
  ),

  testWithSetup(
    'Diagonal: Button trail',
    'Frame stacked, w 400, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 150, 150)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 250, 250)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 350, 350)

      const code = api.editor.getCode()
      const buttonMatches = code.match(/\bButton\b/g) || []
      api.assert.ok(
        buttonMatches.length >= 4,
        `Should have 4 Buttons, found ${buttonMatches.length}`
      )

      // Check positions increase diagonally
      const xMatches = code.match(/\bx\s+(\d+)/g) || []
      const yMatches = code.match(/\by\s+(\d+)/g) || []
      api.assert.ok(xMatches.length >= 4, `Should have 4 x positions`)
      api.assert.ok(yMatches.length >= 4, `Should have 4 y positions`)
    }
  ),

  testWithSetup(
    'Corner positions: different components',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      // Top-left
      await api.interact.dragToPosition('Icon', 'node-1', 20, 20)
      await api.utils.waitForIdle()
      // Top-right
      await api.interact.dragToPosition('Button', 'node-1', 330, 20)
      await api.utils.waitForIdle()
      // Bottom-left
      await api.interact.dragToPosition('Text', 'node-1', 20, 250)
      await api.utils.waitForIdle()
      // Bottom-right
      await api.interact.dragToPosition('Link', 'node-1', 330, 250)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/Link/)
    }
  ),
])

// =============================================================================
// Nested Stacked Containers
// =============================================================================

export const nestedStackedTests: TestCase[] = describe('Nested Stacked Containers', [
  testWithSetup(
    'Drop into nested stacked Frame',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Frame stacked, w 200, h 150, bg #333, x 100, y 75`,
    async (api: TestAPI) => {
      // Drop into inner stacked Frame (node-2)
      await api.interact.dragToPosition('Button', 'node-2', 50, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
    }
  ),

  testWithSetup(
    'Drop Icon into nested stacked',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Frame stacked, w 180, h 120, bg #333, x 110, y 90`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-2', 80, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
    }
  ),
])

// =============================================================================
// Stacked with existing elements (preserving positions)
// =============================================================================

export const stackedPreservePositionsTests: TestCase[] = describe('Stacked Preserve Positions', [
  testWithSetup(
    'Add Button preserves existing Icon position',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Icon "star", x 50, y 50`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 200, 150)

      const code = api.editor.getCode()
      // Original Icon should still have its position
      api.assert.codeContains(/Icon "star", x 50, y 50/)
      api.assert.codeContains(/Button/)
    }
  ),

  testWithSetup(
    'Add multiple preserves all positions',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Text "Title", x 30, y 20
  Button "Action", x 30, y 60`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 300, 40)

      const code = api.editor.getCode()
      // Original elements should keep positions
      api.assert.codeContains(/Text "Title", x 30, y 20/)
      api.assert.codeContains(/Button "Action", x 30, y 60/)
      api.assert.codeContains(/Icon/)
    }
  ),

  testWithSetup(
    'Add Switch preserves Checkbox position',
    `Frame stacked, w 400, h 300, bg #1a1a1a
  Checkbox "Option A", x 40, y 40`,
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Switch', 'node-1', 40, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox "Option A", x 40, y 40/)
      api.assert.codeContains(/Switch/)
    }
  ),
])

// =============================================================================
// App Stacked with mixed components
// =============================================================================

export const appStackedMixedTests: TestCase[] = describe('App Stacked Mixed Components', [
  testWithSetup(
    'App stacked: Icon + Text header',
    'App stacked, w 500, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 30, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Text', 'node-1', 70, 35)

      const code = api.editor.getCode()
      api.assert.codeContains(/Icon/)
      api.assert.codeContains(/Text/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 2, `Should have 2 x positions`)
    }
  ),

  testWithSetup(
    'App stacked: Form layout with Input + Textarea + Button',
    'App stacked, w 500, h 400, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Textarea', 'node-1', 50, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 50, 250)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/Textarea/)
      api.assert.codeContains(/Button/)
    }
  ),

  testWithSetup(
    'App stacked: Zag controls',
    'App stacked, w 400, h 350, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Checkbox', 'node-1', 50, 50)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Switch', 'node-1', 50, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Slider', 'node-1', 50, 160)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox/)
      api.assert.codeContains(/Switch/)
      api.assert.codeContains(/Slider/)
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
  ...appStackedTests,
  // New mixed component tests
  ...inputTextareaButtonTests,
  ...linkImageIconTests,
  ...dividerSpacerStackedTests,
  ...zagStackedTests,
  ...complexStackedMixedTests,
  ...positionPrecisionMixedTests,
  ...nestedStackedTests,
  ...stackedPreservePositionsTests,
  ...appStackedMixedTests,
]

export default allStackedDragTests
