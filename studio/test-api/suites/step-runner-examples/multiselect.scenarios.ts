/**
 * Step-Runner — multi-select action.
 *
 * The user clicks the first element, shift-clicks the rest, then triggers
 * a group operation (Cmd+G). Validates the multi-selection state mid-flow
 * and the resulting source code structure after grouping.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const multiSelectAndGroup: Scenario = {
  name: 'multi-select two siblings then group via Cmd+G',
  category: 'step-runner',
  setup:
    'Frame ver, gap 8\n' + //
    '  Text "A"\n' +
    '  Text "B"\n' +
    '  Text "C"',
  steps: [
    {
      do: 'multiSelect',
      nodeIds: ['node-2', 'node-3'],
      expect: { multiSelection: ['node-2', 'node-3'] },
    },
    {
      do: 'pressKey',
      key: 'g',
      meta: true,
      comment: 'Cmd+G to group selected siblings',
      expect: {
        // Mirror's group action wraps in a Box (the ungrouped/anonymous
        // container). The selected siblings A and B end up indented one
        // level deeper than C.
        codeMatches: /Box[^\n]*\n\s+Text "A"\n\s+Text "B"\n\s+Text "C"/,
      },
    },
  ],
}

export const multiSelectScenarios: Scenario[] = [multiSelectAndGroup]
export const multiSelectStepRunnerTests: TestCase[] = multiSelectScenarios.map(scenarioToTestCase)
