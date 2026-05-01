/**
 * Quick studio bootstrap diagnostic — same plumbing as the runner, but
 * just navigates, waits, and dumps console + exceptions + test API state.
 */

import { launchChrome } from './test-runner/chrome'
import { connectCDP, getPageTarget } from './test-runner/cdp'
import { ConsoleCollector } from './test-runner/console-collector'

const TARGET_URL = process.argv[2] || 'http://localhost:5173/studio/'
const WAIT_MS = 7000

async function main() {
  const chrome = await launchChrome({ headless: true })
  const port = new URL(chrome.wsEndpoint).port
  const pageWsUrl = await getPageTarget(parseInt(port))
  const cdp = await connectCDP(pageWsUrl)

  const collector = new ConsoleCollector()
  collector.attach(cdp)
  const exceptions: string[] = []
  cdp.on('Runtime.exceptionThrown', (params: any) => {
    const ex = params?.exceptionDetails
    exceptions.push(
      `[EXCEPTION] ${ex?.text || ''} :: ${ex?.exception?.description || JSON.stringify(ex?.exception?.value || '')}`
    )
  })

  await cdp.send('Runtime.enable')
  await cdp.send('Console.enable')
  await cdp.send('Page.enable')
  await cdp.send('Page.navigate', { url: TARGET_URL })

  await new Promise(r => setTimeout(r, WAIT_MS))

  const apiCheck = await cdp.send<{ result: { value: string } }>('Runtime.evaluate', {
    expression: `JSON.stringify({
      mirrorTest: typeof window.__mirrorTest,
      suites: typeof window.__mirrorTestSuites,
      studio: typeof window.__mirrorStudio__,
      suitesLoadError: window.__suitesLoadError ? String(window.__suitesLoadError) : null
    })`,
  })

  console.log('API state:', apiCheck.result.value)
  console.log('\n--- Exceptions ---')
  exceptions.forEach(e => console.log(e))
  console.log('\n--- Console (last 60) ---')
  collector
    .getAll()
    .slice(-60)
    .forEach(m => console.log(`[${m.level}] ${m.text}`))

  cdp.close()
  chrome.kill()
}

main().catch(e => {
  console.error('FATAL:', e)
  process.exit(1)
})
