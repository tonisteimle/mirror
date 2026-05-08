/**
 * Unit tests for the data-driven step evaluator + spec mechanics in
 * `scripts/eval-functional.ts`.
 *
 * The browser-driven part (CDP, static server, Chrome launch) is
 * intentionally not unit-tested — covered by manual smoke runs via
 * the eval-pipeline. What MATTERS to lock down here:
 *
 *   - evalStep returns the right pass/fail + reason for each step type
 *   - evalSpec aggregates correctly (passed/total)
 *   - getSpec returns the project specs that exist
 *   - empty / missing / broken inputs do not throw
 */

import { describe, it, expect } from 'vitest'
import {
  evalStep,
  evalSpec,
  getSpec,
  type FuncStep,
  type PageSnapshot,
  type FuncSpec,
} from '../../scripts/eval-functional'

const emptySnap: PageSnapshot = {
  bodyText: '',
  selectorCounts: {},
  selectorAttributes: {},
}

const happySnap: PageSnapshot = {
  bodyText: 'Welcome to Hotel Check-in. Booking Details. BK-2024-78432.',
  selectorCounts: {
    'input[type="date"]': 2,
    'input[type="checkbox"]': 4,
    button: 6,
    h1: 1,
  },
  selectorAttributes: {
    'input[type="date"]': [{ value: '2024-04-12' }, { value: '2024-04-15' }],
  },
}

describe('evalStep — expectText', () => {
  it('passes when text is in body', () => {
    const r = evalStep({ type: 'expectText', text: 'Booking Details' }, happySnap)
    expect(r.passed).toBe(true)
  })

  it('fails when text is absent and includes the missing string in reason', () => {
    const r = evalStep({ type: 'expectText', text: 'Nonexistent' }, happySnap)
    expect(r.passed).toBe(false)
    expect(r.reason).toContain('Nonexistent')
  })

  it('fails on empty body', () => {
    const r = evalStep({ type: 'expectText', text: 'Anything' }, emptySnap)
    expect(r.passed).toBe(false)
  })
})

describe('evalStep — expectNoText', () => {
  it('passes when text is absent (DSL-leakage check)', () => {
    const r = evalStep({ type: 'expectNoText', text: '$accent' }, happySnap)
    expect(r.passed).toBe(true)
  })

  it('fails when forbidden text is present', () => {
    const snap = { ...happySnap, bodyText: 'oops $accent leaked into render' }
    const r = evalStep({ type: 'expectNoText', text: '$accent' }, snap)
    expect(r.passed).toBe(false)
    expect(r.reason).toContain('$accent')
  })
})

describe('evalStep — expectSelectorCount', () => {
  it('passes when count >= min', () => {
    const r = evalStep({ type: 'expectSelectorCount', selector: 'button', min: 4 }, happySnap)
    expect(r.passed).toBe(true)
  })

  it('fails when count < min and reason includes the shortfall', () => {
    const r = evalStep({ type: 'expectSelectorCount', selector: 'button', min: 10 }, happySnap)
    expect(r.passed).toBe(false)
    expect(r.reason).toContain('6')
    expect(r.reason).toContain('10')
  })

  it('respects max bound', () => {
    const r = evalStep({ type: 'expectSelectorCount', selector: 'button', max: 3 }, happySnap)
    expect(r.passed).toBe(false)
  })

  it('treats unknown selector as 0', () => {
    const r = evalStep({ type: 'expectSelectorCount', selector: 'video', min: 1 }, happySnap)
    expect(r.passed).toBe(false)
  })
})

describe('evalStep — expectSelector', () => {
  it('passes with at least one match', () => {
    expect(evalStep({ type: 'expectSelector', selector: 'h1' }, happySnap).passed).toBe(true)
  })

  it('fails with zero matches', () => {
    expect(evalStep({ type: 'expectSelector', selector: 'h2' }, happySnap).passed).toBe(false)
  })
})

describe('evalStep — expectAttribute', () => {
  it('passes when at least one element has the attribute value', () => {
    const r = evalStep(
      {
        type: 'expectAttribute',
        selector: 'input[type="date"]',
        name: 'value',
        value: '2024-04-12',
      },
      happySnap
    )
    expect(r.passed).toBe(true)
  })

  it('fails when no element has the requested value', () => {
    const r = evalStep(
      {
        type: 'expectAttribute',
        selector: 'input[type="date"]',
        name: 'value',
        value: '1999-01-01',
      },
      happySnap
    )
    expect(r.passed).toBe(false)
  })

  it('fails when selector matches nothing at all', () => {
    const r = evalStep(
      { type: 'expectAttribute', selector: 'video', name: 'src', value: 'x' },
      happySnap
    )
    expect(r.passed).toBe(false)
  })
})

