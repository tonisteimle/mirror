/**
 * UI Builder Level 1.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level1Tests: TestCase[] = describe('Level 1: Single Element', [
  testWithSetup('Drop Button - verify code and preview', `Frame`, async (api: TestAPI) => {
    // === ACTION: Drop Button ===
    await api.interact.dragFromPalette('Button', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = analyzeCode(api.editor.getCode())
    api.assert.ok(code.hasElement('Button'), 'CODE: Should contain Button')

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    api.assert.ok(preview.elementCount >= 2, 'PREVIEW: Should have Frame + Button')

    const button = preview.elements.find(e => e.tagName === 'button')
    api.assert.ok(button !== undefined, 'PREVIEW: Should have button element')

    // Log for debugging
    console.log('=== Test Results ===')
    console.log('Code:', api.editor.getCode())
    console.log(
      'Preview elements:',
      preview.elements.map(e => `${e.nodeId}: ${e.tagName}`)
    )
  }),

  testWithSetup('Drop Text - verify code and preview', `Frame`, async (api: TestAPI) => {
    // === ACTION ===
    await api.interact.dragFromPalette('Text', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = analyzeCode(api.editor.getCode())
    api.assert.ok(code.hasElement('Text'), 'CODE: Should contain Text')

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    const textEl = preview.elements.find(e => e.tagName === 'span')
    api.assert.ok(textEl !== undefined, 'PREVIEW: Should have span element')

    console.log('Code:', api.editor.getCode())
  }),

  testWithSetup('Drop Icon - verify code and preview', `Frame`, async (api: TestAPI) => {
    // === ACTION ===
    await api.interact.dragFromPalette('Icon', 'node-1', 0)
    await api.utils.delay(500)

    // === VERIFY CODE ===
    const code = analyzeCode(api.editor.getCode())
    api.assert.ok(code.hasElement('Icon'), 'CODE: Should contain Icon')

    // === VERIFY PREVIEW ===
    const preview = analyzePreview()
    api.assert.ok(preview.elementCount >= 2, 'PREVIEW: Should have elements')

    console.log('Code:', api.editor.getCode())
  }),
])
