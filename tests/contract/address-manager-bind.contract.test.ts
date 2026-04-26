/**
 * Address-Manager Bind Contract — Schicht 3 der Test-Pyramide
 *
 * Adresses focuses on `bind selectedAddress` (exclusive-bind via
 * AddressCard) and the form-input bindings for editing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(join(__dirname, '..', '..', 'examples', 'address-manager.mirror'), 'utf-8')

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

describe('address-manager — Bind Contract', () => {
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

  it('AddressCard rendert 4 Karten mit data-state', () => {
    // The list of address cards uses `exclusive(), bind selectedAddress`.
    // PIN: exclusive-bind doesn't propagate `data-bind` to instance elements
    // (it uses a runtime registry `registerExclusiveGroup` instead). All
    // cards get data-state="default" until selection changes.
    const cards = root.querySelectorAll('[data-mirror-name="AddressCard"]')
    expect(cards.length).toBe(4)
    const states = Array.from(cards).map(c => c.getAttribute('data-state'))
    // All start in "default" state (no selection initially)
    expect(states.every(s => s === 'default')).toBe(true)
  })

  it('Edit-Form Inputs haben data-bind Attribute', () => {
    // The edit form binds inputs to the address fields
    const inputs = root.querySelectorAll('input[data-bind]')
    expect(inputs.length).toBeGreaterThan(0)
  })
})
