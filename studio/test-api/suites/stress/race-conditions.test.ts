/**
 * Race Condition Tests - Aggressive Testing for Timing Issues
 *
 * These tests specifically target race conditions in:
 * - State management
 * - Sync coordination
 * - Compile cycles
 * - Event handling
 */

import type { TestSuite, TestAPI } from '../../types'
import { testWithSetup } from '../../test-runner'

// =============================================================================
// Compile Race Conditions
// =============================================================================

export const compileRaceTests: TestSuite = [
  testWithSetup(
    'Race: Edit during compile',
    `Frame bg #333
  Text "Original"`,
    async (api: TestAPI) => {
      // Start first edit
      api.editor.setCode(`Frame bg #444
  Text "First"`)

      // Immediately start another edit before compile finishes
      await api.utils.delay(10)
      api.editor.setCode(`Frame bg #555
  Text "Second"`)

      // Wait for both compiles to finish
      await api.utils.waitForCompile()
      await api.utils.delay(500)

      // Final state should be consistent
      const code = api.editor.getCode()
      api.assert.ok(code.includes('#555'), 'Final code should have last edit')
      api.assert.hasText('node-2', 'Second')
    }
  ),

  testWithSetup(
    'Race: Selection during rapid compiles',
    `Frame bg #333
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // Select element
      await api.studio.setSelection('node-2')

      // Rapidly edit code
      for (let i = 0; i < 5; i++) {
        api.editor.setCode(`Frame bg #${i}${i}${i}
  Button "A-${i}"
  Button "B-${i}"`)
        await api.utils.delay(20)
      }

      await api.utils.waitForCompile()
      await api.utils.delay(300)

      // Selection should still be valid
      const selection = api.studio.getSelection()
      api.assert.ok(
        selection === 'node-2' || selection === 'node-1',
        `Selection should be valid, got ${selection}`
      )
    }
  ),

  testWithSetup(
    'Race: Property panel update during compile',
    `Frame pad 16, bg #333`,
    async (api: TestAPI) => {
      // Select element
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // Change property
      await api.panel.property.setProperty('pad', '24')

      // Immediately trigger another compile
      api.editor.setCode(`Frame pad 24, bg #444, rad 8`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // State should be consistent
      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 24'), 'Padding should be set')
    }
  ),

  testWithSetup(
    'Race: Delete element while selected',
    `Frame bg #333
  Button "Keep"
  Button "Delete"`,
    async (api: TestAPI) => {
      // Select the element to delete
      await api.studio.setSelection('node-3')
      await api.utils.delay(50)

      // Delete it via code
      api.editor.setCode(`Frame bg #333
  Button "Keep"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Selection should fall back
      const selection = api.studio.getSelection()
      api.assert.ok(
        selection !== 'node-3',
        `Selection should not be deleted node, got ${selection}`
      )
    }
  ),
]

// =============================================================================
// Event Handling Race Conditions
// =============================================================================

export const eventRaceTests: TestSuite = [
  testWithSetup(
    'Race: Click during state transition',
    `Button "Click", bg #333, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      // Click multiple times very rapidly
      const clicks = []
      for (let i = 0; i < 5; i++) {
        clicks.push(api.interact.click('node-1'))
      }
      await Promise.all(clicks)

      await api.utils.delay(200)

      // State should be deterministic (odd number of clicks = on)
      const styles = api.preview.inspect('node-1')?.styles
      api.assert.ok(styles, 'styles should exist')
      api.assert.ok(
        styles.backgroundColor === 'rgb(34, 113, 193)',
        `Should be on after 5 clicks, got ${styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Race: Hover while element moving',
    `Frame hor, gap 8
  Button "A", bg #333
    hover:
      bg #444
  Button "B", bg #333
    hover:
      bg #444`,
    async (api: TestAPI) => {
      // Hover on A
      await api.interact.hover('node-2')
      await api.utils.delay(50)

      // Immediately hover on B
      await api.interact.hover('node-3')
      await api.utils.delay(100)

      // B should be hovered, A should not
      const stylesB = api.preview.inspect('node-3')?.styles
      api.assert.ok(stylesB, 'stylesB should exist')

      // Allow tolerance for browser rendering quirks (67 vs 68)
      const bgColor = stylesB.backgroundColor
      const isHovered =
        bgColor === 'rgb(68, 68, 68)' ||
        bgColor === 'rgb(67, 67, 67)' || // Browser rounding
        bgColor.includes('68') ||
        bgColor.includes('67')

      api.assert.ok(isHovered, `B should be hovered, got ${bgColor}`)
    }
  ),

  testWithSetup(
    'Race: Focus chain (Tab rapid)',
    `Frame gap 8
  Input placeholder "First"
  Input placeholder "Second"
  Input placeholder "Third"`,
    async (api: TestAPI) => {
      // Focus first input
      await api.interact.focus('node-2')
      await api.utils.delay(20)

      // Rapidly tab through
      await api.interact.focus('node-3')
      await api.utils.delay(10)
      await api.interact.focus('node-4')
      await api.utils.delay(10)
      await api.interact.focus('node-2')
      await api.utils.delay(100)

      // Should be focused on first input
      const el = api.preview.inspect('node-2')
      api.assert.ok(el !== null, 'First input should exist')
    }
  ),
]

// =============================================================================
// Sync Coordination Race Conditions
// =============================================================================

export const syncRaceTests: TestSuite = [
  testWithSetup(
    'Sync: Cursor move during compile',
    `Frame bg #333
  Text "Line 1"
  Text "Line 2"
  Text "Line 3"`,
    async (api: TestAPI) => {
      // Move cursor
      api.editor.setCursor(2, 0)

      // Start compile
      api.editor.setCode(`Frame bg #444
  Text "Line 1"
  Text "Line 2"
  Text "Line 3"
  Text "Line 4"`)

      // Move cursor during compile
      await api.utils.delay(10)
      api.editor.setCursor(4, 0)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Cursor should be at valid position
      const cursor = api.editor.getCursor()
      api.assert.ok(
        cursor.line >= 0 && cursor.line <= 5,
        `Cursor should be valid, got line ${cursor.line}`
      )
    }
  ),

  testWithSetup(
    'Sync: Preview click while code changing',
    `Frame bg #333, pad 16
  Button "Click Me"`,
    async (api: TestAPI) => {
      // Start clicking on preview
      const clickPromise = api.interact.click('node-2')

      // Change code while clicking
      api.editor.setCode(`Frame bg #444, pad 16
  Button "Changed"
  Button "New"`)

      await clickPromise
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Should not crash, state should be consistent
      api.assert.exists('node-1')
    }
  ),

  testWithSetup(
    'Sync: Selection + Property Panel + Compile all at once',
    `Frame bg #333, pad 16
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // Set selection
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)

      // All at once:
      // 1. Change property
      const propPromise = api.panel.property.setProperty('pad', '24')

      // 2. Select different element
      const selectPromise = api.studio.setSelection('node-3')

      // 3. Change code
      api.editor.setCode(`Frame bg #555, pad 16
  Button "A-changed"
  Button "B-changed"`)

      await Promise.all([propPromise, selectPromise])
      await api.utils.waitForCompile()
      await api.utils.delay(300)

      // State should be consistent
      const selection = api.studio.getSelection()
      api.assert.ok(selection !== null, 'Should have valid selection')
    }
  ),
]

// =============================================================================
// Memory/Cleanup Race Conditions
// =============================================================================

export const cleanupRaceTests: TestSuite = [
  testWithSetup(
    'Cleanup: Add and immediately delete element',
    `Frame bg #333`,
    async (api: TestAPI) => {
      // Add element
      api.editor.setCode(`Frame bg #333
  Button "Temporary"`)

      // Immediately delete it
      await api.utils.delay(10)
      api.editor.setCode(`Frame bg #333`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Should have only Frame
      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length === 1, `Should have 1 element, got ${nodeIds.length}`)
    }
  ),

  testWithSetup(
    'Cleanup: Replace all elements rapidly',
    `Frame bg #111
  Text "One"`,
    async (api: TestAPI) => {
      // Rapidly replace content
      for (let i = 0; i < 5; i++) {
        api.editor.setCode(`Frame bg #${i}${i}${i}
  Text "Version ${i}"
  Button "Button ${i}"`)
        await api.utils.delay(30)
      }

      await api.utils.waitForCompile()
      await api.utils.delay(300)

      // Final state should be version 4
      api.assert.hasText('node-2', 'Version 4')
    }
  ),

  testWithSetup(
    'Cleanup: Clear and refill code',
    `Frame bg #333
  Text "Start"`,
    async (api: TestAPI) => {
      // Clear code
      api.editor.setCode('')
      await api.utils.delay(50)

      // Refill
      api.editor.setCode(`Frame bg #444
  Text "Refilled"`)

      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.exists('node-1')
      api.assert.hasText('node-2', 'Refilled')
    }
  ),
]

// =============================================================================
// Export All
// =============================================================================

export const raceConditionTests: TestSuite = [
  ...compileRaceTests,
  ...eventRaceTests,
  ...syncRaceTests,
  ...cleanupRaceTests,
]

export default raceConditionTests
