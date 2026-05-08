/**
 * Screenshot-File-Panel
 *
 * Headless Chrome auf localhost:5173/studio/. Schreibt die Personas-
 * Files (inkl. data.data → testet Phase 1.1) direkt in localStorage,
 * reloadet, schaltet das File-Panel sichtbar und macht Screenshots:
 *   - /tmp/mirror-shots/full.png        — komplette Studio-Seite
 *   - /tmp/mirror-shots/file-panel.png  — Ausschnitt des File-Trees
 *
 * Voraussetzung: `npm run studio` läuft auf 5173.
 */

import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'
import { ScreenshotCapture } from '../tools/test-runner/screenshot'
import * as fs from 'fs'
import * as path from 'path'
import type { CDPSession } from '../tools/test-runner/types'

const STUDIO_URL = 'http://localhost:5173/studio/'
const PROJECT = path.resolve('examples/personas-informatik')
const OUT = path.resolve('/tmp/mirror-shots')

async function main(): Promise<void> {
  fs.mkdirSync(OUT, { recursive: true })

  const files: Record<string, string> = {}
  for (const name of ['app.mir', 'components.com', 'data.data', 'tokens.tok']) {
    files[name] = fs.readFileSync(path.join(PROJECT, name), 'utf8')
  }

  console.log('Launching headless Chrome…')
  const chrome = await launchChrome({ headless: true })
  const port = parseInt(new URL(chrome.wsEndpoint).port)
  const pageWs = await getPageTarget(port)
  const cdp = await connectCDP(pageWs)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  try {
    console.log('Navigating to', STUDIO_URL)
    await cdp.send('Page.navigate', { url: STUDIO_URL })
    await waitForLoad(cdp)
    await waitForTestAPI(cdp)

    // Realistic viewport (headless default may give 0-width Page.captureScreenshot)
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1600,
      height: 1000,
      deviceScaleFactor: 2,
      mobile: false,
    })

    // localStorage seeden + reload, damit der LocalStorageProvider
    // die echten 4 personas-informatik-Files sieht statt DEFAULT_PROJECT.
    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('mirror-files', ${JSON.stringify(JSON.stringify(files))});`,
    })
    await cdp.send('Page.reload')
    await waitForLoad(cdp)
    await waitForTestAPI(cdp)
    await sleep(700)

    // File-Panel sichtbar schalten (Default ist files: false in MVP-Mode)
    await cdp.send('Runtime.evaluate', {
      expression: `window.studio?.actions?.setPanelVisibility?.('files', true);`,
    })
    await sleep(500)

    // Diagnostik
    const diag = await cdp.send<{ result: { value: unknown } }>('Runtime.evaluate', {
      returnByValue: true,
      expression: `
        (() => {
          const dom = Array.from(
            document.querySelectorAll('.file-tree-file')
          ).map(el => ({
            path: el.dataset.path,
            text: (el.querySelector('span:last-child')?.textContent || '').trim()
          }));
          const panelEl = document.getElementById('explorer-panel');
          const panelStyle = panelEl ? getComputedStyle(panelEl) : null;
          return {
            dom,
            stored: Object.keys(JSON.parse(localStorage.getItem('mirror-files') || '{}')),
            panelDisplay: panelStyle ? panelStyle.display : 'no-panel',
            panelWidth: panelEl ? panelEl.getBoundingClientRect().width : 0,
          };
        })()
      `,
    })
    console.log('Diag:', JSON.stringify(diag.result.value, null, 2))

    const shot = new ScreenshotCapture(cdp, OUT)
    const fullPath = await shot.capturePage('full.png')
    let panelPath: string | null = null
    try {
      panelPath = await shot.captureElement('file-panel.png', '#explorer-panel')
    } catch (e) {
      console.warn('panel screenshot failed:', (e as Error).message)
    }
    console.log('Full screenshot:', fullPath)
    if (panelPath) console.log('File-panel screenshot:', panelPath)
  } finally {
    chrome.kill()
  }
}

async function waitForLoad(cdp: CDPSession): Promise<void> {
  return new Promise(resolve => {
    cdp.on('Page.loadEventFired', () => resolve())
  })
}

async function waitForTestAPI(cdp: CDPSession, timeout = 30000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const r = await cdp.send<{ result: { value: boolean } }>('Runtime.evaluate', {
      expression: `typeof window.__dragTest !== 'undefined' && typeof window.__mirrorTest !== 'undefined'`,
      returnByValue: true,
    })
    if (r.result.value) return
    await sleep(250)
  }
  throw new Error('Test API never became available')
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

main().catch(e => {
  console.error(e)
  process.exit(1)
})
