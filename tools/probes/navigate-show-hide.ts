/**
 * Probe — `navigate() + show/hide` combinations.
 *
 * Test claims this combo doesn't work. Let's see.
 */

import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

const src = `Frame hor, w 400
  Frame gap 4, pad 8, w 100
    Button "Home", navigate(HomeView), show(HomeView), hide(SettingsView)
    Button "Settings", navigate(SettingsView), show(SettingsView), hide(HomeView)

  Frame w full, pad 16
    Frame name HomeView
      Text "Home Content"
    Frame name SettingsView, hidden
      Text "Settings Content"`

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

const buttons = root.querySelectorAll('button')
const homeBtn = buttons[0] as HTMLElement
const settingsBtn = buttons[1] as HTMLElement

console.log('--- All div elements ---')
root.querySelectorAll('div, span').forEach(el => {
  const id = el.getAttribute('data-mirror-id')
  const name = el.getAttribute('data-mirror-name')
  const dataName = el.getAttribute('data-name')
  console.log(`  ${el.tagName} id=${id} name=${name} data-name=${dataName}`)
})

const homeView = root.querySelector('[data-mirror-name="HomeView"]') as HTMLElement
const settingsView = root.querySelector('[data-mirror-name="SettingsView"]') as HTMLElement

function display(el: HTMLElement | null) {
  if (!el) return '(missing)'
  const computed = dom.window.getComputedStyle(el).display
  return `inline=${el.style.display || '(none)'} computed=${computed} hidden=${el.hidden}`
}

console.log('Initial: Home=' + display(homeView) + ' Settings=' + display(settingsView))

console.log('\n--- Click Settings button ---')
settingsBtn.click()
console.log('After:   Home=' + display(homeView) + ' Settings=' + display(settingsView))

console.log('\n--- Click Home button ---')
homeBtn.click()
console.log('After:   Home=' + display(homeView) + ' Settings=' + display(settingsView))
