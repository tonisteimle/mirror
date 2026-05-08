/**
 * Bundle-content contracts: the INSTRUCTIONS.md handed to the LLM
 * agent must MATCH the chosen target. The existing export.test.ts
 * verifies INSTRUCTIONS.md *exists*, but never checks that
 * --target=svelte produces svelte-specific instructions (vs. silently
 * shipping the react template). A regression in the template selector
 * would slip through unnoticed — the bundle structure looks fine,
 * the agent just generates the wrong framework's code.
 *
 * This suite asserts target-specific content lands in the bundle for
 * each of the 4 validated targets. The same per-template contracts
 * live in `export-templates.test.ts` (template-file level); this
 * suite verifies they survive the bundle-write step.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { buildBundle, type Options } from '../../tools/export'

const APP = `canvas mobile, bg #1a1a1a\nText "Hello", col white, fs 24\n`

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
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-export-target-'))
  outDir = path.join(tmpDir, 'out')
  projDir = path.join(tmpDir, 'proj')
  fs.mkdirSync(projDir, { recursive: true })
  fs.writeFileSync(path.join(projDir, 'app.mir'), APP)
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('INSTRUCTIONS.md matches the chosen target', () => {
  it('react bundle ships react-specific instructions (not vue/svelte/vanilla)', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'react' }))
    const instr = fs.readFileSync(path.join(outDir, 'INSTRUCTIONS.md'), 'utf8')
    expect(instr).toMatch(/Tailwind/)
    expect(instr).toMatch(/tailwind\.config\.ts/)
    // Negative: must NOT carry Svelte/Vue/Vanilla markers
    expect(instr).not.toMatch(/script setup/)
    expect(instr).not.toMatch(/\$props\b/)
    expect(instr).not.toMatch(/no React|No frameworks/i)
  })

  it('vue bundle ships vue-specific instructions (script setup, defineProps)', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'vue' }))
    const instr = fs.readFileSync(path.join(outDir, 'INSTRUCTIONS.md'), 'utf8')
    expect(instr).toMatch(/script setup/)
    expect(instr).toMatch(/defineProps</)
    expect(instr).not.toMatch(/\$props\b/)
    expect(instr).not.toMatch(/No frameworks/i)
  })

  it('svelte bundle ships svelte-specific instructions ($props, runes)', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'svelte' }))
    const instr = fs.readFileSync(path.join(outDir, 'INSTRUCTIONS.md'), 'utf8')
    expect(instr).toMatch(/\$props/)
    expect(instr).toMatch(/runes/)
    expect(instr).not.toMatch(/script setup/)
    expect(instr).not.toMatch(/No frameworks/i)
  })

  it('vanilla bundle ships vanilla-specific instructions (no JS framework)', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'vanilla' }))
    const instr = fs.readFileSync(path.join(outDir, 'INSTRUCTIONS.md'), 'utf8')
    // Vanilla template forbids frameworks AND advocates CSS custom props.
    expect(instr).toMatch(/no React|No frameworks/i)
    expect(instr).toMatch(/CSS custom properties|CSS-Custom/i)
    // Vanilla must NOT prescribe Tailwind utility classes nor a tailwind.config.
    expect(instr).not.toMatch(/tailwind\.config/)
    expect(instr).not.toMatch(/@tailwind\b/)
    expect(instr).not.toMatch(/script setup/)
    expect(instr).not.toMatch(/\$props\b/)
  })
})

describe('target.json shape per target', () => {
  it('react.target.json has all 4 framework fields + strictTypes constraint', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'react' }))
    const tgt = JSON.parse(fs.readFileSync(path.join(outDir, 'target.json'), 'utf8'))
    expect(tgt.framework).toBe('react')
    expect(tgt.language).toBe('typescript')
    expect(tgt.styling).toBe('tailwind')
    expect(tgt.buildTool).toBe('vite')
    expect(tgt.constraints).toMatchObject({ strictTypes: true })
  })

  it('vanilla.target.json omits language/styling/buildTool', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'vanilla' }))
    const tgt = JSON.parse(fs.readFileSync(path.join(outDir, 'target.json'), 'utf8'))
    expect(tgt.framework).toBe('vanilla')
    expect(tgt.language).toBeUndefined()
    expect(tgt.styling).toBeUndefined()
    expect(tgt.buildTool).toBeUndefined()
    expect(tgt.constraints).toMatchObject({ noFramework: true, noBuildTool: true })
  })

  it('vue + svelte both have script-friendly buildTool=vite', () => {
    for (const target of ['vue', 'svelte'] as const) {
      buildBundle(defaults({ projectDir: projDir, outDir, target }))
      const tgt = JSON.parse(fs.readFileSync(path.join(outDir, 'target.json'), 'utf8'))
      expect(tgt.framework).toBe(target)
      expect(tgt.buildTool).toBe('vite')
      expect(tgt.language).toBe('typescript')
      // Reset between iterations.
      fs.rmSync(outDir, { recursive: true, force: true })
    }
  })
})

describe('manifest.json schema', () => {
  it('contains all 8 required keys with correct types', () => {
    buildBundle(defaults({ projectDir: projDir, outDir, target: 'react' }))
    const m = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))

    expect(typeof m.target).toBe('string')
    expect(typeof m.fileCount).toBe('number')
    expect(Array.isArray(m.sourceFiles)).toBe(true)
    expect(typeof m.hasVisualReference).toBe('boolean')
    expect(typeof m.hasRenderSnapshot).toBe('boolean')
    expect(typeof m.generatedAt).toBe('string')
    // generatedAt must parse as a date (ISO-ish)
    expect(Number.isFinite(Date.parse(m.generatedAt))).toBe(true)
  })

  it('hasVisualReference + hasRenderSnapshot reflect actual bundle state', () => {
    buildBundle(defaults({ projectDir: projDir, outDir }))
    const m = JSON.parse(fs.readFileSync(path.join(outDir, 'manifest.json'), 'utf8'))
    expect(m.hasVisualReference).toBe(false)
    expect(m.hasRenderSnapshot).toBe(false)
    // Verify by absence of the corresponding files.
    expect(fs.existsSync(path.join(outDir, 'visual-reference.html'))).toBe(false)
    expect(fs.existsSync(path.join(outDir, 'render-snapshot'))).toBe(false)
  })
})

describe('README.md target-aware command', () => {
  it.each(['react', 'vue', 'svelte', 'vanilla'] as const)(
    '%s README references INSTRUCTIONS.md and the claude CLI invocation',
    target => {
      buildBundle(defaults({ projectDir: projDir, outDir, target }))
      const readme = fs.readFileSync(path.join(outDir, 'README.md'), 'utf8')
      // The README is the human entry point — it MUST tell the user
      // exactly how to invoke the agent. Two non-negotiables:
      expect(readme).toContain('claude --print')
      expect(readme).toContain('INSTRUCTIONS.md')
    }
  )
})
