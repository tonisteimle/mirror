/**
 * Charts Module
 *
 * Handles Chart.js integration for Mirror charts.
 * Extracted from dom-runtime.ts for Clean Code.
 */

// ============================================
// TYPES
// ============================================

interface ChartJSConstructor {
  new (ctx: CanvasRenderingContext2D | null, config: Record<string, unknown>): ChartJSInstance
  getChart?: (canvas: HTMLCanvasElement) => ChartJSInstance | undefined
}

interface ChartJSInstance {
  config: { type: string }
  data: {
    labels: string[]
    datasets: Array<{ data: unknown[] }>
  }
  update(): void
}

declare global {
  interface Window {
    Chart?: ChartJSConstructor
  }
}

export interface ChartSlotConfig {
  name: string
  config: Record<string, string | number | boolean>
}

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

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_CHART_COLORS = [
  '#2563eb',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
]

// ============================================
// CHART.JS LOADING
// ============================================

let chartJsPromise: Promise<void> | null = null

function loadChartJs(): Promise<void> {
  if (chartJsPromise) return chartJsPromise
  if (typeof window.Chart !== 'undefined') return Promise.resolve()

  chartJsPromise = createChartJsLoader()
  return chartJsPromise
}

function createChartJsLoader(): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Chart.js'))
    document.head.appendChild(script)
  })
}

// ============================================
// DATA PARSING
// ============================================

interface ParsedChartData {
  labels: string[]
  values: number[]
}

export function parseChartData(
  data: unknown,
  type: string,
  xField?: string,
  yField?: string
): ParsedChartData {
  if (isNumberArray(data)) return parseNumberArray(data)
  if (isStringArray(data)) return parseStringArray(data)
  if (isKeyValueObject(data)) return parseKeyValueObject(data, xField, yField)
  if (isObjectArray(data)) return parseObjectArray(data, xField, yField)
  return { labels: [], values: [] }
}

function isNumberArray(data: unknown): data is number[] {
  return Array.isArray(data) && typeof data[0] === 'number'
}

function isStringArray(data: unknown): data is string[] {
  return Array.isArray(data) && typeof data[0] === 'string'
}

function isKeyValueObject(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data)
}

function isObjectArray(data: unknown): data is Record<string, unknown>[] {
  return Array.isArray(data) && typeof data[0] === 'object'
}

function parseNumberArray(data: number[]): ParsedChartData {
  return {
    labels: data.map((_, i) => String(i + 1)),
    values: data,
  }
}

function parseStringArray(data: string[]): ParsedChartData {
  return {
    labels: data,
    values: data.map(() => 0),
  }
}

function parseKeyValueObject(
  data: Record<string, unknown>,
  xField?: string,
  yField?: string
): ParsedChartData {
  const keys = Object.keys(data)
  const firstValue = data[keys[0]]
  if (typeof firstValue === 'number') return parseSimpleKeyValue(data, keys)
  if (typeof firstValue === 'object') return parseNestedKeyValue(data, keys, xField, yField)
  return { labels: [], values: [] }
}

function parseSimpleKeyValue(data: Record<string, unknown>, keys: string[]): ParsedChartData {
  return {
    labels: keys,
    values: keys.map(k => data[k] as number),
  }
}

function parseNestedKeyValue(
  data: Record<string, unknown>,
  keys: string[],
  xField?: string,
  yField?: string
): ParsedChartData {
  const items = keys.map(k => data[k] as Record<string, unknown>)
  return {
    labels: xField ? items.map(item => String(item[xField] ?? '')) : keys,
    values: yField ? items.map(item => Number(item[yField] ?? 0)) : items.map(() => 0),
  }
}

function parseObjectArray(
  data: Record<string, unknown>[],
  xField?: string,
  yField?: string
): ParsedChartData {
  return {
    labels: xField
      ? data.map(item => String(item[xField] ?? ''))
      : data.map((_, i) => String(i + 1)),
    values: yField ? data.map(item => Number(item[yField] ?? 0)) : data.map(() => 0),
  }
}

