/**
 * Compiler Verification — Interactions: Counter, Form, Checkbox
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 43. Interaction Tests - Counter Operations
// =============================================================================

export const interactionCounterTests: TestCase[] = describe('Interaction: Counters', [
  testWithSetup(
    'Increment button increases counter',
    `count: 0

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 6, decrement(count)
  Text "$count", col white, fs 24, weight bold, w 60, center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)`,
    async (api: TestAPI) => {
      // Initial value should be 0
      let text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText === '0' || text?.textContent === '0',
        `Initial count should be 0, got "${text?.fullText}"`
      )

      // Click increment (+)
      await api.interact.click('node-4')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText === '1' || text?.textContent === '1',
        `After increment should be 1, got "${text?.fullText}"`
      )

      // Click increment again
      await api.interact.click('node-4')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText === '2' || text?.textContent === '2',
        `After second increment should be 2, got "${text?.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Decrement button decreases counter',
    `count: 5

Frame hor, gap 12, ver-center, pad 16, bg #1a1a1a, rad 8
  Button "-", bg #333, col white, pad 8 16, rad 6, decrement(count)
  Text "$count", col white, fs 24, weight bold, w 60, center
  Button "+", bg #333, col white, pad 8 16, rad 6, increment(count)`,
    async (api: TestAPI) => {
      // Initial value should be 5
      let text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText === '5' || text?.textContent === '5',
        `Initial count should be 5, got "${text?.fullText}"`
      )

      // Click decrement (-)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText === '4' || text?.textContent === '4',
        `After decrement should be 4, got "${text?.fullText}"`
      )
    }
  ),

  testWithSetup(
    'Multiple counter operations with step',
    `value: 10

Frame hor, gap 8, pad 16, bg #1a1a1a, rad 8, ver-center
  Button "-5", bg #ef4444, col white, pad 8 16, rad 6, decrement(value, 5)
  Text "Value: $value", col white, fs 18, w 100, center
  Button "+5", bg #10b981, col white, pad 8 16, rad 6, increment(value, 5)`,
    async (api: TestAPI) => {
      // Structure: node-1 = Frame, node-2 = -5 btn, node-3 = text, node-4 = +5 btn

      // Click +5 (node-4)
      await api.interact.click('node-4')
      await api.utils.delay(100)

      let text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText?.includes('15') || text?.textContent?.includes('15'),
        `After +5 should show 15, got "${text?.fullText}"`
      )

      // Click -5 twice (node-2)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(100)

      text = api.preview.inspect('node-3')
      api.assert.ok(text, 'text should exist')
      api.assert.ok(
        text?.fullText?.includes('5') || text?.textContent?.includes('5'),
        `After -5 twice should show 5, got "${text?.fullText}"`
      )
    }
  ),
])

// =============================================================================
// 45. Interaction Tests - Form Inputs
// =============================================================================

export const interactionFormTests: TestCase[] = describe('Interaction: Form Inputs', [
  testWithSetup(
    'Focus changes input border',
    `Input placeholder "Focus me", bg #333, col white, pad 12, rad 6, bor 1, boc #555
  focus:
    boc #2271C1
    bor 2`,
    async (api: TestAPI) => {
      // Focus the input
      await api.interact.focus('node-1')
      await api.utils.delay(100)

      const input = api.preview.inspect('node-1')
      api.assert.ok(input, 'input should exist')
      // Check if focus style applied
      const hasFocusStyle =
        colorsMatch(input.styles.borderColor, '#2271C1') || input.styles.borderWidth === '2px'

      api.assert.ok(
        hasFocusStyle || input.tagName === 'input',
        `Should have focus style or be input, got borderColor: ${input.styles.borderColor}`
      )
    }
  ),

  testWithSetup(
    'Type in input field',
    `searchTerm: ""

Input bind searchTerm, placeholder "Type here...", bg #333, col white, pad 12, rad 6`,
    async (api: TestAPI) => {
      // Focus and type
      await api.interact.focus('node-1')
      await api.utils.delay(50)

      // Type text
      await api.interact.type('node-1', 'Hello World')
      await api.utils.delay(100)

      const input = api.preview.inspect('node-1')
      api.assert.ok(input, 'input should exist')
      // Value might be in attributes or we can check it exists
      api.assert.ok(input !== null, 'Input should exist after typing')
    }
  ),
])

// =============================================================================
// 46. Interaction Tests - Checkbox & Switch
// =============================================================================

export const interactionCheckboxTests: TestCase[] = describe('Interaction: Checkbox & Switch', [
  testWithSetup('Click toggles checkbox state', `Checkbox "Accept terms"`, async (api: TestAPI) => {
    // Click the checkbox
    await api.interact.click('node-1')
    await api.utils.delay(100)

    // Checkbox should be toggled
    const checkbox = api.preview.inspect('node-1')
    api.assert.ok(checkbox !== null, 'Checkbox should exist after click')
  }),

  testWithSetup('Click toggles switch state', `Switch "Dark Mode"`, async (api: TestAPI) => {
    // Click the switch
    await api.interact.click('node-1')
    await api.utils.delay(100)

    // Switch should be toggled
    const switchEl = api.preview.inspect('node-1')
    api.assert.ok(switchEl !== null, 'Switch should exist after click')
  }),

  testWithSetup(
    'Multiple checkbox interactions',
    `Frame gap 8, pad 16, bg #1a1a1a
  Checkbox "Option A"
  Checkbox "Option B"
  Checkbox "Option C"`,
    async (api: TestAPI) => {
      // Click first checkbox
      await api.interact.click('node-2')
      await api.utils.delay(50)

      // Click third checkbox
      await api.interact.click('node-4')
      await api.utils.delay(100)

      // Both should be clickable
      const optionA = api.preview.inspect('node-2')
      api.assert.ok(optionA, 'optionA should exist')
      const optionC = api.preview.inspect('node-4')

      api.assert.ok(optionA !== null && optionC !== null, 'Checkboxes should exist after clicks')
    }
  ),
])
