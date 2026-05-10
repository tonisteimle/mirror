/**
 * Preview CDP — Deep nesting: drop into a Frame that contains an
 * `each` iteration.
 *
 * Fixture: `eachIteration` — Frame with `each item in $items` and
 * three items (a/b/c). Wir droppen ein Text auf das äußere Frame und
 * verifizieren, dass das neue Text-Element direktes Mirror-Kind des
 * outer Frames ist (iterationskinder sind Templates und teilen sich
 * den Quell-`Frame`-Knoten).
 *
 * Verifiziert:
 *   - Drop fügt mindestens einen neuen `[data-mirror-id]`-Knoten hinzu.
 *   - Der neue Knoten ist direktes Mirror-Kind des outer Frames.
 *   - Der neue Knoten ist KEIN Iteration-Item (nicht innerhalb der
 *     bereits bestehenden Frames).
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const nestedInsideEachTests: TestCase[] = describe('preview-cdp.deep-nesting', [
  testWithSetup(
    'Drop Text onto Frame containing an each iteration appends as sibling',
    FIXTURES.eachIteration,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.ok(idsBefore.length >= 1, 'fixture rendered some mirror nodes')

      // Outer is the Mirror node that contains all others.
      const els = idsBefore.map(
        id => document.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement
      )
      const outerEl = els.find(el =>
        els.every(other => other === el || el.contains(other))
      ) as HTMLElement
      api.assert.ok(outerEl, 'outer Frame identified')
      const outerId = outerEl.getAttribute('data-mirror-id') as string

      const actions = requireActions()
      await actions.dropFromPalette('Text', { byId: outerId })

      const idsFinal = allPreviewNodeIds()
      const newIds = idsFinal.filter(id => !idsBefore.includes(id))
      api.assert.ok(newIds.length >= 1, 'at least one new mirror node after drop')

      // Find a newly-added node that is a direct Mirror-child of the outer Frame.
      const childOfOuter = newIds.find(id => {
        const el = document.querySelector(`[data-mirror-id="${id}"]`) as HTMLElement | null
        if (!el) return false
        const parent = el.parentElement?.closest('[data-mirror-id]')
        return parent?.getAttribute('data-mirror-id') === outerId
      })
      api.assert.ok(childOfOuter, 'a newly-added node sits directly under the outer Frame')
    }
  ),
])
