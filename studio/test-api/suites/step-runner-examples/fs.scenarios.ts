/**
 * Step-Runner — fs (font-size). Two paths only (code + panel); no preview
 * shortcut for typography in spacing-keyboard-mode.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const SETUP = 'Text "Hello", fs 14'

const fsViaCode: Scenario = {
  name: 'fs set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'fs',
      value: '24',
      expect: { props: { 'node-1': { fs: '24' } } },
    },
  ],
}

const fsViaPanel: Scenario = {
  name: 'fs set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: SETUP,
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'fs',
      value: '24',
      expect: { props: { 'node-1': { fs: '24' } } },
    },
  ],
}

export const fsScenarios: Scenario[] = [fsViaCode, fsViaPanel]
export const fsStepRunnerTests: TestCase[] = fsScenarios.map(scenarioToTestCase)
