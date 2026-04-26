export { padScenarios, padStepRunnerTests } from './pad.scenarios'
export { padTScenarios, padTStepRunnerTests } from './pad-t.scenarios'

import { padStepRunnerTests } from './pad.scenarios'
import { padTStepRunnerTests } from './pad-t.scenarios'

export const allStepRunnerExampleTests = [...padStepRunnerTests, ...padTStepRunnerTests]
