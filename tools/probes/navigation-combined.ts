/**
 * Probe — combined `navigate(View) + show(View) + hide(OtherView)` chains.
 *
 * Goal: surface whether the test bucket's "navigate() + show/hide combinations
 * don't work" claim is a real runtime bug or a stale test from before the
 * navigate() runtime existed.
 *
 * Runs the exact Mirror snippet from
 * `studio/test-api/suites/actions/navigation.test.ts:9` and prints the
 * display state of the two views before/after each click.
 */
import { JSDOM } from 'jsdom'
import { parse, generateDOM } from '../../compiler'

const SRC = `Frame hor, w 400
  Frame gap 4, pad 8, bg #1a1a1a, w 100
    Button "Home", navigate(HomeView), show(HomeView), hide(SettingsView)
    Button "Settings", navigate(SettingsView), show(SettingsView), hide(HomeView)

  Frame w full, pad 16, bg #222
    Frame name HomeView
      Text "Home Content", col white
    Frame name SettingsView, hidden
      Text "Settings Content", col white`

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

const code = generateDOM(parse(SRC)).replace(/^export\s+function/gm, 'function')
const fn = new Function('window', 'document', code + '\nreturn createUI();')
const root = fn(dom.window, dom.window.document) as HTMLElement
dom.window.document.body.appendChild(root)

function display(name: string): string {
  const el = dom.window.document.querySelector(`[data-mirror-name="${name}"]`) as HTMLElement | null
  if (!el) return `<no ${name}>`
  const cs = dom.window.getComputedStyle(el).display
  if (cs && cs !== '') return cs
  return el.style.display || 'block'
}

function dump(label: string): void {
  console.log(`\n--- ${label} ---`)
  console.log(`  HomeView:     display=${display('HomeView')}`)
  console.log(`  SettingsView: display=${display('SettingsView')}`)
}

dump('initial')

const settingsBtn = root.querySelectorAll('button')[1]
console.log('\nClicking Settings button...')
settingsBtn?.click()
dump('after click Settings')

const homeBtn = root.querySelectorAll('button')[0]
console.log('\nClicking Home button...')
homeBtn?.click()
dump('after click Home')
