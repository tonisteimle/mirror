/**
 * Studio Selection Tests (single-select via Studio API)
 *
 * For multi-select / shift-click / meta-click see multiselect.test.ts
 * For editor-line-based multi-select see editor-multiselect.test.ts
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const selectionTests: TestCase[] = describe('Selection', [
  testWithSetup(
    'Can select element via Studio API',
    'Frame gap 8\n  Button "Select me"\n  Text "Other"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      await api.studio.setSelection('node-2')

      const selection = api.studio.getSelection()
      api.assert.ok(selection === 'node-2', `Button should be selected, got "${selection}"`)
    }
  ),

  testWithSetup(
    'Can select element via interact API',
    'Frame gap 8\n  Button "Select me"\n  Text "Other"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      api.interact.select('node-2')
      await api.utils.waitForIdle()

      const selection = api.studio.getSelection()
      api.assert.ok(selection === 'node-2', 'Button should be selected')
    }
  ),

  testWithSetup('Can clear selection', 'Frame\n  Button "Test"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.studio.setSelection('node-2')
    api.assert.ok(api.studio.getSelection() === 'node-2', 'Should be selected')

    api.studio.clearSelection()
    await api.utils.waitForIdle()

    const selection = api.studio.getSelection()
    api.assert.ok(selection === null, 'Selection should be cleared')
  }),

  testWithSetup(
    'Wait for selection helper',
    'Frame gap 8\n  Button "A"\n  Button "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')

      api.studio.clearSelection()
      await api.utils.waitForIdle()

      const initialSelection = api.state.getSelection()
      api.assert.ok(
        initialSelection === null,
        `Selection should be cleared initially, got: ${initialSelection}`
      )

      setTimeout(() => api.studio.setSelection('node-2'), 100)

      const selected = await api.studio.waitForSelection(1000)
      api.assert.ok(selected === 'node-2', `Expected node-2, got "${selected}"`)
    }
  ),
])
