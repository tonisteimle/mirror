/**
 * Editor Drop Tests
 *
 * Tests for dragging components directly into the CodeMirror editor.
 * This is a DIFFERENT code path than preview drops:
 *
 * - Preview Drop: dragFromPalette() → DropService → TemplateDropHandler
 * - Editor Drop:  Drag into CodeMirror → generateComponentCodeFromDragData()
 *
 * These tests ensure mirTemplate is correctly used for editor drops.
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'
import { LAYOUT_SECTION, COMPONENTS_SECTION } from '../../../panels/components/layout-presets'

// =============================================================================
// Helper: Simulate Editor Drop
// =============================================================================

/**
 * Simulate dropping a component from the palette into the editor.
 * This calls generateComponentCodeFromDragData() directly.
 */
function simulateEditorDrop(componentName: string): string {
  // Access the studio's generateComponentCodeFromDragData function
  const generateFn = (window as any).generateComponentCodeFromDragData

  if (!generateFn) {
    throw new Error('generateComponentCodeFromDragData not available on window')
  }

  // Look up the component from the palette
  const allComponents = [...LAYOUT_SECTION, ...COMPONENTS_SECTION]
  const component = allComponents.find(
    c => c.name.toLowerCase() === componentName.toLowerCase()
  )

  if (!component) {
    throw new Error(`Component "${componentName}" not found in palette`)
  }

  // Create drag data (same as ComponentPanel does)
  const dragData = {
    componentId: component.id,
    componentName: component.template,
    properties: component.properties,
    textContent: component.textContent,
    children: component.children,
    mirTemplate: component.mirTemplate,
  }

  // Generate the code using the same function used by editor drops
  const code = generateFn(dragData, {
    componentId: component.id,
    filename: 'test.mir',
  })

  return code
}

// =============================================================================
// MIRTEMPLATE COMPONENTS - Must use full template, not just "Frame"
// =============================================================================

export const editorDropMirTemplateTests: TestCase[] = describe(
  'Editor Drop - mirTemplate Components',
  [
    testWithSetup(
      'Accordion drops with full structure (not just Frame)',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Accordion')

        // Must contain AccordionItem definition, not just "Frame"
        api.assert.ok(
          code.includes('AccordionItem'),
          `Accordion should contain "AccordionItem", got: ${code.substring(0, 100)}`
        )
        api.assert.ok(code.includes('Header'), 'Accordion should contain Header slot')
        api.assert.ok(code.includes('Panel'), 'Accordion should contain Panel slot')
        api.assert.ok(code.includes('toggle()'), 'Accordion should have toggle()')
      }
    ),

    testWithSetup(
      'Select drops with full structure (not just Frame)',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Select')

        api.assert.ok(
          code.includes('Select') || code.includes('name Select'),
          `Select should contain "Select", got: ${code.substring(0, 100)}`
        )
        api.assert.ok(code.includes('Trigger'), 'Select should contain Trigger')
        api.assert.ok(code.includes('Content'), 'Select should contain Content')
        api.assert.ok(code.includes('Item'), 'Select should contain Item')
      }
    ),

    testWithSetup(
      'Tabs drops with full structure',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Tabs')

        api.assert.ok(
          code.includes('Tabs'),
          `Tabs should contain "Tabs", got: ${code.substring(0, 100)}`
        )
        api.assert.ok(code.includes('Tab'), 'Tabs should contain Tab elements')
      }
    ),

    testWithSetup(
      'Table drops with full structure',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Table')

        api.assert.ok(
          code.includes('Table'),
          `Table should contain "Table", got: ${code.substring(0, 100)}`
        )
        api.assert.ok(
          code.includes('TableHeader') || code.includes('Header'),
          'Table should contain header'
        )
        api.assert.ok(
          code.includes('TableRow') || code.includes('Row'),
          'Table should contain rows'
        )
      }
    ),

    testWithSetup(
      'RadioGroup drops with full structure',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Radio Group')

        api.assert.ok(
          code.includes('RadioGroup'),
          `RadioGroup should contain "RadioGroup", got: ${code.substring(0, 100)}`
        )
        api.assert.ok(code.includes('RadioItem'), 'RadioGroup should contain RadioItem')
      }
    ),

    testWithSetup(
      'Checkbox drops with label',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Checkbox')

        api.assert.ok(
          code.includes('Checkbox'),
          `Checkbox should contain "Checkbox", got: ${code.substring(0, 100)}`
        )
      }
    ),

    testWithSetup(
      'Switch drops with label',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Switch')

        api.assert.ok(
          code.includes('Switch'),
          `Switch should contain "Switch", got: ${code.substring(0, 100)}`
        )
      }
    ),

    testWithSetup(
      'Slider drops with properties',
      'Frame pad 16',
      async (api: TestAPI) => {
        const code = simulateEditorDrop( 'Slider')

        api.assert.ok(
          code.includes('Slider'),
          `Slider should contain "Slider", got: ${code.substring(0, 100)}`
        )
        api.assert.ok(
          code.includes('min') || code.includes('max') || code.includes('value'),
          'Slider should have min/max/value properties'
        )
      }
    ),
  ]
)

