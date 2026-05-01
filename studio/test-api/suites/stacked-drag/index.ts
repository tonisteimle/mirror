/**
 * Stacked/Absolute Drag & Drop Tests — drops with x/y positioning.
 */

import type { TestCase } from '../../types'

export { basicStackedTests } from './basic.test'
export { edgeCaseTests } from './edge-cases.test'
export { layoutDetectionTests } from './layout-detection.test'
export { precisePositionTests } from './precise-position.test'
export { stackedWithStatesTests } from './with-states.test'
export { appStackedTests } from './app-stacked.test'
export { inputTextareaButtonTests } from './input-textarea-button.test'
export { linkImageIconTests } from './link-image-icon.test'
export { dividerSpacerStackedTests } from './divider-spacer.test'
export { zagStackedTests } from './zag-stacked.test'
export { complexStackedMixedTests } from './complex-mixed.test'
export { positionPrecisionMixedTests } from './position-precision-mixed.test'
export { nestedStackedTests } from './nested.test'
export { stackedPreservePositionsTests } from './preserve-positions.test'
export { appStackedMixedTests } from './app-stacked-mixed.test'

import { basicStackedTests } from './basic.test'
import { edgeCaseTests } from './edge-cases.test'
import { layoutDetectionTests } from './layout-detection.test'
import { precisePositionTests } from './precise-position.test'
import { stackedWithStatesTests } from './with-states.test'
import { appStackedTests } from './app-stacked.test'
import { inputTextareaButtonTests } from './input-textarea-button.test'
import { linkImageIconTests } from './link-image-icon.test'
import { dividerSpacerStackedTests } from './divider-spacer.test'
import { zagStackedTests } from './zag-stacked.test'
import { complexStackedMixedTests } from './complex-mixed.test'
import { positionPrecisionMixedTests } from './position-precision-mixed.test'
import { nestedStackedTests } from './nested.test'
import { stackedPreservePositionsTests } from './preserve-positions.test'
import { appStackedMixedTests } from './app-stacked-mixed.test'

export const allStackedDragTests: TestCase[] = [
  ...basicStackedTests,
  ...edgeCaseTests,
  ...layoutDetectionTests,
  ...precisePositionTests,
  ...stackedWithStatesTests,
  ...appStackedTests,
  ...inputTextareaButtonTests,
  ...linkImageIconTests,
  ...dividerSpacerStackedTests,
  ...zagStackedTests,
  ...complexStackedMixedTests,
  ...positionPrecisionMixedTests,
  ...nestedStackedTests,
  ...stackedPreservePositionsTests,
  ...appStackedMixedTests,
]

export default allStackedDragTests
