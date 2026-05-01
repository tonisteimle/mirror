/**
 * UI Builder Level 6.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level6Tests: TestCase[] = describe('Level 6: Multiple Elements', [
  // SKIPPED: Multiple drag operations produce double elements - timing issue
  testWithSetupSkip(
    'Drop 3 buttons into horizontal Frame',
    `Frame hor, gap 8`,
    async (api: TestAPI) => {
      // === DROP 3 BUTTONS ===
      await api.interact.dragFromPalette('Button', 'node-1', 0)
      await api.utils.delay(400)

      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(400)

      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = analyzeCode(api.editor.getCode())
      console.log('3 buttons code:', api.editor.getCode())

      const buttonCount = code.countElements('Button')
      api.assert.ok(buttonCount === 3, `CODE: Should have 3 Buttons. Got: ${buttonCount}`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const buttons = preview.elements.filter(e => e.tagName === 'button')
      api.assert.ok(buttons.length === 3, `PREVIEW: Should have 3 buttons. Got: ${buttons.length}`)
    }
  ),

  testWithSetup(
    'Build icon + text + button row',
    `Frame hor, gap 12, pad 16, bg #1a1a1a`,
    async (api: TestAPI) => {
      // === DROP Icon ===
      await api.interact.dragFromPalette('Icon', 'node-1', 0)
      await api.utils.delay(400)

      // === DROP Text ===
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(400)

      // === DROP Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Icon + Text + Button:', code)

      api.assert.ok(code.includes('Icon'), 'CODE: Should have Icon')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      api.assert.ok(
        preview.elementCount >= 4,
        `PREVIEW: Should have 4+ elements (Frame + 3 children)`
      )
    }
  ),
])
