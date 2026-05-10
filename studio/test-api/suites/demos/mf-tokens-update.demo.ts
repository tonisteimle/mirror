/**
 * Tutorial — Token-Change updates all (videos/mf-tokens-update.webm)
 * Embedded in: docs/tutorial/25-multi-file.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const BEFORE = `primary.bg: #2271C1

Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 220
  Title: col white, fs 14
  Action as Button: bg $primary, col white, pad 8 16, rad 4

Card
  Title "Heute"
  Action "Öffnen"
Card
  Title "Stats"
  Action "Mehr"`

const AFTER = `primary.bg: #10b981

Card: bg #1a1a1a, pad 16, rad 8, gap 8, w 220
  Title: col white, fs 14
  Action as Button: bg $primary, col white, pad 8 16, rad 4

Card
  Title "Heute"
  Action "Öffnen"
Card
  Title "Stats"
  Action "Mehr"`

export const mfTokensUpdate: TestCase[] = describe('demos.tutorial', [
  testWithSetup('mf: token change propagates everywhere', BEFORE, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(900)

    // Identify the two Action buttons by their bg.
    const buttonsBefore = Array.from(
      document.querySelectorAll('#preview button[data-mirror-id], #preview [data-mirror-id] button')
    ) as HTMLElement[]
    const blueButtons = buttonsBefore.filter(
      b => getComputedStyle(b).backgroundColor === 'rgb(34, 113, 193)'
    )
    api.assert.ok(blueButtons.length >= 2, 'two blue action buttons before token change')

    const editor = querySafe('.cm-content')
    await osMouse.moveTo(centerOf(editor))
    await sleep(900)

    await api.editor.setCode(AFTER)
    await sleep(1200)

    const buttonsAfter = Array.from(
      document.querySelectorAll('#preview button[data-mirror-id], #preview [data-mirror-id] button')
    ) as HTMLElement[]
    const greenButtons = buttonsAfter.filter(
      b => getComputedStyle(b).backgroundColor === 'rgb(16, 185, 129)'
    )
    api.assert.ok(greenButtons.length >= 2, 'all action buttons green after token change')

    await sleep(700)
    await osMouse.park()
  }),
])
