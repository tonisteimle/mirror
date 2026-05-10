/**
 * Tables + Charts — Differential Testing (Schicht 4)
 *
 * Documentation: docs/archive/concepts/tables-charts-backend-support.md.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const TABLE_STATIC = `Table\n  TableHeader hor\n    Text "Name"\n  TableRow hor\n    Text "Max"`
const TABLE_EACH = `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n\nTable\n  TableHeader hor\n    Text "T"\n  each task in $tasks\n    TableRow hor\n      Text task.title`

const CHART_LINE = `data:\n  A: 30\n  B: 50\n\nLine $data, w 350, h 180`
const CHART_BAR = `data:\n  A: 1\n  B: 2\n\nBar $data, w 350, h 180`
const CHART_PIE = `data:\n  A: 1\n  B: 2\n\nPie $data, w 250, h 250`
const CHART_DONUT = `data:\n  A: 1\n  B: 2\n\nDonut $data, w 250, h 250`
const CHART_AREA = `data:\n  A: 1\n  B: 2\n\nArea $data, w 350, h 180`

describe('Tables — Backend support', () => {
  it.each([
    ['static Table', TABLE_STATIC],
    ['each-driven Table', TABLE_EACH],
  ])('%s compiles in DOM, React, Framework', (_name, src) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })

  it('static Table renders TableHeader + TableRow + cell text in all 3 backends', () => {
    const dom = generateDOM(parse(TABLE_STATIC))
    const react = generateReact(parse(TABLE_STATIC))
    const fw = generateFramework(parse(TABLE_STATIC))

    for (const out of [dom, react, fw]) {
      expect(out).toContain('TableHeader')
      expect(out).toContain('TableRow')
      expect(out).toContain('Name')
      expect(out).toContain('Max')
    }
  })

  it('DOM emits each-loop for $tasks-driven Table', () => {
    const code = generateDOM(parse(TABLE_EACH))
    // each-loop emits a forEach over the data
    expect(code).toMatch(/forEach|for\s*\(/)
  })

  // each-driven rows now render in all three backends:
  //   - DOM: forEach loop in compiled JS
  //   - Framework: `M.each(...)` wrapper
  //   - React: `.map()` over tokens.<collection>, with object-keyed
  //     collections coerced via Object.values
  it('each-driven TableRow: rendered in DOM, Framework, and React', () => {
    const dom = generateDOM(parse(TABLE_EACH))
    const react = generateReact(parse(TABLE_EACH))
    const fw = generateFramework(parse(TABLE_EACH))

    expect(dom).toContain('TableRow')
    expect(fw).toContain('TableRow')
    expect(fw).toMatch(/M\.each\(/)
    expect(react).toContain('TableRow')
    expect(react).toMatch(/\.map\(/)
    // Loop-var reference in text content lands as JSX expression.
    expect(react).toContain('{task.title}')
  })
})

describe('Charts — Backend support', () => {
  it.each([
    ['Line', CHART_LINE],
    ['Bar', CHART_BAR],
    ['Pie', CHART_PIE],
    ['Donut', CHART_DONUT],
    ['Area', CHART_AREA],
  ])('%s compiles in DOM, React, Framework', (_name, src) => {
    expect(() => generateDOM(parse(src))).not.toThrow()
    expect(() => generateReact(parse(src))).not.toThrow()
    expect(() => generateFramework(parse(src))).not.toThrow()
  })

  it.each([
    ['Line', 'line', CHART_LINE],
    ['Bar', 'bar', CHART_BAR],
    ['Pie', 'pie', CHART_PIE],
    ['Donut', 'doughnut', CHART_DONUT],
    ['Area', 'line', CHART_AREA],
  ])('%s emits chart-type "%s" in DOM', (_name, chartType, src) => {
    const code = generateDOM(parse(src))
    expect(code).toMatch(new RegExp(`type:\\s*'${chartType}'`))
  })

  it('DOM chart emits createChart runtime call', () => {
    const code = generateDOM(parse(CHART_LINE))
    expect(code).toContain('_runtime.createChart')
  })

  // PIN: all three backends wire charts now — different mechanisms.
  //   DOM:       imperative `_runtime.createChart(...)` call.
  //   React:     embeds a `<MirrorChart>` component that loads Chart.js
  //              from CDN on mount and creates the chart in a canvas.
  //   Framework: passes the chart props (`chartType`, `data`, `fill`,
  //              `tension` + axis hints) through the M-prop bag for the
  //              mirror-runtime to render.
  it('all three backends wire chart rendering', () => {
    const react = generateReact(parse(CHART_LINE))
    const fw = generateFramework(parse(CHART_LINE))

    // React: MirrorChart component + Chart.js CDN loader.
    expect(react).toContain('MirrorChart')
    expect(react).toMatch(/cdn\.jsdelivr\.net.*chart\.js/)
    expect(react).toMatch(/<MirrorChart\s+chartType="line"/)

    // Framework: passes chart props through.
    expect(fw).toMatch(/M\(\s*['"]Line['"]/)
    expect(fw).toMatch(/chartType:\s*['"]line['"]/)
    expect(fw).toMatch(/data:\s*['"]\$data['"]/)
  })

  it('React skips MirrorChart when no chart is used (bundle guard)', () => {
    const react = generateReact(parse(`Frame bg #2271C1, w 100`))
    expect(react).not.toContain('MirrorChart')
    expect(react).not.toMatch(/cdn\.jsdelivr\.net.*chart\.js/)
  })
})
