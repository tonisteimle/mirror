/**
 * Probe — `remove(item)` runtime bug.
 *
 * Hypothese: `remove(item)` mutiert `__mirrorData` und ruft
 * `_refreshEachLoops` auf, aber das DOM bleibt stehen. Wir wollen sehen,
 * was tatsächlich passiert.
 *
 * Setup imitiert `tests/behavior/each.test.ts` — jsdom via Node.
 *
 * Aufruf: npx tsx tools/probes/remove-action.ts
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

const src = `items:
  a:
    name: "Item A"
  b:
    name: "Item B"
  c:
    name: "Item C"

Frame gap 8
  each item in $items
    Frame hor, gap 8
      Text "$item.name"
      Button "x", remove(item)`

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

console.log('=== INITIAL ===')
console.log(
  'Texts:',
  Array.from(root.querySelectorAll('[data-mirror-name="Text"]')).map(e => e.textContent?.trim())
)
console.log('Buttons:', root.querySelectorAll('button').length)
console.log('Data:', JSON.stringify((dom.window as any).__mirrorData?.items, null, 2))

const buttons = root.querySelectorAll('button')
const firstBtn = buttons[0] as HTMLElement
console.log('\n=== Click first remove button ===')
firstBtn.click()

console.log('\n=== AFTER FIRST CLICK ===')
console.log(
  'Texts:',
  Array.from(root.querySelectorAll('[data-mirror-name="Text"]')).map(e => e.textContent?.trim())
)
console.log('Buttons:', root.querySelectorAll('button').length)
console.log('Data:', JSON.stringify((dom.window as any).__mirrorData?.items, null, 2))

console.log('\n=== ROOT TREE STRUCTURE ===')
function describe(el: Element, depth = 0): void {
  const pad = '  '.repeat(depth)
  const id = el.getAttribute('data-mirror-id')
  const name = el.getAttribute('data-mirror-name')
  const eachContainer = el.hasAttribute('data-each-container')
  console.log(
    `${pad}<${el.tagName.toLowerCase()} id=${id} name=${name}${eachContainer ? ' EACH' : ''}>`
  )
  for (const child of Array.from(el.children)) {
    describe(child, depth + 1)
  }
}
describe(root)

console.log("\n=== Test's exact selector check ===")
const node1Children = dom.window.document.querySelectorAll(
  '[data-mirror-id="node-1"] > [data-mirror-id]'
)
console.log('Direct children of node-1 with mirror-id:', node1Children.length)
node1Children.forEach((c, i) =>
  console.log(
    `  [${i}]`,
    c.tagName,
    'id=',
    c.getAttribute('data-mirror-id'),
    'name=',
    c.getAttribute('data-mirror-name')
  )
)
