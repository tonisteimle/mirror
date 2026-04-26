/**
 * Portfolio-Advisor — Properties Contract (Schicht 3)
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

describe('portfolio-advisor — Properties Contract', () => {
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

  it('Frame elements have padding/gap from tokens', () => {
    const frames = root.querySelectorAll('[data-mirror-name="Frame"]')
    const padded = Array.from(frames).filter(f => (f as HTMLElement).style.padding !== '')
    expect(padded.length).toBeGreaterThan(5)
  })

  it('StatCard elements have border-radius (rounded corners)', () => {
    const stats = root.querySelectorAll('[data-mirror-name="StatCard"]')
    expect(stats.length).toBe(4)
    for (const s of Array.from(stats)) {
      expect((s as HTMLElement).style.borderRadius).not.toBe('')
    }
  })
})
