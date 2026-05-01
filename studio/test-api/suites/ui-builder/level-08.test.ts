/**
 * UI Builder Level 8.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level8Tests: TestCase[] = describe('Level 8: Build Form', [
  testWithSetup(
    'Build login form: labels + inputs + button',
    `Frame gap 16, pad 24, bg #1a1a1a, rad 12, w 300`,
    async (api: TestAPI) => {
      // === DROP Email Label ===
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(300)

      // === DROP Email Input ===
      await api.interact.dragFromPalette('Input', 'node-1', 1)
      await api.utils.delay(300)

      // === DROP Password Label ===
      await api.interact.dragFromPalette('Text', 'node-1', 2)
      await api.utils.delay(300)

      // === DROP Password Input ===
      await api.interact.dragFromPalette('Input', 'node-1', 3)
      await api.utils.delay(300)

      // === DROP Submit Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 4)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Login form code:', code)

      const analysis = analyzeCode(code)
      api.assert.ok(analysis.countElements('Text') >= 2, 'CODE: Should have 2+ Text elements')
      api.assert.ok(analysis.countElements('Input') >= 2, 'CODE: Should have 2+ Input elements')
      api.assert.ok(analysis.countElements('Button') >= 1, 'CODE: Should have Button')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const inputs = preview.elements.filter(e => e.tagName === 'input')
      api.assert.ok(inputs.length >= 2, `PREVIEW: Should have 2+ inputs. Got: ${inputs.length}`)
    }
  ),

  testWithSetup(
    'Build form field group: horizontal label + input',
    `Frame gap 12, pad 20, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP horizontal row ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(300)

      // Make it horizontal by adding hor property
      await api.interact.click('node-2')
      await api.utils.delay(200)
      await api.panel.property.setProperty('hor', '')
      await api.utils.delay(300)
      await api.panel.property.setProperty('gap', '12')
      await api.utils.delay(300)

      // === DROP Label into row ===
      await api.interact.dragFromPalette('Text', 'node-2', 0)
      await api.utils.delay(300)

      // === DROP Input into row ===
      await api.interact.dragFromPalette('Input', 'node-2', 1)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Form field group:', code)

      api.assert.ok(code.includes('hor'), 'CODE: Inner Frame should be horizontal')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Input'), 'CODE: Should have Input')
    }
  ),
])
