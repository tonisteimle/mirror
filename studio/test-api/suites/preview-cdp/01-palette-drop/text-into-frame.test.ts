/**
 * Preview CDP — Palette drop: Text into existing Frame.
 *
 * Maus-Sequenz: Drag des `Text` Palette-Items in einen Frame.
 *
 * Verifiziert:
 *   - Editor-Code enthält eine neue Text-Zeile.
 *   - Preview rendert ein neues `[data-mirror-id]`-Element mit Text-Inhalt.
 *   - Das neue Element ist Kind des Ziel-Frames.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const textIntoFrameTests: TestCase[] = describe('preview-cdp.palette-drop', [
  testWithSetup(
    'Drag Text from palette into existing Frame appends a Text child',
    FIXTURES.oneFrameVisible,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 1, 'fixture should render exactly one Frame')

      const actions = requireActions()
      await actions.dropFromPalette('Text', { byId: idsBefore[0] })

      const idsAfter = allPreviewNodeIds()
      api.assert.equals(idsAfter.length, 2, 'preview should now have 2 nodes')

      const newId = idsAfter.find(id => !idsBefore.includes(id))
      api.assert.ok(newId, 'a new node id should appear')
      const newEl = document.querySelector(`[data-mirror-id="${newId}"]`) as HTMLElement | null
      api.assert.ok(newEl, 'new element renders in preview')

      const parent = newEl!.parentElement?.closest('[data-mirror-id]') as HTMLElement | null
      api.assert.equals(
        parent?.getAttribute('data-mirror-id'),
        idsBefore[0],
        'Text is nested inside the Frame'
      )

      // Editor source should now mention Text.
      api.assert.codeContains(/\bText\b/)
    }
  ),
])
