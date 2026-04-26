/**
 * Positional Args ≡ Explicit — Contract Test (Schicht 3)
 *
 * Exhaustive end-to-end equivalence: for a corpus of positional Mirror
 * snippets, the rendered DOM must match the rendered DOM of the
 * explicit-form equivalent (modulo dynamic IDs). If they ever
 * diverge, the resolver's mapping is broken.
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

const stripDynamic = (s: string) => s.replace(/data-mirror-id="[^"]*"/g, '').replace(/\s+/g, ' ')

const PAIRS: Array<[string, string, string]> = [
  // [name, positional, explicit]
  ['Frame hex bg', `Frame #2271C1, w 100, h 50`, `Frame bg #2271C1, w 100, h 50`],
  ['Frame size pair', `Frame 200, 80, bg #333`, `Frame w 200, h 80, bg #333`],
  [
    'Frame full mix',
    `Frame hor, 200, 80, #2271C1, gap 12, pad 16`,
    `Frame hor, w 200, h 80, bg #2271C1, gap 12, pad 16`,
  ],
  ['Button full', `Button "Save", hug, 32, #2271C1`, `Button "Save", w hug, h 32, bg #2271C1`],
  ['Text col', `Text "Hello", #2271C1`, `Text "Hello", col #2271C1`],
  ['Text named col', `Text "Hi", red`, `Text "Hi", col red`],
  ['Icon ic+is', `Icon "check", #10b981, 24`, `Icon "check", ic #10b981, is 24`],
  ['Image w/h', `Image src "x.jpg", 200, 100`, `Image src "x.jpg", w 200, h 100`],
  ['rgba bg', `Frame rgba(0,0,0,0.5), w 200, h 100`, `Frame bg rgba(0,0,0,0.5), w 200, h 100`],
  ['hug+full', `Frame hug, full, bg #333`, `Frame w hug, h full, bg #333`],
  [
    'Mixed: explicit w + bare h + bare color',
    `Frame w 100, 50, #333`,
    `Frame w 100, h 50, bg #333`,
  ],
]

describe('Positional Args — Equivalence Contract', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
  })

  it.each(PAIRS)('%s: positional ≡ explicit', (_name, positional, explicit) => {
    const a = render(positional, container).outerHTML
    container.innerHTML = ''
    const b = render(explicit, container).outerHTML
    expect(stripDynamic(a)).toBe(stripDynamic(b))
  })

  it('nested example: Frame hor + children with positional ≡ explicit', () => {
    const positional = `Frame hor, 400, 200, #1a1a1a, gap 12, pad 16
  Text "Hello", #fff, fs 16
  Button "Click", hug, 32, #2271C1
  Icon "check", #10b981, 20`
    const explicit = `Frame hor, w 400, h 200, bg #1a1a1a, gap 12, pad 16
  Text "Hello", col #fff, fs 16
  Button "Click", w hug, h 32, bg #2271C1
  Icon "check", ic #10b981, is 20`
    const a = render(positional, container).outerHTML
    container.innerHTML = ''
    const b = render(explicit, container).outerHTML
    expect(stripDynamic(a)).toBe(stripDynamic(b))
  })

  it('Mirror real-world card pattern: positional ≡ explicit', () => {
    const positional = `Frame 320, hug, #1a1a1a, rad 8, pad 16, gap 8
  Text "Card Title", #fff, fs 18, weight bold
  Text "Description text here", #888, fs 14
  Frame hor, gap 8
    Button "Edit", hug, 32, #2271C1, col white, rad 6
    Button "Delete", hug, 32, #ef4444, col white, rad 6`
    const explicit = `Frame w 320, h hug, bg #1a1a1a, rad 8, pad 16, gap 8
  Text "Card Title", col #fff, fs 18, weight bold
  Text "Description text here", col #888, fs 14
  Frame hor, gap 8
    Button "Edit", w hug, h 32, bg #2271C1, col white, rad 6
    Button "Delete", w hug, h 32, bg #ef4444, col white, rad 6`
    const a = render(positional, container).outerHTML
    container.innerHTML = ''
    const b = render(explicit, container).outerHTML
    expect(stripDynamic(a)).toBe(stripDynamic(b))
  })
})
