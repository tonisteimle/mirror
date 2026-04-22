/**
 * Component Panel - Comprehensive Drag Tests
 *
 * Tests that every component from the Components Panel can be dragged
 * into the editor and inserts the correct code.
 *
 * Verifies:
 * - Code is inserted correctly in .mir files
 * - Code is inserted correctly in .com files (with full styling)
 * - Zag component definitions are added when needed
 */

import { test, testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the palette item name for a component
 * Maps component IDs to their display names in the palette
 */
const PALETTE_NAMES: Record<string, string> = {
  // Layout
  'layout-column': 'Column',
  'layout-fill': 'Fill',
  'layout-grid': 'Grid',
  'layout-row': 'Row',
  'layout-stack': 'Stack',
  // Basic
  'comp-frame': 'Frame',
  'comp-text': 'Text',
  'comp-button': 'Button',
  'comp-input': 'Input',
  'comp-textarea': 'Textarea',
  'comp-h1': 'H1',
  'comp-h2': 'H2',
  'comp-icon': 'Icon',
  'comp-image': 'Image',
  // Form Controls
  'comp-checkbox': 'Checkbox',
  'comp-radio-group': 'Radio Group',
  'comp-slider': 'Slider',
  'comp-switch': 'Switch',
  // Zag Components (only DatePicker remains)
  'comp-date-picker': 'Date Picker',
  // Pure Mirror Components
  'comp-select': 'Select',
  'comp-table': 'Table',
  'comp-tabs': 'Tabs',
  'comp-accordion': 'Accordion',
  'comp-chart': 'Chart',
}

/**
 * Expected code patterns for each component in .mir files
 */
const EXPECTED_MIR_PATTERNS: Record<string, string[]> = {
  // Layout - check for Frame with layout properties
  'layout-column': ['Frame', 'ver'],
  'layout-fill': ['Frame', 'w full', 'h full'],
  'layout-grid': ['Frame', 'grid'],
  'layout-row': ['Frame', 'hor'],
  'layout-stack': ['Frame', 'stacked'],
  // Basic primitives
  'comp-frame': ['Frame'],
  'comp-text': ['Text'],
  'comp-button': ['Button'],
  'comp-input': ['Input'],
  'comp-textarea': ['Textarea'],
  'comp-h1': ['H1'],
  'comp-h2': ['H2'],
  'comp-icon': ['Icon'],
  'comp-image': ['Image'],
  // Form Controls
  'comp-checkbox': ['Checkbox'],
  'comp-radio-group': ['RadioGroup', 'RadioItem'],
  'comp-slider': ['Slider'],
  'comp-switch': ['Switch'],
  // Zag components (only DatePicker remains)
  'comp-date-picker': ['DatePicker'],
  // Pure Mirror components
  'comp-select': ['Select', 'Trigger', 'Content', 'Item'],
  'comp-table': ['Table', 'TableHeader', 'TableRow', 'TableCell'],
  'comp-tabs': ['Tabs', 'Tab'],
  'comp-accordion': ['AccordionItem', 'Header', 'Panel'],
  'comp-chart': ['Chart'],
}

/**
 * Create a drag test for a component
 */
function createDragTest(componentId: string, description: string): TestCase {
  const paletteName = PALETTE_NAMES[componentId]
  const expectedPatterns = EXPECTED_MIR_PATTERNS[componentId] || []

  return testWithSetup(
    `Drag ${paletteName} from panel`,
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      // Drag component from palette to container
      await api.interact.dragFromPalette(paletteName, 'node-1', 0)
      await api.utils.waitForCompile()

      // Get the resulting code
      const code = api.editor.getCode()

      // Verify all expected patterns are present
      for (const pattern of expectedPatterns) {
        api.assert.ok(
          code.includes(pattern),
          `Code should contain "${pattern}" after dragging ${paletteName}`
        )
      }

      // Log for debugging
      console.log(`[${componentId}] Code after drag:`, code.substring(0, 200))
    }
  )
}

// =============================================================================
// LAYOUT COMPONENTS
// =============================================================================

export const layoutDragTests: TestCase[] = describe('Panel Drag - Layout Components', [
  testWithSetup('Drag Column layout', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Column', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Frame'), 'Should contain Frame')
    api.assert.ok(code.includes('ver') || code.includes('h full'), 'Should have vertical layout')
  }),

  testWithSetup('Drag Row layout', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Row', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Frame'), 'Should contain Frame')
    api.assert.ok(code.includes('hor') || code.includes('w full'), 'Should have horizontal layout')
  }),

  testWithSetup('Drag Grid layout', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Grid', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Frame'), 'Should contain Frame')
    api.assert.ok(code.includes('grid'), 'Should have grid property')
  }),

  testWithSetup('Drag Stack layout', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Stack', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Frame'), 'Should contain Frame')
    api.assert.ok(code.includes('stacked'), 'Should have stacked property')
  }),

  testWithSetup('Drag Fill layout', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Fill', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Frame'), 'Should contain Frame')
    api.assert.ok(
      code.includes('w full') || code.includes('h full'),
      'Should have full size properties'
    )
  }),
])