// ============================================
// CONFIG HELPERS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedValue(obj: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    current = navigateToPath(current, parts[i])
  }

  setFinalValue(current, parts[parts.length - 1], value)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function navigateToPath(current: Record<string, any>, part: string): Record<string, any> {
  const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)

  if (arrayMatch) {
    return navigateArrayPath(current, arrayMatch[1], parseInt(arrayMatch[2], 10))
  }

  if (!(part in current)) current[part] = {}
  return current[part]
}

function navigateArrayPath(
  current: Record<string, any>,
  arrayName: string,
  index: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  if (!(arrayName in current)) current[arrayName] = []
  if (!current[arrayName][index]) current[arrayName][index] = {}
  return current[arrayName][index]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setFinalValue(current: Record<string, any>, part: string, value: unknown): void {
  const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)

  if (arrayMatch) {
    const [, arrayName, indexStr] = arrayMatch
    if (!(arrayName in current)) current[arrayName] = []
    current[arrayName][parseInt(indexStr, 10)] = value
  } else {
    current[part] = value
  }
}

// ============================================
// CHART CREATION
// ============================================

export async function createChart(element: HTMLElement, config: ChartConfig): Promise<void> {
  await loadChartJs()

  setupChartContainer(element)
  const wrapper = createChartWrapper(element)
  const canvas = createChartCanvas(wrapper)

  const chartConfig = buildChartConfig(config)
  applySlotConfigs(chartConfig, config.slots)

  if (window.Chart) {
    new window.Chart(canvas.getContext('2d'), chartConfig)
  }
}

function setupChartContainer(element: HTMLElement): void {
  element.style.position = 'relative'
  element.style.overflow = 'hidden'
}

function createChartWrapper(element: HTMLElement): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
  element.appendChild(wrapper)
  return wrapper
}

function createChartCanvas(wrapper: HTMLDivElement): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  wrapper.appendChild(canvas)
  return canvas
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChartConfig(config: ChartConfig): Record<string, any> {
  const { labels, values } = parseChartData(config.data, config.type, config.xField, config.yField)
  const colors = config.colors || DEFAULT_CHART_COLORS
  const isPieType = config.type === 'pie' || config.type === 'doughnut'

  return {
    type: config.type,
    data: buildDataConfig(labels, values, colors, isPieType, config),
    options: buildOptionsConfig(config, isPieType),
  }
}

function buildDataConfig(
  labels: string[],
  values: number[],
  colors: string[],
  isPieType: boolean,
  config: ChartConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: isPieType ? colors : colors[0] + '33',
        borderColor: isPieType ? colors : colors[0],
        borderWidth: isPieType ? 1 : 2,
        fill: config.fill ?? (config.type === 'line' ? false : true),
        tension: config.tension ?? 0.3,
      },
    ],
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildOptionsConfig(config: ChartConfig, isPieType: boolean): Record<string, any> {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: config.legend ?? isPieType },
      title: { display: !!config.title, text: config.title },
    },
    scales: isPieType ? undefined : buildScalesConfig(config),
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildScalesConfig(config: ChartConfig): Record<string, any> {
  return {
    x: {
      display: config.axes ?? true,
      grid: { display: config.grid ?? true },
    },
    y: {
      display: config.axes ?? true,
      grid: { display: config.grid ?? true },
      stacked: config.stacked,
    },
  }
}

function applySlotConfigs(chartConfig: Record<string, any>, slots?: ChartSlotConfig[]): void {
  // eslint-disable-line @typescript-eslint/no-explicit-any
  if (!slots?.length) return
  slots.forEach(slot =>
    Object.entries(slot.config).forEach(([path, value]) => {
      if (path.includes('.title.text'))
        setNestedValue(chartConfig, path.replace('.title.text', '.title.display'), true)
      setNestedValue(chartConfig, path, value)
    })
  )
}

// ============================================
// CHART UPDATE
// ============================================

export function updateChart(
  element: HTMLElement,
  data: unknown,
  xField?: string,
  yField?: string
): void {
  const canvas = element.querySelector('canvas') as HTMLCanvasElement
  if (!canvas) return
  const chartInstance = window.Chart?.getChart?.(canvas)
  if (!chartInstance) return
  const { labels, values } = parseChartData(data, chartInstance.config.type, xField, yField)
  chartInstance.data.labels = labels
  chartInstance.data.datasets[0].data = values
  chartInstance.update()
}
