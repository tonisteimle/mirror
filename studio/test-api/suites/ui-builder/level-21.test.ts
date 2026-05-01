/**
 * UI Builder Level 21.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level21Tests = describe('Level 21: E-Commerce Product Page', [
  // Product page header with breadcrumb + search
  testWithSetup(
    'Build e-commerce header with search',
    `Frame hor, spread, pad 16, bg #111, ver-center`,
    async (api: TestAPI) => {
      // Logo
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '20')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Search bar
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#222')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Icon', 'node-3', 0)
      await api.utils.delay(50)
      await api.interact.dragFromPalette('Input', 'node-3', 1)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(50)

      // Cart icon
      await api.interact.dragFromPalette('Icon', 'node-1', 2)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('spread'), 'CODE: Spread layout')
      api.assert.ok(code.includes('grow'), 'CODE: Growing input')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Icons')
      api.assert.ok(analysis.countElements('Input') >= 1, 'CODE: Search input')
    }
  ),

  // Product grid (2x2)
  testWithSetup('Build product grid 2x2', `Frame wrap, gap 16, hor`, async (api: TestAPI) => {
    // Create 4 product cards
    for (let i = 0; i < 4; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(40)
      const cardId = `node-${i + 2}`
      await api.interact.click(cardId)
      await api.utils.delay(30)
      await api.panel.property.setProperty('w', '200')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(40)

      // Image placeholder
      await api.interact.dragFromPalette('Frame', cardId, 0)
      await api.utils.delay(40)
      // Title
      await api.interact.dragFromPalette('Text', cardId, 1)
      await api.utils.delay(40)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('wrap'), 'CODE: Wrap layout')
    api.assert.ok(code.includes('w 200'), 'CODE: Card width')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Frame') >= 9, 'CODE: Container + 4 cards + images')
  }),
])
