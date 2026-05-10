/**
 * Tutorial — Komponente extrahieren via :: (videos/comp-extract.webm)
 * Embedded in: docs/tutorial/20-komponenten-workflow.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `Frame bg #1a1a1a, pad 16, rad 8, gap 8, w 240
  Text "Titel", col white, fs 16
  Text "Beschreibung", col #888`

const AFTER = `Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 240
  Text "Titel", col white, fs 16
  Text "Beschreibung", col #888

Card`

export const compExtract: TestCase[] = describe('demos.tutorial', [
  testWithSetup('comp: extract Frame to Card via ::', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(700)

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(800)

    api.assert.ok(!api.editor.getCode().includes('Card'), 'no Card component before')

    await api.editor.setCode(AFTER)
    await sleep(900)

    const code = api.editor.getCode()
    api.assert.matches(code, /Card:.*pad 16/, 'Card definition extracted')
    api.assert.ok(/\nCard\b/.test(code), 'usage site replaced with Card')

    await sleep(500)
    await osMouse.park()
  }),
])
