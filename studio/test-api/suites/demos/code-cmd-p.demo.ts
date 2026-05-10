/**
 * Tutorial — Cmd+P Quick-Switch (videos/code-cmd-p.webm)
 * Embedded in: docs/tutorial/24-code-editor.html § Cmd+P — Quick-Switch zwischen Files
 *
 * Single-file demo: shows Cmd+P opening Studio's command palette.
 * Real multi-file projects expose more entries; the popup mechanism
 * itself is identical.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

export const codeCmdP: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'code: Cmd+P quick-switch popup',
    FIXTURES.empty,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const cdpInput = requireCdpInput()

      const editor = querySafe('.cm-content')
      await osMouse.moveTo(centerOf(editor))
      await sleep(500)
      await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
      await sleep(400)

      // Open quick-switch.
      await cdpInput.keyDown({ key: 'p', modifiers: { meta: true } })
      await cdpInput.keyUp({ key: 'p', modifiers: { meta: true } })
      await sleep(800)

      // Studio's file-palette / command-palette UI.
      const palette = document.querySelector(
        '#file-palette, .file-palette, .command-palette, [data-file-palette]'
      )
      api.assert.ok(palette, 'quick-switch palette opened (Cmd+P)')

      await sleep(1200)

      // Close it.
      await cdpInput.keyDown({ key: 'Escape' })
      await cdpInput.keyUp({ key: 'Escape' })
      await sleep(500)

      await osMouse.park()
    }
  ),
])
