/**
 * UI Builder Level 19.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level19Tests = describe('Level 19: Multi-Section Dashboard', [
  // Dashboard stats row (simplified - 2 cards)
  testWithSetup(
    'Build dashboard stats row',
    `Frame gap 16, pad 24, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Stats row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(60)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(60)

      // 2 stat cards
      for (let i = 0; i < 2; i++) {
        await api.interact.dragFromPalette('Frame', 'node-2', i)
        await api.utils.delay(50)
        const cardId = `node-${i + 3}`
        await api.interact.click(cardId)
        await api.utils.delay(40)
        await api.panel.property.setProperty('grow', '')
        await api.utils.delay(50)
        await api.panel.property.setProperty('bg', '#1a1a1a')
        await api.utils.delay(50)
        await api.panel.property.setProperty('rad', '8')
        await api.utils.delay(50)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('gap 16'), 'CODE: Row gap')
      api.assert.ok(code.includes('grow'), 'CODE: Grow cards')
      api.assert.ok(code.includes('rad 8'), 'CODE: Card radius')
    }
  ),

  // Activity feed (simplified - 2 items)
  testWithSetup(
    'Build activity feed',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // Header
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(60)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(60)

      // 2 activity items
      for (let i = 0; i < 2; i++) {
        await api.interact.dragFromPalette('Frame', 'node-1', i + 2)
        await api.utils.delay(50)
        const itemId = `node-${i + 4}`
        await api.interact.click(itemId)
        await api.utils.delay(40)
        await api.panel.property.setProperty('hor', '')
        await api.utils.delay(50)
        await api.panel.property.setProperty('gap', '12')
        await api.utils.delay(50)

        await api.interact.dragFromPalette('Icon', itemId, 0)
        await api.utils.delay(50)
        await api.interact.dragFromPalette('Text', itemId, 1)
        await api.utils.delay(50)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('weight bold'), 'CODE: Bold header')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Divider') >= 1, 'CODE: Divider')
      api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Icons')
    }
  ),
])
