/**
 * Multi-File Fixture Runner — Schicht 1 (Golden Files)
 *
 * Each fixture is a directory tree:
 *   mfNN-name/
 *     tokens/    *.mirror   (optional)
 *     components/ *.mirror  (optional)
 *     layouts/   *.mirror   (entry point)
 *     data/      *.data     (optional)
 *     expected.dom.js
 *     expected.html
 *
 * Compiles via `compileProject` which preserves the canonical load order
 * (data → tokens → components → layouts) and snapshot-tests the output.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { compileProject } from '../../../compiler/index'

const FIXTURES_DIR = __dirname
const UPDATE = process.env.UPDATE_GOLDEN === '1'

// =============================================================================
// Project compilation helper
// =============================================================================

function makeProjectFs(rootDir: string) {
  const listFiles = (dir: string): string[] => {
    const full = join(rootDir, dir)
    if (!existsSync(full)) return []
    return readdirSync(full).sort()
  }
  const readFile = (path: string): string | null => {
    const full = join(rootDir, path)
    if (!existsSync(full)) return null
    return readFileSync(full, 'utf-8')
  }
  return { listFiles, readFile }
}

// =============================================================================
// Output normalization
// =============================================================================

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

function renderToHTML(code: string): string {
  const stripped = code.replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
    registerExclusiveGroup: () => {},
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

function normalizeHTML(html: string): string {
  const stripped = html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '')
  return prettyHTML(stripped)
}

function prettyHTML(html: string): string {
  const tokens: Array<{ type: 'open' | 'close' | 'self' | 'text'; value: string }> = []
  let i = 0
  while (i < html.length) {
    if (html[i] === '<') {
      const end = html.indexOf('>', i)
      if (end === -1) break
      const tag = html.slice(i, end + 1)
      if (tag.startsWith('</')) tokens.push({ type: 'close', value: tag })
      else if (tag.endsWith('/>')) tokens.push({ type: 'self', value: tag })
      else tokens.push({ type: 'open', value: tag })
      i = end + 1
    } else {
      const next = html.indexOf('<', i)
      const text = html.slice(i, next === -1 ? html.length : next)
      if (text.trim()) tokens.push({ type: 'text', value: text.trim() })
      i = next === -1 ? html.length : next
    }
  }
  const out: string[] = []
  let depth = 0
  for (const tk of tokens) {
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
}

function listFixtures(): Fixture[] {
  return readdirSync(FIXTURES_DIR)
    .filter(name => {
      const full = join(FIXTURES_DIR, name)
      if (!statSync(full).isDirectory()) return false
      // A fixture has at least a layouts/ subdir with a .mirror file
      const layouts = join(full, 'layouts')
      if (!existsSync(layouts)) return false
      return readdirSync(layouts).some(f => f.endsWith('.mirror'))
    })
    .sort()
    .map(name => ({ name, dir: join(FIXTURES_DIR, name) }))
}

describe('Multi-File Fixtures (Schicht 1 — Golden Files)', () => {
  const fixtures = listFixtures()

  if (fixtures.length === 0) {
    it.skip('no fixtures yet', () => {})
    return
  }

  for (const fx of fixtures) {
    describe(fx.name, () => {
      const fs = makeProjectFs(fx.dir)
      const code = compileProject(fs)
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
