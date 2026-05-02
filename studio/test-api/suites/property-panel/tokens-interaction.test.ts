/**
 * Token Interaction Tests
 *
 * Verifies that interacting with tokens / properties via the panel
 * (clickToken, setProperty) propagates back to the editor source.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tokenInteractionTests: TestCase[] = describe('Token Interaction', [
  testWithSetup(
    'Clicking token via Panel API updates code',
    `sm.pad: 8
md.pad: 16

Frame pad 20, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const success = await api.panel.property.clickToken('pad', 'sm')
      api.assert.ok(success, 'Token click should succeed')

      await api.utils.waitForIdle()

      const code = api.editor.getCode()
      // The Spacing section renders 6 token rows (H/V/T/R/B/L); clickToken
      // hits the first matching button (the Horizontal row), which writes
      // to `pad-x` rather than the full shorthand. Either the per-axis
      // token reference or the per-axis literal value (8) is acceptable.
      const padFamily = /(?:^|\s|,)pad(?:-[xytrbl])?\s+(?:\$sm(?:\.pad)?|8)\b/
      api.assert.ok(
        padFamily.test(code),
        `Code should contain a pad-family token reference or literal 8, got: ${code.substring(code.indexOf('Frame'), code.indexOf('Frame') + 80)}`
      )
    }
  ),

  testWithSetup('Set property via Panel API', `Frame pad 16, bg #333`, async (api: TestAPI) => {
    await api.studio.setSelection('node-1')
    await api.utils.waitForIdle()

    const selectedId = await api.panel.property.waitForSelectedNodeId()
    api.assert.ok(selectedId === 'node-1', `Panel should show node-1, got "${selectedId}"`)

    const success = await api.panel.property.setProperty('pad', '24')
    api.assert.ok(success, 'setProperty should succeed')

    await api.utils.delay(800)
    await api.utils.waitForCompile()

    const code = api.editor.getCode()
    api.assert.ok(code.includes('pad 24'), `Code should contain pad 24, got: ${code}`)
  }),
])
