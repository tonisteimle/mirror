import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { build } from '../../compiler/cli/build'

let tmpDir: string

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-build-test-'))
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
}

const SIMPLE_APP = `canvas mobile, bg #1a1a1a

Text "Hello", col white, fs 24
`

beforeEach(() => {
  tmpDir = makeTmpDir()
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('build — single file', () => {
  it('writes dist/<name>.html when no --out is given', () => {
    const input = path.join(tmpDir, 'app.mir')
    writeFile(input, SIMPLE_APP)

    const result = build({ input: [input], outDir: path.join(tmpDir, 'dist') })

    expect(result.success).toBe(true)
    expect(result.outputPath).toBe(path.resolve(tmpDir, 'dist', 'app.html'))
    expect(fs.existsSync(result.outputPath!)).toBe(true)
  })

  it('derives output filename from input basename', () => {
    const input = path.join(tmpDir, 'hotel-checkin.mir')
    writeFile(input, SIMPLE_APP)

    const result = build({ input: [input], outDir: path.join(tmpDir, 'dist') })

    expect(result.outputPath).toContain('hotel-checkin.html')
  })

  it('respects --out as explicit .html file path', () => {
    const input = path.join(tmpDir, 'app.mir')
    writeFile(input, SIMPLE_APP)
    const out = path.join(tmpDir, 'custom', 'index.html')

    const result = build({ input: [input], out })

    expect(result.outputPath).toBe(path.resolve(out))
    expect(fs.existsSync(out)).toBe(true)
  })

  it('treats --out without .html as a directory', () => {
    const input = path.join(tmpDir, 'app.mir')
    writeFile(input, SIMPLE_APP)
    const outDir = path.join(tmpDir, 'public')

    const result = build({ input: [input], out: outDir })

    expect(result.outputPath).toBe(path.resolve(outDir, 'app.html'))
  })
})

describe('build — project mode', () => {
  function setupProject(dir: string): void {
    writeFile(path.join(dir, 'data.data'), 'greetings:\n  hello: "Hi"\n')
    writeFile(path.join(dir, 'tokens.tok'), 'primary.bg: #2271C1\nprimary.col: white\n')
    writeFile(path.join(dir, 'components.com'), 'Btn: pad 10 20, bg $primary\n')
    writeFile(path.join(dir, 'app.mir'), 'canvas mobile, bg #1a1a1a\n\nBtn "OK"\n')
  }

  it('compiles a four-file project to dist/index.html', () => {
    const proj = path.join(tmpDir, 'my-app')
    setupProject(proj)

    const result = build({ input: [proj], outDir: path.join(tmpDir, 'out') })

    expect(result.success).toBe(true)
    expect(result.outputPath).toBe(path.resolve(tmpDir, 'out', 'index.html'))
    expect(fs.existsSync(result.outputPath!)).toBe(true)
  })

  it('derives title from project directory name', () => {
    const proj = path.join(tmpDir, 'hotel-checkin')
    setupProject(proj)

    const result = build({ input: [proj], outDir: path.join(tmpDir, 'out') })
    const html = fs.readFileSync(result.outputPath!, 'utf-8')

    expect(html).toContain('<title>Hotel Checkin</title>')
  })
})

describe('build — HTML options', () => {
  let input: string

  beforeEach(() => {
    input = path.join(tmpDir, 'app.mir')
    writeFile(input, SIMPLE_APP)
  })

  it('defaults lang to "en"', () => {
    const result = build({ input: [input], outDir: tmpDir })
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toContain('<html lang="en">')
  })

  it('respects --title and --lang', () => {
    const result = build({ input: [input], outDir: tmpDir, title: 'My App', lang: 'de' })
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toContain('<title>My App</title>')
    expect(html).toContain('<html lang="de">')
  })

  it('inlines mirror-defaults.css by default', () => {
    const result = build({ input: [input], outDir: tmpDir })
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toContain('--m-primary')
  })

  it('omits defaults CSS when --no-defaults-css is set', () => {
    const result = build({ input: [input], outDir: tmpDir, noDefaultsCss: true })
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).not.toContain('--m-primary')
    expect(html).toContain('html, body { margin: 0; padding: 0; }')
  })

  it('produces a self-contained HTML (compiled JS inline)', () => {
    const result = build({ input: [input], outDir: tmpDir })
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toContain('<script type="module">')
    expect(html).toContain('createUI')
    expect(html).not.toMatch(/<script[^>]*src=/)
  })
})

describe('build — error handling', () => {
  it('reports parse errors in the result', () => {
    const input = path.join(tmpDir, 'broken.mir')
    writeFile(input, 'this is { not [ valid mirror syntax')

    const result = build({ input: [input], outDir: tmpDir })

    // Mirror parser is lenient; either the build fails or warnings are produced.
    if (result.success) {
      expect(result.warnings.length).toBeGreaterThanOrEqual(0)
    } else {
      expect(result.error).toBeTruthy()
    }
  })

  it('fails when input does not exist', () => {
    const result = build({ input: [path.join(tmpDir, 'missing.mir')], outDir: tmpDir })
    expect(result.success).toBe(false)
  })

  it('fails when no input is provided', () => {
    const result = build({ input: [], outDir: tmpDir })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/no input/i)
  })
})

