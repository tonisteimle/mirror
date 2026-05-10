/**
 * Preview CDP — Move: reorder top-level siblings.
 *
 * SKIPPED — gleiche Wurzel wie der Empty-Canvas-Drop (siehe
 * `frame-into-empty-canvas.test.ts`): top-level Frames im
 * Suite-Test-Setup haben KEINEN gemeinsamen `data-mirror-id`-Parent
 * (kein synthetic root). `moveElement` braucht aber einen target
 * container. Reorder via Maus-Drag über die Geschwister hinweg ist
 * der echte User-Pfad — der landet bei Studios `drag:dropped`-
 * Handler mit `target=null` und wird durch das `if (!target) return`
 * verworfen (gleiches Studio-Issue wie der Empty-Canvas-Drop-Bug).
 *
 * Wird wieder grün, sobald Studios drag-pipeline auch ohne expliziten
 * Target-Container reorder-Drops am root akzeptiert.
 */

import { testWithSetupSkip, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { FIXTURES } from '../_shared/fixtures'

export const reorderSiblingsTests: TestCase[] = describe('preview-cdp.move', [
  testWithSetupSkip(
    'Move red Frame to index 0 reorders siblings (red before blue)',
    FIXTURES.twoFramesStacked,
    async (api: TestAPI) => {
      const codeBefore = api.editor.getCode()
      api.assert.matches(
        codeBefore,
        /Frame[^\n]*#2271C1[\s\S]*Frame[^\n]*#ef4444/,
        'blue before red'
      )

      const actions = requireActions()
      // Without a synthetic root, no targetSel is available. Future
      // implementation: drop near the very top of #preview.
      void actions
      api.assert.ok(false, 'pending: needs root-drop support in mirror-actions')
    }
  ),
])
