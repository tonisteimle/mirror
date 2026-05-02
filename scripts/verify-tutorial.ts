#!/usr/bin/env npx tsx
/**
 * One-off tutorial verifier.
 *
 * Loads every tutorial page in headless Chrome, waits for playgrounds to
 * compile, and reports:
 *   - 4xx/5xx asset loads (broken script/css paths)
 *   - JS console errors
 *   - playground compile errors (rendered as <div class="playground-error">)
 *   - empty shadow DOMs (playground exists but produced no output)
 *
 * Run after `npm run build` and a static server on PORT (default 5174).
 */

import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'
import type { CDPSession } from '../tools/test-runner/types'

const PORT = Number(process.env.PORT || 5174)
const BASE = `http://localhost:${PORT}/docs/tutorial`

const PAGES = [
  'index.html',
  '01-elemente.html',
  '02-komponenten.html',
  '03-tokens.html',
  '04-layout.html',
  '05-styling.html',
  '06-states.html',
  '07-animationen.html',
  '08-functions.html',
  '09-daten.html',
  '10-seiten.html',
  '11-eingabe.html',
  '12-navigation.html',
  '13-overlays.html',
  '14-tabellen.html',
  '15-charts.html',
  'playground.html',
]

interface PageReport {
  page: string
  failedRequests: Array<{ url: string; status: number }>
  consoleErrors: string[]
  playgrounds: { total: number; errors: number; empty: number }
}

async function checkPage(session: CDPSession, page: string): Promise<PageReport> {
  const url = `${BASE}/${page}`
  const failedRequests: Array<{ url: string; status: number }> = []
  const consoleErrors: string[] = []

  // Listen for failed network responses
  const onResponse = (params: unknown) => {
    const r = (params as { response: { url: string; status: number } }).response
    if (r.status >= 400) failedRequests.push({ url: r.url, status: r.status })
  }
  session.on('Network.responseReceived', onResponse)

  // Listen for console errors
  const onConsole = (params: unknown) => {
    const msg = params as { type: string; args: Array<{ value?: unknown; description?: string }> }
    if (msg.type === 'error') {
      const text = msg.args.map(a => a.value ?? a.description ?? '').join(' ')
      consoleErrors.push(text)
    }
  }
  session.on('Runtime.consoleAPICalled', onConsole)

  // Listen for uncaught exceptions
  const onException = (params: unknown) => {
    const e = params as { exceptionDetails: { text: string; exception?: { description?: string } } }
    consoleErrors.push(e.exceptionDetails.exception?.description ?? e.exceptionDetails.text)
  }
  session.on('Runtime.exceptionThrown', onException)

  await session.send('Page.navigate', { url })
  // wait for load + playground compile (debounce is 100ms)
  await new Promise(r => setTimeout(r, 1500))

  // Evaluate playground status
  const result = (await session.send('Runtime.evaluate', {
    expression: `(() => {
      const ps = document.querySelectorAll('.playground[data-playground]')
      let errors = 0, empty = 0
      const debug = []
      ps.forEach((p, i) => {
        const preview = p.querySelector('.playground-preview')
        const shadow = preview?.shadowRoot
        if (!shadow) {
          empty++
          if (debug.length < 2) debug.push({ i, reason: 'no-shadow', innerHTML: preview?.innerHTML?.slice(0, 100) || '<no preview el>' })
          return
        }
        if (shadow.querySelector('.playground-error')) {
          errors++
          if (debug.length < 2) debug.push({ i, reason: 'error', text: shadow.querySelector('.playground-error')?.textContent?.slice(0, 200) })
        } else if (!shadow.querySelector('.mirror-root')) {
          empty++
          if (debug.length < 2) debug.push({ i, reason: 'no-mirror-root', innerHTML: shadow.innerHTML?.slice(0, 200) })
        }
      })
      return JSON.stringify({ total: ps.length, errors, empty, debug, hasMirrorLang: typeof MirrorLang !== 'undefined' })
    })()`,
    returnByValue: true,
  })) as { result: { value: string } }

  session.off('Network.responseReceived', onResponse)
  session.off('Runtime.consoleAPICalled', onConsole)
  session.off('Runtime.exceptionThrown', onException)

  const playgrounds = JSON.parse(result.result.value)
  return { page, failedRequests, consoleErrors, playgrounds }
}

async function main() {
  console.log(`Verifying tutorial pages at ${BASE}\n`)

  const chrome = await launchChrome({ headless: true })
  const port = Number(new URL(chrome.wsEndpoint).port)
  const targetWs = await getPageTarget(port)
  const session = await connectCDP(targetWs)

  await session.send('Network.enable')
  await session.send('Runtime.enable')
  await session.send('Page.enable')

  const reports: PageReport[] = []
  for (const page of PAGES) {
    const r = await checkPage(session, page)
    reports.push(r)
    const flag =
      r.failedRequests.length ||
      r.consoleErrors.length ||
      r.playgrounds.errors ||
      r.playgrounds.empty
    const tag = flag ? '✗' : '✓'
    console.log(
      `${tag} ${page.padEnd(22)} playgrounds=${r.playgrounds.total} errors=${r.playgrounds.errors} empty=${r.playgrounds.empty} netFails=${r.failedRequests.length} consoleErr=${r.consoleErrors.length}`
    )
  }

  console.log('\n--- Detail for problematic pages ---\n')
  for (const r of reports) {
    if (
      !r.failedRequests.length &&
      !r.consoleErrors.length &&
      !r.playgrounds.errors &&
      !r.playgrounds.empty
    )
      continue
    console.log(`# ${r.page}`)
    if (r.failedRequests.length) {
      console.log('  Failed requests:')
      for (const f of r.failedRequests) console.log(`    ${f.status} ${f.url}`)
    }
    if (r.consoleErrors.length) {
      console.log('  Console errors:')
      for (const e of r.consoleErrors.slice(0, 5))
        console.log(`    ${e.split('\n')[0].slice(0, 200)}`)
    }
    if (r.playgrounds.errors) console.log(`  Playground compile errors: ${r.playgrounds.errors}`)
    if (r.playgrounds.empty) console.log(`  Empty/non-rendered playgrounds: ${r.playgrounds.empty}`)
    const pg = r.playgrounds as unknown as {
      debug?: Array<Record<string, unknown>>
      hasMirrorLang?: boolean
    }
    if (pg.hasMirrorLang === false) console.log(`  MirrorLang global NOT defined!`)
    if (pg.debug?.length) {
      console.log('  Sample playground state:')
      for (const d of pg.debug) console.log(`    ${JSON.stringify(d).slice(0, 300)}`)
    }
    console.log()
  }

  session.close()
  chrome.kill()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
