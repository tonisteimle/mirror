/**
 * Tutorial — Code → Preview (videos/tut-07-code-edit.webm)
 *
 * Vom leeren Canvas zur Card: Frame, Title, Desc, Button — jede Zeile
 * rendert direkt nach dem Tippen. Demonstriert die Code → Preview
 * Richtung des Studios.
 *
 * Embedded in: docs/tutorial/18-studio.html
 */

import { testWithSetup, describe } from '../../test-runner'
import type { TestCase, TestAPI } from '../../types'
import { FIXTURES } from '../preview-cdp/_shared/fixtures'
import { centerOf, querySafe, requireCdpInput, requireOsMouse, sleep } from './_shared/actions'

const LINES = [
  'Frame w 280, pad 16, gap 8, bg #1a1a1a, rad 8',
  '  Text "Mirror Studio", col white, fs 18, weight 600',
  '  Text "AI-assisted UI design", col #888',
  '  Button "Mehr erfahren", bg #2271C1, col white, pad 8 16, rad 6',
]

export const tutorial07: TestCase[] = describe('demos.tutorial', [
  testWithSetup(
    'tut-07: Code → Preview (live render while typing)',
    FIXTURES.empty,
    async (api: TestAPI) => {
      const osMouse = requireOsMouse()
      const cdpInput = requireCdpInput()

      // Initial state: empty editor, empty preview.
      api.assert.equals(
        document.querySelectorAll('#preview [data-mirror-id]').length,
        0,
        'preview starts empty'
      )

      // Focus the CodeMirror editor so keystrokes go there. The editor's
      // .cm-content is the editable target.
      const editor = querySafe('.cm-content')
      await osMouse.moveTo(centerOf(editor))
      await sleep(500)
      await cdpInput.mouseClick({ x: centerOf(editor).x, y: centerOf(editor).y })
      await sleep(400)
      api.assert.ok(
        document.activeElement?.classList.contains('cm-content'),
        'CodeMirror editor is focused'
      )

      // Cumulative setCode per line. CodeMirror typing via CDP is racy
      // (chars get dropped when Studio's debounced compile re-renders
      // the preview, which can pull focus from the editor). Instead we
      // setCode for each cumulative line, then briefly highlight the
      // newly added line by moving the cursor on the right side. The
      // viewer sees the editor and preview grow line by line.
      let cumulative = ''
      for (let i = 0; i < LINES.length; i++) {
        cumulative += (i === 0 ? '' : '\n') + LINES[i]
        await api.editor.setCode(cumulative)
        await sleep(700)

        // Brief OS-cursor blink at the editor end to suggest "I just
        // typed something here".
        await osMouse.moveTo({
          x: centerOf(editor).x,
          y: centerOf(editor).y + (i - 1.5) * 10,
        })
        await sleep(200)

        // Assertions
        const editorCode = api.editor.getCode()
        api.assert.ok(
          editorCode.includes(LINES[i].trimStart()),
          `editor contains line ${i + 1}: "${LINES[i].trim()}"`
        )
        const nodeCount = document.querySelectorAll('#preview [data-mirror-id]').length
        api.assert.ok(
          nodeCount >= i + 1,
          `preview has at least ${i + 1} node(s) after line ${i + 1} (got ${nodeCount})`
        )
      }

      // Final assertions.
      const finalCode = api.editor.getCode()
      api.assert.matches(finalCode, /Frame\s+w\s+280/, 'editor contains Frame line')
      api.assert.matches(finalCode, /"Mirror Studio"/, 'editor contains title')
      api.assert.matches(finalCode, /"Mehr erfahren"/, 'editor contains button')

      const finalNodes = document.querySelectorAll('#preview [data-mirror-id]').length
      api.assert.ok(
        finalNodes >= 4,
        `preview has 4+ nodes (Frame + 2 Text + Button), got ${finalNodes}`
      )

      await sleep(600)
      await osMouse.park()
    }
  ),
])
