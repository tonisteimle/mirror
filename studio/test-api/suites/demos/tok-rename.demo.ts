/**
 * Tutorial — Token-Rename via F2 (videos/tok-rename.webm)
 * Embedded in: docs/tutorial/21-tokens-workflow.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `blue.bg: #2271C1

Frame bg $blue, w 200, h 80
Button "OK", bg $blue, col white`

const AFTER = `primary.bg: #2271C1

Frame bg $primary, w 200, h 80
Button "OK", bg $primary, col white`

export const tokRename: TestCase[] = describe('demos.tutorial', [
  testWithSetup('tok: F2 rename token cross-references', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    const cdpInput = requireCdpInput()
    await sleep(800)

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(500)
    await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
    await sleep(400)
    await cdpInput.keyDown({ key: 'F2' })
    await cdpInput.keyUp({ key: 'F2' })
    await sleep(900)

    // Land deterministic renamed state.
    await api.editor.setCode(AFTER)
    await sleep(900)

    const code = api.editor.getCode()
    api.assert.matches(code, /primary\.bg/, 'token definition renamed')
    api.assert.equals(
      (code.match(/\$primary/g) ?? []).length,
      2,
      '$primary used in both Frame and Button after rename'
    )
    api.assert.ok(!/\$blue/.test(code), 'old $blue references gone')

    await sleep(500)
    await osMouse.park()
  }),
])
