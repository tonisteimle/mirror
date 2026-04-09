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
