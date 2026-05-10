/**
 * Probe — multi-transform composition (x-offset + y-offset together).
 *
 * The TODO claims „runtime overwrites transforms instead of combining
 * them". Let's see what actually happens in jsdom (which doesn't run
 * layout but does store inline-style.transform).
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

const variants: { name: string; src: string }[] = [
  { name: 'x-offset only', src: `Frame w 80, h 80, x-offset 10` },
  { name: 'y-offset only', src: `Frame w 80, h 80, y-offset 15` },
  { name: 'x-offset + y-offset', src: `Frame w 80, h 80, x-offset 10, y-offset 15` },
  { name: 'rotate only', src: `Frame w 80, h 80, rotate 45` },
  { name: 'rotate + x-offset', src: `Frame w 80, h 80, rotate 45, x-offset 10` },
  { name: 'scale + rotate', src: `Frame w 80, h 80, scale 2, rotate 45` },
]

for (const v of variants) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>')
  ;(global as any).window = dom.window
  ;(global as any).document = dom.window.document
  ;(global as any).IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  const code = generateDOM(parse(v.src)).replace(/^export\s+function/gm, 'function')
  const fn = new Function('window', 'document', code + '\nreturn createUI();')
  const root = fn(dom.window, dom.window.document) as HTMLElement
  dom.window.document.body.appendChild(root)
  const el = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
  console.log(`[${v.name}] transform="${el.style.transform}"`)
}
