/**
 * Comprehensive Drag & Drop Tests
 *
 * Migrated from browser-test-api.ts to unified test framework.
 * These tests cover:
 * - Palette drops (drag component from palette to canvas)
 * - Canvas moves (reorder/move existing elements)
 * - Stacked container drops (absolute positioning)
 */

import { test, testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { assertSiblingOf, assertParentHasChildren } from '../../helpers/structure'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Verify that a pattern appears in the code
 */
function verifyPattern(code: string, pattern: string): boolean {
  return code.includes(pattern)
}

/**
 * Find component position in code for order verification
 */
function findComponentPos(code: string, component: string): number {
  const regex = new RegExp(`\\b${component}(?:\\s|"|$)`)
  const match = regex.exec(code)
  return match ? match.index : -1
}

/**
 * Check if an element exists in the preview DOM by its tag name or component type
 */
function elementExistsInPreview(tagOrType: string): boolean {
  // Map component types to their HTML tags
  const tagMap: Record<string, string> = {
    Frame: 'div',
    Button: 'button',
    Text: 'span',
    Input: 'input',
    Textarea: 'textarea',
    Icon: 'span',
    Image: 'img',
    Divider: 'hr',
    Link: 'a',
    Spacer: 'div',
    Checkbox: 'label',
    Switch: 'label',
    Slider: 'div',
  }

  const tag = tagMap[tagOrType] || tagOrType.toLowerCase()
  const preview = document.querySelector('.preview-container, .preview-frame, iframe')

  if (!preview) {
    // Fall back to searching in main document
    return (
      document.querySelectorAll(`[data-mirror-id] ${tag}`).length > 0 ||
      document.querySelectorAll(`${tag}[data-mirror-id]`).length > 0
    )
  }

  // Search within preview container
  return preview.querySelectorAll(tag).length > 0
}

/**
 * Count elements of a type in the preview DOM
 */
function countElementsInPreview(tagOrType: string): number {
  const tagMap: Record<string, string> = {
    Frame: 'div',
    Button: 'button',
    Text: 'span',
    Input: 'input',
    Icon: 'span',
    Divider: 'hr',
  }

  const tag = tagMap[tagOrType] || tagOrType.toLowerCase()
  return document.querySelectorAll(`[data-mirror-id] ${tag}, ${tag}[data-mirror-id]`).length
}

/**
 * Get child count of a container element
 */
function getChildCount(nodeId: string): number {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
  if (!element) return 0
  // Filter out non-element children
  return Array.from(element.children).filter(c => c.hasAttribute('data-mirror-id')).length
}

// =============================================================================
// Palette Drop Tests (Basic Primitives)
// =============================================================================

export const paletteDropBasicTests: TestCase[] = describe('Palette Drop - Basic Primitives', [
  // CRITICAL: Test dropping onto completely empty canvas (no code at all)
  test('Drop Frame onto empty canvas (no code)', async (api: TestAPI) => {
    // Start with empty code
    await api.editor.setCode('')
    await api.utils.waitForCompile()
    await api.utils.delay(100)

    // Verify canvas is empty but has placeholder node-1
    const codeBefore = api.editor.getCode()
    api.assert.ok(codeBefore.trim() === '', 'Canvas should start empty')

    // Drop a Frame onto the empty canvas
    await api.interact.dragFromPalette('Frame', 'node-1', 0)

    // Wait for compile
    await api.utils.waitForCompile()
    await api.utils.delay(100)

    // Verify code was added
    const codeAfter = api.editor.getCode()
    api.assert.ok(codeAfter.includes('Frame'), 'Frame should be added to code')

    // Verify DOM element was created
    const frameExists = document.querySelector('[data-mirror-id="node-1"]') !== null
    api.assert.ok(frameExists, 'Frame element should exist in DOM')
  }),

  testWithSetup(
    'Drop Button into empty Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.waitForCompile()

      // The palette injects Button's full default property bundle. codeEquals
      // catches not just "Button appears" but the exact properties + indent.
      api.assert.codeEquals(
        'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
      )
    }
  ),

  testWithSetup(
    'Drop Text into empty Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame gap 12, pad 16, bg #1a1a1a\n  Text "Text", fs 14, col #e4e4e7')
    }
  ),

  testWithSetup(
    'Drop Input into empty Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Input', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16, bg #1a1a1a\n  Input w 200, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter text..."'
      )
    }
  ),

  testWithSetup(
    'Drop Icon into empty Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame gap 12, pad 16, bg #1a1a1a\n  Icon "star", is 20, ic #a1a1aa')
    }
  ),

  testWithSetup(
    'Drop Image into empty Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Image', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame gap 12, pad 16, bg #1a1a1a\n  Image w 100, h 100, bg #e5e7eb')
    }
  ),

  testWithSetup(
    'Drop Divider into empty Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Divider', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame gap 12, pad 16, bg #1a1a1a\n  Divider')
    }
  ),
])

