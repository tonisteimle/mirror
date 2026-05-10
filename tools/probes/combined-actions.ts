/**
 * Probe — combined `toggle() + increment(count)` action chains.
 *
 * Compares two surface forms that both bind to a single click:
 *   A) `Button "Like", toggle(), increment(count)` (no `onclick` keyword)
 *   B) `Button "Like", toggle(), onclick increment(count)` (explicit `onclick`)
 *
 * Pre-fix observation: form A double-fires (state-machine handler +
 * action handler both call toggle), form B works because toggle() goes
 * through state-machine emit and the explicit `onclick` only carries
 * `increment`.
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

function run(label: string, src: string): void {
  console.log(`\n=== ${label} ===`)
  console.log('SRC:', src.replace(/\n/g, '⏎'))
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
  const code = generateDOM(parse(src)).replace(/^export\s+function/gm, 'function')
  const fn = new Function('window', 'document', code + '\nreturn createUI();')
  const root = fn(dom.window, dom.window.document) as HTMLElement
  dom.window.document.body.appendChild(root)

  const btn = root.querySelector('button')!
  const text = root.querySelector('[data-mirror-name="Text"]')

  console.log(
    'Initial:  state=' +
      btn.getAttribute('data-state') +
      ' text=' +
      JSON.stringify(text?.textContent?.trim())
  )

  btn.click()
  console.log(
    'Click 1:  state=' +
      btn.getAttribute('data-state') +
      ' text=' +
      JSON.stringify(text?.textContent?.trim())
  )

  btn.click()
  console.log(
    'Click 2:  state=' +
      btn.getAttribute('data-state') +
      ' text=' +
      JSON.stringify(text?.textContent?.trim())
  )
}

run(
  'A) toggle() + increment() comma chain',
  `count: 0

Button "Like", toggle(), increment(count)
  on:
    bg #ef4444
Text "Likes: $count"`
)

run(
  'B) toggle() + onclick increment()',
  `count: 0

Button "Like", toggle(), onclick increment(count)
  on:
    bg #ef4444
Text "Likes: $count"`
)
