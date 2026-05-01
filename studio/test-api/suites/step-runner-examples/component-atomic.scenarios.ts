/**
 * Step-Runner — Components Phase C1: atomic definition + usage.
 *
 * Pins the simplest component story:
 *   - A definition (`Name: prop1 v1, prop2 v2`) doesn't render itself; it
 *     stores a property bundle.
 *   - A usage (`Name "Text"`) renders an element with the bundle applied.
 *   - Inline overrides on the usage replace the matching property.
 *   - Multiple usages of the same component are independent — editing
 *     one's override leaves the others unchanged.
 *
 * Asserts via `dom` (computed style) since the bundle's effect on rendered
 * geometry/color is the contract designers care about. We don't need a
 * `def` reader — the definition's correctness is proven by the rendered
 * shape of the usage.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- C1.1: Bare usage applies the definition's properties ----------------

const bareUsageAppliesProps: Scenario = {
  name: 'C1.1 Bare component usage applies the definition properties',
  category: 'step-runner',
  setup: 'Btn: pad 8, bg #2271c1, col white\nBtn "Save"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            paddingTop: '8px',
            backgroundColor: 'rgb(34, 113, 193)',
            color: 'rgb(255, 255, 255)',
          },
        },
      },
    },
  ],
}

// ----- C1.2: Inline override replaces only the matching property -----------
//
// Definition has bg #2271c1. Usage with `bg #ef4444` overrides bg, but
// `pad 8` and `col white` still apply (definition wins for properties
// not mentioned at the usage). Two instances side-by-side prove that the
// override is local.

const inlineOverrideReplacesOneProp: Scenario = {
  name: 'C1.2 Inline override replaces only the matching property',
  category: 'step-runner',
  setup: 'Btn: pad 8, bg #2271c1, col white\n' + 'Btn "Save"\n' + 'Btn "Cancel", bg #ef4444',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Default: definition's bg + col + pad applied.
          'node-1': {
            backgroundColor: 'rgb(34, 113, 193)',
            color: 'rgb(255, 255, 255)',
            paddingTop: '8px',
          },
          // Override: bg replaced, col + pad still from definition.
          'node-2': {
            backgroundColor: 'rgb(239, 68, 68)',
            color: 'rgb(255, 255, 255)',
            paddingTop: '8px',
          },
        },
      },
    },
  ],
}

// ----- C1.3: Editing one instance's override leaves siblings untouched -----
//
// Two Btn instances with different overrides. Edit node-2's bg via panel.
// node-1 (no override) must keep the definition's bg. Catches the class
// of bug where instance edits accidentally touch the definition or all
// usages.

const overrideEditIsolated: Scenario = {
  name: 'C1.3 Editing one instance bg via panel does not affect siblings',
  category: 'step-runner',
  setup: 'Btn: pad 8, bg #2271c1, col white\n' + 'Btn "Save"\n' + 'Btn "Cancel", bg #ef4444',
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        props: { 'node-2': { bg: '#ef4444' } },
      },
    },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-2',
      property: 'bg',
      value: '#10b981',
      expect: {
        // node-2 has an explicit override — `props` checks all three
        // dimensions agree. node-1's bg is *inherited* from the
        // definition; its source line has no `bg`, so code-reader
        // returns null. The `dom` assertion below pins the inherited
        // value at the rendered level.
        props: { 'node-2': { bg: '#10b981' } },
        dom: { 'node-1': { backgroundColor: 'rgb(34, 113, 193)' } },
        code: 'Btn: pad 8, bg #2271c1, col white\n' + 'Btn "Save"\n' + 'Btn "Cancel", bg #10b981',
      },
    },
  ],
}

export const componentAtomicScenarios: Scenario[] = [
  bareUsageAppliesProps,
  inlineOverrideReplacesOneProp,
  overrideEditIsolated,
]
export const componentAtomicStepRunnerTests: TestCase[] =
  componentAtomicScenarios.map(scenarioToTestCase)
