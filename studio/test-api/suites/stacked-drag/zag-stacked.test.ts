/**
 * Pure Mirror UI components (Checkbox/Switch/Slider) Stacked.
 *
 * Previously skipped — claimed Pure Mirror components didn't propagate x/y
 * from PureComponentHandler in stacked containers. PureComponentHandler
 * gained `placement === 'absolute'` x/y emission in `1325549f` (2026-04-22);
 * skip notice was stale. Pinned by jsdom test
 * `tests/studio/drop-handlers.test.ts` "absolute placement: appends rounded
 * x/y to instance properties" (passes). Un-skipped 2026-05-13.
 * (Historical name "zag-stacked" preserved for compat.)
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const zagStackedTests: TestCase[] = describe('Zag Components Stacked', [
  testWithSetup(
    'Drop Checkbox at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Checkbox', 'node-1', 50, 50)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Drop Switch at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Switch', 'node-1', 100, 80)

      const code = api.editor.getCode()
      api.assert.codeContains(/Switch/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Drop Slider at position',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Slider', 'node-1', 50, 150)

      const code = api.editor.getCode()
      api.assert.codeContains(/Slider/)
      api.assert.codeContains(/\bx\s+\d+/)
      api.assert.codeContains(/\by\s+\d+/)
    }
  ),

  testWithSetup(
    'Settings panel: multiple Switches',
    'Frame stacked, w 400, h 300, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Switch', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Switch', 'node-1', 50, 80)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Switch', 'node-1', 50, 130)

      const code = api.editor.getCode()
      const switchMatches = code.match(/\bSwitch\b/g) || []
      api.assert.ok(
        switchMatches.length >= 3,
        `Should have 3 Switches, found ${switchMatches.length}`
      )

      const yMatches = code.match(/\by\s+\d+/g) || []
      api.assert.ok(yMatches.length >= 3, `Should have 3 y positions`)
    }
  ),

  testWithSetup(
    'Form: Checkbox + Slider + Button',
    'Frame stacked, w 400, h 350, bg #1a1a1a',
    async (api: TestAPI) => {
      await api.interact.dragToPosition('Checkbox', 'node-1', 50, 30)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Slider', 'node-1', 50, 100)
      await api.utils.waitForIdle()
      await api.interact.dragToPosition('Button', 'node-1', 50, 200)

      const code = api.editor.getCode()
      api.assert.codeContains(/Checkbox/)
      api.assert.codeContains(/Slider/)
      api.assert.codeContains(/Button/)

      const xMatches = code.match(/\bx\s+\d+/g) || []
      api.assert.ok(xMatches.length >= 3, `Should have 3 x positions`)
    }
  ),
])
