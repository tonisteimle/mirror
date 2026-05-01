/**
 * Step-Runner — Components Phase C2: inheritance via `as`.
 *
 * Mirror's `as` keyword lets a component inherit another component's
 * properties (and the underlying primitive). Tests pin three shapes:
 *   - Component `as` Primitive (Button)
 *   - Component `as` Component (variant of an existing user component)
 *   - 3-level chain (variant of a variant)
 * In every case the merged property bundle plus an instance override
 * combine in DOM-visible style.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- C2.1: Component `as Button` inherits from the primitive -------------

const componentAsPrimitive: Scenario = {
  name: 'C2.1 PrimaryBtn as Button applies bundle on top of <button>',
  category: 'step-runner',
  setup: 'PrimaryBtn as Button: bg #2271c1, col white, pad 12 24, rad 6\n' + 'PrimaryBtn "Save"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            backgroundColor: 'rgb(34, 113, 193)',
            color: 'rgb(255, 255, 255)',
            paddingTop: '12px',
            paddingLeft: '24px',
            borderTopLeftRadius: '6px',
          },
        },
      },
    },
  ],
}

// ----- C2.2: Component `as Component` — variant of a user component --------
//
// PrimaryBtn extends Btn. Btn supplies pad+rad; PrimaryBtn adds bg+col.
// Usage of PrimaryBtn renders both bundles merged.

const componentAsComponent: Scenario = {
  name: 'C2.2 PrimaryBtn as Btn merges Btn props with PrimaryBtn additions',
  category: 'step-runner',
  setup:
    'Btn: pad 10 20, rad 6, cursor pointer\n' +
    'PrimaryBtn as Btn: bg #2271c1, col white\n' +
    'PrimaryBtn "Save"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            // From Btn:
            paddingTop: '10px',
            paddingLeft: '20px',
            borderTopLeftRadius: '6px',
            cursor: 'pointer',
            // From PrimaryBtn:
            backgroundColor: 'rgb(34, 113, 193)',
            color: 'rgb(255, 255, 255)',
          },
        },
      },
    },
  ],
}

// ----- C2.3: 3-level chain — DangerBtn as PrimaryBtn as Btn ----------------
//
// Each level adds something. At the leaf, all three bundles merge:
//   Btn: pad + rad + cursor
//   PrimaryBtn: bg + col (overrides nothing)
//   DangerBtn: bg #ef4444 (overrides PrimaryBtn's bg)
// The top-level bg is what wins. col + pad + rad + cursor cascade through.

const threeLevelChain: Scenario = {
  name: 'C2.3 DangerBtn as PrimaryBtn as Btn — 3-level chain merges and overrides correctly',
  category: 'step-runner',
  setup:
    'Btn: pad 10 20, rad 6, cursor pointer\n' +
    'PrimaryBtn as Btn: bg #2271c1, col white\n' +
    'DangerBtn as PrimaryBtn: bg #ef4444\n' +
    'DangerBtn "Delete"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            paddingTop: '10px',
            paddingLeft: '20px',
            borderTopLeftRadius: '6px',
            cursor: 'pointer',
            // bg from DangerBtn (innermost wins)
            backgroundColor: 'rgb(239, 68, 68)',
            // col still inherited from PrimaryBtn (DangerBtn doesn't override it)
            color: 'rgb(255, 255, 255)',
          },
        },
      },
    },
  ],
}

export const componentInheritanceScenarios: Scenario[] = [
  componentAsPrimitive,
  componentAsComponent,
  threeLevelChain,
]
export const componentInheritanceStepRunnerTests: TestCase[] =
  componentInheritanceScenarios.map(scenarioToTestCase)
