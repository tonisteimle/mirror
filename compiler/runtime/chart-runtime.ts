/**
 * Chart Runtime for Mirror DSL
 *
 * Lightweight wrapper around Chart.js for rendering charts.
 * Loaded dynamically when chart primitives are used.
 */

// Chart.js types (simplified)
declare const Chart: any

/**
 * Chart configuration extracted from Mirror properties
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'radar'
  data: unknown
  xField?: string
  yField?: string
  colors?: string[]
  title?: string
  legend?: boolean
  stacked?: boolean
  fill?: boolean
  tension?: number
  grid?: boolean
  axes?: boolean
}

/**
 * Default chart colors
 */
const DEFAULT_COLORS = [
  '#2563eb', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

/**
 * Load Chart.js dynamically if not already loaded
 */
let chartJsPromise: Promise<void> | null = null

function loadChartJs(): Promise<void> {
  if (chartJsPromise) return chartJsPromise

  if (typeof Chart !== 'undefined') {
    return Promise.resolve()
  }

  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Chart.js'))
    document.head.appendChild(script)
  })

  return chartJsPromise
}

/**
 * Parse Mirror data format into Chart.js data structure
 */
function parseData(
  data: unknown,
  type: string,
  xField?: string,
  yField?: string
): { labels: string[]; values: number[] } {
  // Simple array of numbers
  if (Array.isArray(data) && typeof data[0] === 'number') {
    return {
      labels: data.map((_, i) => String(i + 1)),
      values: data as number[],
    }
  }

  // Array of strings (labels with no values - shouldn't happen but handle it)
  if (Array.isArray(data) && typeof data[0] === 'string') {
    return {
      labels: data as string[],
      values: data.map(() => 0),
    }
  }

  // Key-value object: { Jan: 120, Feb: 180 }
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    const keys = Object.keys(obj)

    // Check if values are numbers (simple key-value)
    if (typeof obj[keys[0]] === 'number') {
      return {
        labels: keys,
        values: keys.map(k => obj[k] as number),
      }
    }

    // Check if values are objects (need xField/yField)
    if (typeof obj[keys[0]] === 'object') {
      const items = keys.map(k => obj[k] as Record<string, unknown>)
      return {
        labels: xField
          ? items.map(item => String(item[xField] ?? ''))
          : keys,
        values: yField
          ? items.map(item => Number(item[yField] ?? 0))
          : items.map(() => 0),
      }
    }
  }

  // Fallback
  return { labels: [], values: [] }
}

/**
 * Create a chart in the given element
 */
export async function createChart(
  element: HTMLElement,
  config: ChartConfig
): Promise<void> {
  await loadChartJs()

  // Create canvas element
  const canvas = document.createElement('canvas')
  element.appendChild(canvas)

  // Parse data
  const { labels, values } = parseData(
    config.data,
    config.type,
    config.xField,
    config.yField
  )

  const colors = config.colors || DEFAULT_COLORS
  const isPieType = config.type === 'pie' || config.type === 'doughnut'

  // Build Chart.js config
  const chartConfig: any = {
    type: config.type,
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: isPieType ? colors : colors[0] + '33',
        borderColor: isPieType ? colors : colors[0],
        borderWidth: isPieType ? 1 : 2,
        fill: config.fill ?? (config.type === 'line' ? false : true),
        tension: config.tension ?? 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: config.legend ?? isPieType,
        },
        title: {
          display: !!config.title,
          text: config.title,
        },
      },
      scales: isPieType ? undefined : {
        x: {
          display: config.axes ?? true,
          grid: {
            display: config.grid ?? true,
          },
        },
        y: {
          display: config.axes ?? true,
          grid: {
            display: config.grid ?? true,
          },
          stacked: config.stacked,
        },
      },
    },
  }

  // Create chart
  new Chart(canvas.getContext('2d'), chartConfig)
}

/**
 * Update chart data (for reactive updates)
 */
export function updateChart(
  element: HTMLElement,
  data: unknown,
  xField?: string,
  yField?: string
): void {
  const canvas = element.querySelector('canvas') as HTMLCanvasElement
  if (!canvas) return

  const chartInstance = (Chart as any).getChart(canvas)
  if (!chartInstance) return

  const { labels, values } = parseData(data, chartInstance.config.type, xField, yField)
  chartInstance.data.labels = labels
  chartInstance.data.datasets[0].data = values
  chartInstance.update()
}

// Export for runtime
;(window as any).__mirrorChartRuntime = {
  createChart,
  updateChart,
}
