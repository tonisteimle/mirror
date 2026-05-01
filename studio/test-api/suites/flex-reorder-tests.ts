/**
 * Flex Container Reorder Tests
 *
 * Tests for reordering mixed component types in flex containers.
 * Each test uses different component types together to verify
 * drag & drop reordering works across all component combinations.
 */

import { testWithSetup, describe } from '../test-runner'
import type { TestCase, TestAPI } from '../types'

// =============================================================================
// Helper: Simple order verification using code positions
// =============================================================================

/**
 * Find position of component in code, avoiding substring matches
 * Uses regex to match component at start of word
 */
function findComponentPos(code: string, component: string): number {
  // Match component name followed by space, quote, or end of string (not as substring)
  const regex = new RegExp(`\\b${component}(?:\\s|"|$)`)
  const match = regex.exec(code)
  return match ? match.index : -1
}

/**
 * Verify that items appear in the expected order in the code
 * by checking their character positions
 */
function verifyCodeOrder(code: string, expectedOrder: string[]): { ok: boolean; actual: string[] } {
  const positions = expectedOrder.map(item => ({
    item,
    pos: findComponentPos(code, item),
  }))

  // Check all items were found
  const notFound = positions.filter(p => p.pos === -1)
  if (notFound.length > 0) {
    return { ok: false, actual: notFound.map(p => `${p.item}:NOT_FOUND`) }
  }

  // Check they're in ascending order
  const sorted = [...positions].sort((a, b) => a.pos - b.pos)
  const actualOrder = sorted.map(p => p.item)

  const isCorrectOrder = expectedOrder.every((item, i) => actualOrder[i] === item)
  return { ok: isCorrectOrder, actual: actualOrder }
}

// =============================================================================
// Mixed Components: Button + Text + Icon
// =============================================================================

export const buttonTextIconTests: TestCase[] = describe('Button + Text + Icon Reorder', [
  testWithSetup(
    'Move Button to first in vertical',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Label"
  Icon "star"
  Button "Click"`,
    async (api: TestAPI) => {
      // Move Button (node-4) to first position
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(buttonPos < textPos, `Button (${buttonPos}) should be before Text (${textPos})`)
    }
  ),

  testWithSetup(
    'Move Icon to middle position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Button "Action"
  Text "Message"
  Icon "check"`,
    async (api: TestAPI) => {
      // Move Icon (node-4) to middle (index 1)
      await api.interact.moveElement('node-4', 'node-1', 1)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(
        buttonPos < iconPos && iconPos < textPos,
        `Order should be Button(${buttonPos}) < Icon(${iconPos}) < Text(${textPos})`
      )
    }
  ),

  testWithSetup(
    'Move Text to end position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Status"
  Button "Submit"
  Icon "alert"`,
    async (api: TestAPI) => {
      // Move Text (node-2) to last position (index 2)
      await api.interact.moveElement('node-2', 'node-1', 2)

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(textPos > iconPos, `Text (${textPos}) should be after Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Horizontal: move last to first',
    `Frame hor, gap 8, bg #1a1a1a, pad 16
  Icon "home"
  Text "Welcome"
  Button "Enter"`,
    async (api: TestAPI) => {
      // Move Button to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(buttonPos < iconPos, `Button (${buttonPos}) should be before Icon (${iconPos})`)
    }
  ),
])

// =============================================================================
// Mixed Components: Input + Button + Text
// =============================================================================

