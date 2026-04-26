/**
 * Step-Runner — w (width) and h (height), number form only.
 *
 * Keyword forms (`w full`, `h hug`) are not yet supported by the
 * factory — see w.ts / h.ts for the rationale.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const SETUP = 'Frame w 100, h 100, bg #2271c1'

const wViaCode: Scenario = {
  name: 'w set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'w',
      value: '240',
      expect: { props: { 'node-1': { w: '240' } } },
    },
  ],
}

const wViaPanel: Scenario = {
  name: 'w set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'w',
      value: '240',
      expect: { props: { 'node-1': { w: '240' } } },
    },
  ],
}

const hViaCode: Scenario = {
  name: 'h set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'h',
      value: '160',
      expect: { props: { 'node-1': { h: '160' } } },
    },
  ],
}

const hViaPanel: Scenario = {
  name: 'h set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'h',
      value: '160',
      expect: { props: { 'node-1': { h: '160' } } },
    },
  ],
}

export const whScenarios: Scenario[] = [wViaCode, wViaPanel, hViaCode, hViaPanel]
export const whStepRunnerTests: TestCase[] = whScenarios.map(scenarioToTestCase)
