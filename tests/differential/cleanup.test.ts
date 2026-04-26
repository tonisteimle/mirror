/**
 * Cleanup — Differential Testing (Schicht 4)
 *
 * Documentation: docs/concepts/cleanup-backend-support.md.
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

describe('Cleanup — Custom Icons (Bug #34 pinned)', () => {
  it('Bug #34: $icons emits registerIcon BEFORE _runtime const → TDZ at runtime', () => {
    const out = generateDOM(parse(`$icons:\n  hbox: "M3 3h18v18H3z"\n\nIcon "hbox"`))
    // Compiles (parse + emit OK)
    expect(out).toContain('_runtime.registerIcon')
    // Emit order is wrong: registerIcon at top level appears before const _runtime
    const idxRegister = out.indexOf('_runtime.registerIcon')
    const idxConst = out.indexOf('const _runtime = {')
    expect(idxRegister).toBeGreaterThan(-1)
    expect(idxConst).toBeGreaterThan(-1)
    expect(idxRegister).toBeLessThan(idxConst)
  })

  it('Bug #34 — pinned: React/Framework backends compile $icons without throwing', () => {
    const src = `$icons:\n  hbox: "M3 3h18v18H3z"\n\nIcon "hbox"`
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
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
