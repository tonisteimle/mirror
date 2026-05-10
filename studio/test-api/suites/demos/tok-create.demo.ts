/**
 * Tutorial — Token anlegen (videos/tok-create.webm)
 * Embedded in: docs/tutorial/21-tokens-workflow.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const PROGRESSION = [
  'primary.bg: #2271C1',
  'primary.bg: #2271C1\nmuted.col: #888888\ncard.pad: 16',
  'primary.bg: #2271C1\nmuted.col: #888888\ncard.pad: 16\n\nFrame bg $primary, pad $card, col $muted, w 200',
]

export const tokCreate: TestCase[] = describe('demos.tutorial', [
  testWithSetup('tok: create + suffix mapping', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(400)

    for (let i = 0; i < PROGRESSION.length; i++) {
      await api.editor.setCode(PROGRESSION[i])
      await sleep(900)
    }

    const code = api.editor.getCode()
    api.assert.matches(code, /primary\.bg:\s*#2271C1/, 'primary.bg token defined')
    api.assert.matches(code, /bg\s+\$primary/, 'token used as bg')
    api.assert.matches(code, /pad\s+\$card/, 'token used as pad')

    const frame = document.querySelector('#preview [data-mirror-id]') as HTMLElement | null
    api.assert.ok(frame, 'Frame renders')
    if (frame) {
      api.assert.equals(
        getComputedStyle(frame).backgroundColor,
        'rgb(34, 113, 193)',
        '$primary resolves to #2271C1'
      )
    }

    await sleep(500)
    await osMouse.park()
  }),
])