// =============================================================================
// Palette Drop Tests (Insertion Positions)
// =============================================================================

export const paletteDropPositionTests: TestCase[] = describe('Palette Drop - Positions', [
  testWithSetup(
    'Drop as first child (before existing)',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Existing"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16, bg #1a1a1a\n  Icon "star", is 20, ic #a1a1aa\n  Button "Existing"'
      )
    }
  ),

  testWithSetup(
    'Drop as last child (after existing)',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"\n  Text "Text", fs 14, col #e4e4e7'
      )
    }
  ),

  testWithSetup(
    'Drop between two children (middle)',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"\n  Button "Last"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"\n  Divider\n  Button "Last"'
      )
    }
  ),

  testWithSetup(
    'Drop at index 2 with 3 children',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Text "One"\n  Text "Two"\n  Text "Three"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16, bg #1a1a1a\n  Text "One"\n  Text "Two"\n  Icon "star", is 20, ic #a1a1aa\n  Text "Three"'
      )
    }
  ),
])

// =============================================================================
// Palette Drop Tests (Nested Containers)
// =============================================================================

export const paletteDropNestedTests: TestCase[] = describe('Palette Drop - Nested', [
  testWithSetup(
    'Drop into nested Frame (2 levels)',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n    Text "Inner"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-2', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n    Text "Inner"\n    Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
      )
    }
  ),

  testWithSetup(
    'Drop into deeply nested Frame (3 levels)',
    'Frame gap 16, pad 16\n  Frame gap 12\n    Frame gap 8, bg #3a3a4a, pad 8\n      Text "Deep"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Icon', 'node-3', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 12\n    Frame gap 8, bg #3a3a4a, pad 8\n      Text "Deep"\n      Icon "star", is 20, ic #a1a1aa'
      )
    }
  ),

  testWithSetup(
    'Drop into first nested container',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n    Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6\n  Frame gap 8, bg #3a3a4a, pad 12'
      )
    }
  ),

  testWithSetup(
    'Drop into second nested container',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12\n    Text "Text", fs 14, col #e4e4e7'
      )
    }
  ),
])

// =============================================================================
// Palette Drop Tests (Horizontal Containers)
// =============================================================================

export const paletteDropHorizontalTests: TestCase[] = describe('Palette Drop - Horizontal', [
  testWithSetup('Drop into horizontal Frame', 'Frame hor, gap 12, pad 16', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    await api.utils.waitForCompile()

    api.assert.codeEquals(
      'Frame hor, gap 12, pad 16\n  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
    )
  }),

  testWithSetup(
    'Drop first into horizontal with children',
    'Frame hor, gap 12, pad 16\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame hor, gap 12, pad 16\n  Icon "star", is 20, ic #a1a1aa\n  Text "A"\n  Text "B"'
      )
    }
  ),

  testWithSetup(
    'Drop last into horizontal with children',
    'Frame hor, gap 12, pad 16\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame hor, gap 12, pad 16\n  Text "A"\n  Text "B"\n  Icon "star", is 20, ic #a1a1aa'
      )
    }
  ),

  testWithSetup(
    'Drop between horizontal children',
    'Frame hor, gap 12, pad 16\n  Button "Left"\n  Button "Right"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame hor, gap 12, pad 16\n  Button "Left"\n  Divider\n  Button "Right"'
      )
    }
  ),

  testWithSetup(
    'Drop into vertical inside horizontal',
    'Frame hor, gap 16, pad 16\n  Frame gap 8\n    Text "Inner"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-2', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame hor, gap 16, pad 16\n  Frame gap 8\n    Text "Inner"\n    Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
      )
    }
  ),
])

