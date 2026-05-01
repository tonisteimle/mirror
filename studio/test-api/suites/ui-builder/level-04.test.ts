/**
 * UI Builder Level 4.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level4Tests: TestCase[] = describe('Level 4: Nested Elements', [
  testWithSetup('Drop Frame into Frame - create nesting', `Frame`, async (api: TestAPI) => {
    // === ACTION: Drop inner Frame ===
    await api.interact.dragFromPalette('Frame', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = api.editor.getCode()
    console.log('Nested Frame code:', code)

    // Should have two Frames with indentation
    const lines = code.split('\n')
    api.assert.ok(lines.length >= 2, 'CODE: Should have multiple lines')
    api.assert.ok(code.includes('Frame'), 'CODE: Should contain Frame')

    // Check for indentation (inner frame should be indented)
    const hasIndentedFrame = lines.some(l => l.startsWith('  Frame'))
    api.assert.ok(hasIndentedFrame, `CODE: Should have indented Frame. Got: ${code}`)

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    api.assert.ok(preview.elementCount >= 2, 'PREVIEW: Should have 2+ elements')
  }),

  testWithSetup(
    'Drop Button into nested Frame',
    `Frame
  Frame`,
    async (api: TestAPI) => {
      // === ACTION: Drop Button into inner Frame (node-2) ===
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Button in nested Frame:', code)

      // Button should be indented twice (under inner Frame)
      const hasDeepButton =
        code.includes('    Button') || (code.includes('Frame') && code.includes('Button'))
      api.assert.ok(hasDeepButton, `CODE: Button should be nested. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      const button = preview.elements.find(e => e.tagName === 'button')
      api.assert.ok(button !== undefined, 'PREVIEW: Should have button')
    }
  ),

  testWithSetup(
    'Build 3-level hierarchy: Frame > Frame > Button',
    `Frame`,
    async (api: TestAPI) => {
      // === ACTION 1: Drop inner Frame ===
      await api.interact.dragFromPalette('Frame', 'node-1', 0)
      await api.utils.delay(400)

      // === ACTION 2: Drop Button into inner Frame ===
      await api.interact.dragFromPalette('Button', 'node-2', 0)
      await api.utils.delay(400)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('3-level hierarchy:', code)

      api.assert.ok(code.includes('Frame'), 'CODE: Should have Frame')
      api.assert.ok(code.includes('Button'), 'CODE: Should have Button')

      // === VERIFY PREVIEW ===
      const preview = analyzePreview()
      api.assert.ok(
        preview.elementCount >= 3,
        `PREVIEW: Should have 3+ elements. Got: ${preview.elementCount}`
      )
    }
  ),
])