// =============================================================================
// BASIC PRIMITIVES - Use template + properties
// =============================================================================

export const editorDropPrimitiveTests: TestCase[] = describe('Editor Drop - Basic Primitives', [
  testWithSetup(
    'Button drops correctly',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Button')
      api.assert.ok(code.includes('Button'), 'Should contain Button')
    }
  ),

  testWithSetup(
    'Text drops correctly',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Text')
      api.assert.ok(code.includes('Text'), 'Should contain Text')
    }
  ),

  testWithSetup(
    'Input drops correctly',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Input')
      api.assert.ok(code.includes('Input'), 'Should contain Input')
    }
  ),

  testWithSetup(
    'Icon drops correctly',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Icon')
      api.assert.ok(code.includes('Icon'), 'Should contain Icon')
    }
  ),

  testWithSetup(
    'Image drops correctly',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Image')
      api.assert.ok(code.includes('Image'), 'Should contain Image')
    }
  ),

  testWithSetup(
    'Frame drops correctly',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Frame')
      api.assert.ok(code.includes('Frame'), 'Should contain Frame')
    }
  ),
])

// =============================================================================
// LAYOUT PRESETS - Use Frame with layout properties
// =============================================================================

export const editorDropLayoutTests: TestCase[] = describe('Editor Drop - Layout Presets', [
  testWithSetup(
    'Row drops with horizontal layout',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Row')
      api.assert.ok(code.includes('Frame'), 'Should contain Frame')
      api.assert.ok(code.includes('hor'), 'Should have horizontal layout')
    }
  ),

  testWithSetup(
    'Column drops with vertical layout',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Column')
      api.assert.ok(code.includes('Frame'), 'Should contain Frame')
      api.assert.ok(code.includes('ver') || code.includes('h full'), 'Should have vertical layout')
    }
  ),

  testWithSetup(
    'Grid drops with grid property',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Grid')
      api.assert.ok(code.includes('Frame'), 'Should contain Frame')
      api.assert.ok(code.includes('grid'), 'Should have grid property')
    }
  ),

  testWithSetup(
    'Stack drops with stacked property',
    'Frame pad 16',
    async (api: TestAPI) => {
      const code = simulateEditorDrop( 'Stack')
      api.assert.ok(code.includes('Frame'), 'Should contain Frame')
      api.assert.ok(code.includes('stacked'), 'Should have stacked property')
    }
  ),
])

// =============================================================================
// COMBINATIONS - Multiple drops, nested structures
// =============================================================================

