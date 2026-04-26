/**
 * Step-Runner — boc (border-color) and weight (font-weight).
 *
 * boc uses the color factory; weight is a number-with-keywords property.
 * One scenario for weight asserts `'bold'` while the source / DOM use
 * the numeric form (`700`), exercising the keyword→number normaliser.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const bocViaCode: Scenario = {
  name: 'boc set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame w 100, h 100, bor 2, boc #888888',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'boc',
      value: '#2271c1',
      expect: { props: { 'node-1': { boc: '#2271c1' } } },
    },
  ],
}

const weightViaCodeNumber: Scenario = {
  name: 'weight set via code (number) is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Text "Hello", weight 400',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'weight',
      value: '700',
      expect: { props: { 'node-1': { weight: '700' } } },
    },
  ],
}

const weightViaCodeKeyword: Scenario = {
  name: 'weight set via code (number) and asserted with keyword form',
  category: 'step-runner',
  setup: 'Text "Hello", weight 400',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'weight',
      value: '700',
      // Source/DOM/panel all numeric (700); expected is the keyword "bold".
      // The reader's normalize() maps "bold" → "700", so all three match.
      expect: { props: { 'node-1': { weight: 'bold' } } },
    },
  ],
}

export const bocWeightScenarios: Scenario[] = [
  bocViaCode,
  weightViaCodeNumber,
  weightViaCodeKeyword,
]
export const bocWeightStepRunnerTests: TestCase[] = bocWeightScenarios.map(scenarioToTestCase)
