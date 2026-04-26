/**
 * Bind — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft die observable Semantik des Bind-Features:
 *  - One-way (Text $var, Frame bg $var)
 *  - Two-way Input bind, mit Mask
 *  - Bind in each-Loop, auf Object-Properties, exclusive
 *  - Initial-Value, Re-Render bei State-Wechsel
 *
 * Sub-Features B1-B10 aus docs/concepts/feature-test-execution-plan.md.
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

describe('Bind — Behavior Spec', () => {
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
  // B1-B2: One-way bind
  // ---------------------------------------------------------------------------

  describe('B1: one-way text-bind via interpolation', () => {
    it('Text "$var" renders the variable value', () => {
      const root = render(`name: "Max"\n\nText "$name"`, container)
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Max')
    })
  })

  describe('B2: one-way style-bind', () => {
    it('Frame bg $color resolves to var(--color)', () => {
      const root = render(`color: "#2271C1"\n\nFrame bg $color`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('var(--color)')
    })
  })

  // ---------------------------------------------------------------------------
  // B3: Two-way Input bind
  // ---------------------------------------------------------------------------

  describe('B3: two-way `Input bind var`', () => {
    it('emits data-bind attribute with the variable name', () => {
      const root = render(`searchTerm: ""\n\nInput bind searchTerm`, container)
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(input.getAttribute('data-bind')).toBe('searchTerm')
    })

    it('initial-value: input.value reflects the variable', () => {
      const root = render(`searchTerm: "initial"\n\nInput bind searchTerm`, container)
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(input.value).toBe('initial')
    })
  })

  // ---------------------------------------------------------------------------
  // B4: Bind in each-loop (Bug #30 pinned)
  // ---------------------------------------------------------------------------

  describe('B4: bind on loop-variable-property (Bug #30 pinned)', () => {
    it('PIN Bug #30: `bind item.value` in each-loop does not init/track', () => {
      const root = render(
        `items:\n  a:\n    label: "A"\n    value: "x"\n  b:\n    label: "B"\n    value: "y"\n\neach item in $items\n  Input bind item.value`,
        container
      )
      const inputs = allByName(root, 'Input') as HTMLInputElement[]
      expect(inputs.length).toBe(2)
      // Today: input.value is empty, data-bind is null
      // (would expect "x" and "y" if working)
      expect(inputs[0].value).toBe('')
      expect(inputs[0].getAttribute('data-bind')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // B5: Input mask
  // ---------------------------------------------------------------------------

  describe('B5: Input mask + bind', () => {
    it('Input bind phone with mask attribute compiles', () => {
      const root = render(
        `phone: ""\n\nInput mask "###-####", bind phone, placeholder "Tel"`,
        container
      )
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(input.getAttribute('data-bind')).toBe('phone')
      expect(input.getAttribute('placeholder')).toBe('Tel')
    })
  })

  // ---------------------------------------------------------------------------
  // B6: Exclusive bind
  // ---------------------------------------------------------------------------

  describe('B6: exclusive() with bind', () => {
    it('compiles without crash and renders all tabs', () => {
      const root = render(
        `selected: "home"\n\nTab: Button pad 12, exclusive(), bind selected\n\nFrame hor\n  Tab "Home"\n  Tab "Profile"`,
        container
      )
      expect(allByName(root, 'Tab').length).toBe(2)
    })
  })

  // ---------------------------------------------------------------------------
  // B7: Object-property bind (Bug #31 pinned)
  // ---------------------------------------------------------------------------

  describe('B7: bind on `user.email` (Bug #31 pinned)', () => {
    it('PIN Bug #31: `bind user.email` binds to `user` (the whole object) instead', () => {
      const root = render(
        `user:\n  name: "Max"\n  email: "max@example.com"\n\nInput bind user.email`,
        container
      )
      const input = findByName(root, 'Input') as HTMLInputElement
      // Today: data-bind is "user" only, dot-path lost. Value becomes "[object Object]".
      expect(input.getAttribute('data-bind')).toBe('user')
      expect(input.value).toBe('[object Object]')
    })
  })

  // ---------------------------------------------------------------------------
  // B8: Cross-element interpolation
  // ---------------------------------------------------------------------------

  describe('B8: bind value reflected in other elements', () => {
    it('Text "$value" reflects the bound variable value', () => {
      const root = render(
        `value: "hello"\n\nFrame\n  Input bind value\n  Text "Echo: $value"`,
        container
      )
      const text = findByName(root, 'Text')!
      expect(text.textContent?.trim()).toBe('Echo: hello')
    })

    it('compile-time-resolvable string-property access works', () => {
      const root = render(`value: "hello"\n\nFrame\n  Text "Length: $value.length"`, container)
      const text = findByName(root, 'Text')!
      expect(text.textContent?.trim()).toBe('Length: 5')
    })
  })

  // ---------------------------------------------------------------------------
  // B9: Counter / re-render
  // ---------------------------------------------------------------------------

  describe('B9: counter variable + onclick action triggers re-render', () => {
    it('Initial render shows counter value', () => {
      const root = render(
        `counter: 0\n\nFrame\n  Text "Count: $counter"\n  Button "+", onclick increment(counter)`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Count: 0')
    })

    it('after click, counter increments and re-renders', () => {
      const root = render(
        `counter: 0\n\nFrame\n  Text "Count: $counter"\n  Button "+", onclick increment(counter)`,
        container
      )
      const btn = findByName(root, 'Button') as HTMLButtonElement
      btn.click()
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Count: 1')
    })
  })

  // ---------------------------------------------------------------------------
  // B10: Initial-value
  // ---------------------------------------------------------------------------

  describe('B10: Input bind has initial-value from variable', () => {
    it('Input.value reflects the variable initial-value', () => {
      const root = render(`name: "Max Mustermann"\n\nInput bind name`, container)
      const input = findByName(root, 'Input') as HTMLInputElement
      expect(input.value).toBe('Max Mustermann')
    })
  })
})
