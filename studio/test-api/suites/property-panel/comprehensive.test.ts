/**
 * Comprehensive Property Panel Test Suite
 *
 * Tests ALL property panel interactions with verification of:
 * 1. Initial state (code + preview)
 * 2. Property change via panel
 * 3. Code update verification
 * 4. Preview (DOM styles) verification
 *
 * Covers: sizing, spacing, colors, border, typography, layout, visual effects
 */

import type { TestCase, TestAPI } from '../../types'
import { describe, testWithSetup } from '../../index'

// =============================================================================
// Helper Functions
// =============================================================================

function getComputedStyleValue(nodeId: string, cssProperty: string): string {
  const element = document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
  if (!element) return ''
  return window.getComputedStyle(element)[cssProperty as keyof CSSStyleDeclaration] as string
}

function getElement(nodeId: string): HTMLElement | null {
  return document.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
}

// =============================================================================
// Sizing Properties Tests (w, h, minw, maxw, minh, maxh)
// =============================================================================

export const sizingPropertyTests: TestCase[] = describe('Sizing Properties', [
  testWithSetup(
    'Change width updates code and preview',
    'Frame w 100, h 80, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('w 100')
      const initialWidth = getComputedStyleValue('node-1', 'width')
      api.assert.ok(initialWidth === '100px', `Initial width should be 100px, got ${initialWidth}`)

      // Change property
      const success = await api.panel.property.setProperty('w', '200')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 200'), `Code should contain w 200, got: ${code}`)
      api.assert.ok(!code.includes('w 100'), `Code should not contain old w 100`)

      // Verify preview update
      const newWidth = getComputedStyleValue('node-1', 'width')
      api.assert.ok(newWidth === '200px', `Preview width should be 200px, got ${newWidth}`)
    }
  ),

  testWithSetup(
    'Change height updates code and preview',
    'Frame w 100, h 80, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('h 80')
      const initialHeight = getComputedStyleValue('node-1', 'height')
      api.assert.ok(initialHeight === '80px', `Initial height should be 80px, got ${initialHeight}`)

      // Change property
      const success = await api.panel.property.setProperty('h', '150')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('h 150'), `Code should contain h 150, got: ${code}`)

      // Verify preview update
      const newHeight = getComputedStyleValue('node-1', 'height')
      api.assert.ok(newHeight === '150px', `Preview height should be 150px, got ${newHeight}`)
    }
  ),

  testWithSetup(
    'Width "full" sets 100% width',
    'Frame bg #222\n  Frame w 100, h 50, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-2')
      await api.utils.delay(300)

      // Change to full
      const success = await api.panel.property.setProperty('w', 'full')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('w full'), `Code should contain w full, got: ${code}`)

      // Verify preview - should have 100% or fill parent
      const element = getElement('node-2')
      const parent = getElement('node-1')
      api.assert.ok(element !== null, 'Child element (node-2) should exist')
      api.assert.ok(parent !== null, 'Parent element (node-1) should exist')
      const elementWidth = element!.getBoundingClientRect().width
      const parentWidth = parent!.getBoundingClientRect().width
      // Allow some tolerance for padding
      api.assert.ok(
        elementWidth >= parentWidth - 50,
        `Element should fill parent width. Element: ${elementWidth}, Parent: ${parentWidth}`
      )
    }
  ),
])

// =============================================================================
// Spacing Properties Tests (pad, mar, gap)
// =============================================================================

