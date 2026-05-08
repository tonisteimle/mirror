/**
 * Verify-Tauri-File-Panel
 *
 * Headless Chrome lädt die Studio-Page, injiziert die Files aus
 * examples/personas-informatik in localStorage (inkl. data.data),
 * reloadet, wartet auf Render und macht einen Screenshot der linken
 * File-Panel-Spalte. Validiert die Phase-1.1-Änderung (.data jetzt im
 * FILE_EXTENSIONS.data) ohne Tauri-Runtime.
 */
import { launchChrome } from '../tools/test-runner/chrome'
import { CDPClient } from '../tools/test-runner/cdp'
import { ScreenshotCapture } from '../tools/test-runner/screenshot'
import * as fs from 'fs'
import * as path from 'path'

const STUDIO_URL = 'http://localhost:5173/studio/'
const PROJECT = path.resolve('examples/personas-informatik')
const OUT_DIR = path.resolve('/tmp/mirror-shots')

async function main(): Promise<void> {
  // Lade die 4 Mirror-Files (app.mir, components.com, data.data, tokens.tok)
  const files: Record<string, string> = {}
  for (const name of ['app.mir', 'components.com', 'data.data', 'tokens.tok']) {
    files[name] = fs.readFileSync(path.join(PROJECT, name), 'utf8')
  }
  console.log('Loaded', Object.keys(files).length, 'files from', PROJECT)

  const chrome = await launchChrome({ headless: true, port: 9444 })
  console.log('Chrome on', chrome.port)

  try {
    const cdp = await CDPClient.connect(chrome.wsUrl)
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Network.enable')

    // Erstmal die Page öffnen, damit localStorage zu DIESER Origin existiert
    await cdp.send('Page.navigate', { url: STUDIO_URL })
    await waitForLoad(cdp)

    // localStorage füllen
    const filesJson = JSON.stringify(files).replace(/`/g, '\\`')
    await cdp.send('Runtime.evaluate', {
      expression: `localStorage.setItem('mirror-files', ${JSON.stringify(JSON.stringify(files))}); 'ok'`,
    })
    console.log('localStorage seeded')

    // Reload, damit der LocalStorage-Provider die Files aufpickt
    await cdp.send('Page.reload')
    await waitForLoad(cdp)
    await sleep(800) // Studio braucht einen Tick zum Mount/Render

    // Hole die Tree-Items (was ist tatsächlich sichtbar)
    const treeReadout = await cdp.send('Runtime.evaluate', {
      expression: `
        Array.from(document.querySelectorAll('.file-tree-file, .file-tree-folder'))
          .map(el => ({
            kind: el.classList.contains('file-tree-file') ? 'file' : 'folder',
            path: el.dataset.path,
            text: el.querySelector('span:last-child')?.textContent?.trim() ?? ''
          }))
      `,
      returnByValue: true,
    })
    console.log('FileTree-Items:')
    for (const it of treeReadout.result.value as Array<{
      kind: string
      path?: string
      text: string
    }>) {
      console.log(`  ${it.kind.padEnd(7)} ${it.path?.padEnd(30) ?? ''} ${it.text}`)
    }

    // Screenshot
    fs.mkdirSync(OUT_DIR, { recursive: true })
    const shot = new ScreenshotCapture(cdp, OUT_DIR)
    await shot.capturePage('file-panel.png')
    console.log('Screenshot:', path.join(OUT_DIR, 'file-panel.png'))
  } finally {
    await chrome.kill()
  }
}

async function waitForLoad(cdp: CDPClient): Promise<void> {
  return new Promise(resolve => {
    const handler = (msg: { method?: string }) => {
      if (msg.method === 'Page.loadEventFired') {
        cdp.off('event', handler)
        resolve()
      }
    }
    cdp.on('event', handler)
  })
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

main().catch(err => {
  console.error(err)
  process.exit(1)
})
