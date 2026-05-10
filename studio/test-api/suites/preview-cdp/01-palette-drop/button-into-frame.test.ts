/**
 * Preview CDP — Palette drop: Button into existing Frame.
 *
 * Maus-Sequenz: Drag des `Button` Palette-Items in einen Frame.
 *
 * Verifiziert:
 *   - Editor-Code enthält danach eine Button-Zeile.
 *   - Preview rendert ein neues `<button>` Element.
 *   - Das neue Element ist Kind des Ziel-Frames.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const buttonIntoFrameTests: TestCase[] = describe('preview-cdp.palette-drop', [
  testWithSetup(
    'Drag Button from palette into existing Frame appends a Button child',
    FIXTURES.oneFrameVisible,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 1, 'fixture renders one Frame')

      const actions = requireActions()
      await actions.dropFromPalette('Button', { byId: idsBefore[0] })

      const idsAfter = allPreviewNodeIds()
      api.assert.equals(idsAfter.length, 2, 'preview now has 2 nodes')

      const newId = idsAfter.find(id => !idsBefore.includes(id))
      api.assert.ok(newId, 'a new node id appeared')
      const newEl = document.querySelector(`[data-mirror-id="${newId}"]`) as HTMLElement | null
      api.assert.ok(newEl, 'new element renders in preview')
      api.assert.equals(newEl!.tagName.toLowerCase(), 'button', 'new element is a <button>')

      const parent = newEl!.parentElement?.closest('[data-mirror-id]') as HTMLElement | null
      api.assert.equals(
        parent?.getAttribute('data-mirror-id'),
        idsBefore[0],
        'Button is nested inside the Frame'
      )

      api.assert.codeContains(/\bButton\b/)
    }
  ),
])