export const inputButtonTextTests: TestCase[] = describe('Input + Button + Text Reorder', [
  testWithSetup(
    'Move Button before Input',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Enter name"
  Button "Submit"
  Text "Required"`,
    async (api: TestAPI) => {
      // Move Button to first
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Button', 'Input', 'Text'])
      api.assert.ok(result.ok, `Expected Button, Input, Text but got: ${result.actual.join(', ')}`)
    }
  ),

  testWithSetup(
    'Move Text between Input and Button',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Email"
  Button "Send"
  Text "We will contact you"`,
    async (api: TestAPI) => {
      // Move Text to middle
      await api.interact.moveElement('node-4', 'node-1', 1)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Input', 'Text', 'Button'])
      api.assert.ok(result.ok, `Expected Input, Text, Button but got: ${result.actual.join(', ')}`)
    }
  ),

  testWithSetup(
    'Swap Input and Button positions',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Search"
  Button "Go"`,
    async (api: TestAPI) => {
      // Move Button to first
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Button', 'Input'])
      api.assert.ok(result.ok, `Expected Button, Input but got: ${result.actual.join(', ')}`)
    }
  ),
])

// =============================================================================
// Mixed Components: Image + Text + Button
// =============================================================================

export const imageTextButtonTests: TestCase[] = describe('Image + Text + Button Reorder', [
  testWithSetup(
    'Move Button before Image (card layout)',
    `Frame gap 8, bg #1a1a1a, pad 16
  Image src "photo.jpg", w 200
  Text "Caption"
  Button "View"`,
    async (api: TestAPI) => {
      // Move Button to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const imagePos = findComponentPos(code, 'Image')
      api.assert.ok(
        buttonPos < imagePos,
        `Button (${buttonPos}) should be before Image (${imagePos})`
      )
    }
  ),

  testWithSetup(
    'Move first to middle position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Image src "avatar.png", w 100
  Text "Username"
  Button "Follow"`,
    async (api: TestAPI) => {
      // Move Image to middle (index 1)
      await api.interact.moveElement('node-2', 'node-1', 1)

      const code = api.editor.getCode()
      const imagePos = findComponentPos(code, 'Image')
      const textPos = findComponentPos(code, 'Text')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(
        textPos < imagePos && imagePos < buttonPos,
        `Order: Text(${textPos}) < Image(${imagePos}) < Button(${buttonPos})`
      )
    }
  ),

  testWithSetup(
    'Horizontal mixed: swap first and last',
    `Frame hor, gap 12, bg #1a1a1a, pad 16
  Icon "camera"
  Image src "thumb.jpg", w 50
  Text "Captured"`,
    async (api: TestAPI) => {
      // Move Text to first
      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(textPos < iconPos, `Text (${textPos}) should be before Icon (${iconPos})`)
    }
  ),
])

// =============================================================================
// Mixed Components: Link + Icon + Text
// =============================================================================

export const linkIconTextTests: TestCase[] = describe('Link + Icon + Text Reorder', [
  testWithSetup(
    'Move Link to middle',
    `Frame gap 8, bg #1a1a1a, pad 16
  Link "Read more", href "/article"
  Icon "arrow-right"
  Text "Continue"`,
    async (api: TestAPI) => {
      // Move Link to middle (index 1)
      await api.interact.moveElement('node-2', 'node-1', 1)

      const code = api.editor.getCode()
      const linkPos = findComponentPos(code, 'Link')
      const iconPos = findComponentPos(code, 'Icon')
      // After move, Icon should be first
      api.assert.ok(iconPos < linkPos, `Icon (${iconPos}) should be before Link (${linkPos})`)
    }
  ),

  testWithSetup(
    'Horizontal nav: move Icon to front',
    `Frame hor, gap 16, bg #1a1a1a, pad 12
  Link "Home"
  Link "About"
  Icon "search"`,
    async (api: TestAPI) => {
      // Move search Icon to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const searchPos = findComponentPos(code, 'Icon')
      const homePos = code.indexOf('"Home"')
      api.assert.ok(searchPos < homePos, `Icon (${searchPos}) should be before Home (${homePos})`)
    }
  ),
])

// =============================================================================
// Mixed Components: Divider + Spacer with others
// =============================================================================

