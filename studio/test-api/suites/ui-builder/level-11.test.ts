/**
 * UI Builder Level 11.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level11Tests: TestCase[] = describe('Level 11: Styling Workflows', [
  testWithSetup(
    'Style button: bg + color + padding + radius',
    `Frame pad 20
  Button "Click me"`,
    async (api: TestAPI) => {
      // === SELECT Button ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === APPLY STYLES ===
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(300)
      await api.panel.property.setProperty('col', 'white')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '12 24')
      await api.utils.delay(300)
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Styled button code:', code)

      api.assert.ok(code.includes('#2271C1'), 'CODE: Should have bg color')
      api.assert.ok(code.includes('white'), 'CODE: Should have text color')
      api.assert.ok(code.includes('pad'), 'CODE: Should have padding')
      api.assert.ok(code.includes('rad 8'), 'CODE: Should have radius')

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      api.assert.ok(
        button!.styles.backgroundColor.includes('34') ||
          button!.styles.backgroundColor.includes('113'),
        `PREVIEW: Button should have blue bg. Got: ${button!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Style card container: shadow + border',
    `Frame pad 20
  Frame gap 12
    Text "Card Title"
    Text "Card content"`,
    async (api: TestAPI) => {
      // === SELECT inner Frame (card) ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === APPLY CARD STYLES ===
      await api.panel.property.setProperty('bg', '#1a1a1a')
      await api.utils.delay(300)
      await api.panel.property.setProperty('pad', '20')
      await api.utils.delay(300)
      await api.panel.property.setProperty('rad', '12')
      await api.utils.delay(300)
      await api.panel.property.setProperty('bor', '1')
      await api.utils.delay(300)
      await api.panel.property.setProperty('boc', '#333')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Styled card code:', code)

      api.assert.ok(code.includes('#1a1a1a'), 'CODE: Should have bg')
      api.assert.ok(code.includes('pad 20'), 'CODE: Should have padding')
      api.assert.ok(code.includes('rad 12'), 'CODE: Should have radius')
      api.assert.ok(code.includes('bor 1'), 'CODE: Should have border')
      api.assert.ok(code.includes('#333'), 'CODE: Should have border color')
    }
  ),

  testWithSetup(
    'Style text: size + weight + color',
    `Frame pad 20
  Text "Heading"`,
    async (api: TestAPI) => {
      // === SELECT Text ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === APPLY TEXT STYLES ===
      await api.panel.property.setProperty('fs', '24')
      await api.utils.delay(300)
      await api.panel.property.setProperty('weight', 'bold')
      await api.utils.delay(300)
      await api.panel.property.setProperty('col', '#fff')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Styled text code:', code)

      api.assert.ok(code.includes('fs 24'), 'CODE: Should have font-size')
      api.assert.ok(code.includes('bold'), 'CODE: Should have font-weight')
      api.assert.ok(code.includes('#fff'), 'CODE: Should have color')
    }
  ),
])
