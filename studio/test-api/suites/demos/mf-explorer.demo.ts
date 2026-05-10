/**
 * Tutorial — File-Explorer-Operations (videos/mf-explorer.webm)
 * Embedded in: docs/tutorial/25-multi-file.html
 *
 * In test-mode the file-tree backend isn't writable. The demo narrates
 * the concept by cycling editor content as if files were being switched
 * — the educational point is that different file types own different
 * Mirror content.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireOsMouse, sleep } from './_shared/actions'

const TOKENS_TOK = `primary.bg: #2271C1
panel.bg: #1a1a1a`

const CARD_COM = `Card: bg $panel, pad 16, rad 8, gap 8
  Title: col white, fs 16
  Action as Button: bg $primary, col white, pad 8 16, rad 6`

const DASHBOARD_MIR = `primary.bg: #2271C1
panel.bg: #1a1a1a

Card: bg $panel, pad 16, rad 8, gap 8, w 240
  Title: col white, fs 16
  Action as Button: bg $primary, col white, pad 8 16, rad 6

Card
  Title "Heute"
  Action "Öffnen"`

export const mfExplorer: TestCase[] = describe('demos.tutorial', [
  testWithSetup('mf: file explorer concept', FIXTURES.empty, async (api: TestAPI) => {
    const osMouse = requireOsMouse()
    await sleep(500)

    // Park cursor near a sensible "file explorer area" of the studio.
    const sidebarCandidate = document.querySelector(
      '.file-tree, #file-tree, [data-file-tree]'
    ) as HTMLElement | null
    if (sidebarCandidate) {
      await osMouse.moveTo(centerOf(sidebarCandidate))
      await sleep(800)
    }

    await api.editor.setCode(TOKENS_TOK)
    await sleep(1200)
    api.assert.matches(api.editor.getCode(), /primary\.bg/, 'tokens.tok-style content')

    await api.editor.setCode(CARD_COM)
    await sleep(1200)
    api.assert.matches(api.editor.getCode(), /Card:.*bg \$panel/, 'card.com-style content')

    await api.editor.setCode(DASHBOARD_MIR)
    await sleep(1200)
    api.assert.matches(api.editor.getCode(), /Card\n\s+Title/, 'dashboard.mir uses Card')

    await sleep(500)
    await osMouse.park()
  }),
])
