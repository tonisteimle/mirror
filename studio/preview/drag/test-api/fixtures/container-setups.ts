/**
 * Container Setup Fixtures
 *
 * Pre-defined code setups for testing drop scenarios.
 * Each setup provides a known container structure for predictable testing.
 */

import type { ContainerFixture } from '../types'

/**
 * Empty container - simplest drop target
 */
export const EMPTY_VERTICAL: ContainerFixture = {
  name: 'empty-vertical',
  code: `Frame gap 8, pad 16`,
  nodeIds: ['node-1'],
  layout: 'vertical',
  childCount: 0,
}

/**
 * Vertical container with 3 children
 */
export const VERTICAL_WITH_CHILDREN: ContainerFixture = {
  name: 'vertical-with-children',
  code: `Frame gap 8, pad 16
  Text "First"
  Text "Second"
  Text "Third"`,
  nodeIds: ['node-1', 'node-2', 'node-3', 'node-4'],
  layout: 'vertical',
  childCount: 3,
}

/**
 * Horizontal container (row)
 */
export const HORIZONTAL_ROW: ContainerFixture = {
  name: 'horizontal-row',
  code: `Frame hor, gap 8, pad 16
  Button "A"
  Button "B"
  Button "C"`,
  nodeIds: ['node-1', 'node-2', 'node-3', 'node-4'],
  layout: 'horizontal',
  childCount: 3,
}

/**
 * Nested containers - 2 levels deep
 */
export const NESTED_CONTAINERS: ContainerFixture = {
  name: 'nested-containers',
  code: `Frame gap 12, pad 16
  Frame gap 8, bg #1a1a1a, pad 12, rad 8
    Text "Inner 1"
    Text "Inner 2"
  Frame gap 8, bg #2a2a2a, pad 12, rad 8
    Text "Inner 3"
    Text "Inner 4"`,
  nodeIds: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5', 'node-6', 'node-7'],
  layout: 'vertical',
  childCount: 2,
}

/**
 * Grid layout
 */
export const GRID_LAYOUT: ContainerFixture = {
  name: 'grid-layout',
  code: `Frame grid 3, gap 8, pad 16
  Frame bg #333, pad 12, rad 4
    Text "1"
  Frame bg #333, pad 12, rad 4
    Text "2"
  Frame bg #333, pad 12, rad 4
    Text "3"`,
  nodeIds: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5', 'node-6', 'node-7'],
  layout: 'grid',
  childCount: 3,
}

/**
 * Mixed layout - horizontal inside vertical
 */
export const MIXED_LAYOUT: ContainerFixture = {
  name: 'mixed-layout',
  code: `Frame gap 16, pad 16
  Text "Header", fs 18, weight bold
  Frame hor, gap 8
    Button "Option 1"
    Button "Option 2"
    Button "Option 3"
  Text "Footer"`,
  nodeIds: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5', 'node-6', 'node-7'],
  layout: 'vertical',
  childCount: 3,
}

/**
 * Component with Zag child
 */
export const WITH_ZAG_COMPONENT: ContainerFixture = {
  name: 'with-zag-component',
  code: `Frame gap 12, pad 16
  Text "Form"
  Checkbox
    Control: w 20, h 20, bor 1 #555, rad 4
    Label: "Accept terms"
  Button "Submit"`,
  nodeIds: ['node-1', 'node-2', 'node-3', 'node-4', 'node-5', 'node-6'],
  layout: 'vertical',
  childCount: 3,
}

/**
 * All container fixtures
 */
export const ALL_CONTAINERS: ContainerFixture[] = [
  EMPTY_VERTICAL,
  VERTICAL_WITH_CHILDREN,
  HORIZONTAL_ROW,
  NESTED_CONTAINERS,
  GRID_LAYOUT,
  MIXED_LAYOUT,
  WITH_ZAG_COMPONENT,
]

/**
 * Get container fixture by name
 */
export function getContainerFixture(name: string): ContainerFixture | undefined {
  return ALL_CONTAINERS.find(c => c.name === name)
}

/**
 * Get containers by layout type
 */
export function getContainersByLayout(layout: ContainerFixture['layout']): ContainerFixture[] {
  return ALL_CONTAINERS.filter(c => c.layout === layout)
}
