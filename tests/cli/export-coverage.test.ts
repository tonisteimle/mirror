/**
 * Coverage gaps for the export pipeline that the existing two suites
 * (`export.test.ts` + `export-target-content.test.ts`) leave uncovered:
 *
 *   1. File discovery semantics — ordering (tokens → data → components →
 *      layouts), excluded directories (node_modules, dot-dirs).
 *   2. Bundle freshness — manifest.generatedAt is a fresh ISO timestamp
 *      per call, not a frozen build-time constant.
 *   3. Source-tree preservation across nested directories.
 *   4. Multi-extension support — `.mirror`, `.tokens`, `.components`,
 *      `.yaml`, `.yml` (long forms) get picked up as well.
 *   5. Hash stability — re-running buildBundle with no source change
 *      produces an identical source-hashes.json.
 *   6. CHANGES.md formatting contracts — section headers + counts +
 *      file-path back-ticks survive a roundtrip.
 *
 * These are the boring infrastructure invariants that, when they break,
 * silently corrupt the bundle without throwing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { buildBundle, type Options } from '../../tools/export'

let tmpDir: string
let outDir: string
let projDir: string

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-export-cov-'))
  outDir = path.join(tmpDir, 'out')
  projDir = path.join(tmpDir, 'proj')
  fs.mkdirSync(projDir, { recursive: true })
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('file-discovery semantics', () => {
  it('orders tokens → data → components → layouts in manifest.sourceFiles', () => {
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas mobile\n')
    fs.writeFileSync(path.join(projDir, 'data.yaml'), 'foo: 1\n')
    fs.writeFileSync(path.join(projDir, 'components.com'), 'Btn: pad 8\n')
    fs.writeFileSync(path.join(projDir, 'tokens.tok'), 'primary.bg: #fff\n')
    fs.writeFileSync(path.join(projDir, 'screens.mir'), 'canvas mobile\n')
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const m = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    // Tokens must precede components which must precede layouts. Within a
    // class, alphabetical order applies (app.mir before screens.mir).
    const i = (name: string) => m.sourceFiles.indexOf(name)
    expect(i('tokens.tok')).toBeLessThan(i('data.yaml'))
    expect(i('data.yaml')).toBeLessThan(i('components.com'))
    expect(i('components.com')).toBeLessThan(i('app.mir'))
    expect(i('app.mir')).toBeLessThan(i('screens.mir'))
  })

  it('skips node_modules and dot-prefixed directories', () => {
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas mobile\n')
    // Plant Mirror files in dirs that MUST be ignored.
    fs.mkdirSync(path.join(projDir, 'node_modules', 'pkg'), { recursive: true })
    fs.writeFileSync(path.join(projDir, 'node_modules', 'pkg', 'leaked.mir'), 'canvas mobile\n')
    fs.mkdirSync(path.join(projDir, '.git'), { recursive: true })
    fs.writeFileSync(path.join(projDir, '.git', 'shadow.mir'), 'canvas mobile\n')
    fs.mkdirSync(path.join(projDir, '.cache'), { recursive: true })
    fs.writeFileSync(path.join(projDir, '.cache', 'cache.mir'), 'canvas mobile\n')
    const r = buildBundle(defaults({ projectDir: projDir, outDir }))
    expect(r.fileCount).toBe(1)
    const m = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    expect(m.sourceFiles).toEqual(['app.mir'])
  })

  it('preserves nested source-tree structure verbatim', () => {
    const layout = 'canvas mobile\n'
    fs.mkdirSync(path.join(projDir, 'screens', 'auth'), { recursive: true })
    fs.mkdirSync(path.join(projDir, 'screens', 'app'), { recursive: true })
    fs.writeFileSync(path.join(projDir, 'screens', 'auth', 'login.mir'), layout)
    fs.writeFileSync(path.join(projDir, 'screens', 'app', 'home.mir'), layout)
    fs.writeFileSync(path.join(projDir, 'app.mir'), layout)
    buildBundle(defaults({ projectDir: projDir, outDir }))
    expect(fs.existsSync(path.join(outDir, 'source', 'screens', 'auth', 'login.mir'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'source', 'screens', 'app', 'home.mir'))).toBe(true)
    expect(fs.existsSync(path.join(outDir, 'source', 'app.mir'))).toBe(true)
  })

  it('discovers all long-form extensions: .mirror .tokens .components .yml', () => {
    fs.writeFileSync(path.join(projDir, 'app.mirror'), 'canvas mobile\n')
    fs.writeFileSync(path.join(projDir, 'tokens.tokens'), 'primary.bg: #fff\n')
    fs.writeFileSync(path.join(projDir, 'components.components'), 'Btn: pad 8\n')
    fs.writeFileSync(path.join(projDir, 'data.yml'), 'foo: 1\n')
    const r = buildBundle(defaults({ projectDir: projDir, outDir }))
    expect(r.fileCount).toBe(4)
    const m = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    expect(m.sourceFiles).toEqual(
      expect.arrayContaining(['app.mirror', 'tokens.tokens', 'components.components', 'data.yml'])
    )
  })
})

describe('bundle freshness', () => {
  it('manifest.generatedAt is a fresh ISO timestamp per call', () => {
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas mobile\n')
    const t0 = Date.now()
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const t1 = Date.now()
    const m = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    const ts = Date.parse(m.generatedAt)
    expect(ts).toBeGreaterThanOrEqual(t0)
    expect(ts).toBeLessThanOrEqual(t1)
    // ISO-8601 format check
    expect(m.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
  })
})

describe('hash determinism', () => {
  it('re-running buildBundle on unchanged project yields identical hashes', () => {
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas mobile\n')
    fs.writeFileSync(path.join(projDir, 'tokens.tok'), 'primary.bg: #fff\n')
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const first = fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8')
    // Wipe the bundle and rebuild — hashes are content-addressed, not time-addressed.
    fs.rmSync(outDir, { recursive: true, force: true })
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const second = fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8')
    expect(first).toBe(second)
  })

  it("a single byte change to source flips exactly that file's hash", () => {
    fs.writeFileSync(path.join(projDir, 'a.mir'), 'canvas mobile\n')
    fs.writeFileSync(path.join(projDir, 'b.mir'), 'canvas mobile\n')
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const before = JSON.parse(fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8'))
    fs.writeFileSync(path.join(projDir, 'a.mir'), 'canvas tablet\n')
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const after = JSON.parse(fs.readFileSync(path.join(outDir, 'source-hashes.json'), 'utf8'))
    expect(after['a.mir']).not.toBe(before['a.mir'])
    expect(after['b.mir']).toBe(before['b.mir'])
  })
})

describe('CHANGES.md formatting contracts', () => {
  it('renders section headers + per-file backticked paths + totals', () => {
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas mobile\n')
    fs.writeFileSync(path.join(projDir, 'old.tok'), 'a.bg: #000\n')
    buildBundle(defaults({ projectDir: projDir, outDir }))

    fs.unlinkSync(path.join(projDir, 'old.tok'))
    fs.writeFileSync(path.join(projDir, 'new.tok'), 'b.bg: #fff\n')
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas tablet\n')
    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))

    const md = fs.readFileSync(path.join(outDir, 'CHANGES.md'), 'utf8')
    // Total count line
    expect(md).toMatch(/3 file\(s\) changed/)
    // Section headers with counts
    expect(md).toMatch(/### Added \(1\)/)
    expect(md).toMatch(/### Modified \(1\)/)
    expect(md).toMatch(/### Removed \(1\)/)
    // Backticked file paths
    expect(md).toContain('`new.tok`')
    expect(md).toContain('`app.mir`')
    expect(md).toContain('`old.tok`')
    // Heuristic guidance section
    expect(md).toMatch(/How to handle/)
  })

  it('omits empty sections when only one change-class is non-empty', () => {
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas mobile\n')
    buildBundle(defaults({ projectDir: projDir, outDir }))
    fs.writeFileSync(path.join(projDir, 'app.mir'), 'canvas tablet\n')
    buildBundle(defaults({ projectDir: projDir, outDir, incremental: true }))
    const md = fs.readFileSync(path.join(outDir, 'CHANGES.md'), 'utf8')
    expect(md).toMatch(/### Modified/)
    // Added/Removed sections must NOT render as empty blocks
    expect(md).not.toMatch(/### Added/)
    expect(md).not.toMatch(/### Removed/)
  })
})