describe('evalSpec', () => {
  const spec: FuncSpec = {
    project: 'demo',
    steps: [
      { name: 'has booking', step: { type: 'expectText', text: 'Booking' } },
      { name: 'no leakage', step: { type: 'expectNoText', text: '$primary' } },
      {
        name: 'four checkboxes',
        step: { type: 'expectSelectorCount', selector: 'input[type="checkbox"]', min: 4 },
      },
      { name: 'has h2', step: { type: 'expectSelector', selector: 'h2' } },
    ],
  }

  it('aggregates passes/total correctly across mixed results', () => {
    const result = evalSpec(spec, happySnap)
    expect(result.project).toBe('demo')
    expect(result.total).toBe(4)
    // Passes: "has booking" (yes), "no leakage" (yes), "four checkboxes" (yes)
    // Fails:  "has h2" (no — happySnap only has h1)
    expect(result.passed).toBe(3)
    expect(result.details[3].passed).toBe(false)
    expect(result.details[3].name).toBe('has h2')
  })

  it('every detail entry carries the original step name', () => {
    const result = evalSpec(spec, emptySnap)
    expect(result.details.map(d => d.name)).toEqual([
      'has booking',
      'no leakage',
      'four checkboxes',
      'has h2',
    ])
  })

  it('passing all steps yields passed === total', () => {
    const trivialSpec: FuncSpec = {
      project: 'trivial',
      steps: [{ name: 'always-true', step: { type: 'expectNoText', text: 'never-present' } }],
    }
    const result = evalSpec(trivialSpec, emptySnap)
    expect(result.passed).toBe(1)
    expect(result.total).toBe(1)
  })
})

describe('getSpec', () => {
  it('returns specs for the three known projects', () => {
    expect(getSpec('hotel-checkin')?.project).toBe('hotel-checkin')
    expect(getSpec('personas-informatik')?.project).toBe('personas-informatik')
    expect(getSpec('task-app')?.project).toBe('task-app')
  })

  it('returns undefined for unknown project', () => {
    expect(getSpec('nonexistent')).toBeUndefined()
  })

  it('every known spec has at least one step', () => {
    for (const project of ['hotel-checkin', 'personas-informatik', 'task-app']) {
      const spec = getSpec(project)!
      expect(spec.steps.length).toBeGreaterThan(0)
    }
  })

  it('hotel-checkin spec includes the canonical contract claims', () => {
    const spec = getSpec('hotel-checkin')!
    const stepTexts = spec.steps
      .map(s => (s.step.type === 'expectText' ? s.step.text : null))
      .filter(Boolean)
    expect(stepTexts).toContain('Booking Details')
    expect(stepTexts).toContain('BK-2024-78432')
    expect(stepTexts).toContain('Complete Check-in')
  })
})

describe('robustness — bad inputs', () => {
  it('expectText with empty target string — passes only if "" is in body', () => {
    // "" is in every string, so always pass. This is a degenerate spec
    // entry, not a runner concern.
    const r = evalStep({ type: 'expectText', text: '' }, happySnap)
    expect(r.passed).toBe(true)
  })

  it('expectSelectorCount with no min/max → effectively a no-op (any count passes)', () => {
    const r = evalStep({ type: 'expectSelectorCount', selector: 'button' }, happySnap)
    expect(r.passed).toBe(true)
  })

  it('exhaustive switch — every step type has a handler', () => {
    const allTypes: Array<FuncStep['type']> = [
      'expectText',
      'expectNoText',
      'expectSelector',
      'expectSelectorCount',
      'expectAttribute',
    ]
    for (const t of allTypes) {
      const step =
        t === 'expectText' || t === 'expectNoText'
          ? { type: t, text: 'x' }
          : t === 'expectSelector'
            ? { type: t, selector: '*' }
            : t === 'expectSelectorCount'
              ? { type: t, selector: '*', min: 0 }
              : { type: t, selector: '*', name: 'x', value: 'y' }
      // Should not throw for any step type
      const r = evalStep(step as FuncStep, emptySnap)
      expect(typeof r.passed).toBe('boolean')
    }
  })
})
