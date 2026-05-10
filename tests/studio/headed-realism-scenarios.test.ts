/**
 * Sanity-check the headed-realism starter scenarios.
 *
 * Pure-shape verification: the scenarios are well-formed, declare the
 * expected fields (compileMode, inputMode, snapshots, structural
 * selectors), and the gated ones are marked skip so they don't fire
 * in environments without --os-mouse / --snapshot-dir.
 *
 * Doesn't run the scenarios — that requires a real Studio bundle and
 * the CDP test runner, which is the browser-side stack.
 */

import { describe, it, expect } from 'vitest'
import { headedRealismScenarios } from '../../studio/test-api/suites/step-runner-examples/headed-realism.scenarios'

function findScenario(namePattern: RegExp) {
  const found = headedRealismScenarios.find(s => namePattern.test(s.name))
  if (!found) throw new Error(`scenario not found matching ${namePattern}`)
  return found
}

describe('headed-realism starter scenarios', () => {
  it('exports at least the seven canonical scenarios', () => {
    expect(headedRealismScenarios).toHaveLength(7)
  })

  it('Phase 3 — real-compile mode scenario sets compileMode: "real"', () => {
    const s = findScenario(/real-compile mode/)
    expect(s.compileMode).toBe('real')
  })

  it('Phase 4 — byText scenario uses structural selector, not bare id', () => {
    const s = findScenario(/byText/)
    const click = s.steps[0]
    expect(click.do).toBe('click')
    if (click.do !== 'click') return
    expect(click.nodeId).toEqual({ byText: 'Save' })
  })

  it('Phase 4 — byPath scenario uses path selector with nth', () => {
    const s = findScenario(/byPath/)
    const click = s.steps[0]
    if (click.do !== 'click') throw new Error('expected click')
    expect(click.nodeId).toEqual({ byPath: 'Frame > Button', nth: 1 })
  })

  it('Phase 5 — osDrag scenarios are gated with skip', () => {
    const click = findScenario(/OS-mouse click/)
    const drag = findScenario(/osDrag from one node/)
    expect(click.skip).toBeDefined()
    expect(drag.skip).toBeDefined()
    expect(click.inputMode).toBe('os')
    expect(drag.inputMode).toBe('os')
  })

  it('Phase 5 — osDrag step carries structural selectors and timings', () => {
    const drag = findScenario(/osDrag from one node/)
    const step = drag.steps[0]
    expect(step.do).toBe('osDrag')
    if (step.do !== 'osDrag') return
    expect(step.from).toEqual({ byId: 'node-2' })
    expect(step.to).toEqual({ byId: 'node-3' })
    expect(step.preHoldMs).toBe(100)
    expect(step.dwellMs).toBe(200)
  })

  it('Phase 7 — snapshot scenario declares dir / baselineDir / threshold', () => {
    const s = findScenario(/snapshot at every step/)
    expect(s.skip).toBeDefined()
    expect(s.snapshots?.dir).toBe('test-results/snapshots/headed-realism')
    expect(s.snapshots?.baselineDir).toBe('tests/baselines/headed-realism')
    expect(s.snapshots?.threshold).toBe(0.1)
  })

  it('combined scenario layers compile-mode + structural selector', () => {
    const s = findScenario(/real-compile \+ structural/)
    expect(s.compileMode).toBe('real')
    const click = s.steps.find(st => st.do === 'click')
    if (!click || click.do !== 'click') throw new Error('expected click step')
    expect(click.nodeId).toEqual({ byText: 'Save' })
  })

  it('every gated scenario records a reason explaining the requirement', () => {
    const gated = headedRealismScenarios.filter(s => s.skip)
    for (const s of gated) {
      expect(s.skip!.reason).toMatch(/--os-mouse|--snapshot-dir/)
    }
  })
})
