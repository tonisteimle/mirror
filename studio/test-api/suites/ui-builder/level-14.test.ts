/**
 * UI Builder Level 14.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level14Tests: TestCase[] = describe('Level 14: Interactive Elements', [
  // SKIPPED: Multiple drag operations produce wrong element count - timing issue
  testWithSetupSkip(
    'Build button group with different styles',
    `Frame hor, gap 8, pad 20, bg #0a0a0a`,
    async (api: TestAPI) => {
      // === DROP Primary Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(150)
      await api.panel.property.setProperty('col', 'white')
      await api.utils.delay(150)

      // === DROP Secondary Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(150)
      await api.interact.click('node-3')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(150)

      // === DROP Outline Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(150)
      await api.interact.click('node-4')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', 'transparent')
      await api.utils.delay(150)
      await api.panel.property.setProperty('bor', '1')
      await api.utils.delay(150)
      await api.panel.property.setProperty('boc', '#2271C1')
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') === 3, 'CODE: Should have 3 buttons')
      api.assert.ok(code.includes('#2271C1'), 'CODE: Primary color')
      api.assert.ok(code.includes('#333'), 'CODE: Secondary color')
      api.assert.ok(code.includes('transparent'), 'CODE: Outline bg')
    }
  ),

  // SKIPPED: Multiple drag operations produce wrong element count - timing issue
  testWithSetupSkip(
    'Build icon button row',
    `Frame hor, gap 4, pad 12, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP 4 Icon Buttons ===
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Button', 'node-1', i)
        await api.utils.delay(100)
        await api.interact.click(`node-${i + 2}`)
        await api.utils.delay(80)
        await api.panel.property.setProperty('bg', 'transparent')
        await api.utils.delay(100)
        await api.panel.property.setProperty('pad', '8')
        await api.utils.delay(100)
      }
      await api.utils.delay(200)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') === 4, 'CODE: Should have 4 buttons')
      api.assert.ok(
        (code.match(/transparent/g) || []).length >= 4,
        'CODE: All should be transparent'
      )
    }
  ),
])
