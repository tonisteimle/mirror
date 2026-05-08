/**
 * Debug-Tauri-Mode
 *
 * Lädt Studio in headless Chrome, installiert einen Fake-TauriBridge der
 * gegen examples/personas-informatik via node-fs spricht, ruft
 * storage.openProject() programmatisch auf, und liest die Compile-
 * Diagnose aus dem Studio. Damit reproduzieren wir den
 * "Unexpected identifier '$get'"-Fehler ohne Tauri-WebView.
 */

import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as http from 'node:http'
import type { CDPSession } from '../tools/test-runner/types'

const STUDIO_URL = 'http://localhost:5173/studio/'
const PROJECT = path.resolve('examples/personas-informatik')
const FS_PORT = 7456

// Lokaler HTTP-Server, der die Tauri-FS-API spiegelt (read/list/exists).
function startFsServer(): http.Server {
  return http
    .createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST,GET,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      if (req.method === 'OPTIONS') {
        res.end()
        return
      }

      let body = ''
      req.on('data', c => (body += c))
      req.on('end', () => {
        try {
          const args = body ? JSON.parse(body) : {}
          const url = new URL(req.url!, 'http://x')
          if (url.pathname === '/read_file') {
            const content = fs.readFileSync(args.path, 'utf8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(content))
          } else if (url.pathname === '/list_directory') {
            const entries = fs.readdirSync(args.path, { withFileTypes: true })
            res.setHeader('Content-Type', 'application/json')
            res.end(
              JSON.stringify({
                path: args.path,
                files: entries.map(e => ({ name: e.name, is_dir: e.isDirectory() })),
              })
            )
          } else if (url.pathname === '/path_exists') {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(fs.existsSync(args.path)))
          } else {
            res.statusCode = 404
            res.end()
          }
        } catch (e) {
          res.statusCode = 500
          res.end(String(e))
        }
      })
    })
    .listen(FS_PORT)
}

async function main(): Promise<void> {
  const fsServer = startFsServer()
  console.log('FS bridge on', FS_PORT)

  const chrome = await launchChrome({ headless: true })
  const port = parseInt(new URL(chrome.wsEndpoint).port)
  const pageWs = await getPageTarget(port)
  const cdp = await connectCDP(pageWs)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')

  // Inject the fake TauriBridge BEFORE the studio scripts run, so
  // isTauri() detection succeeds and the LocalStorageProvider is bypassed.
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      window.__TAURI_INTERNALS__ = { metadata: { currentWindow: { label: 'main' } } };

      const fsCall = async (cmd, args) => {
        const r = await fetch('http://localhost:${FS_PORT}/' + cmd, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(args || {})
        });
        if (!r.ok) throw new Error('fs ' + cmd + ' failed');
        return await r.json();
      };

      window.TauriBridge = {
        isTauri: () => true,
        fs: {
          readFile: (path) => fsCall('read_file', { path }),
          writeFile: async () => {},
          listDirectory: (path) => fsCall('list_directory', { path }),
          createDirectory: async () => {},
          deletePath: async () => {},
          renamePath: async () => {},
          pathExists: (path) => fsCall('path_exists', { path }),
        },
        dialog: {
          openFolder: async () => null,
          openFile: async () => null,
        },
        project: {
          openProject: async (p) => { console.log('[mock] open_project', p) },
          createProject: async () => {},
          getRecentProjects: async () => [${JSON.stringify(PROJECT)}],
        },
        window: {
          setTitle: async () => {},
        },
      };
    `,
  })

  await cdp.send('Page.navigate', { url: STUDIO_URL })
  await new Promise<void>(r => cdp.on('Page.loadEventFired', () => r()))
  await new Promise(r => setTimeout(r, 1500))

  // Hook console events to surface error stacks
  cdp.on('Runtime.consoleAPICalled', (params: unknown) => {
    const p = params as { type: string; args: Array<{ value?: unknown; description?: string }> }
    const text = p.args.map(a => a.value ?? a.description ?? '').join(' ')
    if (
      p.type === 'error' ||
      p.type === 'warning' ||
      text.includes('compile') ||
      text.includes('$get') ||
      text.includes('parse') ||
      text.includes('Unexpected')
    ) {
      console.log(`[browser:${p.type}]`, text.slice(0, 500))
    }
  })

  // Trigger openProject programmatically
  const open = await cdp.send<{ result: { value: unknown } }>('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `
      (async () => {
        try {
          const path = ${JSON.stringify(PROJECT)};
          const studio = window.studio;
          if (!studio?.actions?.setPanelVisibility) return { error: 'no studio actions' };
          studio.actions.setPanelVisibility('files', true);
          if (window.desktopFiles?.loadFolder) {
            await window.desktopFiles.loadFolder(path);
          } else {
            return { error: 'no desktopFiles.loadFolder' };
          }
          await new Promise(r => setTimeout(r, 1500));
          return { ok: true };
        } catch (e) {
          return { error: String(e) };
        }
      })()
    `,
  })
  console.log('Open result:', open.result.value)

  // Snapshot what the studio sees
  const diag = await cdp.send<{ result: { value: unknown } }>('Runtime.evaluate', {
    returnByValue: true,
    expression: `
      (() => {
        const filesGlobal = window.files || {};
        const desktop = window.desktopFiles?.getFiles?.() || {};
        return {
          window_files_keys: Object.keys(filesGlobal),
          window_files_sample: Object.fromEntries(Object.entries(filesGlobal).slice(0, 4).map(([k, v]) => [k, v.slice(0, 80)])),
          desktop_keys: Object.keys(desktop),
          desktop_sample: Object.fromEntries(Object.entries(desktop).slice(0, 4).map(([k, v]) => [k, v.slice(0, 80)])),
          currentFile: window.getCurrentFile?.() ?? null,
          previewError: document.querySelector('#preview')?.textContent?.slice(0, 300) ?? '',
        };
      })()
    `,
  })
  console.log('Diag:', JSON.stringify(diag.result.value, null, 2))

  chrome.kill()
  fsServer.close()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
