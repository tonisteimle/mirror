/**
 * Step-Runner — Layout Phase 4: pad / mar / gap inside a flex container.
 *
 * Atomic per-property tests already exist in pad/mar/gap.scenarios.ts
 * (3-dim sync check via reader). This phase covers the *interaction*:
 * does pad coexist with gap, does mar on one child stay isolated to that
 * child, etc. — failures here typically come from IR transforms stepping
 * on each other, not from individual readers.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

// ----- L4.1: pad + gap coexist on the same parent ---------------------------

const padAndGapCoexist: Scenario = {
  name: 'L4.1 pad and gap on the same hor parent both apply',
  category: 'step-runner',
  setup:
    'Frame hor, pad 16, gap 12, w 200, h 50\n' +
    '  Frame w 50, h 50, bg #ef4444\n' +
    '  Frame w 50, h 50, bg #2271c1',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: {
        selection: 'node-1',
        dom: {
          'node-1': {
            paddingTop: '16px',
            paddingRight: '16px',
            paddingBottom: '16px',
            paddingLeft: '16px',
            columnGap: '12px',
          },
        },
      },
    },
  ],
}

// ----- L4.2: mar on a single child stays isolated to that child -------------
//
// Three siblings; only the middle one has `mar 8`. Computed margin on
// node-3 is 8px on all sides; node-2 and node-4 stay at zero. This
// catches IR bugs where a property on one element leaks to siblings.

const marIsolatedToOneChild: Scenario = {
  name: 'L4.2 mar on the middle child does not leak to siblings',
  category: 'step-runner',
  setup:
    'Frame hor, w 300, h 50\n' +
    '  Frame w 50, h 50, bg #ef4444\n' +
    '  Frame mar 8, w 50, h 50, bg #2271c1\n' +
    '  Frame w 50, h 50, bg #10b981',
  steps: [
    {
      do: 'select',
      nodeId: 'node-3',
      expect: {
        selection: 'node-3',
        dom: {
          'node-2': {
            marginTop: '0px',
            marginRight: '0px',
            marginBottom: '0px',
            marginLeft: '0px',
          },
          'node-3': {
            marginTop: '8px',
            marginRight: '8px',
            marginBottom: '8px',
            marginLeft: '8px',
          },
          'node-4': {
            marginTop: '0px',
            marginRight: '0px',
            marginBottom: '0px',
            marginLeft: '0px',
          },
        },
      },
    },
  ],
}

export const layoutSpacingScenarios: Scenario[] = [padAndGapCoexist, marIsolatedToOneChild]
export const layoutSpacingStepRunnerTests: TestCase[] =
  layoutSpacingScenarios.map(scenarioToTestCase)
