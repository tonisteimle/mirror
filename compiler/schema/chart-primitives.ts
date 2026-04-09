/**
 * Chart Primitives for Mirror DSL
 *
 * Simple, declarative chart components powered by Chart.js.
 *
 * Usage:
 *   Line $data, w 400, h 200
 *   Bar $sales, colors #2563eb #10b981
 *   Pie $categories
 *
 * Data formats:
 *   // Simple list (x = index)
 *   values: 10, 20, 30, 40
 *
 *   // Key-value (x = keys)
 *   sales:
 *     Jan: 120
 *     Feb: 180
 *     Mar: 240
 *
 *   // Objects with field selection
 *   products:
 *     a: name "Widget", value 120
 *     b: name "Gadget", value 80
 *   Bar $products, x "name", y "value"
 */

// ============================================================================
// Types
// ============================================================================

export interface ChartPrimitiveDef {
  /** Chart.js chart type */
  chartType: string
  /** Description for docs */
  description: string
  /** Default options */
  defaults?: Record<string, unknown>
}

export interface ChartPropertyDef {
  /** Property name */
  name: string
  /** Aliases */
  aliases?: string[]
  /** Description */
  description: string
  /** Value type */
  type: 'number' | 'string' | 'color' | 'colors' | 'boolean' | 'field'
  /** Default value */
  default?: unknown
}

// ============================================================================
// Chart Slot Types
// ============================================================================

export interface ChartSlotDef {
  /** Slot name (e.g., 'XAxis', 'Legend') */
  name: string
  /** Description for docs */
  description: string
  /** Properties supported by this slot */
  properties: ChartSlotPropertyDef[]
  /** Chart types that support this slot (undefined = all) */
  supportedCharts?: string[]
}

export interface ChartSlotPropertyDef {
  /** Property name in Mirror DSL */
  name: string
  /** Aliases (e.g., 'col' for 'color') */
  aliases?: string[]
  /** Value type */
  type: 'color' | 'number' | 'boolean' | 'string' | 'position'
  /** Chart.js config path (e.g., 'options.scales.x.ticks.color') */
  chartJsPath: string
  /** Default value */
  default?: unknown
}

// ============================================================================
// Chart Primitives
// ============================================================================

export const CHART_PRIMITIVES: Record<string, ChartPrimitiveDef> = {
  Line: {
    chartType: 'line',
    description: 'Line chart for trends over time',
    defaults: {
      fill: false,
      tension: 0.3,
    },
  },

  Bar: {
    chartType: 'bar',
    description: 'Bar chart for comparing values',
    defaults: {},
  },

  Pie: {
    chartType: 'pie',
    description: 'Pie chart for proportions',
    defaults: {},
  },

  Donut: {
    chartType: 'doughnut',
    description: 'Donut chart (pie with hole)',
    defaults: {},
  },

  Area: {
    chartType: 'line',
    description: 'Area chart (filled line)',
    defaults: {
      fill: true,
      tension: 0.3,
    },
  },

  Scatter: {
    chartType: 'scatter',
    description: 'Scatter plot for correlations',
    defaults: {},
  },

  Radar: {
    chartType: 'radar',
    description: 'Radar chart for multi-dimensional data',
    defaults: {},
  },
}

// ============================================================================
// Chart Properties
// ============================================================================

export const CHART_PROPERTIES: ChartPropertyDef[] = [
  // Data binding
  {
    name: 'x',
    description: 'Field name for x-axis labels',
    type: 'field',
  },
  {
    name: 'y',
    description: 'Field name for y-axis values',
    type: 'field',
  },

  // Appearance
  {
    name: 'colors',
    description: 'Color palette for data series',
    type: 'colors',
    default: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'],
  },
  {
    name: 'color',
    description: 'Single color for all data',
    type: 'color',
    default: '#2563eb',
  },

  // Labels
  {
    name: 'title',
    description: 'Chart title',
    type: 'string',
  },
  {
    name: 'legend',
    description: 'Show legend',
    type: 'boolean',
    default: false,
  },

  // Chart-specific
  {
    name: 'stacked',
    description: 'Stack bars/areas',
    type: 'boolean',
    default: false,
  },
  {
    name: 'fill',
    description: 'Fill area under line',
    type: 'boolean',
    default: false,
  },
  {
    name: 'tension',
    description: 'Line smoothness (0-1)',
    type: 'number',
    default: 0.3,
  },

  // Grid
  {
    name: 'grid',
    description: 'Show grid lines',
    type: 'boolean',
    default: true,
  },
  {
    name: 'axes',
    description: 'Show axes',
    type: 'boolean',
    default: true,
  },
]

// ============================================================================
// Chart Slots
// ============================================================================

