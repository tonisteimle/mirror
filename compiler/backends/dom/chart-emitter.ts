/**
 * Chart Emitter Module
 *
 * Chart.js initialization code emission.
 */

import type { IRNode, IRProperty } from '../../ir/types'

// ============================================
// TYPES
// ============================================

export interface ChartEmitterContext {
  emit: (line: string) => void
  indentIn: () => void
  indentOut: () => void
  escapeString: (str: string | number | boolean | undefined | null) => string
}

interface ChartConfig {
  chartType: string | number | boolean
  dataBinding: string | number | boolean | undefined
  xField: string | number | boolean | undefined
  yField: string | number | boolean | undefined
  colors: string | number | boolean | undefined
  title: string | number | boolean | undefined
  legend: string | number | boolean | undefined
  stacked: string | number | boolean | undefined
  fill: string | number | boolean | undefined
  tension: string | number | boolean | undefined
  grid: string | number | boolean | undefined
  axes: string | number | boolean | undefined
  chartSlots: string | number | boolean | undefined
}

// ============================================
// MAIN EXPORT
// ============================================

/**
 * Emit chart initialization code
 */
export function emitChartSetup(ctx: ChartEmitterContext, node: IRNode, varName: string): void {
  if (node.primitive !== 'chart') return

  emitChartMarker(ctx, varName)
  const config = extractChartConfig(node.properties)
  emitChartConfigObject(ctx, varName, config)
  emitChartCreation(ctx, varName)
}

// ============================================
// HELPERS
// ============================================

function emitChartMarker(ctx: ChartEmitterContext, varName: string): void {
  ctx.emit(`// Chart initialization`)
  ctx.emit(`${varName}.dataset.mirrorChart = 'true'`)
}

function extractChartConfig(properties: IRProperty[]): ChartConfig {
  const get = (name: string) => findProperty(properties, name)?.value
  return {
    chartType: get('chartType') || 'line',
    dataBinding: get('data'),
    xField: get('xField'),
    yField: get('yField'),
    colors: get('colors'),
    title: get('title'),
    legend: get('legend'),
    stacked: get('stacked'),
    fill: get('fill'),
    tension: get('tension'),
    grid: get('grid'),
    axes: get('axes'),
    chartSlots: get('chartSlots'),
  }
}

function findProperty(properties: IRProperty[], name: string): IRProperty | undefined {
  return properties.find(p => p.name === name)
}

function emitChartConfigObject(
  ctx: ChartEmitterContext,
  varName: string,
  config: ChartConfig
): void {
  ctx.emit(`const ${varName}_config = {`)
  ctx.indentIn()

  emitChartType(ctx, config.chartType)
  emitChartData(ctx, config.dataBinding)
  emitOptionalField(ctx, 'xField', config.xField)
  emitOptionalField(ctx, 'yField', config.yField)
  emitColorsField(ctx, config.colors)
  emitTitleField(ctx, config.title)
  emitOptionalBoolean(ctx, 'legend', config.legend)
  emitOptionalBoolean(ctx, 'stacked', config.stacked)
  emitOptionalBoolean(ctx, 'fill', config.fill)
  emitOptionalValue(ctx, 'tension', config.tension)
  emitOptionalBoolean(ctx, 'grid', config.grid)
  emitOptionalBoolean(ctx, 'axes', config.axes)
  emitSlotsField(ctx, config.chartSlots)

  ctx.indentOut()
  ctx.emit(`}`)
}

function emitChartType(ctx: ChartEmitterContext, chartType: string | number | boolean): void {
  ctx.emit(`type: '${chartType}',`)
}

function emitChartData(
  ctx: ChartEmitterContext,
  dataBinding: string | number | boolean | undefined
): void {
  if (!dataBinding) {
    ctx.emit(`data: [],`)
    return
  }
  const str = String(dataBinding)
  ctx.emit(
    str.startsWith('$') ? `data: $get('${str.slice(1)}'),` : `data: ${JSON.stringify(dataBinding)},`
  )
}

function emitOptionalField(
  ctx: ChartEmitterContext,
  name: string,
  value: string | number | boolean | undefined
): void {
  if (value !== undefined) {
    ctx.emit(`${name}: '${value}',`)
  }
}

function emitColorsField(
  ctx: ChartEmitterContext,
  colors: string | number | boolean | undefined
): void {
  if (colors !== undefined) {
    ctx.emit(`colors: ${JSON.stringify(String(colors).split(','))},`)
  }
}

function emitTitleField(
  ctx: ChartEmitterContext,
  title: string | number | boolean | undefined
): void {
  if (title !== undefined) {
    ctx.emit(`title: '${String(title).replace(/'/g, "\\'")}',`)
  }
}

function emitOptionalBoolean(
  ctx: ChartEmitterContext,
  name: string,
  value: string | number | boolean | undefined
): void {
  if (value !== undefined) {
    ctx.emit(`${name}: ${value},`)
  }
}

function emitOptionalValue(
  ctx: ChartEmitterContext,
  name: string,
  value: string | number | boolean | undefined
): void {
  if (value !== undefined) {
    ctx.emit(`${name}: ${value},`)
  }
}

function emitSlotsField(
  ctx: ChartEmitterContext,
  chartSlots: string | number | boolean | undefined
): void {
  if (chartSlots !== undefined) {
    ctx.emit(`slots: ${chartSlots},`)
  }
}

function emitChartCreation(ctx: ChartEmitterContext, varName: string): void {
  ctx.emit(`_runtime.createChart(${varName}, ${varName}_config)`)
}
