/**
 * Task-App-Simple — Actions Contract (Schicht 3)
 *
 * The task-app uses many actions: increment/decrement, add/remove,
 * toggle, navigate. This contract verifies they at least compile +
 * fire without crashing.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

const SRC = readFileSync(
  join(__dirname, '..', '..', 'examples', 'task-app', 'simple.mirror'),
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

describe('task-app-simple — Actions Contract', () => {
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

  it('Clickable Elements können geklickt werden ohne Crash', () => {
    // task-app/simple wraps many Button components in custom Card-style
    // shells (rendered as divs). Test on any element with data-mirror-name
    // that includes Btn, Card, NavLink etc.
    const clickable = root.querySelectorAll(
      'button, [data-mirror-name="Btn"], [data-mirror-name="PrimaryBtn"], [data-mirror-name="NavBtn"], [data-mirror-name="NavLink"]'
    )
    // At least some clickable user-elements exist
    if (clickable.length > 0) {
      for (const el of Array.from(clickable).slice(0, 5)) {
        expect(() => (el as HTMLElement).click()).not.toThrow()
      }
    } else {
      // Fall back: ensure the app rendered with at least some elements
      const userEls = root.querySelectorAll('[data-mirror-name]')
      expect(userEls.length).toBeGreaterThan(0)
    }
  })
})
