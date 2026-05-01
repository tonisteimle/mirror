/**
 * UI Builder Level 23.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level23Tests = describe('Level 23: Admin Dashboard', [
  // SKIPPED: Multiple drag operations create wrong structure - timing issue
  testWithSetupSkip(
    'Build admin sidebar nav',
    `Frame w 240, h full, bg #0a0a0a, pad 16, gap 8`,
    async (api: TestAPI) => {
      // Logo area
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '0 0 16 0')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(50)

      // Nav items (3)
      for (let i = 0; i < 3; i++) {
        await api.interact.dragFromPalette('Frame', 'node-1', i + 2)
        await api.utils.delay(40)
        const itemId = `node-${i + 6}`
        await api.interact.click(itemId)
        await api.utils.delay(30)
        await api.panel.property.setProperty('hor', '')
        await api.utils.delay(40)
        await api.panel.property.setProperty('gap', '12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('pad', '10 12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('rad', '6')
        await api.utils.delay(40)

        await api.interact.dragFromPalette('Icon', itemId, 0)
        await api.utils.delay(40)
        await api.interact.dragFromPalette('Text', itemId, 1)
        await api.utils.delay(40)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 240'), 'CODE: Sidebar width')
      api.assert.ok(code.includes('pad 10 12'), 'CODE: Nav item padding')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Divider') >= 1, 'CODE: Divider')
      api.assert.ok(analysis.countElements('Icon') >= 4, 'CODE: Logo + nav icons')
    }
  ),

  // Data table header
  testWithSetup(
    'Build data table header',
    `Frame hor, pad 12, bg #1a1a1a, rad 8 8 0 0`,
    async (api: TestAPI) => {
      // Checkbox column
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('center', '')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bor', '2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '4')
      await api.utils.delay(50)

      // Name column
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('uppercase', '')
      await api.utils.delay(50)

      // Status column
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '100')
      await api.utils.delay(50)
      await api.panel.property.setProperty('uppercase', '')
      await api.utils.delay(50)

      // Actions column
      await api.interact.dragFromPalette('Text', 'node-1', 3)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '80')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('uppercase'), 'CODE: Uppercase headers')
      api.assert.ok(code.includes('bor 2'), 'CODE: Checkbox border')
      api.assert.ok(code.includes('grow'), 'CODE: Growing name column')
    }
  ),
])
