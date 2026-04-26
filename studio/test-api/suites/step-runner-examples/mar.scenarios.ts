/**
 * Step-Runner Example — `mar` (uniform margin) × all three input paths.
 *
 * Same shape as pad.scenarios but for margin. Setup wraps the test Frame
 * inside a parent Frame so the margin actually has somewhere to apply
 * (margin on the root element gets clipped against the body, which makes
 * the DOM check unreliable).
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const SETUP = 'Frame pad 0\n  Frame mar 8'

const marViaCode: Scenario = {
  name: 'mar set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-2', expect: { selection: 'node-2' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-2',
      property: 'mar',
      value: '24',
      expect: { props: { 'node-2': { mar: '24' } } },
    },
  ],
}

const marViaPanel: Scenario = {
  name: 'mar set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-2', expect: { selection: 'node-2' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-2',
      property: 'mar',
      value: '24',
      expect: { props: { 'node-2': { mar: '24' } } },
    },
  ],
}

const marViaPreview: Scenario = {
  name: 'mar set via preview keyboard is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-2', expect: { selection: 'node-2' } },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-2',
      property: 'mar',
      value: '24',
      expect: { props: { 'node-2': { mar: '24' } } },
    },
  ],
}

export const marScenarios: Scenario[] = [marViaCode, marViaPanel, marViaPreview]
export const marStepRunnerTests: TestCase[] = marScenarios.map(scenarioToTestCase)
