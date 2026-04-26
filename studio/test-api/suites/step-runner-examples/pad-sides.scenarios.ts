/**
 * Step-Runner — verification scenarios for the side factory.
 *
 * Each side (right/bottom/left) gets one scenario per input path. If the
 * factory is sound, all 9 scenarios pass with no per-side adjustments.
 * If a scenario fails, the factory has a side-specific bug that pad-t
 * (which uses the same factory) hid.
 *
 * Sides covered: right (Option+ArrowRight), bottom (Option+ArrowDown),
 * left (Option+ArrowLeft). Top is covered by pad-t.scenarios.ts which
 * also delegates to the factory.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

function makeSideScenarios(side: 'right' | 'bottom' | 'left', short: 'r' | 'b' | 'l'): Scenario[] {
  const propName = `pad-${short}`
  const setup = `Frame ${propName} 8`
  const sideLabel = side
  return (['code', 'panel', 'preview'] as const).map(via => ({
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
        comment: `${sideLabel} via ${via}`,
        expect: { props: { 'node-1': { [propName]: '24' } } },
      },
    ],
  }))
}

export const padSidesScenarios: Scenario[] = [
  ...makeSideScenarios('right', 'r'),
  ...makeSideScenarios('bottom', 'b'),
  ...makeSideScenarios('left', 'l'),
]

export const padSidesStepRunnerTests: TestCase[] = padSidesScenarios.map(scenarioToTestCase)
