/**
 * UI Builder Level 13.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level13Tests: TestCase[] = describe('Level 13: Dashboard Grid', [
  testWithSetup('Build 2x2 card grid', `Frame gap 16, pad 20, bg #0a0a0a`, async (api: TestAPI) => {
    // === DROP Row 1 ===
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(150)
    await api.interact.click('node-2')
    await api.utils.delay(100)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(150)
    await api.panel.property.setProperty('gap', '16')
    await api.utils.delay(150)

    // === DROP Card 1 ===
    await api.interact.dragFromPalette('Frame', 'node-2', 0)
    await api.utils.delay(150)
    await api.interact.click('node-3')
    await api.utils.delay(100)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(150)
    await api.panel.property.setProperty('bg', '#1a1a1a')
    await api.utils.delay(150)
    await api.panel.property.setProperty('rad', '12')
    await api.utils.delay(150)

    // === DROP Card 2 ===
    await api.interact.dragFromPalette('Frame', 'node-2', 1)
    await api.utils.delay(150)
    await api.interact.click('node-4')
    await api.utils.delay(100)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(150)
    await api.panel.property.setProperty('bg', '#1a1a1a')
    await api.utils.delay(150)
    await api.panel.property.setProperty('rad', '12')
    await api.utils.delay(300)

    // === VERIFY CODE ===
    const code = api.editor.getCode()
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Should have 4+ Frames')
    api.assert.ok(code.includes('hor'), 'CODE: Row should be horizontal')
    api.assert.ok((code.match(/grow/g) || []).length >= 2, 'CODE: Cards should grow')
  }),

  testWithSetup(
    'Build stat card with icon + number + label',
    `Frame gap 16, pad 20, bg #0a0a0a`,
    async (api: TestAPI) => {
      // === DROP Card container ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(150)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(150)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(150)

      // === DROP Icon ===
      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(150)

      // === DROP Number (big text) ===
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(150)
      await api.interact.click('node-4')
      await api.utils.delay(100)
      await api.panel.property.setProperty('fs', '32')
      await api.utils.delay(150)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(150)

      // === DROP Label ===
      await api.interact.dragFromPalette('Text', 'node-2', 2)
      await api.utils.delay(150)
      await api.interact.click('node-5')
      await api.utils.delay(100)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Icon'), 'CODE: Should have Icon')
      api.assert.ok(code.includes('fs 32'), 'CODE: Number should be large')
      api.assert.ok(code.includes('bold'), 'CODE: Number should be bold')
      api.assert.ok(code.includes('#888'), 'CODE: Label should be muted')
    }
  ),
])
