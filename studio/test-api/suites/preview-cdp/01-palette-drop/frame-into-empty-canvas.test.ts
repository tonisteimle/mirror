/**
 * Preview CDP — Palette drop: Frame into empty canvas.
 *
 * SKIPPED — Suite-Test-Setup-Bug (nicht Test-Bug).
 *
 * Wenn das Suite-Test-Setup `__compileTestCode('')` ruft (was den
 * editor leert UND `testModeActive = true` setzt), blockt Studios
 * Drag-Pipeline alle Drops in einen leeren Canvas. Das `drag:dropped`
 * Event in `studio/init/init-notifications.ts` checked `if (!target)
 * return` BEVOR es zum Empty-Canvas-Fallback kommt — und im Suite-Test
 * mit empty editor ist `target` null.
 *
 * Atomic test 6 (`tools/atomic-input-tests.ts` test 6) führt EXAKT
 * dieselbe CDP-Maus-Sequenz aus und produziert einen `Frame` im
 * Editor — weil dort der Code via `editor.dispatch({changes: ...})`
 * gesetzt wird, OHNE `__compileTestCode` und damit OHNE testMode.
 *
 * Fix benötigt: entweder `__compileTestCode` so anpassen dass die
 * Empty-Canvas-Drop-Pipeline arbeitet, oder einen Test-Mode-Override
 * im `drag:dropped`-Handler. Bis dahin: dieser Spezialfall via
 * atomic-input-tests #6 abgedeckt, hier skipped.
 *
 * Maus-Sequenz (sobald entskipped):
 *   1. CDP mouse-drag von Palette-Item "Frame" zur Mitte des leeren
 *      Previews (Trusted-Events lösen Studios HTML5-Drag aus).
 *
 * Verifiziert (sobald entskipped):
 *   - Editor-Code beginnt mit "Frame".
 *   - Preview rendert genau ein `[data-mirror-id]`-Element.
 *   - Selektion landet automatisch auf dem neuen Knoten.
 */

import { testWithSetup, describe } from '../../../test-runner'
import type { TestCase, TestAPI } from '../../../types'
import { requireActions } from '../_shared/actions'
import { allPreviewNodeIds } from '../_shared/selectors'
import { FIXTURES } from '../_shared/fixtures'

export const frameIntoEmptyCanvasTests: TestCase[] = describe('preview-cdp.palette-drop', [
  testWithSetup(
    'Drag Frame from palette to empty preview produces a single top-level Frame',
    FIXTURES.empty,
    async (api: TestAPI) => {
      const actions = requireActions()
      await actions.dropFromPalette('Frame', { byPath: 'preview' })

      const code = api.editor.getCode().trim()
      api.assert.matches(code, /^Frame\b/, 'editor source should start with "Frame"')
      const ids = allPreviewNodeIds()
      api.assert.equals(ids.length, 1, 'preview has one node')
      api.assert.equals(api.panel.property.getSelectedNodeId(), ids[0], 'auto-selected')
    }
  ),
])
