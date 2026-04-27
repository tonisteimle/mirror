/**
 * Step-Runner — build a button from a bare element using actions + fragments.
 *
 * Starts from `Button "Click me"` (the smallest reasonable starting
 * point — going from totally empty would also exercise top-level
 * insertion which has its own complications). Then:
 *   1. Rename the label via editText
 *   2. Style with bg + col + pad + rad in one fragment call
 *   3. Verify the final state across code+dom+panel
 *
 * Demonstrates: editText action + styleViaPanel fragment + final
 * cumulative assertion. Three lines of intent expand to ~10 step
 * objects, each with its own per-step sync validation.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, styleViaPanel, type Scenario } from '../../step-runner'

const buildSubmitButton: Scenario = {
  name: 'build a styled "Submit" button from bare Button',
  category: 'step-runner',
  setup: 'Button "Click me"',
  steps: [
    {
      do: 'select',
      nodeId: 'node-1',
      expect: { selection: 'node-1' },
    },
    {
      do: 'editText',
      target: 'node-1',
      text: 'Submit',
      expect: { props: { 'node-1': { text: 'Submit' } } },
    },
    ...styleViaPanel('node-1', {
      bg: '#2271c1',
      col: '#ffffff',
      pad: '12',
      rad: '8',
    }),
    // Final: the full state survived. (styleViaPanel asserts each prop
    // individually + the full bundle at the end, but adding an outer
    // assertion makes the intent explicit at the scenario level.)
    {
      do: 'wait',
      ms: 50,
      comment: 'final state — text + 4 style props all in sync',
      expect: {
        props: {
          'node-1': {
            text: 'Submit',
            bg: '#2271c1',
            col: '#ffffff',
            pad: '12',
            rad: '8',
          },
        },
      },
    },
  ],
}

export const useCaseBuildButtonScenarios: Scenario[] = [buildSubmitButton]
export const useCaseBuildButtonStepRunnerTests: TestCase[] =
  useCaseBuildButtonScenarios.map(scenarioToTestCase)
