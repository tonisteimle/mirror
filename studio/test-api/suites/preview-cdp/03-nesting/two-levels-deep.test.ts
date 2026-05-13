/**
 * Preview CDP — Nesting: drag a top-level sibling into a 1-level-deep
 * empty container.
 *
 * Starting position:
 *
 *   outerDark
 *     innerLight (empty)  ← drop target
 *   orange                ← drag source (top-level sibling of outer)
 *
 * After drag (target = innerLight, index 0):
 *
 *   outerDark
 *     innerLight
 *       orange            ← now 2 levels deep
 *
 * Wave 3 Slice 5 per `docs/test-plan-preview-cdp.md`
 * (`two-levels-deep.test.ts`). Sits between the 1-level
 * `nest-into-sibling-child` test and the 3-level `deep-nest-3-levels`
 * test — covers the most common nesting depth users hit in real
 * layouts (a container with a single inner section).
 *
 * Verifies:
 *   - Orange is now a direct child of innerLight.
 *   - DOM contains() — orange inside outerDark (transitive).
 *   - innerLight has exactly one child (the orange).
 *   - Source indent: orange goes from 0 (top-level) to 4 (level 2).
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

export const twoLevelsDeepTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drag top-level orange into level-1 empty container — ends at level 2',
    FIXTURES.twoLevelContainerTarget,
    async (api: TestAPI) => {
      // outerDark   bg #1a1a1a → rgb(26, 26, 26)
      // innerLight  bg #27272a → rgb(39, 39, 42)
      // orange      bg #f59e0b → rgb(245, 158, 11)
      const outer = findByBackground('rgb(26, 26, 26)')
      const inner = findByBackground('rgb(39, 39, 42)')
      const orange = findByBackground('rgb(245, 158, 11)')

      const innerId = inner.getAttribute('data-mirror-id') as string
      const orangeId = orange.getAttribute('data-mirror-id') as string

      // Pre: orange and outer are siblings, inner is empty.
      api.assert.ok(!outer.contains(orange), 'orange starts outside outer (top-level sibling)')
      api.assert.equals(inner.children.length, 0, 'inner starts empty')

      const actions = requireActions()
      await actions.moveElement({ byId: orangeId }, { byId: innerId }, 0)

      const outerAfter = findByBackground('rgb(26, 26, 26)')
      const innerAfter = findByBackground('rgb(39, 39, 42)')
      const orangeAfter = findByBackground('rgb(245, 158, 11)')

      // Post: orange direct child of inner; inner has 1 child; transitively in outer.
      api.assert.equals(orangeAfter.parentElement, innerAfter, 'orange direct child of inner')
      api.assert.equals(innerAfter.children.length, 1, 'inner has one child after drop')
      api.assert.ok(outerAfter.contains(orangeAfter), 'orange transitively inside outer')

      // Source indent: orange was top-level (0 spaces), now at level 2 (4 spaces).
      const code = api.editor.getCode()
      const orangeLine = code.split('\n').find(l => l.includes('#f59e0b')) ?? ''
      const indent = orangeLine.match(/^(\s*)/)?.[1].length ?? 0
      api.assert.equals(indent, 4, `orange indented 2 levels (4 spaces), got ${indent}`)
    }
  ),
])