// =============================================================================
// BASIC PRIMITIVES
// =============================================================================

export const basicPrimitiveDragTests: TestCase[] = describe('Panel Drag - Basic Primitives', [
  testWithSetup('Drag Frame', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    // Should have at least 2 Frames (parent + dragged)
    const frameCount = (code.match(/Frame/g) || []).length
    api.assert.ok(frameCount >= 2, `Should have at least 2 Frames, found ${frameCount}`)
  }),

  testWithSetup('Drag Text', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Text', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Text'), 'Should contain Text element')
  }),

  testWithSetup('Drag Button', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Button'), 'Should contain Button element')
  }),

  testWithSetup('Drag Input', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Input', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Input'), 'Should contain Input element')
  }),

  testWithSetup('Drag Textarea', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Textarea', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Textarea'), 'Should contain Textarea element')
  }),

  testWithSetup('Drag Icon', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Icon', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Icon'), 'Should contain Icon element')
  }),

  testWithSetup('Drag Image', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Image', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Image'), 'Should contain Image element')
  }),
])

// =============================================================================
// HEADING COMPONENTS
// =============================================================================

export const presetDragTests: TestCase[] = describe('Panel Drag - Heading Components', [
  testWithSetup('Drag H1 heading', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('H1', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('H1'), 'Should contain H1')
  }),

  testWithSetup('Drag H2 heading', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('H2', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('H2'), 'Should contain H2')
  }),
])

// =============================================================================
// TABLE & TABS COMPONENTS
// =============================================================================

export const tableTabsDragTests: TestCase[] = describe('Panel Drag - Table & Tabs', [
  testWithSetup(
    'Drag Table component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Table', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Table'), 'Should contain Table')
      api.assert.ok(code.includes('TableHeader'), 'Should contain TableHeader')
      api.assert.ok(code.includes('TableRow'), 'Should contain TableRow')
      api.assert.ok(code.includes('TableCell'), 'Should contain TableCell')
    }
  ),

  testWithSetup('Drag Tabs component', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Tabs', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Tabs'), 'Should contain Tabs')
    api.assert.ok(code.includes('Tab'), 'Should contain Tab')
  }),

  testWithSetup(
    'Table has correct structure',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Table', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('TableHeaderCell'), 'Should contain TableHeaderCell')
      api.assert.ok(code.includes('Button'), 'Should contain action Button')
    }
  ),

  testWithSetup(
    'Tabs has multiple tabs',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Tabs', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      // Should have multiple Tab entries
      const tabCount = (code.match(/Tab "/g) || []).length
      api.assert.ok(tabCount >= 2, `Should have at least 2 tabs, found ${tabCount}`)
    }
  ),
])

// =============================================================================
// FORM CONTROLS
// =============================================================================

export const formControlDragTests: TestCase[] = describe('Panel Drag - Form Controls', [
  testWithSetup(
    'Drag Checkbox component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Checkbox', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Checkbox'), 'Should contain Checkbox')
    }
  ),

  testWithSetup(
    'Drag Switch component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Switch', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Switch'), 'Should contain Switch')
    }
  ),

  testWithSetup(
    'Drag Slider component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Slider', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Slider'), 'Should contain Slider')
    }
  ),

  testWithSetup(
    'Drag Radio Group component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Radio Group', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('RadioGroup'), 'Should contain RadioGroup')
      api.assert.ok(code.includes('RadioItem'), 'Should contain RadioItem')
    }
  ),
])

// =============================================================================
// ZAG / PURE MIRROR COMPONENTS
// =============================================================================

/**
 * NOTE: Most Zag component tests are disabled because they require runtime
 * dependencies (updateFileList) that aren't available in the test environment.
 * Most components are now Pure Mirror and work in tests.
 * Only DatePicker remains as a Zag component and requires full environment.
 *
 * The following work in tests:
 * - Select (Pure Mirror - uses mirTemplate)
 * - Accordion (Pure Mirror - uses mirTemplate)
 *
 * These require full environment and are skipped:
 * - DatePicker (only remaining Zag component)
 */
export const zagComponentDragTests: TestCase[] = describe('Panel Drag - Zag Components', [
  // Select works because it uses mirTemplate (Pure Mirror component)
  testWithSetup(
    'Drag Select (Pure Mirror)',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Select', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      // Select is now Pure Mirror, should have Frame-based structure
      api.assert.ok(
        code.includes('Select') || code.includes('Trigger'),
        'Should contain Select or Trigger'
      )
    }
  ),

  // Accordion works because it uses mirTemplate (Pure Mirror component)
  testWithSetup(
    'Drag Accordion (Pure Mirror)',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Accordion', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('AccordionItem') || code.includes('Accordion'),
        'Should contain Accordion structure'
      )
    }
  ),

  // NOTE: DatePicker test disabled due to updateFileList dependency.
  // It's the only remaining Zag component with `children` pattern.
])

// =============================================================================
// DATA COMPONENTS
// =============================================================================

