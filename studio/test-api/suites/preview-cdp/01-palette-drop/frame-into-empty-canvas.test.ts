/**
 * Preview CDP — Palette drop: Frame into empty canvas.
 *
 * Maus-Sequenz:
 *   1. CDP mouse-drag von Palette-Item "Frame" zur Mitte des leeren
 *      Previews (Trusted-Events lösen Studios HTML5-Drag aus).
 *
 * Verifiziert:
 *   - Editor-Code beginnt mit "Frame".
 *   - Preview rendert genau ein `[data-mirror-id]`-Element.
 *   - Selektion landet automatisch auf dem neuen Knoten.
 *
 * Vorgeschichte: Test war vorübergehend skipped wegen testMode-aware
 * `if (!target) return`-Gate vor dem Empty-Canvas-Fallback in
 * `init-notifications.ts`. Fix in `d3115504` hat den Null-Gate unter
 * den Fallback verschoben — Test ist seither aktive Regression-
 * Abdeckung.
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
