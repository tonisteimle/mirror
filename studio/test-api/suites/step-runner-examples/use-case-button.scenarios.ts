/**
 * Step-Runner — first realistic use-case scenario.
 *
 * "Designer styles a button iteratively across all three input methods."
 * The same Button is touched through code-edits, panel changes, and
 * preview keyboard mode in sequence; after every step the runner
 * automatically validates code+dom+panel for the changed property and
 * the entire scenario fails the moment any sync drifts.
 *
 * What this scenario exercises that single-property tests don't:
 *   - Multiple properties accumulating on the same node
 *   - Switching input pathways within one session
 *   - Pre-existing properties surviving subsequent edits (regression
 *     bait for "writer overwrites neighbouring properties")
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const designerStylesButton: Scenario = {
  name: 'designer styles a button via code → panel → preview keyboard',
  category: 'step-runner',
  setup: 'Button "Click me", bg #888888, col #ffffff, pad 8, rad 4',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },

    // Step 1: change background via code edit
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'bg',
      value: '#2271c1',
      comment: 'change bg via code',
      expect: {
        props: {
          'node-1': {
            bg: '#2271c1',
            // Other props unchanged — proves writer didn't trample
            col: 'white',
            pad: '8',
            rad: '4',
          },
        },
      },
    },

    // Step 2: change padding via panel
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'pad',
      value: '16',
      comment: 'tweak pad via panel',
      expect: {
        props: {
          'node-1': { pad: '16', bg: '#2271c1', col: 'white', rad: '4' },
        },
      },
    },

    // Step 3: change radius via code
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'rad',
      value: '8',
      comment: 'soften corners via code',
      expect: {
        props: {
          'node-1': { rad: '8', pad: '16', bg: '#2271c1', col: 'white' },
        },
      },
    },

    // Step 4: bump padding to 24 via preview keyboard (P, ArrowUp, Esc)
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-1',
      property: 'pad',
      value: '24',
      comment: 'bump pad via keyboard',
      expect: {
        props: {
          'node-1': { pad: '24', rad: '8', bg: '#2271c1', col: 'white' },
        },
      },
    },
  ],
}

export const useCaseButtonScenarios: Scenario[] = [designerStylesButton]
export const useCaseButtonStepRunnerTests: TestCase[] =
  useCaseButtonScenarios.map(scenarioToTestCase)
