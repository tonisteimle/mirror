/**
 * UI Builder Level 3.
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { analyzePreview, findElementInPreview, analyzeCode } from './_helpers'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _keepUtilImports = { analyzePreview, findElementInPreview, analyzeCode }

export const level3Tests: TestCase[] = describe('Level 3: Add New Properties', [
  testWithSetup(
    'Add bg property to element without bg',
    `Frame
  Button "Test"`,
    async (api: TestAPI) => {
      // === DEBUG: Log initial state ===
      const initialCode = api.editor.getCode()
      console.log('Initial code:', initialCode)

      // === SELECT ===
      await api.interact.click('node-2')

      // Verify selection (use async version with retry)
      const selectedId = await api.panel.property.waitForSelectedNodeId()
      console.log('Selected node ID:', selectedId)

      // === ACTION: Try to add new property ===
      const result = await api.panel.property.setProperty('bg', '#2271C1')
      console.log('setProperty result:', result)
      await api.utils.delay(500)

      // === VERIFY ===
      const code = api.editor.getCode()
      console.log('Code after setProperty:', code)

      const hasNewBg = code.includes('#2271C1') || code.includes('bg #2271C1')
      api.assert.ok(hasNewBg, `CODE: Should contain bg #2271C1. Got: ${code}`)

      // === VERIFY PREVIEW ===
      const button = findElementInPreview('node-2')
      api.assert.ok(button !== null, 'PREVIEW: Button element must exist')

      // Verify the background color was applied (rgb contains 34, 113, 193 for #2271C1)
      api.assert.ok(
        button!.styles.backgroundColor.includes('34') ||
          button!.styles.backgroundColor.includes('113'),
        `PREVIEW: Button should have blue bg #2271C1. Got: ${button!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Add padding property to element without padding',
    `Frame
  Text "Hello"`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ACTION ===
      await api.panel.property.setProperty('pad', '20')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code after adding pad:', code)

      const hasPad = code.includes('pad 20')
      api.assert.ok(hasPad, `CODE: Should contain pad 20. Got: ${code}`)
    }
  ),

  testWithSetup(
    'Add multiple properties to element',
    `Frame
  Button "Click"`,
    async (api: TestAPI) => {
      // === SELECT ===
      await api.interact.click('node-2')
      await api.utils.delay(300)

      // === ADD bg ===
      await api.panel.property.setProperty('bg', '#2271C1')
      await api.utils.delay(400)

      // === ADD pad ===
      await api.panel.property.setProperty('pad', '16')
      await api.utils.delay(400)

      // === ADD rad ===
      await api.panel.property.setProperty('rad', '8')
      await api.utils.delay(500)

      // === VERIFY CODE ===
      const code = api.editor.getCode()
      console.log('Code after adding 3 properties:', code)

      api.assert.ok(code.includes('#2271C1'), `CODE: Should have bg. Got: ${code}`)
      api.assert.ok(code.includes('pad 16'), `CODE: Should have pad 16. Got: ${code}`)
      api.assert.ok(code.includes('rad 8'), `CODE: Should have rad 8. Got: ${code}`)
    }
  ),
])
