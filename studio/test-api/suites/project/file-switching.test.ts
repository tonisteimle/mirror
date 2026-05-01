/**
 * Project — File Switching & Sync
 */

import type { TestSuite, TestAPI } from '../../types'

// =============================================================================
// File Switching Tests
// =============================================================================

export const fileSwitchingTests: TestSuite = [
  {
    name: 'Project: File list tracks created files',
    run: async (api: TestAPI) => {
      const files = api.panel.files
      const initialCount = files.list().length

      // Create two layout files
      await files.create('screen1.mir', 'Frame bg #f00\n  Text "Screen 1"')
      await files.create('screen2.mir', 'Frame bg #0f0\n  Text "Screen 2"')
      await api.utils.delay(200)

      // Check file list
      const fileList = files.list()
      api.assert.ok(
        fileList.length >= initialCount + 2,
        `Should have at least 2 more files, got ${fileList.length - initialCount}`
      )

      // Check content retrieval
      const content1 = files.getContent('screen1.mir')
      api.assert.ok(content1 !== null && content1 !== undefined, 'Screen 1 content should exist')
      api.assert.ok(
        content1!.includes('Screen 1'),
        `Should retrieve Screen 1 content, got: "${content1}"`
      )

      const content2 = files.getContent('screen2.mir')
      api.assert.ok(content2 !== null && content2 !== undefined, 'Screen 2 content should exist')
      api.assert.ok(
        content2!.includes('Screen 2'),
        `Should retrieve Screen 2 content, got: "${content2}"`
      )

      await files.delete('screen1.mir')
      await files.delete('screen2.mir')
    },
  },

  {
    name: 'Project: Edit file, switch, switch back',
    run: async (api: TestAPI) => {
      const files = api.panel.files

      await files.create('test1.mir', 'Frame bg #333\n  Text "Original"')
      await files.create('test2.mir', 'Frame bg #666')
      await api.utils.delay(200)

      // Open and edit test1
      await files.open('test1.mir')
      await api.utils.delay(200)

      await api.editor.setCode('Frame bg #333\n  Text "Modified"')
      await api.utils.delay(100)

      // Switch to test2
      await files.open('test2.mir')
      await api.utils.delay(200)

      // Switch back to test1
      await files.open('test1.mir')
      await api.utils.delay(200)

      const code = api.editor.getCode()
      api.assert.ok(code.includes('Modified'), 'Edit should be preserved after switching')

      await files.delete('test1.mir')
      await files.delete('test2.mir')
    },
  },
]
