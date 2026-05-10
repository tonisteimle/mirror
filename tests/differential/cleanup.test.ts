/**
 * Cleanup — Differential Testing (Schicht 4)
 *
 * Documentation: docs/archive/concepts/cleanup-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const ANIMATIONS = [
  ['spin', `Icon "loader", anim spin, is 24`],
  ['bounce', `Frame anim bounce, w 50, h 50`],
  ['pulse', `Frame anim pulse, w 50, h 50`],
  ['shake', `Frame anim shake, w 50, h 50`],
  ['fade-in', `Frame anim fade-in, w 50, h 50`],
  ['scale-in', `Frame anim scale-in, w 50, h 50`],
] as const

const CANVAS_PRESETS = [
  ['mobile', `canvas mobile\n\nText "Hi"`],
  ['tablet', `canvas tablet\n\nText "Hi"`],
  ['desktop', `canvas desktop\n\nText "Hi"`],
] as const

const DATEPICKER_VARIANTS = [
  ['basic', `DatePicker placeholder "Select"`],
  ['range', `DatePicker selectionMode "range"`],
  ['min-max', `DatePicker min "2024-01-01", max "2024-12-31"`],
  ['startOfWeek', `DatePicker startOfWeek 1`],
] as const

describe('Cleanup — Animations across backends', () => {
  it.each(ANIMATIONS)('anim %s compiles in DOM, React, Framework', (_name, src) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })

  it.each(ANIMATIONS)('anim %s mention appears in DOM output', (name, src) => {
    const out = generateDOM(parse(src))
    expect(out).toMatch(new RegExp(name.replace('-', '[-_]?'), 'i'))
  })

  // PIN: DOM and React both wire animations through the shared
  // `compiler/backends/animations.ts` constants — DOM emits the keyframes
  // into its stylesheet plus an `animation:` rule on the matching element;
  // React emits a `<style>` block carrying the same keyframes plus
  // `style={{ animation: 'mirror-…' }}` inline. Framework still drops
  // the trigger silently (M(...) descriptor has no animation hook yet).
  it.each(ANIMATIONS)(
    'anim %s: DOM and React wire keyframes; Framework drops the trigger',
    (_name, src) => {
      const dom = generateDOM(parse(src))
      const react = generateReact(parse(src))
      const fw = generateFramework(parse(src))

      expect(dom).toMatch(/@keyframes mirror-/)
      expect(dom).toMatch(/animation['":\s]+['"]mirror-/)

      expect(react).toMatch(/@keyframes mirror-/)
      // Quote style depends on emit path: inline style uses single
      // quotes (`style={{ animation: 'mirror-…' }}`), Icon path uses
      // JSON.stringify-derived double quotes. Match either.
      expect(react).toMatch(/animation:\s*['"]mirror-/)

      expect(fw).not.toMatch(/@keyframes/)
      expect(fw).not.toMatch(/animation:/)
    }
  )

  it('React skips the keyframes `<style>` block when no anim is used', () => {
    // Bunde-size guard: simple programs without `anim` must NOT carry
    // 17 keyframes worth of CSS.
    const react = generateReact(parse(`Frame w 50, h 50`))
    expect(react).not.toMatch(/@keyframes/)
    expect(react).not.toMatch(/<style>/)
  })
})

describe('Cleanup — Canvas presets across backends', () => {
  it.each(CANVAS_PRESETS)('canvas %s compiles in DOM, React, Framework', (_name, src) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })

  it('canvas mobile emits 375px / 812px in DOM', () => {
    const out = generateDOM(parse(`canvas mobile\n\nText "Hi"`))
    expect(out).toContain('375px')
    expect(out).toContain('812px')
  })

  it('canvas tablet emits 768px / 1024px in DOM', () => {
    const out = generateDOM(parse(`canvas tablet\n\nText "Hi"`))
    expect(out).toContain('768px')
    expect(out).toContain('1024px')
  })

  it('canvas desktop emits 1440px / 900px in DOM', () => {
    const out = generateDOM(parse(`canvas desktop\n\nText "Hi"`))
    expect(out).toContain('1440px')
    expect(out).toContain('900px')
  })
})

describe('Cleanup — Custom Icons across backends', () => {
  const SINGLE = `$icons:\n  hbox: "M3 3h18v18H3z"\n\nIcon "hbox"`
  const MULTI = `$icons:\n  hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"\n\nIcon "hbox"`
  const MIXED = `$icons:\n  myicon: "M3 3h18v18H3z"\n\nIcon "myicon"\nIcon "check"`

  it('$icons: emits registerIcon AFTER const _runtime declaration (Bug #34 fixed)', () => {
    const out = generateDOM(parse(SINGLE))
    expect(out).toContain('_runtime.registerIcon')
    const idxRegister = out.indexOf('_runtime.registerIcon')
    const idxConst = out.indexOf('const _runtime = {')
    expect(idxRegister).toBeGreaterThan(-1)
    expect(idxConst).toBeGreaterThan(-1)
    expect(idxRegister).toBeGreaterThan(idxConst)
  })

  // Pre-Slice-51 these passed by "compiles without throwing" while React +
  // Framework silently dropped the custom-icon registry. Strengthened to
  // assert each backend actually emits the registration in its own dialect.
  it('all three backends register the icon name and path (single-path)', () => {
    const dom = generateDOM(parse(SINGLE))
    const react = generateReact(parse(SINGLE))
    const fw = generateFramework(parse(SINGLE))

    expect(dom).toMatch(/_runtime\.registerIcon\(\s*['"]hbox['"]/)
    expect(react).toContain('_MIRROR_CUSTOM_ICONS["hbox"]')
    expect(fw).toMatch(/M\.registerIcon\(\s*['"]hbox['"]/)

    for (const out of [dom, react, fw]) {
      expect(out).toContain('M3 3h18v18H3z')
    }
  })

  it('all three backends pass through multi-path | separator unchanged', () => {
    const dom = generateDOM(parse(MULTI))
    const react = generateReact(parse(MULTI))
    const fw = generateFramework(parse(MULTI))
    for (const out of [dom, react, fw]) {
      expect(out).toContain('M3 3h18v18H3z|M9 3v18|M15 3v18')
    }
  })

  it('mixing custom + Lucide registers only the custom path', () => {
    const dom = generateDOM(parse(MIXED))
    const react = generateReact(parse(MIXED))
    const fw = generateFramework(parse(MIXED))

    expect(dom).toMatch(/registerIcon\(\s*['"]myicon['"]/)
    expect(dom).not.toMatch(/registerIcon\(\s*['"]check['"]/)

    expect(react).toContain('_MIRROR_CUSTOM_ICONS["myicon"]')
    expect(react).not.toContain('_MIRROR_CUSTOM_ICONS["check"]')

    expect(fw).toMatch(/M\.registerIcon\(\s*['"]myicon['"]/)
    expect(fw).not.toMatch(/M\.registerIcon\(\s*['"]check['"]/)
  })
})

describe('Cleanup — DatePicker across backends', () => {
  it.each(DATEPICKER_VARIANTS)('DatePicker %s compiles in DOM, React, Framework', (_name, src) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })

  it('DatePicker emits data-zag-component="datepicker" in DOM', () => {
    const out = generateDOM(parse(`DatePicker placeholder "X"`))
    expect(out).toContain('datepicker')
  })

  it('DatePicker emits initDatePickerComponent runtime call in DOM', () => {
    const out = generateDOM(parse(`DatePicker placeholder "X"`))
    expect(out).toContain('initDatePickerComponent')
  })
})
