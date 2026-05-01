/**
 * Property Robustness Tests
 *
 * Robust handling of various property arrangements: comma format, auto-separation,
 * multi-value, aliases, order independence, mixed formats, edge cases,
 * sequential modifications, preview sync.
 */

import type { TestCase } from '../../test-runner'

export { commaFormatTests } from './comma-format.test'
export { autoSeparationTests } from './auto-separation.test'
export { multiValueTests } from './multi-value.test'
export { aliasTests } from './aliases.test'
export { orderTests } from './order.test'
export { mixedFormatTests } from './mixed-format.test'
export { edgeCaseTests } from './edge-cases.test'
export { sequentialModTests } from './sequential-mods.test'
export { previewSyncTests } from './preview-sync.test'

import { commaFormatTests } from './comma-format.test'
import { autoSeparationTests } from './auto-separation.test'
import { multiValueTests } from './multi-value.test'
import { aliasTests } from './aliases.test'
import { orderTests } from './order.test'
import { mixedFormatTests } from './mixed-format.test'
import { edgeCaseTests } from './edge-cases.test'
import { sequentialModTests } from './sequential-mods.test'
import { previewSyncTests } from './preview-sync.test'

export const allPropertyRobustnessTests: TestCase[] = [
  ...commaFormatTests,
  ...autoSeparationTests,
  ...multiValueTests,
  ...aliasTests,
  ...orderTests,
  ...mixedFormatTests,
  ...edgeCaseTests,
  ...sequentialModTests,
  ...previewSyncTests,
]
