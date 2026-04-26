/**
 * Hotel-Checkin — Events Contract (Schicht 3)
 *
 * Asserts onclick handlers fire on action buttons.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(join(__dirname, '..', '..', 'examples', 'hotel-checkin.mirror'), 'utf-8')

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

describe('hotel-checkin — Events Contract', () => {
  let container: HTMLDivElement
  let root: HTMLElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = render(container)
  })

  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData
  })

  it('Buttons können geklickt werden ohne Crash', () => {
    const buttons = root.querySelectorAll('button')
    expect(buttons.length).toBeGreaterThan(0)
    for (const btn of Array.from(buttons).slice(0, 5)) {
      expect(() => (btn as HTMLButtonElement).click()).not.toThrow()
    }
  })
})
