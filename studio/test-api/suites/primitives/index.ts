/**
 * Primitives Test Suite Index
 */

import type { TestCase } from '../../types'

export { basicPrimitives } from './basic.test'
export { semanticPrimitives } from './semantic.test'
export { headingPrimitives } from './headings.test'

import { basicPrimitives } from './basic.test'
import { semanticPrimitives } from './semantic.test'
import { headingPrimitives } from './headings.test'

export const allPrimitivesTests: TestCase[] = [
  ...basicPrimitives,
  ...semanticPrimitives,
  ...headingPrimitives,
]
