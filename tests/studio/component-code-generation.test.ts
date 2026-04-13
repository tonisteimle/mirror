/**
 * Component Code Generation Tests
 *
 * Tests the FULL flow from ComponentItem → drag data → generated code.
 * This catches bugs where the wrong component is inserted (e.g., "Frame" instead of "Button").
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { generateComponentCodeFromDragData } from '../../studio/bootstrap'
import { LAYOUT_SECTION, COMPONENTS_SECTION } from '../../studio/panels/components/layout-presets'
import type { ComponentItem } from '../../studio/panels/components/types'
import type { ComponentDragData } from '../../studio/panels/components/types'

/**
 * Simulate what happens when a component is dragged from the panel.
 * This mirrors the code in component-panel.ts handleDragStart.
 */
function createDragDataFromItem(item: ComponentItem): ComponentDragData {
  return {
    componentId: item.id,
    componentName: item.template,
    properties: item.properties,
    textContent: item.textContent,
    fromComponentPanel: true,
    children: item.children,
  }
}

/**
 * Generate code as if dropped into a .mir file
 */
function generateCodeForMirFile(item: ComponentItem): string {
  const dragData = createDragDataFromItem(item)
  return generateComponentCodeFromDragData(dragData, {
    componentId: dragData.componentId,
    filename: 'test.mir',
  })
}

// ============================================================================
// CRITICAL: Component Name Verification
// These tests ensure the CORRECT component is inserted, not a placeholder
// ============================================================================

describe('Component Code Generation - Correct Component Names', () => {
  describe('Layout Components', () => {
    it.each(LAYOUT_SECTION)('$name generates code starting with correct primitive', item => {
      const code = generateCodeForMirFile(item)
      const firstWord = code.split(/[\s\n]/)[0]

      // Layout items use "Frame" as template, which is correct
      // But the generated code should match the template
      expect(firstWord).toBe(item.template)
    })
  })

  describe('Basic Components', () => {
    const basicComponents = COMPONENTS_SECTION.filter(item =>
      ['Button', 'Text', 'Icon', 'Image', 'Input', 'Textarea'].includes(item.template)
    )

    it.each(basicComponents)('$name generates code starting with "$template"', item => {
      const code = generateCodeForMirFile(item)
      const firstWord = code.split(/[\s\n]/)[0]

      // CRITICAL: The first word must be the component name, NOT "Frame"
      expect(firstWord).toBe(item.template)
      expect(firstWord).not.toBe('Frame') // Explicit check for the known bug
    })

    it('Button generates "Button" not "Frame"', () => {
      const buttonItem = COMPONENTS_SECTION.find(item => item.template === 'Button')
      expect(buttonItem).toBeDefined()

      const code = generateCodeForMirFile(buttonItem!)
      expect(code).toMatch(/^Button/)
      expect(code).not.toMatch(/^Frame/)
    })

    it('Text generates "Text" not "Frame"', () => {
      const textItem = COMPONENTS_SECTION.find(item => item.template === 'Text')
      expect(textItem).toBeDefined()

      const code = generateCodeForMirFile(textItem!)
      expect(code).toMatch(/^Text/)
      expect(code).not.toMatch(/^Frame/)
    })

    it('Icon generates "Icon" not "Frame"', () => {
      const iconItem = COMPONENTS_SECTION.find(item => item.template === 'Icon')
      expect(iconItem).toBeDefined()

      const code = generateCodeForMirFile(iconItem!)
      expect(code).toMatch(/^Icon/)
      expect(code).not.toMatch(/^Frame/)
    })
  })

  describe('Form Components', () => {
    const formComponents = COMPONENTS_SECTION.filter(item =>
      ['Checkbox', 'Switch', 'Slider', 'RadioGroup', 'Select', 'DatePicker'].includes(item.template)
    )

    it.each(formComponents)('$name generates code starting with "$template"', item => {
      const code = generateCodeForMirFile(item)
      const firstWord = code.split(/[\s\n]/)[0]

      expect(firstWord).toBe(item.template)
      expect(firstWord).not.toBe('Frame')
    })
  })

  describe('Navigation Components', () => {
    const navComponents = COMPONENTS_SECTION.filter(item =>
      ['Tabs', 'SideNav'].includes(item.template)
    )

    it.each(navComponents)('$name generates code starting with "$template"', item => {
      const code = generateCodeForMirFile(item)
      const firstWord = code.split(/[\s\n]/)[0]

      expect(firstWord).toBe(item.template)
      expect(firstWord).not.toBe('Frame')
    })
  })

  describe('Overlay Components', () => {
    const overlayComponents = COMPONENTS_SECTION.filter(item =>
      ['Dialog', 'Tooltip'].includes(item.template)
    )

    it.each(overlayComponents)('$name generates code starting with "$template"', item => {
      const code = generateCodeForMirFile(item)
      const firstWord = code.split(/[\s\n]/)[0]

      expect(firstWord).toBe(item.template)
      expect(firstWord).not.toBe('Frame')
    })
  })
})

// ============================================================================
// Template ID Consistency
// Verifies that component IDs match between presets and templates
// ============================================================================

describe('Component Template ID Consistency', () => {
  it('all components have consistent IDs', () => {
    const allItems = [...LAYOUT_SECTION, ...COMPONENTS_SECTION]

    for (const item of allItems) {
      const dragData = createDragDataFromItem(item)

      // componentId should be set
      expect(dragData.componentId).toBe(item.id)

      // componentName should match template
      expect(dragData.componentName).toBe(item.template)
    }
  })
})

// ============================================================================
// Full Code Generation Quality
// ============================================================================

describe('Generated Code Quality', () => {
  it('Button with textContent includes quoted text', () => {
    const buttonItem = COMPONENTS_SECTION.find(item => item.template === 'Button')
    expect(buttonItem).toBeDefined()
    expect(buttonItem!.textContent).toBe('Button')

    const code = generateCodeForMirFile(buttonItem!)
    expect(code).toContain('"Button"')
  })

  it('Input with properties includes placeholder', () => {
    const inputItem = COMPONENTS_SECTION.find(item => item.template === 'Input')
    expect(inputItem).toBeDefined()

    const code = generateCodeForMirFile(inputItem!)
    expect(code).toContain('placeholder')
  })

  it('Select generates valid structure with Items', () => {
    const selectItem = COMPONENTS_SECTION.find(item => item.template === 'Select')
    expect(selectItem).toBeDefined()

    const code = generateCodeForMirFile(selectItem!)
    expect(code).toMatch(/^Select/)
    // Should have Item children or placeholder
    expect(code).toMatch(/Item|placeholder/)
  })

  it('Checkbox generates valid structure', () => {
    const checkboxItem = COMPONENTS_SECTION.find(item => item.template === 'Checkbox')
    expect(checkboxItem).toBeDefined()

    const code = generateCodeForMirFile(checkboxItem!)
    expect(code).toMatch(/^Checkbox/)
  })

  it('Dialog generates valid structure with Trigger and Content', () => {
    const dialogItem = COMPONENTS_SECTION.find(item => item.template === 'Dialog')
    expect(dialogItem).toBeDefined()

    const code = generateCodeForMirFile(dialogItem!)
    expect(code).toMatch(/^Dialog/)
    expect(code).toContain('Trigger')
    expect(code).toContain('Content')
  })
})
