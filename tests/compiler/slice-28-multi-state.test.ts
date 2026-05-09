// @vitest-environment jsdom
/**
 * Slice 28 — Multi-State-Cycle regression suite.
 *
 * Audit: `docs/refactoring/10-slice-28-multi-state-cycle.md`. Slice 27's
 * helper covered the compile pipeline; the Slice 28 audit pinned that
 * coverage with end-to-end probes (cycle order, wrap, mid-cycle initial,
 * each-loop) and uncovered residual Studio-Sync drift for both built-in
 * custom states and author-invented multi-state cycle names.
 *
 * RT-1..RT-8 cover compile + runtime; RT-9..RT-12 live in the studio
 * sync test file (`tests/studio/sync-system-states.test.ts`) since they
 * touch the same module and share the schema-drift guard.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { toIR } from '../../compiler/ir'
import { stateMachineToggle } from '../../compiler/runtime/state-machine'

function compile(src: string): string {
  return generateDOM(parse(src))
}
function ir(src: string) {
  return toIR(parse(src))
}

describe('Slice 28 — Multi-State-Cycle', () => {
  // -------------------------------------------------------------------
  // RT-1 — basic 3-state cycle, IR + emit
  // -------------------------------------------------------------------
  it('RT-1 — 3-state cycle (todo → doing → done): IR + emit explicit order', () => {
    const src = [
      `Status: pad 8, toggle()`,
      `  todo:`,
      `    bg #333`,
      `  doing:`,
      `    bg #f0f`,
      `  done:`,
      `    bg #0f0`,
      `Status`,
    ].join('\n')
    const r = ir(src)
    const node = r.nodes[0]
    expect(Object.keys(node?.stateMachine?.states ?? {})).toEqual(
      expect.arrayContaining(['todo', 'doing', 'done'])
    )
    const js = compile(src)
    const m = js.match(/stateMachineToggle\([^,]+,\s*\[([^\]]+)\]\)/)
    expect(m).toBeTruthy()
    expect(m![1]).toBe(`'todo', 'doing', 'done'`)
  })

  // -------------------------------------------------------------------
  // RT-2 — DSL source order (not alphabetical)
  // -------------------------------------------------------------------
  it('RT-2 — cycle preserves DSL source order, not alphabetical', () => {
    const src = [
      `Status: toggle()`,
      `  zeta: bg #111`,
      `  alpha: bg #222`,
      `  mike: bg #333`,
      `Status`,
    ].join('\n')
    const js = compile(src)
    const m = js.match(/stateMachineToggle\([^,]+,\s*\[([^\]]+)\]\)/)
    expect(m![1]).toBe(`'zeta', 'alpha', 'mike'`)
  })

  // -------------------------------------------------------------------
  // RT-3 — runtime wrap: last → first
  // -------------------------------------------------------------------
  it('RT-3 — cycle wraps last to first', () => {
    const el = document.createElement('div') as HTMLElement & {
      _stateMachine?: any
      _baseStyles?: any
    }
    el._stateMachine = {
      current: 'done',
      initial: 'todo',
      states: {
        default: { name: 'default', styles: {} },
        todo: { name: 'todo', styles: {} },
        doing: { name: 'doing', styles: {} },
        done: { name: 'done', styles: {} },
      },
      transitions: [],
    }
    el._baseStyles = {}
    stateMachineToggle(el, ['todo', 'doing', 'done'])
    expect(el._stateMachine!.current).toBe('todo')
  })

  // -------------------------------------------------------------------
  // RT-4 — 2-state cycle uses multi-state path, not binary
  // -------------------------------------------------------------------
  it('RT-4 — 2-state cycle goes via stateMachineToggle, not binary if/else', () => {
    const src = [`Status: toggle()`, `  todo: bg #333`, `  done: bg #0f0`, `Status`].join('\n')
    const js = compile(src)
    expect(js).toMatch(/stateMachineToggle\([^,]+,\s*\['todo',\s*'done'\]\)/)
    // Inline if/else with literal 'todo'/'done' would be the binary path.
    expect(js).not.toMatch(/if\s*\(\s*current\s*===\s*['"]todo['"]\s*\)\s*\{/)
  })

  // -------------------------------------------------------------------
  // RT-5 — initial state mid-cycle
  // -------------------------------------------------------------------
  it('RT-5 — instance with `, doing` starts mid-cycle in doing', () => {
    const src = [
      `Status: toggle()`,
      `  todo: bg #333`,
      `  doing: bg #f0f`,
      `  done: bg #0f0`,
      `Status, doing`,
    ].join('\n')
    const js = compile(src)
    expect(js).toMatch(/_stateMachine\s*=\s*\{[^}]*current:\s*['"]doing['"]/)
  })

  // -------------------------------------------------------------------
  // RT-6 — system-state in body: helper guard (Slice 27 carry-over)
  // -------------------------------------------------------------------
  it('RT-6 — `visited:` body does NOT enter the cycle', () => {
    const src = [
      `Status as Link: toggle()`,
      `  todo: bg #333`,
      `  doing: bg #f0f`,
      `  done: bg #0f0`,
      `  visited: col #888`,
      `Status`,
    ].join('\n')
    const js = compile(src)
    const m = js.match(/stateMachineToggle\([^,]+,\s*\[([^\]]+)\]\)/)
    expect(m![1]).not.toMatch(/['"]visited['"]/)
    expect(m![1]).toBe(`'todo', 'doing', 'done'`)
  })

  // -------------------------------------------------------------------
  // RT-7 — cycle in each-loop
  // -------------------------------------------------------------------
  it('RT-7 — cycle in each-loop emits explicit stateOrder per template', () => {
    const src = [
      `tasks:`,
      `  - "design"`,
      `  - "build"`,
      `  - "test"`,
      `Status: toggle()`,
      `  todo: bg #333`,
      `  doing: bg #f0f`,
      `  done: bg #0f0`,
      `each t in $tasks`,
      `  Status t`,
    ].join('\n')
    const js = compile(src)
    expect(js).toMatch(/stateMachineToggle\([^,]+,\s*\['todo',\s*'doing',\s*'done'\]\)/)
  })

  // -------------------------------------------------------------------
  // RT-8 — state-children swap
  // -------------------------------------------------------------------
  it('RT-8 — each state ships its own children factory', () => {
    const src = [
      `LikeBtn: hor, gap 8, toggle()`,
      `  Icon "heart", ic #888`,
      `  Text "Like"`,
      `  on:`,
      `    Icon "heart", ic #f00, fill`,
      `    Text "Liked!"`,
      `LikeBtn`,
    ].join('\n')
    const js = compile(src)
    // Each state with children produces a `children: () => { ... }` factory
    // that pushes _stateChildren entries. Both default and `on` states
    // should have their own factory.
    const factoryCount = (js.match(/children:\s*\(\)\s*=>\s*\{/g) ?? []).length
    expect(factoryCount).toBeGreaterThanOrEqual(2)
  })
})
