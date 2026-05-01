/**
 * Input + Textarea + Button Stacked — form-shaped drops
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { verifyPosition } from './_helpers'

export const inputTextareaButtonTests: TestCase[] = describe('Input + Textarea + Button Stacked', [
  testWithSetup(
    'Drop Input at top-left',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 30, 30)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      const pos = verifyPosition(code, 30, 30, 40)
      api.assert.ok(
        pos.actualX !== null && pos.actualX <= 70,
        `Input x should be near 30, got ${pos.actualX}`
      )
    }
  ),

  testWithSetup(
    'Drop Textarea at center',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Textarea', 'node-1', 150, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Textarea/)

      const pos = verifyPosition(code, 150, 100, 60)
      api.assert.ok(
        pos.ok,
        `Textarea should be near (150, 100), got (${pos.actualX}, ${pos.actualY})`
      )
    }
  ),

  testWithSetup(
    'Drop Input and Textarea at different positions',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Textarea', 'node-1', 50, 100)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/Textarea/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 2, `Should have 2 x positions, found ${xMatches.length}`)
    }
  ),

  testWithSetup(
    'Form layout: Input + Textarea + Button',
    'Frame stacked, w 400, h 350, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Input', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Textarea', 'node-1', 50, 80)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 50, 200)

      const code = api.editor.getCode()
      api.assert.codeContains(/Input/)
      api.assert.codeContains(/Textarea/)
      api.assert.codeContains(/Button/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      const yMatches = code.match(/\by\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions, found ${xMatches.length}`)
      api.assert.ok(yMatches.length >= 3, `Should have 3 y positions, found ${yMatches.length}`)
    }
  ),
])
