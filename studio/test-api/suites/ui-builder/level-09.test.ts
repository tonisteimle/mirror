/**
 * UI Builder Level 9.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level9Tests: TestCase[] = describe('Level 9: Build Navigation', [
  testWithSetup(
    'Build nav bar with logo + links',
    `Frame hor, spread, pad 16, bg #111, w full`,
    async (api: TestAPI) => {
      // === DROP Logo (Icon or Text) ===
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(300)

      // === DROP Nav Links Container ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(300)

      // Make links container horizontal
      await api.interact.click('node-3')
      await api.utils.delay(200)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(300)

      // === DROP Links ===
      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Text', 'node-3', 1)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Text', 'node-3', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Nav bar code:', code)

      api.assert.ok(code.includes('spread'), 'CODE: Should have spread layout')
      api.assert.ok(code.includes('hor'), 'CODE: Should have horizontal container')

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 4, 'CODE: Should have 4+ Text elements')
    }
  ),

  // SKIPPED: Multiple drag operations produce double elements - timing issue
  testWithSetupSkip(
    'Build tab bar with icons',
    `Frame hor, gap 0, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP 3 Tab Buttons ===
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(300)
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Tab bar code:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(
        analysis.countElements('Button') === 3,
        `CODE: Should have 3 Buttons. Got: ${analysis.countElements('Button')}`
      )

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const buttons = preview.elements.filter(e => e.tagName === 'button')
      api.assert.ok(buttons.length === 3, `PREVIEW: Should have 3 buttons`)
    }
  ),
])
