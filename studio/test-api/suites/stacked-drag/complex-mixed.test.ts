/**
 * Complex Mixed Stacked (4+ components) — dashboards, cards, contact forms
 */

import { testWithSetup, testWithSetupSkip, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'

export const complexStackedMixedTests: TestCase[] = describe(
  'Complex Mixed Stacked (4+ components)',
  [
    testWithSetup(
      'Dashboard: Icon + Text + Button + Input',
      'Frame stacked, w 500, h 400, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Icon', 'node-1', 30, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Text', 'node-1', 70, 35)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Input', 'node-1', 200, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Button', 'node-1', 400, 30)

        const code = api.editor.getCode()
        api.assert.codeContains(/Icon/)
        api.assert.codeContains(/Text/)
        api.assert.codeContains(/Input/)
        api.assert.codeContains(/Button/)

        const xMatches = code.match(/\bx\s+\d+/g) || []
        api.assert.ok(xMatches.length >= 4, `Should have 4 x positions, found ${xMatches.length}`)
      }
    ),

    testWithSetup(
      'Card overlay: Image + Icon badge + Text + Link',
      'Frame stacked, w 400, h 350, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Image', 'node-1', 30, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Icon', 'node-1', 300, 40)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Text', 'node-1', 30, 220)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Link', 'node-1', 30, 270)

        const code = api.editor.getCode()
        api.assert.codeContains(/Image/)
        api.assert.codeContains(/Icon/)
        api.assert.codeContains(/Text/)
        api.assert.codeContains(/Link/)
      }
    ),

    // SKIPPED: Pure Mirror components don't get x/y in stacked containers
    testWithSetupSkip(
      'Settings: Text + Switch + Checkbox + Slider + Button',
      'Frame stacked, w 400, h 400, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Text', 'node-1', 30, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Switch', 'node-1', 30, 70)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Checkbox', 'node-1', 30, 130)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Slider', 'node-1', 30, 200)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Button', 'node-1', 30, 300)

        const code = api.editor.getCode()
        api.assert.codeContains(/Text/)
        api.assert.codeContains(/Switch/)
        api.assert.codeContains(/Checkbox/)
        api.assert.codeContains(/Slider/)
        api.assert.codeContains(/Button/)

        const yMatches = code.match(/\by\s+\d+/g) || []
        api.assert.ok(yMatches.length >= 5, `Should have 5 y positions, found ${yMatches.length}`)
      }
    ),

    testWithSetup(
      'Contact form: Input + Input + Textarea + Button + Icon',
      'Frame stacked, w 400, h 400, bg #1a1a1a',
      async (api: TestAPI) => {
        await api.interact.dragToPosition('Input', 'node-1', 50, 30)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Input', 'node-1', 50, 80)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Textarea', 'node-1', 50, 130)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Button', 'node-1', 50, 280)
        await api.utils.waitForIdle()
        await api.interact.dragToPosition('Icon', 'node-1', 300, 285)

        const code = api.editor.getCode()
        const inputMatches = code.match(/\bInput\b/g) || []
        api.assert.ok(
          inputMatches.length >= 2,
          `Should have 2 Inputs, found ${inputMatches.length}`
        )
        api.assert.codeContains(/Textarea/)
        api.assert.codeContains(/Button/)
        api.assert.codeContains(/Icon/)
      }
    ),
  ]
)
