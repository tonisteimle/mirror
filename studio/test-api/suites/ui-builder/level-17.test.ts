/**
 * UI Builder Level 17.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level17Tests = describe('Level 17: E-Commerce Product Card', [
  // Product card (simplified)
  testWithSetup(
    'Build product card',
    `Frame gap 0, bg #1a1a1a, rad 12, w 280`,
    async (api: TestAPI) => {
      // Image
      await api.interact.dragFromPalette('Image', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('w', 'full')
      await api.utils.delay(60)
      await api.panel.property.setProperty('h', '180')
      await api.utils.delay(60)

      // Info section
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(60)
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(60)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(60)

      // Name + Button
      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.delay(60)
      await api.interact.dragFromPalette('Button', 'node-3', 1)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w full'), 'CODE: Full width image')
      api.assert.ok(code.includes('h 180'), 'CODE: Image height')
      api.assert.ok(code.includes('pad 16'), 'CODE: Info padding')
    }
  ),

  // Rating stars (simplified)
  testWithSetup('Build rating stars', `Frame hor, gap 4`, async (api: TestAPI) => {
    // 3 star icons (reduced from 5)
    for (let i = 0; i < 3; i++) {
      await api.interact.dragFromPalette('Icon', 'node-1', i)
      await api.utils.delay(50)
    }

    // Style stars
    await api.interact.click('node-2')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ic', '#f59e0b')
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ic', '#f59e0b')
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('ic #f59e0b'), 'CODE: Gold star')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Icon') >= 3, 'CODE: Star icons')
  }),
])