export const dividerSpacerMixedTests: TestCase[] = describe('Divider + Spacer Mixed Reorder', [
  testWithSetup(
    'Move Divider position in form',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Section 1"
  Divider
  Text "Section 2"
  Button "Submit"`,
    async (api: TestAPI) => {
      // Move Divider to after Button (last)
      await api.interact.moveElement('node-3', 'node-1', 3)

      const code = api.editor.getCode()
      const dividerPos = findComponentPos(code, 'Divider')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(dividerPos > buttonPos, 'Divider should be after Button')
    }
  ),

  testWithSetup(
    'Move Spacer in layout',
    `Frame hor, gap 0, bg #1a1a1a, pad 16
  Text "Left"
  Spacer
  Button "Right"`,
    async (api: TestAPI) => {
      // Move Spacer to end
      await api.interact.moveElement('node-3', 'node-1', 2)

      const code = api.editor.getCode()
      const spacerPos = findComponentPos(code, 'Spacer')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(spacerPos > buttonPos, 'Spacer should be after Button')
    }
  ),

  testWithSetup(
    'Divider + Icon + Text',
    `Frame gap 8, bg #1a1a1a, pad 16
  Icon "info"
  Divider
  Text "Details"`,
    async (api: TestAPI) => {
      // Move Icon to last
      await api.interact.moveElement('node-2', 'node-1', 2)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Divider', 'Text', 'Icon'])
      api.assert.ok(result.ok, `Expected Divider, Text, Icon but got: ${result.actual.join(', ')}`)
    }
  ),
])

// =============================================================================
// Mixed Components: Textarea + Input + Button
// =============================================================================

export const textareaInputButtonTests: TestCase[] = describe('Textarea + Input + Button Reorder', [
  testWithSetup(
    'Contact form reorder',
    `Frame gap 12, bg #1a1a1a, pad 16
  Input placeholder "Subject"
  Textarea placeholder "Message"
  Button "Send"`,
    async (api: TestAPI) => {
      // Move Textarea to first
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const result = verifyCodeOrder(code, ['Textarea', 'Input', 'Button'])
      api.assert.ok(
        result.ok,
        `Expected Textarea, Input, Button but got: ${result.actual.join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Move Button before form fields',
    `Frame gap 12, bg #1a1a1a, pad 16
  Text "Contact Us"
  Input placeholder "Email"
  Textarea placeholder "Your message"
  Button "Submit"`,
    async (api: TestAPI) => {
      // Move Button to position 1 (after title)
      await api.interact.moveElement('node-5', 'node-1', 1)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const inputPos = findComponentPos(code, 'Input')
      api.assert.ok(buttonPos < inputPos, 'Button should be before Input')
    }
  ),
])

// =============================================================================
// Mixed Components: Zag + Basic components
// =============================================================================

export const zagMixedTests: TestCase[] = describe('Zag + Basic Components Reorder', [
  testWithSetup(
    'Move Checkbox to middle',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Terms"
  Button "Accept"
  Checkbox "I agree"`,
    async (api: TestAPI) => {
      // Move Checkbox (node-4) to middle
      await api.interact.moveElement('node-4', 'node-1', 1)

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const checkboxPos = findComponentPos(code, 'Checkbox')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(
        textPos < checkboxPos && checkboxPos < buttonPos,
        `Order: Text(${textPos}) < Checkbox(${checkboxPos}) < Button(${buttonPos})`
      )
    }
  ),

  testWithSetup(
    'Switch + Text + Icon horizontal',
    `Frame hor, gap 12, bg #1a1a1a, pad 16
  Switch "Dark Mode"
  Text "Theme"
  Icon "moon"`,
    async (api: TestAPI) => {
      // Move Icon to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const switchPos = findComponentPos(code, 'Switch')
      api.assert.ok(iconPos < switchPos, `Icon (${iconPos}) should be before Switch (${switchPos})`)
    }
  ),

  testWithSetup(
    'Slider + Text + Button move',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "Volume"
  Slider value 50
  Button "Apply"`,
    async (api: TestAPI) => {
      // Move Slider to first
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const sliderPos = findComponentPos(code, 'Slider')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(sliderPos < textPos, `Slider (${sliderPos}) should be before Text (${textPos})`)
    }
  ),
])

// =============================================================================
// Complex Mixed: 4+ different components
// =============================================================================

export const complexMixedTests: TestCase[] = describe('Complex Mixed (4+ components)', [
  testWithSetup(
    'Header: move Button to front',
    `Frame hor, gap 8, bg #1a1a1a, pad 16
  Icon "menu"
  Text "App"
  Spacer
  Button "Login"`,
    async (api: TestAPI) => {
      // Move Button to first
      await api.interact.moveElement('node-5', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(buttonPos < iconPos, `Button (${buttonPos}) should be before Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Form: move Textarea to front',
    `Frame gap 12, bg #1a1a1a, pad 16
  Text "Feedback"
  Input placeholder "Title"
  Textarea placeholder "Details"
  Button "Send"`,
    async (api: TestAPI) => {
      // Move Textarea to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const textareaPos = findComponentPos(code, 'Textarea')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(
        textareaPos < textPos,
        `Textarea (${textareaPos}) should be before Text (${textPos})`
      )
    }
  ),

  testWithSetup(
    'Card: move Icon to front',
    `Frame gap 8, bg #1a1a1a, pad 16
  Image src "cover.jpg", w full
  Text "Title"
  Icon "heart"
  Button "Like"`,
    async (api: TestAPI) => {
      // Move Icon to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const imagePos = findComponentPos(code, 'Image')
      api.assert.ok(iconPos < imagePos, `Icon (${iconPos}) should be before Image (${imagePos})`)
    }
  ),

  testWithSetup(
    'Toolbar: move Export before Divider',
    `Frame hor, gap 4, bg #1a1a1a, pad 8
  Icon "undo"
  Icon "redo"
  Divider
  Button "Save"
  Button "Export"`,
    async (api: TestAPI) => {
      // Move Export to position 2 (after redo, before Divider)
      await api.interact.moveElement('node-6', 'node-1', 2)

      const code = api.editor.getCode()
      const exportPos = code.indexOf('"Export"')
      const dividerPos = findComponentPos(code, 'Divider')
      api.assert.ok(
        exportPos < dividerPos,
        `Export (${exportPos}) should be before Divider (${dividerPos})`
      )
    }
  ),

  testWithSetup(
    'Settings: move Divider to front',
    `Frame gap 8, bg #1a1a1a, pad 16
  Switch "Notifications"
  Switch "Sound"
  Divider
  Button "Save"`,
    async (api: TestAPI) => {
      // Move Divider to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const dividerPos = findComponentPos(code, 'Divider')
      const switchPos = findComponentPos(code, 'Switch')
      api.assert.ok(
        dividerPos < switchPos,
        `Divider (${dividerPos}) should be before Switch (${switchPos})`
      )
    }
  ),
])

// =============================================================================
// Edge Cases with mixed components
// =============================================================================

export const edgeCaseMixedTests: TestCase[] = describe('Edge Cases (Mixed)', [
  testWithSetup(
    'Two components - swap positions',
    `Frame gap 8, bg #1a1a1a, pad 16
  Button "Click"
  Icon "star"`,
    async (api: TestAPI) => {
      // Swap by moving Icon to first
      await api.interact.moveElement('node-3', 'node-1', 0)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(iconPos < buttonPos, `Icon (${iconPos}) should be before Button (${buttonPos})`)
    }
  ),

  testWithSetup(
    'No-op: move to same position',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "First"
  Button "Second"
  Icon "star"`,
    async (api: TestAPI) => {
      // Move Text to position 0 (already there) - should be no change
      await api.interact.moveElement('node-2', 'node-1', 0)

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(
        textPos < buttonPos,
        `Text (${textPos}) should still be before Button (${buttonPos})`
      )
    }
  ),

  testWithSetup(
    'Centered container reorder',
    `Frame gap 8, center, bg #1a1a1a, pad 16, w 300, h 200
  Icon "check"
  Text "Success"
  Button "Continue"`,
    async (api: TestAPI) => {
      // Move Button to first
      await api.interact.moveElement('node-4', 'node-1', 0)

      const code = api.editor.getCode()
      const buttonPos = findComponentPos(code, 'Button')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(buttonPos < iconPos, `Button (${buttonPos}) should be before Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Spread container reorder',
    `Frame hor, spread, bg #1a1a1a, pad 16
  Text "Left"
  Icon "arrow"
  Button "Right"`,
    async (api: TestAPI) => {
      // Move Icon to last (index 2)
      await api.interact.moveElement('node-3', 'node-1', 2)

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const buttonPos = findComponentPos(code, 'Button')
      api.assert.ok(iconPos > buttonPos, `Icon (${iconPos}) should be after Button (${buttonPos})`)
    }
  ),

  testWithSetup(
    'Wrap container reorder',
    `Frame hor, wrap, gap 8, bg #1a1a1a, pad 16, w 200
  Button "A"
  Icon "star"
  Text "Label"
  Button "B"`,
    async (api: TestAPI) => {
      // Move last Button (B) to first
      await api.interact.moveElement('node-5', 'node-1', 0)

      const code = api.editor.getCode()
      const bPos = code.indexOf('"B"')
      const aPos = code.indexOf('"A"')
      api.assert.ok(bPos < aPos, `Button B (${bPos}) should be before Button A (${aPos})`)
    }
  ),
])

// =============================================================================
// Sequential Reorder Tests (multiple moves)
// =============================================================================

export const sequentialMixedTests: TestCase[] = describe('Sequential Mixed Reorders', [
  testWithSetup(
    'Two consecutive moves - both to first',
    `Frame gap 8, bg #1a1a1a, pad 16
  Button "B"
  Icon "star"
  Text "T"`,
    async (api: TestAPI) => {
      // First move: Icon to first
      await api.interact.moveElement('node-3', 'node-1', 0)
      await api.utils.waitForIdle()

      // After first move, order is: Icon, Button, Text
      // Now move Text to first
      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const textPos = findComponentPos(code, 'Text')
      const iconPos = findComponentPos(code, 'Icon')
      api.assert.ok(textPos < iconPos, `Text (${textPos}) should be before Icon (${iconPos})`)
    }
  ),

  testWithSetup(
    'Sequential: rotate through positions',
    `Frame gap 8, bg #1a1a1a, pad 16
  Text "T"
  Button "B"
  Icon "star"`,
    async (api: TestAPI) => {
      // Move Button to last position
      await api.interact.moveElement('node-3', 'node-1', 2)
      await api.utils.waitForIdle()

      // Now move Text to last position
      await api.interact.moveElement('node-2', 'node-1', 2)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const iconPos = findComponentPos(code, 'Icon')
      const textPos = findComponentPos(code, 'Text')
      api.assert.ok(iconPos < textPos, `Icon (${iconPos}) should be before Text (${textPos})`)
    }
  ),
])

// =============================================================================
// Combined Exports
// =============================================================================

export const allFlexReorderTests: TestCase[] = [
  ...buttonTextIconTests,
  ...inputButtonTextTests,
  ...imageTextButtonTests,
  ...linkIconTextTests,
  ...dividerSpacerMixedTests,
  ...textareaInputButtonTests,
  ...zagMixedTests,
  ...complexMixedTests,
  ...edgeCaseMixedTests,
  ...sequentialMixedTests,
]

// For backwards compatibility, also export individual test arrays
export const buttonReorderVerticalTests = buttonTextIconTests
export const buttonReorderHorizontalTests = inputButtonTextTests
export const textReorderTests = imageTextButtonTests
export const iconReorderTests = linkIconTextTests
export const inputReorderTests = textareaInputButtonTests
export const imageReorderTests = imageTextButtonTests
export const dividerSpacerReorderTests = dividerSpacerMixedTests
export const linkTextareaReorderTests = linkIconTextTests
export const mixedComponentReorderTests = complexMixedTests
export const zagComponentReorderTests = zagMixedTests
export const nestedContainerReorderTests = edgeCaseMixedTests
export const reorderEdgeCaseTests = edgeCaseMixedTests
export const sequentialReorderTests = sequentialMixedTests

export default allFlexReorderTests