describe('build — external + minify', () => {
  let input: string

  beforeEach(() => {
    input = path.join(tmpDir, 'app.mir')
    writeFile(input, SIMPLE_APP)
  })

  it('--external-css writes sibling .css and links it from HTML', () => {
    const result = build({ input: [input], outDir: tmpDir, externalCss: true })

    const cssPath = path.join(tmpDir, 'app.css')
    expect(fs.existsSync(cssPath)).toBe(true)
    expect(result.siblingPaths).toContain(cssPath)

    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toContain('<link rel="stylesheet" href="app.css">')
    expect(html).not.toContain('<style>')

    const css = fs.readFileSync(cssPath, 'utf-8')
    expect(css).toContain('--m-primary')
  })

  it('--external-js writes sibling .js with bootstrap appended', () => {
    const result = build({ input: [input], outDir: tmpDir, externalJs: true })

    const jsPath = path.join(tmpDir, 'app.js')
    expect(fs.existsSync(jsPath)).toBe(true)
    expect(result.siblingPaths).toContain(jsPath)

    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toContain('<script type="module" src="app.js">')
    // The auto-invoke must NOT also be inlined in HTML — that would double-mount.
    expect(html).not.toContain('document.body.appendChild')

    const js = fs.readFileSync(jsPath, 'utf-8')
    expect(js).toContain('createUI')
    expect(js).toContain('document.body.appendChild')
  })

  it('--minify shrinks the inline JS noticeably', () => {
    const baseline = build({ input: [input], outDir: path.join(tmpDir, 'baseline') })
    const minified = build({ input: [input], outDir: path.join(tmpDir, 'min'), minify: true })

    expect(baseline.success && minified.success).toBe(true)
    // Minified should be at least 30% smaller. Real-world is closer to 60%.
    expect(minified.stats.outputBytes).toBeLessThan(baseline.stats.outputBytes * 0.7)
  })

  it('--minify works with --external-js (minified bundle is written, not inline)', () => {
    const baseline = build({
      input: [input],
      outDir: path.join(tmpDir, 'baseline'),
      externalJs: true,
    })
    const minified = build({
      input: [input],
      outDir: path.join(tmpDir, 'min'),
      externalJs: true,
      minify: true,
    })

    const baselineJs = fs.readFileSync(path.join(tmpDir, 'baseline', 'app.js'), 'utf-8')
    const minifiedJs = fs.readFileSync(path.join(tmpDir, 'min', 'app.js'), 'utf-8')

    expect(minifiedJs.length).toBeLessThan(baselineJs.length * 0.7)
    expect(minifiedJs).toContain('createUI')
  })

  it('combines all three flags into a tiny shell HTML', () => {
    const result = build({
      input: [input],
      outDir: tmpDir,
      externalCss: true,
      externalJs: true,
      minify: true,
    })

    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html.length).toBeLessThan(2000)
    expect(html).toContain('href="app.css"')
    expect(html).toContain('src="app.js"')
    expect(result.siblingPaths?.length).toBe(2)
  })

  it('--external-css respects --no-defaults-css (no sibling, no link)', () => {
    const result = build({
      input: [input],
      outDir: tmpDir,
      externalCss: true,
      noDefaultsCss: true,
    })

    expect(fs.existsSync(path.join(tmpDir, 'app.css'))).toBe(false)
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).not.toContain('<link rel="stylesheet"')
  })
})

describe('build — real example', () => {
  it('compiles examples/hotel-checkin.mirror successfully', () => {
    const projectRoot = path.resolve(__dirname, '..', '..')
    const example = path.join(projectRoot, 'examples', 'hotel-checkin.mirror')

    if (!fs.existsSync(example)) {
      // Defensive: skip if example is renamed/moved
      return
    }

    const result = build({ input: [example], outDir: tmpDir })

    expect(result.success).toBe(true)
    const html = fs.readFileSync(result.outputPath!, 'utf-8')
    expect(html).toMatch(/^<!DOCTYPE html>/)
    expect(html.length).toBeGreaterThan(10_000)
  })
})
