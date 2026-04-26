/**
 * Step-Runner — gap (flex/grid gap between children).
 *
 * Setup uses a horizontal Frame with two children so the gap actually
 * applies (gap on a leaf with no children is rendered but invisible).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const SETUP = 'Frame hor, gap 8\n  Text "A"\n  Text "B"'

const gapViaCode: Scenario = {
  name: 'gap set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'gap',
      value: '24',
      expect: { props: { 'node-1': { gap: '24' } } },
    },
  ],
}

const gapViaPanel: Scenario = {
  name: 'gap set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'gap',
      value: '24',
      expect: { props: { 'node-1': { gap: '24' } } },
    },
  ],
}

const gapViaPreview: Scenario = {
  name: 'gap set via preview keyboard is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-1',
      property: 'gap',
      value: '24',
      expect: { props: { 'node-1': { gap: '24' } } },
    },
  ],
}

export const gapScenarios: Scenario[] = [gapViaCode, gapViaPanel, gapViaPreview]
export const gapStepRunnerTests: TestCase[] = gapScenarios.map(scenarioToTestCase)
