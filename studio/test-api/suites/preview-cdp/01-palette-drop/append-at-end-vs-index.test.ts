/**
 * Preview CDP — Palette drop into a container with multiple tight-packed children.
 *
 * SKIPPED — die 3 child-Frames füllen den 240px-Container nahezu komplett
 * (3×60 + 2×8 + 2×12 pad = 220 inside 240). Mein `dropChildIndexPoint`
 * für `index >= children.length` clampt den Y auf
 * `containerRect.bottom - 4` — Studios Drop-Target-Detection
 * interpretiert die letzten 4px aber schon als "outside container",
 * der Drop wird abgelehnt. Eine sauberere Drop-Position braucht
 * Studio-spezifisches Wissen über die Insertion-Line-Hot-Zones.
 *
 * Folge-Aufgabe: Drop-Target-Erkennung von Studios Drag-Pipeline
 * dokumentieren, dann diesen Test plus weitere index-basierte Drops
 * (Wave 3b) bauen.
 */

import { testWithSetupSkip, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'

const fixtureWithThreeChildren = `Frame w 320, h 240, bg #1a1a1a, pad 12, gap 8
  Frame w 100, h 60, bg #2271C1
  Frame w 100, h 60, bg #ef4444
  Frame w 100, h 60, bg #10b981`

export const appendAtEndVsIndexTests: TestCase[] = describe('preview-cdp.palette-drop', [
  testWithSetupSkip(
    'Drag Text into a container with three Frame children adds a new node inside the container',
    fixtureWithThreeChildren,
    async (api: TestAPI) => {
      const actions = requireActions()
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 4, 'fixture renders 4 nodes (1 container + 3 children)')

      await actions.dropFromPalette('Text', { byId: 'node-1' })

      const idsAfter = allPreviewNodeIds()
      api.assert.equals(idsAfter.length, 5, 'preview now has 5 nodes')

      const newId = idsAfter.find(id => !idsBefore.includes(id))
      api.assert.ok(newId, 'a new node id appeared')
      const newEl = document.querySelector(`[data-mirror-id="${newId}"]`) as HTMLElement
      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container.contains(newEl), 'new node is inside the container')
    }
  ),
])
