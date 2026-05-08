import { describe, it, expect } from 'vitest'
import { buildHtmlDocument, deriveTitle } from '../../compiler/cli/html-template'

const STUB_JS = 'function createUI() { return document.createElement("div") }'

describe('deriveTitle', () => {
  it('strips extension and Title-Cases the basename', () => {
    expect(deriveTitle('app.html')).toBe('App')
    expect(deriveTitle('hotel-checkin.html')).toBe('Hotel Checkin')
    expect(deriveTitle('dist/portfolio_dashboard.html')).toBe('Portfolio Dashboard')
  })

  it('falls back to "Mirror App" for empty stems', () => {
    expect(deriveTitle('.html')).toBe('Mirror App')
    expect(deriveTitle('')).toBe('Mirror App')
  })
})

describe('buildHtmlDocument', () => {
  it('produces a complete HTML document', () => {
    const out = buildHtmlDocument(STUB_JS)
    expect(out).toMatch(/^<!DOCTYPE html>/)
    expect(out).toContain('</html>')
    expect(out).toContain(STUB_JS)
  })

  it('defaults lang to "en" and title to "Mirror App"', () => {
    const out = buildHtmlDocument(STUB_JS)
    expect(out).toContain('<html lang="en">')
    expect(out).toContain('<title>Mirror App</title>')
  })

  it('respects custom title and lang', () => {
    const out = buildHtmlDocument(STUB_JS, { title: 'Hotel Checkin', lang: 'de' })
    expect(out).toContain('<html lang="de">')
    expect(out).toContain('<title>Hotel Checkin</title>')
  })

  it('escapes HTML-special characters in title and lang', () => {
    const out = buildHtmlDocument(STUB_JS, { title: '<script>x</script>', lang: '"x' })
    expect(out).not.toContain('<script>x</script>')
    expect(out).toContain('&lt;script&gt;x&lt;/script&gt;')
    expect(out).toContain('lang="&quot;x"')
  })

  it('inlines compiled JS as a module script and auto-invokes createUI()', () => {
    const out = buildHtmlDocument(STUB_JS)
    expect(out).toContain('<script type="module">')
    expect(out).toContain('const _ui = createUI()')
    expect(out).toContain('document.body.appendChild(_ui)')
  })

  it('embeds defaultsCss when provided as a string', () => {
    const css = ':root { --m-primary: #2271C1; }'
    const out = buildHtmlDocument(STUB_JS, { defaultsCss: css })
    expect(out).toContain(css)
    expect(out).toContain('html, body { margin: 0; padding: 0; }')
  })

  it('uses minimal reset when defaultsCss is omitted or false', () => {
    const out = buildHtmlDocument(STUB_JS)
    expect(out).toContain('<style>html, body { margin: 0; padding: 0; }</style>')
  })

  it('emits <link> tag when externalCssPath is set', () => {
    const out = buildHtmlDocument(STUB_JS, { externalCssPath: 'app.css' })
    expect(out).toContain('<link rel="stylesheet" href="app.css">')
    expect(out).not.toContain('<style>')
  })

  it('emits <script src> when externalJsPath is set', () => {
    const out = buildHtmlDocument(STUB_JS, { externalJsPath: 'app.js' })
    expect(out).toContain('<script type="module" src="app.js">')
    expect(out).not.toContain(STUB_JS)
  })

  it('includes viewport and charset meta tags', () => {
    const out = buildHtmlDocument(STUB_JS)
    expect(out).toContain('<meta charset="UTF-8">')
    expect(out).toContain('<meta name="viewport"')
  })
})
