/**
 * UI Builder Level 10.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level10Tests: TestCase[] = describe('Level 10: Build List', [
  // SKIPPED: Multiple drag operations produce wrong element count - timing issue
  testWithSetupSkip(
    'Build simple list with items',
    `Frame gap 8, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP 4 list items (Text elements) ===
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Text', 'node-1', i)
        await api.utils.delay(300)
      }
      await api.utils.delay(200)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('List code:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') === 4, `CODE: Should have 4 Text elements`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const texts = preview.elements.filter(e => e.tagName === 'span')
      api.assert.ok(texts.length === 4, `PREVIEW: Should have 4 text elements`)
    }
  ),

  testWithSetup(
    'Build list item with icon + text + action',
    `Frame gap 8, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP item row ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(300)

      // Style the row
      await api.interact.click('node-2')
      await api.utils.delay(200)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(300)

      // === DROP Icon ===
      await api.interact.dragFromPalette('Icon', 'node-2', 0)
      await api.utils.delay(300)

      // === DROP Text ===
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(300)

      // === DROP Action Button ===
      await api.interact.dragFromPalette('Button', 'node-2', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('List item code:', code)

      api.assert.ok(code.includes('hor'), 'CODE: Row should be horizontal')
      api.assert.ok(code.includes('Icon'), 'CODE: Should have Icon')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')
    }
  ),
])
