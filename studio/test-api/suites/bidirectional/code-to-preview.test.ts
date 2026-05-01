/**
 * Code → Preview Tests (editor changes propagate to preview)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const codeToPreviewTests: TestCase[] = describe('Code → Preview', [
  testWithSetup('Text content appears in preview', 'Text "Hello World"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasText('node-1', 'Hello World')
  }),

  testWithSetup('Changing text updates preview', 'Text "Original"', async (api: TestAPI) => {
    api.assert.hasText('node-1', 'Original')

    await api.editor.setCode('Text "Updated"')
    await api.utils.waitForCompile()

    api.assert.hasText('node-1', 'Updated')
  }),

  testWithSetup(
    'Adding element creates new node',
    'Frame gap 8\n  Text "First"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 1)

      await api.editor.setCode('Frame gap 8\n  Text "First"\n  Text "Second"')
      await api.utils.waitForCompile()

      api.assert.hasChildren('node-1', 2)
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'Removing element removes node',
    'Frame gap 8\n  Text "Keep"\n  Text "Remove"',
    async (api: TestAPI) => {
      api.assert.hasChildren('node-1', 2)

      await api.editor.setCode('Frame gap 8\n  Text "Keep"')
      await api.utils.waitForCompile()

      api.assert.hasChildren('node-1', 1)
    }
  ),

  testWithSetup('Style change updates element', 'Frame bg #333', async (api: TestAPI) => {
    await api.editor.setCode('Frame bg #ff0000')
    await api.utils.waitForCompile()

    const info = api.preview.inspect('node-1')
    api.assert.ok(info !== null, 'Frame should exist after code change')

    const bgColor = info!.styles.backgroundColor
    const isRed = bgColor.includes('255') && bgColor.includes('0')
    api.assert.ok(isRed, `Background should be red (rgb(255, 0, 0)), got: ${bgColor}`)
  }),

  testWithSetup(
    'Layout change updates flexbox',
    'Frame\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.hasStyle('node-1', 'flexDirection', 'column')

      await api.editor.setCode('Frame hor\n  Text "A"\n  Text "B"')
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-1', 'flexDirection', 'row')
    }
  ),
])
