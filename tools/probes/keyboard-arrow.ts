/**
 * Probe — `onkeydown-arrow-down` / `onkeydown-arrow-up` event hooks.
 *
 * TODO claims arrow events don't fire in headless tests. Probe with
 * synthetic KeyboardEvent dispatch.
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

// Note: Mirror DSL spec for keyboard handlers uses parens:
//   onkeydown(arrow-down) increment(selectedIndex)
// NOT the hyphen-glob form `onkeydown-arrow-down`.
// The test in studio/test-api/suites/events/keyboard.test.ts:86
// used the wrong form — its „Runtime bug — arrow events don't fire"
// claim was caused by parsing `onkeydown-arrow-down` as an inert
// property, never wiring an actual listener.
const src = `selectedIndex: 0

Frame gap 4, focusable, onkeydown(arrow-down) increment(selectedIndex), onkeydown(arrow-up) decrement(selectedIndex)
  Text "selected: $selectedIndex"`

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

const frame = root.querySelector('[data-mirror-name="Frame"]') as HTMLElement
const text = root.querySelector('[data-mirror-name="Text"]') as HTMLElement

console.log('Initial:')
console.log('  text:', JSON.stringify(text.textContent?.trim()))
console.log('  __mirrorData.selectedIndex:', (dom.window as any).__mirrorData?.selectedIndex)

frame.focus()
frame.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
console.log('\nAfter ArrowDown:')
console.log('  text:', JSON.stringify(text.textContent?.trim()))
console.log('  __mirrorData.selectedIndex:', (dom.window as any).__mirrorData?.selectedIndex)

frame.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
console.log('\nAfter ArrowDown #2:')
console.log('  text:', JSON.stringify(text.textContent?.trim()))
console.log('  __mirrorData.selectedIndex:', (dom.window as any).__mirrorData?.selectedIndex)

frame.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))
console.log('\nAfter ArrowUp:')
console.log('  text:', JSON.stringify(text.textContent?.trim()))
console.log('  __mirrorData.selectedIndex:', (dom.window as any).__mirrorData?.selectedIndex)
