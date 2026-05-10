/**
 * Preview CDP — Palette drop: Frame into existing Frame.
 *
 * Maus-Sequenz: Drag des `Frame` Palette-Items in die Mitte eines bereits
 * existierenden Frames im Preview.
 *
 * Verifiziert:
 *   - Editor-Code hat danach 2 Frame-Knoten (top + nested).
 *   - Der neue Frame ist Kind des Ziel-Frames.
 *   - Selektion landet auf dem neuen Knoten.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const frameIntoExistingFrameTests: TestCase[] = describe('preview-cdp.palette-drop', [
  testWithSetup(
    'Drag Frame from palette into existing Frame nests it as a child',
    FIXTURES.oneFrameVisible,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 1, 'fixture should render exactly one Frame')

      const actions = requireActions()
      await actions.dropFromPalette('Frame', { byId: idsBefore[0] })

      const idsAfter = allPreviewNodeIds()
      api.assert.equals(idsAfter.length, 2, 'preview should now have 2 nodes')

      // The new node is the only id absent before.
      const newId = idsAfter.find(id => !idsBefore.includes(id))
      api.assert.ok(newId, 'a new node id should appear')
      const newEl = document.querySelector(`[data-mirror-id="${newId}"]`) as HTMLElement | null
      api.assert.ok(newEl, 'new element renders in preview')

      // The new element's parent (closest data-mirror-id ancestor) is the original Frame.
      const parent = newEl!.parentElement?.closest('[data-mirror-id]') as HTMLElement | null
      api.assert.ok(parent, 'new element has a Mirror parent')
      api.assert.equals(
        parent!.getAttribute('data-mirror-id'),
        idsBefore[0],
        'new element is nested inside the existing Frame'
      )

      api.assert.equals(api.panel.property.getSelectedNodeId(), newId, 'auto-selected the new node')
    }
  ),
])
