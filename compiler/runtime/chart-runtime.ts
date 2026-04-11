/**
 * Chart Runtime for Mirror DSL
 *
 * Lightweight wrapper around Chart.js for rendering charts.
 * Loaded dynamically when chart primitives are used.
 */

// Chart.js minimal types (Chart.js is loaded globally)
interface ChartInstance {
  update(): void
  destroy(): void
  data: { labels: unknown[]; datasets: unknown[] }
  options: Record<string, unknown>
}

interface ChartConstructor {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  new (ctx: CanvasRenderingContext2D | null, config: Record<string, any>): ChartInstance
  getChart(canvas: HTMLCanvasElement): ChartInstance | undefined
}

declare const Chart: ChartConstructor

/**
 * Chart slot configuration
 * Maps Chart.js config paths to values
 */
export interface ChartSlotConfig {
  name: string
  config: Record<string, string | number | boolean>
}

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
  slots?: ChartSlotConfig[]
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
 * Set a nested value in an object using a dot-separated path
 * Handles array notation like 'data.datasets[0].pointRadius'
 *
 * @param obj The object to modify
 * @param path Dot-separated path (e.g., 'options.scales.x.ticks.color')
 * @param value The value to set
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedValue(obj: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    let part = parts[i]

    // Handle array notation like 'datasets[0]'
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const arrayName = arrayMatch[1]
      const index = parseInt(arrayMatch[2], 10)

      if (!(arrayName in current)) {
        current[arrayName] = []
      }
      if (!current[arrayName][index]) {
        current[arrayName][index] = {}
      }
      current = current[arrayName][index]
    } else {
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part]
    }
  }

  // Set the final value
  const lastPart = parts[parts.length - 1]
  const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/)
  if (arrayMatch) {
    const arrayName = arrayMatch[1]
    const index = parseInt(arrayMatch[2], 10)
    if (!(arrayName in current)) {
      current[arrayName] = []
    }
    current[arrayName][index] = value
  } else {
    current[lastPart] = value
  }
}

/**
 * Create a chart in the given element
 */
export async function createChart(
  element: HTMLElement,
  config: ChartConfig
): Promise<void> {
  await loadChartJs()

  // Chart.js requires a container with position:relative and overflow:hidden
  // to properly constrain the canvas size when responsive:true
  element.style.position = 'relative'
  element.style.overflow = 'hidden'

  // Create a wrapper that fills the container - Chart.js needs this structure
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
  element.appendChild(wrapper)

  // Create canvas element
  const canvas = document.createElement('canvas')
  wrapper.appendChild(canvas)

  // Parse data
  const { labels, values } = parseData(
    config.data,
    config.type,
    config.xField,
    config.yField
  )

  const colors = config.colors || DEFAULT_COLORS
  const isPieType = config.type === 'pie' || config.type === 'doughnut'

  // Build Chart.js config - Chart.js types are complex, using Record for flexibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartConfig: Record<string, any> = {
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

  // Apply slot configurations
  if (config.slots && config.slots.length > 0) {
    for (const slot of config.slots) {
      for (const [path, value] of Object.entries(slot.config)) {
        // Special handling for axis title display
        // If setting title.text, also enable title.display
        if (path.includes('.title.text')) {
          const displayPath = path.replace('.title.text', '.title.display')
          setNestedValue(chartConfig, displayPath, true)
        }

        setNestedValue(chartConfig, path, value)
      }
    }
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

  const chartInstance = Chart.getChart(canvas)
  if (!chartInstance) return

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { labels, values } = parseData(data, (chartInstance as any).config.type, xField, yField)
  chartInstance.data.labels = labels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(chartInstance.data.datasets[0] as any).data = values
  chartInstance.update()
}

// Extend Window interface for runtime export
declare global {
  interface Window {
    __mirrorChartRuntime?: {
      createChart: typeof createChart
      updateChart: typeof updateChart
    }
  }
}

// Export for runtime
window.__mirrorChartRuntime = {
  createChart,
  updateChart,
}
