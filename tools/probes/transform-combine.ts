/**
 * Probe — multiple transform-emitting properties on the same Frame.
 *
 * Mirror has several properties that all emit `transform: ...`:
 *   x-offset N → translateX(Npx)
 *   y-offset N → translateY(Npx)
 *   scale N    → scale(N)
 *   rotate N   → rotate(Ndeg)
 *
 * Question: when two or more land on the same element, do they combine
 * into a single `transform: a b` or does the second one overwrite the
 * first? The browser-test-bucket TODO claims "runtime overwrites
 * transforms instead of combining them". This probe surfaces what the
 * IR + DOM emitter actually produce.
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

function probe(label: string, src: string): void {
  console.log(`\n=== ${label} ===`)
  console.log('SRC:', src.replace(/\n/g, '⏎'))

  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  ;(global as unknown as { window: typeof dom.window }).window = dom.window
  ;(global as unknown as { document: typeof dom.window.document }).document = dom.window.document
  ;(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }

  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
  const fn = new Function('window', 'document', code + '\nreturn createUI();')
  const root = fn(dom.window, dom.window.document) as HTMLElement
  dom.window.document.body.appendChild(root)

  const target = root.querySelector('[data-mirror-id="node-1"]') as HTMLElement | null
  if (!target) {
    console.log('  no node-1 found')
    return
  }

  console.log('  inline-style transform:', JSON.stringify(target.style.transform))
  console.log(
    '  computed transform:    ',
    JSON.stringify(dom.window.getComputedStyle(target).transform)
  )
}

probe('A) x-offset only', `Frame w 80, h 80, bg #2271C1, x-offset 20`)
probe('B) y-offset only', `Frame w 80, h 80, bg #2271C1, y-offset 15`)
probe('C) x-offset + y-offset', `Frame w 80, h 80, bg #2271C1, x-offset 20, y-offset 15`)
probe('D) scale + rotate', `Frame w 80, h 80, bg #2271C1, scale 1.2, rotate 45`)
probe(
  'E) x-offset + scale + rotate',
  `Frame w 80, h 80, bg #2271C1, x-offset 20, scale 1.2, rotate 45`
)
probe(
  'F) x-offset + y-offset + scale + rotate',
  `Frame w 80, h 80, bg #2271C1, x-offset 20, y-offset 15, scale 1.2, rotate 45`
)
