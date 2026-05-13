/**
 * Preview CDP — Nesting: drag a sibling INTO an empty sibling container.
 *
 * Setup: outer Frame contains an empty inner Frame plus an orange Frame
 * as a sibling. The orange Frame starts as a child of outer (sibling
 * to the inner), and the drag should reparent it as a child of inner.
 *
 *   outerDark
 *     innerLight    ← drop target
 *     orange        ← drag source
 *
 * After the drag:
 *
 *   outerDark
 *     innerLight
 *       orange      ← now a descendant of inner, not outer
 *
 * Wave 3 Slice 1 of the preview-cdp plan (`docs/test-plan-preview-cdp.md`).
 * Pins drag-based reparenting end-to-end through Trusted CDP events —
 * `dragstart` / `dragover` / `drop` with real `dataTransfer`. Synthetic
 * dispatch could fake the source/target moves but would miss the actual
 * drop-zone resolution + sourcemap update path.
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

export const nestIntoSiblingChildTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drag orange Frame into empty sibling container — orange becomes child of inner',
    FIXTURES.twoSiblingsWithInnerTarget,
    async (api: TestAPI) => {
      // outerDark   bg #1a1a1a → rgb(26, 26, 26)
      // innerLight  bg #27272a → rgb(39, 39, 42)
      // orange      bg #f59e0b → rgb(245, 158, 11)
      const outer = findByBackground('rgb(26, 26, 26)')
      const inner = findByBackground('rgb(39, 39, 42)')
      const orange = findByBackground('rgb(245, 158, 11)')

      const innerId = inner.getAttribute('data-mirror-id') as string
      const orangeId = orange.getAttribute('data-mirror-id') as string

      // Pre-conditions: orange is a child of outer, NOT of inner.
      api.assert.ok(outer.contains(orange), 'orange starts inside outer')
      api.assert.ok(!inner.contains(orange), 'orange not inside inner yet')

      const actions = requireActions()
      await actions.moveElement({ byId: orangeId }, { byId: innerId }, 0)

      // Post-conditions: orange is now a descendant of inner — node-id
      // stable (no insert, just move). DOM contains() walks all
      // descendants, so this also pins "nested one level deeper".
      const innerAfter = findByBackground('rgb(39, 39, 42)')
      const orangeAfter = findByBackground('rgb(245, 158, 11)')
      api.assert.ok(innerAfter.contains(orangeAfter), 'orange now inside inner')

      // Source-side check: orange's source line is now indented under
      // inner's line (one more level than before). Use the raw indent
      // count so this test catches structural regressions even if the
      // exact line numbers shift.
      const code = api.editor.getCode()
      const orangeLineMatch = code.split('\n').find(l => l.includes('#f59e0b'))
      api.assert.ok(orangeLineMatch, 'orange line still present in source')
      const indent = (orangeLineMatch ?? '').match(/^(\s*)/)?.[1].length ?? 0
      api.assert.ok(
        indent >= 4,
        `orange indented at least 2 levels deep after nest, got ${indent} spaces`
      )
    }
  ),
])