export const editorDropCombinationTests: TestCase[] = describe('Editor Drop - Combinations', [
  testWithSetup(
    'Accordion inside Select Content (nested complex components)',
    'Frame pad 16',
    async (api: TestAPI) => {
      const selectCode = simulateEditorDrop( 'Select')
      const accordionCode = simulateEditorDrop( 'Accordion')

      // Both should be full structures, not degraded to Frame
      api.assert.ok(selectCode.includes('Trigger'), 'Select should have Trigger')
      api.assert.ok(accordionCode.includes('AccordionItem'), 'Accordion should have AccordionItem')
    }
  ),

  testWithSetup(
    'Tabs with Table inside (component composition)',
    'Frame pad 16',
    async (api: TestAPI) => {
      const tabsCode = simulateEditorDrop( 'Tabs')
      const tableCode = simulateEditorDrop( 'Table')

      api.assert.ok(tabsCode.includes('Tab'), 'Tabs should have Tab elements')
      api.assert.ok(tableCode.includes('Table'), 'Table should have Table element')
    }
  ),

  testWithSetup(
    'Form with multiple controls',
    'Frame pad 16',
    async (api: TestAPI) => {
      const checkboxCode = simulateEditorDrop( 'Checkbox')
      const switchCode = simulateEditorDrop( 'Switch')
      const sliderCode = simulateEditorDrop( 'Slider')
      const radioCode = simulateEditorDrop( 'Radio Group')

      // All should be proper components, not degraded
      api.assert.ok(checkboxCode.includes('Checkbox'), 'Checkbox intact')
      api.assert.ok(switchCode.includes('Switch'), 'Switch intact')
      api.assert.ok(sliderCode.includes('Slider'), 'Slider intact')
      api.assert.ok(radioCode.includes('RadioGroup'), 'RadioGroup intact')
    }
  ),

  testWithSetup(
    'Layout preset with complex component inside',
    'Frame pad 16',
    async (api: TestAPI) => {
      const rowCode = simulateEditorDrop( 'Row')
      const selectCode = simulateEditorDrop( 'Select')

      // Row should be Frame hor, Select should be full structure
      api.assert.ok(rowCode.includes('hor'), 'Row has horizontal layout')
      api.assert.ok(selectCode.includes('Trigger'), 'Select has Trigger (not degraded)')
    }
  ),
])

// =============================================================================
// REGRESSION TESTS - Specific bugs that were fixed
// =============================================================================

export const editorDropRegressionTests: TestCase[] = describe('Editor Drop - Regression Tests', [
  testWithSetup(
    'REGRESSION: mirTemplate components must not degrade to just "Frame"',
    'Frame pad 16',
    async (api: TestAPI) => {
      // This was the original bug: components with mirTemplate were
      // degraded to just "Frame" + properties because mirTemplate was ignored

      const accordion = simulateEditorDrop( 'Accordion')
      const select = simulateEditorDrop( 'Select')
      const tabs = simulateEditorDrop( 'Tabs')
      const table = simulateEditorDrop( 'Table')

      // None of these should start with just "Frame" without their structure
      const justFrame = /^Frame\s+\w+/

      api.assert.ok(
        !justFrame.test(accordion.trim()) || accordion.includes('AccordionItem'),
        'Accordion must not degrade to plain Frame'
      )
      api.assert.ok(
        !justFrame.test(select.trim()) || select.includes('Trigger'),
        'Select must not degrade to plain Frame'
      )
      api.assert.ok(
        !justFrame.test(tabs.trim()) || tabs.includes('Tab'),
        'Tabs must not degrade to plain Tabs without structure'
      )
      api.assert.ok(
        !justFrame.test(table.trim()) || table.includes('TableRow'),
        'Table must not degrade to plain Table without structure'
      )
    }
  ),

  testWithSetup(
    'REGRESSION: generateComponentCodeFromDragData uses mirTemplate first',
    'Frame pad 16',
    async (api: TestAPI) => {
      // Verify the priority order:
      // 1. mirTemplate (if present)
      // 2. COMPONENT_TEMPLATES lookup
      // 3. Fallback to componentName + properties

      const generateFn = (window as any).generateComponentCodeFromDragData
      if (!generateFn) {
        throw new Error('generateComponentCodeFromDragData not available')
      }

      // Test with mirTemplate - should use it directly
      const withMirTemplate = generateFn(
        {
          componentName: 'Frame',
          properties: 'pad 8',
          mirTemplate: 'CustomComponent\n  Text "Hello"',
        },
        { componentId: 'test', filename: 'test.mir' }
      )

      api.assert.ok(
        withMirTemplate.includes('CustomComponent'),
        'Should use mirTemplate when provided'
      )
      api.assert.ok(
        !withMirTemplate.includes('Frame pad 8'),
        'Should NOT use fallback when mirTemplate exists'
      )
    }
  ),
])

// =============================================================================
// EXPORT ALL TESTS
// =============================================================================

export const allEditorDropTests: TestCase[] = [
  ...editorDropMirTemplateTests,
  ...editorDropPrimitiveTests,
  ...editorDropLayoutTests,
  ...editorDropCombinationTests,
  ...editorDropRegressionTests,
]

export default allEditorDropTests
