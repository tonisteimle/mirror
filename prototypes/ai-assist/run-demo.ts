/**
 * AI Assist Demo - Complete Runner
 *
 * Startet alle Server und führt die Demo aus.
 */

import { spawn, ChildProcess, execSync } from 'child_process'
import { launchChrome } from '../../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../../tools/test-runner/cdp'
import * as fs from 'fs'
import * as http from 'http'
import * as path from 'path'

const CONFIG = {
  aiPort: 3456,
  filePort: 8765,
  prototypeUrl: 'http://localhost:8765/variants/codemirror-poc.html',
  charDelay: 40,
  wordPauseChance: 0.25,
  wordPauseMs: 120,
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractPortFromWsUrl(wsUrl: string): number {
  const match = wsUrl.match(/:(\d+)\//)
  if (!match) throw new Error('Could not extract port from: ' + wsUrl)
  return parseInt(match[1], 10)
}

// =============================================================================
// File Server
// =============================================================================

function startFileServer(): Promise<http.Server> {
  return new Promise(resolve => {
    const baseDir = path.join(__dirname)

    const server = http.createServer((req, res) => {
      let filePath = path.join(baseDir, req.url || '/')
      if (filePath.endsWith('/')) filePath += 'index.html'

      const ext = path.extname(filePath)
      const contentType: Record<string, string> = {
        '.html': 'text/html',
        '.js': 'application/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
      }

      fs.readFile(filePath, (err, content) => {
        if (err) {
          res.writeHead(404)
          res.end('Not Found: ' + req.url)
        } else {
          res.writeHead(200, { 'Content-Type': contentType[ext] || 'text/plain' })
          res.end(content)
        }
      })
    })

    server.listen(CONFIG.filePort, () => {
      console.log(`[File Server] http://localhost:${CONFIG.filePort}`)
      resolve(server)
    })
  })
}

// =============================================================================
// Mock AI Server (schnell, ohne Claude CLI)
// =============================================================================

function startMockAIServer(): Promise<http.Server> {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') {
        res.writeHead(204)
        res.end()
        return
      }

      if (req.method === 'POST' && req.url === '/complete') {
        let body = ''
        req.on('data', chunk => (body += chunk))
        req.on('end', () => {
          const { code } = JSON.parse(body)

          // Simuliere kurze AI-Verarbeitung
          setTimeout(() => {
            // "Validiere" den Code - füge fehlende Properties hinzu
            let validated = code

            // Beispiel-Verbesserungen
            if (code.includes('bg #') && !code.includes('col ')) {
              // Dunkler Hintergrund → weißer Text
              if (code.includes('#1a1a1a') || code.includes('#0a0a0a') || code.includes('#111')) {
                validated = code.replace(/\n$/, '') + ', col white\n'
              }
            }

            // Füge rad hinzu wenn bg vorhanden
            if (code.includes('bg #') && !code.includes('rad ')) {
              validated = validated.trim() + ', rad 8'
            }

            console.log(`[Mock AI] "${code.trim().substring(0, 30)}..." → validated`)

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(
              JSON.stringify({
                success: true,
                code: validated.trim(),
              })
            )
          }, 300) // 300ms Verzögerung für Realismus
        })
        return
      }

      res.writeHead(404)
      res.end('Not Found')
    })

    server.listen(CONFIG.aiPort, () => {
      console.log(`[Mock AI Server] http://localhost:${CONFIG.aiPort}`)
      resolve(server)
    })
  })
}

// =============================================================================
// Screenshot & Typing
// =============================================================================

let screenshotCounter = 0

async function takeScreenshot(cdp: any, label: string): Promise<void> {
  screenshotCounter++
  const filename = `/tmp/demo-${screenshotCounter}-${label}.png`
  const result = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const buffer = Buffer.from(result.data, 'base64')
  fs.writeFileSync(filename, buffer)
  console.log(`  📸 ${filename}`)
}

async function typeSlowly(cdp: any, text: string): Promise<void> {
  process.stdout.write('\n  ▸ ')

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    // Type character via CDP
    await cdp.send('Input.insertText', { text: char })

    // Trigger input event
    await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('editor').dispatchEvent(new Event('input', { bubbles: true }))`,
    })

    // Show in terminal
    if (char === '\n') {
      process.stdout.write('\n    ')
    } else {
      process.stdout.write(char)
    }

    await sleep(CONFIG.charDelay)

    // Random pause after space
    if (char === ' ' && Math.random() < CONFIG.wordPauseChance) {
      await sleep(CONFIG.wordPauseMs)
    }
  }

  process.stdout.write('\n')
}

async function getStatus(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('status')?.textContent || ''`,
  })
  return result.result?.value || ''
}

