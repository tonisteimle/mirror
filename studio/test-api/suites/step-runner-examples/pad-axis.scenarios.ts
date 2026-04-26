/**
 * Step-Runner — verification scenarios for axis padding (pad-x, pad-y).
 *
 * Two paths only: code + panel. The preview path is intentionally not
 * supported for axis padding (the spacing-keyboard-mode has no axis
 * shortcut yet — only individual sides). The writer throws with a clear
 * message if a test sets `via: 'preview'` here.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

function makeAxisScenarios(axis: 'x' | 'y'): Scenario[] {
  const propName = `pad-${axis}`
  const setup = `Frame ${propName} 8`
  return (['code', 'panel'] as const).map(via => ({
    name: `${propName} set via ${via} is consistent across code+dom+panel`,
    category: 'step-runner',
    setup,
    steps: [
      { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
      {
        do: 'setProperty',
        via,
        target: 'node-1',
        property: propName,
        value: '24',
        expect: { props: { 'node-1': { [propName]: '24' } } },
      },
    ],
  }))
}

export const padAxisScenarios: Scenario[] = [...makeAxisScenarios('x'), ...makeAxisScenarios('y')]

export const padAxisStepRunnerTests: TestCase[] = padAxisScenarios.map(scenarioToTestCase)
