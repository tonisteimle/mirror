// @vitest-environment jsdom
/**
 * Slice 30 — Cross-Element-State (`MenuBtn.open: visible` /
 * `visible when MenuBtn open:`) regression suite.
 *
 * Audit: `docs/refactoring/11-slice-30-cross-element-state.md`. The
 * compile pipeline already handled both syntax variants (emit
 * `_runtime.watchStates(...)` with a synthetic `_<Element>_<state>`
 * trigger). The audit found three real bugs:
 *
 *   1. Validator silent on undefined cross-element refs (`GhostBtn.open:`
 *      where GhostBtn doesn't exist) — silent runtime failure, no
 *      compile-time DX.
 *   2. Validator silent on unknown states (`MenuBtn.unknown-state:`
 *      where MenuBtn has no `unknown-state`).
 *   3. Studio-Sync did not recognize the `Element.state:` form as a
 *      state-block; cursor inside such a block returned a null parent
 *      context, breaking Property-Panel / breadcrumb downstreams.
 *
 * Locks (RT-1..RT-10):
 *
 *   - RT-1  `MenuBtn.open: visible` compile + watchStates emission
 *   - RT-2  `visible when MenuBtn open:` alternative form
 *   - RT-3  `and` condition emits combined watchStates
 *   - RT-4  Default `or` condition for chained refs
 *   - RT-5  E404 — undefined element ref
 *   - RT-6  E405 — unknown state on existing element
 *   - RT-7  Validator clean for valid input
 *   - RT-8  Studio Sync — cursor in `MenuBtn.open:` block
 *   - RT-9  Studio Sync — cursor in `visible when MenuBtn open:` block
 *   - RT-10 E404 hint suggests a close instance name
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { Validator } from '../../compiler/validator/validator'
import { ERROR_CODES } from '../../compiler/validator/types'

function compile(src: string): string {
  return generateDOM(parse(src))
}
function validate(src: string) {
  return new Validator().validate(parse(src))
}

describe('Slice 30 — Cross-Element-State', () => {
  // -------------------------------------------------------------------
  // Compile-Pipeline RTs
  // -------------------------------------------------------------------
  it('RT-1 — `MenuBtn.open: visible` emits watchStates', () => {
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #2271C1`,
      `Frame hidden`,
      `  MenuBtn.open:`,
      `    visible`,
      `  Text "Item"`,
    ].join('\n')
    const js = compile(src)
    expect(js).toMatch(/watchStates\([^)]+,\s*['"]_MenuBtn_open['"]/)
  })

  it('RT-2 — `visible when MenuBtn open:` alternative form', () => {
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #2271C1`,
      `Frame hidden`,
      `  visible when MenuBtn open:`,
      `  Text "Item"`,
    ].join('\n')
    const js = compile(src)
    expect(js).toMatch(/watchStates\([^)]+,\s*['"]visible['"]/)
  })

  it('RT-3 — `and` condition combined into a single watchStates', () => {
    const src = [
      `Button named A, toggle()`,
      `  open: bg #f00`,
      `Button named B, toggle()`,
      `  open: bg #0f0`,
      `Frame hidden`,
      `  visible when A open and B open:`,
      `  Text "Both open"`,
    ].join('\n')
    const js = compile(src)
    const m = js.match(/watchStates\(([^)]+)\)/)
    expect(m).toBeTruthy()
    expect(m![1]).toMatch(/['"]and['"]/)
  })

  it('RT-4 — single ref defaults to `or` condition', () => {
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #f00`,
      `Frame hidden`,
      `  visible when MenuBtn open:`,
      `  Text "Item"`,
    ].join('\n')
    const js = compile(src)
    const m = js.match(/watchStates\(([^)]+)\)/)
    expect(m).toBeTruthy()
    expect(m![1]).toMatch(/['"]or['"]/)
  })

  // -------------------------------------------------------------------
  // Validator RTs
  // -------------------------------------------------------------------
  it('RT-5 — E404: undefined element ref produces error', () => {
    const src = [`Frame hidden`, `  GhostBtn.open:`, `    visible`, `  Text "Item"`].join('\n')
    const r = validate(src)
    const err = r.errors.find(e => e.code === ERROR_CODES.UNDEFINED_ELEMENT_REF)
    expect(err).toBeTruthy()
    expect(err?.message).toMatch(/GhostBtn/)
  })

  it('RT-6 — E405: unknown state on existing element produces error', () => {
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #f00`,
      `Frame hidden`,
      `  MenuBtn.foobar:`,
      `    visible`,
      `  Text "Item"`,
    ].join('\n')
    const r = validate(src)
    const err = r.errors.find(e => e.code === ERROR_CODES.UNKNOWN_STATE_REF)
    expect(err).toBeTruthy()
    expect(err?.message).toMatch(/foobar/)
    expect(err?.message).toMatch(/MenuBtn/)
  })

  it('RT-7 — validator clean for valid cross-element-state', () => {
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #2271C1`,
      `Frame hidden`,
      `  MenuBtn.open:`,
      `    visible`,
      `  Text "Item"`,
    ].join('\n')
    const r = validate(src)
    expect(r.errors.filter(e => e.code === ERROR_CODES.UNDEFINED_ELEMENT_REF)).toEqual([])
    expect(r.errors.filter(e => e.code === ERROR_CODES.UNKNOWN_STATE_REF)).toEqual([])
  })

  // -------------------------------------------------------------------
  // Studio Sync RTs (cross-slice — same module as Slice 28's RTs)
  // -------------------------------------------------------------------
  it('RT-8 — Studio Sync: cursor in `MenuBtn.open:` block → state context', async () => {
    const { findParentDefinition } = await import('../../studio/sync/component-line-parser')
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #2271C1`,
      `MyFrame:`,
      `  MenuBtn.open:`,
      `    visible`,
    ].join('\n')
    const ctx = findParentDefinition(src, 4)
    expect(ctx?.childType).toBe('state')
    expect(ctx?.childLabel).toBe('MenuBtn.open')
  })

  it('RT-9 — Studio Sync: extractComponentFromLine on `MenuBtn.open:` returns null (skip)', async () => {
    const { extractComponentFromLine } = await import('../../studio/sync/component-line-parser')
    // Component-line extraction should NOT treat MenuBtn.open as a component
    // instance — it's a state-block line.
    expect(extractComponentFromLine('  MenuBtn.open:')).toBeNull()
  })

  // -------------------------------------------------------------------
  // E404 suggestion quality
  // -------------------------------------------------------------------
  it('RT-10 — E404 suggests a close instance name when one exists', () => {
    const src = [
      `Button named MenuBtn, toggle()`,
      `  open: bg #f00`,
      `Frame hidden`,
      `  MenuBn.open:`, // typo: missing 't'
      `    visible`,
      `  Text "Item"`,
    ].join('\n')
    const r = validate(src)
    const err = r.errors.find(e => e.code === ERROR_CODES.UNDEFINED_ELEMENT_REF)
    expect(err).toBeTruthy()
    expect(err?.suggestion).toMatch(/MenuBtn/)
  })
})
