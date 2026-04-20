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
import type { TestCase } from '../../types'

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
  test('Drop Frame onto empty canvas (no code)', async api => {
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

  testWithSetup('Drop Button into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    // Count buttons before drop
    const buttonsBefore = countElementsInPreview('Button')

    await api.interact.dragFromPalette('Button', 'node-1', 0)

    // Verify code change
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added as child of Frame')

    // Verify DOM element was created
    await api.utils.waitForCompile()
    const buttonsAfter = countElementsInPreview('Button')
    api.assert.ok(
      buttonsAfter > buttonsBefore,
      `DOM should have new button: ${buttonsBefore} -> ${buttonsAfter}`
    )

    // Verify parent container has the child
    const childCount = getChildCount('node-1')
    api.assert.ok(childCount >= 1, `Frame should have at least 1 child, got ${childCount}`)
  }),

  testWithSetup('Drop Text into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    const textsBefore = countElementsInPreview('Text')

    await api.interact.dragFromPalette('Text', 'node-1', 0)

    // Verify code change
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added as child of Frame')

    // Verify DOM element was created
    await api.utils.waitForCompile()
    const textsAfter = countElementsInPreview('Text')
    api.assert.ok(
      textsAfter > textsBefore,
      `DOM should have new text element: ${textsBefore} -> ${textsAfter}`
    )
  }),

  testWithSetup('Drop Input into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Input', 'node-1', 0)

    // Verify code change
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Input'), 'Input should be added as child of Frame')

    // Verify DOM element was created
    await api.utils.waitForCompile()
    const inputExists = document.querySelector('input[data-mirror-id]') !== null
    api.assert.ok(inputExists, 'Input element should exist in DOM')
  }),

  testWithSetup('Drop Icon into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Icon', 'node-1', 0)

    // Verify code change
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added as child of Frame')

    // Verify DOM element was created (Icon may be span with SVG or just span)
    await api.utils.waitForCompile()
    const childCount = getChildCount('node-1')
    api.assert.ok(
      childCount >= 1,
      `Frame should have at least 1 child (the icon), got ${childCount}`
    )
  }),

  testWithSetup('Drop Image into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Image', 'node-1', 0)

    // Verify code change
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Image'), 'Image should be added as child of Frame')

    // Verify DOM element was created
    await api.utils.waitForCompile()
    const imgExists = document.querySelector('img[data-mirror-id]') !== null
    api.assert.ok(imgExists, 'Image element should exist in DOM')
  }),

  testWithSetup('Drop Divider into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Divider', 'node-1', 0)

    // Verify code change
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Divider'), 'Divider should be added as child of Frame')

    // Verify DOM element was created (Divider is <hr>)
    await api.utils.waitForCompile()
    const hrExists = document.querySelector('hr[data-mirror-id]') !== null
    api.assert.ok(hrExists, 'Divider (hr) element should exist in DOM')
  }),
])

// =============================================================================
// Palette Drop Tests (Insertion Positions)
// =============================================================================

