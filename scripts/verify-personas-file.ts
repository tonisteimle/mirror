import { writeFileSync } from 'fs'
import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'

const FILE_URL =
  'file:///Users/toni.steimle@fhnw.ch/Documents/Mirror/examples/personas-informatik/preview.html'
;(async () => {
  const chrome = await launchChrome({ headless: true })
  const port = parseInt(chrome.wsEndpoint.match(/:(\d+)\//)![1], 10)
  const pageWs = await getPageTarget(port)
  const session = await connectCDP(pageWs)
  await session.send('Runtime.enable')
  await session.send('Page.enable')
  const loadDone = new Promise<void>(r => session.on('Page.loadEventFired', () => r()))
  await session.send('Page.navigate', { url: FILE_URL })
  await Promise.race([loadDone, new Promise(r => setTimeout(r, 8000))])
  await new Promise(r => setTimeout(r, 1500))
  // Lukas dim grid (around y=2500)
  await session.send('Runtime.evaluate', { expression: `window.scrollTo(0, 2200)` })
  await new Promise(r => setTimeout(r, 300))
  const s1 = await session.send<any>('Page.captureScreenshot', { format: 'png' })
  writeFileSync('/tmp/personas-lukas-dim.png', Buffer.from(s1.data, 'base64'))
  // Innere Stimme (around y=3500)
  await session.send('Runtime.evaluate', { expression: `window.scrollTo(0, 3000)` })
  await new Promise(r => setTimeout(r, 300))
  const s2 = await session.send<any>('Page.captureScreenshot', { format: 'png' })
  writeFileSync('/tmp/personas-inneres.png', Buffer.from(s2.data, 'base64'))
  session.close()
  chrome.kill()
})().catch(e => {
  console.error(e)
  process.exit(1)
})
