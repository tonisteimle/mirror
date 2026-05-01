/**
 * UI Builder Level 18.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level18Tests = describe('Level 18: Media Gallery', [
  // Image grid (simplified - 3 cards instead of 6)
  testWithSetup('Build image grid', `Frame wrap, gap 8, hor`, async (api: TestAPI) => {
    // Create 3 image cards
    for (let i = 0; i < 3; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(50)
      const nodeId = `node-${i + 2}`
      await api.interact.click(nodeId)
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '150')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '150')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#222')
      await api.utils.delay(50)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('wrap'), 'CODE: Wrap layout')
    api.assert.ok(code.includes('w 150'), 'CODE: Card width')
    api.assert.ok(code.includes('h 150'), 'CODE: Card height')
  }),

  // Featured + thumbnails (simplified - 2 thumbnails)
  testWithSetup('Build featured image with thumbnails', `Frame gap 8`, async (api: TestAPI) => {
    // Featured image
    await api.interact.dragFromPalette('Image', 'node-1', 0)
    await api.utils.delay(60)
    await api.interact.click('node-2')
    await api.utils.delay(50)
    await api.panel.property.setProperty('w', '400')
    await api.utils.delay(60)
    await api.panel.property.setProperty('h', '300')
    await api.utils.delay(60)

    // Thumbnail row
    await api.interact.dragFromPalette('Frame', 'node-1', 1)
    await api.utils.delay(60)
    await api.interact.click('node-3')
    await api.utils.delay(50)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(60)
    await api.panel.property.setProperty('gap', '8')
    await api.utils.delay(60)

    // 2 thumbnails
    await api.interact.dragFromPalette('Image', 'node-3', 0)
    await api.utils.delay(60)
    await api.interact.dragFromPalette('Image', 'node-3', 1)
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('w 400'), 'CODE: Featured width')
    api.assert.ok(code.includes('h 300'), 'CODE: Featured height')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Image') >= 3, 'CODE: Featured + thumbnails')
  }),
])
