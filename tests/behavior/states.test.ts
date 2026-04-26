/**
 * States — Behavior Spec (Schicht 2 der Test-Pyramide)
 *
 * Prüft toggle()/exclusive()/system-states observable Semantik.
 *
 * Sub-Features S1-S10.
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

describe('States — Behavior Spec', () => {
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
  // S1-S2: Basic toggle()
  // ---------------------------------------------------------------------------

  describe('S1: basic toggle()', () => {
    it('starts in default state', () => {
      const root = render(
        `Btn: Button pad 10, bg #333, toggle()\n  on:\n    bg #ef4444\n\nBtn "X"`,
        container
      )
      const btn = findByName(root, 'Btn') as HTMLElement
      expect(btn.getAttribute('data-state')).toBe('default')
    })

    it('cycles to "on" on click', () => {
      const root = render(
        `Btn: Button pad 10, bg #333, toggle()\n  on:\n    bg #ef4444\n\nBtn "X"`,
        container
      )
      const btn = findByName(root, 'Btn') as HTMLElement
      btn.click()
      expect(btn.getAttribute('data-state')).toBe('on')
    })

    it('cycles back to default on second click', () => {
      const root = render(
        `Btn: Button pad 10, toggle()\n  on:\n    bg #ef4444\n\nBtn "X"`,
        container
      )
      const btn = findByName(root, 'Btn') as HTMLElement
      btn.click()
      btn.click()
      expect(btn.getAttribute('data-state')).toBe('default')
    })
  })

  describe('S2: instance with `on` initial state', () => {
    it('starts in `on` state when instance has `on` flag', () => {
      const root = render(
        `Like: Button pad 10, bg #333, toggle()\n  on:\n    bg #ef4444\n\nLike "Liked", on`,
        container
      )
      const like = findByName(root, 'Like') as HTMLElement
      expect(like.getAttribute('data-state')).toBe('on')
    })
  })

  // ---------------------------------------------------------------------------
  // S3: With transition
  // ---------------------------------------------------------------------------

  describe('S3: state with transition (duration + easing)', () => {
    it('compiles without throwing; state-cycling works', () => {
      const root = render(
        `Btn: Button pad 10, toggle()\n  on 0.2s ease-out:\n    bg #2271C1\n\nBtn "X"`,
        container
      )
      const btn = findByName(root, 'Btn') as HTMLElement
      btn.click()
      expect(btn.getAttribute('data-state')).toBe('on')
    })
  })

  // ---------------------------------------------------------------------------
  // S4: Multi-state cycle
  // ---------------------------------------------------------------------------

  describe('S4: multi-state cycle (toggle through all)', () => {
    it('starts in initial state when specified on instance', () => {
      const root = render(
        `TaskStatus: Button pad 8, toggle()\n  todo:\n    bg #333\n  doing:\n    bg #f59e0b\n  done:\n    bg #10b981\n\nTaskStatus "X", todo`,
        container
      )
      const status = findByName(root, 'TaskStatus') as HTMLElement
      expect(status.getAttribute('data-state')).toBe('todo')
    })

    it('clicks cycle through declared states in order', () => {
      const root = render(
        `TaskStatus: Button pad 8, toggle()\n  todo:\n    bg #333\n  doing:\n    bg #f59e0b\n  done:\n    bg #10b981\n\nTaskStatus "X", todo`,
        container
      )
      const status = findByName(root, 'TaskStatus') as HTMLElement
      status.click()
      expect(status.getAttribute('data-state')).toBe('doing')
      status.click()
      expect(status.getAttribute('data-state')).toBe('done')
      status.click()
      expect(status.getAttribute('data-state')).toBe('todo')
    })
  })

  // ---------------------------------------------------------------------------
  // S5: State-style overrides
  // ---------------------------------------------------------------------------

  describe('S5: state-style overrides base properties', () => {
    it('after click, overridden properties take effect', () => {
      const root = render(
        `Btn: Button pad 10, bg #333, fs 14, toggle()\n  on:\n    bg #ef4444\n    fs 16\n\nBtn "X"`,
        container
      )
      const btn = findByName(root, 'Btn') as HTMLElement
      btn.click()
      expect(btn.style.background).toContain('rgb(239, 68, 68)')
      expect(btn.style.fontSize).toBe('16px')
    })
  })

  // ---------------------------------------------------------------------------
  // S6: Exclusive group
  // ---------------------------------------------------------------------------

  describe('S6: exclusive() group — only one selected', () => {
    it('initial: exactly one Tab has selected state', () => {
      const root = render(
        `Tab: Button pad 12, exclusive()\n  selected:\n    col white\n\nFrame hor\n  Tab "Home", selected\n  Tab "Profile"\n  Tab "Settings"`,
        container
      )
      const tabs = allByName(root, 'Tab') as HTMLElement[]
      const selected = tabs.filter(t => t.getAttribute('data-state') === 'selected')
      expect(selected.length).toBe(1)
      expect(selected[0].textContent?.trim()).toBe('Home')
    })

    it('clicking another tab moves selection (still exactly one)', () => {
      const root = render(
        `Tab: Button pad 12, exclusive()\n  selected:\n    col white\n\nFrame hor\n  Tab "Home", selected\n  Tab "Profile"`,
        container
      )
      const [home, profile] = allByName(root, 'Tab') as HTMLElement[]
      profile.click()
      expect(profile.getAttribute('data-state')).toBe('selected')
      expect(home.getAttribute('data-state')).toBe('default')
    })
  })

  // ---------------------------------------------------------------------------
  // S7: Cross-element state (named element + .state selector)
  // ---------------------------------------------------------------------------

  describe('S7: cross-element state via named element', () => {
    it('initial: dependent Frame is hidden', () => {
      const root = render(
        `Button name MenuBtn, pad 10, toggle()\n  open:\n    bg #2271C1\n\nFrame bg #1a1a1a, hidden\n  MenuBtn.open:\n    visible\n  Text "Item"`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      const menu = frames[0]
      expect(menu.style.display).toBe('none')
    })
  })

  // ---------------------------------------------------------------------------
  // S8: State-aware children (different children per state)
  // ---------------------------------------------------------------------------

  describe('S8: state-aware children', () => {
    it('default state shows base children', () => {
      const root = render(
        `LikeBtn: Button hor, gap 8, toggle()\n  Icon "heart", ic #888, is 18\n  Text "Like", col #888\n  on:\n    Icon "heart", ic white, is 18, fill\n    Text "Liked!", col white\n\nLikeBtn`,
        container
      )
      expect(findByName(root, 'Text')!.textContent?.trim()).toBe('Like')
    })
  })

  // ---------------------------------------------------------------------------
  // S9: System states (hover/focus/active/disabled)
  // ---------------------------------------------------------------------------

  describe('S9: system states (hover/focus/active/disabled)', () => {
    it('compiles without throwing', () => {
      expect(() =>
        render(
          `Btn: Button pad 10, bg #333\n  hover:\n    bg #444\n  focus:\n    bor 2, boc #2271C1\n  disabled:\n    opacity 0.5\n\nBtn "X"`,
          container
        )
      ).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // S10: Multiple instances independent
  // ---------------------------------------------------------------------------

  describe('S10: multiple instances of toggle() are independent', () => {
    it('clicking one instance does not affect others', () => {
      const root = render(
        `Btn: Button pad 10, toggle()\n  on:\n    bg #ef4444\n\nFrame hor\n  Btn "A"\n  Btn "B"\n  Btn "C"`,
        container
      )
      const [a, b, c] = allByName(root, 'Btn') as HTMLElement[]
      a.click()
      expect(a.getAttribute('data-state')).toBe('on')
      expect(b.getAttribute('data-state')).toBe('default')
      expect(c.getAttribute('data-state')).toBe('default')
    })
  })
})
