/**
 * UI Builder Level 30.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level30Tests = describe('Level 30: Enterprise Admin Panel', [
  // Full app shell with sidebar
  testWithSetup(
    'Build enterprise app shell',
    `Frame hor, w full, h full, bg #0a0a0a`,
    async (api: TestAPI) => {
      // Sidebar
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('w', '240')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '0')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bor-r', '1')
      await api.utils.delay(50)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(50)

      // Logo area
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(30)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-3', 0)
      await api.utils.delay(20)
      await api.interact.click('node-4')
      await api.utils.delay(15)
      await api.panel.property.setProperty('fs', '18')
      await api.utils.delay(20)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(20)

      // Navigation groups (2 groups with items)
      for (let g = 0; g < 2; g++) {
        await api.interact.dragFromPalette('Frame', 'node-2', g + 1)
        await api.utils.delay(30)
        const groupId = `node-${5 + g * 5}`
        await api.interact.click(groupId)
        await api.utils.delay(20)
        await api.panel.property.setProperty('pad', '12')
        await api.utils.delay(30)
        await api.panel.property.setProperty('gap', '4')
        await api.utils.delay(30)

        // Group label
        await api.interact.dragFromPalette('Text', groupId, 0)
        await api.utils.delay(15)
        // 3 nav items per group
        for (let i = 0; i < 3; i++) {
          await api.interact.dragFromPalette('Frame', groupId, i + 1)
          await api.utils.delay(10)
        }
      }

      // Main content area
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-15')
      await api.utils.delay(40)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '0')
      await api.utils.delay(50)

      // Top header bar
      await api.interact.dragFromPalette('Frame', 'node-15', 0)
      await api.utils.delay(30)
      await api.interact.click('node-16')
      await api.utils.delay(20)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('spread', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('ver-center', '')
      await api.utils.delay(30)
      await api.panel.property.setProperty('pad', '12 24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(30)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(30)

      // Breadcrumb
      await api.interact.dragFromPalette('Text', 'node-16', 0)
      await api.utils.delay(15)
      // User menu
      await api.interact.dragFromPalette('Frame', 'node-16', 1)
      await api.utils.delay(15)

      // Page content
      await api.interact.dragFromPalette('Frame', 'node-15', 1)
      await api.utils.delay(30)
      await api.interact.click('node-19')
      await api.utils.delay(20)
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(30)
      await api.panel.property.setProperty('scroll', '')
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 240'), 'CODE: Sidebar width')
      api.assert.ok(code.includes('bor-r 1'), 'CODE: Sidebar border')
      api.assert.ok(code.includes('scroll'), 'CODE: Scrollable content')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 15, 'CODE: Complex nested structure')
    }
  ),

  // Dashboard content with widgets (simplified: 2 stat cards + chart/activity row)
  testWithSetup('Build dashboard widgets grid', `Frame gap 24, pad 24`, async (api: TestAPI) => {
    // Top row: 2 stat cards
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(50)
    await api.interact.click('node-2')
    await api.utils.delay(40)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(50)
    await api.panel.property.setProperty('gap', '16')
    await api.utils.delay(50)

    // Card 1: node-3
    await api.interact.dragFromPalette('Frame', 'node-2', 0)
    await api.utils.delay(30)
    await api.interact.click('node-3')
    await api.utils.delay(20)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '20')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)

    await api.interact.dragFromPalette('Icon', 'node-3', 0) // node-4
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-3', 1) // node-5
    await api.utils.delay(15)

    // Card 2: node-6
    await api.interact.dragFromPalette('Frame', 'node-2', 1)
    await api.utils.delay(30)
    await api.interact.click('node-6')
    await api.utils.delay(20)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '20')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)

    await api.interact.dragFromPalette('Icon', 'node-6', 0) // node-7
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Text', 'node-6', 1) // node-8
    await api.utils.delay(15)

    // Middle row: Chart + Activity (node-9)
    await api.interact.dragFromPalette('Frame', 'node-1', 1)
    await api.utils.delay(50)
    await api.interact.click('node-9')
    await api.utils.delay(40)
    await api.panel.property.setProperty('hor', '')
    await api.utils.delay(50)
    await api.panel.property.setProperty('gap', '16')
    await api.utils.delay(50)

    // Chart widget: node-10
    await api.interact.dragFromPalette('Frame', 'node-9', 0)
    await api.utils.delay(30)
    await api.interact.click('node-10')
    await api.utils.delay(20)
    await api.panel.property.setProperty('grow', '')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '16')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)
    await api.panel.property.setProperty('h', '200')
    await api.utils.delay(30)

    await api.interact.dragFromPalette('Text', 'node-10', 0) // Chart title
    await api.utils.delay(15)

    // Activity widget: node-12
    await api.interact.dragFromPalette('Frame', 'node-9', 1)
    await api.utils.delay(30)
    await api.interact.click('node-12')
    await api.utils.delay(20)
    await api.panel.property.setProperty('w', '280')
    await api.utils.delay(30)
    await api.panel.property.setProperty('bg', '#111')
    await api.utils.delay(30)
    await api.panel.property.setProperty('pad', '16')
    await api.utils.delay(30)
    await api.panel.property.setProperty('rad', '8')
    await api.utils.delay(30)
    await api.panel.property.setProperty('gap', '12')
    await api.utils.delay(30)

    // Activity title + 2 items
    await api.interact.dragFromPalette('Text', 'node-12', 0) // Title
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-12', 1) // Item 1
    await api.utils.delay(15)
    await api.interact.dragFromPalette('Frame', 'node-12', 2) // Item 2
    await api.utils.delay(150)

    const code = api.editor.getCode()
    api.assert.ok(code.includes('h 200'), 'CODE: Chart height')
    api.assert.ok(code.includes('w 280'), 'CODE: Activity width')
    const analysis = analyzeCode(code)
    api.assert.ok(analysis.countElements('Frame') >= 8, 'CODE: Dashboard structure')
    api.assert.ok(analysis.countElements('Icon') >= 2, 'CODE: Stat icons')
  }),
])
