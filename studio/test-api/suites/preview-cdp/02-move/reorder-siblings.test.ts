/**
 * Preview CDP — Move: reorder siblings inside a container.
 *
 * Note: Reorder of *top-level* Frames (no shared mirror-id parent) is a
 * separate problem — see the original skip-notice in git history. In
 * the suite test setup `__compileTestCode` never wraps with App
 * (`studio/app.ts:1585`), so top-level Frames have no synthetic root
 * and `moveElement` has no targetSel. That edge case stays open.
 *
 * This test covers the *contained* reorder path: two siblings inside
 * a Frame, the second drags into index 0 → ordering flips.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { FIXTURES } from '../_shared/fixtures'

function findByBackground(rgb: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).filter(el => {
    return getComputedStyle(el as HTMLElement).backgroundColor === rgb
  }) as HTMLElement[]
  if (matches.length === 0) throw new Error(`No mirror element with background ${rgb}`)
  if (matches.length > 1) throw new Error(`Multiple mirror elements with background ${rgb}`)
  return matches[0]
}

export const reorderSiblingsTests: TestCase[] = describe('preview-cdp.move', [
  testWithSetup(
    'Move red Frame to index 0 reorders siblings inside container (red before blue)',
    FIXTURES.twoChildrenVertical,
    async (api: TestAPI) => {
      const codeBefore = api.editor.getCode()
      api.assert.matches(codeBefore, /bg #2271C1[\s\S]*bg #ef4444/, 'blue before red in source')

      // Container: bg #1a1a1a → rgb(26, 26, 26)
      // Blue child: bg #2271C1 → rgb(34, 113, 193)
      // Red child:  bg #ef4444 → rgb(239, 68, 68)
      const container = findByBackground('rgb(26, 26, 26)')
      const red = findByBackground('rgb(239, 68, 68)')

      const containerId = container.getAttribute('data-mirror-id') as string
      const redId = red.getAttribute('data-mirror-id') as string

      const actions = requireActions()
      await actions.moveElement({ byId: redId }, { byId: containerId }, 0)

      const codeAfter = api.editor.getCode()
      api.assert.matches(codeAfter, /bg #ef4444[\s\S]*bg #2271C1/, 'red before blue after reorder')
    }
  ),
])
