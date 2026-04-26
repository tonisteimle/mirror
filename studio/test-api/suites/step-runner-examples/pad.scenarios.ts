/**
 * Step-Runner Example — `pad` property × all three input paths.
 *
 * The same semantic test, written three times with only `via` swapped:
 *   1. via 'code'    — edit the source directly
 *   2. via 'panel'   — drive the Property Panel input
 *   3. via 'preview' — keyboard direct-manipulation in the preview canvas
 *
 * The assertion is identical in all three:
 *     expect.props: { 'node-1': { pad: '24' } }
 *
 * One declaration, three readout dimensions checked, three input paths
 * exercised — sync drift is impossible to hide.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const padViaCode: Scenario = {
  name: 'pad set via code is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame pad 8',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'pad',
      value: '24',
      expect: { props: { 'node-1': { pad: '24' } } },
    },
  ],
}

const padViaPanel: Scenario = {
  name: 'pad set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame pad 8',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'pad',
      value: '24',
      expect: { props: { 'node-1': { pad: '24' } } },
    },
  ],
}

const padViaPreview: Scenario = {
  name: 'pad set via preview keyboard is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame pad 8',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-1',
      property: 'pad',
      value: '24',
      expect: { props: { 'node-1': { pad: '24' } } },
    },
  ],
}

/**
 * Round-trip: change pad via each path in sequence, asserting the full
 * property triple after every step. If any path breaks the sync, the
 * exact step that drifted is named in the failure.
 */
const padRoundTrip: Scenario = {
  name: 'pad round-trip via all three input paths stays in sync',
  category: 'step-runner',
  setup: 'Frame pad 8',
  steps: [
    { do: 'select', nodeId: 'node-1' },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'pad',
      value: '16',
      comment: 'first via code',
      expect: { props: { 'node-1': { pad: '16' } } },
    },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'pad',
      value: '32',
      comment: 'then via panel',
      expect: { props: { 'node-1': { pad: '32' } } },
    },
    {
      do: 'setProperty',
      via: 'preview',
      target: 'node-1',
      property: 'pad',
      value: '24',
      comment: 'finally via preview',
      expect: { props: { 'node-1': { pad: '24' } } },
    },
  ],
}

export const padScenarios: Scenario[] = [padViaCode, padViaPanel, padViaPreview, padRoundTrip]
export const padStepRunnerTests: TestCase[] = padScenarios.map(scenarioToTestCase)
