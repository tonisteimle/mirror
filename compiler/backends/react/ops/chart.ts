/**
 * React backend — Chart cluster (Slice 5 of react-backend-decomp).
 *
 * The MirrorChart runtime component is embedded once per React file when
 * any Chart instance (`Line`/`Bar`/`Pie`/`Donut`/`Area`/`Scatter`/
 * `Radar`) is used. Mirrors `compiler/runtime/charts.ts` — same Chart.js
 * CDN, same data parsing (key-value object → labels + values), same
 * pie/doughnut handling.
 *
 * `generateChartJSX` emits the per-instance `<MirrorChart … />` element.
 * The component-source string and the JSX emitter are deliberately
 * co-located: any Chart-related drift (new prop, new chart type,
 * different defaults) only needs to touch this one file.
 *
 * Extracted from `compiler/backends/react.ts` per
 * `docs/refactoring/react-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

import type { Instance, TokenDefinition } from '../../../parser/ast'
import { matchesCanonical } from '../../../schema/parser-helpers'

/**
 * MirrorChart runtime component source. Embedded once per React file
 * when `containsChartInstance` returns true. Self-contained — depends
 * only on React (peer-dep) and the Chart.js CDN bundle.
 */
export const MIRROR_CHART_COMPONENT = `// Mirror Chart component
const _MIRROR_CHART_CDN = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
const _MIRROR_CHART_COLORS = ['#2271C1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316']
let _mirrorChartPromise = null

function _mirrorLoadChartJs() {
  if (typeof window === 'undefined') return Promise.resolve(null)
  if (window.Chart) return Promise.resolve(window.Chart)
  if (_mirrorChartPromise) return _mirrorChartPromise
  _mirrorChartPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = _MIRROR_CHART_CDN
    script.onload = () => resolve(window.Chart)
    script.onerror = () => reject(new Error('Chart.js failed to load'))
    document.head.appendChild(script)
  })
  return _mirrorChartPromise
}

function _mirrorParseChartData(data) {
  if (data == null) return { labels: [], values: [] }
  if (Array.isArray(data) && typeof data[0] === 'number') {
    return { labels: data.map((_, i) => String(i + 1)), values: data }
  }
  if (typeof data === 'object') {
    const entries = Object.entries(data)
    return { labels: entries.map(([k]) => k), values: entries.map(([, v]) => Number(v) || 0) }
  }
  return { labels: [], values: [] }
}

function MirrorChart({ chartType, data, fill, tension, title, xLabel, yLabel, min, max, colors, style: extraStyle }) {
  const canvasRef = React.useRef(null)
  React.useEffect(() => {
    let chart = null
    let cancelled = false
    _mirrorLoadChartJs().then((Chart) => {
      if (cancelled || !Chart || !canvasRef.current) return
      const { labels, values } = _mirrorParseChartData(data)
      const isPie = chartType === 'pie' || chartType === 'doughnut'
      const palette = colors || _MIRROR_CHART_COLORS
      chart = new Chart(canvasRef.current.getContext('2d'), {
        type: chartType === 'doughnut' || chartType === 'donut' ? 'doughnut' : chartType,
        data: {
          labels,
          datasets: [{
            label: title || '',
            data: values,
            backgroundColor: isPie ? palette : palette[0],
            borderColor: palette[0],
            fill: fill !== false,
            tension: tension ?? 0.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: isPie } },
          scales: isPie ? undefined : {
            x: { title: { display: !!xLabel, text: xLabel } },
            y: { title: { display: !!yLabel, text: yLabel }, min, max },
          },
        },
      })
    }).catch(() => { /* CDN unavailable — silent */ })
    return () => { cancelled = true; if (chart) chart.destroy() }
  }, [chartType, data, fill, tension, title, xLabel, yLabel, min, max, colors])
  const wrapStyle = Object.assign({ position: 'relative' }, extraStyle || {})
  return React.createElement('div', { 'data-component': 'Chart', 'data-mirror-name': 'Chart', style: wrapStyle },
    React.createElement('canvas', { ref: canvasRef })
  )
}`

/**
 * Emit `<MirrorChart … />` for a single Chart-primitive instance
 * (`Line`/`Bar`/`Pie`/`Donut`/`Doughnut`/`Area`/`Scatter`/`Radar`).
 * Maps the Mirror primitive name to the matching Chart.js type, then
 * passes data + axis labels + size as JSX props.
 *
 * Donut/Doughnut both map to chartjs `'doughnut'`; Area renders as
 * `'line'` with `fill`. Scatter and Radar map 1:1.
 */
export function generateChartJSX(
  instance: Instance,
  indent: string,
  tokens: TokenDefinition[]
): string {
  // Map Mirror chart primitive name → Chart.js type.
  const typeMap: Record<string, string> = {
    Line: 'line',
    Bar: 'bar',
    Pie: 'pie',
    Donut: 'doughnut',
    Doughnut: 'doughnut',
    Area: 'line',
    Scatter: 'scatter',
    Radar: 'radar',
  }
  const chartType = typeMap[instance.component] ?? 'line'

  const attrs: string[] = []
  attrs.push(`chartType=${JSON.stringify(chartType)}`)

  // Area defaults to fill: true (DOM runtime does the same).
  if (instance.component === 'Area') attrs.push(`fill`)

  let dataExpr = '{}'
  let widthPx: string | null = null
  let heightPx: string | null = null

  for (const prop of instance.properties) {
    const v = prop.values[0]
    // Data binding lives on a `propset`-named property when the user
    // wrote `Line $data, …` — the token reference is the value.
    if (prop.name === 'propset' || prop.name === 'data') {
      if (typeof v === 'object' && v !== null && 'kind' in v && v.kind === 'token') {
        const tokenName = (v as { name: string }).name
        dataExpr = `tokens[${JSON.stringify(tokenName)}]`
      } else if (typeof v === 'string' && v.startsWith('$')) {
        dataExpr = `tokens[${JSON.stringify(v.slice(1))}]`
      }
    } else if (matchesCanonical(prop.name, 'width')) {
      widthPx = `${v}px`
    } else if (matchesCanonical(prop.name, 'height')) {
      heightPx = `${v}px`
    } else if (prop.name === 'fill') {
      // Override the Area default if explicitly set.
    } else if (prop.name === 'tension' || prop.name === 'min' || prop.name === 'max') {
      attrs.push(`${prop.name}={${Number(v)}}`)
    } else if (prop.name === 'title' || prop.name === 'xLabel' || prop.name === 'yLabel') {
      attrs.push(`${prop.name}=${JSON.stringify(String(v))}`)
    }
  }

  attrs.push(`data={${dataExpr}}`)

  const styleParts: string[] = []
  if (widthPx) styleParts.push(`width: '${widthPx}'`)
  if (heightPx) styleParts.push(`height: '${heightPx}'`)
  if (styleParts.length > 0) {
    attrs.push(`style={{ ${styleParts.join(', ')} }}`)
  }

  // Reference `tokens` once so unused-warning gates close cleanly even
  // for charts compiled from an empty token block.
  void tokens
  return `${indent}<MirrorChart ${attrs.join(' ')} />`
}
