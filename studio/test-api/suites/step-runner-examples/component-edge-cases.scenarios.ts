/**
 * Step-Runner — Components Phase C5: edge cases.
 *
 *   - Adding a property at usage that's not in the definition (additive)
 *   - Override using a token reference instead of a literal
 *   - Components composed inside another component
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- C5.1: Additive override — usage adds a property not in definition ---

const additiveOverride: Scenario = {
  name: 'C5.1 Usage adds a property not in the definition (additive override)',
  category: 'step-runner',
  setup: 'Btn: pad 8, bg #2271c1, col white\n' + 'Btn "Save", mar 12',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            // From definition:
            paddingTop: '8px',
            backgroundColor: 'rgb(34, 113, 193)',
            // From usage (not in definition):
            marginTop: '12px',
            marginLeft: '12px',
          },
        },
      },
    },
  ],
}

// ----- C5.2: Token reference as override value ----------------------------
//
// Definition has a literal `bg #2271c1`. Usage overrides bg with a
// token `$danger`. The token is defined in tokens.tok. Both files
// resolve correctly: the rendered bg is the token's value.

const tokenAsOverride: Scenario = {
  name: 'C5.2 Token reference as inline override resolves at the usage site',
  category: 'step-runner',
  setup: {
    entry: 'app.mir',
    files: {
      'tokens.tok': 'danger.bg: #ef4444',
      'components.com': 'Btn: pad 8, bg #2271c1, col white',
      'app.mir': 'Btn "Save"\nBtn "Delete", bg $danger',
    },
  },
  steps: [
    {
      do: 'select',
      nodeId: 'node-2',
      expect: {
        selection: 'node-2',
        dom: {
          // node-1 keeps the definition's literal bg
          'node-1': { backgroundColor: 'rgb(34, 113, 193)' },
          // node-2's $danger override resolves to #ef4444
          'node-2': { backgroundColor: 'rgb(239, 68, 68)' },
        },
      },
    },
  ],
}

// ----- C5.3: Component composition — Btn used inside Card body slot --------
//
// Card has a slot for arbitrary content (here: Body). The user fills
// it with a Btn instance. Both component bundles must apply at their
// respective levels.

const componentComposition: Scenario = {
  name: 'C5.3 Btn instance inside a Card body slot — both bundles render correctly',
  category: 'step-runner',
  setup:
    'Btn: pad 8, bg #2271c1, col white\n' +
    'Card: bg #1a1a1a, pad 16, gap 8, rad 8\n' +
    '  Title: col white, fs 16, weight 500\n' +
    'Card\n' +
    '  Title "Confirm"\n' +
    '  Btn "OK"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          // Card root: definition's bundle
          'node-1': {
            backgroundColor: 'rgb(26, 26, 26)',
            paddingTop: '16px',
            rowGap: '8px',
          },
          // Title slot (inside Card)
          'node-2': {
            color: 'rgb(255, 255, 255)',
            fontSize: '16px',
          },
          // Btn (composed inside Card body)
          'node-3': {
            paddingTop: '8px',
            backgroundColor: 'rgb(34, 113, 193)',
            color: 'rgb(255, 255, 255)',
          },
        },
      },
    },
  ],
}

export const componentEdgeCasesScenarios: Scenario[] = [
  additiveOverride,
  tokenAsOverride,
  componentComposition,
]
export const componentEdgeCasesStepRunnerTests: TestCase[] =
  componentEdgeCasesScenarios.map(scenarioToTestCase)
