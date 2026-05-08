import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  buildBundle,
  buildTargetConfig,
  hashFile,
  loadPreviousHashes,
  diffSources,
  type Options,
} from '../../tools/export'

let tmpDir: string
let outDir: string
let projDir: string

const TOKENS = `// tokens\nprimary.bg: #2271C1\ncard.bg: #1a1a1a\n`
const COMPONENTS = `// components\nBtn as Button: pad 12 24, rad 6\n`
const APP = `canvas mobile, bg #1a1a1a\n\nText "Hello", col white, fs 24\nBtn "Click me", bg $primary\n`

function defaults(over: Partial<Options>): Options {
  return {
    projectDir: '',
    outDir: '',
    target: 'react',
    styling: 'tailwind',
    typescript: true,
    visualReference: null,
    snapshot: false,
    incremental: false,
    run: false,
    help: false,
    ...over,
  }
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-export-test-'))
  outDir = path.join(tmpDir, 'out')
  projDir = path.join(tmpDir, 'proj')
  fs.mkdirSync(projDir, { recursive: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function writeProject(files: Record<string, string>, base = projDir): void {
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(base, name)
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
    fs.writeFileSync(filePath, content, 'utf8')
  }
}

describe('buildTargetConfig — target-aware target.json', () => {
  it('vanilla excludes JS-framework keys', () => {
    const cfg = buildTargetConfig(defaults({ target: 'vanilla', projectDir: '.', outDir: '.' }))
    expect(cfg.framework).toBe('vanilla')
    expect(cfg.language).toBeUndefined()
    expect(cfg.styling).toBeUndefined()
    expect(cfg.buildTool).toBeUndefined()
    expect((cfg.constraints as Record<string, unknown>).noFramework).toBe(true)
    expect((cfg.constraints as Record<string, unknown>).noBuildTool).toBe(true)
  })

  it('react includes language, styling, buildTool', () => {
    const cfg = buildTargetConfig(defaults({ target: 'react', projectDir: '.', outDir: '.' }))
    expect(cfg.framework).toBe('react')
    expect(cfg.language).toBe('typescript')
    expect(cfg.styling).toBe('tailwind')
    expect(cfg.buildTool).toBe('vite')
    expect((cfg.constraints as Record<string, unknown>).strictTypes).toBe(true)
  })

  it('--js flips language to javascript and strictTypes off', () => {
    const cfg = buildTargetConfig(
      defaults({ target: 'react', typescript: false, projectDir: '.', outDir: '.' })
    )
    expect(cfg.language).toBe('javascript')
    expect((cfg.constraints as Record<string, unknown>).strictTypes).toBe(false)
  })
})

describe('hashFile / loadPreviousHashes / diffSources', () => {
  it('hashFile returns stable sha256 for same content', () => {
    const f1 = path.join(tmpDir, 'a.txt')
    const f2 = path.join(tmpDir, 'b.txt')
    fs.writeFileSync(f1, 'hello')
    fs.writeFileSync(f2, 'hello')
    expect(hashFile(f1)).toBe(hashFile(f2))
    fs.writeFileSync(f2, 'world')
    expect(hashFile(f1)).not.toBe(hashFile(f2))
  })

  it('loadPreviousHashes returns {} when file missing', () => {
    const result = loadPreviousHashes(path.join(tmpDir, 'nonexistent'))
    expect(result).toEqual({})
  })

  it('loadPreviousHashes parses existing file', () => {
    const dir = path.join(tmpDir, 'existing-bundle')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'source-hashes.json'), JSON.stringify({ 'app.mir': 'abc123' }))
    expect(loadPreviousHashes(dir)).toEqual({ 'app.mir': 'abc123' })
  })

  it('diffSources detects added / modified / removed / unchanged', () => {
    const oldH = { 'a.mir': 'h1', 'b.mir': 'h2', 'c.mir': 'h3' }
    const newH = { 'a.mir': 'h1', 'b.mir': 'h2-NEW', 'd.mir': 'h4' }
    const report = diffSources(newH, oldH)
    expect(report.added).toEqual(['d.mir'])
    expect(report.modified).toEqual(['b.mir'])
    expect(report.removed).toEqual(['c.mir'])
    expect(report.unchanged).toEqual(['a.mir'])
  })
})