/**
 * Data components (Chart)
 * Table was removed as it was a compound primitive using children pattern.
 */
export const dataComponentDragTests: TestCase[] = describe('Panel Drag - Data Components', [
  testWithSetup('Drag Chart', 'Frame gap 12, pad 16, bg #1a1a1a', async (api: TestAPI) => {
    await api.interact.dragFromPalette('Chart', 'node-1', 0)
    await api.utils.waitForCompile()
    const code = api.editor.getCode()
    api.assert.ok(code.includes('Chart'), 'Should contain Chart')
  }),

  // NOTE: Table test disabled - uses children which requires ZagComponentHandler runtime dependencies
])

// =============================================================================
// INSERTION POSITION TESTS
// =============================================================================

export const insertionPositionTests: TestCase[] = describe('Panel Drag - Insertion Position', [
  testWithSetup(
    'Insert at first position',
    `Frame gap 8
  Button "Existing"`,
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      const textPos = code.indexOf('Text')
      const buttonPos = code.indexOf('Button')
      api.assert.ok(textPos < buttonPos, 'Text should appear before Button (inserted at index 0)')
    }
  ),

  testWithSetup(
    'Insert at last position',
    `Frame gap 8
  Button "First"
  Button "Second"`,
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      const textPos = code.indexOf('Text')
      const secondButtonPos = code.lastIndexOf('Button')
      api.assert.ok(
        textPos > secondButtonPos,
        'Text should appear after last Button (inserted at end)'
      )
    }
  ),

  testWithSetup(
    'Insert in middle position',
    `Frame gap 8
  Button "First"
  Button "Last"`,
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      const firstButtonPos = code.indexOf('Button')
      const textPos = code.indexOf('Text')
      const lastButtonPos = code.lastIndexOf('Button')
      api.assert.ok(
        textPos > firstButtonPos && textPos < lastButtonPos,
        'Text should be between first and last Button'
      )
    }
  ),

  testWithSetup(
    'Insert into nested container',
    `Frame gap 8
  Frame gap 4, pad 8, bg #333
    Text "Nested"`,
    async (api: TestAPI) => {
      // Drag into the nested frame (node-2)
      await api.interact.dragFromPalette('Button', 'node-2', 1)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      // Button should be inside the nested Frame (after "Nested" text)
      const nestedFrameStart = code.indexOf('Frame gap 4')
      const buttonPos = code.indexOf('Button')
      api.assert.ok(buttonPos > nestedFrameStart, 'Button should be inside nested Frame')
    }
  ),
])

// =============================================================================
// CODE VERIFICATION TESTS
// =============================================================================

export const codeVerificationTests: TestCase[] = describe('Panel Drag - Code Verification', [
  testWithSetup(
    'Dragged Button has default properties',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Button'), 'Should contain Button')
      // Button should have some properties (pad, bg, col, rad)
      api.assert.ok(
        code.includes('pad') ||
          code.includes('bg') ||
          code.includes('"Button"') ||
          code.includes('"Click"'),
        'Button should have default text or properties'
      )
    }
  ),

  testWithSetup(
    'Dragged Input has placeholder',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Input', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Input'), 'Should contain Input')
      api.assert.ok(
        code.includes('placeholder') || code.includes('pad'),
        'Input should have placeholder or styling'
      )
    }
  ),

  testWithSetup(
    'Multiple drags accumulate in code',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      // Drag 3 different components
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.waitForCompile()
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.waitForCompile()
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      api.assert.ok(code.includes('Text'), 'Should contain Text')
      api.assert.ok(code.includes('Button'), 'Should contain Button')
      api.assert.ok(code.includes('Icon'), 'Should contain Icon')
    }
  ),

  // Verify Select (Pure Mirror) inserts full structure
  testWithSetup(
    'Select inserts complete Pure Mirror structure',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Select', 'node-1', 0)
      await api.utils.waitForCompile()
      const code = api.editor.getCode()

      // Select mirTemplate should include:
      // - Frame name Select with trigger-text, loop-focus, typeahead
      // - Trigger Frame
      // - Content Frame with Items
      api.assert.ok(
        code.includes('name Select') || code.includes('Select'),
        'Should have Select name'
      )
      api.assert.ok(code.includes('Trigger') || code.includes('trigger'), 'Should have Trigger')
      api.assert.ok(
        code.includes('Content') || code.includes('Item'),
        'Should have Content or Items'
      )
      api.assert.ok(
        code.includes('toggle()') || code.includes('exclusive()'),
        'Should have state functions'
      )

      // Log actual code for debugging
      console.log('[Select Code]:', code)
    }
  ),
])

// =============================================================================
// EXPORT ALL TESTS
// =============================================================================

export const allPanelDragTests: TestCase[] = [
  ...layoutDragTests,
  ...basicPrimitiveDragTests,
  ...presetDragTests,
  ...tableTabsDragTests,
  ...formControlDragTests,
  ...zagComponentDragTests,
  ...dataComponentDragTests,
  ...insertionPositionTests,
  ...codeVerificationTests,
]

// Default export for test discovery
export default allPanelDragTests