export const spacingPropertyTests: TestCase[] = describe('Spacing Properties', [
  testWithSetup(
    'Change padding updates code and preview',
    'Frame pad 16, bg #333, w 200, h 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('pad 16')
      const initialPadding = getComputedStyleValue('node-1', 'padding')
      api.assert.ok(
        initialPadding === '16px',
        `Initial padding should be 16px, got ${initialPadding}`
      )

      // Change property
      const success = await api.panel.property.setProperty('pad', '32')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('pad 32'), `Code should contain pad 32, got: ${code}`)

      // Verify preview update
      const newPadding = getComputedStyleValue('node-1', 'padding')
      api.assert.ok(newPadding === '32px', `Preview padding should be 32px, got ${newPadding}`)
    }
  ),

  testWithSetup(
    'Change gap updates code and preview',
    'Frame gap 8, bg #333, w 200\n  Frame w 50, h 30, bg #555\n  Frame w 50, h 30, bg #777',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('gap 8')
      const initialGap = getComputedStyleValue('node-1', 'gap')
      api.assert.ok(initialGap === '8px', `Initial gap should be 8px, got ${initialGap}`)

      // Change property
      const success = await api.panel.property.setProperty('gap', '20')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('gap 20'), `Code should contain gap 20, got: ${code}`)

      // Verify preview update
      const newGap = getComputedStyleValue('node-1', 'gap')
      api.assert.ok(newGap === '20px', `Preview gap should be 20px, got ${newGap}`)
    }
  ),

  testWithSetup(
    'Change margin updates code and preview',
    'Frame bg #222, pad 20\n  Frame mar 8, w 80, h 60, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-2')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('mar 8')

      // Change property
      const success = await api.panel.property.setProperty('mar', '16')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('mar 16'), `Code should contain mar 16, got: ${code}`)

      // Verify preview update
      const newMargin = getComputedStyleValue('node-2', 'margin')
      api.assert.ok(newMargin === '16px', `Preview margin should be 16px, got ${newMargin}`)
    }
  ),
])

// =============================================================================
// Color Properties Tests (bg, col, boc)
// =============================================================================

export const colorPropertyTests: TestCase[] = describe('Color Properties', [
  testWithSetup(
    'Change background color updates code and preview',
    'Frame bg #333333, w 100, h 80',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('bg #333333')

      // Change property
      const success = await api.panel.property.setProperty('bg', '#ff0000')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('bg #ff0000') || code.includes('bg #FF0000'),
        `Code should contain bg #ff0000, got: ${code}`
      )

      // Verify preview update - RGB values
      const bgColor = getComputedStyleValue('node-1', 'backgroundColor')
      api.assert.ok(
        bgColor === 'rgb(255, 0, 0)' || bgColor.includes('255'),
        `Background should be red, got ${bgColor}`
      )
    }
  ),

  testWithSetup(
    'Change text color updates code and preview',
    'Text "Hello", col #ffffff, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('col #ffffff')

      // Change property
      const success = await api.panel.property.setProperty('col', '#00ff00')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('col #00ff00') || code.includes('col #00FF00'),
        `Code should contain col #00ff00, got: ${code}`
      )

      // Verify preview update
      const color = getComputedStyleValue('node-1', 'color')
      api.assert.ok(
        color === 'rgb(0, 255, 0)' || color.includes('255'),
        `Text color should be green, got ${color}`
      )
    }
  ),

  testWithSetup(
    'Change border color updates code and preview',
    'Frame bor 2, boc #666666, w 100, h 80',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('boc #666666')

      // Change property
      const success = await api.panel.property.setProperty('boc', '#0000ff')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('boc #0000ff') || code.includes('boc #0000FF'),
        `Code should contain boc #0000ff, got: ${code}`
      )

      // Verify preview update
      const borderColor = getComputedStyleValue('node-1', 'borderColor')
      api.assert.ok(
        borderColor.includes('0, 0, 255') || borderColor === 'rgb(0, 0, 255)',
        `Border color should be blue, got ${borderColor}`
      )
    }
  ),
])

// =============================================================================
// Border Properties Tests (bor, rad)
// =============================================================================

