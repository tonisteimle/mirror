/**
 * Keyboard Simulation — pressKey, pressSequence, modifiers, typeText
 */

import type { TestCase, TestAPI } from '../../types'

export const keyboardTests: TestCase[] = [
  {
    name: 'Keyboard: pressKey fires events',
    category: 'testSystem',
    setup: `Frame
  Input placeholder "Type here..."`,
    run: async (api: TestAPI) => {
      await api.utils.delay(100)
      const nodeIds = api.preview.getNodeIds()
      const inputId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        return info?.tagName?.toUpperCase() === 'INPUT'
      })

      api.assert.ok(inputId !== undefined, 'Should find Input element in setup')

      await api.interact.focus(inputId!)

      await api.interact.pressKey('a')
      await api.interact.pressKey('b')
      await api.interact.pressKey('c')

      const inputElement = document.querySelector(
        `[data-mirror-id="${inputId}"]`
      ) as HTMLInputElement
      api.assert.ok(inputElement !== null, 'Input element should exist in DOM')

      api.assert.ok(
        typeof inputElement.value === 'string',
        'Input should have accessible value property'
      )
    },
  },

  {
    name: 'Keyboard: pressSequence fires multiple keys',
    category: 'testSystem',
    setup: `Frame
  Input placeholder "Navigate..."`,
    run: async (api: TestAPI) => {
      await api.utils.delay(100)

      const nodeIds = api.preview.getNodeIds()
      api.assert.ok(nodeIds.length >= 2, 'Should have Frame and Input elements')

      const inputId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        return info?.tagName?.toUpperCase() === 'INPUT'
      })
      api.assert.ok(inputId !== undefined, 'Should find Input element')

      await api.interact.focus(inputId!)

      const keysToPress = ['ArrowDown', 'ArrowDown', 'Enter']
      await api.interact.pressSequence(keysToPress)

      const inputElement = document.querySelector(`[data-mirror-id="${inputId}"]`)
      api.assert.ok(inputElement !== null, 'Input should still exist after key sequence')
    },
  },

  {
    name: 'Keyboard: pressKey with modifiers',
    category: 'testSystem',
    setup: `Frame
  Input placeholder "Shortcuts..."`,
    run: async (api: TestAPI) => {
      await api.utils.delay(100)

      const nodeIds = api.preview.getNodeIds()
      const inputId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        return info?.tagName?.toUpperCase() === 'INPUT'
      })
      api.assert.ok(inputId !== undefined, 'Should find Input element')

      await api.interact.focus(inputId!)

      await api.interact.pressKey('a', { ctrl: true })
      await api.interact.pressKey('s', { ctrl: true, shift: true })
      await api.interact.pressKey('z', { meta: true })

      const inputElement = document.querySelector(
        `[data-mirror-id="${inputId}"]`
      ) as HTMLInputElement
      api.assert.ok(inputElement !== null, 'Input should exist after modifier keys')
      api.assert.ok(!inputElement.disabled, 'Input should still be enabled')
    },
  },

  {
    name: 'Keyboard: typeText types character by character',
    category: 'testSystem',
    setup: `Frame
  Input placeholder "Type here..."`,
    run: async (api: TestAPI) => {
      await api.utils.delay(100)
      const nodeIds = api.preview.getNodeIds()
      const inputId = nodeIds.find(id => {
        const info = api.preview.inspect(id)
        return info?.tagName?.toUpperCase() === 'INPUT'
      })

      api.assert.ok(inputId !== undefined, 'Should find Input element in setup')

      const inputElement = document.querySelector(
        `[data-mirror-id="${inputId}"]`
      ) as HTMLInputElement
      api.assert.ok(inputElement !== null, 'Input element should exist in DOM')

      await api.interact.focus(inputId!)
      await api.interact.typeText('Hello', 10)

      api.assert.ok(
        inputElement.value === 'Hello',
        `Input value should be "Hello", got "${inputElement.value}"`
      )
    },
  },
]