describe('buildBundle — multi-file project', () => {
  it('discovers and copies all Mirror sources preserving tree', () => {
    writeProject({
      'tokens.tok': TOKENS,
      'components.com': COMPONENTS,
      'app.mir': APP,
      'screens/home.mir': APP,
    })
    const result = buildBundle(defaults({ projectDir: projDir, outDir }))
    expect(result.fileCount).toBe(4)
    expect(fs.existsSync(path.join(outDir, 'source', 'tokens.tok'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'source', 'components.com'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'source', 'app.mir'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'source', 'screens/home.mir'))).toBe(true)
  })

  it('writes brief, instructions, target.json, manifest, README, hashes', () => {
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    expect(fs.existsSync(path.join(outDir, 'MIRROR-BRIEF.md'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'INSTRUCTIONS.md'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'target.json'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'manifest.json'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'README.md'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'source-hashes.json'))).toBe(true)
  })

  it('manifest reflects target / source files / counts', () => {
    writeProject({ 'tokens.tok': TOKENS, 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'vue' }))
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    expect(manifest.target).toBe('vue')
    expect(manifest.fileCount).toBe(2)
    expect(manifest.sourceFiles).toEqual(expect.arrayContaining(['tokens.tok', 'app.mir']))
    expect(manifest.hasVisualReference).toBe(false)
    expect(manifest.hasRenderSnapshot).toBe(false)
  })

  it('source-hashes.json contains an entry per source file', () => {
    writeProject({ 'tokens.tok': TOKENS, 'components.com': COMPONENTS, 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const hashes = JSON.parse(fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8'))
    expect(Object.keys(hashes).sort()).toEqual(['app.mir', 'components.com', 'tokens.tok'])
    expect(hashes['app.mir']).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('buildBundle — single file', () => {
  it('accepts single .mirror file as projectDir', () => {
    const file = path.join(projDir, 'hotel.mirror')
    fs.writeFileSync(file, APP)
    const result = buildBundle(defaults({ projectDir: file, outDir }))
    expect(result.fileCount).toBe(1)
    expect(fs.existsSync(path.join(outDir, 'source', 'hotel.mirror'))).toBe(true)
  })

  it('rejects non-Mirror file', () => {
    const file = path.join(projDir, 'random.txt')
    fs.writeFileSync(file, 'foo')
    expect(() => buildBundle(defaults({ projectDir: file, outDir }))).toThrow(/not a Mirror file/)
  })

  it('rejects nonexistent input', () => {
    expect(() => buildBundle(defaults({ projectDir: path.join(tmpDir, 'nope'), outDir }))).toThrow(
      /input not found/
    )
  })
})

describe('buildBundle — visual reference', () => {
  it('copies visualReference into bundle and reflects in manifest', () => {
    const ref = path.join(tmpDir, 'reference.html')
    fs.writeFileSync(ref, '<html><body>ref</body></html>')
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir, visualReference: ref }))
    expect(fs.existsSync(path.join(outDir, 'visual-reference.html'))).toBe(true)
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    expect(manifest.hasVisualReference).toBe(true)
  })

  it('skips missing visualReference with a warning, not crash', () => {
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir, visualReference: '/nonexistent/foo.html' }))
    expect(fs.existsSync(path.join(outDir, 'visual-reference.html'))).toBe(false)
    const manifest = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    expect(manifest.hasVisualReference).toBe(false)
  })
})

describe('buildBundle — incremental re-export', () => {
  it('first run with --incremental falls back to fresh export (no prior hashes)', () => {
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))
    // No CHANGES.md without prior baseline
    expect(fs.existsSync(path.join(outDir, 'CHANGES.md'))).toBe(false)
    // Hashes still written for next run
    expect(fs.existsSync(path.join(outDir, 'source-hashes.json'))).toBe(true)
  })

  it('detects modified file, writes CHANGES.md, picks incremental template', () => {
    writeProject({ 'tokens.tok': TOKENS, 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))

    // Modify one source file
    fs.writeFileSync(path.join(projDir, 'tokens.tok'), TOKENS + '\nextra.bg: #ff0000\n')

    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))

    expect(fs.existsSync(path.join(outDir, 'CHANGES.md'))).toBe(true)
    const changes = fs.readFileSync(path.join(outDir, 'CHANGES.md'), 'utf8')
    expect(changes).toContain('1 file(s) changed')
    expect(changes).toContain('Modified')
    expect(changes).toContain('tokens.tok')
    expect(changes).not.toContain('app.mir')

    // Instructions should now be the incremental variant
    const instructions = fs.readFileSync(path.join(outDir, 'INSTRUCTIONS.md'), 'utf8')
    expect(instructions).toContain('Incremental Re-Export')
  })

  it('reports zero changes when nothing modified', () => {
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))
    const changes = fs.readFileSync(path.join(outDir, 'CHANGES.md'), 'utf8')
    expect(changes).toContain('No changes detected')
  })

  it('detects added and removed files', () => {
    writeProject({ 'app.mir': APP, 'old.com': COMPONENTS })
    buildBundle(defaults({ projectDir: projDir, outDir }))

    fs.unlinkSync(path.join(projDir, 'old.com'))
    fs.writeFileSync(path.join(projDir, 'new.tok'), 'foo.bg: #fff\n')

    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))
    const changes = fs.readFileSync(path.join(outDir, 'CHANGES.md'), 'utf8')
    expect(changes).toContain('Added')
    expect(changes).toContain('new.tok')
    expect(changes).toContain('Removed')
    expect(changes).toContain('old.com')
  })

  it('persists new hashes after incremental run for next diff', () => {
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const original = JSON.parse(fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8'))
    fs.writeFileSync(path.join(projDir, 'app.mir'), APP + '\nText "added"\n')
    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))
    const updated = JSON.parse(fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8'))
    expect(updated['app.mir']).not.toBe(original['app.mir'])
  })
})

describe('buildBundle — README content', () => {
  it('README references verify CLI when --snapshot was set', () => {
    // We can't run snapshot in unit tests (Chrome required), but we can
    // verify the README reflects whether snapshot was attempted.
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const readme = fs.readFileSync(path.join(outDir, 'README.md'), 'utf8')
    expect(readme).toContain('Not available — bundle was created without `--snapshot`')
  })

  it('README contains run command for claude', () => {
    writeProject({ 'app.mir': APP })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const readme = fs.readFileSync(path.join(outDir, 'README.md'), 'utf8')
    expect(readme).toContain('claude --print')
    expect(readme).toContain('INSTRUCTIONS.md')
  })
})

describe('buildBundle — empty project', () => {
  it('throws when project dir has no Mirror files', () => {
    fs.writeFileSync(path.join(projDir, 'README.md'), '# unrelated')
    expect(() => buildBundle(defaults({ projectDir: projDir, outDir }))).toThrow(
      /no Mirror source files/
    )
  })
})
