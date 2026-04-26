/**
 * Portfolio-Advisor — Layout Contract (Schicht 3)
 *
 * The app uses many layout primitives: hor/ver, gap, grid, spread,
 * device-presets. Verify they produce expected rendered structure.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(
  join(__dirname, '..', '..', 'examples', 'portfolio-advisor.mirror'),
  'utf-8'
)

function render(container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(SRC)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  g._runtime = {
    createChart: async () => {},
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

describe('portfolio-advisor — Layout Contract', () => {
  let container: HTMLDivElement
  let root: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = render(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('Top-level container existiert mit display:flex', () => {
    const frames = root.querySelectorAll('[data-mirror-name="Frame"]')
    expect(frames.length).toBeGreaterThan(10)
    // Mostly all Frame elements use flexbox
    const flexed = Array.from(frames).filter(f => (f as HTMLElement).style.display === 'flex')
    expect(flexed.length).toBeGreaterThan(0)
  })

  it('Frame mit hor wird zu flex-direction: row', () => {
    const frames = root.querySelectorAll('[data-mirror-name="Frame"]')
    const horizontal = Array.from(frames).filter(
      f => (f as HTMLElement).style.flexDirection === 'row'
    )
    expect(horizontal.length).toBeGreaterThan(0)
  })
})
