/**
 * Properties — Behavior Spec (Schicht 2)
 *
 * Sub-Features P1-P11.
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

describe('Properties — Behavior Spec', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  // ---------------------------------------------------------------------------
  // P1-P3: Color
  // ---------------------------------------------------------------------------

  describe('P1: hex colors', () => {
    it('bg #2271C1 sets background-color', () => {
      const root = render(`Frame bg #2271C1, w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgb(34, 113, 193)')
    })

    it('col white sets color: white', () => {
      const root = render(`Text "Hi", col white`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.color).toBe('white')
    })
  })

  describe('P2: rgba colors', () => {
    it('rgba(0, 0, 0, 0.5) preserves alpha', () => {
      const root = render(`Frame bg rgba(0, 0, 0, 0.5), w 100, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('rgba(0, 0, 0, 0.5)')
    })
  })

  describe('P3: gradients', () => {
    it('grad emits a linear-gradient (default direction or 45° as specified)', () => {
      const root = render(`Frame bg grad #2271C1 #7c3aed, w 200, h 100`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.background).toContain('linear-gradient')
    })
  })

  // ---------------------------------------------------------------------------
  // P4: Typography
  // ---------------------------------------------------------------------------

  describe('P4: typography', () => {
    it('fs N + weight bold emit font-size + font-weight', () => {
      const root = render(`Text "T", fs 24, weight bold`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.fontSize).toBe('24px')
      expect(text.style.fontWeight).toBe('700')
    })

    it('font mono emits monospace stack', () => {
      const root = render(`Text "M", font mono`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.fontFamily).toContain('monospace')
    })

    it('uppercase emits text-transform: uppercase', () => {
      const root = render(`Text "X", uppercase`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.textTransform).toBe('uppercase')
    })
  })

  // ---------------------------------------------------------------------------
  // P5: Truncate
  // ---------------------------------------------------------------------------

  describe('P5: truncate', () => {
    it('emits text-overflow: ellipsis + overflow + white-space', () => {
      const root = render(`Text "Long", truncate, w 100`, container)
      const text = findByName(root, 'Text') as HTMLElement
      expect(text.style.textOverflow).toBe('ellipsis')
      expect(text.style.overflow).toBe('hidden')
      expect(text.style.whiteSpace).toBe('nowrap')
    })
  })

  // ---------------------------------------------------------------------------
  // P6: Effects
  // ---------------------------------------------------------------------------

  describe('P6: effects (shadow / opacity / blur)', () => {
    it('shadow sm/md/lg emit box-shadow', () => {
      const root = render(
        `Frame\n  Frame w 100, h 50, shadow sm\n  Frame w 100, h 50, shadow md\n  Frame w 100, h 50, shadow lg`,
        container
      )
      const frames = allByName(root, 'Frame') as HTMLElement[]
      // 3 shadowed frames + parent
      const shadowed = frames.filter(f => f.style.boxShadow && f.style.boxShadow !== 'none')
      expect(shadowed.length).toBe(3)
    })

    it('opacity 0.5 sets opacity', () => {
      const root = render(`Frame w 100, h 50, opacity 0.5`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.opacity).toBe('0.5')
    })

    it('blur 4 sets filter: blur', () => {
      const root = render(`Frame w 100, h 50, blur 4`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.filter).toContain('blur')
    })
  })

  // ---------------------------------------------------------------------------
  // P7: Visibility
  // ---------------------------------------------------------------------------

  describe('P7: visibility', () => {
    it('hidden → display: none', () => {
      const root = render(`Frame w 100, hidden`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.display).toBe('none')
    })

    it('scroll → overflow-y: auto (or scroll)', () => {
      const root = render(`Frame w 100, h 100, scroll\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.overflowY).toMatch(/auto|scroll/)
    })

    it('clip → overflow: hidden', () => {
      const root = render(`Frame w 100, h 50, clip\n  Text "X"`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.overflow).toBe('hidden')
    })
  })

  // ---------------------------------------------------------------------------
  // P8: Cursor
  // ---------------------------------------------------------------------------

  describe('P8: cursor', () => {
    it('cursor pointer / grab / not-allowed', () => {
      const root = render(`Frame cursor pointer, w 50, h 50`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.cursor).toBe('pointer')
    })
  })

  // ---------------------------------------------------------------------------
  // P9: Border + Radius
  // ---------------------------------------------------------------------------

  describe('P9: border + radius', () => {
    it('rad 8 → border-radius: 8px', () => {
      const root = render(`Frame w 100, h 50, rad 8`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.borderRadius).toBe('8px')
    })

    it('rad 99 → 99px (circle for square element)', () => {
      const root = render(`Frame w 50, h 50, rad 99`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.borderRadius).toBe('99px')
    })

    it('bor 2 → border-width: 2px + border-style: solid', () => {
      const root = render(`Frame w 100, h 50, bor 2`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.borderWidth).toBe('2px')
      expect(frame.style.borderStyle).toBe('solid')
    })
  })

  // ---------------------------------------------------------------------------
  // P10: Transform
  // ---------------------------------------------------------------------------

  describe('P10: transform', () => {
    it('rotate 45 → transform contains rotate', () => {
      const root = render(`Frame w 100, h 50, rotate 45`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.transform).toContain('rotate')
    })

    it('scale 0.8 → transform contains scale', () => {
      const root = render(`Frame w 100, h 50, scale 0.8`, container)
      const frame = findByName(root, 'Frame') as HTMLElement
      expect(frame.style.transform).toContain('scale')
    })
  })

  // ---------------------------------------------------------------------------
  // P11: Hover-Properties
  // ---------------------------------------------------------------------------

  describe('P11: hover-* properties', () => {
    it('compiles + element renders without throwing', () => {
      expect(() => render(`Button "X", hover-bg #444`, container)).not.toThrow()
    })
  })
})
