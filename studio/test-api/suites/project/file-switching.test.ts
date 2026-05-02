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

  {
    name: 'Project: Editing tokens.tok keeps the layout in the preview',
    run: async (api: TestAPI) => {
      // Verifies the previewFile decoupling: when the editor is on a non-
      // layout file (tokens), the preview keeps showing the last-opened
      // layout — driven by the redirect inside compile() in app.ts.
      const w = window as any
      const studio = w.studio

      // Seed both files into the in-memory and desktop-files caches so the
      // prelude/cross-file token resolution sees them.
      const TOKENS = 'primary.bg: #2271C1\ntext.col: white'
      const LAYOUT = 'Frame bg $primary, pad 16, w 100, h 100\n  Text "Hello", col $text'
      w.files['tokens.tok'] = TOKENS
      w.files['app.mir'] = LAYOUT
      w.desktopFiles?.updateFileCache?.('tokens.tok', TOKENS)
      w.desktopFiles?.updateFileCache?.('app.mir', LAYOUT)

      // Force the preview to track app.mir, then drive the editor to
      // tokens.tok and call compile() the same way switchFile() does.
      studio.actions.setPreviewFile('app.mir')
      w.editor.dispatch({
        changes: { from: 0, to: w.editor.state.doc.length, insert: TOKENS },
      })
      // The local module-private `currentFile` is what compile() reads to
      // decide whether to redirect. We can't set it from the outside, but
      // calling the production switchFile flips it to 'tokens.tok' and
      // triggers compile(); the redirect inside should render app.mir.
      w.switchFile('tokens.tok')

      try {
        await api.utils.waitForCompile()
      } catch (e) {
        const cf = w.getCurrentFile?.()
        const pf = studio.state.get().previewFile
        throw new Error(
          `Compile timeout — redirect should produce layout nodes (cf=${cf} pf=${pf})`
        )
      }
      await api.utils.delay(100)

      const cf = w.getCurrentFile?.()
      const pf = studio.state.get().previewFile
      api.assert.ok(
        pf === 'app.mir',
        `previewFile should remain app.mir after switching editor to tokens.tok, got ${pf}`
      )

      const frame = api.preview.inspect('node-1')
      api.assert.ok(
        frame !== null && frame.styles.backgroundColor === 'rgb(34, 113, 193)',
        `Layout should render in blue while editor edits a non-layout file. ` +
          `bg=${frame?.styles.backgroundColor} cf=${cf} pf=${pf}`
      )

      delete w.files['tokens.tok']
      delete w.files['app.mir']
    },
  },
]
