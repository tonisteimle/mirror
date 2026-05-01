/**
 * App Stacked — root-level App stacked container drops
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { verifyPosition } from './_helpers'

export const appStackedTests: TestCase[] = describe('App Stacked', [
  testWithSetup('Drop Button into App stacked (minimal)', 'App stacked', async (api: TestAPI) => {
    await api.interact.dragToPosition('Button', 'node-1', 100, 100)

    const code = api.editor.getCode()

    api.assert.codeContains(/Button/)
    api.assert.codeContains(/\bx\s+\d+/)
    api.assert.codeContains(/\by\s+\d+/)

    const pos = verifyPosition(code, 100, 100, 50)
    api.assert.ok(
      pos.ok || (pos.actualX !== null && pos.actualY !== null),
      `Position should have x/y, got (${pos.actualX}, ${pos.actualY})`
    )

    api.assert.exists('node-2')

    const preview = document.getElementById('preview')
    api.assert.ok(preview !== null, 'Preview element must exist')
    const node2El = preview!.querySelector('[data-mirror-id="node-2"]') as HTMLElement
    api.assert.ok(node2El !== null, 'Button element (node-2) must exist in preview')
    api.assert.ok(
      node2El.offsetWidth > 0,
      `Button should have width > 0, got: ${node2El.offsetWidth}`
    )
    api.assert.ok(
      node2El.offsetHeight > 0,
      `Button should have height > 0, got: ${node2El.offsetHeight}`
    )
  }),

  testWithSetup(
    'Drop Icon into App stacked',
    'App stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Icon', 'node-1', 100, 100)

      const code = api.editor.getCode()

      api.assert.codeContains(/Icon/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      const pos = verifyPosition(code, 100, 100, 50)
      api.assert.ok(
        pos.ok || (pos.actualX !== null && pos.actualY !== null),
        `Position should have x/y, got (${pos.actualX}, ${pos.actualY})`
      )

      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Drop Button into App stacked',
    'App stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 150, 80)

      const code = api.editor.getCode()
      api.assert.codeContains(/Button/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)

      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Drop multiple elements into App stacked',
    'App stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Button', 'node-1', 50, 50)
      await api.utils.waitForIdle()

      await api.interact.dragToPosition('Text', 'node-1', 200, 150)
      await api.utils.waitForIdle()

      await api.interact.dragToPosition('Icon', 'node-1', 300, 200)

      const code = api.editor.getCode()

      api.assert.codeContains(/Button/)
      api.assert.codeContains(/Text/)
      api.assert.codeContains(/Icon/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions, found ${xMatches.length}`)

      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
    }
  ),

  testWithSetup(
    'App stacked preserves existing children on drop',
    'App stacked, w 400, h 300, bg #1a1a1a\n  Button "Existing", x 10, y 10',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Text', 'node-1', 200, 100)

      const code = api.editor.getCode()

      api.assert.codeContains(/Button "Existing", x 10, y 10/)

      api.assert.codeContains(/Text/)

      api.assert.exists('node-2')
      api.assert.exists('node-3')
    }
  ),
])
