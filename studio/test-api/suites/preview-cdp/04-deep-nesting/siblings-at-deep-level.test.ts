/**
 * Preview CDP — Deep nesting: zwei Frame-Drops nebeneinander am
 * deepest Container einer 4-Level-Hierarchie.
 *
 * Fixture: `fourLevelRoomyHierarchy` — outer → L1 → L2 → L3 (320x200,
 * `hor, gap 12`). Wir droppen erst Frame, dann Frame in L3 und
 * verifizieren, dass beide Frames als Geschwister direkt unter L3
 * landen.
 *
 * Verifiziert:
 *   - Sechs `[data-mirror-id]`-Knoten am Ende (outer + L1 + L2 + L3 + 2 neue).
 *   - Beide neue Frames haben L3 als direkten Mirror-Vorfahren.
 *   - Sie sind verschiedene Knoten.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const siblingsAtDeepLevelTests: TestCase[] = describe('preview-cdp.deep-nesting', [
  testWithSetup(
    'Drop two Frames into deepest container yields two siblings at depth 4',
    FIXTURES.fourLevelRoomyHierarchy,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 4, 'fixture: 4 levels = 4 nodes')

      // Identify deepest by DOM depth.
      const sorted = idsBefore
        .map(id => document.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement)
        .map(el => ({ el, depth: domDepth(el) }))
        .sort((a, b) => a.depth - b.depth)

      const initialIds = sorted.map(s => s.el.getAttribute('data-mirror-id') as string)
      const l3Id = initialIds[3]

      const actions = requireActions()
      await actions.dropFromPalette('Frame', { byId: l3Id })
      const idsMid = allPreviewNodeIds()
      const firstNewId = idsMid.find(id => !initialIds.includes(id)) as string
      api.assert.ok(firstNewId, 'first dropped Frame appeared')

      await actions.dropFromPalette('Frame', { byId: l3Id })
      const idsFinal = allPreviewNodeIds()
      api.assert.equals(idsFinal.length, 6, 'fixture (4) + 2 dropped = 6 nodes')

      const newIds = idsFinal.filter(id => !initialIds.includes(id))
      api.assert.equals(newIds.length, 2, 'exactly two new nodes appeared')

      const a = document.querySelector(`[data-mirror-id="${newIds[0]}"]`) as HTMLElement
      const b = document.querySelector(`[data-mirror-id="${newIds[1]}"]`) as HTMLElement
      api.assert.equals(closestMirrorParent(a), l3Id, 'first new Frame is under L3')
      api.assert.equals(closestMirrorParent(b), l3Id, 'second new Frame is under L3')
      api.assert.ok(newIds[0] !== newIds[1], 'siblings are distinct nodes')
    }
  ),
])

function domDepth(el: HTMLElement): number {
  let d = 0
  let cur: HTMLElement | null = el
  while (cur && cur.parentElement) {
    d++
    cur = cur.parentElement
  }
  return d
}

function closestMirrorParent(el: HTMLElement): string | null {
  return el.parentElement?.closest('[data-mirror-id]')?.getAttribute('data-mirror-id') ?? null
}
