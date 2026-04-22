/**
 * Primitives Test Suite Index
 */

import type { TestCase } from '../../types'

export { basicPrimitives } from './basic.test'
export { semanticPrimitives } from './semantic.test'
export { headingPrimitives } from './headings.test'
export { primitiveDefaultsTests, buttonMinWidthTests } from './defaults.test'
export { tablePrimitives } from './table.test'
export { inputMaskTests } from './input-mask.test'
export { devicePresetsTests } from './device-presets.test'

import { basicPrimitives } from './basic.test'
import { semanticPrimitives } from './semantic.test'
import { headingPrimitives } from './headings.test'
import { primitiveDefaultsTests, buttonMinWidthTests } from './defaults.test'
import { tablePrimitives } from './table.test'
import { inputMaskTests } from './input-mask.test'
import { devicePresetsTests } from './device-presets.test'

export const allPrimitivesTests: TestCase[] = [
  ...basicPrimitives,
  ...semanticPrimitives,
  ...headingPrimitives,
  ...primitiveDefaultsTests,
  ...tablePrimitives,
  ...inputMaskTests,
  ...devicePresetsTests,
]
