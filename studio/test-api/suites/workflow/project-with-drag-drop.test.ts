/**
 * Project with Drag & Drop — palette-drop, reorder, and component-drop scenarios
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const projectWithDragDropTests: TestCase[] = describe('Project with Drag & Drop', [
  testWithSetup(
    'Drop Button into Frame',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      api.dom.expect('node-1', { children: 0 })

      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.waitForIdle()

      api.dom.expect('node-1', { children: 1 })
      api.dom.expect('node-2', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Drop multiple elements in order',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.waitForIdle()
      await api.interact.dragFromPalette('Input', 'node-1', 1)
      await api.utils.waitForIdle()
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.waitForIdle()

      api.dom.expect('node-1', { children: 3 })
      api.dom.expect('node-2', { tag: 'span' })
      api.dom.expect('node-3', { tag: 'input' })
      api.dom.expect('node-4', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Drop Frame creates nested structure',
    'Frame gap 16, pad 24, bg #0a0a0a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.waitForIdle()

      api.dom.expect('node-1', { children: 1 })
      api.dom.expect('node-2', { tag: 'div' })

      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.waitForIdle()

      api.dom.expect('node-2', { children: 1 })
      api.dom.expect('node-3', { tag: 'button' })
    }
  ),

  testWithSetup(
    'Drop at specific index',
    `Frame gap 12, pad 16, bg #1a1a1a
  Text "First"
  Text "Third"`,
    async (api: TestAPI) => {
      api.dom.expect('node-1', { children: 2 })

      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.waitForIdle()

      api.dom.expect('node-1', { children: 3 })

      const code = api.editor.getCode()
      const posFirst = code.indexOf('"First"')
      const posButton = code.indexOf('Button')
      const posThird = code.indexOf('"Third"')
      api.assert.ok(
        posFirst < posButton && posButton < posThird,
        'Order should be First, Button, Third'
      )
    }
  ),

  testWithSetup(
    'Style dropped element via editor',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.waitForIdle()

      await api.editor.setCode(`Frame gap 12, pad 16, bg #1a1a1a
  Button "Styled", bg #2271C1, col white, pad 12 24, rad 8`)
      await api.utils.waitForIdle()

      api.dom.expect('node-2', {
        tag: 'button',
        text: 'Styled',
        bg: '#2271C1',
        rad: 8,
      })
    }
  ),

  testWithSetup(
    'Move element changes position',
    `Frame gap 12, pad 16, bg #1a1a1a
  Button "A"
  Button "B"
  Button "C"`,
    async (api: TestAPI) => {
      api.dom.expect('node-2', { text: 'A' })
      api.dom.expect('node-3', { text: 'B' })
      api.dom.expect('node-4', { text: 'C' })

      await api.interact.moveElement('node-4', 'node-1', 0)
      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      const posA = code.indexOf('"A"')
      const posC = code.indexOf('"C"')
      api.assert.ok(posC < posA, 'C should come before A after move')
    }
  ),

  testWithSetup(
    'Drop Checkbox component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Checkbox', 'node-1', 0)
      await api.utils.waitForIdle()

      api.assert.codeContains(/Checkbox/)
      api.dom.expect('node-1', { children: 1 })
      api.dom.expect('node-2', { exists: true })
    }
  ),

  testWithSetup(
    'Drop Switch component',
    'Frame gap 12, pad 16, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Switch', 'node-1', 0)
      await api.utils.waitForIdle()

      api.assert.codeContains(/Switch/)
      api.dom.expect('node-2', { exists: true })
    }
  ),

  testWithSetup(
    'Drop Slider component',
    'Frame gap 12, pad 16, bg #1a1a1a, w 300',
    async (api: TestAPI) => {
      await api.interact.dragFromPalette('Slider', 'node-1', 0)
      await api.utils.waitForIdle()

      api.assert.codeContains(/Slider/)
      api.dom.expect('node-2', { exists: true })
    }
  ),
])
