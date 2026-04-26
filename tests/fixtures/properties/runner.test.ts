/**
 * Properties Fixture Runner — Schicht 1 (Golden Files)
 *
 * Reads properties subdirectory under tests/fixtures/properties/, compiles
 * `input.mirror` with the DOM backend, normalizes the output, and asserts
 * it matches `expected.dom.js` + `expected.html`.
 *
 * Run with `UPDATE_GOLDEN=1 npx vitest run tests/fixtures/components` to
 * accept the current output as the new baseline. Review the diff manually
 * before committing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { parse } from '../../../compiler/parser'
import { generateDOM } from '../../../compiler/backends/dom'

const FIXTURES_DIR = __dirname
const UPDATE = process.env.UPDATE_GOLDEN === '1'

// =============================================================================
// Normalization
// =============================================================================

/**
 * Extract the user-emitted portion of compiled DOM output.
 *
 * The DOM backend emits `createUI()` whose body has three sections:
 *   1. Setup (root, styles, focus listeners) — constant per backend version
 *   2. User code (createElement calls, datasets, styles, appendChild) — what
 *      we want to snapshot
 *   3. API methods (setState, navigation, history) — constant
 *
 * We slice from the first `// <Comment>` after focus-listener setup to the
 * `// Attach API methods directly` boundary.
 */
function extractUserCode(code: string): string {
  const lines = code.split('\n')
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
    // Start: the focus-listener block ends with `})\n` after addEventListener.
    // First user comment / element declaration follows. Element-decl is one of
    //  - `const node_N = document.createElement(...)`           (Instance)
    //  - `const node_N_container = document.createElement(...)` (Conditional)
    //  - `const node_N_container = document.createElement(...)` (Each)
    if (
      start === -1 &&
      lines[i].match(/^\s*\/\/\s+\w/) &&
      i > 0 &&
      lines[i - 1].trim() === '' &&
      lines[i + 1] &&
      lines[i + 1].match(/^\s*const\s+node_\d+\w*\s*=/)
    ) {
      start = i
    }
    if (lines[i].includes('// Attach API methods directly')) {
      end = i
      break
    }
  }
  if (start === -1 || end === -1) {
    throw new Error(
      `Could not find user-code boundary in compiled output (start=${start}, end=${end})`
    )
  }
  // Drop trailing blank lines from the slice.
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end).join('\n')
}

/**
 * Render the compiled createUI() in jsdom and return outerHTML, with
 * dynamic IDs normalized so the snapshot is stable across runs.
 */
function renderToHTML(code: string): string {
  const stripped = code.replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
  }
  if (typeof g.IntersectionObserver === 'undefined') {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  const fn = new Function(stripped + '\nreturn createUI();')
  const root = fn() as HTMLElement
  return normalizeHTML(root.outerHTML)
}

/**
 * Normalize rendered HTML so snapshots are stable:
 *  - Strip the embedded <style> block (mirror-root keyframes etc.) — that's
 *    a constant the runner doesn't need to track per fixture.
 *  - Indent + line-break for readability.
 */
function normalizeHTML(html: string): string {
  // Strip <style>…</style>
  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
  // Pretty-print: properties tag on its own line, indented by depth.
  return prettyHTML(stripped)
}

function prettyHTML(html: string): string {
  // Tokenize on `<…>` and text. Walk and indent.
  const properties: Array<{ type: 'open' | 'close' | 'self' | 'text'; value: string }> = []
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      if (end === -1) break
      const tag = html.slice(i, end + 1)
      if (tag.startsWith('</')) properties.push({ type: 'close', value: tag })
      else if (tag.endsWith('/>')) properties.push({ type: 'self', value: tag })
      else properties.push({ type: 'open', value: tag })
      i = end + 1
    } else {
      const next = html.indexOf('<', i)
      const text = html.slice(i, next === -1 ? html.length : next)
      if (text.trim()) properties.push({ type: 'text', value: text.trim() })
      i = next === -1 ? html.length : next
    }
  }
  const out: string[] = []
  let depth = 0
  for (const tk of properties) {
    const pad = '  '.repeat(depth)
    if (tk.type === 'close') {
      depth--
      out.push('  '.repeat(depth) + tk.value)
    } else if (tk.type === 'open') {
      out.push(pad + tk.value)
      depth++
    } else {
      out.push(pad + tk.value)
    }
  }
  return out.join('\n')
}

// =============================================================================
// Test runner
// =============================================================================

interface Fixture {
  name: string
  dir: string
  input: string
}

function listFixtures(): Fixture[] {
  return readdirSync(FIXTURES_DIR)
    .filter(name => {
      const full = join(FIXTURES_DIR, name)
      return statSync(full).isDirectory() && existsSync(join(full, 'input.mirror'))
    })
    .sort()
    .map(name => ({
      name,
      dir: join(FIXTURES_DIR, name),
      input: readFileSync(join(FIXTURES_DIR, name, 'input.mirror'), 'utf-8'),
    }))
}

describe('Properties Fixtures (Schicht 1 — Golden Files)', () => {
  const fixtures = listFixtures()

  if (fixtures.length === 0) {
    it.skip('no fixtures yet', () => {})
    return
  }

  for (const fx of fixtures) {
    describe(fx.name, () => {
      const ast = parse(fx.input)
      const code = generateDOM(ast)
      const userCode = extractUserCode(code)
      const html = renderToHTML(code)

      const expectedJsPath = join(fx.dir, 'expected.dom.js')
      const expectedHtmlPath = join(fx.dir, 'expected.html')

      it('compiled DOM-JS matches golden', () => {
        if (UPDATE || !existsSync(expectedJsPath)) {
          writeFileSync(expectedJsPath, userCode + '\n')
          return
        }
        const expected = readFileSync(expectedJsPath, 'utf-8').replace(/\n+$/, '')
        expect(userCode).toBe(expected)
      })

      it('rendered HTML matches golden', () => {
        if (UPDATE || !existsSync(expectedHtmlPath)) {
          writeFileSync(expectedHtmlPath, html + '\n')
          return
        }
        const expected = readFileSync(expectedHtmlPath, 'utf-8').replace(/\n+$/, '')
        expect(html).toBe(expected)
      })
    })
  }
})
