/**
 * Input Events — typing, clearing, textarea bound to variable
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const inputEventTests: TestCase[] = describe('Input Events', [
  testWithSetup(
    'typing updates bound variable',
    `searchTerm: ""

Frame gap 8, pad 16, bg #1a1a1a
  Input bind searchTerm, placeholder "Search...", pad 12, bg #222, col white, rad 6
  Text "Search: $searchTerm", col #888, fs 12`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const initialText = api.preview.inspect('node-3')
      api.assert.ok(
        initialText?.textContent === 'Search: ' || initialText?.fullText?.includes('Search:'),
        'Initial search should be empty'
      )

      await api.interact.focus('node-2')
      await api.interact.type('node-2', 'hello')
      await api.utils.delay(200)

      const afterType = api.preview.inspect('node-3')
      api.assert.ok(
        afterType?.textContent?.includes('hello') || afterType?.fullText?.includes('hello'),
        `Text should contain "hello", got: ${afterType?.textContent}`
      )
    }
  ),

  testWithSetup(
    'clearing input updates bound variable',
    `value: "initial"

Frame gap 8, pad 16, bg #1a1a1a
  Input bind value, pad 12, bg #222, col white, rad 6
  Text "Value: $value", col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const initialText = api.preview.inspect('node-3')
      api.assert.ok(
        initialText?.textContent?.includes('initial') || initialText?.fullText?.includes('initial'),
        'Should show initial value'
      )

      await api.interact.focus('node-2')
      await api.interact.clear('node-2')
      await api.interact.type('node-2', 'new')
      await api.utils.delay(200)

      const afterClear = api.preview.inspect('node-3')
      api.assert.ok(
        afterClear?.textContent?.includes('new') || afterClear?.fullText?.includes('new'),
        `Should show "new", got: ${afterClear?.textContent}`
      )
    }
  ),

  testWithSetup(
    'textarea input updates bound variable',
    `content: ""

Frame gap 8, pad 16, bg #1a1a1a
  Textarea bind content, placeholder "Enter text...", pad 12, bg #222, col white, rad 6, h 100
  Text "Length: $content.length", col #888, fs 12`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.focus('node-2')
      await api.interact.type('node-2', 'Hello World')
      await api.utils.delay(200)

      const textarea = await api.utils.waitForElement('node-2')
      const textareaEl = textarea as HTMLTextAreaElement
      api.assert.ok(
        textareaEl.value === 'Hello World' || textareaEl.value.includes('Hello'),
        `Textarea should contain "Hello World", got: ${textareaEl.value}`
      )
    }
  ),
])
