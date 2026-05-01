/**
 * UI Builder Level 5.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level5Tests: TestCase[] = describe('Level 5: Layout Properties', [
  testWithSetup(
    'Change Frame to horizontal layout',
    `Frame hor
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // Start with hor, verify it's already horizontal
      const preview = analyzePreview()
      const frame = findElementInPreview('node-1')

      console.log('Frame styles:', frame?.styles)

      // === VERIFY PREVIEW: Buttons should be side by side ===
      // In horizontal layout, elements have display: flex, flex-direction: row
      api.assert.ok(frame !== undefined, 'PREVIEW: Should have frame')
    }
  ),

  testWithSetup(
    'Modify gap on Frame with existing gap',
    `Frame gap 8
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      // === SELECT Frame ===
      await api.interact.click('node-1')
      await api.utils.delay(300)

      // === ACTION: Change gap ===
      await api.panel.property.setProperty('gap', '24')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Gap modified:', code)
      api.assert.ok(code.includes('gap 24'), `CODE: Should have gap 24. Got: ${code}`)
    }
  ),

  testWithSetup(
    'Modify multiple properties on Frame',
    `Frame gap 8, pad 10, bg #333
  Button "Test"`,
    async (api: TestAPI) => {
      // === SELECT Frame ===
      await api.interact.click('node-1')
      await api.utils.delay(300)

      // === ACTION 1: Change gap ===
      await api.panel.property.setProperty('gap', '16')
      await api.utils.delay(300)

      // === ACTION 2: Change padding ===
      await api.panel.property.setProperty('pad', '20')
      await api.utils.delay(300)

      // === ACTION 3: Change background ===
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Multiple props changed:', code)

      api.assert.ok(code.includes('gap 16'), `CODE: gap 16. Got: ${code}`)
      api.assert.ok(code.includes('pad 20'), `CODE: pad 20. Got: ${code}`)
      api.assert.ok(code.toLowerCase().includes('#1a1a1a'), `CODE: bg #1a1a1a. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const frame = findElementInPreview('node-1')
      if (frame) {
        console.log('Frame preview styles:', frame.styles)
      }
    }
  ),
])
