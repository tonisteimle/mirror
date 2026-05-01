/**
 * UI Builder Level 16.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level16Tests = describe('Level 16: Chat Interface', [
  // Chat message bubbles (simplified)
  testWithSetup(
    'Build chat message bubbles',
    `Frame gap 12, pad 16, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Incoming message
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(60)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(60)

      // Outgoing message
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(60)
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(60)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('bg #2271C1'), 'CODE: Outgoing message')
      api.assert.ok(code.includes('bg #1a1a1a'), 'CODE: Incoming message')
      api.assert.ok(code.includes('rad 12'), 'CODE: Bubble radius')
    }
  ),

  // Chat input area
  testWithSetup(
    'Build chat input area',
    `Frame hor, gap 8, pad 12, bg #1a1a1a`,
    async (api: TestAPI) => {
      // Input
      await api.interact.dragFromPalette('Input', 'node-1', 0)
      await api.utils.delay(60)
      await api.interact.click('node-2')
      await api.utils.delay(50)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(60)
      await api.panel.property.setProperty('rad', '20')
      await api.utils.delay(60)

      // Send button
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(60)
      await api.interact.click('node-3')
      await api.utils.delay(50)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('grow'), 'CODE: Input grows')
      api.assert.ok(code.includes('rad 20'), 'CODE: Rounded input')
      api.assert.ok(code.includes('rad 99'), 'CODE: Circular button')
    }
  ),
])
