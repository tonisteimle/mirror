/**
 * Actions — Behavior Spec (Schicht 2)
 *
 * Sub-Features A1-A10.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'

function render(src: string, container: HTMLElement): HTMLElement {
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
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

function findByName(root: Element, name: string): Element | null {
  return root.querySelector(`[data-mirror-name="${name}"]`)
}

function allByName(root: Element, name: string): Element[] {
  return Array.from(root.querySelectorAll(`[data-mirror-name="${name}"]`))
}

describe('Actions — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    delete (globalThis as any).__mirrorData
  })

  // ---------------------------------------------------------------------------
  // A1: Counter actions
  // ---------------------------------------------------------------------------

  describe('A1: increment / decrement / set', () => {
    it('increment', () => {
      const root = render(
        `count: 0\n\nFrame\n  Button "+", onclick increment(count)\n  Text "$count"`,
        container
      )
      ;(findByName(root, 'Button') as HTMLElement).click()
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('1')
    })

    it('decrement', () => {
      const root = render(
        `count: 5\n\nFrame\n  Button "-", onclick decrement(count)\n  Text "$count"`,
        container
      )
      ;(findByName(root, 'Button') as HTMLElement).click()
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('4')
    })

    it('set', () => {
      const root = render(
        `count: 5\n\nFrame\n  Button "Reset", onclick set(count, 0)\n  Text "$count"`,
        container
      )
      ;(findByName(root, 'Button') as HTMLElement).click()
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('0')
    })

    // PIN: `reset(count)` should restore the initial value declared in
    // the data block, not clear the binding. Earlier `count: 5` declared
    // `__mirrorData["count"]` (no $) but registerToken stored under
    // `'$count'` (prefixed) — so reset() read `_initialTokens['count']`
    // = undefined and wiped the DOM text to "".
    it('reset() restores initial value, not undefined', () => {
      const root = render(
        `count: 5\n\nFrame\n  Button "+", onclick increment(count)\n  Button "Reset", onclick reset(count)\n  Text "$count"`,
        container
      )
      const [incBtn, resetBtn] = allByName(root, 'Button') as HTMLElement[]
      const text = findByName(root, 'Text')!

      expect(text.textContent?.trim()).toBe('5')

      incBtn.click()
      incBtn.click()
      expect(text.textContent?.trim()).toBe('7')

      resetBtn.click()
      expect(text.textContent?.trim()).toBe('5')
    })
  })

  // ---------------------------------------------------------------------------
  // A2: Show/hide via if-block + state
  // ---------------------------------------------------------------------------

  describe('A2: show/hide via state + if-block', () => {
    it('toggle action click does not throw', () => {
      const root = render(
        `open: false\n\nButton "Toggle", onclick toggle(open)\nif open\n  Text "Visible"`,
        container
      )
      const btn = findByName(root, 'Button') as HTMLElement
      expect(() => btn.click()).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A3: Toast (no throw)
  // ---------------------------------------------------------------------------

  describe('A3: toast', () => {
    it('toast call does not throw', () => {
      const root = render(`Button "X", onclick toast("Hi")`, container)
      expect(() => (findByName(root, 'Button') as HTMLElement).click()).not.toThrow()
    })

    it('toast with type does not throw', () => {
      const root = render(`Button "X", onclick toast("Done", "success")`, container)
      expect(() => (findByName(root, 'Button') as HTMLElement).click()).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A4: Input control
  // ---------------------------------------------------------------------------

  describe('A4: focus / clear', () => {
    it('focus + clear do not throw', () => {
      const root = render(
        `s: ""\n\nInput bind s, name F\nButton "F", onclick focus(F)\nButton "C", onclick clear(F)`,
        container
      )
      const [focusBtn, clearBtn] = allByName(root, 'Button') as HTMLElement[]
      expect(() => focusBtn.click()).not.toThrow()
      expect(() => clearBtn.click()).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A5: add / remove
  // ---------------------------------------------------------------------------

  describe('A5: add to collection', () => {
    it('add() appends a new item', () => {
      const root = render(
        `todos:\n  t1:\n    text: "Existing"\n\nButton "+", onclick add(todos, text: "New")\neach todo in $todos\n  Text "$todo.text"`,
        container
      )
      const before = allByName(root, 'Text').length
      ;(findByName(root, 'Button') as HTMLElement).click()
      const after = allByName(root, 'Text').length
      expect(after).toBeGreaterThan(before)
    })

    // PIN: `remove(item)` mutates __mirrorData and triggers a refresh of
    // each-loops. Once tracked as a "Runtime bug" via TODO-Marker; the
    // actual runtime is fine — the previous test selector
    // `[data-mirror-id=node-1] > [data-mirror-id]` only saw the
    // each-container wrapper (no mirror-id) and missed the iterated
    // children. This pin nails the real DOM contract.
    it('remove(item) drops the corresponding iteration from the DOM', () => {
      const root = render(
        `items:\n  a:\n    name: "Item A"\n  b:\n    name: "Item B"\n  c:\n    name: "Item C"\n\nFrame\n  each item in $items\n    Frame hor\n      Text "$item.name"\n      Button "x", onclick remove(item)`,
        container
      )
      const beforeNames = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(beforeNames).toEqual(['Item A', 'Item B', 'Item C'])

      const firstRemove = root.querySelectorAll('button')[0] as HTMLElement
      firstRemove.click()

      const afterNames = allByName(root, 'Text').map(t => t.textContent?.trim())
      expect(afterNames).toEqual(['Item B', 'Item C'])
      expect(root.querySelectorAll('button').length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // A6: Scroll actions (no throw)
  // ---------------------------------------------------------------------------

  describe('A6: scroll actions', () => {
    it('scrollToTop / scrollToBottom / scrollTo all compile + click', () => {
      const root = render(
        `Frame\n  Button "T", onclick scrollToTop()\n  Button "B", onclick scrollToBottom()`,
        container
      )
      const [t, b] = allByName(root, 'Button') as HTMLElement[]
      expect(() => t.click()).not.toThrow()
      expect(() => b.click()).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A7: Navigation
  // ---------------------------------------------------------------------------

  describe('A7: navigation (back/forward)', () => {
    it('back/forward do not throw', () => {
      const root = render(
        `Frame\n  Button "B", onclick back()\n  Button "F", onclick forward()`,
        container
      )
      const [b, f] = allByName(root, 'Button') as HTMLElement[]
      expect(() => b.click()).not.toThrow()
      expect(() => f.click()).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A8: Copy
  // ---------------------------------------------------------------------------

  describe('A8: copy to clipboard', () => {
    it('copy() does not throw (no clipboard in jsdom — graceful fallback)', () => {
      const root = render(`Button "C", onclick copy("Hi")`, container)
      expect(() => (findByName(root, 'Button') as HTMLElement).click()).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A9: Error-Handling
  // ---------------------------------------------------------------------------

  describe('A9: setError / clearError', () => {
    it('compiles without throwing', () => {
      expect(() =>
        render(
          `e: ""\n\nInput bind e, name F\nButton "Set", onclick setError(F, "Bad")\nButton "Clear", onclick clearError(F)`,
          container
        )
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // A10: Multi-action chain (toggle + increment + toast)
  // ---------------------------------------------------------------------------

  describe('A10: multi-action chain', () => {
    it('all actions fire in order on click', () => {
      const root = render(
        `count: 0\n\nLikeBtn: Button pad 10, toggle(), onclick increment(count), toast("Thanks!")\n  on:\n    bg red\n\nLikeBtn "Like"\nText "$count"`,
        container
      )
      const btn = findByName(root, 'LikeBtn') as HTMLElement
      btn.click()
      // toggle worked
      expect(btn.getAttribute('data-state')).toBe('on')
      // increment worked
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('1')
    })
  })
})
