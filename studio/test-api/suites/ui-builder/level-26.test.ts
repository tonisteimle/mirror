/**
 * UI Builder Level 26.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level26Tests = describe('Level 26: CRM Data Table', [
  // Dense table header with filters, search, actions
  testWithSetup(
    'Build CRM table toolbar',
    `Frame gap 12, pad 16, bg #111`,
    async (api: TestAPI) => {
      // Top row: Title + Actions
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(50)

      // Title
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.panel.property.setProperty('fs', '20')
      await api.utils.delay(40)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(40)

      // Action buttons container
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(50)
      await api.interact.click('node-4')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(50)

      // Export, Filter, Add buttons
      await api.interact.dragFromPalette('Button', 'node-4', 0)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Button', 'node-4', 1)
      await api.utils.delay(40)
      await api.interact.dragFromPalette('Button', 'node-4', 2)
      await api.utils.delay(40)
      await api.interact.click('node-7')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(50)

      // Filter row
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-8')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(50)

      // Search input
      await api.interact.dragFromPalette('Input', 'node-8', 0)
      await api.utils.delay(40)
      await api.interact.click('node-9')
      await api.utils.delay(30)
      await api.panel.property.setProperty('w', '240')
      await api.utils.delay(40)

      // Filter dropdowns (3x Frame as placeholder)
      for (let i = 0; i < 3; i++) {
        await api.interact.dragFromPalette('Frame', 'node-8', i + 1)
        await api.utils.delay(30)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('spread'), 'CODE: Spread layout')
      api.assert.ok(code.includes('w 240'), 'CODE: Search width')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Button') >= 3, 'CODE: Action buttons')
      api.assert.ok(analysis.countElements('Input') >= 1, 'CODE: Search input')
    }
  ),

  // Dense data table with header + rows (simplified)
  testWithSetup(
    'Build CRM table with 3 columns',
    `Frame gap 0, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Header row
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(50)
      await api.panel.property.setProperty('pad', '12 16')
      await api.utils.delay(50)

      // 3 column headers (Name, Status, Actions)
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('fs', '12')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-2', 1)
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', '100')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-2', 2)
      await api.utils.delay(30)
      await api.interact.click('node-5')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', '80')
      await api.utils.delay(30)

      // 2 data rows
      // Row 1: node-6
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(40)
      await api.interact.click('node-6')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12 16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-6', 0)
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Frame', 'node-6', 1) // Status badge
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Icon', 'node-6', 2) // Action
      await api.utils.delay(20)

      // Row 2: node-10
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(40)
      await api.interact.click('node-10')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12 16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('bor-b 1'), 'CODE: Row borders')
      api.assert.ok(code.includes('pad 12 16'), 'CODE: Row padding')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 4, 'CODE: Headers + row texts')
      api.assert.ok(analysis.countElements('Frame') >= 4, 'CODE: Container + header + rows')
    }
  ),
])
