/**
 * UI Builder Level 28.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level28Tests = describe('Level 28: Employee Management', [
  // Employee list with dense rows (simplified to 3 rows)
  testWithSetup(
    'Build employee list panel',
    `Frame w 320, h full, bg #111, gap 0`,
    async (api: TestAPI) => {
      // Search header: node-2
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(50)
      await api.interact.click('node-2')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(50)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(50)
      await api.panel.property.setProperty('boc', '#222')
      await api.utils.delay(50)

      // Search input: node-3
      await api.interact.dragFromPalette('Input', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', 'full')
      await api.utils.delay(30)

      // Row 1: node-4, children: node-5, node-6
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(40)
      await api.interact.click('node-4')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#1a1a1a')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Frame', 'node-4', 0) // Avatar placeholder
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-4', 1) // Name
      await api.utils.delay(20)

      // Row 2: node-7, children: node-8, node-9
      await api.interact.dragFromPalette('Frame', 'node-1', 2)
      await api.utils.delay(40)
      await api.interact.click('node-7')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#1a1a1a')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Frame', 'node-7', 0) // Avatar placeholder
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-7', 1) // Name
      await api.utils.delay(20)

      // Row 3: node-10, children: node-11, node-12
      await api.interact.dragFromPalette('Frame', 'node-1', 3)
      await api.utils.delay(40)
      await api.interact.click('node-10')
      await api.utils.delay(30)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bor-b', '1')
      await api.utils.delay(40)
      await api.panel.property.setProperty('boc', '#1a1a1a')
      await api.utils.delay(40)

      await api.interact.dragFromPalette('Frame', 'node-10', 0) // Avatar placeholder
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-10', 1) // Name
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('w 320'), 'CODE: Fixed sidebar width')
      api.assert.ok(code.includes('w full'), 'CODE: Full width search')
      const analysis = analyzeCode(code)
      api.assert.ok(
        analysis.countElements('Frame') >= 8,
        'CODE: Container + search + 3 rows with avatars'
      )
      api.assert.ok(analysis.countElements('Text') >= 3, 'CODE: Employee names')
    }
  ),

  // Employee detail form
  testWithSetup(
    'Build employee detail form',
    `Frame grow, pad 24, gap 24, bg #0a0a0a, scroll`,
    async (api: TestAPI) => {
      // Header with avatar + name
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

      // Large avatar
      await api.interact.dragFromPalette('Frame', 'node-2', 0)
      await api.utils.delay(30)
      await api.interact.click('node-3')
      await api.utils.delay(20)
      await api.panel.property.setProperty('w', '80')
      await api.utils.delay(30)
      await api.panel.property.setProperty('h', '80')
      await api.utils.delay(30)
      await api.panel.property.setProperty('rad', '99')
      await api.utils.delay(30)
      await api.panel.property.setProperty('bg', '#333')
      await api.utils.delay(30)

      // Name + Title
      await api.interact.dragFromPalette('Frame', 'node-2', 1)
      await api.utils.delay(30)
      await api.interact.click('node-4')
      await api.utils.delay(20)
      await api.panel.property.setProperty('gap', '4')
      await api.utils.delay(30)

      await api.interact.dragFromPalette('Text', 'node-4', 0) // Name
      await api.utils.delay(20)
      await api.interact.click('node-5')
      await api.utils.delay(15)
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(20)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(20)
      await api.interact.dragFromPalette('Text', 'node-4', 1) // Title
      await api.utils.delay(20)

      // Form sections (2 columns)
      await api.interact.dragFromPalette('Frame', 'node-1', 1)
      await api.utils.delay(50)
      await api.interact.click('node-7')
      await api.utils.delay(40)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(50)
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(50)

      // Left column - Personal Info
      await api.interact.dragFromPalette('Frame', 'node-7', 0)
      await api.utils.delay(40)
      await api.interact.click('node-8')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(40)

      // Section title
      await api.interact.dragFromPalette('Text', 'node-8', 0)
      await api.utils.delay(20)
      // 4 form fields
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Frame', 'node-8', i + 1)
        await api.utils.delay(15)
      }

      // Right column - Employment Info
      await api.interact.dragFromPalette('Frame', 'node-7', 1)
      await api.utils.delay(40)
      await api.interact.click('node-14')
      await api.utils.delay(30)
      await api.panel.property.setProperty('grow', '')
      await api.utils.delay(40)
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('bg', '#111')
      await api.utils.delay(40)
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(40)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(40)

      // Section title
      await api.interact.dragFromPalette('Text', 'node-14', 0)
      await api.utils.delay(20)
      // 4 form fields
      for (let i = 0; i < 4; i++) {
        await api.interact.dragFromPalette('Frame', 'node-14', i + 1)
        await api.utils.delay(15)
      }
      await api.utils.delay(150)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('scroll'), 'CODE: Scrollable content')
      api.assert.ok(code.includes('rad 99'), 'CODE: Round avatar')
      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Frame') >= 14, 'CODE: Nested form structure')
    }
  ),
])
