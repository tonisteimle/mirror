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

      // Get initial layout - should be vertical (column)
      let element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Frame element should exist')
      const initialDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        initialDirection === 'column',
        `Initial flex-direction should be column, got ${initialDirection}`
      )

      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press H key
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Verify hor was added to code
      api.assert.codeContains(/\bhor\b/)

      // Re-query element after compile (DOM may have been recreated)
      element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Frame element should still exist after compile')

      // Verify visual change - flex-direction should now be row
      const newDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        newDirection === 'row',
        `Flex-direction should change to row after H key, got ${newDirection}`
      )
    }
  ),

  testWithSetup(
    'H key replaces ver with hor',
    'Frame ver, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Click the Frame to select it
      await api.utils.waitForCompile()

      // Verify initial vertical layout
      let element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const initialDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        initialDirection === 'column',
        `Initial flex-direction should be column for ver, got ${initialDirection}`
      )

      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press H key
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Verify hor is present and ver is removed
      api.assert.codeContains(/\bhor\b/)
      api.assert.codeNotContains(/\bver\b/)

      // Re-query element after compile
      element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Frame element should still exist')

      // Verify visual change
      const newDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        newDirection === 'row',
        `Flex-direction should change to row, got ${newDirection}`
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
      // Click to select
      await api.utils.waitForCompile()

      // Verify initial horizontal layout
      let element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Frame element should exist')
      const initialDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        initialDirection === 'row',
        `Initial flex-direction should be row for hor, got ${initialDirection}`
      )

      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press V key
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Verify ver was added and hor removed
      api.assert.codeContains(/\bver\b/)
      api.assert.codeNotContains(/\bhor\b/)

      // Re-query element after compile
      element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Frame element should still exist')

      // Verify visual change
      const newDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        newDirection === 'column',
        `Flex-direction should change to column after V key, got ${newDirection}`
      )
    }
  ),

  testWithSetup(
    'V key replaces grid with ver',
    'Frame grid, gap 8\n  Text "Item 1"\n  Text "Item 2"',
    async (api: TestAPI) => {
      // Click to select
      await api.utils.waitForCompile()

      // Verify initial grid layout
      let element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const initialDisplay = window.getComputedStyle(element).display
      api.assert.ok(
        initialDisplay === 'grid',
        `Initial display should be grid, got ${initialDisplay}`
      )

      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press V key
      await api.interact.pressKey('v')
      await api.utils.waitForCompile()

      // Verify ver is present and grid is removed
      api.assert.codeContains(/\bver\b/)
      api.assert.codeNotContains(/\bgrid\b/)

      // Re-query element after compile
      element = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Frame element should still exist')

      // Verify visual change - should be flex column now
      const newDisplay = window.getComputedStyle(element).display
      const newDirection = window.getComputedStyle(element).flexDirection
      api.assert.ok(
        newDisplay === 'flex',
        `Display should change to flex after V key, got ${newDisplay}`
      )
      api.assert.ok(
        newDirection === 'column',
        `Flex-direction should be column after V key, got ${newDirection}`
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
      // Click inner Frame (wider than tall)
      await api.utils.waitForCompile()

      // Get initial width
      let element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(element !== null, 'Inner Frame should exist')
      const initialWidth = element.getBoundingClientRect().width
      api.assert.ok(
        Math.abs(initialWidth - 200) < 5,
        `Initial width should be ~200px, got ${initialWidth}`
      )

      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Press F key
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      // Verify w full was added
      api.assert.codeContains(/\bw\s+full\b/)

      // Re-query elements after compile
      element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const parentElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Inner Frame should still exist')
      api.assert.ok(parentElement !== null, 'Parent Frame should still exist')

      // Verify visual change - width should now be parent width minus padding
      const newWidth = element.getBoundingClientRect().width
      const parentWidth = parentElement.getBoundingClientRect().width
      const expectedWidth = parentWidth - 32 // 16px padding on each side

      api.assert.ok(
        Math.abs(newWidth - expectedWidth) < 5,
        `Width should expand to fill parent (~${expectedWidth}px), got ${newWidth}px`
      )
    }
  ),

  testWithSetup(
    'F key sets h full on taller element',
    'Frame pad 16, h 300\n  Frame w 50, h 200, bg #333',
    async (api: TestAPI) => {
      // Click inner Frame (taller than wide)
      await api.utils.waitForCompile()

      // Get initial height
      let element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(element !== null, 'Inner Frame should exist')
      const initialHeight = element.getBoundingClientRect().height
      api.assert.ok(
        Math.abs(initialHeight - 200) < 5,
        `Initial height should be ~200px, got ${initialHeight}`
      )

      await api.interact.click('node-2')
      await api.utils.delay(100)

      // Press F key
      await api.interact.pressKey('f')
      await api.utils.waitForCompile()

      // Verify h full was added
      api.assert.codeContains(/\bh\s+full\b/)

      // Re-query elements after compile
      element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const parentElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Inner Frame should still exist')
      api.assert.ok(parentElement !== null, 'Parent Frame should still exist')

      // Verify visual change - height should now be parent height minus padding
      const newHeight = element.getBoundingClientRect().height
      const parentHeight = parentElement.getBoundingClientRect().height
      const expectedHeight = parentHeight - 32 // 16px padding on each side

      api.assert.ok(
        Math.abs(newHeight - expectedHeight) < 5,
        `Height should expand to fill parent (~${expectedHeight}px), got ${newHeight}px`
      )
    }
  ),

  testWithSetup(
    'F key twice sets both dimensions to full',
    'Frame pad 16, h 300, w 400\n  Frame w 200, h 50, bg #333',
    async (api: TestAPI) => {
      // Click inner Frame
      await api.utils.waitForCompile()

      let element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      api.assert.ok(element !== null, 'Inner Frame should exist')

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

      // Re-query elements after compile
      element = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const parentElement = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(element !== null, 'Inner Frame should still exist')
      api.assert.ok(parentElement !== null, 'Parent Frame should still exist')

      // Verify visual change - both dimensions should fill parent
      const newWidth = element.getBoundingClientRect().width
      const newHeight = element.getBoundingClientRect().height
      const parentWidth = parentElement.getBoundingClientRect().width
      const parentHeight = parentElement.getBoundingClientRect().height
      const expectedWidth = parentWidth - 32
      const expectedHeight = parentHeight - 32

      api.assert.ok(
        Math.abs(newWidth - expectedWidth) < 5,
        `Width should fill parent (~${expectedWidth}px), got ${newWidth}px`
      )
      api.assert.ok(
        Math.abs(newHeight - expectedHeight) < 5,
        `Height should fill parent (~${expectedHeight}px), got ${newHeight}px`
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
      // Wait for compile and select element in preview
      await api.utils.waitForCompile()
      await api.interact.click('node-1')
      await api.utils.delay(100)

      // Press H key - should work because an element is selected
      await api.interact.pressKey('h')
      await api.utils.waitForCompile()

      // Verify hor was added
      api.assert.codeContains(/\bhor\b/)
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

      // Now focus the editor by simulating mousedown and focus events
      // This should set editorHasFocus = true
      const editorContainer = document.querySelector('#editor-container') as HTMLElement
      if (editorContainer) {
        editorContainer.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      }
      const cmContent = document.querySelector('.cm-content') as HTMLElement
      if (cmContent) {
        cmContent.focus()
        cmContent.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
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
      // Select using studio API (properly sets editorHasFocus = false)
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
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
  ...focusManagementTests,
  ...combinedShortcutTests,
]
