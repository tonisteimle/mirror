/**
 * UI Builder Level 12.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level12Tests: TestCase[] = describe('Level 12: App Layouts', [
  testWithSetup(
    'Build sidebar + main content layout',
    `Frame hor, w full, h full`,
    async (api: TestAPI) => {
      // === DROP Sidebar ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(300)

      // Style sidebar
      await api.interact.click('node-2')
      await api.utils.delay(200)
      await api.panel.property.setProperty('w', '240')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(300)

      // === DROP Main Content ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(300)

      // Style main content
      await api.interact.click('node-3')
      await api.utils.delay(200)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bg', '#0a0a0a')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Sidebar layout:', code)

      api.assert.ok(code.includes('w 240'), 'CODE: Sidebar should have fixed width')
      api.assert.ok(code.includes('grow'), 'CODE: Main should grow')
      api.assert.ok(code.includes('#111'), 'CODE: Sidebar bg')
    }
  ),

  testWithSetup(
    'Build header + main + footer layout',
    `Frame gap 0, w full, h full`,
    async (api: TestAPI) => {
      // === DROP Header ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(150)
      await api.interact.click('node-2')
      await api.utils.delay(100)
      await api.panel.property.setProperty('h', '60')
      await api.utils.delay(150)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(150)

      // === DROP Main ===
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(150)
      await api.interact.click('node-3')
      await api.utils.delay(100)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(150)

      // === DROP Footer ===
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(150)
      await api.interact.click('node-4')
      await api.utils.delay(100)
      await api.panel.property.setProperty('h', '50')
      await api.utils.delay(150)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(300)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Header/Main/Footer:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Should have 4 Frames')
      api.assert.ok(code.includes('h 60'), 'CODE: Header height')
      api.assert.ok(code.includes('grow'), 'CODE: Main grows')
      api.assert.ok(code.includes('h 50'), 'CODE: Footer height')
    }
  ),
])
