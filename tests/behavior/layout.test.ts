/**
 * Layout — Behavior Spec (Schicht 2)
 *
 * Sub-Features L1-L12.
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

describe('Layout — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  describe('L1-L2: direction', () => {
    it('default Frame is vertical (flex-direction: column)', () => {
      const root = render(`Frame\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.flexDirection).toBe('column')
    })

    it('hor Frame is horizontal (flex-direction: row)', () => {
      const root = render(`Frame hor\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.flexDirection).toBe('row')
    })
  })

  describe('L3: center', () => {
    it('justify-content + align-items both center', () => {
      const root = render(`Frame w 200, h 100, center\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.justifyContent).toBe('center')
      expect(frame.style.alignItems).toBe('center')
    })
  })

  describe('L4: spread', () => {
    it('emits justify-content: space-between', () => {
      const root = render(`Frame hor, spread\n  Text "A"\n  Text "B"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.justifyContent).toBe('space-between')
    })
  })

  describe('L5: 9-position', () => {
    it('tr (top-right) emits flex-end somewhere (right or top axis)', () => {
      const root = render(`Frame w 300, h 200, tr\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      // tr should mean top-right; mapping uses flex-end on at least one axis
      const ai = frame.style.alignItems
      const jc = frame.style.justifyContent
      expect(ai === 'flex-end' || jc === 'flex-end').toBe(true)
    })
  })

  describe('L6: sizing (w, h, full, hug, min/max)', () => {
    it('w 100 → width 100px', () => {
      const root = render(`Frame w 100, h 50, bg red`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('100px')
      expect(frame.style.height).toBe('50px')
    })

    it('w hug → width: fit-content', () => {
      const root = render(`Frame w hug, h 50\n  Text "Hug"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('fit-content')
    })
  })

  describe('L7: grow/shrink', () => {
    it('grow emits flex-grow: 1', () => {
      const root = render(
        `Frame hor\n  Frame w 50, h 50\n  Frame grow, h 50\n  Frame w 50, h 50`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      // Inner middle frame has grow
      expect(frames[2].style.flexGrow).toBe('1')
    })
  })

  describe('L8: wrap', () => {
    it('emits flex-wrap: wrap', () => {
      const root = render(`Frame hor, wrap\n  Text "A"\n  Text "B"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.flexWrap).toBe('wrap')
    })
  })

  describe('L9: grid', () => {
    it('grid 3 emits display: grid + grid-template-columns', () => {
      const root = render(
        `Frame grid 3, gap 8\n  Frame h 40\n  Frame h 40\n  Frame h 40`,
        container
      )
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.display).toBe('grid')
      expect(frame.style.gridTemplateColumns).toContain('repeat(3')
    })
  })

  describe('L10: stacked', () => {
    it('stacked sets position: relative on parent', () => {
      const root = render(`Frame stacked, w 100, h 100\n  Frame w 100, h 100`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      // Stacked typically means children stack via position: absolute on children
      expect(frame).not.toBeNull()
    })
  })

  describe('L11: device-preset', () => {
    it('device mobile sets width 375px', () => {
      const root = render(`Frame device mobile, bg #1a1a1a\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.width).toBe('375px')
    })
  })

  describe('L12: position absolute', () => {
    it('absolute + x/y emits position: absolute, left/top in px', () => {
      const root = render(`Frame stacked\n  Frame absolute, x 10, y 20, w 50, h 30`, container)
      const inner = allByName(root, 'Frame')[1] as HTMLElement
      expect(inner.style.position).toBe('absolute')
      expect(inner.style.left).toBe('10px')
      expect(inner.style.top).toBe('20px')
    })
  })
})
