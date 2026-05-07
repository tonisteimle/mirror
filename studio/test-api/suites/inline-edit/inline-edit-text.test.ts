/**
 * Inline-text editing in the preview panel.
 *
 * The user double-clicks a text-bearing element (Text, Button, H1-H6,
 * Label, Link, Option), types into the floating input that appears,
 * and the new literal lands in source on Enter / blur. Esc cancels.
 *
 * No test suite existed for this feature before this file. The
 * inline-edit subsystem (studio/inline-edit/) is significant code
 * (controller + session + 150ms activation delay + commit/cancel +
 * SetTextContentCommand → CodeModifier.updateTextContent), and the
 * dominant failure mode — "edit silently doesn't make it to source"
 * — is invisible without a source-level assertion.
 *
 * The tests below assert byte-exact source after commit.
 *
 * Activation timing:
 *   - InlineEditController has a 150ms EDIT_START_DELAY before the
 *     floating input appears. The tests wait 250ms after dblclick
 *     so the activation reliably resolves.
 *   - `api.interact.doubleClick` ends with only 50ms; we add the
 *     extra wait via `waitForInput()`.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

const ACTIVATION_DELAY_MS = 250

function findInlineInput(): HTMLInputElement | null {
  return document.querySelector('.inline-edit-input') as HTMLInputElement | null
}

async function waitForInput(api: TestAPI, timeout = 1000): Promise<HTMLInputElement> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const input = findInlineInput()
    if (input) return input
    await api.utils.delay(50)
  }
  throw new Error(
    `Inline-edit input did not appear within ${timeout}ms. The floating input <input class="inline-edit-input"> is created by InlineEditSession on activation; if missing, the controller's dblclick path didn't fire or the 150ms activation delay was cancelled by a stray mousedown.`
  )
}

function pressKey(input: HTMLInputElement, key: string): void {
  const event = new KeyboardEvent('keydown', {
    key,
    code: key === 'Enter' ? 'Enter' : key === 'Escape' ? 'Escape' : key,
    bubbles: true,
    cancelable: true,
  })
  input.dispatchEvent(event)
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export const inlineEditTextTests: TestCase[] = describe('Inline-edit: preview text', [
  testWithSetup(
    'Double-click on Text + Enter writes new literal to source',
    `Frame
  Text "Hallo"`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      api.assert.equals(input.value, 'Hallo', 'Input must seed with original text')

      setInputValue(input, 'Welt')
      pressKey(input, 'Enter')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame
  Text "Welt"`
      api.assert.ok(
        code === expected,
        `Commit must rewrite source. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Edit + commit-with-unchanged-value does not write to source',
    `Frame
  Text "Original"`,
    async (api: TestAPI) => {
      const before = api.editor.getCode()

      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      // Don't change the value. Press Enter to commit. session.end()
      // logic at inline-edit-session.ts:87 sets `saved: save &&
      // newText !== originalText` — same text → saved=false → no
      // SetTextContentCommand → source untouched. This proves the
      // commit path is value-aware (not "always rewrite on Enter").
      pressKey(input, 'Enter')
      await api.utils.delay(ACTIVATION_DELAY_MS)

      const after = api.editor.getCode()
      api.assert.ok(
        after === before,
        `Unchanged-value commit must not touch source. Before:\n${before}\nAfter:\n${after}`
      )
    }
  ),

  testWithSetup(
    'Editing a Button preserves the rest of the line',
    `Frame
  Button "Save", bg #2271C1, col white, pad 12 24, rad 6`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      setInputValue(input, 'Speichern')
      pressKey(input, 'Enter')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame
  Button "Speichern", bg #2271C1, col white, pad 12 24, rad 6`
      api.assert.ok(
        code === expected,
        `Properties on the line must survive a text edit. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Editing a sibling Text does not touch the other sibling',
    `Frame gap 8
  Text "First"
  Text "Second"`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-3')
      const input = await waitForInput(api)
      setInputValue(input, 'Twoth')
      pressKey(input, 'Enter')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame gap 8
  Text "First"
  Text "Twoth"`
      api.assert.ok(
        code === expected,
        `Sibling edit must touch only the dblclicked line. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  testWithSetup(
    'Quote characters in new text are escaped',
    `Frame
  Text "Plain"`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      setInputValue(input, 'He said "hi"')
      pressKey(input, 'Enter')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame
  Text "He said \\"hi\\""`
      api.assert.ok(
        code === expected,
        `Quotes must be backslash-escaped. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),

  // ---------- Edge-case coverage ----------

  testWithSetup(
    'Blur commits the edit (focus leaves input)',
    `Frame
  Text "before"`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      setInputValue(input, 'blurred')
      // Trigger blur by dispatching the event directly. handleBlur in
      // session.ts:293-299 commits via end(true) after a 50ms timeout.
      input.dispatchEvent(new FocusEvent('blur', { bubbles: false }))
      await api.utils.delay(150) // 50ms timeout + buffer
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame
  Text "blurred"`
      api.assert.ok(code === expected, `Blur must commit. Expected:\n${expected}\nGot:\n${code}`)
    }
  ),

  testWithSetup(
    'Heading primitive (H2) is editable',
    `Frame
  H2 "Old Title"`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      setInputValue(input, 'New Title')
      pressKey(input, 'Enter')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame
  H2 "New Title"`
      api.assert.ok(code === expected, `H2 must be editable. Expected:\n${expected}\nGot:\n${code}`)
    }
  ),

  testWithSetup(
    'Edit on Link preserves href property',
    // href "#" instead of "/about" — anchor href avoids the dblclick
    // dispatching a real navigation that would close the test target.
    `Frame
  Link "click here", href "#"`,
    async (api: TestAPI) => {
      await api.interact.doubleClick('node-2')
      const input = await waitForInput(api)
      setInputValue(input, 'About us')
      pressKey(input, 'Enter')
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      const code = api.editor.getCode()
      const expected = `Frame
  Link "About us", href "#"`
      api.assert.ok(
        code === expected,
        `Link href must survive text edit. Expected:\n${expected}\nGot:\n${code}`
      )
    }
  ),
])
