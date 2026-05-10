/**
 * Preview CDP — Deep nesting: drop a Text leaf at the bottom of a
 * 5-level hierarchy.
 *
 * Fixture: `fiveLevelHierarchy` — outer (520x420) → L1 → L2 → L3 → L4
 * (innermost 280x180). Wir droppen Text in L4 und verifizieren die
 * volle Hierarchie up zur Wurzel.
 *
 * Verifiziert:
 *   - Sechs `[data-mirror-id]`-Knoten total.
 *   - Hierarchie: outer → L1 → L2 → L3 → L4 → Text (jede Ebene direkter Mirror-Vorfahre der nächsten).
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const fiveLevelsDeepTests: TestCase[] = describe('preview-cdp.deep-nesting', [
  testWithSetup(
    'Drop Text into deepest Frame of pre-built 5-level hierarchy',
    FIXTURES.fiveLevelHierarchy,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 5, 'fixture: 5 nesting levels = 5 nodes')

      const sorted = idsBefore
        .map(id => document.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement)
        .map(el => ({ el, depth: domDepth(el) }))
        .sort((a, b) => a.depth - b.depth)

      const [outer, l1, l2, l3, l4] = sorted.map(s => s.el)
      const ids = sorted.map(s => s.el.getAttribute('data-mirror-id') as string)
      const [outerId, l1Id, l2Id, l3Id, l4Id] = ids

      api.assert.ok(outer.contains(l1), 'outer contains L1')
      api.assert.ok(l1.contains(l2), 'L1 contains L2')
      api.assert.ok(l2.contains(l3), 'L2 contains L3')
      api.assert.ok(l3.contains(l4), 'L3 contains L4')

      const actions = requireActions()
      await actions.dropFromPalette('Text', { byId: l4Id })

      const idsFinal = allPreviewNodeIds()
      api.assert.equals(idsFinal.length, 6, 'outer + 4 levels + text = 6 nodes')
      const textId = idsFinal.find(id => !ids.includes(id)) as string
      api.assert.ok(textId, 'Text leaf appeared')

      const textEl = document.querySelector(`[data-mirror-id="${textId}"]`) as HTMLElement

      // Walk up parents and assert each direct Mirror ancestor matches.
      api.assert.equals(closestMirrorParent(textEl), l4Id, 'Text inside L4')
      api.assert.equals(closestMirrorParent(l4), l3Id, 'L4 inside L3')
      api.assert.equals(closestMirrorParent(l3), l2Id, 'L3 inside L2')
      api.assert.equals(closestMirrorParent(l2), l1Id, 'L2 inside L1')
      api.assert.equals(closestMirrorParent(l1), outerId, 'L1 inside outer')
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
