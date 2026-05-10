/**
 * Tutorial — Token-Extract via :: (videos/tok-extract.webm)
 * Embedded in: docs/tutorial/21-tokens-workflow.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = 'Btn: bg #2271C1, col white, pad 10 20'
const AFTER =
  'primary.bg: #2271C1\n\nBtn: bg $primary, col white, pad 10 20\n\nBtn "Speichern"'

export const tokExtract: TestCase[] = describe('demos.tutorial', [
  testWithSetup('tok: extract hex with :: trigger', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(800)

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(800)

    api.assert.matches(api.editor.getCode(), /#2271C1/, 'hex value present before')
    api.assert.ok(!api.editor.getCode().includes('$primary'), 'no token before')

    // Land the extracted state.
    await api.editor.setCode(AFTER)
    await sleep(900)

    const code = api.editor.getCode()
    api.assert.matches(code, /primary\.bg:\s*#2271C1/, 'token definition added')
    api.assert.matches(code, /bg\s+\$primary/, 'reference replaced')
    api.assert.ok(!code.includes('bg #2271C1'), 'raw hex replaced everywhere in Btn')

    await sleep(500)
    await osMouse.park()
  }),
])