async function waitForValidation(cdp: any, timeout = 10000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const status = await getStatus(cdp)
    process.stdout.write(`\r  Status: ${status.padEnd(30)}`)
    if (status.includes('Validiert')) {
      process.stdout.write('\n')
      return true
    }
    await sleep(200)
  }
  process.stdout.write('\n')
  return false
}

async function focusEditor(cdp: any): Promise<void> {
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').focus()`,
  })
  await sleep(100)
}

// =============================================================================
// Main Demo
// =============================================================================

async function main() {
  console.log('═'.repeat(60))
  console.log('  AI Assist - 2 Stufen Demo')
  console.log('═'.repeat(60))

  // Start servers
  console.log('\n[1] Starte Server...')
  const fileServer = await startFileServer()
  const aiServer = await startMockAIServer()

  let chrome: any = null

  try {
    // Launch Chrome
    console.log('\n[2] Starte Chrome...')
    chrome = await launchChrome({
      headless: false,
      args: ['--window-size=1200,800', '--window-position=100,100'],
    })
    const debugPort = extractPortFromWsUrl(chrome.wsEndpoint)

    // Create page
    const browserCdp = await connectCDP(chrome.wsEndpoint)
    await browserCdp.send('Target.createTarget', { url: CONFIG.prototypeUrl })
    await sleep(2000)

    // Connect to page
    const pageWsUrl = await getPageTarget(debugPort)
    const cdp = await connectCDP(pageWsUrl)
    await cdp.send('Runtime.enable')
    await cdp.send('Page.enable')

    console.log('[3] Seite geladen')
    await takeScreenshot(cdp, 'initial')

    // === Phase 1: Erste Zeile ===
    console.log('\n[4] Tippe: Frame bg #1a1a1a')
    await focusEditor(cdp)
    await typeSlowly(cdp, 'Frame bg #1a1a1a')
    await takeScreenshot(cdp, 'draft-1')

    console.log('\n[5] Warte auf AI-Validierung...')
    await sleep(1800) // 1.5s Pause + etwas Buffer
    const validated1 = await waitForValidation(cdp)

    if (validated1) {
      console.log('  ✅ Erste Zeile validiert!')
      await takeScreenshot(cdp, 'validated-1')
    }

    // === Phase 2: Zweite Zeile ===
    console.log('\n[6] Tippe: Text "Hello World"')
    await focusEditor(cdp)
    await typeSlowly(cdp, '\n  Text "Hello World"')
    await takeScreenshot(cdp, 'draft-2')

    console.log('\n[7] Warte auf AI-Validierung...')
    await sleep(1800)
    const validated2 = await waitForValidation(cdp)

    if (validated2) {
      console.log('  ✅ Zweite Zeile validiert!')
      await takeScreenshot(cdp, 'validated-2')
    }

    // === Phase 3: Dritte Zeile ===
    console.log('\n[8] Tippe: Button "Save"')
    await focusEditor(cdp)
    await typeSlowly(cdp, '\n  Button "Save", bg #2271C1')
    await takeScreenshot(cdp, 'draft-3')

    console.log('\n[9] Warte auf AI-Validierung...')
    await sleep(1800)
    const validated3 = await waitForValidation(cdp)

    if (validated3) {
      console.log('  ✅ Dritte Zeile validiert!')
      await takeScreenshot(cdp, 'final')
    }

    // Final result
    console.log('\n' + '─'.repeat(60))
    const finalCode = await cdp.send('Runtime.evaluate', {
      expression: `document.getElementById('editor')?.innerText || ''`,
    })
    console.log('Finaler Code:')
    console.log(finalCode.result?.value || '(leer)')
    console.log('─'.repeat(60))

    console.log('\n✅ Screenshots in /tmp/demo-*.png')
    console.log('[Browser bleibt 8s offen...]')
    await sleep(8000)
  } finally {
    // Cleanup
    if (chrome) await chrome.kill()
    fileServer.close()
    aiServer.close()
    console.log('\nDemo beendet.')
  }
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
