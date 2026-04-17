/**
 * Layout Shortcuts Test Suite
 *
 * Tests for H, V, F keyboard shortcuts:
 * - H: Set horizontal layout
 * - V: Set vertical layout
 * - F: Set full dimension (based on element shape)
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// H Key - Horizontal Layout
// =============================================================================

export const horizontalLayoutTests: TestCase[] = describe('H Key - Horizontal Layout', [
  testWithSetup(
    'H key sets horizontal layout on selected Frame',
    'Frame gap 8, pad 16\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Wait for initial compile and click to select
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press H key
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Verify hor was added
      api.assert.codeContains(/\bhor\b/)
    }
  ),

  testWithSetup(
    'H key replaces ver with hor',
    'Frame ver, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Click the Frame to select it
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press H key
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Verify hor is present and ver is removed
      api.assert.codeContains(/\bhor\b/)
      api.assert.codeNotContains(/\bver\b/)
    }
  ),
])

// =============================================================================
// V Key - Vertical Layout
// =============================================================================

export const verticalLayoutTests: TestCase[] = describe('V Key - Vertical Layout', [
  testWithSetup(
    'V key sets vertical layout on selected Frame',
    'Frame hor, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Click to select
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press V key
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Verify ver was added and hor removed
      api.assert.codeContains(/\bver\b/)
      api.assert.codeNotContains(/\bhor\b/)
    }
  ),

  testWithSetup(
    'V key replaces grid with ver',
    'Frame grid, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Click to select
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press V key
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Verify ver is present and grid is removed
      api.assert.codeContains(/\bver\b/)
      api.assert.codeNotContains(/\bgrid\b/)
    }
  ),
])

// =============================================================================
// F Key - Full Dimension
// =============================================================================

export const fullDimensionTests: TestCase[] = describe('F Key - Full Dimension', [
  testWithSetup(
    'F key sets w full on wider element',
    'Frame pad 16\n  Frame w 200, h 50, bg #333',
    async (api: TestAPI) => {
      // Click inner Frame (wider than tall)
      await api.utils.waitForCompile()
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Press F key
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      // Verify w full was added
      api.assert.codeContains(/\bw\s+full\b/)
    }
  ),

  testWithSetup(
    'F key sets h full on taller element',
    'Frame pad 16, h 300\n  Frame w 50, h 200, bg #333',
    async (api: TestAPI) => {
      // Click inner Frame (taller than wide)
      await api.utils.waitForCompile()
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Press F key
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      // Verify h full was added
      api.assert.codeContains(/\bh\s+full\b/)
    }
  ),

  testWithSetup(
    'F key twice sets both dimensions to full',
    'Frame pad 16, h 300\n  Frame w 200, h 50, bg #333',
    async (api: TestAPI) => {
      // Click inner Frame
      await api.utils.waitForCompile()
      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Press F key twice
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      // Verify both w full and h full are present
      api.assert.codeContains(/\bw\s+full\b/)
      api.assert.codeContains(/\bh\s+full\b/)
    }
  ),
])

// =============================================================================
// Combined Tests
// =============================================================================

export const combinedShortcutTests: TestCase[] = describe('Layout Shortcuts Combined', [
  testWithSetup(
    'Can switch between H and V',
    'Frame gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Click to select
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press H
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bhor\b/)

      // Press V
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bver\b/)
      api.assert.codeNotContains(/\bhor\b/)

      // Press H again
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bhor\b/)
      api.assert.codeNotContains(/\bver\b/)
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allLayoutShortcutTests: TestCase[] = [
  ...horizontalLayoutTests,
  ...verticalLayoutTests,
  ...fullDimensionTests,
  ...combinedShortcutTests,
]
