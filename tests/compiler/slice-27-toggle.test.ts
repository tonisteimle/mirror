// @vitest-environment jsdom
/**
 * Slice 27 — Custom-State `toggle()` regression suite.
 *
 * Audit: `docs/refactoring/06-slice-27-toggle.md`. The audit found that
 * three layers (IR transformer, DOM emitter, runtime) each carried their
 * own hardcoded list of "CSS pseudo-classes vs. custom states", and the
 * lists drifted from the schema as Slice 26 widened it from 4 → 13
 * system-states. Symptom: `toggle()` could pick `:visited` / `:checked` /
 * `::placeholder` / `:focus-visible` as cycle targets.
 *
 * Slice 27 introduces `isToggleableStateName` as a single source of truth,
 * makes the emitter compute the cycle order at compile time, and aligns
 * the runtime defensive default with the schema.
 *
 * Locks (RT-1..RT-12 from the audit):
 *
 *   - RT-1   `toggle()` + `on:` → target = `on`
 *   - RT-2   `toggle()` without states → implicit `on` + binary toggle
 *   - RT-3   `toggle()` + `visited:` → target NOT `visited`
 *   - RT-4   `toggle()` + `checked:` → target NOT `checked`
 *   - RT-5   `toggle()` + `placeholder:` → target NOT `placeholder`
 *   - RT-6   `toggle()` + 3 customs + `focus-visible:` → 3-cycle, no FV
 *   - RT-7   `cycle()` ≡ `toggle()` (alias stability)
 *   - RT-8   Instance `, on` with `toggle()` → initial `on`
 *   - RT-9   `active:` with styles stays a custom toggle target
 *   - RT-10  Runtime `stateMachineToggle` ignores schema-system-states
 *   - RT-11  Schema-drift guard: every system-state is non-toggleable
 *   - RT-12  Multi-state cycle emitter passes explicit stateOrder
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { toIR } from '../../compiler/ir'
import { isToggleableStateName, SYSTEM_STATES } from '../../compiler/schema/parser-helpers'
import { stateMachineToggle } from '../../compiler/runtime/state-machine'
import { DSL } from '../../compiler/schema/dsl'

function compile(src: string): string {
  return generateDOM(parse(src))
}
function ir(src: string) {
  return toIR(parse(src))
}

describe('Slice 27 — toggle()', () => {
  // ---------------------------------------------------------------------
  // RT-1 — basic happy path
  // ---------------------------------------------------------------------
  it('RT-1 — toggle() + on: builds transition with target "on"', () => {
    const r = ir(`Btn: bg #333, toggle()\n  on:\n    bg #f00\nBtn "X"`)
    const node = r.nodes[0]
    const trans = node?.stateMachine?.transitions?.[0]
    expect(trans?.to).toBe('on')
    expect(trans?.modifier).toBe('toggle')
  })

  // ---------------------------------------------------------------------
  // RT-2 — implicit on
  // ---------------------------------------------------------------------
  it('RT-2 — toggle() without explicit states creates implicit "on"', () => {
    const r = ir(`Btn: bg #333, toggle()\nBtn "X"`)
    const node = r.nodes[0]
    expect(Object.keys(node?.stateMachine?.states ?? {})).toContain('on')
    expect(node?.stateMachine?.transitions?.[0]?.to).toBe('on')
  })

  // ---------------------------------------------------------------------
  // RT-3..RT-5 — Schema-drift bugs from the audit
  // ---------------------------------------------------------------------
  it('RT-3 — toggle() + visited: does NOT pick visited as target', () => {
    const r = ir(`Btn: bg #333, toggle()\n  visited:\n    col #888\nBtn`)
    const node = r.nodes[0]
    expect(node?.stateMachine?.transitions?.[0]?.to).not.toBe('visited')
    expect(node?.stateMachine?.transitions?.[0]?.to).toBe('on')
  })

  it('RT-4 — toggle() + checked: does NOT pick checked as target', () => {
    const r = ir(`Btn: bg #333, toggle()\n  checked:\n    bg #f00\nBtn`)
    const node = r.nodes[0]
    expect(node?.stateMachine?.transitions?.[0]?.to).not.toBe('checked')
    expect(node?.stateMachine?.transitions?.[0]?.to).toBe('on')
  })

  it('RT-5 — toggle() + placeholder: does NOT pick placeholder as target', () => {
    const r = ir(`MyInput as Input: col white, toggle()\n  placeholder:\n    col #888\nMyInput`)
    const node = r.nodes[0]
    expect(node?.stateMachine?.transitions?.[0]?.to).not.toBe('placeholder')
    expect(node?.stateMachine?.transitions?.[0]?.to).toBe('on')
  })

  // ---------------------------------------------------------------------
  // RT-6 — focus-visible co-defined doesn't enter the cycle
  // ---------------------------------------------------------------------
  it('RT-6 — multi-state cycle excludes focus-visible', () => {
    const src = [
      `Status: pad 8, toggle()`,
      `  a:`,
      `    bg #f00`,
      `  b:`,
      `    bg #0f0`,
      `  c:`,
      `    bg #00f`,
      `  focus-visible:`,
      `    bor 2`,
      `Status`,
    ].join('\n')
    const js = compile(src)
    // The emitter passes an explicit stateOrder for multi-state cycles.
    // Find the call and assert focus-visible is not in the order.
    const m = js.match(/stateMachineToggle\([^,]+,\s*\[([^\]]+)\]\)/)
    expect(m).toBeTruthy()
    const order = m![1]
    expect(order).toContain("'a'")
    expect(order).toContain("'b'")
    expect(order).toContain("'c'")
    expect(order).not.toMatch(/['"]focus-visible['"]/)
  })

  // ---------------------------------------------------------------------
  // RT-7 — cycle() alias
  // ---------------------------------------------------------------------
  it('RT-7 — cycle() emits the same JS as toggle() (modulo node ids)', () => {
    const norm = (s: string) =>
      s.replace(/node_\d+/g, 'node_X').replace(/data-mirror-id="[^"]+"/g, 'data-mirror-id="X"')
    const a = compile(`Btn: bg #333, toggle()\n  on:\n    bg #f00\nBtn`)
    const b = compile(`Btn: bg #333, cycle()\n  on:\n    bg #f00\nBtn`)
    expect(norm(a)).toBe(norm(b))
  })

  // ---------------------------------------------------------------------
  // RT-8 — instance `, on` initial state
  // ---------------------------------------------------------------------
  it('RT-8 — instance with `, on` starts in the on state', () => {
    const js = compile(`Btn: bg #333, toggle()\n  on:\n    bg #f00\nBtn "X", on`)
    expect(js).toMatch(/_stateMachine\s*=\s*\{[^}]*current:\s*['"]on['"]/)
  })

  // ---------------------------------------------------------------------
  // RT-9 — active with styles is allowed as custom toggle target
  // ---------------------------------------------------------------------
  it('RT-9 — active: with styles stays a valid custom toggle target', () => {
    // Legacy carve-out: tabs / menu items often re-use "active". The
    // schema flags it as system, but if styles are defined the user
    // intends a custom state. Slice 27 preserves this.
    expect(isToggleableStateName('active', true)).toBe(true)
    expect(isToggleableStateName('active', false)).toBe(false)
    expect(isToggleableStateName('disabled', true)).toBe(true)
    expect(isToggleableStateName('disabled', false)).toBe(false)
  })

  // ---------------------------------------------------------------------
  // RT-10 — runtime stateMachineToggle direct call
  // ---------------------------------------------------------------------
  it('RT-10 — runtime defensive filter excludes schema system-states', async () => {
    const el = document.createElement('div') as HTMLElement & {
      _stateMachine?: any
      _baseStyles?: any
      dataset: any
    }
    el._stateMachine = {
      current: 'default',
      initial: 'default',
      states: {
        default: { name: 'default', styles: {} },
        on: { name: 'on', styles: {} },
        // schema-system-state, must NOT enter the cycle
        'focus-visible': { name: 'focus-visible', styles: {} },
      },
      transitions: [],
    }
    el._baseStyles = {}

    // The transition body runs inside requestAnimationFrame. The contract
    // we care about here is what the cycle picks (sm.current, set
    // synchronously), not the async DOM-side effects.
    stateMachineToggle(el)
    expect(el._stateMachine!.current).toBe('on')
    // The unblocked transition guard requires a microtask flush before the
    // second toggle; otherwise `_isTransitioning` would short-circuit it.
    await new Promise(resolve => requestAnimationFrame(() => resolve(null)))
    stateMachineToggle(el)
    // Back to default, NOT to focus-visible.
    expect(el._stateMachine!.current).not.toBe('focus-visible')
    expect(el._stateMachine!.current).toBe('default')
  })

  // ---------------------------------------------------------------------
  // RT-11 — schema-drift guard at the source-of-truth helper
  // ---------------------------------------------------------------------
  it('RT-11 — every system-state in DSL is non-toggleable (with active/disabled carve-out)', () => {
    for (const name of SYSTEM_STATES) {
      if (name === 'active' || name === 'disabled') {
        // styled → toggleable; unstyled → not
        expect(isToggleableStateName(name, true)).toBe(true)
        expect(isToggleableStateName(name, false)).toBe(false)
      } else {
        // every other system-state is browser-driven, never a toggle target
        expect(isToggleableStateName(name, true)).toBe(false)
        expect(isToggleableStateName(name, false)).toBe(false)
      }
    }
    // Every state in DSL.states with system: true must be in the filter.
    const systemFromSchema = Object.entries(DSL.states)
      .filter(([, def]) => (def as { system?: boolean }).system)
      .map(([n]) => n)
    expect(systemFromSchema.length).toBeGreaterThanOrEqual(13)
    for (const name of systemFromSchema) {
      expect(SYSTEM_STATES.has(name)).toBe(true)
    }
  })

  // ---------------------------------------------------------------------
  // RT-12a — third drift point: `_stateStyles` filter is also schema-derived
  // ---------------------------------------------------------------------
  it('RT-12a — system-state styles do NOT ship as runtime _stateStyles', () => {
    // node-emitter previously hardcoded the same 4-state list. After
    // Slice 27 it derives from SYSTEM_STATES, so visited/checked/etc.
    // styles stay in CSS only and don't bloat the bundle as
    // pseudo-runtime-states.
    const js = compile(
      `MyLink as Link: col #2271C1, toggle()\n  visited:\n    col #888\nMyLink "X"`
    )
    expect(js).not.toMatch(/_stateStyles\s*=\s*\{[^}]*visited/)
  })

  // ---------------------------------------------------------------------
  // RT-12 — emitter passes explicit stateOrder
  // ---------------------------------------------------------------------
  it('RT-12 — multi-state cycle emits explicit stateOrder (no runtime guessing)', () => {
    const js = compile(
      `Status: pad 8, toggle()\n  todo:\n    bg #333\n  doing:\n    bg #f0f\n  done:\n    bg #0f0\nStatus`
    )
    const m = js.match(/stateMachineToggle\([^,]+,\s*\[([^\]]+)\]\)/)
    expect(m, 'expected stateMachineToggle to be called with explicit stateOrder').toBeTruthy()
    const order = m![1]
    expect(order).toMatch(/['"]todo['"]/)
    expect(order).toMatch(/['"]doing['"]/)
    expect(order).toMatch(/['"]done['"]/)
  })
})
