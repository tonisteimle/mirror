/**
 * UI Builder Level 2.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level2Tests: TestCase[] = describe('Level 2: Modify Existing Properties', [
  testWithSetup(
    'Change existing bg color via property panel',
    `Frame
  Button "Test", bg #333`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION: Change existing bg ===
      await api.panel.property.setProperty('bg', '#ff0000')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code after change:', code)

      const hasBgInCode = code.toLowerCase().includes('#ff0000') || code.includes('bg #ff0000')
      api.assert.ok(hasBgInCode, `CODE: Should contain bg #ff0000. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      const bgIsRed = button!.styles.backgroundColor.includes('255')
      api.assert.ok(
        bgIsRed,
        `PREVIEW: Button bg should be red. Got: ${button!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Change existing padding via property panel',
    `Frame
  Button "Test", pad 10`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION ===
      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code:', code)
      api.assert.ok(code.includes('pad 24'), `CODE: Should have pad 24. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      api.assert.ok(
        button!.styles.padding.includes('24'),
        `PREVIEW: Padding should include 24. Got: ${button!.styles.padding}`
      )
    }
  ),

  testWithSetup(
    'Change existing radius via property panel',
    `Frame
  Button "Test", rad 6`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION ===
      await api.panel.property.setProperty('rad', '20')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code:', code)
      api.assert.ok(code.includes('rad 20'), `CODE: Should have rad 20. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      api.assert.ok(
        button!.styles.borderRadius.includes('20'),
        `PREVIEW: Border radius should be 20px. Got: ${button!.styles.borderRadius}`
      )
    }
  ),
])