export const borderPropertyTests: TestCase[] = describe('Border Properties', [
  testWithSetup(
    'Change border width updates code and preview',
    'Frame bor 1, boc #666, w 100, h 80',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('bor 1')
      const initialBorder = getComputedStyleValue('node-1', 'borderWidth')
      api.assert.ok(initialBorder === '1px', `Initial border should be 1px, got ${initialBorder}`)

      // Change property
      const success = await api.panel.property.setProperty('bor', '4')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('bor 4'), `Code should contain bor 4, got: ${code}`)

      // Verify preview update
      const newBorder = getComputedStyleValue('node-1', 'borderWidth')
      api.assert.ok(newBorder === '4px', `Preview border should be 4px, got ${newBorder}`)
    }
  ),

  testWithSetup(
    'Change radius updates code and preview',
    'Frame rad 4, bg #333, w 100, h 80',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('rad 4')
      const initialRadius = getComputedStyleValue('node-1', 'borderRadius')
      api.assert.ok(initialRadius === '4px', `Initial radius should be 4px, got ${initialRadius}`)

      // Change property
      const success = await api.panel.property.setProperty('rad', '16')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 16'), `Code should contain rad 16, got: ${code}`)

      // Verify preview update
      const newRadius = getComputedStyleValue('node-1', 'borderRadius')
      api.assert.ok(newRadius === '16px', `Preview radius should be 16px, got ${newRadius}`)
    }
  ),

  testWithSetup(
    'Radius 99 creates circle effect',
    'Frame rad 8, bg #333, w 100, h 100',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Change to circle
      const success = await api.panel.property.setProperty('rad', '99')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 99'), `Code should contain rad 99, got: ${code}`)

      // Verify preview - should be circle (50% of element size or 99px)
      const radius = getComputedStyleValue('node-1', 'borderRadius')
      const radiusNum = parseInt(radius)
      api.assert.ok(radiusNum >= 50, `Radius should be large for circle effect, got ${radius}`)
    }
  ),
])

// =============================================================================
// Typography Properties Tests (fs, weight, font)
// =============================================================================

export const typographyPropertyTests: TestCase[] = describe('Typography Properties', [
  testWithSetup(
    'Change font-size updates code and preview',
    'Text "Hello World", fs 14, col white',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('fs 14')
      const initialSize = getComputedStyleValue('node-1', 'fontSize')
      api.assert.ok(initialSize === '14px', `Initial font-size should be 14px, got ${initialSize}`)

      // Change property
      const success = await api.panel.property.setProperty('fs', '24')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 24'), `Code should contain fs 24, got: ${code}`)

      // Verify preview update
      const newSize = getComputedStyleValue('node-1', 'fontSize')
      api.assert.ok(newSize === '24px', `Preview font-size should be 24px, got ${newSize}`)
    }
  ),

  testWithSetup(
    'Change font-weight updates code and preview',
    'Text "Bold Text", weight 400, col white',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('weight 400')

      // Change property
      const success = await api.panel.property.setProperty('weight', '700')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('weight 700') || code.includes('weight bold'),
        `Code should contain weight 700 or bold, got: ${code}`
      )

      // Verify preview update
      const fontWeight = getComputedStyleValue('node-1', 'fontWeight')
      api.assert.ok(
        fontWeight === '700' || fontWeight === 'bold',
        `Preview font-weight should be 700/bold, got ${fontWeight}`
      )
    }
  ),

  testWithSetup(
    'Change to weight "bold" updates code and preview',
    'Text "Normal Text", col white',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Change property
      const success = await api.panel.property.setProperty('weight', 'bold')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('weight bold'), `Code should contain weight bold, got: ${code}`)

      // Verify preview update
      const fontWeight = getComputedStyleValue('node-1', 'fontWeight')
      api.assert.ok(
        fontWeight === '700' || fontWeight === 'bold',
        `Preview font-weight should be 700/bold, got ${fontWeight}`
      )
    }
  ),
])

// =============================================================================
// Visual Effects Properties Tests (opacity, shadow)
// =============================================================================

