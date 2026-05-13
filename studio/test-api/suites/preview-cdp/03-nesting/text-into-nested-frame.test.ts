/**
 * Preview CDP — Nesting: drag a top-level Text node INTO an empty Frame.
 *
 * Starting position:
 *
 *   Text "Drag me"             ← drag source (top-level)
 *   Frame (empty)              ← drop target (empty container)
 *
 * After drag (target = Frame, index 0):
 *
 *   Frame
 *     Text "Drag me"           ← now a child Text
 *
 * Wave 3 Slice 4 (per `docs/test-plan-preview-cdp.md` — file name
 * `text-into-nested-frame.test.ts`). Complements the Frame→Frame
 * nesting test by covering the text-leaf-into-container path, which
 * has different drop-zone semantics: Text leaves have no children of
 * their own, so the drop pipeline must accept the Text element as a
 * draggable source without attempting to traverse INTO it.
 *
 * Verifies:
 *   - DOM contains() — Text is now a descendant of the Frame.
 *   - Frame has exactly one child (the Text).
 *   - Source indent increases (Text was top-level, now indented).
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { FIXTURES } from '../_shared/fixtures'

function findByText(text: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).filter(el => {
    return (el.textContent ?? '').trim() === text
  }) as HTMLElement[]
  if (matches.length === 0) throw new Error(`No mirror element with text "${text}"`)
  // Pick the deepest match — outer containers also report .textContent.
  return matches.reduce((deepest, el) =>
    el.querySelectorAll('[data-mirror-id]').length <
    deepest.querySelectorAll('[data-mirror-id]').length
      ? el
      : deepest
  )
}

function findByBackground(rgb: string): HTMLElement {
  const matches = Array.from(document.querySelectorAll('#preview [data-mirror-id]')).filter(el => {
    return getComputedStyle(el as HTMLElement).backgroundColor === rgb
  }) as HTMLElement[]
  if (matches.length === 0) throw new Error(`No mirror element with background ${rgb}`)
  if (matches.length > 1) throw new Error(`Multiple mirror elements with background ${rgb}`)
  return matches[0]
}

export const textIntoNestedFrameTests: TestCase[] = describe('preview-cdp.nesting', [
  testWithSetup(
    'Drag top-level Text into empty Frame — Text becomes child of Frame',
    FIXTURES.topLevelTextPlusEmptyFrame,
    async (api: TestAPI) => {
      const text = findByText('Drag me')
      // Frame bg #27272a → rgb(39, 39, 42).
      const frame = findByBackground('rgb(39, 39, 42)')

      const textId = text.getAttribute('data-mirror-id') as string
      const frameId = frame.getAttribute('data-mirror-id') as string

      // Pre-conditions: Text and Frame are siblings (both top-level —
      // suite-test fixtures don't auto-wrap in App).
      api.assert.ok(!frame.contains(text), 'Text starts outside Frame')
      api.assert.equals(frame.children.length, 0, 'Frame starts empty')

      const actions = requireActions()
      await actions.moveElement({ byId: textId }, { byId: frameId }, 0)

      const textAfter = findByText('Drag me')
      const frameAfter = findByBackground('rgb(39, 39, 42)')

      // Post-conditions: Text is a child of Frame.
      api.assert.ok(frameAfter.contains(textAfter), 'Text now inside Frame')
      api.assert.equals(frameAfter.children.length, 1, 'Frame has the Text as its only child')

      // Source indent: Text was top-level (0 spaces). After nest, it
      // should be indented 2 spaces (child of Frame).
      const code = api.editor.getCode()
      const textLine = code.split('\n').find(l => l.includes('Drag me')) ?? ''
      const indent = textLine.match(/^(\s*)/)?.[1].length ?? 0
      api.assert.equals(indent, 2, `Text should be indented 2 spaces after nest, got ${indent}`)
    }
  ),
])
