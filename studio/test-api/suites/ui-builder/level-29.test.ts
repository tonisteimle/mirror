/**
 * UI Builder Level 29.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level29Tests = describe('Level 29: Order Dashboard', [
  // KPI cards row (4 cards)
  testWithSetup('Build KPI cards row', `Frame hor, gap 16, pad 16`, async (api: TestAPI) => {
    const kpiConfigs = [
      { bg: '#1a1a1a', accent: '#10b981' },
      { bg: '#1a1a1a', accent: '#2271C1' },
      { bg: '#1a1a1a', accent: '#f59e0b' },
      { bg: '#1a1a1a', accent: '#ef4444' },
    ]

    for (let i = 0; i < 4; i++) {
      await api.interact.dragFromPalette('Frame', 'node-1', i)
      await api.utils.delay(30)
      const cardId = `node-${i + 2}`
      await api.interact.click(cardId)
      await api.utils.delay(20)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '8')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bg', kpiConfigs[i].bg)
      await api.utils.delay(30)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bor-l', '4')
      await api.utils.delay(30)
      await api.panel.property.setProperty('boc', kpiConfigs[i].accent)
      await api.utils.delay(30)

      // Label
      await api.interact.dragFromPalette('Text', cardId, 0)
      await api.utils.delay(15)
      // Value (large)
      await api.interact.dragFromPalette('Text', cardId, 1)
      await api.utils.delay(15)
      // Change indicator row
      await api.interact.dragFromPalette('Frame', cardId, 2)
      await api.utils.delay(15)
    }
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('bor-l 4'), 'CODE: Left border accent')
    api.assert.ok(code.includes('#10b981'), 'CODE: Green accent')
    api.assert.ok(code.includes('#ef4444'), 'CODE: Red accent')
    const analysis = analyzeCode(code)
    api.assert.ok(
      analysis.countElements('Frame') >= 9,
      'CODE: 1 container + 4 cards + 4 change rows'
    )
  }),

  // Orders table with status badges (simplified: 4 columns, 2 rows)
  testWithSetup('Build orders table', `Frame gap 0, bg #0a0a0a, rad 8`, async (api: TestAPI) => {
    // Table header: node-2
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(50)
    await api.interact.click('node-2')
    await api.utils.delay(40)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(50)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(50)
    await api.panel.property.setProperty('pad', '12 16')
    await api.utils.delay(50)

    // 4 Header columns: Order#, Customer, Amount, Status
    await api.interact.dragFromPalette('Text', 'node-2', 0) // node-3
    await api.utils.delay(20)
    await api.interact.click('node-3')
    await api.utils.delay(15)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(20)

    await api.interact.dragFromPalette('Text', 'node-2', 1) // node-4
    await api.utils.delay(20)
    await api.interact.click('node-4')
    await api.utils.delay(15)
    await api.panel.property.setProperty('w', '120')
    await api.utils.delay(20)

    await api.interact.dragFromPalette('Text', 'node-2', 2) // node-5
    await api.utils.delay(20)
    await api.interact.dragFromPalette('Text', 'node-2', 3) // node-6
    await api.utils.delay(20)

    // Row 1: node-7
    await api.interact.dragFromPalette('Frame', 'node-1', 1)
    await api.utils.delay(40)
    await api.interact.click('node-7')
    await api.utils.delay(30)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('pad', '12 16')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ver-center', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('bor-b', '1')
    await api.utils.delay(40)
    await api.panel.property.setProperty('boc', '#1a1a1a')
    await api.utils.delay(40)

    // Row 1 cells
    await api.interact.dragFromPalette('Text', 'node-7', 0) // Order#
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-7', 1) // Customer
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-7', 2) // Amount
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-7', 3) // Status badge
    await api.utils.delay(15)

    // Row 2: node-12
    await api.interact.dragFromPalette('Frame', 'node-1', 2)
    await api.utils.delay(40)
    await api.interact.click('node-12')
    await api.utils.delay(30)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('pad', '12 16')
    await api.utils.delay(40)
    await api.panel.property.setProperty('ver-center', '')
    await api.utils.delay(40)
    await api.panel.property.setProperty('bor-b', '1')
    await api.utils.delay(40)
    await api.panel.property.setProperty('boc', '#1a1a1a')
    await api.utils.delay(40)

    // Row 2 cells
    await api.interact.dragFromPalette('Text', 'node-12', 0)
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-12', 1)
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-12', 2)
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-12', 3)
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('bor-b 1'), 'CODE: Row separators')
    api.assert.ok(code.includes('ver-center'), 'CODE: Vertical centering')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Text') >= 10, 'CODE: Headers + row cells')
    api.assert.ok(analysis.countElements('Frame') >= 5, 'CODE: Container + header + rows + badges')
  }),
])