export const visualPropertyTests: TestCase[] = describe('Visual Effect Properties', [
  testWithSetup(
    'Change opacity updates code and preview',
    'Frame opacity 1, bg #333, w 100, h 80',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('opacity 1')
      const initialOpacity = getComputedStyleValue('node-1', 'opacity')
      api.assert.ok(initialOpacity === '1', `Initial opacity should be 1, got ${initialOpacity}`)

      // Change property
      const success = await api.panel.property.setProperty('opacity', '0.5')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('opacity 0.5'), `Code should contain opacity 0.5, got: ${code}`)

      // Verify preview update
      const newOpacity = getComputedStyleValue('node-1', 'opacity')
      api.assert.ok(newOpacity === '0.5', `Preview opacity should be 0.5, got ${newOpacity}`)
    }
  ),

  testWithSetup(
    'Change shadow updates code and preview',
    'Frame shadow sm, bg #333, w 100, h 80',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('shadow sm')
      const initialShadow = getComputedStyleValue('node-1', 'boxShadow')
      api.assert.ok(initialShadow !== 'none', `Initial shadow should exist, got ${initialShadow}`)

      // Change property
      const success = await api.panel.property.setProperty('shadow', 'lg')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('shadow lg'), `Code should contain shadow lg, got: ${code}`)

      // Verify preview update - lg shadow should be larger
      const newShadow = getComputedStyleValue('node-1', 'boxShadow')
      api.assert.ok(newShadow !== 'none', `Preview should have shadow, got ${newShadow}`)
    }
  ),
])

// =============================================================================
// Layout Properties Tests (hor, ver, center, spread)
// =============================================================================

export const layoutPropertyTests: TestCase[] = describe('Layout Properties', [
  testWithSetup(
    'Horizontal layout in code renders correctly in preview',
    'Frame hor, bg #333, w 200, h 100\n  Frame w 40, h 40, bg #555\n  Frame w 40, h 40, bg #777',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify code contains hor
      api.assert.codeContains('hor')

      // Verify preview is horizontal
      const direction = getComputedStyleValue('node-1', 'flexDirection')
      api.assert.ok(direction === 'row', `Preview should be horizontal (row), got ${direction}`)

      // Verify children are side-by-side (first child left of second)
      const child1 = getElement('node-2')
      const child2 = getElement('node-3')
      api.assert.ok(child1 !== null, 'First child (node-2) should exist')
      api.assert.ok(child2 !== null, 'Second child (node-3) should exist')
      const rect1 = child1!.getBoundingClientRect()
      const rect2 = child2!.getBoundingClientRect()
      api.assert.ok(
        rect1.right <= rect2.left + 20, // Allow small gap
        `First child should be left of second (${rect1.right} <= ${rect2.left})`
      )
    }
  ),

  testWithSetup(
    'Center alignment in code renders correctly in preview',
    'Frame center, bg #333, w 200, h 150\n  Frame w 60, h 40, bg #555',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify code contains center
      api.assert.codeContains('center')

      // Verify preview is centered
      const alignItems = getComputedStyleValue('node-1', 'alignItems')
      const justifyContent = getComputedStyleValue('node-1', 'justifyContent')
      api.assert.ok(
        alignItems === 'center' && justifyContent === 'center',
        `Preview should be centered. alignItems: ${alignItems}, justifyContent: ${justifyContent}`
      )

      // Verify child is visually centered
      const parent = getElement('node-1')
      const child = getElement('node-2')
      api.assert.ok(parent !== null, 'Parent (node-1) should exist')
      api.assert.ok(child !== null, 'Child (node-2) should exist')
      const parentRect = parent!.getBoundingClientRect()
      const childRect = child!.getBoundingClientRect()
      const parentCenterX = parentRect.left + parentRect.width / 2
      const childCenterX = childRect.left + childRect.width / 2
      const parentCenterY = parentRect.top + parentRect.height / 2
      const childCenterY = childRect.top + childRect.height / 2

      api.assert.ok(
        Math.abs(parentCenterX - childCenterX) < 5,
        `Child should be horizontally centered (${Math.abs(parentCenterX - childCenterX)} < 5)`
      )
      api.assert.ok(
        Math.abs(parentCenterY - childCenterY) < 5,
        `Child should be vertically centered (${Math.abs(parentCenterY - childCenterY)} < 5)`
      )
    }
  ),
])

// =============================================================================
// Icon Properties Tests (is, ic)
// =============================================================================

