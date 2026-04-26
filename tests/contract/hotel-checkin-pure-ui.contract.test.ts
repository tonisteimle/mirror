/**
 * Hotel-Checkin Pure UI — Contract Test (Schicht 3)
 *
 * Asserts hotel-checkin.mirror's checkbox-driven preferences UI compiles +
 * renders the expected number of checkboxes and that initial checked-state
 * propagates correctly. The hotel-checkin app is a real-world surface for
 * Pure-Mirror UI components.
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

describe('hotel-checkin Pure-UI — Contract', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it('compiles without throwing', () => {
    expect(() => generateDOM(parse(SRC))).not.toThrow()
  })

  it('renders without runtime exception', () => {
    expect(() => render(container)).not.toThrow()
  })

  it('renders all 4 Checkbox components from preferences section', () => {
    const root = render(container)
    const cbs = root.querySelectorAll('[data-mirror-name="Checkbox"]')
    expect(cbs.length).toBe(4)
  })

  it('exactly one Checkbox is initially checked', () => {
    const root = render(container)
    const cbs = Array.from(root.querySelectorAll('[data-mirror-name="Checkbox"]'))
    const checked = cbs.filter(
      cb =>
        (cb as HTMLElement).hasAttribute('checked') ||
        (cb as HTMLElement).dataset.checked === 'true'
    )
    expect(checked.length).toBe(1)
  })

  it('Checkbox elements live alongside their Text label siblings (Frame layout pattern)', () => {
    const root = render(container)
    const cbs = Array.from(root.querySelectorAll('[data-mirror-name="Checkbox"]'))
    // hotel-checkin uses <Frame hor> { Checkbox; Text "label" } — verify the
    // pattern by checking each checkbox has a parent and a sibling Text.
    for (const cb of cbs) {
      const parent = cb.parentElement!
      const siblingText = parent.querySelector('[data-mirror-name="Text"]')
      expect(siblingText).toBeTruthy()
    }
  })
})
