/**
 * Preview CDP — Nesting: drag a nested element OUT to its grandparent.
 *
 * The inverse of `nest-into-sibling-child`. Starting position:
 *
 *   outerDark
 *     innerLight
 *       orange    ← drag source (nested 2 levels)
 *
 * After drag (target = outerDark, index 0):
 *
 *   outerDark
 *     orange     ← now a direct child of outer
 *     innerLight
 *
 * Wave 3 Slice 2 of the preview-cdp plan. Production-critical case
 * because un-nesting via drag is how users escape from accidentally
 * deeply-nested layouts — keyboard un-nest is a separate path
 * (Ungroup command).
 *
 * Verifies:
 *   - DOM contains() — outer.contains(orange), inner does NOT.
 *   - Source indent decreased by one level (was 4 spaces, now 2).
 *   - Inner is now empty (no children).
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

export const unnestOutOfContainerTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drag deeply-nested orange Frame up to its grandparent outer',
    FIXTURES.orangeInsideInnerContainer,
    async (api: TestAPI) => {
      // outerDark   bg #1a1a1a → rgb(26, 26, 26)
      // innerLight  bg #27272a → rgb(39, 39, 42)
      // orange      bg #f59e0b → rgb(245, 158, 11)
      const outer = findByBackground('rgb(26, 26, 26)')
      const inner = findByBackground('rgb(39, 39, 42)')
      const orange = findByBackground('rgb(245, 158, 11)')

      const outerId = outer.getAttribute('data-mirror-id') as string
      const orangeId = orange.getAttribute('data-mirror-id') as string

      api.assert.ok(inner.contains(orange), 'orange starts inside inner')
      api.assert.equals(inner.children.length, 1, 'inner has one child before un-nest')

      const actions = requireActions()
      await actions.moveElement({ byId: orangeId }, { byId: outerId }, 0)

      const innerAfter = findByBackground('rgb(39, 39, 42)')
      const orangeAfter = findByBackground('rgb(245, 158, 11)')
      const outerAfter = findByBackground('rgb(26, 26, 26)')

      // Direct child of outer, not descendant of inner anymore.
      api.assert.ok(outerAfter.contains(orangeAfter), 'orange now inside outer')
      api.assert.ok(!innerAfter.contains(orangeAfter), 'orange no longer inside inner')
      api.assert.equals(orangeAfter.parentElement, outerAfter, 'orange is direct child of outer')
      api.assert.equals(innerAfter.children.length, 0, 'inner is empty after un-nest')

      // Source indent: orange was at 4 spaces (2 levels deep), should
      // now be at 2 spaces (1 level deep — child of outer).
      const code = api.editor.getCode()
      const orangeLine = code.split('\n').find(l => l.includes('#f59e0b')) ?? ''
      const indent = orangeLine.match(/^(\s*)/)?.[1].length ?? 0
      api.assert.equals(
        indent,
        2,
        `orange indented 1 level (2 spaces) after un-nest, got ${indent}`
      )
    }
  ),
])
