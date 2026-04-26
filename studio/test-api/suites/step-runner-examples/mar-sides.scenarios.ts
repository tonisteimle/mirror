/**
 * Step-Runner — verification scenarios for the side factory (mar variant).
 *
 * Same shape as pad-sides.scenarios but with margin. Setup wraps the test
 * Frame in a parent so margin actually applies (root margin clips).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

function makeMarSideScenarios(
  side: 'top' | 'right' | 'bottom' | 'left',
  short: 't' | 'r' | 'b' | 'l'
): Scenario[] {
  const propName = `mar-${short}`
  const setup = `Frame pad 0\n  Frame ${propName} 8`
  return (['code', 'panel', 'preview'] as const).map(via => ({
    name: `${propName} set via ${via} is consistent across code+dom+panel`,
    category: 'step-runner',
    setup,
    steps: [
      { do: 'select', nodeId: 'node-2', expect: { selection: 'node-2' } },
      {
        do: 'setProperty',
        via,
        target: 'node-2',
        property: propName,
        value: '24',
        comment: `${side} via ${via}`,
        expect: { props: { 'node-2': { [propName]: '24' } } },
      },
    ],
  }))
}

export const marSidesScenarios: Scenario[] = [
  ...makeMarSideScenarios('top', 't'),
  ...makeMarSideScenarios('right', 'r'),
  ...makeMarSideScenarios('bottom', 'b'),
  ...makeMarSideScenarios('left', 'l'),
]

export const marSidesStepRunnerTests: TestCase[] = marSidesScenarios.map(scenarioToTestCase)
