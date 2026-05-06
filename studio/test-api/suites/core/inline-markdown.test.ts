/**
 * Inline Markdown in Text Content
 *
 * `**bold**` and `*italic*` inside `Text "..."` strings render as
 * <strong>/<em>. The runtime helper that performs the substitution lives
 * in `compiler/runtime/inline-markdown.ts` and is `.toString()`-stamped
 * into the generated DOM bundle.
 *
 * Crucially, the formatter HTML-escapes its input first, so user data can
 * never inject tags — only the literal `**`/`*` markers we substitute
 * become HTML.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helpers
// =============================================================================

/**
 * Find the rendered DOM element for the first Text child of node-1 and
 * return both its visible text and its innerHTML for structural checks.
 */
function readFirstTextNode(): { textContent: string; innerHTML: string } | null {
  const root = document.querySelector('[data-mirror-id="node-1"]')
  if (!root) return null
  const span = root.querySelector('span[data-mirror-id="node-2"]') as HTMLElement | null
  if (!span) return null
  return {
    textContent: span.textContent ?? '',
    innerHTML: span.innerHTML ?? '',
  }
}

// =============================================================================
// Tests
// =============================================================================

export const inlineMarkdownTests: TestCase[] = describe('Inline Markdown in Text', [
  // ---------------------------------------------------------------------------
  // 1. **bold** renders as <strong>
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Bold (**) renders as <strong> inside Text content',
    `Frame pad 16
  Text "Hello **world**"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const got = readFirstTextNode()
      api.assert.ok(got, 'Text element not found')
      api.assert.ok(
        got!.innerHTML.includes('<strong>world</strong>'),
        `Expected <strong>world</strong>, got innerHTML: ${got!.innerHTML}`
      )
      api.assert.equals(got!.textContent, 'Hello world', 'Visible text must drop the ** markers')
    }
  ),

  // ---------------------------------------------------------------------------
  // 2. *italic* renders as <em>
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Italic (*) renders as <em> inside Text content',
    `Frame pad 16
  Text "An *italic* word"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const got = readFirstTextNode()
      api.assert.ok(got, 'Text element not found')
      api.assert.ok(
        got!.innerHTML.includes('<em>italic</em>'),
        `Expected <em>italic</em>, got innerHTML: ${got!.innerHTML}`
      )
      api.assert.equals(got!.textContent, 'An italic word', 'Visible text drops the * markers')
    }
  ),

  // ---------------------------------------------------------------------------
  // 3. Bold and italic mixed in one string
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Bold + italic mixed in one Text string',
    `Frame pad 16
  Text "Both **bold** and *kursiv* here"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const got = readFirstTextNode()
      api.assert.ok(got, 'Text element not found')
      api.assert.ok(
        got!.innerHTML.includes('<strong>bold</strong>'),
        `Missing <strong>bold</strong>: ${got!.innerHTML}`
      )
      api.assert.ok(
        got!.innerHTML.includes('<em>kursiv</em>'),
        `Missing <em>kursiv</em>: ${got!.innerHTML}`
      )
    }
  ),

  // ---------------------------------------------------------------------------
  // 4. Plain text (no markers) is unaffected
  // ---------------------------------------------------------------------------
  testWithSetup(
    'Plain text without markers stays plain',
    `Frame pad 16
  Text "Plain text here"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const got = readFirstTextNode()
      api.assert.ok(got, 'Text element not found')
      api.assert.ok(
        !got!.innerHTML.includes('<strong>') && !got!.innerHTML.includes('<em>'),
        `Plain text must not contain inline markup, got: ${got!.innerHTML}`
      )
      api.assert.equals(got!.textContent, 'Plain text here')
    }
  ),

  // ---------------------------------------------------------------------------
  // 5. HTML injection is blocked (security)
  // ---------------------------------------------------------------------------
  testWithSetup(
    'HTML in Text content is escaped, not injected',
    `Frame pad 16
  Text "<script>alert(1)</script>"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()
      const got = readFirstTextNode()
      api.assert.ok(got, 'Text element not found')
      api.assert.ok(
        !got!.innerHTML.includes('<script>'),
        `<script> must be escaped, got innerHTML: ${got!.innerHTML}`
      )
      api.assert.ok(
        got!.innerHTML.includes('&lt;script&gt;'),
        `Expected escaped <script>, got: ${got!.innerHTML}`
      )
    }
  ),
])

export default inlineMarkdownTests
