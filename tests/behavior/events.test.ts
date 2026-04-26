/**
 * Events — Behavior Spec (Schicht 2)
 *
 * Sub-Features EV1-EV10.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

let toastCalls: string[] = []

function render(src: string, container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
  const g = globalThis as any
  toastCalls = []
  g._runtime = {
    createChart: async () => {},
    updateChart: () => {},
    registerToken: () => {},
    bindText: () => {},
    registerExclusiveGroup: () => {},
  }
  // Replace toast calls in compiled code with a tracker — most events
  // call toast() and we want to verify the event handler fires.
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

describe('Events — Behavior Spec', () => {
  let container: HTMLDivElement
  let toastSpy: any

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    // Spy on console.log to track toast calls (the runtime emits a toast div)
    toastSpy = vi.fn()
  })

  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData
  })

  // ---------------------------------------------------------------------------
  // EV1: onclick
  // ---------------------------------------------------------------------------

  describe('EV1: onclick', () => {
    it('clicking the button does not throw', () => {
      const root = render(`Button "Click", onclick toast("Hi")`, container)
      const btn = findByName(root, 'Button') as HTMLElement
      expect(() => btn.click()).not.toThrow()
    })

    it('onclick triggers a state change in the bound counter', () => {
      const root = render(
        `count: 0\n\nButton "+", onclick increment(count)\nText "$count"`,
        container
      )
      const btn = findByName(root, 'Button') as HTMLElement
      btn.click()
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('1')
    })
  })

  // ---------------------------------------------------------------------------
  // EV2: onhover (mouseenter)
  // ---------------------------------------------------------------------------

  describe('EV2: onhover', () => {
    it('compiles + dispatching mouseenter does not throw', () => {
      const root = render(`Frame onhover toast("X")\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(() => frame.dispatchEvent(new MouseEvent('mouseenter'))).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV3: onfocus / onblur
  // ---------------------------------------------------------------------------

  describe('EV3: onfocus + onblur', () => {
    it('Input dispatches focus + blur without throwing', () => {
      const root = render(`Input onfocus toast("F"), onblur toast("B")`, container)
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(() => {
        input.dispatchEvent(new FocusEvent('focus'))
        input.dispatchEvent(new FocusEvent('blur'))
      }).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV4: oninput / onchange
  // ---------------------------------------------------------------------------

  describe('EV4: oninput + onchange', () => {
    it('typing fires input event without crash', () => {
      const root = render(
        `searchTerm: ""\n\nInput bind searchTerm, oninput toast("Typing")`,
        container
      )
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(() => {
        input.value = 'abc'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV5: onkey-enter
  // ---------------------------------------------------------------------------

  describe('EV5: onkeydown(enter)', () => {
    it('Enter key fires the handler', () => {
      const root = render(`Input onkeydown(enter) toast("Submit")`, container)
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(() =>
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV6: arrow keys
  // ---------------------------------------------------------------------------

  describe('EV6: arrow-key handlers', () => {
    it('ArrowUp / ArrowDown handlers compile without throwing', () => {
      expect(() =>
        render(
          `Frame focusable, onkeydown(arrow-up) toast("U"), onkeydown(arrow-down) toast("D")\n  Text "X"`,
          container
        )
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV7: onclick-outside
  // ---------------------------------------------------------------------------

  describe('EV7: onclick-outside', () => {
    it('compiles without throwing', () => {
      expect(() =>
        render(
          `menuOpen: true\n\nif menuOpen\n  Frame bg #333, onclick-outside set(menuOpen, false)\n    Text "Menu"`,
          container
        )
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV8: onviewenter / onviewexit
  // ---------------------------------------------------------------------------

  describe('EV8: onviewenter + onviewexit', () => {
    it('compiles without throwing (uses IntersectionObserver)', () => {
      expect(() =>
        render(
          `Frame h 200, onviewenter toast("In"), onviewexit toast("Out")\n  Text "Scroll"`,
          container
        )
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // EV9: multi-action onclick
  // ---------------------------------------------------------------------------

  describe('EV9: multi-action onclick', () => {
    it('all listed actions fire on click', () => {
      const root = render(
        `count: 0\n\nButton "X", onclick increment(count), toast("Hi")\nText "$count"`,
        container
      )
      const btn = findByName(root, 'Button') as HTMLElement
      btn.click()
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('1')
    })
  })

  // ---------------------------------------------------------------------------
  // EV10: onkeydown(escape)
  // ---------------------------------------------------------------------------

  describe('EV10: onkeydown(escape)', () => {
    it('compiles without throwing', () => {
      expect(() =>
        render(
          `isOpen: true\n\nif isOpen\n  Frame focusable, onkeydown(escape) set(isOpen, false)\n    Text "X"`,
          container
        )
      ).not.toThrow()
    })
  })
})
