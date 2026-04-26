export { padScenarios, padStepRunnerTests } from './pad.scenarios'
export { padTScenarios, padTStepRunnerTests } from './pad-t.scenarios'
export { padSidesScenarios, padSidesStepRunnerTests } from './pad-sides.scenarios'
export { padAxisScenarios, padAxisStepRunnerTests } from './pad-axis.scenarios'
export { marScenarios, marStepRunnerTests } from './mar.scenarios'
export { marSidesScenarios, marSidesStepRunnerTests } from './mar-sides.scenarios'

import { padStepRunnerTests } from './pad.scenarios'
import { padTStepRunnerTests } from './pad-t.scenarios'
import { padSidesStepRunnerTests } from './pad-sides.scenarios'
import { padAxisStepRunnerTests } from './pad-axis.scenarios'
import { marStepRunnerTests } from './mar.scenarios'
import { marSidesStepRunnerTests } from './mar-sides.scenarios'

export const allStepRunnerExampleTests = [
  ...padStepRunnerTests,
  ...padTStepRunnerTests,
  ...padSidesStepRunnerTests,
  ...padAxisStepRunnerTests,
  ...marStepRunnerTests,
  ...marSidesStepRunnerTests,
]
