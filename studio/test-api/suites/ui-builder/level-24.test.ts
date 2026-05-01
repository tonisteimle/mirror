/**
 * UI Builder Level 24.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level24Tests = describe('Level 24: Settings Page', [
  // Settings section with toggles
  testWithSetup(
    'Build settings section with toggles',
    `Frame gap 16, pad 24, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // Section header
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(50)

      // Setting row 1
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '12 0')
      await api.utils.delay(50)

      // Label text
      await api.interact.dragFromPalette('Text', 'node-4', 0)
      await api.utils.delay(50)
      // Toggle placeholder
      await api.interact.dragFromPalette('Frame', 'node-4', 1)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '40')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '24')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 18'), 'CODE: Section header size')
      api.assert.ok(code.includes('spread'), 'CODE: Spread row')
      api.assert.ok(code.includes('rad 12'), 'CODE: Toggle radius')
    }
  ),

  // Account info card
  testWithSetup(
    'Build account info card',
    `Frame gap 16, pad 20, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // Header with avatar
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Avatar
      await api.interact.dragFromPalette('Image', 'node-2', 0)
      await api.utils.delay(50)
      await api.interact.click('node-3')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '64')
      await api.utils.delay(50)
      await api.panel.property.setProperty('h', '64')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(50)

      // Name + email
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Text', 'node-4', 0)
      await api.utils.delay(50)
      await api.interact.click('node-5')
      await api.utils.delay(40)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(50)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(50)

      await api.interact.dragFromPalette('Text', 'node-4', 1)
      await api.utils.delay(50)
      await api.interact.click('node-6')
      await api.utils.delay(40)
      await api.panel.property.setProperty('col', '#888')
      await api.utils.delay(50)

      // Divider
      await api.interact.dragFromPalette('Divider', 'node-1', 1)
      await api.utils.delay(50)

      // Edit button
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 64'), 'CODE: Avatar size')
      api.assert.ok(code.includes('rad 99'), 'CODE: Round avatar')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Divider') >= 1, 'CODE: Divider')
      api.assert.ok(analysis.countElements('Button') >= 1, 'CODE: Edit button')
    }
  ),
])
