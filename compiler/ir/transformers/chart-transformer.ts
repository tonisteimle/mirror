/**
 * Chart Transformer
 *
 * Transforms Chart primitives (Line, Bar, Pie, etc.) into IRNode representation.
 * Extracted from ir/index.ts for modularity.
 */

import type { Instance, ComponentDefinition, Property, TokenReference } from '../../parser/ast'
import type { IRNode, IRProperty, IRChartSlot } from '../types'
import type { TransformerContext, ParentLayoutContext } from './transformer-context'
import { getChartPrimitive, getChartSlotProperty } from '../../schema/chart-primitives'

/**
 * Helper to convert string booleans ("true"/"false") to actual booleans
 */
function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (typeof v === 'string') return v.toLowerCase() !== 'false'
  return Boolean(v)
}

/**
 * Transform a Chart primitive (Line, Bar, Pie, etc.) into an IRNode
 */
export function transformChart(
  ctx: TransformerContext,
  instance: Instance,
  resolvedComponent: ComponentDefinition | null,
  primitive: string,
  mergeProperties: (base: Property[], override: Property[]) => Property[],
  parentLayoutContext?: ParentLayoutContext
): IRNode {
  const nodeId = ctx.generateId()
  const chartDef = getChartPrimitive(instance.component) || getChartPrimitive(primitive)
  const chartType = chartDef?.chartType || 'line'
  const chartDefaults = chartDef?.defaults || {}

  // Merge properties
  const properties = mergeProperties(
    resolvedComponent?.properties || [],
    instance.properties
  )

  // Extract chart-specific properties
  // Data binding can come from:
  // 1. textContent property (for string data references like "$sales")
  // 2. propset property with token kind (for $variable references like $data)
  let dataBinding: string | undefined
  const textContentProp = properties.find(p => p.name === 'textContent')
  const propsetProp = properties.find(p => p.name === 'propset')

  if (textContentProp?.values[0]) {
    dataBinding = String(textContentProp.values[0])
  } else if (propsetProp?.values[0]) {
    const val = propsetProp.values[0]
    if (typeof val === 'object' && val !== null && 'kind' in val && (val as TokenReference).kind === 'token') {
      dataBinding = '$' + (val as TokenReference).name
    } else if (typeof val === 'string' && val.startsWith('$')) {
      dataBinding = val
    }
  }

  const xField = properties.find(p => p.name === 'x')?.values[0]
  const yField = properties.find(p => p.name === 'y')?.values[0]
  const colors = properties.find(p => p.name === 'colors')?.values
  const title = properties.find(p => p.name === 'title')?.values[0]

  // Handle standalone boolean properties (e.g., "legend" without a value means true)
  const legendProp = properties.find(p => p.name === 'legend')
  const legend = legendProp ? (legendProp.values[0] ?? true) : undefined

  const stackedProp = properties.find(p => p.name === 'stacked')
  const stacked = stackedProp ? (stackedProp.values[0] ?? true) : undefined

  const fillProp = properties.find(p => p.name === 'fill')
  // Use chart defaults for fill if not explicitly set (important for Area charts)
  const fill = fillProp ? (fillProp.values[0] ?? true) : chartDefaults.fill

  const tensionProp = properties.find(p => p.name === 'tension')
  // Use chart defaults for tension if not explicitly set
  const tension = tensionProp ? tensionProp.values[0] : chartDefaults.tension

  // For grid and axes, check the actual value (not just presence)
  const gridProp = properties.find(p => p.name === 'grid')
  const grid = gridProp?.values[0]

  const axesProp = properties.find(p => p.name === 'axes')
  const axes = axesProp?.values[0]

  // Transform sizing properties to styles
  const styles = ctx.transformProperties(properties, 'frame', parentLayoutContext)

  // Build IRProperties for chart config
  const irProperties: IRProperty[] = [
    { name: 'chartType', value: chartType },
  ]

  if (dataBinding) {
    irProperties.push({ name: 'data', value: String(dataBinding) })
  }
  if (xField) {
    irProperties.push({ name: 'xField', value: String(xField) })
  }
  if (yField) {
    irProperties.push({ name: 'yField', value: String(yField) })
  }
  if (colors && colors.length > 0) {
    irProperties.push({ name: 'colors', value: colors.join(',') })
  }
  if (title) {
    irProperties.push({ name: 'title', value: String(title) })
  }

  if (legend !== undefined) {
    irProperties.push({ name: 'legend', value: toBool(legend) })
  }
  if (stacked !== undefined) {
    irProperties.push({ name: 'stacked', value: toBool(stacked) })
  }
  if (fill !== undefined) {
    irProperties.push({ name: 'fill', value: toBool(fill) })
  }
  if (tension !== undefined) {
    irProperties.push({ name: 'tension', value: Number(tension) })
  }
  if (grid !== undefined) {
    irProperties.push({ name: 'grid', value: toBool(grid) })
  }
  if (axes !== undefined) {
    irProperties.push({ name: 'axes', value: toBool(axes) })
  }

  // Process chart slots (XAxis:, YAxis:, Legend:, etc.)
  const chartSlots: IRChartSlot[] = []
  if (instance.chartSlots) {
    for (const [slotName, slotNode] of Object.entries(instance.chartSlots)) {
      const slotConfig: Record<string, string | number | boolean> = {}

      // Map each property to its Chart.js path
      for (const prop of slotNode.properties) {
        const slotPropDef = getChartSlotProperty(slotName, prop.name)
        if (slotPropDef && prop.values.length > 0) {
          const value = prop.values[0]
          // Convert value to appropriate type
          if (slotPropDef.type === 'number') {
            slotConfig[slotPropDef.chartJsPath] = Number(value)
          } else if (slotPropDef.type === 'boolean') {
            slotConfig[slotPropDef.chartJsPath] = toBool(value)
          } else {
            slotConfig[slotPropDef.chartJsPath] = String(value)
          }
        }
      }

      if (Object.keys(slotConfig).length > 0) {
        chartSlots.push({ name: slotName, config: slotConfig })
      }
    }
  }

  // Add chart slots to properties if any exist
  if (chartSlots.length > 0) {
    irProperties.push({ name: 'chartSlots', value: JSON.stringify(chartSlots) })
  }

  return {
    id: nodeId,
    tag: 'div',
    primitive: 'chart',
    name: instance.name || instance.component,
    instanceName: instance.name || undefined,
    properties: irProperties,
    styles,
    events: [],
    children: [],
    sourcePosition: instance.line !== undefined
      ? { line: instance.line, column: instance.column ?? 0, endLine: instance.line, endColumn: instance.column ?? 0 }
      : undefined,
  }
}
