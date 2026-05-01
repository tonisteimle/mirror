/**
 * Form Actions — focus, clear, blur for inputs
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const formActionTests: TestCase[] = describe('Form Actions', [
  testWithSetup(
    'focus() sets focus to input on click',
    `Frame gap 8, pad 16, bg #1a1a1a
  Button "Focus Email", focus(EmailField)
  Input name EmailField, placeholder "Email..."`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input = document.querySelector('[data-mirror-id="node-3"]') as HTMLInputElement
      api.assert.ok(input !== null, 'Input should exist')

      api.assert.ok(document.activeElement !== input, 'Input should not be focused initially')

      await api.interact.click('node-2')
      await api.utils.delay(100)

      api.assert.ok(document.activeElement === input, 'Input should be focused after click')
    }
  ),

  testWithSetup(
    'clear() clears input value on click',
    `searchTerm: "initial text"

Frame gap 8, pad 16, bg #1a1a1a
  Input bind searchTerm, name SearchField
  Button "Clear", clear(SearchField)`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input = document.querySelector('[data-mirror-id="node-2"]') as HTMLInputElement
      api.assert.ok(input !== null, 'Input should exist')

      api.assert.ok(
        input.value === 'initial text' || input.placeholder.includes('initial'),
        'Input should have initial value'
      )

      if (!input.value) {
        await api.interact.type('node-2', 'test value')
        await api.utils.delay(100)
      }

      await api.interact.click('node-3')
      await api.utils.delay(100)

      api.assert.equal(input.value, '', 'Input should be cleared after click')
    }
  ),

  testWithSetup(
    'blur() removes focus from input on click',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input name Field, placeholder "Type here..."
  Button "Blur", blur(Field)`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const input = document.querySelector('[data-mirror-id="node-2"]') as HTMLInputElement

      await api.interact.focus('node-2')
      await api.utils.delay(50)
      api.assert.ok(document.activeElement === input, 'Input should be focused')

      await api.interact.click('node-3')
      await api.utils.delay(100)

      api.assert.ok(document.activeElement !== input, 'Input should not be focused after blur')
    }
  ),
])
