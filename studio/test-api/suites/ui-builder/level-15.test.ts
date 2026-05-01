/**
 * UI Builder Level 15.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level15Tests: TestCase[] = describe('Level 15: Complex Nesting', [
  testWithSetup(
    'Build settings panel with sections',
    `Frame gap 24, pad 24, bg #0a0a0a, w 400`,
    async (api: TestAPI) => {
      // === SECTION 1: Profile ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(150)

      // Section title + Input row
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(100)
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(100)
      await api.interact.click('node-4')
      await api.utils.delay(80)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(100)

      await api.interact.dragFromPalette('Input', 'node-4', 0)
      await api.utils.delay(100)
      await api.interact.dragFromPalette('Button', 'node-4', 1)
      await api.utils.delay(150)

      // === SECTION 2: Preferences ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(150)
      await api.interact.click('node-7')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(100)

      await api.interact.dragFromPalette('Text', 'node-7', 0)
      await api.utils.delay(100)
      await api.interact.dragFromPalette('Switch', 'node-7', 1)
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      api.assert.ok(code.includes('Input'), 'CODE: Should have Input')
      api.assert.ok(code.includes('Switch'), 'CODE: Should have Switch')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Should have nested Frames')
    }
  ),

  testWithSetup(
    'Build comment card with avatar + actions',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // === Header Row with Avatar ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(100)
      await api.interact.click('node-2')
      await api.utils.delay(80)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(100)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(100)

      // Avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(80)
      await api.interact.click('node-3')
      await api.utils.delay(60)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(80)
      await api.panel.property.setProperty('h', '40')
      await api.utils.delay(80)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(80)

      // Name
      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(80)

      // === Content ===
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(80)

      // === Actions ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(80)
      await api.interact.dragFromPalette('Button', 'node-1', 3)
      await api.utils.delay(200)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      api.assert.ok(code.includes('rad 99'), 'CODE: Avatar should be round')
      api.assert.ok(code.includes('w 40'), 'CODE: Avatar size')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 2, 'CODE: Multiple text elements')
      api.assert.ok(analysis.countElements('Button') >= 2, 'CODE: Action buttons')
    }
  ),
])
