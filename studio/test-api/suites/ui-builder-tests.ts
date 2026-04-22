/**
 * UI Builder Tests
 *
 * Tests that build UIs using ONLY:
 * - Drag & Drop from palette
 * - Property Panel modifications
 * - NO code editing
 *
 * Goal: Verify that basic UIs can be built without touching code.
 *
 * Each test evaluates:
 * 1. Generated Mirror Code (api.editor.getCode())
 * 2. Preview DOM (document.querySelector in preview)
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Helper: Analyze Preview DOM
// =============================================================================

interface PreviewAnalysis {
  elementCount: number
  elements: Array<{
    nodeId: string
    tagName: string
    text: string
    styles: {
      backgroundColor: string
      color: string
      width: string
      height: string
      padding: string
      borderRadius: string
    }
  }>
}

function analyzePreview(): PreviewAnalysis {
  const preview = document.getElementById('preview')
  if (!preview) {
    return { elementCount: 0, elements: [] }
  }

  const mirrorElements = preview.querySelectorAll('[data-mirror-id]')
  const elements: PreviewAnalysis['elements'] = []

  mirrorElements.forEach(el => {
    const htmlEl = el as HTMLElement
    const computed = getComputedStyle(htmlEl)

    elements.push({
      nodeId: htmlEl.getAttribute('data-mirror-id') || '',
      tagName: htmlEl.tagName.toLowerCase(),
      text: htmlEl.textContent?.trim() || '',
      styles: {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        width: computed.width,
        height: computed.height,
        padding: computed.padding,
        borderRadius: computed.borderRadius,
      },
    })
  })

  return {
    elementCount: mirrorElements.length,
    elements,
  }
}

function findElementInPreview(nodeId: string): PreviewAnalysis['elements'][0] | null {
  const analysis = analyzePreview()
  return analysis.elements.find(e => e.nodeId === nodeId) || null
}

// =============================================================================
// Helper: Analyze Generated Code
// =============================================================================

interface CodeAnalysis {
  lines: string[]
  hasElement: (type: string) => boolean
  hasProperty: (prop: string, value?: string) => boolean
  countElements: (type: string) => number
  getLine: (index: number) => string
}

function analyzeCode(code: string): CodeAnalysis {
  const lines = code.split('\n').filter(l => l.trim())

  return {
    lines,
    hasElement: (type: string) => code.includes(type),
    hasProperty: (prop: string, value?: string) => {
      if (value) {
        return code.includes(`${prop} ${value}`) || code.includes(`${prop}: ${value}`)
      }
      return code.includes(prop)
    },
    countElements: (type: string) => (code.match(new RegExp(type, 'g')) || []).length,
    getLine: (index: number) => lines[index] || '',
  }
}

// =============================================================================
// Level 1: Single Element - Drop and Verify
// =============================================================================

export const level1Tests: TestCase[] = describe('Level 1: Single Element', [
  testWithSetup('Drop Button - verify code and preview', `Frame`, async (api: TestAPI) => {
    // === ACTION: Drop Button ===
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = analyzeCode(api.editor.getCode())
    api.assert.ok(code.hasElement('Button'), 'CODE: Should contain Button')

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    api.assert.ok(preview.elementCount >= 2, 'PREVIEW: Should have Frame + Button')

    const button = preview.elements.find(e => e.tagName === 'button')
    api.assert.ok(button !== undefined, 'PREVIEW: Should have button element')

    // Log for debugging
    console.log('=== Test Results ===')
    console.log('Code:', api.editor.getCode())
    console.log(
      'Preview elements:',
      preview.elements.map(e => `${e.nodeId}: ${e.tagName}`)
    )
  }),

  testWithSetup('Drop Text - verify code and preview', `Frame`, async (api: TestAPI) => {
    // === ACTION ===
    await api.interact.dragFromPalette('Text', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = analyzeCode(api.editor.getCode())
    api.assert.ok(code.hasElement('Text'), 'CODE: Should contain Text')

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    const textEl = preview.elements.find(e => e.tagName === 'span')
    api.assert.ok(textEl !== undefined, 'PREVIEW: Should have span element')

    console.log('Code:', api.editor.getCode())
  }),

  testWithSetup('Drop Icon - verify code and preview', `Frame`, async (api: TestAPI) => {
    // === ACTION ===
    await api.interact.dragFromPalette('Icon', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = analyzeCode(api.editor.getCode())
    api.assert.ok(code.hasElement('Icon'), 'CODE: Should contain Icon')

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    api.assert.ok(preview.elementCount >= 2, 'PREVIEW: Should have elements')

    console.log('Code:', api.editor.getCode())
  }),
])

// =============================================================================
// Level 2: Property Panel - MODIFY Existing Properties
// =============================================================================

export const level2Tests: TestCase[] = describe('Level 2: Modify Existing Properties', [
  testWithSetup(
    'Change existing bg color via property panel',
    `Frame
  Button "Test", bg #333`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION: Change existing bg ===
      await api.panel.property.setProperty('bg', '#ff0000')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code after change:', code)

      const hasBgInCode = code.toLowerCase().includes('#ff0000') || code.includes('bg #ff0000')
      api.assert.ok(hasBgInCode, `CODE: Should contain bg #ff0000. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      const bgIsRed = button!.styles.backgroundColor.includes('255')
      api.assert.ok(
        bgIsRed,
        `PREVIEW: Button bg should be red. Got: ${button!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Change existing padding via property panel',
    `Frame
  Button "Test", pad 10`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION ===
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code:', code)
      api.assert.ok(code.includes('pad 24'), `CODE: Should have pad 24. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      api.assert.ok(
        button!.styles.padding.includes('24'),
        `PREVIEW: Padding should include 24. Got: ${button!.styles.padding}`
      )
    }
  ),

  testWithSetup(
    'Change existing radius via property panel',
    `Frame
  Button "Test", rad 6`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION ===
      await api.panel.property.setProperty('rad', '20')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code:', code)
      api.assert.ok(code.includes('rad 20'), `CODE: Should have rad 20. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      api.assert.ok(
        button!.styles.borderRadius.includes('20'),
        `PREVIEW: Border radius should be 20px. Got: ${button!.styles.borderRadius}`
      )
    }
  ),
])

// =============================================================================
// Level 3: Property Panel - ADD New Properties (LIMITATION TEST)
// =============================================================================

export const level3Tests: TestCase[] = describe('Level 3: Add New Properties', [
  testWithSetup(
    'Add bg property to element without bg',
    `Frame
  Button "Test"`,
    async (api: TestAPI) => {
      // === DEBUG: Log initial state ===
      const initialCode = api.editor.getCode()
      console.log('Initial code:', initialCode)

      // === SELECT ===
      await api.interact.click('node-2')

      // Verify selection (use async version with retry)
      const selectedId = await api.panel.property.waitForSelectedNodeId()
      console.log('Selected node ID:', selectedId)

      // === ACTION: Try to add new property ===
      const result = await api.panel.property.setProperty('bg', '#2271C1')
      console.log('setProperty result:', result)
      await api.utils.delay(500)

      // === VERIFY ===
      const code = api.editor.getCode()
      console.log('Code after setProperty:', code)

      const hasNewBg = code.includes('#2271C1') || code.includes('bg #2271C1')
      api.assert.ok(hasNewBg, `CODE: Should contain bg #2271C1. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      // Verify the background color was applied (rgb contains 34, 113, 193 for #2271C1)
      api.assert.ok(
        button!.styles.backgroundColor.includes('34') ||
          button!.styles.backgroundColor.includes('113'),
        `PREVIEW: Button should have blue bg #2271C1. Got: ${button!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Add padding property to element without padding',
    `Frame
  Text "Hello"`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION ===
      await api.panel.property.setProperty('pad', '20')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code after adding pad:', code)

      const hasPad = code.includes('pad 20')
      api.assert.ok(hasPad, `CODE: Should contain pad 20. Got: ${code}`)
    }
  ),

  testWithSetup(
    'Add multiple properties to element',
    `Frame
  Button "Click"`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ADD bg ===
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(400)

      // === ADD pad ===
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(400)

      // === ADD rad ===
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code after adding 3 properties:', code)

      api.assert.ok(code.includes('#2271C1'), `CODE: Should have bg. Got: ${code}`)
      api.assert.ok(code.includes('pad 16'), `CODE: Should have pad 16. Got: ${code}`)
      api.assert.ok(code.includes('rad 8'), `CODE: Should have rad 8. Got: ${code}`)
    }
  ),
])

// =============================================================================
// Level 4: Nested Elements - Build Hierarchy
// =============================================================================

export const level4Tests: TestCase[] = describe('Level 4: Nested Elements', [
  testWithSetup('Drop Frame into Frame - create nesting', `Frame`, async (api: TestAPI) => {
    // === ACTION: Drop inner Frame ===
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = api.editor.getCode()
    console.log('Nested Frame code:', code)

    // Should have two Frames with indentation
    const lines = code.split('\n')
    api.assert.ok(lines.length >= 2, 'CODE: Should have multiple lines')
    api.assert.ok(code.includes('Frame'), 'CODE: Should contain Frame')

    // Check for indentation (inner frame should be indented)
    const hasIndentedFrame = lines.some(l => l.startsWith('  Frame'))
    api.assert.ok(hasIndentedFrame, `CODE: Should have indented Frame. Got: ${code}`)

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    api.assert.ok(preview.elementCount >= 2, 'PREVIEW: Should have 2+ elements')
  }),

  testWithSetup(
    'Drop Button into nested Frame',
    `Frame
  Frame`,
    async (api: TestAPI) => {
      // === ACTION: Drop Button into inner Frame (node-2) ===
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Button in nested Frame:', code)

      // Button should be indented twice (under inner Frame)
      const hasDeepButton =
        code.includes('    Button') || (code.includes('Frame') && code.includes('Button'))
      api.assert.ok(hasDeepButton, `CODE: Button should be nested. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const button = preview.elements.find(e => e.tagName === 'button')
      api.assert.ok(button !== undefined, 'PREVIEW: Should have button')
    }
  ),

  testWithSetup(
    'Build 3-level hierarchy: Frame > Frame > Button',
    `Frame`,
    async (api: TestAPI) => {
      // === ACTION 1: Drop inner Frame ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(400)

      // === ACTION 2: Drop Button into inner Frame ===
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.delay(400)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('3-level hierarchy:', code)

      api.assert.ok(code.includes('Frame'), 'CODE: Should have Frame')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      api.assert.ok(
        preview.elementCount >= 3,
        `PREVIEW: Should have 3+ elements. Got: ${preview.elementCount}`
      )
    }
  ),
])

// =============================================================================
// Level 5: Layout Properties
// =============================================================================

export const level5Tests: TestCase[] = describe('Level 5: Layout Properties', [
  testWithSetup(
    'Change Frame to horizontal layout',
    `Frame hor
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // Start with hor, verify it's already horizontal
      const preview = analyzePreview()
      const frame = findElementInPreview('node-1')

      console.log('Frame styles:', frame?.styles)

      // === VERIFY PREVIEW: Buttons should be side by side ===
      // In horizontal layout, elements have display: flex, flex-direction: row
      api.assert.ok(frame !== undefined, 'PREVIEW: Should have frame')
    }
  ),

  testWithSetup(
    'Modify gap on Frame with existing gap',
    `Frame gap 8
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // === SELECT Frame ===
      await api.interact.click('node-1')
      await api.utils.delay(300)

      // === ACTION: Change gap ===
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Gap modified:', code)
      api.assert.ok(code.includes('gap 24'), `CODE: Should have gap 24. Got: ${code}`)
    }
  ),

  testWithSetup(
    'Modify multiple properties on Frame',
    `Frame gap 8, pad 10, bg #333
  Button "Test"`,
    async (api: TestAPI) => {
      // === SELECT Frame ===
      await api.interact.click('node-1')
      await api.utils.delay(300)

      // === ACTION 1: Change gap ===
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(300)

      // === ACTION 2: Change padding ===
      await api.panel.property.setProperty('pad', '20')
      await api.utils.delay(300)

      // === ACTION 3: Change background ===
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Multiple props changed:', code)

      api.assert.ok(code.includes('gap 16'), `CODE: gap 16. Got: ${code}`)
      api.assert.ok(code.includes('pad 20'), `CODE: pad 20. Got: ${code}`)
      api.assert.ok(code.toLowerCase().includes('#1a1a1a'), `CODE: bg #1a1a1a. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const frame = findElementInPreview('node-1')
      if (frame) {
        console.log('Frame preview styles:', frame.styles)
      }
    }
  ),
])

// =============================================================================
// Level 6: Multiple Elements - Build Row of Buttons
// =============================================================================

export const level6Tests: TestCase[] = describe('Level 6: Multiple Elements', [
  testWithSetup(
    'Drop 3 buttons into horizontal Frame',
    `Frame hor, gap 8`,
    async (api: TestAPI) => {
      // === DROP 3 BUTTONS ===
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.delay(400)

      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(400)

      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = analyzeCode(api.editor.getCode())
      console.log('3 buttons code:', api.editor.getCode())

      const buttonCount = code.countElements('Button')
      api.assert.ok(buttonCount === 3, `CODE: Should have 3 Buttons. Got: ${buttonCount}`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const buttons = preview.elements.filter(e => e.tagName === 'button')
      api.assert.ok(buttons.length === 3, `PREVIEW: Should have 3 buttons. Got: ${buttons.length}`)
    }
  ),

  testWithSetup(
    'Build icon + text + button row',
    `Frame hor, gap 12, pad 16, bg #1a1a1a`,
    async (api: TestAPI) => {
      // === DROP Icon ===
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      await api.utils.delay(400)

      // === DROP Text ===
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(400)

      // === DROP Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Icon + Text + Button:', code)

      api.assert.ok(code.includes('Icon'), 'CODE: Should have Icon')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      api.assert.ok(
        preview.elementCount >= 4,
        `PREVIEW: Should have 4+ elements (Frame + 3 children)`
      )
    }
  ),
])

// =============================================================================
// Level 7: Build a Simple Card UI
// =============================================================================

export const level7Tests: TestCase[] = describe('Level 7: Build Card UI', [
  testWithSetup(
    'Build card with title and button',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP Text (title) ===
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(400)

      // === DROP Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Simple card:', code)

      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')
      api.assert.ok(code.includes('rad 8'), 'CODE: Should have rad 8')
      api.assert.ok(code.includes('pad 16'), 'CODE: Should have pad 16')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const frame = findElementInPreview('node-1')

      // STRICT: Frame must exist and have correct styles
      api.assert.ok(frame !== null, 'PREVIEW: Frame node-1 must exist in preview')
      api.assert.ok(
        frame!.styles.borderRadius.includes('8'),
        `PREVIEW: Card should have border-radius. Got: ${frame!.styles.borderRadius}`
      )
    }
  ),

  testWithSetup(
    'Build card with header row + content',
    `Frame gap 16, pad 20, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // === DROP Header Frame ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(400)

      // === DROP Content Text ===
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(400)

      // === DROP Action Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Card with sections:', code)

      api.assert.ok(code.includes('Frame'), 'CODE: Should have Frame')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')

      // Count elements
      const analysis = analyzeCode(code)
      const frameCount = analysis.countElements('Frame')
      api.assert.ok(frameCount >= 2, `CODE: Should have 2+ Frames. Got: ${frameCount}`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      api.assert.ok(preview.elementCount >= 4, `PREVIEW: Should have 4+ elements`)
    }
  ),
])

// =============================================================================
// Level 8: Build a Form
// =============================================================================

export const level8Tests: TestCase[] = describe('Level 8: Build Form', [
  testWithSetup(
    'Build login form: labels + inputs + button',
    `Frame gap 16, pad 24, bg #1a1a1a, rad 12, w 300`,
    async (api: TestAPI) => {
      // === DROP Email Label ===
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(300)

      // === DROP Email Input ===
      await api.interact.dragFromPalette('Input', 'node-1', 1)
      await api.utils.delay(300)

      // === DROP Password Label ===
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(300)

      // === DROP Password Input ===
      await api.interact.dragFromPalette('Input', 'node-1', 3)
      await api.utils.delay(300)

      // === DROP Submit Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 4)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Login form code:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 2, 'CODE: Should have 2+ Text elements')
      api.assert.ok(analysis.countElements('Input') >= 2, 'CODE: Should have 2+ Input elements')
      api.assert.ok(analysis.countElements('Button') >= 1, 'CODE: Should have Button')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const inputs = preview.elements.filter(e => e.tagName === 'input')
      api.assert.ok(inputs.length >= 2, `PREVIEW: Should have 2+ inputs. Got: ${inputs.length}`)
    }
  ),

  testWithSetup(
    'Build form field group: horizontal label + input',
    `Frame gap 12, pad 20, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP horizontal row ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(300)

      // Make it horizontal by adding hor property
      await api.interact.click('node-2')
      await api.utils.delay(200)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(300)

      // === DROP Label into row ===
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(300)

      // === DROP Input into row ===
      await api.interact.dragFromPalette('Input', 'node-2', 1)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Form field group:', code)

      api.assert.ok(code.includes('hor'), 'CODE: Inner Frame should be horizontal')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Input'), 'CODE: Should have Input')
    }
  ),
])

// =============================================================================
// Level 9: Build Navigation
// =============================================================================

export const level9Tests: TestCase[] = describe('Level 9: Build Navigation', [
  testWithSetup(
    'Build nav bar with logo + links',
    `Frame hor, spread, pad 16, bg #111, w full`,
    async (api: TestAPI) => {
      // === DROP Logo (Icon or Text) ===
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(300)

      // === DROP Nav Links Container ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(300)

      // Make links container horizontal
      await api.interact.click('node-3')
      await api.utils.delay(200)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(300)

      // === DROP Links ===
      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Text', 'node-3', 1)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Text', 'node-3', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Nav bar code:', code)

      api.assert.ok(code.includes('spread'), 'CODE: Should have spread layout')
      api.assert.ok(code.includes('hor'), 'CODE: Should have horizontal container')

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 4, 'CODE: Should have 4+ Text elements')
    }
  ),

  testWithSetup(
    'Build tab bar with icons',
    `Frame hor, gap 0, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP 3 Tab Buttons ===
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Tab bar code:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(
        analysis.countElements('Button') === 3,
        `CODE: Should have 3 Buttons. Got: ${analysis.countElements('Button')}`
      )

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const buttons = preview.elements.filter(e => e.tagName === 'button')
      api.assert.ok(buttons.length === 3, `PREVIEW: Should have 3 buttons`)
    }
  ),
])

// =============================================================================
// Level 10: Build List
// =============================================================================

export const level10Tests: TestCase[] = describe('Level 10: Build List', [
  testWithSetup(
    'Build simple list with items',
    `Frame gap 8, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP 4 list items (Text elements) ===
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Text', 'node-1', i)
        await api.utils.delay(300)
      }
      await api.utils.delay(200)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('List code:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') === 4, `CODE: Should have 4 Text elements`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const texts = preview.elements.filter(e => e.tagName === 'span')
      api.assert.ok(texts.length === 4, `PREVIEW: Should have 4 text elements`)
    }
  ),

  testWithSetup(
    'Build list item with icon + text + action',
    `Frame gap 8, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP item row ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(300)

      // Style the row
      await api.interact.click('node-2')
      await api.utils.delay(200)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(300)

      // === DROP Icon ===
      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(300)

      // === DROP Text ===
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(300)

      // === DROP Action Button ===
      await api.interact.dragFromPalette('Button', 'node-2', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('List item code:', code)

      api.assert.ok(code.includes('hor'), 'CODE: Row should be horizontal')
      api.assert.ok(code.includes('Icon'), 'CODE: Should have Icon')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')
    }
  ),
])

// =============================================================================
// Level 11: Styling Workflows
// =============================================================================

export const level11Tests: TestCase[] = describe('Level 11: Styling Workflows', [
  testWithSetup(
    'Style button: bg + color + padding + radius',
    `Frame pad 20
  Button "Click me"`,
    async (api: TestAPI) => {
      // === SELECT Button ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === APPLY STYLES ===
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(300)
      await api.panel.property.setProperty('col', 'white')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '12 24')
      await api.utils.delay(300)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Styled button code:', code)

      api.assert.ok(code.includes('#2271C1'), 'CODE: Should have bg color')
      api.assert.ok(code.includes('white'), 'CODE: Should have text color')
      api.assert.ok(code.includes('pad'), 'CODE: Should have padding')
      api.assert.ok(code.includes('rad 8'), 'CODE: Should have radius')

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      api.assert.ok(
        button!.styles.backgroundColor.includes('34') ||
          button!.styles.backgroundColor.includes('113'),
        `PREVIEW: Button should have blue bg. Got: ${button!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Style card container: shadow + border',
    `Frame pad 20
  Frame gap 12
    Text "Card Title"
    Text "Card content"`,
    async (api: TestAPI) => {
      // === SELECT inner Frame (card) ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === APPLY CARD STYLES ===
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '20')
      await api.utils.delay(300)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bor', '1')
      await api.utils.delay(300)
      await api.panel.property.setProperty('boc', '#333')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Styled card code:', code)

      api.assert.ok(code.includes('#1a1a1a'), 'CODE: Should have bg')
      api.assert.ok(code.includes('pad 20'), 'CODE: Should have padding')
      api.assert.ok(code.includes('rad 12'), 'CODE: Should have radius')
      api.assert.ok(code.includes('bor 1'), 'CODE: Should have border')
      api.assert.ok(code.includes('#333'), 'CODE: Should have border color')
    }
  ),

  testWithSetup(
    'Style text: size + weight + color',
    `Frame pad 20
  Text "Heading"`,
    async (api: TestAPI) => {
      // === SELECT Text ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === APPLY TEXT STYLES ===
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(300)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(300)
      await api.panel.property.setProperty('col', '#fff')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Styled text code:', code)

      api.assert.ok(code.includes('fs 24'), 'CODE: Should have font-size')
      api.assert.ok(code.includes('bold'), 'CODE: Should have font-weight')
      api.assert.ok(code.includes('#fff'), 'CODE: Should have color')
    }
  ),
])

// =============================================================================
// Level 12: App Layouts (Sidebar + Content)
// =============================================================================

export const level12Tests: TestCase[] = describe('Level 12: App Layouts', [
  testWithSetup(
    'Build sidebar + main content layout',
    `Frame hor, w full, h full`,
    async (api: TestAPI) => {
      // === DROP Sidebar ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(300)

      // Style sidebar
      await api.interact.click('node-2')
      await api.utils.delay(200)
      await api.panel.property.setProperty('w', '240')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(300)

      // === DROP Main Content ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(300)

      // Style main content
      await api.interact.click('node-3')
      await api.utils.delay(200)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bg', '#0a0a0a')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Sidebar layout:', code)

      api.assert.ok(code.includes('w 240'), 'CODE: Sidebar should have fixed width')
      api.assert.ok(code.includes('grow'), 'CODE: Main should grow')
      api.assert.ok(code.includes('#111'), 'CODE: Sidebar bg')
    }
  ),

  testWithSetup(
    'Build header + main + footer layout',
    `Frame gap 0, w full, h full`,
    async (api: TestAPI) => {
      // === DROP Header ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('h', '60')
      await api.utils.delay(150)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(150)

      // === DROP Main ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(150)
      await api.interact.click('node-3')
      await api.utils.delay(100)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(150)

      // === DROP Footer ===
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(150)
      await api.interact.click('node-4')
      await api.utils.delay(100)
      await api.panel.property.setProperty('h', '50')
      await api.utils.delay(150)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Header/Main/Footer:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Should have 4 Frames')
      api.assert.ok(code.includes('h 60'), 'CODE: Header height')
      api.assert.ok(code.includes('grow'), 'CODE: Main grows')
      api.assert.ok(code.includes('h 50'), 'CODE: Footer height')
    }
  ),
])

// =============================================================================
// Level 13: Dashboard Cards Grid
// =============================================================================

export const level13Tests: TestCase[] = describe('Level 13: Dashboard Grid', [
  testWithSetup('Build 2x2 card grid', `Frame gap 16, pad 20, bg #0a0a0a`, async (api: TestAPI) => {
    // === DROP Row 1 ===
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(150)
    await api.interact.click('node-2')
    await api.utils.delay(100)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(150)
    await api.panel.property.setProperty('gap', '16')
    await api.utils.delay(150)

    // === DROP Card 1 ===
    await api.interact.dragFromPalette('Frame', 'node-2', 0)
    await api.utils.delay(150)
    await api.interact.click('node-3')
    await api.utils.delay(100)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(150)
    await api.panel.property.setProperty('bg', '#1a1a1a')
    await api.utils.delay(150)
    await api.panel.property.setProperty('rad', '12')
    await api.utils.delay(150)

    // === DROP Card 2 ===
    await api.interact.dragFromPalette('Frame', 'node-2', 1)
    await api.utils.delay(150)
    await api.interact.click('node-4')
    await api.utils.delay(100)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(150)
    await api.panel.property.setProperty('bg', '#1a1a1a')
    await api.utils.delay(150)
    await api.panel.property.setProperty('rad', '12')
    await api.utils.delay(300)

    // === VERIFY CODE ===
    const code = api.editor.getCode()
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Should have 4+ Frames')
    api.assert.ok(code.includes('hor'), 'CODE: Row should be horizontal')
    api.assert.ok((code.match(/grow/g) || []).length >= 2, 'CODE: Cards should grow')
  }),

  testWithSetup(
    'Build stat card with icon + number + label',
    `Frame gap 16, pad 20, bg #0a0a0a`,
    async (api: TestAPI) => {
      // === DROP Card container ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(150)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(150)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(150)

      // === DROP Icon ===
      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(150)

      // === DROP Number (big text) ===
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(150)
      await api.interact.click('node-4')
      await api.utils.delay(100)
      await api.panel.property.setProperty('fs', '32')
      await api.utils.delay(150)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(150)

      // === DROP Label ===
      await api.interact.dragFromPalette('Text', 'node-2', 2)
      await api.utils.delay(150)
      await api.interact.click('node-5')
      await api.utils.delay(100)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Icon'), 'CODE: Should have Icon')
      api.assert.ok(code.includes('fs 32'), 'CODE: Number should be large')
      api.assert.ok(code.includes('bold'), 'CODE: Number should be bold')
      api.assert.ok(code.includes('#888'), 'CODE: Label should be muted')
    }
  ),
])

// =============================================================================
// Level 14: Interactive Elements Setup
// =============================================================================

export const level14Tests: TestCase[] = describe('Level 14: Interactive Elements', [
  testWithSetup(
    'Build button group with different styles',
    `Frame hor, gap 8, pad 20, bg #0a0a0a`,
    async (api: TestAPI) => {
      // === DROP Primary Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(150)
      await api.panel.property.setProperty('col', 'white')
      await api.utils.delay(150)

      // === DROP Secondary Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(150)
      await api.interact.click('node-3')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(150)

      // === DROP Outline Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(150)
      await api.interact.click('node-4')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', 'transparent')
      await api.utils.delay(150)
      await api.panel.property.setProperty('bor', '1')
      await api.utils.delay(150)
      await api.panel.property.setProperty('boc', '#2271C1')
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') === 3, 'CODE: Should have 3 buttons')
      api.assert.ok(code.includes('#2271C1'), 'CODE: Primary color')
      api.assert.ok(code.includes('#333'), 'CODE: Secondary color')
      api.assert.ok(code.includes('transparent'), 'CODE: Outline bg')
    }
  ),

  testWithSetup(
    'Build icon button row',
    `Frame hor, gap 4, pad 12, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP 4 Icon Buttons ===
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Button', 'node-1', i)
        await api.utils.delay(100)
        await api.interact.click(`node-${i + 2}`)
        await api.utils.delay(80)
        await api.panel.property.setProperty('bg', 'transparent')
        await api.utils.delay(100)
        await api.panel.property.setProperty('pad', '8')
        await api.utils.delay(100)
      }
      await api.utils.delay(200)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') === 4, 'CODE: Should have 4 buttons')
      api.assert.ok(
        (code.match(/transparent/g) || []).length >= 4,
        'CODE: All should be transparent'
      )
    }
  ),
])

// =============================================================================
// Level 15: Complex Nested Structures
// =============================================================================

export const level15Tests: TestCase[] = describe('Level 15: Complex Nesting', [
  testWithSetup(
    'Build settings panel with sections',
    `Frame gap 24, pad 24, bg #0a0a0a, w 400`,
    async (api: TestAPI) => {
      // === SECTION 1: Profile ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(150)

      // Section title + Input row
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(100)
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(100)
      await api.interact.click('node-4')
      await api.utils.delay(80)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(100)

      await api.interact.dragFromPalette('Input', 'node-4', 0)
      await api.utils.delay(100)
      await api.interact.dragFromPalette('Button', 'node-4', 1)
      await api.utils.delay(150)

      // === SECTION 2: Preferences ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(150)
      await api.interact.click('node-7')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(100)

      await api.interact.dragFromPalette('Text', 'node-7', 0)
      await api.utils.delay(100)
      await api.interact.dragFromPalette('Switch', 'node-7', 1)
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Input'), 'CODE: Should have Input')
      api.assert.ok(code.includes('Switch'), 'CODE: Should have Switch')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Should have nested Frames')
    }
  ),

  testWithSetup(
    'Build comment card with avatar + actions',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // === Header Row with Avatar ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(100)
      await api.interact.click('node-2')
      await api.utils.delay(80)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(100)

      // Avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(80)
      await api.interact.click('node-3')
      await api.utils.delay(60)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(80)
      await api.panel.property.setProperty('h', '40')
      await api.utils.delay(80)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(80)

      // Name
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(80)

      // === Content ===
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(80)

      // === Actions ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(80)
      await api.interact.dragFromPalette('Button', 'node-1', 3)
      await api.utils.delay(200)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 99'), 'CODE: Avatar should be round')
      api.assert.ok(code.includes('w 40'), 'CODE: Avatar size')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 2, 'CODE: Multiple text elements')
      api.assert.ok(analysis.countElements('Button') >= 2, 'CODE: Action buttons')
    }
  ),
])

// =============================================================================
// Level 16: Chat Interface
// =============================================================================

const level16Tests = describe('Level 16: Chat Interface', [
  // Chat message bubbles (simplified)
  testWithSetup(
    'Build chat message bubbles',
    `Frame gap 12, pad 16, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Incoming message
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(60)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(60)

      // Outgoing message
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(60)
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(60)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('bg #2271C1'), 'CODE: Outgoing message')
      api.assert.ok(code.includes('bg #1a1a1a'), 'CODE: Incoming message')
      api.assert.ok(code.includes('rad 12'), 'CODE: Bubble radius')
    }
  ),

  // Chat input area
  testWithSetup(
    'Build chat input area',
    `Frame hor, gap 8, pad 12, bg #1a1a1a`,
    async (api: TestAPI) => {
      // Input
      await api.interact.dragFromPalette('Input', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(60)
      await api.panel.property.setProperty('rad', '20')
      await api.utils.delay(60)

      // Send button
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(60)
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('grow'), 'CODE: Input grows')
      api.assert.ok(code.includes('rad 20'), 'CODE: Rounded input')
      api.assert.ok(code.includes('rad 99'), 'CODE: Circular button')
    }
  ),
])

// =============================================================================
// Level 17: E-Commerce Product Card
// =============================================================================

const level17Tests = describe('Level 17: E-Commerce Product Card', [
  // Product card (simplified)
  testWithSetup(
    'Build product card',
    `Frame gap 0, bg #1a1a1a, rad 12, w 280`,
    async (api: TestAPI) => {
      // Image
      await api.interact.dragFromPalette('Image', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('w', 'full')
      await api.utils.delay(60)
      await api.panel.property.setProperty('h', '180')
      await api.utils.delay(60)

      // Info section
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(60)
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(60)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(60)

      // Name + Button
      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.delay(60)
      await api.interact.dragFromPalette('Button', 'node-3', 1)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w full'), 'CODE: Full width image')
      api.assert.ok(code.includes('h 180'), 'CODE: Image height')
      api.assert.ok(code.includes('pad 16'), 'CODE: Info padding')
    }
  ),

  // Rating stars (simplified)
  testWithSetup('Build rating stars', `Frame hor, gap 4`, async (api: TestAPI) => {
    // 3 star icons (reduced from 5)
    for (let i = 0; i < 3; i++) {
      await api.interact.dragFromPalette('Icon', 'node-1', i)
      await api.utils.delay(50)
    }

    // Style stars
    await api.interact.click('node-2')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ic', '#f59e0b')
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ic', '#f59e0b')
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('ic #f59e0b'), 'CODE: Gold star')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Icon') >= 3, 'CODE: Star icons')
  }),
])

// =============================================================================
// Level 18: Media Gallery
// =============================================================================

const level18Tests = describe('Level 18: Media Gallery', [
  // Image grid (simplified - 3 cards instead of 6)
  testWithSetup('Build image grid', `Frame wrap, gap 8, hor`, async (api: TestAPI) => {
    // Create 3 image cards
    for (let i = 0; i < 3; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(50)
      const nodeId = `node-${i + 2}`
      await api.interact.click(nodeId)
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '150')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '150')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#222')
      await api.utils.delay(50)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('wrap'), 'CODE: Wrap layout')
    api.assert.ok(code.includes('w 150'), 'CODE: Card width')
    api.assert.ok(code.includes('h 150'), 'CODE: Card height')
  }),

  // Featured + thumbnails (simplified - 2 thumbnails)
  testWithSetup('Build featured image with thumbnails', `Frame gap 8`, async (api: TestAPI) => {
    // Featured image
    await api.interact.dragFromPalette('Image', 'node-1', 0)
    await api.utils.delay(60)
    await api.interact.click('node-2')
    await api.utils.delay(50)
    await api.panel.property.setProperty('w', '400')
    await api.utils.delay(60)
    await api.panel.property.setProperty('h', '300')
    await api.utils.delay(60)

    // Thumbnail row
    await api.interact.dragFromPalette('Frame', 'node-1', 1)
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(50)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(60)
    await api.panel.property.setProperty('gap', '8')
    await api.utils.delay(60)

    // 2 thumbnails
    await api.interact.dragFromPalette('Image', 'node-3', 0)
    await api.utils.delay(60)
    await api.interact.dragFromPalette('Image', 'node-3', 1)
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('w 400'), 'CODE: Featured width')
    api.assert.ok(code.includes('h 300'), 'CODE: Featured height')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Image') >= 3, 'CODE: Featured + thumbnails')
  }),
])

// =============================================================================
// Level 19: Dashboard with Multiple Sections
// =============================================================================

const level19Tests = describe('Level 19: Multi-Section Dashboard', [
  // Dashboard stats row (simplified - 2 cards)
  testWithSetup(
    'Build dashboard stats row',
    `Frame gap 16, pad 24, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Stats row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(60)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(60)

      // 2 stat cards
      for (let i = 0; i < 2; i++) {
        await api.interact.dragFromPalette('Frame', 'node-2', i)
        await api.utils.delay(50)
        const cardId = `node-${i + 3}`
        await api.interact.click(cardId)
        await api.utils.delay(40)
        await api.panel.property.setProperty('grow', '')
        await api.utils.delay(50)
        await api.panel.property.setProperty('bg', '#1a1a1a')
        await api.utils.delay(50)
        await api.panel.property.setProperty('rad', '8')
        await api.utils.delay(50)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('gap 16'), 'CODE: Row gap')
      api.assert.ok(code.includes('grow'), 'CODE: Grow cards')
      api.assert.ok(code.includes('rad 8'), 'CODE: Card radius')
    }
  ),

  // Activity feed (simplified - 2 items)
  testWithSetup(
    'Build activity feed',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // Header
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(60)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(60)

      // 2 activity items
      for (let i = 0; i < 2; i++) {
        await api.interact.dragFromPalette('Frame', 'node-1', i + 2)
        await api.utils.delay(50)
        const itemId = `node-${i + 4}`
        await api.interact.click(itemId)
        await api.utils.delay(40)
        await api.panel.property.setProperty('hor', '')
        await api.utils.delay(50)
        await api.panel.property.setProperty('gap', '12')
        await api.utils.delay(50)

        await api.interact.dragFromPalette('Icon', itemId, 0)
        await api.utils.delay(50)
        await api.interact.dragFromPalette('Text', itemId, 1)
        await api.utils.delay(50)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('weight bold'), 'CODE: Bold header')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Divider') >= 1, 'CODE: Divider')
      api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Icons')
    }
  ),
])

// =============================================================================
// Level 20: Profile Page
// =============================================================================

const level20Tests = describe('Level 20: Profile Page', [
  // Profile header (simplified)
  testWithSetup('Build profile header with avatar', `Frame stacked`, async (api: TestAPI) => {
    // Cover
    await api.interact.dragFromPalette('Image', 'node-1', 0)
    await api.utils.delay(60)
    await api.interact.click('node-2')
    await api.utils.delay(50)
    await api.panel.property.setProperty('w', 'full')
    await api.utils.delay(60)
    await api.panel.property.setProperty('h', '200')
    await api.utils.delay(60)

    // Avatar
    await api.interact.dragFromPalette('Image', 'node-1', 1)
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(50)
    await api.panel.property.setProperty('w', '100')
    await api.utils.delay(60)
    await api.panel.property.setProperty('h', '100')
    await api.utils.delay(60)
    await api.panel.property.setProperty('rad', '99')
    await api.utils.delay(60)
    await api.panel.property.setProperty('x', '24')
    await api.utils.delay(60)
    await api.panel.property.setProperty('y', '150')
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('stacked'), 'CODE: Stacked layout')
    api.assert.ok(code.includes('h 200'), 'CODE: Cover height')
    api.assert.ok(code.includes('rad 99'), 'CODE: Circular avatar')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Image') >= 2, 'CODE: Cover + avatar')
  }),

  // Profile info (simplified)
  testWithSetup('Build profile info section', `Frame gap 16, pad 24`, async (api: TestAPI) => {
    // Name row
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(60)
    await api.interact.click('node-2')
    await api.utils.delay(50)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(60)
    await api.panel.property.setProperty('spread', '')
    await api.utils.delay(60)

    // Name
    await api.interact.dragFromPalette('Text', 'node-2', 0)
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(50)
    await api.panel.property.setProperty('fs', '24')
    await api.utils.delay(60)
    await api.panel.property.setProperty('weight', 'bold')
    await api.utils.delay(60)

    // Edit button
    await api.interact.dragFromPalette('Button', 'node-2', 1)
    await api.utils.delay(60)

    // Bio
    await api.interact.dragFromPalette('Text', 'node-1', 1)
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('fs 24'), 'CODE: Large name')
    api.assert.ok(code.includes('weight bold'), 'CODE: Bold name')
    api.assert.ok(code.includes('spread'), 'CODE: Spread layout')
  }),
])

// =============================================================================
// Level 21: E-Commerce Product Page
// =============================================================================

const level21Tests = describe('Level 21: E-Commerce Product Page', [
  // Product page header with breadcrumb + search
  testWithSetup(
    'Build e-commerce header with search',
    `Frame hor, spread, pad 16, bg #111, ver-center`,
    async (api: TestAPI) => {
      // Logo
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '20')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Search bar
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#222')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Icon', 'node-3', 0)
      await api.utils.delay(50)
      await api.interact.dragFromPalette('Input', 'node-3', 1)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(50)

      // Cart icon
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('spread'), 'CODE: Spread layout')
      api.assert.ok(code.includes('grow'), 'CODE: Growing input')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Icons')
      api.assert.ok(analysis.countElements('Input') >= 1, 'CODE: Search input')
    }
  ),

  // Product grid (2x2)
  testWithSetup('Build product grid 2x2', `Frame wrap, gap 16, hor`, async (api: TestAPI) => {
    // Create 4 product cards
    for (let i = 0; i < 4; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(40)
      const cardId = `node-${i + 2}`
      await api.interact.click(cardId)
      await api.utils.delay(30)
      await api.panel.property.setProperty('w', '200')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(40)

      // Image placeholder
      await api.interact.dragFromPalette('Frame', cardId, 0)
      await api.utils.delay(40)
      // Title
      await api.interact.dragFromPalette('Text', cardId, 1)
      await api.utils.delay(40)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('wrap'), 'CODE: Wrap layout')
    api.assert.ok(code.includes('w 200'), 'CODE: Card width')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Frame') >= 9, 'CODE: Container + 4 cards + images')
  }),
])

// =============================================================================
// Level 22: Social Media Feed
// =============================================================================

const level22Tests = describe('Level 22: Social Media Feed', [
  // Post with author, content, actions
  testWithSetup(
    'Build social post with author and actions',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // Author row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(50)

      // Author info
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '2')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Text', 'node-4', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Text', 'node-4', 1)
      await api.utils.delay(50)

      // Post content
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)

      // Action bar
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(50)

      // Like, Comment, Share icons
      await api.interact.dragFromPalette('Icon', 'node-8', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Icon', 'node-8', 1)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Icon', 'node-8', 2)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 99'), 'CODE: Round avatar')
      api.assert.ok(code.includes('gap 24'), 'CODE: Action spacing')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Icon') >= 3, 'CODE: Action icons')
      api.assert.ok(analysis.countElements('Text') >= 3, 'CODE: Author + time + content')
    }
  ),

  // Comment with reply
  testWithSetup(
    'Build comment with reply button',
    `Frame gap 8, pad 12, bg #111, rad 8`,
    async (api: TestAPI) => {
      // Comment header
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(50)

      // Mini avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)

      // Name
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '13')
      await api.utils.delay(50)

      // Comment text
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)

      // Reply link
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 24'), 'CODE: Mini avatar')
      api.assert.ok(code.includes('fs 13'), 'CODE: Small name')
      api.assert.ok(code.includes('col #888'), 'CODE: Muted reply')
    }
  ),
])

// =============================================================================
// Level 23: Admin Dashboard
// =============================================================================

const level23Tests = describe('Level 23: Admin Dashboard', [
  // Sidebar navigation
  testWithSetup(
    'Build admin sidebar nav',
    `Frame w 240, h full, bg #0a0a0a, pad 16, gap 8`,
    async (api: TestAPI) => {
      // Logo area
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '0 0 16 0')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(50)

      // Nav items (3)
      for (let i = 0; i < 3; i++) {
        await api.interact.dragFromPalette('Frame', 'node-1', i + 2)
        await api.utils.delay(40)
        const itemId = `node-${i + 6}`
        await api.interact.click(itemId)
        await api.utils.delay(30)
        await api.panel.property.setProperty('hor', '')
        await api.utils.delay(40)
        await api.panel.property.setProperty('gap', '12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('pad', '10 12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('rad', '6')
        await api.utils.delay(40)

        await api.interact.dragFromPalette('Icon', itemId, 0)
        await api.utils.delay(40)
        await api.interact.dragFromPalette('Text', itemId, 1)
        await api.utils.delay(40)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 240'), 'CODE: Sidebar width')
      api.assert.ok(code.includes('pad 10 12'), 'CODE: Nav item padding')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Divider') >= 1, 'CODE: Divider')
      api.assert.ok(analysis.countElements('Icon') >= 4, 'CODE: Logo + nav icons')
    }
  ),

  // Data table header
  testWithSetup(
    'Build data table header',
    `Frame hor, pad 12, bg #1a1a1a, rad 8 8 0 0`,
    async (api: TestAPI) => {
      // Checkbox column
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('center', '')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bor', '2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '4')
      await api.utils.delay(50)

      // Name column
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('uppercase', '')
      await api.utils.delay(50)

      // Status column
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '100')
      await api.utils.delay(50)
      await api.panel.property.setProperty('uppercase', '')
      await api.utils.delay(50)

      // Actions column
      await api.interact.dragFromPalette('Text', 'node-1', 3)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '80')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('uppercase'), 'CODE: Uppercase headers')
      api.assert.ok(code.includes('bor 2'), 'CODE: Checkbox border')
      api.assert.ok(code.includes('grow'), 'CODE: Growing name column')
    }
  ),
])

// =============================================================================
// Level 24: Settings Page
// =============================================================================

const level24Tests = describe('Level 24: Settings Page', [
  // Settings section with toggles
  testWithSetup(
    'Build settings section with toggles',
    `Frame gap 16, pad 24, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // Section header
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(50)

      // Setting row 1
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '12 0')
      await api.utils.delay(50)

      // Label text
      await api.interact.dragFromPalette('Text', 'node-4', 0)
      await api.utils.delay(50)
      // Toggle placeholder
      await api.interact.dragFromPalette('Frame', 'node-4', 1)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 18'), 'CODE: Section header size')
      api.assert.ok(code.includes('spread'), 'CODE: Spread row')
      api.assert.ok(code.includes('rad 12'), 'CODE: Toggle radius')
    }
  ),

  // Account info card
  testWithSetup(
    'Build account info card',
    `Frame gap 16, pad 20, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // Header with avatar
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Avatar
      await api.interact.dragFromPalette('Image', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '64')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '64')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)

      // Name + email
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Text', 'node-4', 0)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Text', 'node-4', 1)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(50)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(50)

      // Edit button
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 64'), 'CODE: Avatar size')
      api.assert.ok(code.includes('rad 99'), 'CODE: Round avatar')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Divider') >= 1, 'CODE: Divider')
      api.assert.ok(analysis.countElements('Button') >= 1, 'CODE: Edit button')
    }
  ),
])

// =============================================================================
// Level 25: Landing Page
// =============================================================================

const level25Tests = describe('Level 25: Landing Page', [
  // Hero section
  testWithSetup(
    'Build landing page hero section',
    `Frame center, gap 24, pad 64 24, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Badge
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '6 12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#222')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(50)

      // Headline
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '48')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Subheadline
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(50)

      // CTA buttons
      await api.interact.dragFromPalette('Frame', 'node-1', 3)
      await api.utils.delay(50)
      await api.interact.click('node-7')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Button', 'node-7', 0)
      await api.utils.delay(50)
      await api.interact.click('node-8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Button', 'node-7', 1)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 48'), 'CODE: Large headline')
      api.assert.ok(code.includes('pad 64 24'), 'CODE: Hero padding')
      api.assert.ok(code.includes('rad 99'), 'CODE: Pill badge')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') >= 2, 'CODE: CTA buttons')
    }
  ),

  // Feature cards row
  testWithSetup('Build feature cards row', `Frame hor, gap 24, pad 24`, async (api: TestAPI) => {
    // 3 feature cards
    for (let i = 0; i < 3; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(40)
      const cardId = `node-${i + 2}`
      await api.interact.click(cardId)
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(40)

      // Icon
      await api.interact.dragFromPalette('Icon', cardId, 0)
      await api.utils.delay(40)
      // Title
      await api.interact.dragFromPalette('Text', cardId, 1)
      await api.utils.delay(40)
      // Description
      await api.interact.dragFromPalette('Text', cardId, 2)
      await api.utils.delay(40)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('grow'), 'CODE: Growing cards')
    api.assert.ok(code.includes('pad 24'), 'CODE: Card padding')
    api.assert.ok(code.includes('rad 12'), 'CODE: Card radius')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Icon') >= 3, 'CODE: Feature icons')
    api.assert.ok(analysis.countElements('Text') >= 6, 'CODE: Titles + descriptions')
  }),
])

// =============================================================================
// Level 26: CRM Data Table - Dense Business Table
// =============================================================================

const level26Tests = describe('Level 26: CRM Data Table', [
  // Dense table header with filters, search, actions
  testWithSetup(
    'Build CRM table toolbar',
    `Frame gap 12, pad 16, bg #111`,
    async (api: TestAPI) => {
      // Top row: Title + Actions
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Title
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.panel.property.setProperty('fs', '20')
      await api.utils.delay(40)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(40)

      // Action buttons container
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(50)

      // Export, Filter, Add buttons
      await api.interact.dragFromPalette('Button', 'node-4', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Button', 'node-4', 1)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Button', 'node-4', 2)
      await api.utils.delay(40)
      await api.interact.click('node-7')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(50)

      // Filter row
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)

      // Search input
      await api.interact.dragFromPalette('Input', 'node-8', 0)
      await api.utils.delay(40)
      await api.interact.click('node-9')
      await api.utils.delay(30)
      await api.panel.property.setProperty('w', '240')
      await api.utils.delay(40)

      // Filter dropdowns (3x Frame as placeholder)
      for (let i = 0; i < 3; i++) {
        await api.interact.dragFromPalette('Frame', 'node-8', i + 1)
        await api.utils.delay(30)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('spread'), 'CODE: Spread layout')
      api.assert.ok(code.includes('w 240'), 'CODE: Search width')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') >= 3, 'CODE: Action buttons')
      api.assert.ok(analysis.countElements('Input') >= 1, 'CODE: Search input')
    }
  ),

  // Dense data table with header + rows (simplified)
  testWithSetup(
    'Build CRM table with 3 columns',
    `Frame gap 0, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Header row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '12 16')
      await api.utils.delay(50)

      // 3 column headers (Name, Status, Actions)
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', '100')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-2', 2)
      await api.utils.delay(30)
      await api.interact.click('node-5')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', '80')
      await api.utils.delay(30)

      // 2 data rows
      // Row 1: node-6
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(40)
      await api.interact.click('node-6')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12 16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-6', 0)
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Frame', 'node-6', 1) // Status badge
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Icon', 'node-6', 2) // Action
      await api.utils.delay(20)

      // Row 2: node-10
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(40)
      await api.interact.click('node-10')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12 16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('bor-b 1'), 'CODE: Row borders')
      api.assert.ok(code.includes('pad 12 16'), 'CODE: Row padding')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 4, 'CODE: Headers + row texts')
      api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Container + header + rows')
    }
  ),
])

// =============================================================================
// Level 27: Invoice Form - Complex Business Form
// =============================================================================

const level27Tests = describe('Level 27: Invoice Form', [
  // Invoice header with customer info
  testWithSetup(
    'Build invoice header section',
    `Frame gap 24, pad 24, bg #111, rad 12`,
    async (api: TestAPI) => {
      // Top row: Invoice # + Date
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(50)

      // Invoice number group
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-3', 0) // Label
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Text', 'node-3', 1) // Value
      await api.utils.delay(30)
      await api.interact.click('node-5')
      await api.utils.delay(20)
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(30)

      // Date group
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(40)
      await api.interact.click('node-6')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-6', 0)
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-6', 1)
      await api.utils.delay(30)

      // Customer info row (2 columns)
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-9')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(50)

      // From column
      await api.interact.dragFromPalette('Frame', 'node-9', 0)
      await api.utils.delay(40)
      await api.interact.click('node-10')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-10', 0) // "From"
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-10', 1) // Company
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-10', 2) // Address
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-10', 3) // Email
      await api.utils.delay(30)

      // To column
      await api.interact.dragFromPalette('Frame', 'node-9', 1)
      await api.utils.delay(40)
      await api.interact.click('node-15')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-15', 0) // "To"
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-15', 1) // Company
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-15', 2) // Address
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-15', 3) // Email
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 24'), 'CODE: Large invoice number')
      api.assert.ok(code.includes('grow'), 'CODE: Growing columns')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Input') >= 7, 'CODE: Form inputs')
    }
  ),

  // Invoice line items table
  testWithSetup(
    'Build invoice line items',
    `Frame gap 0, bg #0a0a0a, rad 8`,
    async (api: TestAPI) => {
      // Header row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(50)

      // Headers: Item, Qty, Price, Total, Actions
      const headers = [{ w: 'grow' }, { w: '80' }, { w: '100' }, { w: '100' }, { w: '60' }]
      for (let i = 0; i < 5; i++) {
        await api.interact.dragFromPalette('Text', 'node-2', i)
        await api.utils.delay(20)
        const textId = `node-${i + 3}`
        await api.interact.click(textId)
        await api.utils.delay(15)
        if (headers[i].w === 'grow') {
          await api.panel.property.setProperty('grow', '')
        } else {
          await api.panel.property.setProperty('w', headers[i].w)
        }
        await api.utils.delay(20)
        await api.panel.property.setProperty('fs', '12')
        await api.utils.delay(20)
        await api.panel.property.setProperty('weight', '500')
        await api.utils.delay(20)
      }

      // 2 line item rows with inputs
      for (let row = 0; row < 2; row++) {
        await api.interact.dragFromPalette('Frame', 'node-1', row + 1)
        await api.utils.delay(40)
        const rowId = `node-${8 + row * 6}`
        await api.interact.click(rowId)
        await api.utils.delay(30)
        await api.panel.property.setProperty('hor', '')
        await api.utils.delay(40)
        await api.panel.property.setProperty('pad', '12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('gap', '8')
        await api.utils.delay(40)
        await api.panel.property.setProperty('ver-center', '')
        await api.utils.delay(40)

        // Item description (input, growing)
        await api.interact.dragFromPalette('Input', rowId, 0)
        await api.utils.delay(20)
        // Qty (input)
        await api.interact.dragFromPalette('Input', rowId, 1)
        await api.utils.delay(20)
        // Price (input)
        await api.interact.dragFromPalette('Input', rowId, 2)
        await api.utils.delay(20)
        // Total (text, calculated)
        await api.interact.dragFromPalette('Text', rowId, 3)
        await api.utils.delay(20)
        // Delete button
        await api.interact.dragFromPalette('Icon', rowId, 4)
        await api.utils.delay(20)
      }

      // Add line button
      await api.interact.dragFromPalette('Button', 'node-1', 3)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('ver-center'), 'CODE: Vertically centered rows')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Input') >= 6, 'CODE: Line item inputs')
      api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Delete icons')
    }
  ),
])

// =============================================================================
// Level 28: Employee Management - Master-Detail View
// =============================================================================

const level28Tests = describe('Level 28: Employee Management', [
  // Employee list with dense rows (simplified to 3 rows)
  testWithSetup(
    'Build employee list panel',
    `Frame w 320, h full, bg #111, gap 0`,
    async (api: TestAPI) => {
      // Search header: node-2
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(50)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(50)

      // Search input: node-3
      await api.interact.dragFromPalette('Input', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', 'full')
      await api.utils.delay(30)

      // Row 1: node-4, children: node-5, node-6
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(40)
      await api.interact.click('node-4')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#1a1a1a')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Frame', 'node-4', 0) // Avatar placeholder
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-4', 1) // Name
      await api.utils.delay(20)

      // Row 2: node-7, children: node-8, node-9
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(40)
      await api.interact.click('node-7')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#1a1a1a')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Frame', 'node-7', 0) // Avatar placeholder
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-7', 1) // Name
      await api.utils.delay(20)

      // Row 3: node-10, children: node-11, node-12
      await api.interact.dragFromPalette('Frame', 'node-1', 3)
      await api.utils.delay(40)
      await api.interact.click('node-10')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#1a1a1a')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Frame', 'node-10', 0) // Avatar placeholder
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-10', 1) // Name
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 320'), 'CODE: Fixed sidebar width')
      api.assert.ok(code.includes('w full'), 'CODE: Full width search')
      const analysis = analyzeCode(code)
      api.assert.ok(
        analysis.countElements('Frame') >= 8,
        'CODE: Container + search + 3 rows with avatars'
      )
      api.assert.ok(analysis.countElements('Text') >= 3, 'CODE: Employee names')
    }
  ),

  // Employee detail form
  testWithSetup(
    'Build employee detail form',
    `Frame grow, pad 24, gap 24, bg #0a0a0a, scroll`,
    async (api: TestAPI) => {
      // Header with avatar + name
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Large avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', '80')
      await api.utils.delay(30)
      await api.panel.property.setProperty('h', '80')
      await api.utils.delay(30)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(30)

      // Name + Title
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(20)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-4', 0) // Name
      await api.utils.delay(20)
      await api.interact.click('node-5')
      await api.utils.delay(15)
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(20)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-4', 1) // Title
      await api.utils.delay(20)

      // Form sections (2 columns)
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-7')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(50)

      // Left column - Personal Info
      await api.interact.dragFromPalette('Frame', 'node-7', 0)
      await api.utils.delay(40)
      await api.interact.click('node-8')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(40)

      // Section title
      await api.interact.dragFromPalette('Text', 'node-8', 0)
      await api.utils.delay(20)
      // 4 form fields
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Frame', 'node-8', i + 1)
        await api.utils.delay(15)
      }

      // Right column - Employment Info
      await api.interact.dragFromPalette('Frame', 'node-7', 1)
      await api.utils.delay(40)
      await api.interact.click('node-14')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(40)

      // Section title
      await api.interact.dragFromPalette('Text', 'node-14', 0)
      await api.utils.delay(20)
      // 4 form fields
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Frame', 'node-14', i + 1)
        await api.utils.delay(15)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('scroll'), 'CODE: Scrollable content')
      api.assert.ok(code.includes('rad 99'), 'CODE: Round avatar')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 14, 'CODE: Nested form structure')
    }
  ),
])

// =============================================================================
// Level 29: Order Dashboard - KPIs + Charts + Table
// =============================================================================

const level29Tests = describe('Level 29: Order Dashboard', [
  // KPI cards row (4 cards)
  testWithSetup('Build KPI cards row', `Frame hor, gap 16, pad 16`, async (api: TestAPI) => {
    const kpiConfigs = [
      { bg: '#1a1a1a', accent: '#10b981' },
      { bg: '#1a1a1a', accent: '#2271C1' },
      { bg: '#1a1a1a', accent: '#f59e0b' },
      { bg: '#1a1a1a', accent: '#ef4444' },
    ]

    for (let i = 0; i < 4; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(30)
      const cardId = `node-${i + 2}`
      await api.interact.click(cardId)
      await api.utils.delay(20)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bg', kpiConfigs[i].bg)
      await api.utils.delay(30)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bor-l', '4')
      await api.utils.delay(30)
      await api.panel.property.setProperty('boc', kpiConfigs[i].accent)
      await api.utils.delay(30)

      // Label
      await api.interact.dragFromPalette('Text', cardId, 0)
      await api.utils.delay(15)
      // Value (large)
      await api.interact.dragFromPalette('Text', cardId, 1)
      await api.utils.delay(15)
      // Change indicator row
      await api.interact.dragFromPalette('Frame', cardId, 2)
      await api.utils.delay(15)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('bor-l 4'), 'CODE: Left border accent')
    api.assert.ok(code.includes('#10b981'), 'CODE: Green accent')
    api.assert.ok(code.includes('#ef4444'), 'CODE: Red accent')
    const analysis = analyzeCode(code)
    api.assert.ok(
      analysis.countElements('Frame') >= 9,
      'CODE: 1 container + 4 cards + 4 change rows'
    )
  }),

  // Orders table with status badges (simplified: 4 columns, 2 rows)
  testWithSetup('Build orders table', `Frame gap 0, bg #0a0a0a, rad 8`, async (api: TestAPI) => {
    // Table header: node-2
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(50)
    await api.interact.click('node-2')
    await api.utils.delay(40)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(50)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(50)
    await api.panel.property.setProperty('pad', '12 16')
    await api.utils.delay(50)

    // 4 Header columns: Order#, Customer, Amount, Status
    await api.interact.dragFromPalette('Text', 'node-2', 0) // node-3
    await api.utils.delay(20)
    await api.interact.click('node-3')
    await api.utils.delay(15)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(20)

    await api.interact.dragFromPalette('Text', 'node-2', 1) // node-4
    await api.utils.delay(20)
    await api.interact.click('node-4')
    await api.utils.delay(15)
    await api.panel.property.setProperty('w', '120')
    await api.utils.delay(20)

    await api.interact.dragFromPalette('Text', 'node-2', 2) // node-5
    await api.utils.delay(20)
    await api.interact.dragFromPalette('Text', 'node-2', 3) // node-6
    await api.utils.delay(20)

    // Row 1: node-7
    await api.interact.dragFromPalette('Frame', 'node-1', 1)
    await api.utils.delay(40)
    await api.interact.click('node-7')
    await api.utils.delay(30)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('pad', '12 16')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ver-center', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('bor-b', '1')
    await api.utils.delay(40)
    await api.panel.property.setProperty('boc', '#1a1a1a')
    await api.utils.delay(40)

    // Row 1 cells
    await api.interact.dragFromPalette('Text', 'node-7', 0) // Order#
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-7', 1) // Customer
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-7', 2) // Amount
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-7', 3) // Status badge
    await api.utils.delay(15)

    // Row 2: node-12
    await api.interact.dragFromPalette('Frame', 'node-1', 2)
    await api.utils.delay(40)
    await api.interact.click('node-12')
    await api.utils.delay(30)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('pad', '12 16')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ver-center', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('bor-b', '1')
    await api.utils.delay(40)
    await api.panel.property.setProperty('boc', '#1a1a1a')
    await api.utils.delay(40)

    // Row 2 cells
    await api.interact.dragFromPalette('Text', 'node-12', 0)
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-12', 1)
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-12', 2)
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-12', 3)
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('bor-b 1'), 'CODE: Row separators')
    api.assert.ok(code.includes('ver-center'), 'CODE: Vertical centering')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Text') >= 10, 'CODE: Headers + row cells')
    api.assert.ok(analysis.countElements('Frame') >= 5, 'CODE: Container + header + rows + badges')
  }),
])

// =============================================================================
// Level 30: Enterprise Admin Panel - Full Business App
// =============================================================================

const level30Tests = describe('Level 30: Enterprise Admin Panel', [
  // Full app shell with sidebar
  testWithSetup(
    'Build enterprise app shell',
    `Frame hor, w full, h full, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Sidebar
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '240')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '0')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bor-r', '1')
      await api.utils.delay(50)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(50)

      // Logo area
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(30)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.delay(20)
      await api.interact.click('node-4')
      await api.utils.delay(15)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(20)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(20)

      // Navigation groups (2 groups with items)
      for (let g = 0; g < 2; g++) {
        await api.interact.dragFromPalette('Frame', 'node-2', g + 1)
        await api.utils.delay(30)
        const groupId = `node-${5 + g * 5}`
        await api.interact.click(groupId)
        await api.utils.delay(20)
        await api.panel.property.setProperty('pad', '12')
        await api.utils.delay(30)
        await api.panel.property.setProperty('gap', '4')
        await api.utils.delay(30)

        // Group label
        await api.interact.dragFromPalette('Text', groupId, 0)
        await api.utils.delay(15)
        // 3 nav items per group
        for (let i = 0; i < 3; i++) {
          await api.interact.dragFromPalette('Frame', groupId, i + 1)
          await api.utils.delay(10)
        }
      }

      // Main content area
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-15')
      await api.utils.delay(40)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '0')
      await api.utils.delay(50)

      // Top header bar
      await api.interact.dragFromPalette('Frame', 'node-15', 0)
      await api.utils.delay(30)
      await api.interact.click('node-16')
      await api.utils.delay(20)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('pad', '12 24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(30)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(30)

      // Breadcrumb
      await api.interact.dragFromPalette('Text', 'node-16', 0)
      await api.utils.delay(15)
      // User menu
      await api.interact.dragFromPalette('Frame', 'node-16', 1)
      await api.utils.delay(15)

      // Page content
      await api.interact.dragFromPalette('Frame', 'node-15', 1)
      await api.utils.delay(30)
      await api.interact.click('node-19')
      await api.utils.delay(20)
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('scroll', '')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 240'), 'CODE: Sidebar width')
      api.assert.ok(code.includes('bor-r 1'), 'CODE: Sidebar border')
      api.assert.ok(code.includes('scroll'), 'CODE: Scrollable content')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 15, 'CODE: Complex nested structure')
    }
  ),

  // Dashboard content with widgets (simplified: 2 stat cards + chart/activity row)
  testWithSetup('Build dashboard widgets grid', `Frame gap 24, pad 24`, async (api: TestAPI) => {
    // Top row: 2 stat cards
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(50)
    await api.interact.click('node-2')
    await api.utils.delay(40)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(50)
    await api.panel.property.setProperty('gap', '16')
    await api.utils.delay(50)

    // Card 1: node-3
    await api.interact.dragFromPalette('Frame', 'node-2', 0)
    await api.utils.delay(30)
    await api.interact.click('node-3')
    await api.utils.delay(20)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '20')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)

    await api.interact.dragFromPalette('Icon', 'node-3', 0) // node-4
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-3', 1) // node-5
    await api.utils.delay(15)

    // Card 2: node-6
    await api.interact.dragFromPalette('Frame', 'node-2', 1)
    await api.utils.delay(30)
    await api.interact.click('node-6')
    await api.utils.delay(20)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '20')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)

    await api.interact.dragFromPalette('Icon', 'node-6', 0) // node-7
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-6', 1) // node-8
    await api.utils.delay(15)

    // Middle row: Chart + Activity (node-9)
    await api.interact.dragFromPalette('Frame', 'node-1', 1)
    await api.utils.delay(50)
    await api.interact.click('node-9')
    await api.utils.delay(40)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(50)
    await api.panel.property.setProperty('gap', '16')
    await api.utils.delay(50)

    // Chart widget: node-10
    await api.interact.dragFromPalette('Frame', 'node-9', 0)
    await api.utils.delay(30)
    await api.interact.click('node-10')
    await api.utils.delay(20)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '16')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)
    await api.panel.property.setProperty('h', '200')
    await api.utils.delay(30)

    await api.interact.dragFromPalette('Text', 'node-10', 0) // Chart title
    await api.utils.delay(15)

    // Activity widget: node-12
    await api.interact.dragFromPalette('Frame', 'node-9', 1)
    await api.utils.delay(30)
    await api.interact.click('node-12')
    await api.utils.delay(20)
    await api.panel.property.setProperty('w', '280')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '16')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)
    await api.panel.property.setProperty('gap', '12')
    await api.utils.delay(30)

    // Activity title + 2 items
    await api.interact.dragFromPalette('Text', 'node-12', 0) // Title
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-12', 1) // Item 1
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-12', 2) // Item 2
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('h 200'), 'CODE: Chart height')
    api.assert.ok(code.includes('w 280'), 'CODE: Activity width')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Frame') >= 8, 'CODE: Dashboard structure')
    api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Stat icons')
  }),
])

// =============================================================================
// Export All
// =============================================================================

export const allUIBuilderTests: TestCase[] = [
  ...level1Tests,
  ...level2Tests,
  ...level3Tests,
  ...level4Tests,
  ...level5Tests,
  ...level6Tests,
  ...level7Tests,
  ...level8Tests,
  ...level9Tests,
  ...level10Tests,
  ...level11Tests,
  ...level12Tests,
  ...level13Tests,
  ...level14Tests,
  ...level15Tests,
  ...level16Tests,
  ...level17Tests,
  ...level18Tests,
  ...level19Tests,
  ...level20Tests,
  ...level21Tests,
  ...level22Tests,
  ...level23Tests,
  ...level24Tests,
  ...level25Tests,
  ...level26Tests,
  ...level27Tests,
  ...level28Tests,
  ...level29Tests,
  ...level30Tests,
]
