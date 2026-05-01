/**
 * Charts Test Suite Index
 */

import type { TestCase } from '../../test-runner'
import { dataFileTests } from './data-files.test'
import { basicChartTests } from './basic-rendering.test'
import { chartStylingTests } from './styling.test'
import { chartLayoutTests } from './in-layout.test'
import { chartDataTests } from './data-formats.test'

export { dataFileTests, basicChartTests, chartStylingTests, chartLayoutTests, chartDataTests }

export const allChartTests: TestCase[] = [
  ...dataFileTests,
  ...basicChartTests,
  ...chartStylingTests,
  ...chartLayoutTests,
  ...chartDataTests,
]
