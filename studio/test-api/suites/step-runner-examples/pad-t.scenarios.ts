/**
 * Step-Runner Example — `pad-t` (top side padding only).
 *
 * Sub-increment 3.1: only `via: 'code'` is exercised. Panel and preview
 * scenarios will be added in 3.2 / 3.3 once the corresponding writer
 * methods are implemented.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const padTViaCode: Scenario = {
  name: 'pad-t set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame pad-t 8',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'pad-t',
      value: '24',
      expect: { props: { 'node-1': { 'pad-t': '24' } } },
    },
  ],
}

export const padTScenarios: Scenario[] = [padTViaCode]
export const padTStepRunnerTests: TestCase[] = padTScenarios.map(scenarioToTestCase)
