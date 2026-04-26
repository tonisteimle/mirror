/**
 * Step-Runner — bg (background-color). code + panel only (no preview shortcut).
 *
 * Two scenarios use different value forms in the assertion to verify the
 * color normaliser: one uses hex (`#2271c1`), one uses a named color
 * (`white`). Both should match the rendered DOM (always `rgb(...)`)
 * after canonicalisation.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const bgViaCodeHex: Scenario = {
  name: 'bg set via code (hex) is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame w 100, h 100, bg #888888',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'bg',
      value: '#2271c1',
      expect: { props: { 'node-1': { bg: '#2271c1' } } },
    },
  ],
}

const bgViaCodeNamed: Scenario = {
  name: 'bg set via code (hex) and asserted with named color form',
  category: 'step-runner',
  setup: 'Frame w 100, h 100, bg #888888',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'code',
      target: 'node-1',
      property: 'bg',
      value: '#ffffff',
      // Asserting `'white'` here exercises the color normaliser end-to-end:
      // expected `'white'` ↔ DOM `rgb(255, 255, 255)` ↔ source `#ffffff`
      // all canonicalise to `#ffffff`.
      expect: { props: { 'node-1': { bg: 'white' } } },
    },
  ],
}

const bgViaPanel: Scenario = {
  name: 'bg set via panel is consistent across code+dom+panel',
  category: 'step-runner',
  setup: 'Frame w 100, h 100, bg #888888',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      do: 'setProperty',
      via: 'panel',
      target: 'node-1',
      property: 'bg',
      value: '#2271c1',
      expect: { props: { 'node-1': { bg: '#2271c1' } } },
    },
  ],
}

export const bgScenarios: Scenario[] = [bgViaCodeHex, bgViaCodeNamed, bgViaPanel]
export const bgStepRunnerTests: TestCase[] = bgScenarios.map(scenarioToTestCase)