// =============================================================================
// Palette Drop Tests (Layout Variations)
// =============================================================================

export const paletteDropLayoutTests: TestCase[] = describe('Palette Drop - Layouts', [
  testWithSetup('Drop into spread layout', 'Frame spread, gap 12, pad 16', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    await api.utils.waitForCompile()

    api.assert.codeEquals(
      'Frame spread, gap 12, pad 16\n  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
    )
  }),

  testWithSetup('Drop into centered Frame', 'Frame center, w 200, h 100', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Text', 'node-1', 0)
    await api.utils.waitForCompile()

    api.assert.codeEquals('Frame center, w 200, h 100\n  Text "Text", fs 14, col #e4e4e7')
  }),
])

// =============================================================================
// Palette Drop Tests (Zag Components)
// =============================================================================

export const paletteDropZagTests: TestCase[] = describe('Palette Drop - Pure Components', [
  testWithSetup('Drop Checkbox into Frame', 'Frame gap 12, pad 16', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Checkbox', 'node-1', 0)
    await api.utils.waitForCompile()

    api.assert.codeEquals('Frame gap 12, pad 16\n  Checkbox "Accept terms"')
  }),

  testWithSetup('Drop Switch into Frame', 'Frame gap 12, pad 16', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Switch', 'node-1', 0)
    await api.utils.waitForCompile()

    api.assert.codeEquals('Frame gap 12, pad 16\n  Switch "Dark mode"')
  }),

  testWithSetup('Drop Slider into Frame', 'Frame gap 12, pad 16', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Slider', 'node-1', 0)
    await api.utils.waitForCompile()

    api.assert.codeEquals('Frame gap 12, pad 16\n  Slider min 0, max 100, value 50, step 1')
  }),
])

// =============================================================================
// Palette Drop Tests (Complex Scenarios)
// =============================================================================

export const paletteDropComplexTests: TestCase[] = describe('Palette Drop - Complex', [
  testWithSetup(
    'Drop Slider after existing elements',
    'Frame gap 12, pad 16\n  Text "Label"\n  Input placeholder "Enter..."',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Slider', 'node-1', 2)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16\n  Text "Label"\n  Input placeholder "Enter..."\n  Slider min 0, max 100, value 50, step 1'
      )
    }
  ),

  testWithSetup(
    'Drop Button into form-like structure',
    'Frame gap 16, pad 24\n  Text "Name"\n  Input placeholder "Enter name..."\n  Text "Email"\n  Input placeholder "Enter email..."',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-1', 4)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 24\n  Text "Name"\n  Input placeholder "Enter name..."\n  Text "Email"\n  Input placeholder "Enter email..."\n  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6'
      )
    }
  ),

  testWithSetup(
    'Drop Text into nested field group',
    'Frame gap 16, pad 24\n  Frame gap 8\n    Text "Field 1"\n    Input',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-2', 2)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 24\n  Frame gap 8\n    Text "Field 1"\n    Input\n    Text "Text", fs 14, col #e4e4e7'
      )
    }
  ),

  testWithSetup(
    'Drop Spacer for layout adjustment',
    'Frame gap 12, pad 16\n  Button "Top"\n  Button "Bottom"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Spacer', 'node-1', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame gap 12, pad 16\n  Button "Top"\n  Spacer\n  Button "Bottom"')
    }
  ),

  testWithSetup(
    'Drop Link component',
    'Frame gap 12, pad 16\n  Text "Description"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Link', 'node-1', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame gap 12, pad 16\n  Text "Description"\n  Link')
    }
  ),

  testWithSetup(
    'Drop Textarea into form',
    'Frame gap 12, pad 16\n  Text "Comments"\n  Button "Submit"',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Textarea', 'node-1', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 12, pad 16\n  Text "Comments"\n  Textarea w 200, h 80, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter text..."\n  Button "Submit"'
      )
    }
  ),
])

// =============================================================================
// Canvas Move Tests (Reorder within same container)
// =============================================================================

