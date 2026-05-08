import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const TEMPLATES_DIR = path.resolve(__dirname, '../../tools/export/templates')

const TARGETS = ['react', 'vue', 'svelte', 'vanilla'] as const
type Target = (typeof TARGETS)[number]

describe('export templates — all required files present', () => {
  it('mirror-brief.md exists', () => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, 'mirror-brief.md'))).toBe(true)
  })

  it.each(TARGETS)('instructions-%s.md exists', (target: Target) => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, `instructions-${target}.md`))).toBe(true)
  })

  it('instructions-incremental.md exists for incremental re-export', () => {
    expect(fs.existsSync(path.join(TEMPLATES_DIR, 'instructions-incremental.md'))).toBe(true)
  })
})

describe('mirror-brief.md — covers DSL constructs encountered in spikes', () => {
  const brief = fs.readFileSync(path.join(TEMPLATES_DIR, 'mirror-brief.md'), 'utf8')

  it('explains primitives → HTML mapping', () => {
    expect(brief).toMatch(/Frame.*<div>/i)
    expect(brief).toMatch(/Text.*<span>/i)
    expect(brief).toMatch(/Button.*<button>/i)
  })

  it('explains tokens with property suffixes', () => {
    expect(brief).toMatch(/yellow\.bg/)
    expect(brief).toMatch(/\.maxw/)
  })

  it('covers component definition forms (as Primitive, body slot)', () => {
    expect(brief).toMatch(/as <?Primitive>?/i)
    expect(brief).toMatch(/Form A|Form B/)
  })

  it('covers inline-markdown rules + visual-style override', () => {
    expect(brief).toMatch(/\*\*bold\*\*/)
    expect(brief).toMatch(/<strong>/)
    expect(brief).toMatch(/<em>/)
    expect(brief).toMatch(/visual reference/i)
  })

  it('covers markdown blocks AND ### headings inside prose', () => {
    expect(brief).toMatch(/markdown[\s-]?(list|style|block)/i)
    expect(brief).toMatch(/### Heading/)
  })

  it('covers runtime-computed property values + inline-style fallback', () => {
    expect(brief).toMatch(/Runtime-computed/i)
    expect(brief).toMatch(/inline[\s-]?style/i)
  })

  it('mentions render-snapshot as ground truth', () => {
    expect(brief).toMatch(/render-snapshot/)
    expect(brief).toMatch(/computed-styles/)
  })
})

describe('per-target instructions — required structure', () => {
  it.each(TARGETS)('%s template has step gates and DOD', (target: Target) => {
    const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, `instructions-${target}.md`), 'utf8')
    expect(tpl).toMatch(/Step 1/)
    expect(tpl).toMatch(/\*\*Gate:?\*\*/i)
    expect(tpl).toMatch(/Definition of/i)
  })

  it.each(['react', 'vue', 'svelte'] as const)(
    '%s template references render-snapshot verify',
    t => {
      const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, `instructions-${t}.md`), 'utf8')
      expect(tpl).toMatch(/render-snapshot/)
      expect(tpl).toMatch(/verify\.ts|verify-report\.md/)
    }
  )

  it('vanilla template forbids JS frameworks', () => {
    const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'instructions-vanilla.md'), 'utf8')
    expect(tpl).toMatch(/no React|No frameworks/i)
    expect(tpl).toMatch(/CSS custom properties|CSS-Custom/i)
  })

  it('react template uses Tailwind utilities + tailwind.config.ts', () => {
    const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'instructions-react.md'), 'utf8')
    expect(tpl).toMatch(/Tailwind/)
    expect(tpl).toMatch(/tailwind\.config\.ts/)
  })

  it('vue template uses script-setup + defineProps generic', () => {
    const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'instructions-vue.md'), 'utf8')
    expect(tpl).toMatch(/script setup/)
    expect(tpl).toMatch(/defineProps</)
  })

  it('svelte template uses Svelte 5 runes ($props, $state)', () => {
    const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'instructions-svelte.md'), 'utf8')
    expect(tpl).toMatch(/\$props/)
    expect(tpl).toMatch(/runes/)
  })
})

describe('incremental template — conservative-edit instructions', () => {
  const tpl = fs.readFileSync(path.join(TEMPLATES_DIR, 'instructions-incremental.md'), 'utf8')

  it('reads CHANGES.md as input', () => {
    expect(tpl).toMatch(/CHANGES\.md/)
  })

  it('instructs to preserve user edits in unchanged areas', () => {
    expect(tpl).toMatch(/preserve|do not touch|don't touch/i)
  })

  it('handles added / modified / removed cases distinctly', () => {
    expect(tpl).toMatch(/added/i)
    expect(tpl).toMatch(/modified/i)
    expect(tpl).toMatch(/removed/i)
  })

  it('requires green build as gate', () => {
    expect(tpl).toMatch(/build|tsc|svelte-check/)
  })
})
