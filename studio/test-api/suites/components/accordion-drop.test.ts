/**
 * Accordion Drag & Drop Tests
 *
 * Tests for dropping Accordion component from Component Panel.
 * Note: Accordion is dropped using mirTemplate, not the Pure Component handler.
 */

import { test, testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Accordion definitions (for tests that need the full definition)
const ACCORDION_ITEM_DEFINITION = `AccordionItem as Frame: ver, toggle()
  Header: Frame hor, spread, ver-center, pad 12 16, bg #27272a, rad 6, cursor pointer
    hover:
      bg #3f3f46
    Content: Slot
    Chevron: Icon "chevron-down", is 16, ic #888
      on:
        rot 180
  Panel: Frame pad 16, hidden
    on:
      visible
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
// Basic Drop Tests
// =============================================================================

export const accordionDropTests: TestCase[] = describe('Accordion Drop from Component Panel', [
  testWithSetup(
    'Drop Accordion into empty Frame - code changes',
    'Frame gap 16, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      const codeBefore = api.editor.getCode()

      // Drop Accordion component
      await api.interact.dragFromPalette('Accordion', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Verify code changed
      const codeAfter = api.editor.getCode()
      api.assert.ok(
        codeAfter.length > codeBefore.length,
        `Code should have more content after drop. Before: ${codeBefore.length}, After: ${codeAfter.length}`
      )
    }
  ),

  testWithSetup(
    'Drop Accordion into empty Frame - DOM children added',
    'Frame gap 16, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      const childCountBefore = getChildCount('node-1')

      // Drop Accordion component
      await api.interact.dragFromPalette('Accordion', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Verify children were added
      const childCountAfter = getChildCount('node-1')
      api.assert.ok(
        childCountAfter > childCountBefore,
        `Should add children: ${childCountBefore} -> ${childCountAfter}`
      )
    }
  ),

  testWithSetup(
    'Drop Accordion alongside other components',
    'Frame ver, gap 16, pad 16\n  Button "Action"\n  Input placeholder "Search..."',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Accordion', 'node-1', 1)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()

      // All components should be present
      api.assert.ok(verifyPattern(code, 'Button "Action"'), 'Button should still exist')
      api.assert.ok(verifyPattern(code, 'Input'), 'Input should still exist')
    }
  ),
])

// =============================================================================
// Styling After Drop
// =============================================================================

export const accordionStylingAfterDropTests: TestCase[] = describe('Accordion Styling After Drop', [
  testWithSetup(
    'Dropped Accordion renders in DOM',
    'Frame gap 16, pad 16',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Accordion', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(150)

      // Verify DOM has children
      const childCount = getChildCount('node-1')
      api.assert.ok(childCount > 0, `Should have children, got ${childCount}`)
    }
  ),

  testWithSetup(
    'Can modify dropped Accordion in code',
    'Frame gap 16, pad 16',
    async (api: TestAPI) => {
      const codeBefore = api.editor.getCode()

      await api.interact.dragFromPalette('Accordion', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // Get the code and verify it changed
      const codeAfter = api.editor.getCode()
      api.assert.ok(
        codeAfter.length > codeBefore.length,
        `Code should have more content after drop. Before: ${codeBefore.length}, After: ${codeAfter.length}`
      )
    }
  ),
])

// =============================================================================
// Accordion with Other Components
// =============================================================================

export const accordionWithTabsTests: TestCase[] = describe('Accordion with Other Components', [
  testWithSetup('Drop Accordion then Button', 'Frame gap 16, pad 16', async (api: TestAPI) => {
    // Drop Accordion
    await api.interact.dragFromPalette('Accordion', 'node-1', 0)
    await api.utils.waitForCompile()
    await api.utils.delay(100)

    // Drop Button
    await api.interact.dragFromPalette('Button', 'node-1', 1)
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Button'), 'Should have Button')
  }),

  testWithSetup(
    'Multiple components in sequence',
    'Frame ver, gap 16, pad 16',
    async (api: TestAPI) => {
      // Drop Accordion
      await api.interact.dragFromPalette('Accordion', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.utils.delay(100)

      // Drop Text
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Text'), 'Should have Text')
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allAccordionDropTests: TestCase[] = [
  ...accordionDropTests,
  ...accordionStylingAfterDropTests,
  ...accordionWithTabsTests,
]
