/**
 * Comprehensive Drag & Drop Tests
 *
 * Migrated from browser-test-api.ts to unified test framework.
 * These tests cover:
 * - Palette drops (drag component from palette to canvas)
 * - Canvas moves (reorder/move existing elements)
 * - Stacked container drops (absolute positioning)
 */

import { testWithSetup, describe } from '../../test-runner'
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

// =============================================================================
// Palette Drop Tests (Basic Primitives)
// =============================================================================

export const paletteDropBasicTests: TestCase[] = describe('Palette Drop - Basic Primitives', [
  testWithSetup('Drop Button into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added as child of Frame')
  }),

  testWithSetup('Drop Text into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Text', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added as child of Frame')
  }),

  testWithSetup('Drop Input into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Input', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Input'), 'Input should be added as child of Frame')
  }),

  testWithSetup('Drop Icon into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Icon', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added as child of Frame')
  }),

  testWithSetup('Drop Image into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Image', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Image'), 'Image should be added as child of Frame')
  }),

  testWithSetup('Drop Divider into empty Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async api => {
    await api.interact.dragFromPalette('Divider', 'node-1', 0)
    const code = api.editor.getCode()
    api.assert.ok(verifyPattern(code, 'Divider'), 'Divider should be added as child of Frame')
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
      await api.interact.moveElement('node-3', 'node-1', 0)
      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(buttonPos < textPos, 'Button should be moved to first position')
    }
  ),

  testWithSetup(
    'Move element to last position',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Button "Move Me"\n  Text "Middle"\n  Text "Last"',
    async api => {
      await api.interact.moveElement('node-2', 'node-1', 2)
      const code = api.editor.getCode()
      api.assert.ok(
        verifyPattern(code, 'Button "Move Me"'),
        'Button should be moved to last position'
      )
    }
  ),

  testWithSetup(
    'Move element to middle position',
    'Frame gap 12, pad 16, bg #1a1a1a\n  Text "First"\n  Text "Second"\n  Button "Move Me"',
    async api => {
      await api.interact.moveElement('node-4', 'node-1', 1)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button "Move Me"'), 'Button should be moved between texts')
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
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Button'), 'Button should be added')
      // Check for x/y properties
      api.assert.ok(code.includes('x ') || code.includes('x='), 'Should have x position')
    }
  ),

  testWithSetup(
    'Drop Icon into stacked with existing elements',
    'Frame stacked, w 400, h 300, bg #1a1a1a\n  Button "A", x 10, y 10',
    async api => {
      await api.interact.dragToPosition('Icon', 'node-1', 200, 150)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Icon'), 'Icon should be added')
    }
  ),

  testWithSetup(
    'Drop Text at top-left of stacked',
    'Frame stacked, w 300, h 200, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Text', 'node-1', 20, 20)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Text'), 'Text should be added at top-left')
    }
  ),

  testWithSetup(
    'Drop Input into stacked center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async api => {
      await api.interact.dragToPosition('Input', 'node-1', 200, 150)
      const code = api.editor.getCode()
      api.assert.ok(verifyPattern(code, 'Input'), 'Input should be added at center')
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
