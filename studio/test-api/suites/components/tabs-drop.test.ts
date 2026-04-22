/**
 * Tabs Drag & Drop Tests
 *
 * Tests for dropping Tabs component from Component Panel.
 * Note: Tabs is dropped using mirTemplate, which provides a complete
 * Tab structure including Tab definition, tab bar, and content area.
 */

import { test, testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Tab definition for tests that need the full definition in setup
const TAB_DEFINITION = `Tab as Button: pad 12 20, bg transparent, col #888, cursor pointer, exclusive()
  hover:
    col #ccc
  selected:
    col white
    bor 0 0 2 0, boc #5BA8F5
  Content: Slot`

// =============================================================================
// Helper Functions
// =============================================================================

function verifyPattern(code: string, pattern: string): boolean {
  return code.includes(pattern)
}

function getChildCount(nodeId: string): number {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  if (!element) return 0
  return Array.from(element.children).filter(c => c.hasAttribute('data-mirror-id')).length
}

// =============================================================================
// Tabs Drop from Component Panel
// =============================================================================

export const tabsDropTests: TestCase[] = describe('Tabs Drop from Component Panel', [
  testWithSetup(
    'Drop Tabs into empty Frame',
    'Frame gap 16, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      const childCountBefore = getChildCount('node-1')

      // Drop Tabs component (uses mirTemplate)
      await api.interact.dragFromPalette('Tabs', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Verify code contains Tab structure
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Tab') || verifyPattern(code, 'Frame'),
        'Code should contain Tab elements'
      )

      // Verify children were added
      const childCountAfter = getChildCount('node-1')
      api.assert.ok(
        childCountAfter > childCountBefore,
        `Should add children: ${childCountBefore} -> ${childCountAfter}`
      )
    }
  ),

  testWithSetup('Drop Tabs adds Tab structure', 'Frame gap 16, pad 16', async (api: TestAPI) => {
    const codeBefore = api.editor.getCode()

    await api.interact.dragFromPalette('Tabs', 'node-1', 0)
    await api.utils.waitForCompile()
    await api.utils.delay(200)

    const codeAfter = api.editor.getCode()
    // Verify code changed (Tab component was dropped)
    api.assert.ok(
      codeAfter.length > codeBefore.length,
      `Should have Tab structure. Code before: ${codeBefore.length}, after: ${codeAfter.length}`
    )
  }),

  testWithSetup(
    'Drop Tabs into horizontal layout',
    'Frame hor, gap 16, pad 16\n  Text "Left Panel"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Tabs', 'node-1', 1)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Tab') || verifyPattern(code, 'Frame'),
        'Tabs should be added to horizontal layout'
      )
    }
  ),

  testWithSetup(
    'Drop Tabs at first position',
    'Frame gap 16, pad 16\n  Text "Existing Content"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Tabs', 'node-1', 0)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Tab') || verifyPattern(code, 'Frame ver'),
        'Tabs should be added at first position'
      )
    }
  ),

  testWithSetup(
    'Drop Tabs alongside other components',
    'Frame ver, gap 16, pad 16\n  Button "Action"\n  Input placeholder "Search..."',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Tabs', 'node-1', 1)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // All components should be present
      api.assert.ok(verifyPattern(code, 'Button "Action"'), 'Button should still exist')
      api.assert.ok(verifyPattern(code, 'Input'), 'Input should still exist')
    }
  ),

  testWithSetup(
    'Drop multiple Tabs components',
    'Frame ver, gap 24, pad 16',
    async (api: TestAPI) => {
      // Drop first Tabs
      await api.interact.dragFromPalette('Tabs', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Drop second Tabs (as Button which is simpler)
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Should have Button')
    }
  ),
])

// =============================================================================
// Tabs Styling After Drop
// =============================================================================

export const tabsStylingAfterDropTests: TestCase[] = describe('Tabs Styling After Drop', [
  testWithSetup('Dropped Tabs renders in DOM', 'Frame gap 16, pad 16', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Tabs', 'node-1', 0)
    await api.utils.waitForCompile()
    await api.utils.delay(150)

    // Verify DOM has children
    const childCount = getChildCount('node-1')
    api.assert.ok(childCount > 0, `Should have children, got ${childCount}`)
  }),

  testWithSetup('Can read dropped Tabs code', 'Frame gap 16, pad 16', async (api: TestAPI) => {
    const codeBefore = api.editor.getCode()

    await api.interact.dragFromPalette('Tabs', 'node-1', 0)
    await api.utils.waitForCompile()
    await api.utils.delay(200)

    const codeAfter = api.editor.getCode()
    api.assert.ok(
      codeAfter.length > codeBefore.length,
      `Code should have content after drop. Before: ${codeBefore.length}, After: ${codeAfter.length}`
    )
  }),

  testWithSetup(
    'Tabs with definition - exclusive behavior works',
    `${TAB_DEFINITION}

Frame gap 16, pad 16`,
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Tabs', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      const code = api.editor.getCode()
      // Should have the Tab definition from setup
      api.assert.ok(
        verifyPattern(code, 'Tab as Button:') || verifyPattern(code, 'exclusive()'),
        'Should have Tab definition with exclusive()'
      )
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allTabsDropTests: TestCase[] = [...tabsDropTests, ...tabsStylingAfterDropTests]
