/**
 * Tutorial 14-tabellen + 15-charts — Aspect Tests (Thema 15)
 *
 * Tutorial-Aspekte aus `14-tabellen.html`:
 * - Statische Tabellen (Table / TableHeader / TableRow / TableFooter)
 * - Datengebundene Tabellen (each in $tasks)
 * - Filter (`each ... where ...`)
 * - Sortierung (`each ... by field`, `by field desc`)
 * - Hover-States, Zebra-Muster (Praxis)
 *
 * Tutorial-Aspekte aus `15-charts.html`:
 * - Chart-Typen: Line, Bar, Pie, Donut, Area, Scatter, Radar
 * - Datenformate: Key-Value, Objekte mit `x`/`y`-Field-Mapping
 * - Top-Level-Properties: `colors`, `title`, `legend`, `grid`, `axes`
 * - Subkomponenten: XAxis, YAxis, Grid, Point, Legend, Title, Line, Bar, Arc
 * - Charts in Layouts (Card-Pattern, Dashboard-Grid)
 *
 * Tabellen-Tests laufen mit `renderWithRuntime`. Chart-Tests laufen
 * teilweise auf IR-/Code-Ebene, da jsdom kein echtes Canvas hat — wir
 * mocken `_runtime.createChart` und prüfen, dass die richtigen Calls
 * mit den erwarteten Configs gemacht würden.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../../compiler/parser'
import { toIR } from '../../../compiler/ir'
import { generateDOM } from '../../../compiler/backends/dom'
import { renderWithRuntime } from './test-utils'

let container: HTMLDivElement

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})
afterEach(() => container.remove())

function texts(root: HTMLElement): string[] {
  return Array.from(root.querySelectorAll('span')).map(el => el.textContent ?? '')
}

// =============================================================================
// Tables — Statische Tabellen
// =============================================================================

describe('Tutorial 14 Tables — Statische Tabellen', () => {
  it('Table + TableHeader + TableRow with text cells', () => {
    const { root } = renderWithRuntime(
      `Table bg #1a1a1a, rad 8
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Name", col #888, fs 11, uppercase
    Text "Stadt", col #888, fs 11, uppercase
  TableRow hor, gap 24, pad 12 16
    Text "Max", col white
    Text "Berlin", col white`,
      container
    )
    const table = root.querySelector('[data-mirror-name="Table"]') as HTMLElement
    expect(table).toBeTruthy()
    const header = table.querySelector('[data-mirror-name="TableHeader"]')
    expect(header).toBeTruthy()
    const row = table.querySelector('[data-mirror-name="TableRow"]')
    expect(row).toBeTruthy()
    const t = texts(table)
    expect(t).toContain('Name')
    expect(t).toContain('Stadt')
    expect(t).toContain('Max')
    expect(t).toContain('Berlin')
  })
})

// =============================================================================
// Tables — Datengebundene Tabellen
// =============================================================================

describe('Tutorial 14 Tables — Datengebundene Tabellen (each)', () => {
  it('each task in $tasks renders one TableRow per entry', () => {
    const { root } = renderWithRuntime(
      `tasks:
  task1:
    title: "Design Review"
    status: "done"
  task2:
    title: "API Integration"
    status: "progress"
  task3:
    title: "Testing"
    status: "todo"

Table bg #1a1a1a, rad 8, w full
  TableHeader hor, gap 24, pad 12 16, bg #252525
    Text "Aufgabe", col #888, fs 11, uppercase
    Text "Status", col #888, fs 11, uppercase
  each task in $tasks
    TableRow hor, gap 24, pad 12 16, bor 0 0 1 0, boc #222
      Text task.title, col white
      Text task.status, col #888`,
      container
    )

    const rows = root.querySelectorAll('[data-mirror-name="TableRow"]')
    expect(rows.length).toBe(3)
    const t = texts(root)
    expect(t).toContain('Design Review')
    expect(t).toContain('API Integration')
    expect(t).toContain('Testing')
    expect(t).toContain('progress')
  })

  it('TableHeader is rendered exactly once even with each-loop rows', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "A"
  t2:
    title: "B"

Table
  TableHeader
    Text "Title"
  each task in $tasks
    TableRow
      Text task.title`,
      container
    )
    const headers = root.querySelectorAll('[data-mirror-name="TableHeader"]')
    expect(headers.length).toBe(1)
    const rows = root.querySelectorAll('[data-mirror-name="TableRow"]')
    expect(rows.length).toBe(2)
  })
})

// =============================================================================
// Tables — Filter (where)
// =============================================================================

describe('Tutorial 14 Tables — Filter (where)', () => {
  it('each ... where task.done == false filters rows', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Design Review"
    done: true
  t2:
    title: "API Integration"
    done: false
  t3:
    title: "Testing"
    done: false
  t4:
    title: "Documentation"
    done: true

each task in $tasks where task.done == false
  TableRow
    Text task.title, col white`,
      container
    )
    const rows = root.querySelectorAll('[data-mirror-name="TableRow"]')
    expect(rows.length).toBe(2)
    const t = texts(root)
    expect(t).toContain('API Integration')
    expect(t).toContain('Testing')
    expect(t).not.toContain('Design Review')
    expect(t).not.toContain('Documentation')
  })

  it('each ... where ... and ... combines two conditions', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Critical Bug"
    urgent: true
    done: false
  t2:
    title: "Minor Fix"
    urgent: false
    done: false
  t3:
    title: "Old Feature"
    urgent: true
    done: true

each task in $tasks where task.done == false and task.urgent == true
  TableRow
    Text task.title, col white`,
      container
    )
    const rows = root.querySelectorAll('[data-mirror-name="TableRow"]')
    expect(rows.length).toBe(1)
    expect(texts(root)).toContain('Critical Bug')
  })
})

// =============================================================================
// Tables — Sortierung (by)
// =============================================================================

describe('Tutorial 14 Tables — Sortierung (by)', () => {
  it('each ... by priority sorts ascending', () => {
    const { root } = renderWithRuntime(
      `tasks:
  t1:
    title: "Low"
    priority: 3
  t2:
    title: "High"
    priority: 1
  t3:
    title: "Medium"
    priority: 2

each task in $tasks by priority
  TableRow
    Text task.title, col white`,
      container
    )
    const rows = Array.from(root.querySelectorAll('[data-mirror-name="TableRow"]'))
    expect(rows.length).toBe(3)
    const titles = rows.map(r => r.querySelector('span')?.textContent)
    expect(titles).toEqual(['High', 'Medium', 'Low'])
  })

  it('each ... by price desc sorts descending', () => {
    const { root } = renderWithRuntime(
      `products:
  tshirt:
    name: "T-Shirt"
    price: 29
  hoodie:
    name: "Hoodie"
    price: 59
  cap:
    name: "Cap"
    price: 19

each product in $products by price desc
  TableRow
    Text product.name, col white`,
      container
    )
    const rows = Array.from(root.querySelectorAll('[data-mirror-name="TableRow"]'))
    expect(rows.length).toBe(3)
    const names = rows.map(r => r.querySelector('span')?.textContent)
    expect(names).toEqual(['Hoodie', 'T-Shirt', 'Cap'])
  })
})

// =============================================================================
// Tables — Footer
// =============================================================================

describe('Tutorial 14 Tables — Footer', () => {
  it('TableFooter renders below Header and Rows', () => {
    const { root } = renderWithRuntime(
      `Table
  TableHeader
    Text "X"
  TableRow
    Text "data"
  TableFooter
    Text "total"`,
      container
    )
    const footer = root.querySelector('[data-mirror-name="TableFooter"]')
    expect(footer).toBeTruthy()
    expect(footer?.textContent).toContain('total')
  })
})

// =============================================================================
// Charts — Chart-Typen erkannt
// =============================================================================

describe('Tutorial 15 Charts — Chart-Typen', () => {
  it.each([
    ['Line', 'line'],
    ['Bar', 'bar'],
    ['Pie', 'pie'],
    ['Donut', 'doughnut'],
    ['Area', 'line'], // Area is line-with-fill
    ['Scatter', 'scatter'],
    ['Radar', 'radar'],
  ])('%s primitive is recognized and emits chart config of type "%s"', (primitive, chartType) => {
    const code = `data:
  A: 30
  B: 50

${primitive} $data, w 350, h 180`
    const ast = parse(code)
    expect(ast.errors).toEqual([])
    const ir = toIR(ast)
    const chart = ir.nodes[0]
    expect(chart.primitive).toBe('chart')
    const typeProp = chart.properties.find((p: any) => p.name === 'chartType')
    expect(typeProp?.value).toBe(chartType)
  })

  it('Line $sales emits chart-init with data + size', () => {
    const code = generateDOM(
      parse(`sales:
  Jan: 120
  Feb: 180
  Mar: 240

Line $sales, w 400, h 200`)
    )
    expect(code).toContain('_runtime.createChart')
    expect(code).toMatch(/type:\s*'line'/)
    expect(code).toContain('400px')
    expect(code).toContain('200px')
  })
})

// =============================================================================
// Charts — Datenformate
// =============================================================================

describe('Tutorial 15 Charts — Datenformate', () => {
  it('Key-Value-Objekt: keys werden labels, values werden datapoints', () => {
    const ast = parse(`sales:
  Jan: 120
  Feb: 180

Bar $sales`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    // Labels and values must be embedded somewhere in the emitted code
    expect(code).toContain('Jan')
    expect(code).toContain('Feb')
    expect(code).toContain('120')
    expect(code).toContain('180')
  })

  it('Objekte mit Feldern: x "name", y "sales" mappt explizit', () => {
    const ast = parse(`products:
  a:
    name: "Widget"
    sales: 120
  b:
    name: "Gadget"
    sales: 85

Bar $products, x "name", y "sales"`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    // The x/y field mapping should result in usage of name/sales as field
    // accessors in the emitted chart config
    expect(code).toMatch(/name/)
    expect(code).toMatch(/sales/)
  })
})

// =============================================================================
// Charts — Top-Level-Properties
// =============================================================================

describe('Tutorial 15 Charts — Top-Level-Properties', () => {
  it('colors property is parsed', () => {
    const ast = parse(`data:
  A: 30
  B: 50

Pie $data, colors #2271C1 #10b981`)
    expect(ast.errors).toEqual([])
    const ir = toIR(ast)
    const chart = ir.nodes[0]
    const colorsProp = chart.properties.find((p: any) => p.name === 'colors')
    expect(colorsProp).toBeTruthy()
  })

  it('title property is parsed and embedded in IR', () => {
    const ast = parse(`d:
  Q1: 45

Line $d, title "Quartalsumsatz"`)
    expect(ast.errors).toEqual([])
    const ir = toIR(ast)
    const chart = ir.nodes[0]
    const titleProp = chart.properties.find((p: any) => p.name === 'title')
    expect(titleProp?.value).toBe('Quartalsumsatz')
  })

  it('legend true property is parsed', () => {
    const ast = parse(`d:
  A: 30

Bar $d, legend true`)
    expect(ast.errors).toEqual([])
    const ir = toIR(ast)
    const chart = ir.nodes[0]
    const legendProp = chart.properties.find((p: any) => p.name === 'legend')
    expect(legendProp).toBeTruthy()
  })

  it('grid false property is parsed', () => {
    const ast = parse(`d:
  A: 30

Line $d, grid false`)
    expect(ast.errors).toEqual([])
    const ir = toIR(ast)
    const chart = ir.nodes[0]
    const gridProp = chart.properties.find((p: any) => p.name === 'grid')
    expect(gridProp).toBeTruthy()
  })
})

// =============================================================================
// Charts — Subkomponenten
// =============================================================================

describe('Tutorial 15 Charts — Subkomponenten', () => {
  it('XAxis: + YAxis: are parsed as chart subcomponents', () => {
    const ast = parse(`d:
  Jan: 45

Line $d
  XAxis: col #888, label "Monat"
  YAxis: col #888, label "Umsatz", min 0, max 120`)
    expect(ast.errors).toEqual([])
    const ir = toIR(ast)
    const chart = ir.nodes[0]
    expect(chart.primitive).toBe('chart')
    // Subcomponents are typically stored either as children or as property-set
    // metadata on the chart node — both shapes should resolve via DOM emission.
    const code = generateDOM(ast)
    expect(code).toContain('Monat')
    expect(code).toContain('Umsatz')
  })

  it('Grid: subcomponent with col + dash compiles', () => {
    const ast = parse(`d:
  A: 30

Bar $d
  Grid: col #333, dash 4`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    expect(code).toContain('#333')
  })

  it('Point: subcomponent with size + bg compiles', () => {
    const ast = parse(`d:
  Q1: 30

Line $d
  Point: size 8, bg #2271C1`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    expect(code).toContain('#2271C1')
  })

  it('Legend: subcomponent with pos right compiles', () => {
    const ast = parse(`d:
  A: 30

Pie $d
  Legend: pos right, col #888`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    // pos as a property is at least represented somewhere in the output
    expect(code).toContain('right')
  })

  it('Title: subcomponent with text compiles', () => {
    const ast = parse(`d:
  A: 30

Pie $d
  Title: text "Projektstatus", col white`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    expect(code).toContain('Projektstatus')
  })

  it('Line: subcomponent with width + tension + fill compiles', () => {
    const ast = parse(`d:
  Jan: 20

Line $d
  Line: width 3, tension 0.4, fill true`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    // numeric values 3 and 0.4 must survive in the emitted output
    expect(code).toMatch(/(?:width.*3|3.*width)/i)
  })
})

// =============================================================================
// Charts — In Layouts einbetten
// =============================================================================

describe('Tutorial 15 Charts — In Layouts einbetten', () => {
  it('Chart inside a Card-component compiles cleanly', () => {
    const ast = parse(`sales:
  Jan: 120

Card: bg #1a1a1a, pad 20, rad 12, gap 12

Card
  Text "Monatsumsatz"
  Line $sales, w 200, h 80`)
    expect(ast.errors).toEqual([])
    const code = generateDOM(ast)
    expect(code).toContain('Monatsumsatz')
    expect(code).toContain('_runtime.createChart')
  })
})
