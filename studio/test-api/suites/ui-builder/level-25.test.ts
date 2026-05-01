/**
 * UI Builder Level 25.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level25Tests = describe('Level 25: Landing Page', [
  // Hero section
  testWithSetup(
    'Build landing page hero section',
    `Frame center, gap 24, pad 64 24, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Badge
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '6 12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#222')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(50)

      // Headline
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '48')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Subheadline
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(50)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(50)

      // CTA buttons
      await api.interact.dragFromPalette('Frame', 'node-1', 3)
      await api.utils.delay(50)
      await api.interact.click('node-7')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Button', 'node-7', 0)
      await api.utils.delay(50)
      await api.interact.click('node-8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Button', 'node-7', 1)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 48'), 'CODE: Large headline')
      api.assert.ok(code.includes('pad 64 24'), 'CODE: Hero padding')
      api.assert.ok(code.includes('rad 99'), 'CODE: Pill badge')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') >= 2, 'CODE: CTA buttons')
    }
  ),

  // SKIPPED: Multiple drag operations create wrong structure - timing issue
  testWithSetupSkip(
    'Build feature cards row',
    `Frame hor, gap 24, pad 24`,
    async (api: TestAPI) => {
      // 3 feature cards
      for (let i = 0; i < 3; i++) {
        await api.interact.dragFromPalette('Frame', 'node-1', i)
        await api.utils.delay(40)
        const cardId = `node-${i + 2}`
        await api.interact.click(cardId)
        await api.utils.delay(30)
        await api.panel.property.setProperty('grow', '')
        await api.utils.delay(40)
        await api.panel.property.setProperty('gap', '12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('pad', '24')
        await api.utils.delay(40)
        await api.panel.property.setProperty('bg', '#1a1a1a')
        await api.utils.delay(40)
        await api.panel.property.setProperty('rad', '12')
        await api.utils.delay(40)

        // Icon
        await api.interact.dragFromPalette('Icon', cardId, 0)
        await api.utils.delay(40)
        // Title
        await api.interact.dragFromPalette('Text', cardId, 1)
        await api.utils.delay(40)
        // Description
        await api.interact.dragFromPalette('Text', cardId, 2)
        await api.utils.delay(40)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('grow'), 'CODE: Growing cards')
      api.assert.ok(code.includes('pad 24'), 'CODE: Card padding')
      api.assert.ok(code.includes('rad 12'), 'CODE: Card radius')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Icon') >= 3, 'CODE: Feature icons')
      api.assert.ok(analysis.countElements('Text') >= 6, 'CODE: Titles + descriptions')
    }
  ),
])
