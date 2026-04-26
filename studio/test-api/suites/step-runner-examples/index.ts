export { padScenarios, padStepRunnerTests } from './pad.scenarios'
export { padTScenarios, padTStepRunnerTests } from './pad-t.scenarios'
export { padSidesScenarios, padSidesStepRunnerTests } from './pad-sides.scenarios'
export { padAxisScenarios, padAxisStepRunnerTests } from './pad-axis.scenarios'
export { marScenarios, marStepRunnerTests } from './mar.scenarios'
export { marSidesScenarios, marSidesStepRunnerTests } from './mar-sides.scenarios'
export { marAxisScenarios, marAxisStepRunnerTests } from './mar-axis.scenarios'
export { gapScenarios, gapStepRunnerTests } from './gap.scenarios'
export { fsScenarios, fsStepRunnerTests } from './fs.scenarios'
export { radScenarios, radStepRunnerTests } from './rad.scenarios'
export { bgScenarios, bgStepRunnerTests } from './bg.scenarios'
export { colScenarios, colStepRunnerTests } from './col.scenarios'
export { bocWeightScenarios, bocWeightStepRunnerTests } from './boc-weight.scenarios'
export { whScenarios, whStepRunnerTests } from './wh.scenarios'
export { useCaseButtonScenarios, useCaseButtonStepRunnerTests } from './use-case-button.scenarios'

import { padStepRunnerTests } from './pad.scenarios'
import { padTStepRunnerTests } from './pad-t.scenarios'
import { padSidesStepRunnerTests } from './pad-sides.scenarios'
import { padAxisStepRunnerTests } from './pad-axis.scenarios'
import { marStepRunnerTests } from './mar.scenarios'
import { marSidesStepRunnerTests } from './mar-sides.scenarios'
import { marAxisStepRunnerTests } from './mar-axis.scenarios'
import { gapStepRunnerTests } from './gap.scenarios'
import { fsStepRunnerTests } from './fs.scenarios'
import { radStepRunnerTests } from './rad.scenarios'
import { bgStepRunnerTests } from './bg.scenarios'
import { colStepRunnerTests } from './col.scenarios'
import { bocWeightStepRunnerTests } from './boc-weight.scenarios'
import { whStepRunnerTests } from './wh.scenarios'
import { useCaseButtonStepRunnerTests } from './use-case-button.scenarios'

export const allStepRunnerExampleTests = [
  ...padStepRunnerTests,
  ...padTStepRunnerTests,
  ...padSidesStepRunnerTests,
  ...padAxisStepRunnerTests,
  ...marStepRunnerTests,
  ...marSidesStepRunnerTests,
  ...marAxisStepRunnerTests,
  ...gapStepRunnerTests,
  ...fsStepRunnerTests,
  ...radStepRunnerTests,
  ...bgStepRunnerTests,
  ...colStepRunnerTests,
  ...bocWeightStepRunnerTests,
  ...whStepRunnerTests,
  ...useCaseButtonStepRunnerTests,
]
