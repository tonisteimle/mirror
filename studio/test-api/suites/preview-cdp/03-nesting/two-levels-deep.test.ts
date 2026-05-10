/**
 * Preview CDP — Nesting: drop a Text leaf into a 2-level hierarchy.
 *
 * Fixture: `twoLevelHierarchy` — outer Frame (360x280) with a roomy
 * inner Frame (240x160) child. We drop a Text element directly into
 * the inner Frame and verify hierarchy.
 *
 * Verifiziert:
 *   - Drei `[data-mirror-id]`-Knoten total: outer → inner → text.
 *   - Text liegt direkt im inneren Frame.
 *   - Inner Frame liegt direkt im outer Frame.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const twoLevelsDeepTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drop Text into inner Frame of pre-built 2-level hierarchy',
    FIXTURES.twoLevelHierarchy,
    async (api: TestAPI) => {
      const idsBefore = allPreviewNodeIds()
      api.assert.equals(idsBefore.length, 2, 'fixture: outer + inner = 2 nodes')

      // Identify outer vs inner by DOM containment.
      const a = document.querySelector(`[data-mirror-id="${idsBefore[0]}"]`) as HTMLElement
      const b = document.querySelector(`[data-mirror-id="${idsBefore[1]}"]`) as HTMLElement
      const outerEl = a.contains(b) ? a : b
      const innerEl = a.contains(b) ? b : a
      const outerId = outerEl.getAttribute('data-mirror-id') as string
      const innerId = innerEl.getAttribute('data-mirror-id') as string

      const actions = requireActions()
      await actions.dropFromPalette('Text', { byId: innerId })

      const idsFinal = allPreviewNodeIds()
      api.assert.equals(idsFinal.length, 3, 'outer + inner + text = 3 nodes')
      const textId = idsFinal.find(id => id !== outerId && id !== innerId) as string
      api.assert.ok(textId, 'Text element appeared')

      const textEl = document.querySelector(`[data-mirror-id="${textId}"]`) as HTMLElement
      const textParentMirror = textEl.parentElement?.closest(
        '[data-mirror-id]'
      ) as HTMLElement | null
      const innerParentMirror = innerEl.parentElement?.closest(
        '[data-mirror-id]'
      ) as HTMLElement | null
      api.assert.equals(
        textParentMirror?.getAttribute('data-mirror-id'),
        innerId,
        'Text is direct child of inner Frame'
      )
      api.assert.equals(
        innerParentMirror?.getAttribute('data-mirror-id'),
        outerId,
        'inner Frame is direct child of outer Frame'
      )
    }
  ),
])
