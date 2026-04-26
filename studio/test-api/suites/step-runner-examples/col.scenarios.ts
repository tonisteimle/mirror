/**
 * Step-Runner — col (text color). code + panel only.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const SETUP = 'Text "Hello", col #888888'

const colViaCode: Scenario = {
  name: 'col set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'col',
      value: '#2271c1',
      expect: { props: { 'node-1': { col: '#2271c1' } } },
    },
  ],
}

const colViaPanel: Scenario = {
  name: 'col set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'col',
      value: '#2271c1',
      expect: { props: { 'node-1': { col: '#2271c1' } } },
    },
  ],
}

export const colScenarios: Scenario[] = [colViaCode, colViaPanel]
export const colStepRunnerTests: TestCase[] = colScenarios.map(scenarioToTestCase)
