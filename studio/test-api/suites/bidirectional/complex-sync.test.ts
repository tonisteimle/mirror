/**
 * Complex Sync Scenarios (multi-level nesting, reordering, property add/remove)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const complexSyncTests: TestCase[] = describe('Complex Sync', [
  testWithSetup(
    'Multi-level nesting syncs correctly',
    'Frame gap 16\n  Frame gap 8\n    Text "Level 2"\n    Frame gap 4\n      Text "Level 3"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.exists('node-5')

      api.assert.hasChildren('node-1', 1)
      api.assert.hasChildren('node-2', 2)
      api.assert.hasChildren('node-4', 1)
    }
  ),

  testWithSetup(
    'Reordering elements updates preview',
    'Frame gap 8\n  Text "First"\n  Text "Second"',
    async (api: TestAPI) => {
      await api.editor.setCode('Frame gap 8\n  Text "Second"\n  Text "First"')
      await api.utils.waitForCompile()

      const children = api.preview.getChildren('node-1')
      api.assert.ok(children.length === 2, 'Should have 2 children')
      api.assert.ok(children[0].textContent === 'Second', 'First child should now be "Second"')
    }
  ),

  testWithSetup('Adding properties to existing element', 'Button "Plain"', async (api: TestAPI) => {
    api.assert.exists('node-1')

    await api.editor.setCode('Button "Plain", bg #2271C1, col white, pad 12 24, rad 6')
    await api.utils.waitForCompile()

    api.assert.exists('node-1')
    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Button should exist after code change')
    api.assert.ok(
      info!.styles.borderRadius !== '0px',
      `Should have border radius, got: ${info!.styles.borderRadius}`
    )
  }),

  testWithSetup(
    'Removing properties from element',
    'Frame bg #333, pad 16, rad 8, shadow md',
    async (api: TestAPI) => {
      await api.editor.setCode('Frame bg #333')
      await api.utils.waitForCompile()

      api.assert.exists('node-1')
    }
  ),
])