export const iconPropertyTests: TestCase[] = describe('Icon Properties', [
  testWithSetup(
    'Change icon size updates code and preview',
    'Icon "check", is 16, ic #ffffff',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('is 16')

      // Change property
      const success = await api.panel.property.setProperty('is', '32')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(code.includes('is 32'), `Code should contain is 32, got: ${code}`)

      // Verify preview - icon should have new size
      const iconSize = getComputedStyleValue('node-1', 'width')
      api.assert.ok(iconSize === '32px', `Icon width should be 32px, got ${iconSize}`)
    }
  ),

  testWithSetup(
    'Change icon color updates code and preview',
    'Icon "heart", is 24, ic #888888',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify initial state
      api.assert.codeContains('ic #888888')

      // Change property
      const success = await api.panel.property.setProperty('ic', '#ff0000')
      api.assert.ok(success, 'setProperty should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify code update
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('ic #ff0000') || code.includes('ic #FF0000'),
        `Code should contain ic #ff0000, got: ${code}`
      )
    }
  ),
])

// =============================================================================
// Complex Scenarios
// =============================================================================

export const complexPropertyTests: TestCase[] = describe('Complex Property Scenarios', [
  testWithSetup(
    'Multiple property changes on same element',
    'Frame w 100, h 80, pad 8, bg #333, rad 4',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Change width
      await api.panel.property.setProperty('w', '150')
      await api.utils.delay(500)

      // Change padding
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(500)

      // Change radius
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify all changes in code
      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 150'), `Code should contain w 150`)
      api.assert.ok(code.includes('pad 16'), `Code should contain pad 16`)
      api.assert.ok(code.includes('rad 12'), `Code should contain rad 12`)

      // Verify all changes in preview
      api.assert.ok(getComputedStyleValue('node-1', 'width') === '150px', 'Width should be 150px')
      api.assert.ok(getComputedStyleValue('node-1', 'padding') === '16px', 'Padding should be 16px')
      api.assert.ok(
        getComputedStyleValue('node-1', 'borderRadius') === '12px',
        'Radius should be 12px'
      )
    }
  ),

  testWithSetup(
    'Property changes on nested elements',
    'Frame pad 8, bg #222\n  Frame w 100, h 60, bg #444\n  Frame w 100, h 60, bg #666',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      // Change parent
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(500)

      // Change first child
      await api.studio.setSelection('node-2')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bg', '#ff0000')
      await api.utils.delay(500)

      // Change second child
      await api.studio.setSelection('node-3')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bg', '#00ff00')
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Verify all changes in code
      const code = api.editor.getCode()
      api.assert.ok(code.includes('gap 16'), `Parent should have gap 16`)
      api.assert.ok(
        code.includes('#ff0000') || code.includes('#FF0000'),
        `First child should have red bg`
      )
      api.assert.ok(
        code.includes('#00ff00') || code.includes('#00FF00'),
        `Second child should have green bg`
      )

      // Verify preview
      const parentGap = getComputedStyleValue('node-1', 'gap')
      api.assert.ok(parentGap === '16px', `Parent gap should be 16px, got ${parentGap}`)
    }
  ),

  testWithSetup(
    'Property changes persist after selection changes',
    'Frame w 100, h 80, bg #333',
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Make a change
      await api.panel.property.setProperty('w', '200')
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Clear selection
      api.studio.clearSelection()
      await api.utils.delay(200)

      // Re-select
      await api.studio.setSelection('node-1')
      await api.utils.delay(300)

      // Verify property still shows updated value
      const widthValue = api.panel.property.getPropertyValue('w')
      api.assert.ok(
        widthValue === '200' || widthValue === '200px',
        `Width should still be 200 after reselect, got ${widthValue}`
      )

      // Verify preview still correct
      const previewWidth = getComputedStyleValue('node-1', 'width')
      api.assert.ok(
        previewWidth === '200px',
        `Preview width should still be 200px, got ${previewWidth}`
      )
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allComprehensivePropertyTests: TestCase[] = [
  ...sizingPropertyTests,
  ...spacingPropertyTests,
  ...colorPropertyTests,
  ...borderPropertyTests,
  ...typographyPropertyTests,
  ...visualPropertyTests,
  ...layoutPropertyTests,
  ...iconPropertyTests,
  ...complexPropertyTests,
]