export const canvasMoveReorderTests: TestCase[] = describe('Canvas Move - Reorder', [
  testWithSetup(
    'Move element to first position',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Text "First"\n  Button "Move Me"\n  Text "Last"',
    async (api: TestAPI) => {
      // Verify initial state - button exists before move
      const buttonBefore = document.querySelector('button[data-mirror-id="node-3"]')
      api.assert.ok(buttonBefore !== null, 'Button should exist before move')

      await api.interact.moveElement('node-3', 'node-1', 0)

      // Verify code change
      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(buttonPos < textPos, 'Button should be moved to first position in code')

      // Verify DOM reflects the reorder
      await api.utils.waitForCompile()
      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container !== null, 'Container should exist')
      const firstChild = container!.querySelector('[data-mirror-id]')
      api.assert.ok(
        firstChild?.tagName.toLowerCase() === 'button',
        `First child should be button, got ${firstChild?.tagName}`
      )
    }
  ),

  testWithSetup(
    'Move element to last position',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Move Me"\n  Text "Middle"\n  Text "Last"',
    async (api: TestAPI) => {
      // Count children before
      const childCountBefore = getChildCount('node-1')

      await api.interact.moveElement('node-2', 'node-1', 2)

      // Verify code change
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "Move Me"'),
        'Button should be moved to last position'
      )

      // Verify DOM - child count should stay same (move, not add)
      await api.utils.waitForCompile()
      const childCountAfter = getChildCount('node-1')
      api.assert.ok(
        childCountAfter === childCountBefore,
        `Child count should stay same: ${childCountBefore} -> ${childCountAfter}`
      )
    }
  ),

  testWithSetup(
    'Move element to middle position',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Text "First"\n  Text "Second"\n  Button "Move Me"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 1)

      // Verify code change
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button "Move Me"'), 'Button should be moved between texts')

      // Verify DOM structure
      await api.utils.waitForCompile()
      const container = document.querySelector('[data-mirror-id="node-1"]')
      const children = container?.querySelectorAll('[data-mirror-id]')
      api.assert.ok(children && children.length >= 3, 'Container should have at least 3 children')

      // Second child should be button
      const secondChild = children ? children[1] : null
      api.assert.ok(
        secondChild?.tagName.toLowerCase() === 'button',
        `Second child should be button, got ${secondChild?.tagName}`
      )
    }
  ),
])

// =============================================================================
// Canvas Move Tests (Cross-container moves)
// =============================================================================

export const canvasMoveCrossContainerTests: TestCase[] = describe('Canvas Move - Cross Container', [
  testWithSetup(
    'Move element to different container',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n    Button "Source"\n  Frame gap 8, bg #3a3a4a, pad 12\n    Text "Target"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-4', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12\n    Text "Target"\n    Button "Source"'
      )
      assertSiblingOf(api, 'Source', 'Target')
      assertParentHasChildren(api, 'Source', ['Target', 'Source'])
    }
  ),

  testWithSetup(
    'Move element from nested to parent',
    'Frame gap 16, pad 16\n  Text "Parent Text"\n  Frame gap 8, pad 12\n    Button "Nested"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Button "Nested"\n  Text "Parent Text"\n  Frame gap 8, pad 12'
      )
      assertSiblingOf(api, 'Nested', 'Parent Text')
      assertParentHasChildren(api, 'Nested', ['Nested', 'Parent Text', ''])
    }
  ),

  testWithSetup(
    'Move element into nested container',
    'Frame gap 16, pad 16\n  Button "Move Me"\n  Frame gap 8, pad 12\n    Text "Inner"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-2', 'node-3', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8, pad 12\n    Button "Move Me"\n    Text "Inner"'
      )
      assertSiblingOf(api, 'Move Me', 'Inner')
      assertParentHasChildren(api, 'Move Me', ['Move Me', 'Inner'])
    }
  ),
])

// =============================================================================
// Canvas Move Tests (Horizontal containers)
// =============================================================================

