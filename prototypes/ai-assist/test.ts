/**
 * AI Assist Prototype - Realistic Test Runner
 *
 * Simuliert echte Keystrokes und testet komplexe Szenarien
 */

import { launchChrome } from '../../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../../tools/test-runner/cdp'

const CONFIG = {
  prototypeUrl: 'http://localhost:8765/',
  typingDelay: 30, // ms between keystrokes (realistic typing speed)
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
// Test Scenarios
// =============================================================================

interface TestScenario {
  name: string
  code: string
  description: string
}

const SCENARIOS: TestScenario[] = [
  {
    name: 'Simple Button',
    code: `Button "Save" bg blue`,
    description: 'Einfacher Button ohne Styling',
  },
  {
    name: 'Form Structure',
    code: `Frame ver gap 12
  Frame hor gap 8
    Text "Vorname"
    Input placeholder "Max"
  Frame hor gap 8
    Text "Nachname"
    Input placeholder "Mustermann"
  Button "Speichern"`,
    description: 'Formular-Struktur mit Labels und Inputs',
  },
  {
    name: 'Card Component',
    code: `Frame bg #1a1a1a pad 16 rad 8
  Text "Titel" fs 18
  Text "Beschreibung"
  Frame hor gap 8
    Button "Abbrechen"
    Button "OK" bg blue`,
    description: 'Card mit Titel, Text und Buttons',
  },
  {
    name: 'Navigation',
    code: `Frame hor spread
  Text "Logo"
  Frame hor gap 16
    Text "Home"
    Text "About"
    Text "Contact"
  Button "Login"`,
    description: 'Navigation Bar',
  },
  {
    name: 'Incomplete Code',
    code: `Frame
  Button
  Text
  Input`,
    description: 'Unvollständiger Code ohne Attribute',
  },
]

// =============================================================================
// CDP Typing Simulation
// =============================================================================

async function typeText(cdp: any, text: string): Promise<void> {
  // Type via JavaScript - more reliable than CDP Input
  const escaped = JSON.stringify(text)
  await cdp.send('Runtime.evaluate', {
    expression: `
      (function() {
        const editor = document.getElementById('editor');
        const text = ${escaped};

        // Type character by character with events
        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          if (char === '\\n') {
            // Insert newline
            document.execCommand('insertLineBreak');
          } else {
            document.execCommand('insertText', false, char);
          }
        }

        // Trigger input event
        editor.dispatchEvent(new Event('input', { bubbles: true }));
        return 'Typed ' + text.length + ' chars';
      })()
    `,
  })

  // Add realistic delay based on text length
  await sleep(Math.min(text.length * 10, 500))
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

async function focusEditor(cdp: any): Promise<void> {
  await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor').focus()`,
  })
}

async function getEditorContent(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('editor')?.innerText || ''`,
  })
  return result.result?.value || ''
}

async function getStatus(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('status')?.textContent || ''`,
  })
  return result.result?.value || ''
}

async function getLatency(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('latency')?.textContent || ''`,
  })
  return result.result?.value || ''
}

async function getMode(cdp: any): Promise<string> {
  const result = await cdp.send('Runtime.evaluate', {
    expression: `document.getElementById('modeText')?.textContent || ''`,
  })
  return result.result?.value || ''
}

// =============================================================================
// Run Single Test
// =============================================================================

interface TestResult {
  name: string
  input: string
  output: string
  latency: string
  mode: string
  success: boolean
  linesAdded: number
}

async function runScenario(cdp: any, scenario: TestScenario): Promise<TestResult> {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`📝 ${scenario.name}`)
  console.log(`   ${scenario.description}`)
  console.log('─'.repeat(60))

  // Clear and focus
  await clearEditor(cdp)
  await sleep(200)
  await focusEditor(cdp)
  await sleep(100)

  // Type the code character by character
  console.log('\n[Typing...]')
  const typingStart = Date.now()
  await typeText(cdp, scenario.code)
  const typingTime = Date.now() - typingStart
  console.log(`[Typed ${scenario.code.length} chars in ${typingTime}ms]`)

  // Wait for pause detection (1.5s) + buffer
  console.log('[Waiting for AI...]')
  await sleep(2000)

  // Poll for completion
  const pollStart = Date.now()
  let status = ''
  for (let i = 0; i < 30; i++) {
    status = await getStatus(cdp)
    process.stdout.write(`\r  Status: ${status.padEnd(40)}`)

    if (
      status.includes('Validiert') ||
      status.includes('Zeilen') ||
      status.includes('korrigiert')
    ) {
      break
    }
    if (status.includes('Fehler')) {
      break
    }
    await sleep(500)
  }
  console.log()

  // Get results
  const output = await getEditorContent(cdp)
  const latency = await getLatency(cdp)
  const mode = await getMode(cdp)

  // Calculate lines added
  const inputLines = scenario.code.split('\n').length
  const outputLines = output.split('\n').length
  const linesAdded = outputLines - inputLines

  // Display results
  console.log('\n[Input]')
  console.log(
    scenario.code
      .split('\n')
      .map(l => `  ${l}`)
      .join('\n')
  )
  console.log('\n[Output]')
  console.log(
    output
      .split('\n')
      .map(l => `  ${l}`)
      .join('\n')
  )
  console.log(
    `\n[Stats] Latency: ${latency}, Mode: ${mode}, Lines: ${inputLines} → ${outputLines} (${linesAdded >= 0 ? '+' : ''}${linesAdded})`
  )

  return {
    name: scenario.name,
    input: scenario.code,
    output,
    latency,
    mode,
    success: mode === 'Validated' && output.length >= scenario.code.length,
    linesAdded,
  }
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('═'.repeat(60))
  console.log('  AI Assist Prototype - Realistic Test Suite')
  console.log('═'.repeat(60))

  // Launch Chrome
  console.log('\n[Setup] Launching Chrome...')
  const chrome = await launchChrome({ headless: false })
  const debugPort = extractPortFromWsUrl(chrome.wsEndpoint)

  // Create page
  const browserCdp = await connectCDP(chrome.wsEndpoint)
  await browserCdp.send('Target.createTarget', { url: CONFIG.prototypeUrl })
  await sleep(2000)

  // Connect to page
  const pageWsUrl = await getPageTarget(debugPort)
  const cdp = await connectCDP(pageWsUrl)
  await cdp.send('Runtime.enable')

  console.log('[Setup] Ready\n')

  // Run all scenarios
  const results: TestResult[] = []

  for (const scenario of SCENARIOS) {
    const result = await runScenario(cdp, scenario)
    results.push(result)
    await sleep(1000) // Pause between tests
  }

  // Summary
  console.log('\n' + '═'.repeat(60))
  console.log('  SUMMARY')
  console.log('═'.repeat(60))

  for (const r of results) {
    const icon = r.success ? '✅' : '❌'
    const latency = r.latency || 'N/A'
    console.log(
      `${icon} ${r.name.padEnd(20)} ${latency.padStart(8)} ${r.linesAdded >= 0 ? '+' : ''}${r.linesAdded} lines`
    )
  }

  const passed = results.filter(r => r.success).length
  console.log(`\nPassed: ${passed}/${results.length}`)

  // Keep browser open
  console.log('\n[Browser stays open for 10s...]')
  await sleep(10000)

  // Cleanup
  await chrome.kill()
  console.log('Done.')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
