/**
 * Cleanup Sprint 6 — Behavior Spec (Schicht 2)
 *
 * Sub-Features:
 *   CL1 Animation — anim spin/bounce/pulse/shake/fade-in/scale-in
 *   CL2 Canvas — preset (mobile/tablet/desktop), custom dimensions, inheritance
 *   CL3 Custom Icons — `$icons:` definition + Icon usage (pinned bug)
 *   CL4 DatePicker — basic, range, startOfWeek, fixedWeeks, min/max
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

describe('Cleanup — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // ---------------------------------------------------------------------------
  // CL1: Animation
  // ---------------------------------------------------------------------------

  describe('CL1: Animation', () => {
    it('anim spin emits an animation/transform style', () => {
      const root = render(`Icon "loader", anim spin, is 24, ic #2271C1`, container)
      const icon = findByName(root, 'Icon') as HTMLElement
      // anim spin should produce either an animation, animationName or transform
      const hasAnim =
        (icon.style.animation && icon.style.animation !== '') ||
        (icon.style.animationName && icon.style.animationName !== '') ||
        icon.dataset.anim === 'spin'
      expect(hasAnim).toBeTruthy()
    })

    it('anim bounce on a Frame compiles + renders without throwing', () => {
      expect(() => render(`Frame anim bounce, w 100, h 100`, container)).not.toThrow()
    })

    it('anim fade-in on a Frame compiles', () => {
      const code = generateDOM(parse(`Frame anim fade-in, w 100, h 50`))
      expect(code).toMatch(/fade-in|fadeIn/)
    })

    it('anim pulse compiles', () => {
      expect(() => render(`Frame anim pulse, w 50, h 50`, container)).not.toThrow()
    })

    it('anim shake compiles', () => {
      expect(() => render(`Frame anim shake, w 50, h 50`, container)).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // CL2: Canvas
  // ---------------------------------------------------------------------------

  describe('CL2: Canvas', () => {
    it('canvas mobile sets root width/height to 375x812', () => {
      const root = render(`canvas mobile\n\nText "Hi"`, container)
      const rootDiv = root as HTMLElement
      expect(rootDiv.style.width).toBe('375px')
      expect(rootDiv.style.height).toBe('812px')
    })

    it('canvas tablet sets 768x1024', () => {
      const root = render(`canvas tablet\n\nText "Hi"`, container)
      expect(root.style.width).toBe('768px')
      expect(root.style.height).toBe('1024px')
    })

    it('canvas desktop sets 1440x900', () => {
      const root = render(`canvas desktop\n\nText "Hi"`, container)
      expect(root.style.width).toBe('1440px')
      expect(root.style.height).toBe('900px')
    })

    it('canvas with custom bg/col/font properties applies them to root', () => {
      const root = render(`canvas bg #1a1a1a, w 400, h 600, col white\n\nText "Hi"`, container)
      // bg should appear on root or a wrapper
      const hasBg =
        (root.style.background &&
          (root.style.background.includes('rgb(26, 26, 26)') ||
            root.style.background.includes('1a1a1a'))) ||
        (root.style.backgroundColor && root.style.backgroundColor.includes('rgb(26, 26, 26)'))
      expect(hasBg).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // CL3: Custom Icons (pinned bug)
  // ---------------------------------------------------------------------------

  describe('CL3: Custom Icons (Bug #34 pinned)', () => {
    // Bug #34: `$icons:` with definition emits `_runtime.registerIcon(...)`
    // BEFORE the `const _runtime = {...}` declaration, causing TDZ when run
    // standalone via `new Function(code)`. The compiler accepts and emits
    // the icon definition but execution fails until that order is fixed.
    it('Bug #34: parses without errors but execution throws TDZ', () => {
      const ast = parse(`$icons:\n  hbox: "M3 3h18v18H3z|M9 3v18"\n\nIcon "hbox", is 24`)
      expect(ast.errors).toEqual([])
      const code = generateDOM(ast)
      expect(code).toContain('_runtime.registerIcon')
      // Pinned: standalone execution currently throws
      const stripped = code.replace(/^export\s+function/gm, 'function')
      expect(() => {
        const fn = new Function(stripped + '\nreturn createUI();')
        fn()
      }).toThrow(/before initialization|_runtime/)
    })

    it('built-in Icon (no $icons: registry) renders without throwing', () => {
      expect(() => render(`Icon "check", is 24, ic #10b981`, container)).not.toThrow()
    })
  })

  // ---------------------------------------------------------------------------
  // CL4: DatePicker
  // ---------------------------------------------------------------------------

  describe('CL4: DatePicker', () => {
    it('basic DatePicker renders without throwing', () => {
      expect(() => render(`DatePicker placeholder "Select date"`, container)).not.toThrow()
    })

    it('DatePicker has data-zag-component="datepicker" attribute', () => {
      const root = render(`DatePicker placeholder "Select"`, container)
      const dp = findByName(root, 'DatePicker') as HTMLElement
      expect(dp.getAttribute('data-zag-component')).toBe('datepicker')
    })

    it('DatePicker placeholder reaches the input', () => {
      const root = render(`DatePicker placeholder "Pick a date"`, container)
      const input = root.querySelector('input') as HTMLInputElement
      expect(input?.placeholder).toBe('Pick a date')
    })

    it('DatePicker selectionMode "range" renders without throwing', () => {
      expect(() =>
        render(`DatePicker selectionMode "range", startOfWeek 1`, container)
      ).not.toThrow()
    })
  })
})
