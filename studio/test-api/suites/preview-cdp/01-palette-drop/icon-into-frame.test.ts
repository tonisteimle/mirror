/**
 * Preview CDP — Palette drop: Icon into existing Frame.
 *
 * Maus-Sequenz: Drag des `Icon` Palette-Items in einen Frame.
 *
 * Verifiziert:
 *   - Editor-Code enthält danach eine Icon-Zeile.
 *   - Preview rendert ein neues Icon-Element.
 *   - Das neue Element ist Kind des Ziel-Frames.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const iconIntoFrameTests: TestCase[] = describe('preview-cdp.palette-drop', [
  testWithSetup(
    'Drag Icon from palette into existing Frame appends an Icon child',
    FIXTURES.oneFrameVisible,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 1, 'fixture renders one Frame')

      const actions = requireActions()
      await actions.dropFromPalette('Icon', { byId: idsBefore[0] })

      const idsAfter = allPreviewNodeIds()
      api.assert.equals(idsAfter.length, 2, 'preview now has 2 nodes')

      const newId = idsAfter.find(id => !idsBefore.includes(id))
      api.assert.ok(newId, 'a new node id appeared')
      const newEl = document.querySelector(`[data-mirror-id="${newId}"]`) as HTMLElement | null
      api.assert.ok(newEl, 'new element renders in preview')

      const parent = newEl!.parentElement?.closest('[data-mirror-id]') as HTMLElement | null
      api.assert.equals(
        parent?.getAttribute('data-mirror-id'),
        idsBefore[0],
        'Icon is nested inside the Frame'
      )
      api.assert.codeContains(/\bIcon\b/)
    }
  ),
])
