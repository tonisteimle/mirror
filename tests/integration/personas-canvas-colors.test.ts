/**
 * End-to-end regression: personas-informatik renders with the colors its
 * `canvas bg #fff, font sans, fs 17` declares.
 *
 * Was a long-running bug: in multi-file Studio compiles, tokens.tok and
 * components.com get prepended as a prelude before app.mir. Canvas was no
 * longer the very first non-empty line, so:
 *
 *   1. The parser silently dropped it (canvas-must-be-first rule).
 *   2. With no canvas, mirror-defaults.css's hardcoded dark-theme rules
 *      (`color: var(--m-text)` ≈ #e0e0e0, surfaces #1a1a1a) painted every
 *      primitive descendant.
 *   3. Even with canvas, `.mirror-root [data-component="Text"]` overrode
 *      parent `color` via descendant-selector specificity, so a per-canvas
 *      `col $ink` couldn't flow down the tree.
 *
 * This test mounts the actual examples/personas-informatik project the same
 * way Studio's preview does (prelude + compile + DOM run + mirror-defaults
 * applied) and asserts that a sample of typical text elements end up with
 * dark text on light surfaces — i.e. that the user's white-canvas intent
 * actually reaches the rendered tree.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { JSDOM } from 'jsdom'
import { describe, test, expect, beforeAll, vi } from 'vitest'
import { parse } from '../../compiler/parser/parser'
import { generateDOM } from '../../compiler/backends/dom'

const PROJECT_DIR = path.resolve(__dirname, '../../examples/personas-informatik')
const DEFAULTS_CSS = fs.readFileSync(
  path.resolve(__dirname, '../../assets/mirror-defaults.css'),
  'utf8'
)

function buildPersonasPrelude(): string {
  const tokens = fs.readFileSync(path.join(PROJECT_DIR, 'tokens.tok'), 'utf8')
  const components = fs.readFileSync(path.join(PROJECT_DIR, 'components.com'), 'utf8')
  const app = fs.readFileSync(path.join(PROJECT_DIR, 'app.mir'), 'utf8')
  return [
    `// Tokens: tokens.tok`,
    tokens.trim(),
    '',
    `// Component: components.com`,
    components.trim(),
    '',
    app,
  ].join('\n')
}

describe('personas-informatik renders with light-canvas colors', () => {
  let dom: JSDOM
  let root: HTMLElement

  // The "no leak color" assertion sweeps several thousand text-bearing
  // elements through getComputedStyle in jsdom; the default 5s test
  // timeout isn't enough on slower machines.
  vi.setConfig({ testTimeout: 30000 })

  beforeAll(() => {
    const combined = buildPersonasPrelude()
    const ast = parse(combined)
    expect(ast.canvas, 'canvas in app.mir must survive the prelude').toBeDefined()
    expect(ast.canvas?.properties.find(p => p.name === 'bg')).toBeDefined()

    const jsCode = generateDOM(ast)

    const html = `<!DOCTYPE html><html><head><style>${DEFAULTS_CSS}</style></head><body><div id="host"></div></body></html>`
    dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true })
    const runnable =
      jsCode.replace('export function createUI', 'function createUI') +
      `\nwindow.__root = createUI()\ndocument.getElementById('host').appendChild(window.__root)`
    const script = dom.window.document.createElement('script')
    script.textContent = runnable
    dom.window.document.body.appendChild(script)
    root = (dom.window as any).__root as HTMLElement
    expect(root, 'createUI must return a root element').toBeTruthy()
  })

  test('_root has white background and dark text inline', () => {
    const inline = root.getAttribute('style') || ''
    expect(inline).toMatch(/background:\s*(#fff|rgb\(255,\s*255,\s*255\))/i)
    // Either an explicit black col (auto-derived) or token-resolved ink color
    expect(inline).toMatch(/color:/i)
  })

  test('_root sets adaptive --m-text/--m-surface to light-theme values', () => {
    const cs = dom.window.getComputedStyle(root)
    // Canvas-bg is a hex (#fff), so adaptive palette kicks in. --m-text is
    // pure #000 so H1/H2 (forced to var(--m-text) via mirror-defaults.css)
    // render solid black, matching the canvas-derived root inline color.
    expect(cs.getPropertyValue('--m-text').trim()).toBe('#000')
    expect(cs.getPropertyValue('--m-surface').trim()).toBe('#f5f5f5')
  })

  test('no rendered span/h1-h6/p resolves to the dark-theme leak color #e0e0e0', () => {
    const window = dom.window as any
    // Components like `H1 as Text` strip the data-component attribute on
    // the use-site, so query by tag instead. These are the elements the
    // user actually sees as page text.
    const textTags = root.querySelectorAll('span, h1, h2, h3, h4, h5, h6, p')
    expect(textTags.length).toBeGreaterThan(0)

    const leaked: string[] = []
    for (const el of Array.from(textTags)) {
      const cs = window.getComputedStyle(el as Element)
      const c = cs.color
      if (c.includes('224, 224, 224') || c.toLowerCase().includes('#e0e0e0')) {
        leaked.push(`${(el as Element).tagName} "${(el as Element).textContent?.slice(0, 30)}"`)
      }
    }
    expect(leaked, `${leaked.length} text elements still have the dark-theme leak color`).toEqual(
      []
    )
  })

  test('the "Personas" H1 title binds to --m-text (which is #000)', () => {
    // Regression: H1 spans get `data-component="H1"`, matching
    // `.mirror-root [data-component="H1"] { color: var(--m-text) }` in
    // mirror-defaults. With canvas-derived --m-text = #000, H1 renders
    // solid black. (jsdom does not resolve var() so cs.color returns the
    // literal "var(--m-text)" — combined with the --m-text assertion
    // above this confirms the visual outcome.)
    const window = dom.window as any
    const all = Array.from(root.querySelectorAll('span, h1'))
    const personas = all.find(el => (el.textContent || '').trim() === 'Personas')
    expect(personas, 'expected to find the "Personas" title in personas-informatik').toBeDefined()
    const cs = window.getComputedStyle(personas!)
    expect(cs.color).toBe('var(--m-text)')
  })

  test('the "Fünf Personas" H2 title also binds to --m-text', () => {
    const window = dom.window as any
    const all = Array.from(root.querySelectorAll('span, h2'))
    const fuenf = all.find(el => (el.textContent || '').trim().startsWith('Fünf Personas'))
    expect(fuenf, 'expected to find the "Fünf Personas" H2 title').toBeDefined()
    const cs = window.getComputedStyle(fuenf!)
    expect(cs.color).toBe('var(--m-text)')
  })
})
