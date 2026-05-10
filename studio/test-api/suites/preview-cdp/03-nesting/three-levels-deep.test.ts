/**
 * Preview CDP — Nesting: drop a Text leaf at the bottom of a
 * 3-level hierarchy.
 *
 * Fixture: `threeLevelHierarchy` — outer (400x320) → L1 (320x240)
 * → L2 (240x160). Wir droppen Text in L2 und verifizieren die volle
 * Hierarchie.
 *
 * Verifiziert:
 *   - Vier `[data-mirror-id]`-Knoten total.
 *   - Hierarchie level-für-level: outer → L1 → L2 → Text.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const threeLevelsDeepTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drop Text into deepest Frame of pre-built 3-level hierarchy',
    FIXTURES.threeLevelHierarchy,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 3, 'fixture: outer + L1 + L2 = 3 nodes')

      // Sort by DOM depth — outer is shallowest, L2 deepest.
      const els = idsBefore
        .map(id => document.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement)
        .map(el => ({ el, depth: depthOf(el) }))
        .sort((a, b) => a.depth - b.depth)
      const outerEl = els[0].el
      const l1El = els[1].el
      const l2El = els[2].el
      const outerId = outerEl.getAttribute('data-mirror-id') as string
      const l1Id = l1El.getAttribute('data-mirror-id') as string
      const l2Id = l2El.getAttribute('data-mirror-id') as string

      // Sanity: containment matches sort.
      api.assert.ok(outerEl.contains(l1El), 'outer contains L1')
      api.assert.ok(l1El.contains(l2El), 'L1 contains L2')

      const actions = requireActions()
      await actions.dropFromPalette('Text', { byId: l2Id })

      const idsFinal = allPreviewNodeIds()
      api.assert.equals(idsFinal.length, 4, 'outer + L1 + L2 + Text = 4 nodes')
      const textId = idsFinal.find(id => ![outerId, l1Id, l2Id].includes(id)) as string
      api.assert.ok(textId, 'Text leaf appeared')

      const textEl = document.querySelector(`[data-mirror-id="${textId}"]`) as HTMLElement
      api.assert.equals(
        textEl.parentElement?.closest('[data-mirror-id]')?.getAttribute('data-mirror-id'),
        l2Id,
        'Text inside L2'
      )
      api.assert.equals(
        l2El.parentElement?.closest('[data-mirror-id]')?.getAttribute('data-mirror-id'),
        l1Id,
        'L2 inside L1'
      )
      api.assert.equals(
        l1El.parentElement?.closest('[data-mirror-id]')?.getAttribute('data-mirror-id'),
        outerId,
        'L1 inside outer'
      )
    }
  ),
])

function depthOf(el: HTMLElement): number {
  let d = 0
  let cur: HTMLElement | null = el
  while (cur && cur.parentElement) {
    d++
    cur = cur.parentElement
  }
  return d
}
