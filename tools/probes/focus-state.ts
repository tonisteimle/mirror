/**
 * Probe — focus state styles via Mirror's `focus:` block.
 *
 * Test in `studio/test-api/suites/events/focus.test.ts:55` was skipped
 * with „Runtime bug — focus state styles don't apply correctly in
 * headless tests". Mirror emits a `:focus`-pseudo PLUS a synthetic
 * `[data-focus="true"]` selector, so the styles should apply once
 * the focusin handler toggles data-focus.
 *
 * Verify in jsdom (which has focus event dispatch but limited
 * pseudo-class engine).
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

const src = `Input placeholder "First", bg #222, bor 1, boc #444
  focus:
    boc #2271C1
Input placeholder "Second", bg #222, bor 1, boc #444
  focus:
    boc #10b981`

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

const inputs = root.querySelectorAll('input') as NodeListOf<HTMLInputElement>
const first = inputs[0]
const second = inputs[1]

function inspect(label: string) {
  console.log(`\n${label}`)
  console.log('  first  data-focus =', first.getAttribute('data-focus'))
  console.log('  second data-focus =', second.getAttribute('data-focus'))
  const cs1 = dom.window.getComputedStyle(first).borderColor
  const cs2 = dom.window.getComputedStyle(second).borderColor
  console.log('  first  border-color =', cs1)
  console.log('  second border-color =', cs2)
}

inspect('Initial')
first.focus()
inspect('After first.focus()')
second.focus()
inspect('After second.focus()')
