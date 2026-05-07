/**
 * Move-edge-case tests.
 *
 * Mirror-specific scenarios that the standard reparenting suite doesn't
 * exercise:
 *   - moving a custom-component INSTANCE without disturbing its definition
 *   - moving a Frame whose body contains a non-trivial sub-tree
 *   - moving an element that carries a `$token` property reference
 *   - undo/redo round-trip after a move
 *
 * Each test checks both the resulting source (`codeEquals`) and the DOM
 * topology (`assertParentHasChildren`), so a regression in either the
 * source mutation or the renderer would surface.
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { assertParentHasChildren } from '../../helpers/structure'

export const moveComponentTests: TestCase[] = describe('Move - Components', [
  testWithSetup(
    'Reorder component instances leaves the definition intact',
    'Btn: pad 10 20, rad 6, bg #2271C1, col white\nFrame gap 12\n  Btn "A"\n  Btn "B"\n  Btn "C"',
    async (api: TestAPI) => {
      // The `Btn:` definition is a property-set, not a node, so node-1 is
      // the Frame and the three Btn use-sites are node-2/3/4. Move "B"
      // (node-3) to position 0 inside the Frame (node-1).
      await api.interact.moveElement('node-3', 'node-1', 0)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Btn: pad 10 20, rad 6, bg #2271C1, col white\nFrame gap 12\n  Btn "B"\n  Btn "A"\n  Btn "C"'
      )
      assertParentHasChildren(api, 'B', ['B', 'A', 'C'])
    }
  ),

  testWithSetup(
    'Move component instance across sibling containers',
    'Btn: pad 10, bg #2271C1, col white\nFrame hor, gap 12, pad 16\n  Frame gap 8, bg #1a1a1a, pad 12\n    Btn "Source"\n  Frame gap 8, bg #2a2a2a, pad 12\n    Btn "Existing"',
    async (api: TestAPI) => {
      // node-3 = Btn "Source" (in left Frame), node-4 = right Frame.
      await api.interact.moveElement('node-3', 'node-4', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Btn: pad 10, bg #2271C1, col white\nFrame hor, gap 12, pad 16\n  Frame gap 8, bg #1a1a1a, pad 12\n  Frame gap 8, bg #2a2a2a, pad 12\n    Btn "Existing"\n    Btn "Source"'
      )
      assertParentHasChildren(api, 'Source', ['Existing', 'Source'])
    }
  ),
])

export const moveDeepSubtreeTests: TestCase[] = describe('Move - Deep sub-trees', [
  testWithSetup(
    'Move a Frame whose body contains nested Text children',
    'Frame gap 16, pad 16\n  Frame gap 8\n    Frame gap 4, bg #1a1a1a, pad 8\n      Text "Title"\n      Text "Subtitle"\n  Frame gap 8\n    Text "Drop Zone"',
    async (api: TestAPI) => {
      // node-3 is the inner card-Frame (gap 4, bg #1a1a1a) with 2 Text children.
      // node-6 is the right outer Frame, which contains Text "Drop Zone".
      await api.interact.moveElement('node-3', 'node-6', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'Frame gap 16, pad 16\n  Frame gap 8\n  Frame gap 8\n    Text "Drop Zone"\n    Frame gap 4, bg #1a1a1a, pad 8\n      Text "Title"\n      Text "Subtitle"'
      )
      // After the move, the right outer Frame (node-6 → renamed by the IR)
      // contains "Drop Zone" then the moved card. The card's fullText is
      // its concatenated descendants → "TitleSubtitle".
      assertParentHasChildren(api, 'Drop Zone', ['Drop Zone', 'TitleSubtitle'])
    }
  ),
])

export const moveTokenReferenceTests: TestCase[] = describe('Move - Token references', [
  testWithSetup(
    'Move element preserves $token property reference',
    'primary.bg: #2271C1\nFrame gap 16\n  Frame gap 8\n    Button "Save", bg $primary\n  Frame gap 8\n    Text "Other"',
    async (api: TestAPI) => {
      // node-3 = Button "Save" with `bg $primary`. node-4 = right outer Frame.
      await api.interact.moveElement('node-3', 'node-4', 1)
      await api.utils.waitForCompile()

      api.assert.codeEquals(
        'primary.bg: #2271C1\nFrame gap 16\n  Frame gap 8\n  Frame gap 8\n    Text "Other"\n    Button "Save", bg $primary'
      )
      assertParentHasChildren(api, 'Save', ['Other', 'Save'])
    }
  ),
])

export const moveUndoRedoTests: TestCase[] = describe('Move - Undo / Redo', [
  testWithSetup(
    'Undo restores pre-move source; redo re-applies the move',
    'Frame gap 12, pad 16\n  Text "First"\n  Button "Move Me"\n  Text "Last"',
    async (api: TestAPI) => {
      const before = api.editor.getCode()

      await api.interact.moveElement('node-3', 'node-1', 0)
      await api.utils.waitForCompile()

      const afterMove = api.editor.getCode()
      api.assert.ok(afterMove !== before, 'Move should have changed the source')

      // Undo
      api.editor.undo()
      await api.utils.waitForCompile()
      api.assert.equals(
        api.editor.getCode().trim(),
        before.trim(),
        'Undo should restore the original source'
      )

      // Redo
      api.editor.redo()
      await api.utils.waitForCompile()
      api.assert.equals(
        api.editor.getCode().trim(),
        afterMove.trim(),
        'Redo should re-apply the move'
      )
    }
  ),
])

export const allMoveEdgeCaseTests: TestCase[] = [
  ...moveComponentTests,
  ...moveDeepSubtreeTests,
  ...moveTokenReferenceTests,
  ...moveUndoRedoTests,
]
