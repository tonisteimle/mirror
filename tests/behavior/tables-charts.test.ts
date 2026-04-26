/**
 * Tables + Charts — Behavior Spec (Schicht 2)
 *
 * Sub-Features:
 *   TC1 Table static (TableHeader + TableRow + TableFooter)
 *   TC2 Table data-driven (each in $list)
 *   TC3 Table with where filter
 *   TC4 Table with by sort
 *   TC5 Line chart emits Chart.js config
 *   TC6 Bar / Pie / Donut / Area charts emit correct chart-type
 *   TC7 Charts with size (w/h) emit pixel dimensions
 *   TC8 Charts with colors property
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

interface ChartCall {
  el: any
  config: any
}

let chartCalls: ChartCall[] = []

function render(src: string, container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  chartCalls = []
  g._runtime = {
    createChart: (el: any, config: any) => {
      chartCalls.push({ el, config })
    },
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
    registerExclusiveGroup: () => {},
  }
  if (typeof g.IntersectionObserver === 'undefined') {
    g.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  const fn = new Function(code + '\nreturn createUI();')
  const root = fn() as HTMLElement
  container.appendChild(root)
  return root
}

function findByName(root: Element, name: string): Element | null {
  return root.querySelector(`[data-mirror-name="${name}"]`)
}

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

describe('Tables + Charts — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // ---------------------------------------------------------------------------
  // TC1: Table static
  // ---------------------------------------------------------------------------

  describe('TC1: Table static', () => {
    it('Table + TableHeader + TableRow render with text cells', () => {
      const root = render(
        `Table\n  TableHeader hor, gap 24\n    Text "Name"\n    Text "City"\n  TableRow hor, gap 24\n    Text "Max"\n    Text "Berlin"`,
        container
      )
      expect(findByName(root, 'Table')).toBeTruthy()
      expect(findByName(root, 'TableHeader')).toBeTruthy()
      expect(findByName(root, 'TableRow')).toBeTruthy()
      const txts = Array.from(root.querySelectorAll('span')).map(s => s.textContent?.trim())
      expect(txts).toContain('Name')
      expect(txts).toContain('Max')
    })

    it('Multiple TableRows render', () => {
      const root = render(
        `Table\n  TableHeader hor\n    Text "X"\n  TableRow hor\n    Text "A"\n  TableRow hor\n    Text "B"\n  TableRow hor\n    Text "C"`,
        container
      )
      expect(allByName(root, 'TableRow').length).toBe(3)
    })
  })

  // ---------------------------------------------------------------------------
  // TC2: Table data-driven (each)
  // ---------------------------------------------------------------------------

  describe('TC2: Table data-driven', () => {
    it('each row in $list renders one TableRow per entry', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "A"\n  t2:\n    title: "B"\n  t3:\n    title: "C"\n\nTable\n  TableHeader hor\n    Text "Title"\n  each task in $tasks\n    TableRow hor\n      Text task.title`,
        container
      )
      expect(allByName(root, 'TableRow').length).toBe(3)
      const titles = allByName(root, 'TableRow').map(r => r.textContent?.trim())
      expect(titles).toEqual(['A', 'B', 'C'])
    })
  })

  // ---------------------------------------------------------------------------
  // TC3: Table with where filter
  // ---------------------------------------------------------------------------

  describe('TC3: Table with where filter', () => {
    it('each ... where filters out rows', () => {
      const root = render(
        `tasks:\n  t1:\n    title: "A"\n    status: "done"\n  t2:\n    title: "B"\n    status: "todo"\n  t3:\n    title: "C"\n    status: "todo"\n\nTable\n  each task in $tasks where task.status != "done"\n    TableRow hor\n      Text task.title`,
        container
      )
      expect(allByName(root, 'TableRow').length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // TC4: Table with by sort
  // ---------------------------------------------------------------------------

  describe('TC4: Table with by sort', () => {
    it('each ... by field emits sorted rows (compiles + renders)', () => {
      expect(() =>
        render(
          `tasks:\n  t1:\n    title: "C"\n    priority: 3\n  t2:\n    title: "A"\n    priority: 1\n  t3:\n    title: "B"\n    priority: 2\n\nTable\n  each task in $tasks by priority\n    TableRow hor\n      Text task.title`,
          container
        )
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // TC5: Line chart — compiled-code assertions
  //
  // Chart runtime calls happen via the compiled-in `_runtime` const which
  // shadows any externally-mocked runtime, so we assert on the generated
  // JS source (matching the pattern used by tutorial-15 tests).
  // ---------------------------------------------------------------------------

  describe('TC5: Line chart emits Chart.js config', () => {
    it('Line $sales emits createChart call with type: line', () => {
      const code = generateDOM(
        parse(`sales:\n  Jan: 120\n  Feb: 180\n  Mar: 240\n\nLine $sales, w 400, h 200`)
      )
      expect(code).toContain('_runtime.createChart')
      expect(code).toMatch(/type:\s*'line'/)
    })

    it('Line chart embeds labels from key-value object', () => {
      const code = generateDOM(parse(`sales:\n  Jan: 100\n  Feb: 200\n\nLine $sales, w 400, h 200`))
      expect(code).toContain('Jan')
      expect(code).toContain('Feb')
    })
  })

  // ---------------------------------------------------------------------------
  // TC6: Other chart types
  // ---------------------------------------------------------------------------

  describe('TC6: Other chart types emit correct type', () => {
    it.each([
      ['Bar', 'bar'],
      ['Pie', 'pie'],
      ['Donut', 'doughnut'],
      ['Area', 'line'],
    ])('%s emits type "%s"', (primitive, chartType) => {
      const code = generateDOM(parse(`data:\n  A: 30\n  B: 50\n\n${primitive} $data, w 350, h 180`))
      expect(code).toMatch(new RegExp(`type:\\s*'${chartType}'`))
    })
  })

  // ---------------------------------------------------------------------------
  // TC7: Chart sizing
  // ---------------------------------------------------------------------------

  describe('TC7: Chart sizing', () => {
    it('w 400, h 200 sets pixel dimensions on the chart container', () => {
      const root = render(`data:\n  A: 1\n  B: 2\n\nBar $data, w 400, h 200`, container)
      const chart = findByName(root, 'Bar') as HTMLElement
      expect(chart.style.width).toBe('400px')
      expect(chart.style.height).toBe('200px')
    })
  })

  // ---------------------------------------------------------------------------
  // TC8: Chart colors property
  // ---------------------------------------------------------------------------

  describe('TC8: Chart colors property', () => {
    it('colors property reaches the chart configuration', () => {
      const code = generateDOM(
        parse(`data:\n  A: 1\n  B: 2\n\nBar $data, colors #2271C1, w 200, h 100`)
      )
      // colors emit as a list inside the chart config object
      expect(code.toLowerCase()).toMatch(/2271c1/)
    })
  })
})