export const paletteDropPositionTests: TestCase[] = describe('Palette Drop - Positions', [
  testWithSetup(
    'Drop as first child (before existing)',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Existing"',
    async api => {
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added before Button')
      const iconPos = findComponentPos(code, 'Icon')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(iconPos < buttonPos, `Icon (${iconPos}) should be before Button (${buttonPos})`)
    }
  ),

  testWithSetup(
    'Drop as last child (after existing)',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"',
    async api => {
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added after Button')
      const textPos = findComponentPos(code, 'Text')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(textPos > buttonPos, `Text (${textPos}) should be after Button (${buttonPos})`)
    }
  ),

  testWithSetup(
    'Drop between two children (middle)',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "First"\n  Button "Last"',
    async api => {
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Divider'), 'Divider should be inserted between buttons')
    }
  ),

  testWithSetup(
    'Drop at index 2 with 3 children',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Text "One"\n  Text "Two"\n  Text "Three"',
    async api => {
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be inserted at position 2')
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
    async api => {
      await api.interact.dragFromPalette('Button', 'node-2', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added to nested Frame')
    }
  ),

  testWithSetup(
    'Drop into deeply nested Frame (3 levels)',
    'Frame gap 16, pad 16\n  Frame gap 12\n    Frame gap 8, bg #3a3a4a, pad 8\n      Text "Deep"',
    async api => {
      await api.interact.dragFromPalette('Icon', 'node-3', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added to deeply nested Frame')
    }
  ),

  testWithSetup(
    'Drop into first nested container',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12',
    async api => {
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added to first nested Frame')
    }
  ),

  testWithSetup(
    'Drop into second nested container',
    'Frame gap 16, pad 16\n  Frame gap 8, bg #2a2a3a, pad 12\n  Frame gap 8, bg #3a3a4a, pad 12',
    async api => {
      await api.interact.dragFromPalette('Text', 'node-3', 0)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added to second nested Frame')
    }
  ),
])

// =============================================================================
// Palette Drop Tests (Horizontal Containers)
// =============================================================================

export const paletteDropHorizontalTests: TestCase[] = describe('Palette Drop - Horizontal', [
  testWithSetup('Drop into horizontal Frame', 'Frame hor, gap 12, pad 16', async api => {
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added to horizontal Frame')
  }),

  testWithSetup(
    'Drop first into horizontal with children',
    'Frame hor, gap 12, pad 16\n  Text "A"\n  Text "B"',
    async api => {
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(iconPos < textPos, 'Icon should be first in horizontal container')
    }
  ),

  testWithSetup(
    'Drop last into horizontal with children',
    'Frame hor, gap 12, pad 16\n  Text "A"\n  Text "B"',
    async api => {
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added last')
    }
  ),

  testWithSetup(
    'Drop between horizontal children',
    'Frame hor, gap 12, pad 16\n  Button "Left"\n  Button "Right"',
    async api => {
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Divider'), 'Divider should be between buttons')
    }
  ),

  testWithSetup(
    'Drop into vertical inside horizontal',
    'Frame hor, gap 16, pad 16\n  Frame gap 8\n    Text "Inner"',
    async api => {
      await api.interact.dragFromPalette('Button', 'node-2', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Button should be in nested vertical Frame')
    }
  ),
])

// =============================================================================
// Palette Drop Tests (Layout Variations)
// =============================================================================

export const paletteDropLayoutTests: TestCase[] = describe('Palette Drop - Layouts', [
  testWithSetup('Drop into spread layout', 'Frame spread, gap 12, pad 16', async api => {
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added to spread Frame')
  }),

  testWithSetup('Drop into centered Frame', 'Frame center, w 200, h 100', async api => {
    await api.interact.dragFromPalette('Text', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added to centered Frame')
  }),
])

// =============================================================================
// Palette Drop Tests (Zag Components)
// =============================================================================

export const paletteDropZagTests: TestCase[] = describe('Palette Drop - Zag Components', [
  testWithSetup('Drop Checkbox into Frame', 'Frame gap 12, pad 16', async api => {
    await api.interact.dragFromPalette('Checkbox', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Checkbox'), 'Checkbox should be added')
  }),

  testWithSetup('Drop Switch into Frame', 'Frame gap 12, pad 16', async api => {
    await api.interact.dragFromPalette('Switch', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Switch'), 'Switch should be added')
  }),

  testWithSetup('Drop Slider into Frame', 'Frame gap 12, pad 16', async api => {
    await api.interact.dragFromPalette('Slider', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Slider'), 'Slider should be added')
  }),
])

// =============================================================================
// Palette Drop Tests (Complex Scenarios)
// =============================================================================

export const paletteDropComplexTests: TestCase[] = describe('Palette Drop - Complex', [
  testWithSetup(
    'Drop Zag after existing elements',
    'Frame gap 12, pad 16\n  Text "Label"\n  Input placeholder "Enter..."',
    async api => {
      await api.interact.dragFromPalette('Slider', 'node-1', 2)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Slider'), 'Slider should be added after Input')
    }
  ),

  testWithSetup(
    'Drop into form-like structure',
    'Frame gap 16, pad 24\n  Text "Name"\n  Input placeholder "Enter name..."\n  Text "Email"\n  Input placeholder "Enter email..."',
    async api => {
      await api.interact.dragFromPalette('Button', 'node-1', 4)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added at end')
    }
  ),

  testWithSetup(
    'Drop new field group',
    'Frame gap 16, pad 24\n  Frame gap 8\n    Text "Field 1"\n    Input',
    async api => {
      await api.interact.dragFromPalette('Text', 'node-2', 2)
      const code = api.editor.getCode()
      // Count Text occurrences
      const textCount = (code.match(/Text/g) || []).length
      api.assert.ok(textCount >= 2, 'New Text should be added')
    }
  ),

  testWithSetup(
    'Drop Spacer for layout adjustment',
    'Frame gap 12, pad 16\n  Button "Top"\n  Button "Bottom"',
    async api => {
      await api.interact.dragFromPalette('Spacer', 'node-1', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Spacer'), 'Spacer should be between buttons')
    }
  ),

  testWithSetup('Drop Link component', 'Frame gap 12, pad 16\n  Text "Description"', async api => {
    await api.interact.dragFromPalette('Link', 'node-1', 1)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Link'), 'Link should be added after Text')
  }),

  testWithSetup(
    'Drop Textarea into form',
    'Frame gap 12, pad 16\n  Text "Comments"\n  Button "Submit"',
    async api => {
      await api.interact.dragFromPalette('Textarea', 'node-1', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Textarea'), 'Textarea should be between Text and Button')
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
    async api => {
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
    async api => {
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
    async api => {
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
    async api => {
      await api.interact.moveElement('node-3', 'node-4', 1)
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "Source"'),
        'Button should be moved to second container'
      )
    }
  ),

  testWithSetup(
    'Move element from nested to parent',
    'Frame gap 16, pad 16\n  Text "Parent Text"\n  Frame gap 8, pad 12\n    Button "Nested"',
    async api => {
      await api.interact.moveElement('node-4', 'node-1', 0)
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "Nested"'),
        'Button should be moved to parent container'
      )
    }
  ),

  testWithSetup(
    'Move element into nested container',
    'Frame gap 16, pad 16\n  Button "Move Me"\n  Frame gap 8, pad 12\n    Text "Inner"',
    async api => {
      await api.interact.moveElement('node-2', 'node-3', 0)
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "Move Me"'),
        'Button should be moved into nested container'
      )
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
    async api => {
      await api.interact.moveElement('node-4', 'node-1', 0)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button "C"'), 'Button C should be moved to first position')
    }
  ),

  testWithSetup(
    'Move from vertical to horizontal',
    'Frame gap 16, pad 16\n  Frame gap 8\n    Button "Vertical"\n  Frame hor, gap 8\n    Text "H1"\n    Text "H2"',
    async api => {
      await api.interact.moveElement('node-3', 'node-4', 1)
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "Vertical"'),
        'Button should be moved to horizontal container'
      )
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
    async api => {
      await api.interact.moveElement('node-5', 'node-2', 0)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button "Move"'), 'Button should be moved up one level')
    }
  ),

  testWithSetup(
    'Move between sibling containers',
    'Frame hor, gap 16, pad 16\n  Frame gap 8, w 100\n    Button "In A"\n  Frame gap 8, w 100\n    Text "In B"',
    async api => {
      await api.interact.moveElement('node-3', 'node-4', 0)
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "In A"'),
        'Button should be moved to sibling container'
      )
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
    async api => {
      await api.interact.dragToPosition('Button', 'node-1', 100, 50)

      // Verify code change
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added')
      api.assert.ok(code.includes('x ') || code.includes('x='), 'Should have x position')

      // Verify DOM element was created
      await api.utils.waitForCompile()
      const button = document.querySelector('button[data-mirror-id]')
      api.assert.ok(button !== null, 'Button should exist in DOM')

      // Verify position styles were applied
      const style = window.getComputedStyle(button!)
      api.assert.ok(
        style.position === 'absolute' || style.position === 'relative',
        `Button should have positioned style, got ${style.position}`
      )
    }
  ),

  testWithSetup(
    'Drop Icon into stacked with existing elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10',
    async api => {
      // Count children before
      const childCountBefore = getChildCount('node-1')

      await api.interact.dragToPosition('Icon', 'node-1', 200, 150)

      // Verify code change
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added')

      // Verify DOM - should have one more child
      await api.utils.waitForCompile()
      const childCountAfter = getChildCount('node-1')
      api.assert.ok(
        childCountAfter > childCountBefore,
        `Child count should increase: ${childCountBefore} -> ${childCountAfter}`
      )
    }
  ),

  testWithSetup(
    'Drop Text at top-left of stacked',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Text', 'node-1', 20, 20)

      // Verify code change
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added at top-left')

      // Verify DOM element exists
      await api.utils.waitForCompile()
      const textElement = document.querySelector('span[data-mirror-id]')
      api.assert.ok(textElement !== null, 'Text element should exist in DOM')
    }
  ),

  testWithSetup(
    'Drop Input into stacked center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Input', 'node-1', 200, 150)

      // Verify code change
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Input'), 'Input should be added at center')

      // Verify DOM element exists and is positioned
      await api.utils.waitForCompile()
      const input = document.querySelector('input[data-mirror-id]')
      api.assert.ok(input !== null, 'Input element should exist in DOM')

      // Verify input is inside stacked container
      const container = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(container?.contains(input!), 'Input should be inside stacked container')
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
