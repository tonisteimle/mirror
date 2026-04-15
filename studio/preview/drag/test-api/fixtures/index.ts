/**
 * Drag & Drop Test Fixtures
 *
 * Re-exports all component and container fixtures for testing.
 */

// Simple components
export {
  SIMPLE_COMPONENTS,
  LAYOUT_COMPONENTS,
  getSimpleComponentNames,
  getLayoutComponentNames,
  getSimpleFixture,
} from './simple-components'

// Zag components
export {
  ZAG_SIMPLE,
  ZAG_WITH_SLOTS,
  getZagComponentNames,
  getZagFixture,
  isZagComponent,
} from './zag-components'

// Chart components
export {
  CHART_COMPONENTS,
  getChartComponentNames,
  getChartFixture,
  isChartComponent,
} from './chart-components'

// Container setups
export {
  EMPTY_VERTICAL,
  VERTICAL_WITH_CHILDREN,
  HORIZONTAL_ROW,
  NESTED_CONTAINERS,
  GRID_LAYOUT,
  MIXED_LAYOUT,
  WITH_ZAG_COMPONENT,
  ALL_CONTAINERS,
  getContainerFixture,
  getContainersByLayout,
} from './container-setups'

// Re-export types
export type { ComponentFixture, ContainerFixture } from '../types'

// =============================================================================
// Aggregate Helpers
// =============================================================================

import { SIMPLE_COMPONENTS, LAYOUT_COMPONENTS } from './simple-components'
import { ZAG_SIMPLE, ZAG_WITH_SLOTS } from './zag-components'
import { CHART_COMPONENTS } from './chart-components'
import type { ComponentFixture } from '../types'

/**
 * All component fixtures combined
 */
export const ALL_COMPONENTS: Record<string, ComponentFixture> = {
  ...SIMPLE_COMPONENTS,
  ...LAYOUT_COMPONENTS,
  ...ZAG_SIMPLE,
  ...ZAG_WITH_SLOTS,
  ...CHART_COMPONENTS,
}

/**
 * Get any fixture by component name
 */
export function getFixture(name: string): ComponentFixture | undefined {
  return ALL_COMPONENTS[name]
}

/**
 * Get all component names
 */
export function getAllComponentNames(): string[] {
  return Object.keys(ALL_COMPONENTS)
}

/**
 * Get components by category
 */
export function getComponentsByCategory(
  category: ComponentFixture['category']
): ComponentFixture[] {
  return Object.values(ALL_COMPONENTS).filter(c => c.category === category)
}
