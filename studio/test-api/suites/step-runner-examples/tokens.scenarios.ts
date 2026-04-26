/**
 * Step-Runner — token resolution for color properties.
 *
 * The most common Mirror form Designer write is `bg $primary` rather than
 * raw `bg #2271c1`. Until this scenario the framework couldn't validate
 * such code at all. With the token resolver wired into the color factory:
 *
 *   - source: `Frame bg $primary` (plus root token def `primary.bg: #2271c1`)
 *   - DOM:    rgb(34, 113, 193)
 *   - panel:  $primary or #2271c1
 *
 * All three normalise to `#2271c1`. The expected value `#2271c1` (or
 * `'$primary'` after resolution) matches.
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, type Scenario } from '../../step-runner'

const bgWithToken: Scenario = {
  name: 'bg with token reference resolves consistently across code+dom+panel',
  category: 'step-runner',
  setup: 'primary.bg: #2271c1\n\nFrame w 100, h 100, bg $primary',
  steps: [
    { do: 'select', nodeId: 'node-1', expect: { selection: 'node-1' } },
    {
      // No action — we just want to validate the existing source.
      // Wait scenario: the readers should already resolve `$primary` to
      // `#2271c1` and match the rendered DOM.
      do: 'wait',
      ms: 50,
      expect: {
        props: { 'node-1': { bg: '#2271c1' } },
      },
    },
  ],
}

export const tokensScenarios: Scenario[] = [bgWithToken]
export const tokensStepRunnerTests: TestCase[] = tokensScenarios.map(scenarioToTestCase)
