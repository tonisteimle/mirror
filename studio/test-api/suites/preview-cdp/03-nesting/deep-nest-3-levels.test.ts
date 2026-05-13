/**
 * Preview CDP — Nesting: drag a top-level sibling into a 2-level-deep
 * empty container.
 *
 * Starting position:
 *
 *   outerDark
 *     midLight
 *       deepGray (empty)     ← drop target (2 levels deep)
 *     orange                 ← drag source (top-level child of outer)
 *
 * After drag (target = deepGray, index 0):
 *
 *   outerDark
 *     midLight
 *       deepGray
 *         orange             ← now 3 levels deep
 *
 * Wave 3 Slice 3 of the preview-cdp plan. Stress-tests the dragstart
 * → dragover → drop pipeline against a target deep in the DOM tree,
 * where the synthetic-event shortcut would have been most likely to
 * fall through to a closer ancestor. Trusted dragover fires at every
 * step along the cursor path, so the actual deepest drop-zone wins.
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

export const deepNest3LevelsTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drag top-level orange into deep empty container — ends 3 levels deep',
    FIXTURES.threeLevelWithDeepEmptyTarget,
    async (api: TestAPI) => {
      // outerDark  bg #1a1a1a → rgb(26, 26, 26)
      // midLight   bg #27272a → rgb(39, 39, 42)
      // deepGray   bg #3f3f46 → rgb(63, 63, 70)
      // orange     bg #f59e0b → rgb(245, 158, 11)
      const outer = findByBackground('rgb(26, 26, 26)')
      const mid = findByBackground('rgb(39, 39, 42)')
      const deep = findByBackground('rgb(63, 63, 70)')
      const orange = findByBackground('rgb(245, 158, 11)')

      const deepId = deep.getAttribute('data-mirror-id') as string
      const orangeId = orange.getAttribute('data-mirror-id') as string

      // Pre: orange is direct child of outer; deep is empty.
      api.assert.equals(orange.parentElement, outer, 'orange starts as child of outer')
      api.assert.equals(deep.children.length, 0, 'deep starts empty')

      const actions = requireActions()
      await actions.moveElement({ byId: orangeId }, { byId: deepId }, 0)

      const outerAfter = findByBackground('rgb(26, 26, 26)')
      const midAfter = findByBackground('rgb(39, 39, 42)')
      const deepAfter = findByBackground('rgb(63, 63, 70)')
      const orangeAfter = findByBackground('rgb(245, 158, 11)')

      // Post: orange is descendant of deep (and transitively outer/mid).
      api.assert.equals(orangeAfter.parentElement, deepAfter, 'orange direct child of deep')
      api.assert.ok(midAfter.contains(orangeAfter), 'orange inside mid (transitively)')
      api.assert.ok(outerAfter.contains(orangeAfter), 'orange inside outer (transitively)')
      api.assert.equals(deepAfter.children.length, 1, 'deep has one child after drop')

      // Source indent: orange was at 2 spaces (level 1 — child of outer).
      // Now it should be at 6 spaces (level 3 — outer > mid > deep > orange).
      const code = api.editor.getCode()
      const orangeLine = code.split('\n').find(l => l.includes('#f59e0b')) ?? ''
      const indent = orangeLine.match(/^(\s*)/)?.[1].length ?? 0
      api.assert.equals(indent, 6, `orange indented 3 levels (6 spaces), got ${indent}`)
    }
  ),
])