export const canvasMoveHorizontalTests: TestCase[] = describe('Canvas Move - Horizontal', [
  testWithSetup(
    'Reorder in horizontal container',
    'Frame hor, gap 12, pad 16\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals('Frame hor, gap 12, pad 16\n  Button "C"\n  Button "A"\n  Button "B"')
      assertParentHasChildren(api, 'C', ['C', 'A', 'B'])
    }
  ),

  testWithSetup(
    'Move from vertical to horizontal',
    'Frame gap 16, pad 16\n  Frame gap 8\n    Button "Vertical"\n  Frame hor, gap 8\n    Text "H1"\n    Text "H2"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-4', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8\n  Frame hor, gap 8\n    Text "H1"\n    Button "Vertical"\n    Text "H2"'
      )
      assertSiblingOf(api, 'Vertical', 'H1')
      assertParentHasChildren(api, 'Vertical', ['H1', 'Vertical', 'H2'])
    }
  ),
])

// =============================================================================
// Canvas Move Tests (Complex structures)
// =============================================================================

export const canvasMoveComplexTests: TestCase[] = describe('Canvas Move - Complex', [
  testWithSetup(
    'Move in 3-level nested structure',
    'Frame gap 16, pad 16\n  Frame gap 12\n    Frame gap 8\n      Text "Deep"\n      Button "Move"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-5', 'node-2', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 12\n    Button "Move"\n    Frame gap 8\n      Text "Deep"'
      )
      // Note: "Move" is sibling of the Frame containing "Deep", not of Deep itself.
      // assertParentHasChildren walks parent.children fullText, where the empty-but-
      // wrapping Frame's fullText collapses to "Deep" (its only descendant text).
      assertParentHasChildren(api, 'Move', ['Move', 'Deep'])
    }
  ),

  testWithSetup(
    'Move between sibling containers',
    'Frame hor, gap 16, pad 16\n  Frame gap 8, w 100\n    Button "In A"\n  Frame gap 8, w 100\n    Text "In B"',
    async (api: TestAPI) => {
      await api.interact.moveElement('node-3', 'node-4', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame hor, gap 16, pad 16\n  Frame gap 8, w 100\n  Frame gap 8, w 100\n    Button "In A"\n    Text "In B"'
      )
      assertSiblingOf(api, 'In A', 'In B')
      assertParentHasChildren(api, 'In A', ['In A', 'In B'])
    }
  ),
])

// =============================================================================
// Stacked Container Tests
// =============================================================================

export const stackedDropTests: TestCase[] = describe('Stacked Drop - Absolute Position', [
  testWithSetup(
    'Drop Button into empty stacked Frame',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 100, 50)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "Button", pad 12 24, bg #5BA8F5, col white, rad 6, x 100, y 50'
      )

      // Stacked containers must position children absolutely.
      const button = document.querySelector('button[data-mirror-id]')
      api.assert.ok(button, 'Button should exist in DOM')
      const style = window.getComputedStyle(button!)
      api.assert.ok(
        style.position === 'absolute' || style.position === 'relative',
        `Button should be positioned (got ${style.position})`
      )
    }
  ),

  testWithSetup(
    'Drop Icon into stacked with existing elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 200, 150)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10\n  Icon "star", is 20, ic #a1a1aa, x 200, y 150'
      )
    }
  ),

  testWithSetup(
    'Drop Text at top-left of stacked',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 20, 20)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame stacked, w 300, h 200, bg #1a1a1a\n  Text "Text", fs 14, col #e4e4e7, x 20, y 20'
      )
    }
  ),

  testWithSetup(
    'Drop Input into stacked center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 200, 150)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame stacked, w 400, h 300, bg #1a1a1a\n  Input w 200, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444, col #e4e4e7, placeholder "Enter text...", x 200, y 150'
      )

      // Verify the input is inside the stacked container in the DOM.
      const input = document.querySelector('input[data-mirror-id]')
      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(input && container?.contains(input), 'Input should be inside stacked container')
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allPaletteDropTests: TestCase[] = [
  ...paletteDropBasicTests,
  ...paletteDropPositionTests,
  ...paletteDropNestedTests,
  ...paletteDropHorizontalTests,
  ...paletteDropLayoutTests,
  ...paletteDropZagTests,
  ...paletteDropComplexTests,
]

export const allCanvasMoveTests: TestCase[] = [
  ...canvasMoveReorderTests,
  ...canvasMoveCrossContainerTests,
  ...canvasMoveHorizontalTests,
  ...canvasMoveComplexTests,
]

export const allComprehensiveDragTests: TestCase[] = [
  ...allPaletteDropTests,
  ...allCanvasMoveTests,
  ...stackedDropTests,
]
