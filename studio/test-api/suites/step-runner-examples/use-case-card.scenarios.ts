/**
 * Step-Runner — use-case scenario using fragments.
 *
 * "Designer styles a card-like Frame with three properties at once."
 * Uses the styleViaPanel fragment, which:
 *   1. Selects the node
 *   2. Sets each property via panel one by one (per-step sync check)
 *   3. Asserts the full bundle together (regression bait for trampling)
 *
 * Without the fragment this scenario would be ~30 lines of repeated
 * select/setProperty/expect. With the fragment it's two lines of
 * intent: "style node-1 with these properties".
 */

import type { TestCase } from '../../types'
import { scenarioToTestCase, styleViaPanel, type Scenario } from '../../step-runner'

const designerStylesCard: Scenario = {
  name: 'designer styles a card-like Frame using styleViaPanel fragment',
  category: 'step-runner',
  setup: 'Frame w 200, h 200, bg #888888',
  steps: [
    ...styleViaPanel('node-1', {
      bg: '#2271c1',
      pad: '24',
      rad: '12',
    }),
  ],
}

export const useCaseCardScenarios: Scenario[] = [designerStylesCard]
export const useCaseCardStepRunnerTests: TestCase[] = useCaseCardScenarios.map(scenarioToTestCase)
