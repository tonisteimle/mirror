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
import { trustedInteractions, coordsOfElement } from '../../trusted-interactions'

// =============================================================================
// H Key - Horizontal Layout
// =============================================================================

export const horizontalLayoutTests: TestCase[] = describe('H Key - Horizontal Layout', [
  testWithSetup(
    'H key sets horizontal layout on selected Frame',
    'Frame gap 8, pad 16\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(50)
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // codeEquals over codeContains: catches stray edits to neighbours
      // (e.g. accidentally rewriting child indentation, dropping pad,
      // or inserting `hor` on the wrong line).
      const actual = api.editor.getCode()
      const expected = 'Frame gap 8, pad 16, hor\n  Text "Item 1"\n  Text "Item 2"'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )

      // Visual check confirms the property actually rendered (catches
      // a hypothetical regression where the source has `hor` but the
      // compiler doesn't apply it).
      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Frame element should still exist after compile')
      api.assert.ok(
        window.getComputedStyle(el).flexDirection === 'row',
        `Flex-direction should be row, got ${window.getComputedStyle(el).flexDirection}`
      )
    }
  ),

  testWithSetup(
    'H key replaces ver with hor',
    'Frame ver, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(50)
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame gap 8, hor\n  Text "Item 1"\n  Text "Item 2"'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Frame element should still exist')
      api.assert.ok(
        window.getComputedStyle(el).flexDirection === 'row',
        `Flex-direction should be row, got ${window.getComputedStyle(el).flexDirection}`
      )
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
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(50)
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame gap 8, ver\n  Text "Item 1"\n  Text "Item 2"'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Frame element should still exist')
      api.assert.ok(
        window.getComputedStyle(el).flexDirection === 'column',
        `Flex-direction should be column, got ${window.getComputedStyle(el).flexDirection}`
      )
    }
  ),

  testWithSetup(
    'V key replaces grid with ver',
    'Frame grid, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(50)
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame gap 8, ver\n  Text "Item 1"\n  Text "Item 2"'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Frame element should still exist')
      api.assert.ok(
        window.getComputedStyle(el).display === 'flex',
        `Display should be flex, got ${window.getComputedStyle(el).display}`
      )
      api.assert.ok(
        window.getComputedStyle(el).flexDirection === 'column',
        `Flex-direction should be column, got ${window.getComputedStyle(el).flexDirection}`
      )
    }
  ),
])

// =============================================================================
// F Key - Full Dimension
// =============================================================================

export const fullDimensionTests: TestCase[] = describe('F Key - Full Dimension', [
  testWithSetup(
    'F key sets w full on wider element',
    'Frame pad 16, w 400\n  Frame w 200, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame pad 16, w 400\n  Frame w full, h 50, bg #333'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )

      // Visual check: width should fill parent (400 - 32 padding = 368)
      const inner = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const parent = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const expectedWidth = parent.getBoundingClientRect().width - 32
      const newWidth = inner.getBoundingClientRect().width
      api.assert.ok(
        Math.abs(newWidth - expectedWidth) < 5,
        `Width should fill parent (~${expectedWidth}px), got ${newWidth}px`
      )
    }
  ),

  testWithSetup(
    'F key sets h full on taller element',
    'Frame pad 16, h 300\n  Frame w 50, h 200, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame pad 16, h 300\n  Frame w 50, h full, bg #333'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )

      const inner = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const parent = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const expectedHeight = parent.getBoundingClientRect().height - 32
      const newHeight = inner.getBoundingClientRect().height
      api.assert.ok(
        Math.abs(newHeight - expectedHeight) < 5,
        `Height should fill parent (~${expectedHeight}px), got ${newHeight}px`
      )
    }
  ),

  testWithSetup(
    'F key twice sets both dimensions to full',
    'Frame pad 16, h 300, w 400\n  Frame w 200, h 50, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-2')
      await api.utils.delay(50)
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame pad 16, h 300, w 400\n  Frame w full, h full, bg #333'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )
    }
  ),
])

// =============================================================================
// Focus Management Tests
// =============================================================================

export const focusManagementTests: TestCase[] = describe('Focus Management', [
  testWithSetup(
    'Preview shortcuts work when element is selected',
    'Frame gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(50)
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      const actual = api.editor.getCode()
      const expected = 'Frame gap 8, hor\n  Text "Item 1"\n  Text "Item 2"'
      api.assert.ok(
        actual === expected,
        `Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
      )
    }
  ),

  testWithSetup(
    'Preview shortcuts do NOT work when editor is focused (even with selection)',
    'Frame gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Wait for compile and select an element first
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Focus the editor via Trusted CDP click — sets `editorHasFocus`
      // through the real focus pipeline (capture-phase focusin, native
      // selection establishment, keymap routing). Synthetic mousedown
      // + .focus() + dispatchEvent('focusin') tried to fake the same
      // sequence but missed the `isTrusted` guard that some keymap
      // hooks check before consuming a keystroke.
      const cmContent = document.querySelector('.cm-content') as HTMLElement
      if (cmContent) {
        await trustedInteractions.click(coordsOfElement(cmContent))
      }
      await api.utils.delay(150)

      // Selection still exists, but editor has focus
      // Pressing H should NOT trigger preview shortcut

      // Get code before pressing H
      const codeBefore = api.editor.getCode()
      const hadHorBefore = codeBefore.includes('hor')

      // Press H key - should NOT trigger preview shortcut because editor is focused
      await api.interact.pressKey('h')
      await api.utils.delay(200)

      const codeAfter = api.editor.getCode()

      // If 'hor' was added as a property, the shortcut fired incorrectly
      const horWasAdded = codeAfter.includes('hor') && !hadHorBefore
      api.assert.ok(
        !horWasAdded,
        `H key should not add 'hor' when editor is focused (even with selection). Code: "${codeAfter.substring(0, 60)}..."`
      )
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
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(50)

      const expectAfter = (label: string, expected: string): void => {
        const actual = api.editor.getCode()
        api.assert.ok(
          actual === expected,
          `[${label}] Code mismatch.\n--- Expected ---\n${expected}\n--- Actual ---\n${actual}`
        )
      }

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      expectAfter('after H', 'Frame gap 8, hor\n  Text "Item 1"\n  Text "Item 2"')

      await api.interact.pressKey('v')
      await api.utils.waitForCompile()
      expectAfter('after V', 'Frame gap 8, ver\n  Text "Item 1"\n  Text "Item 2"')

      await api.interact.pressKey('h')
      await api.utils.waitForCompile()
      expectAfter('after H again', 'Frame gap 8, hor\n  Text "Item 1"\n  Text "Item 2"')
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
  ...focusManagementTests,
  ...combinedShortcutTests,
]
