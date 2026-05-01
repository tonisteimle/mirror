/**
 * UI Builder Level 7.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level7Tests: TestCase[] = describe('Level 7: Build Card UI', [
  testWithSetup(
    'Build card with title and button',
    `Frame gap 12, pad 16, bg #1a1a1a, rad 8`,
    async (api: TestAPI) => {
      // === DROP Text (title) ===
      await api.interact.dragFromPalette('Text', 'node-1', 0)
      await api.utils.delay(400)

      // === DROP Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 1)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Simple card:', code)

      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')
      api.assert.ok(code.includes('rad 8'), 'CODE: Should have rad 8')
      api.assert.ok(code.includes('pad 16'), 'CODE: Should have pad 16')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const frame = findElementInPreview('node-1')

      // STRICT: Frame must exist and have correct styles
      api.assert.ok(frame !== null, 'PREVIEW: Frame node-1 must exist in preview')
      api.assert.ok(
        frame!.styles.borderRadius.includes('8'),
        `PREVIEW: Card should have border-radius. Got: ${frame!.styles.borderRadius}`
      )
    }
  ),

  testWithSetup(
    'Build card with header row + content',
    `Frame gap 16, pad 20, bg #1a1a1a, rad 12`,
    async (api: TestAPI) => {
      // === DROP Header Frame ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(400)

      // === DROP Content Text ===
      await api.interact.dragFromPalette('Text', 'node-1', 1)
      await api.utils.delay(400)

      // === DROP Action Button ===
      await api.interact.dragFromPalette('Button', 'node-1', 2)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Card with sections:', code)

      api.assert.ok(code.includes('Frame'), 'CODE: Should have Frame')
      api.assert.ok(code.includes('Text'), 'CODE: Should have Text')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')

      // Count elements
      const analysis = analyzeCode(code)
      const frameCount = analysis.countElements('Frame')
      api.assert.ok(frameCount >= 2, `CODE: Should have 2+ Frames. Got: ${frameCount}`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      api.assert.ok(preview.elementCount >= 4, `PREVIEW: Should have 4+ elements`)
    }
  ),
])
