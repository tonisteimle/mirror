/**
 * Chart Component Fixtures
 *
 * Fixtures for chart components that require data binding.
 */

import type { ComponentFixture } from '../types'

/**
 * Chart components - all require $data binding
 */
export const CHART_COMPONENTS: Record<string, ComponentFixture> = {
  Line: {
    componentName: 'Line',
    properties: '$data, w 300, h 200',
    template: 'Line',
    expectedLines: ['Line $data, w 300, h 200'],
    category: 'chart',
  },

  Bar: {
    componentName: 'Bar',
    properties: '$data, w 300, h 200',
    template: 'Bar',
    expectedLines: ['Bar $data, w 300, h 200'],
    category: 'chart',
  },

  Area: {
    componentName: 'Area',
    properties: '$data, w 300, h 200',
    template: 'Area',
    expectedLines: ['Area $data, w 300, h 200'],
    category: 'chart',
  },

  Pie: {
    componentName: 'Pie',
    properties: '$data, w 200, h 200',
    template: 'Pie',
    expectedLines: ['Pie $data, w 200, h 200'],
    category: 'chart',
  },

  Donut: {
    componentName: 'Donut',
    properties: '$data, w 200, h 200',
    template: 'Donut',
    expectedLines: ['Donut $data, w 200, h 200'],
    category: 'chart',
  },
}

/**
 * Get all chart component names
 */
export function getChartComponentNames(): string[] {
  return Object.keys(CHART_COMPONENTS)
}

/**
 * Get chart fixture by component name
 */
export function getChartFixture(name: string): ComponentFixture | undefined {
  return CHART_COMPONENTS[name]
}

/**
 * Check if a component is a chart
 */
export function isChartComponent(name: string): boolean {
  return name in CHART_COMPONENTS
}
