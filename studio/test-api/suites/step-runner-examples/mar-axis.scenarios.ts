/**
 * Step-Runner — verification scenarios for axis margin (mar-x, mar-y).
 *
 * code + panel only. Preview path is not supported (no axis shortcut
 * in spacing-keyboard-mode).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

function makeMarAxisScenarios(axis: 'x' | 'y'): Scenario[] {
  const propName = `mar-${axis}`
  const setup = `Frame pad 0\n  Frame ${propName} 8`
  return (['code', 'panel'] as const).map(via => ({
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
        expect: { props: { 'node-2': { [propName]: '24' } } },
      },
    ],
  }))
}

export const marAxisScenarios: Scenario[] = [
  ...makeMarAxisScenarios('x'),
  ...makeMarAxisScenarios('y'),
]

export const marAxisStepRunnerTests: TestCase[] = marAxisScenarios.map(scenarioToTestCase)
