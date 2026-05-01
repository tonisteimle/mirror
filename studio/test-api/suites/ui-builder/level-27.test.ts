/**
 * UI Builder Level 27.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level27Tests = describe('Level 27: Invoice Form', [
  // Invoice header with customer info
  testWithSetup(
    'Build invoice header section',
    `Frame gap 24, pad 24, bg #111, rad 12`,
    async (api: TestAPI) => {
      // Top row: Invoice # + Date
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(50)

      // Invoice number group
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(40)
      await api.interact.click('node-3')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-3', 0) // Label
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Text', 'node-3', 1) // Value
      await api.utils.delay(30)
      await api.interact.click('node-5')
      await api.utils.delay(20)
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(30)

      // Date group
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(40)
      await api.interact.click('node-6')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-6', 0)
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-6', 1)
      await api.utils.delay(30)

      // Customer info row (2 columns)
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-9')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(50)

      // From column
      await api.interact.dragFromPalette('Frame', 'node-9', 0)
      await api.utils.delay(40)
      await api.interact.click('node-10')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-10', 0) // "From"
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-10', 1) // Company
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-10', 2) // Address
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-10', 3) // Email
      await api.utils.delay(30)

      // To column
      await api.interact.dragFromPalette('Frame', 'node-9', 1)
      await api.utils.delay(40)
      await api.interact.click('node-15')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Text', 'node-15', 0) // "To"
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-15', 1) // Company
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-15', 2) // Address
      await api.utils.delay(30)
      await api.interact.dragFromPalette('Input', 'node-15', 3) // Email
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('fs 24'), 'CODE: Large invoice number')
      api.assert.ok(code.includes('grow'), 'CODE: Growing columns')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Input') >= 7, 'CODE: Form inputs')
    }
  ),

  // Invoice line items table
  testWithSetup(
    'Build invoice line items',
    `Frame gap 0, bg #0a0a0a, rad 8`,
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
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(50)

      // Headers: Item, Qty, Price, Total, Actions
      const headers = [{ w: 'grow' }, { w: '80' }, { w: '100' }, { w: '100' }, { w: '60' }]
      for (let i = 0; i < 5; i++) {
        await api.interact.dragFromPalette('Text', 'node-2', i)
        await api.utils.delay(20)
        const textId = `node-${i + 3}`
        await api.interact.click(textId)
        await api.utils.delay(15)
        if (headers[i].w === 'grow') {
          await api.panel.property.setProperty('grow', '')
        } else {
          await api.panel.property.setProperty('w', headers[i].w)
        }
        await api.utils.delay(20)
        await api.panel.property.setProperty('fs', '12')
        await api.utils.delay(20)
        await api.panel.property.setProperty('weight', '500')
        await api.utils.delay(20)
      }

      // 2 line item rows with inputs
      for (let row = 0; row < 2; row++) {
        await api.interact.dragFromPalette('Frame', 'node-1', row + 1)
        await api.utils.delay(40)
        const rowId = `node-${8 + row * 6}`
        await api.interact.click(rowId)
        await api.utils.delay(30)
        await api.panel.property.setProperty('hor', '')
        await api.utils.delay(40)
        await api.panel.property.setProperty('pad', '12')
        await api.utils.delay(40)
        await api.panel.property.setProperty('gap', '8')
        await api.utils.delay(40)
        await api.panel.property.setProperty('ver-center', '')
        await api.utils.delay(40)

        // Item description (input, growing)
        await api.interact.dragFromPalette('Input', rowId, 0)
        await api.utils.delay(20)
        // Qty (input)
        await api.interact.dragFromPalette('Input', rowId, 1)
        await api.utils.delay(20)
        // Price (input)
        await api.interact.dragFromPalette('Input', rowId, 2)
        await api.utils.delay(20)
        // Total (text, calculated)
        await api.interact.dragFromPalette('Text', rowId, 3)
        await api.utils.delay(20)
        // Delete button
        await api.interact.dragFromPalette('Icon', rowId, 4)
        await api.utils.delay(20)
      }

      // Add line button
      await api.interact.dragFromPalette('Button', 'node-1', 3)
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('ver-center'), 'CODE: Vertically centered rows')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Input') >= 6, 'CODE: Line item inputs')
      api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Delete icons')
    }
  ),
])
