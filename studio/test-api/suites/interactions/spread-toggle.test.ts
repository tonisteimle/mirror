/**
 * Spread Toggle Tests (S Key Shortcut)
 *
 * Tests for S keyboard shortcut to toggle spread (space-between) property.
 *
 * Behavior:
 * - S adds spread if not present
 * - S removes spread if already present (toggle)
 * - Only works on containers (Frame, Box, etc.)
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Basic Spread Toggle
// =============================================================================

export const basicSpreadTests: TestCase[] = describe('Basic Spread Toggle', [
  testWithSetup(
    'S key adds spread to Frame without spread',
    'Frame hor, gap 8\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Frame
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // Press S to add spread
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Should have spread added
      api.assert.codeContains(/\bspread\b/)
    }
  ),

  testWithSetup(
    'S key removes spread from Frame with spread',
    'Frame hor, gap 8, spread\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Frame
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // Press S to remove spread
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Should not have spread anymore
      api.assert.codeNotContains(/\bspread\b/)
    }
  ),

  testWithSetup(
    'S key toggles spread on/off/on',
    'Frame ver, gap 12\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Select the Frame
      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // First S: add spread
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bspread\b/)

      // Second S: remove spread
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()
      api.assert.codeNotContains(/\bspread\b/)

      // Third S: add spread again
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bspread\b/)
    }
  ),
])

// =============================================================================
// Different Containers
// =============================================================================

export const containerTypeTests: TestCase[] = describe('Spread with Different Containers', [
  testWithSetup(
    'S key works on Box container',
    'Box hor\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      api.assert.codeContains(/\bspread\b/)
    }
  ),

  testWithSetup(
    'S key works on Frame with multiple properties',
    'Frame hor, gap 16, pad 12, bg #1a1a1a\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Should have spread added while preserving other properties
      api.assert.codeContains(/\bspread\b/)
      api.assert.codeContains(/\bhor\b/)
      api.assert.codeContains(/gap 16/)
      api.assert.codeContains(/pad 12/)
    }
  ),

  testWithSetup(
    'S key works on vertical Frame',
    'Frame ver, h 200\n  Text "Top"\n  Text "Bottom"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      api.assert.codeContains(/\bspread\b/)
    }
  ),
])

// =============================================================================
// Edge Cases
// =============================================================================

export const edgeCaseTests: TestCase[] = describe('Spread Toggle Edge Cases', [
  testWithSetup(
    'S key with no selection does nothing',
    'Frame hor\n  Button "A"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Clear selection
      await api.studio.setSelection(null)
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // Press S - should do nothing
      await api.interact.pressKey('s')
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Code should not change without selection')
    }
  ),

  testWithSetup(
    'S key preserves other properties when adding spread',
    'Frame hor, gap 8, pad 16, rad 8, bg #333\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('spread'), 'Spread should be added')
      api.assert.ok(code.includes('gap 8'), 'Gap should be preserved')
      api.assert.ok(code.includes('pad 16'), 'Padding should be preserved')
      api.assert.ok(code.includes('rad 8'), 'Radius should be preserved')
      api.assert.ok(code.includes('bg #333'), 'Background should be preserved')
    }
  ),

  testWithSetup(
    'S key preserves other properties when removing spread',
    'Frame hor, gap 8, spread, pad 16\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(!code.includes('spread'), 'Spread should be removed')
      api.assert.ok(code.includes('gap 8'), 'Gap should be preserved')
      api.assert.ok(code.includes('pad 16'), 'Padding should be preserved')
    }
  ),
])

// =============================================================================
// Modifier Keys
// =============================================================================

export const modifierTests: TestCase[] = describe('Spread Modifier Keys', [
  testWithSetup(
    'S with Cmd does nothing (reserved for system save)',
    'Frame hor\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      const codeBefore = api.editor.getCode()

      // Cmd+S should not toggle spread
      await api.interact.pressKey('s', { meta: true })
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()
      api.assert.ok(codeBefore === codeAfter, 'Cmd+S should not toggle spread')
    }
  ),

  testWithSetup('S with Alt does nothing', 'Frame hor\n  Text "A"', async (api: TestAPI) => {
    await api.utils.waitForCompile()

    await api.studio.setSelection('node-1')
    await api.utils.delay(100)

    const codeBefore = api.editor.getCode()

    // Alt+S should not toggle spread
    await api.interact.pressKey('s', { alt: true })
    await api.utils.delay(200)

    const codeAfter = api.editor.getCode()
    api.assert.ok(codeBefore === codeAfter, 'Alt+S should not toggle spread')
  }),
])

// =============================================================================
// Combined with Other Shortcuts
// =============================================================================

export const combinedTests: TestCase[] = describe('Spread Combined with Other Shortcuts', [
  testWithSetup(
    'H then S: horizontal layout with spread',
    'Frame ver\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // First H: set horizontal
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bhor\b/)

      // Then S: add spread
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bspread\b/)

      // Both should be present
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('hor') && code.includes('spread'),
        'Should have both hor and spread'
      )
    }
  ),

  testWithSetup(
    'V then S: vertical layout with spread',
    'Frame hor\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.studio.setSelection('node-1')
      await api.utils.delay(100)

      // First V: set vertical
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bver\b/)

      // Then S: add spread
      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      // Both should be present
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('ver') && code.includes('spread'),
        'Should have both ver and spread'
      )
    }
  ),

  testWithSetup(
    'Spread toggle after wrap (multiselect then H/V)',
    'Frame ver, gap 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Multiselect A and B
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.interact.shiftClick('node-3')
      await api.utils.delay(100)

      // Wrap with H
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      api.assert.codeContains(/\bhor\b/)

      // Select the new wrapper and add spread
      await api.studio.setSelection('node-2')
      await api.utils.delay(100)

      await api.interact.pressKey('s')
      await api.utils.waitForCompile()

      api.assert.codeContains(/\bspread\b/)
    }
  ),
])

// =============================================================================
// Combined Export
// =============================================================================

export const allSpreadToggleTests: TestCase[] = [
  ...basicSpreadTests,
  ...containerTypeTests,
  ...edgeCaseTests,
  ...modifierTests,
  ...combinedTests,
]
