/**
 * Single-file fixture runner (Schicht 1 — Golden Files)
 *
 * Shared engine for the 15 single-file fixture-categories in
 * `tests/fixtures/`. Pre-2026-05-13 each category had a ~213 LOC
 * `runner.test.ts` that copy-pasted the same logic (read fixtures,
 * compile, normalize, diff against `expected.dom.js` + `expected.html`).
 *
 * Each category now calls `runSingleFileFixtureCategory(title, __dirname)`
 * from a thin per-category `runner.test.ts`.
 *
 * Fixture layout — one subdirectory per scenario:
 *   <dir>/<scenario>/
 *     input.mirror
 *     expected.dom.js   — golden user-code slice from generateDOM(...)
 *     expected.html     — golden rendered outerHTML after createUI()
 *
 * Update mode: `UPDATE_GOLDEN=1 npx vitest run tests/fixtures/<cat>`
 * accepts the current output as the new baseline.
 *
 * Multi-file projects (`tests/fixtures/multi-file/runner.test.ts`) use a
 * different engine (compileProject), kept separate intentionally.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const UPDATE = process.env.UPDATE_GOLDEN === '1'

// =============================================================================
// Output normalization
// =============================================================================

/**
 * Extract just the user-code slice of generateDOM output, dropping
 * the runtime preamble + the API-attach trailer. Keeps the snapshot
 * narrow so changes to runtime boilerplate don't churn every fixture.
 */
function extractUserCode(code: string): string {
  const lines = code.split('\n')
  let start = -1
  let end = -1
  for (let i = 0; i < lines.length; i++) {
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
  while (end > start && lines[end - 1].trim() === '') end--
  return lines.slice(start, end).join('\n')
}

/**
 * Render the compiled createUI() in jsdom and return outerHTML, with
 * dynamic IDs normalized for snapshot stability.
 */
function renderToHTML(code: string): string {
  const stripped = code.replace(/^export\s+function/gm, 'function')
  const g = globalThis as unknown as Record<string, unknown>
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
  }
  if (typeof (g as { IntersectionObserver?: unknown }).IntersectionObserver === 'undefined') {
    ;(g as { IntersectionObserver: unknown }).IntersectionObserver = class {
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

function normalizeHTML(html: string): string {
  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
  return prettyHTML(stripped)
}

function prettyHTML(html: string): string {
  const states: Array<{ type: 'open' | 'close' | 'self' | 'text'; value: string }> = []
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      if (end === -1) break
      const tag = html.slice(i, end + 1)
      if (tag.startsWith('</')) states.push({ type: 'close', value: tag })
      else if (tag.endsWith('/>')) states.push({ type: 'self', value: tag })
      else states.push({ type: 'open', value: tag })
      i = end + 1
    } else {
      const next = html.indexOf('<', i)
      const text = html.slice(i, next === -1 ? html.length : next)
      if (text.trim()) states.push({ type: 'text', value: text.trim() })
      i = next === -1 ? html.length : next
    }
  }
  const out: string[] = []
  let depth = 0
  for (const tk of states) {
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
// Fixture discovery + driver
// =============================================================================

interface Fixture {
  name: string
  dir: string
  input: string
}

function listFixtures(rootDir: string): Fixture[] {
  return readdirSync(rootDir)
    .filter(name => {
      const full = join(rootDir, name)
      return statSync(full).isDirectory() && existsSync(join(full, 'input.mirror'))
    })
    .sort()
    .map(name => ({
      name,
      dir: join(rootDir, name),
      input: readFileSync(join(rootDir, name, 'input.mirror'), 'utf-8'),
    }))
}

/**
 * Run all `input.mirror` fixtures under `rootDir` against their golden
 * `expected.dom.js` + `expected.html` files. Caller passes the category
 * title (used verbatim as describe-block label) and its `__dirname`.
 *
 * Example: `runSingleFileFixtureCategory('States Fixtures (Schicht 1 — Golden Files)', __dirname)`.
 */
export function runSingleFileFixtureCategory(title: string, rootDir: string): void {
  describe(title, () => {
    const fixtures = listFixtures(rootDir)

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
}
