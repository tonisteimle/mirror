/**
 * Step-Runner — rad (border-radius). code + panel only.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const SETUP = 'Frame w 100, h 100, bg #2271C1, rad 4'

const radViaCode: Scenario = {
  name: 'rad set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'rad',
      value: '24',
      expect: { props: { 'node-1': { rad: '24' } } },
    },
  ],
}

const radViaPanel: Scenario = {
  name: 'rad set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'rad',
      value: '24',
      expect: { props: { 'node-1': { rad: '24' } } },
    },
  ],
}

export const radScenarios: Scenario[] = [radViaCode, radViaPanel]
export const radStepRunnerTests: TestCase[] = radScenarios.map(scenarioToTestCase)
