/**
 * Preview CDP — Move: existing element from container A into container B.
 *
 * Maus-Sequenz: Drag des kleinen Frames (Kind von Container A) in den
 * leeren Container B. CDP-Trusted-Maus löst Studios Canvas-Drag aus
 * (HTML5 dragstart auf draggable=true Mirror-Element).
 *
 * Verifiziert:
 *   - Source-Element wandert: ist Kind von B, nicht mehr von A.
 *   - node-ids bleiben stabil — kein neuer Knoten, kein Verlust.
 *
 * Findet die drei Mirror-Knoten dynamisch über computed-style
 * (background-color), weil node-N ids sich zwischen Suite-Tests
 * verschieben.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

function findByBackground(rgb: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).filter(el => {
    return getComputedStyle(el as HTMLElement).backgroundColor === rgb
  }) as HTMLElement[]
  if (matches.length === 0) throw new Error(`No mirror element with background ${rgb}`)
  if (matches.length > 1) throw new Error(`Multiple mirror elements with background ${rgb}`)
  return matches[0]
}

export const moveIntoDifferentContainerTests: TestCase[] = describe('preview-cdp.move', [
  testWithSetup(
    'Move blue Frame from container A into empty container B',
    FIXTURES.twoContainersOneChild,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      // A + blue child + B (no synthetic root in suite-test setup).
      api.assert.equals(idsBefore.length, 3, 'fixture renders 3 mirror nodes')

      // Container A: bg #1a1a1a → rgb(26, 26, 26).
      // Blue child:  bg #2271C1 → rgb(34, 113, 193).
      // Container B: bg #27272a → rgb(39, 39, 42).
      const containerA = findByBackground('rgb(26, 26, 26)')
      const child = findByBackground('rgb(34, 113, 193)')
      const containerB = findByBackground('rgb(39, 39, 42)')

      const childId = child.getAttribute('data-mirror-id') as string
      const containerBId = containerB.getAttribute('data-mirror-id') as string

      api.assert.ok(containerA.contains(child), 'child starts inside A')
      api.assert.ok(!containerB.contains(child), 'child not in B yet')

      const actions = requireActions()
      await actions.moveElement({ byId: childId }, { byId: containerBId }, 0)

      const idsAfter = allPreviewNodeIds()
      api.assert.equals(idsAfter.length, 3, 'still 3 nodes (move, not insert)')

      const childAfter = findByBackground('rgb(34, 113, 193)')
      const containerAAfter = findByBackground('rgb(26, 26, 26)')
      const containerBAfter = findByBackground('rgb(39, 39, 42)')
      api.assert.ok(containerBAfter.contains(childAfter), 'child now lives inside B')
      api.assert.ok(!containerAAfter.contains(childAfter), 'child no longer inside A')
    }
  ),
])