export const CHART_SLOTS: Record<string, ChartSlotDef> = {
  XAxis: {
    name: 'XAxis',
    description: 'X-axis configuration',
    supportedCharts: ['line', 'bar', 'scatter'],
    properties: [
      { name: 'col', aliases: ['color'], type: 'color', chartJsPath: 'options.scales.x.ticks.color' },
      { name: 'label', type: 'string', chartJsPath: 'options.scales.x.title.text' },
      { name: 'label-col', aliases: ['label-color'], type: 'color', chartJsPath: 'options.scales.x.title.color' },
      { name: 'fs', aliases: ['font-size'], type: 'number', chartJsPath: 'options.scales.x.ticks.font.size' },
      { name: 'min', type: 'number', chartJsPath: 'options.scales.x.min' },
      { name: 'max', type: 'number', chartJsPath: 'options.scales.x.max' },
      { name: 'visible', type: 'boolean', chartJsPath: 'options.scales.x.display', default: true },
    ],
  },

  YAxis: {
    name: 'YAxis',
    description: 'Y-axis configuration',
    supportedCharts: ['line', 'bar', 'scatter'],
    properties: [
      { name: 'col', aliases: ['color'], type: 'color', chartJsPath: 'options.scales.y.ticks.color' },
      { name: 'label', type: 'string', chartJsPath: 'options.scales.y.title.text' },
      { name: 'label-col', aliases: ['label-color'], type: 'color', chartJsPath: 'options.scales.y.title.color' },
      { name: 'fs', aliases: ['font-size'], type: 'number', chartJsPath: 'options.scales.y.ticks.font.size' },
      { name: 'min', type: 'number', chartJsPath: 'options.scales.y.min' },
      { name: 'max', type: 'number', chartJsPath: 'options.scales.y.max' },
      { name: 'visible', type: 'boolean', chartJsPath: 'options.scales.y.display', default: true },
    ],
  },

  Grid: {
    name: 'Grid',
    description: 'Grid lines configuration',
    supportedCharts: ['line', 'bar', 'scatter', 'radar'],
    properties: [
      { name: 'col', aliases: ['color'], type: 'color', chartJsPath: 'options.scales.x.grid.color' },
      { name: 'y-col', aliases: ['y-color'], type: 'color', chartJsPath: 'options.scales.y.grid.color' },
      { name: 'width', type: 'number', chartJsPath: 'options.scales.x.grid.lineWidth' },
      { name: 'dash', type: 'number', chartJsPath: 'options.scales.x.grid.borderDash' },
      { name: 'visible', type: 'boolean', chartJsPath: 'options.scales.x.grid.display', default: true },
    ],
  },

  Point: {
    name: 'Point',
    description: 'Data point configuration',
    supportedCharts: ['line', 'scatter', 'radar'],
    properties: [
      { name: 'size', aliases: ['radius'], type: 'number', chartJsPath: 'data.datasets[0].pointRadius' },
      { name: 'bg', aliases: ['background'], type: 'color', chartJsPath: 'data.datasets[0].pointBackgroundColor' },
      { name: 'boc', aliases: ['border-color'], type: 'color', chartJsPath: 'data.datasets[0].pointBorderColor' },
      { name: 'bor', aliases: ['border'], type: 'number', chartJsPath: 'data.datasets[0].pointBorderWidth' },
      { name: 'hover-size', aliases: ['hover-radius'], type: 'number', chartJsPath: 'data.datasets[0].pointHoverRadius' },
      { name: 'style', type: 'string', chartJsPath: 'data.datasets[0].pointStyle' },
    ],
  },

  Legend: {
    name: 'Legend',
    description: 'Legend configuration',
    properties: [
      { name: 'visible', type: 'boolean', chartJsPath: 'options.plugins.legend.display', default: false },
      { name: 'pos', aliases: ['position'], type: 'position', chartJsPath: 'options.plugins.legend.position', default: 'top' },
      { name: 'col', aliases: ['color'], type: 'color', chartJsPath: 'options.plugins.legend.labels.color' },
      { name: 'fs', aliases: ['font-size'], type: 'number', chartJsPath: 'options.plugins.legend.labels.font.size' },
      { name: 'pad', aliases: ['padding'], type: 'number', chartJsPath: 'options.plugins.legend.labels.padding' },
      { name: 'box-size', type: 'number', chartJsPath: 'options.plugins.legend.labels.boxWidth' },
    ],
  },

  Title: {
    name: 'Title',
    description: 'Chart title configuration',
    properties: [
      { name: 'text', type: 'string', chartJsPath: 'options.plugins.title.text' },
      { name: 'col', aliases: ['color'], type: 'color', chartJsPath: 'options.plugins.title.color' },
      { name: 'fs', aliases: ['font-size'], type: 'number', chartJsPath: 'options.plugins.title.font.size' },
      { name: 'weight', type: 'string', chartJsPath: 'options.plugins.title.font.weight' },
      { name: 'pos', aliases: ['position'], type: 'position', chartJsPath: 'options.plugins.title.position', default: 'top' },
      { name: 'pad', aliases: ['padding'], type: 'number', chartJsPath: 'options.plugins.title.padding' },
      { name: 'visible', type: 'boolean', chartJsPath: 'options.plugins.title.display', default: true },
    ],
  },

  Tooltip: {
    name: 'Tooltip',
    description: 'Tooltip configuration',
    properties: [
      { name: 'bg', aliases: ['background'], type: 'color', chartJsPath: 'options.plugins.tooltip.backgroundColor' },
      { name: 'col', aliases: ['color'], type: 'color', chartJsPath: 'options.plugins.tooltip.bodyColor' },
      { name: 'title-col', aliases: ['title-color'], type: 'color', chartJsPath: 'options.plugins.tooltip.titleColor' },
      { name: 'rad', aliases: ['radius'], type: 'number', chartJsPath: 'options.plugins.tooltip.cornerRadius' },
      { name: 'pad', aliases: ['padding'], type: 'number', chartJsPath: 'options.plugins.tooltip.padding' },
      { name: 'boc', aliases: ['border-color'], type: 'color', chartJsPath: 'options.plugins.tooltip.borderColor' },
      { name: 'bor', aliases: ['border'], type: 'number', chartJsPath: 'options.plugins.tooltip.borderWidth' },
      { name: 'visible', type: 'boolean', chartJsPath: 'options.plugins.tooltip.enabled', default: true },
    ],
  },

  Line: {
    name: 'Line',
    description: 'Line styling (for Line/Area charts)',
    supportedCharts: ['line'],
    properties: [
      { name: 'width', type: 'number', chartJsPath: 'data.datasets[0].borderWidth' },
      { name: 'tension', type: 'number', chartJsPath: 'data.datasets[0].tension' },
      { name: 'fill', type: 'boolean', chartJsPath: 'data.datasets[0].fill' },
      { name: 'dash', type: 'number', chartJsPath: 'data.datasets[0].borderDash' },
    ],
  },

  Bar: {
    name: 'Bar',
    description: 'Bar styling',
    supportedCharts: ['bar'],
    properties: [
      { name: 'rad', aliases: ['radius'], type: 'number', chartJsPath: 'data.datasets[0].borderRadius' },
      { name: 'bor', aliases: ['border'], type: 'number', chartJsPath: 'data.datasets[0].borderWidth' },
      { name: 'boc', aliases: ['border-color'], type: 'color', chartJsPath: 'data.datasets[0].borderColor' },
      { name: 'width', type: 'number', chartJsPath: 'data.datasets[0].barPercentage' },
    ],
  },

  Arc: {
    name: 'Arc',
    description: 'Arc styling (for Pie/Donut charts)',
    supportedCharts: ['pie', 'doughnut'],
    properties: [
      { name: 'bor', aliases: ['border'], type: 'number', chartJsPath: 'data.datasets[0].borderWidth' },
      { name: 'boc', aliases: ['border-color'], type: 'color', chartJsPath: 'data.datasets[0].borderColor' },
      { name: 'offset', type: 'number', chartJsPath: 'data.datasets[0].offset' },
      { name: 'hover-offset', type: 'number', chartJsPath: 'data.datasets[0].hoverOffset' },
    ],
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a component name is a chart primitive.
 */
export function isChartPrimitive(name: string): boolean {
  return name in CHART_PRIMITIVES
}

/**
 * Get chart primitive definition.
 */
export function getChartPrimitive(name: string): ChartPrimitiveDef | undefined {
  return CHART_PRIMITIVES[name]
}

/**
 * Get chart property definition.
 */
export function getChartProperty(name: string): ChartPropertyDef | undefined {
  return CHART_PROPERTIES.find(p => p.name === name || p.aliases?.includes(name))
}

/**
 * Get all chart primitive names.
 */
export function getAllChartPrimitives(): string[] {
  return Object.keys(CHART_PRIMITIVES)
}

/**
 * Check if a name is a chart slot (XAxis, YAxis, Legend, etc.)
 */
export function isChartSlot(name: string): boolean {
  return name in CHART_SLOTS
}

/**
 * Get chart slot definition.
 */
export function getChartSlot(name: string): ChartSlotDef | undefined {
  return CHART_SLOTS[name]
}

/**
 * Check if a slot is supported for a specific chart type.
 */
export function isSlotSupportedForChart(slotName: string, chartType: string): boolean {
  const slot = CHART_SLOTS[slotName]
  if (!slot) return false
  // If supportedCharts is undefined, the slot works with all chart types
  if (!slot.supportedCharts) return true
  return slot.supportedCharts.includes(chartType)
}

/**
 * Get slot property definition by name or alias.
 */
export function getChartSlotProperty(slotName: string, propertyName: string): ChartSlotPropertyDef | undefined {
  const slot = CHART_SLOTS[slotName]
  if (!slot) return undefined
  return slot.properties.find(p => p.name === propertyName || p.aliases?.includes(propertyName))
}

/**
 * Get all chart slot names.
 */
export function getAllChartSlots(): string[] {
  return Object.keys(CHART_SLOTS)
}

/**
 * Default color palette for charts.
 */
export const DEFAULT_CHART_COLORS = [
  '#2563eb', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]
