/**
 * AI Assist Demo - Sichtbares Tippen
 *
 * Simuliert echtes Tippen Buchstabe für Buchstabe,
 * sichtbar im Browser UND im Terminal.
 */

import { launchChrome } from '../../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../../tools/test-runner/cdp'
import * as fs from 'fs'

const CONFIG = {
  prototypeUrl: 'http://localhost:8765/variants/inline-diff.html',
  charDelay: 50, // ms zwischen Buchstaben
  wordPauseChance: 0.3, // Chance für kurze Pause nach Wort
  wordPauseMs: 150, // Pause nach Wort
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractPortFromWsUrl(wsUrl: string): number {
  const match = wsUrl.match(/:(\d+)\//)
  if (!match) throw new Error('Could not extract port from: ' + wsUrl)
  return parseInt(match[1], 10)
}

let screenshotCounter = 0
async function takeScreenshot(cdp: any, label: string): Promise<void> {
  screenshotCounter++
  const filename = `/tmp/demo-${screenshotCounter}-${label}.png`
  const result = await cdp.send('Page.captureScreenshot', { format: 'png' })
  const buffer = Buffer.from(result.data, 'base64')
  fs.writeFileSync(filename, buffer)
  console.log(`  📸 ${filename}`)
}

// =============================================================================
// Realistic Typing - Buchstabe für Buchstabe mit sichtbarer Ausgabe
// =============================================================================

async function typeCharacter(cdp: any, char: string): Promise<void> {
  // Use CDP Input.insertText - this actually works!
  await cdp.send('Input.insertText', { text: char })

  // Trigger input event for the app to detect changes
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').dispatchEvent(new Event('input', { bubbles: true }))`,
  })
}

async function typeSlowly(cdp: any, text: string): Promise<void> {
  process.stdout.write('\n  ▸ ')

  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    // Type the character
    await typeCharacter(cdp, char)

    // Show in terminal
    if (char === '\n') {
      process.stdout.write('\n    ')
    } else {
      process.stdout.write(char)
    }

    // Delay
    await sleep(CONFIG.charDelay)

    // Random pause after space (simulates thinking)
    if (char === ' ' && Math.random() < CONFIG.wordPauseChance) {
      await sleep(CONFIG.wordPauseMs)
    }
  }

  process.stdout.write('\n')
}

async function clearEditor(cdp: any): Promise<void> {
  await cdp.send('Runtime.evaluate', {
    expression: `
      const editor = document.getElementById('editor');
      editor.innerHTML = '';
      editor.focus();
    `,
  })
}

async function getStatus(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('status')?.textContent || ''`,
  })
  return result.result?.value || ''
}

async function getEditorContent(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor')?.innerText || ''`,
  })
  return result.result?.value || ''
}

async function waitForStatus(cdp: any, target: string, timeout = 15000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const status = await getStatus(cdp)
    process.stdout.write(`\r  Status: ${status.padEnd(30)}`)
    if (status.includes(target)) {
      process.stdout.write('\n')
      return true
    }
    await sleep(300)
  }
  process.stdout.write('\n')
  return false
}

// =============================================================================
// Main - Simplified Demo with Screenshots
// =============================================================================

async function main() {
  console.log('═'.repeat(60))
  console.log('  AI Assist - Live Demo mit Screenshots')
  console.log('═'.repeat(60))

  // Launch Chrome
  console.log('\n[1] Starte Chrome...')
  const chrome = await launchChrome({
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

  console.log('[2] Seite geladen\n')
  await takeScreenshot(cdp, 'initial')

  // Focus editor
  console.log('[3] Fokussiere Editor...')
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').focus()`,
  })
  await sleep(300)

  // Type first line
  console.log('[4] Tippe: Frame bg #1a1a1a')
  await typeSlowly(cdp, 'Frame bg #1a1a1a')
  await takeScreenshot(cdp, 'after-typing')

  // Wait for AI
  console.log('\n[5] Warte auf AI (1.5s Pause + Verarbeitung)...')
  await sleep(2000)
  const found = await waitForStatus(cdp, 'Änderungen', 10000)

  if (found) {
    console.log('[6] AI hat geantwortet!')
    await takeScreenshot(cdp, 'validated')
  } else {
    // Check if we got "Validiert" instead
    const currentStatus = await getStatus(cdp)
    if (currentStatus.includes('Validiert')) {
      console.log('[6] AI hat validiert!')
      await takeScreenshot(cdp, 'validated')
    } else {
      console.log('[6] Timeout - Status:', currentStatus)
      await takeScreenshot(cdp, 'timeout')
    }
  }

  // === PHASE 2: Continue typing after validation ===
  console.log('\n[7] Tippe weiter: Enter + "  Text Hello"')

  // Press Enter and type more
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').focus()`,
  })
  await sleep(200)

  await cdp.send('Input.insertText', { text: '\n  Text "Hello"' })
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').dispatchEvent(new Event('input', { bubbles: true }))`,
  })

  await takeScreenshot(cdp, 'typing-more')

  // Wait for second AI validation
  console.log('[8] Warte auf zweite AI-Validierung...')
  await sleep(2000)
  await waitForStatus(cdp, 'Validiert', 15000)
  await takeScreenshot(cdp, 'validated-2')

  // === PHASE 3: One more line ===
  console.log('\n[9] Noch eine Zeile: Button "Save"')

  await cdp.send('Input.insertText', { text: '\n  Button "Save"' })
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').dispatchEvent(new Event('input', { bubbles: true }))`,
  })

  await takeScreenshot(cdp, 'typing-button')

  console.log('[10] Warte auf dritte AI-Validierung...')
  await sleep(2000)
  await waitForStatus(cdp, 'Validiert', 15000)
  await takeScreenshot(cdp, 'final')

  // Show final result
  console.log('\n' + '─'.repeat(60))
  const finalCode = await getEditorContent(cdp)
  console.log('Finaler Editor-Inhalt:')
  console.log(finalCode || '(leer)')
  console.log('─'.repeat(60))

  console.log('\n✅ Screenshots in /tmp/demo-*.png')
  console.log('[Browser bleibt 10s offen...]')
  await sleep(10000)

  await chrome.kill()
  console.log('Demo beendet.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
