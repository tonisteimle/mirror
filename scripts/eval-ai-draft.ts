/**
 * AI Draft-Mode Evaluation Driver
 *
 * Runs a curated set of `??` draft-mode scenarios against the live Claude CLI,
 * capturing for each: the EXACT prompt sent (post-buildDraftPrompt), the raw
 * AI response, the extracted code, the final editor source after replacement,
 * elapsed time, and compile result.
 *
 * Output: one markdown report per run in test-results/ai-eval-<timestamp>/.
 *
 * Prerequisites (start manually in separate terminals):
 *   npm run studio       (port 5173)
 *   npm run ai-bridge    (port 3456)
 *
 * Run:
 *   npx tsx scripts/eval-ai-draft.ts                 # headless
 *   npx tsx scripts/eval-ai-draft.ts --headed        # watch the browser drive itself
 *   npx tsx scripts/eval-ai-draft.ts --only=3        # run only scenario index 3
 */

import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { spawn } from 'child_process'
import * as http from 'http'
import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'
import type { CDPSession } from '../tools/test-runner/types'

// =============================================================================
// SCENARIOS
// =============================================================================

interface Scenario {
  id: string
  label: string
  /** Project files. Use `__CURSOR__` to mark where the `??` block should land. */
  files: Record<string, string>
  /** Which file to set as current (where the `??` block goes). */
  currentFile: string
  /** Text after the `??` marker (the user's prompt). Empty for pure-content drafts. */
  prompt: string
  /** Prose description of what success looks like — for manual analysis. */
  expectations: string
}

const PROMPT_MARKER = '__PROMPT_HERE__'

const SCENARIOS: Scenario[] = [
  {
    id: '1-trivial-empty-context',
    label: 'Trivial: blauer Button, leerer Kontext',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'blauer button',
    expectations:
      'Erwarte einen einzelnen Button mit blauer Hintergrundfarbe, weißem Text, sinnvollem Padding/Radius. Keine erfundenen Komponenten-Definitionen. Sollte als Child von Frame pad 16 funktionieren (also 2-Space-Indent passend).',
  },
  {
    id: '2-multi-element-empty-context',
    label: 'Mehrere Elemente, leerer Kontext',
    files: {
      'index.mir': `canvas mobile, bg #18181b, col white\n\nFrame pad 16, gap 12\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'card mit titel und beschreibung und einem mehr-lesen button',
    expectations:
      'Erwarte: Card-artiger Container (Frame mit bg, pad, rad) → enthält Text-Titel (groß/bold), Text-Beschreibung (kleiner/muted), Button "Mehr lesen". Hierarchie/Indent korrekt. Kein erfundenes "Card:"-Component-Define falls keine Tokens/Components vorhanden.',
  },
  {
    id: '3-token-aware',
    label: 'Token-reicher Kontext: nutzt Tokens?',
    files: {
      'tokens.tok': `// Theme
primary.bg: #2271C1
surface.bg: #1a1a1a
canvas.bg: #18181b
text.col: #ffffff
muted.col: #a1a1aa
border.boc: #333333

// Spacing
s.pad: 8
m.pad: 12
l.pad: 16
m.gap: 8
m.rad: 8
`,
      'index.mir': `canvas mobile, bg $canvas, col $text\n\nFrame pad $l, gap $m\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'primärer button mit text "Speichern"',
    expectations:
      'KRITISCH: muss `bg $primary` nutzen, NICHT `bg #2271C1`. Sollte auch $text, $m oder $s für padding nutzen. Wenn AI #-Werte erfindet die in tokens.tok existieren = Test-Fail.',
  },
  {
    id: '4-component-reuse',
    label: 'Mit Btn-Component definiert: nutzen oder neu definieren?',
    files: {
      'tokens.tok': `primary.bg: #2271C1
danger.bg: #ef4444
text.col: #ffffff
m.pad: 12
m.rad: 6
`,
      'components.com': `Btn: pad $m, rad $m, col $text, cursor pointer
PrimaryBtn as Btn: bg $primary
DangerBtn as Btn: bg $danger
`,
      'index.mir': `canvas mobile\n\nFrame pad 16, gap 8\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt: 'drei buttons nebeneinander: Speichern (primär), Abbrechen, Löschen (gefährlich)',
    expectations:
      'KRITISCH: muss `PrimaryBtn "Speichern"`, `Btn "Abbrechen"`, `DangerBtn "Löschen"` nutzen. Nicht neue Buttons frisch definieren. Layout horizontal (hor) mit gap. Wenn AI eigene Btn:-Variante neu definiert = Test-Fail.',
  },
  {
    id: '5-real-feature',
    label: 'Real-World: komplettes Settings-Panel',
    files: {
      'tokens.tok': `primary.bg: #2271C1
surface.bg: #27272a
canvas.bg: #18181b
text.col: #ffffff
muted.col: #a1a1aa
border.boc: #333333
m.pad: 12
l.pad: 16
xl.pad: 24
m.gap: 8
l.gap: 16
m.rad: 8
xl.fs: 24
m.fs: 14
`,
      'index.mir': `canvas mobile, bg $canvas, col $text\n\nFrame pad $xl, gap $l\n  Text "Settings", fs $xl, weight bold\n  ${PROMPT_MARKER}`,
    },
    currentFile: 'index.mir',
    prompt:
      'drei sections untereinander: 1) "Notifications" mit einem Switch-Toggle, 2) "Theme" mit RadioGroup für Light/Dark/Auto, 3) "Language" mit Select für Deutsch/English/Français',
    expectations:
      'Komplexe Komposition: drei vertikal gestapelte Sections, jede mit Label + Control. Nutzt Tokens. Verwendet Mirror-Komponenten Switch, RadioGroup/RadioItem, Select/Item korrekt. Hierarchie tief aber nicht chaotisch.',
  },
]

// =============================================================================
// PRECHECKS
// =============================================================================

async function httpGet(url: string, timeoutMs = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let data = ''
      res.on('data', chunk => (data += chunk))
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(timeoutMs, () => {
      req.destroy()
      reject(new Error('timeout'))
    })
  })
}

async function assertServers(): Promise<void> {
  console.log('Checking servers...')
  try {
    await httpGet('http://localhost:5173/studio/index.html')
    console.log('  ✓ studio @ :5173')
  } catch {
    throw new Error('Studio not reachable at http://localhost:5173 — run `npm run studio`')
  }
  try {
    const data = await httpGet('http://localhost:3456/agent/check')
    if (!JSON.parse(data).available) throw new Error('claude CLI not available')
    console.log('  ✓ ai-bridge @ :3456')
  } catch (err) {
    throw new Error(
      `AI bridge not reachable at http://localhost:3456 — run \`npm run ai-bridge\`\n  ${err instanceof Error ? err.message : err}`
    )
  }
}

// =============================================================================
// CDP HELPERS
// =============================================================================

async function evaluate<T>(cdp: CDPSession, expression: string): Promise<T> {
  const r = await cdp.send<{
    result: { value: T; description?: string }
    exceptionDetails?: {
      text: string
      exception?: { description?: string; value?: unknown }
    }
  }>('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (r.exceptionDetails) {
    const detail =
      r.exceptionDetails.exception?.description ??
      r.exceptionDetails.exception?.value ??
      r.exceptionDetails.text
    const message = typeof detail === 'string' ? detail : JSON.stringify(detail)
    console.error('--- failing JS expression (full) ---')
    console.error(expression)
    console.error('--- end ---')
    throw new Error(message)
  }
  return r.result.value
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function waitForStudioReady(cdp: CDPSession, timeoutMs = 10000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ready = await evaluate<boolean>(
      cdp,
      `!!(window.__mirrorStudio__ && window.__mirrorStudio__.events && window.editor)`
    )
    if (ready) return
    await sleep(200)
  }
  throw new Error('Studio did not initialize within timeout')
}

// =============================================================================
// SCENARIO RUNNER
// =============================================================================

interface BridgeCall {
  prompt: string
  agentType: string
  responseOutput: string
  responseError: string | null
  elapsedMs: number
}

interface ScenarioResult {
  scenario: Scenario
  bridgeCall: BridgeCall | null
  finalSource: string
  extractedCode: string | null
  draftError: string | null
  compileOk: boolean
  compileErrors: string[]
  totalElapsedMs: number
}

async function runScenario(cdp: CDPSession, scenario: Scenario): Promise<ScenarioResult> {
  const startTotal = Date.now()
  console.log(`\n[${scenario.id}] ${scenario.label}`)
  console.log(`  prompt: "${scenario.prompt}"`)

  // Fresh studio load — no leftover state from prior scenario
  await cdp.send('Page.navigate', { url: 'http://localhost:5173/studio/?clean=1' })
  await sleep(1500)
  await waitForStudioReady(cdp)
  await sleep(500)

  // Install bridge shim + spy on runAgent so we capture exact prompt + raw response
  await evaluate<void>(
    cdp,
    `(() => {
       window.__installCliBridgeShim({ verbose: false });
       const orig = window.TauriBridge.agent.runAgent;
       window.__bridgeCalls = [];
       window.TauriBridge.agent.runAgent = async (prompt, agentType, projectPath, sessionId) => {
         const start = performance.now();
         const result = await orig(prompt, agentType, projectPath, sessionId);
         window.__bridgeCalls.push({
           prompt,
           agentType,
           responseOutput: result.output,
           responseError: result.error,
           elapsedMs: Math.round(performance.now() - start),
         });
         return result;
       };
     })()`
  )

  // Compute the indent of the line containing __PROMPT_HERE__ in the source
  // file — this is the indent the user would type the `??` marker at, so the
  // AI output lands at the right hierarchy level (child of the parent block,
  // not a sibling).
  const sourceWithMarker = scenario.files[scenario.currentFile]
  const markerLineMatch = sourceWithMarker.match(new RegExp(`(^|\\n)([ \\t]*)${PROMPT_MARKER}`))
  if (!markerLineMatch) {
    throw new Error(`Scenario ${scenario.id}: __PROMPT_HERE__ marker not found in currentFile`)
  }
  const markerIndent = markerLineMatch[2] // leading whitespace on marker's line

  // Open the draft block: replace __PROMPT_HERE__ with `?? <prompt>`
  // (open marker + prompt text on the same line, at the user's indent level).
  // Closing `??` will be added next via a separate dispatch to trigger
  // the open→closed state transition the auto-submit watches for.
  const initialContentOpen = sourceWithMarker.replace(PROMPT_MARKER, `?? ${scenario.prompt}`)

  await evaluate<void>(
    cdp,
    `(() => {
       const files = ${JSON.stringify(scenario.files).replace(/__PROMPT_HERE__/g, '')};
       // Override desktopFiles cache so fixer.getFiles() sees the project
       window.desktopFiles = window.desktopFiles || {};
       window.desktopFiles.getFiles = () => files;
       // Set editor content with the open marker already inserted
       const ed = window.editor;
       ed.dispatch({
         changes: { from: 0, to: ed.state.doc.length, insert: ${JSON.stringify(initialContentOpen)} },
       });
     })()`
  )
  await sleep(300)

  // Set up the response listener BEFORE inserting the closing marker.
  // Long timeout: scenarios 4-5 have ~6KB prompts and Claude can take 30-60s.
  const responsePromise = evaluate<{ code: string; error?: string } | { error: string }>(
    cdp,
    `new Promise((resolve) => {
       const timeoutId = setTimeout(() => resolve({ error: 'no draft:ai-response within 120s' }), 120000);
       window.__mirrorStudio__.events.once('draft:ai-response', (payload) => {
         clearTimeout(timeoutId);
         resolve(payload);
       });
     })`
  )

  // Trigger auto-submit by inserting the closing `??` on a new line at the
  // SAME indent as the opening marker. End-of-doc append works because the
  // open marker is the last line in our scenario files.
  const closeInsert = `\n${markerIndent}??`
  await evaluate<void>(
    cdp,
    `(() => {
       const ed = window.editor;
       const pos = ed.state.doc.length;
       ed.dispatch({
         changes: { from: pos, insert: ${JSON.stringify(closeInsert)} },
         selection: { anchor: pos + ${closeInsert.length} },
       });
     })()`
  )

  let response: { code?: string; error?: string }
  try {
    response = (await responsePromise) as { code?: string; error?: string }
  } catch (err) {
    response = { error: err instanceof Error ? err.message : String(err) }
  }

  // Wait for the editor to settle after replacement
  await sleep(500)

  const finalSource = await evaluate<string>(cdp, `window.editor.state.doc.toString()`)

  const calls = await evaluate<BridgeCall[]>(cdp, `window.__bridgeCalls || []`)
  const bridgeCall = calls[0] ?? null

  const totalElapsedMs = Date.now() - startTotal
  console.log(
    `  → ${response.error ? `ERR: ${response.error}` : 'OK'}` +
      ` (bridge: ${bridgeCall ? `${bridgeCall.elapsedMs}ms` : 'no call'}, total: ${totalElapsedMs}ms)`
  )

  // Compile-check: run the resulting source through the compiler
  const { compileOk, compileErrors } = await compileSource(finalSource, scenario.files)

  return {
    scenario,
    bridgeCall,
    finalSource,
    extractedCode: response.code ?? null,
    draftError: response.error ?? null,
    compileOk,
    compileErrors,
    totalElapsedMs,
  }
}

// =============================================================================
// COMPILE CHECK
// =============================================================================

async function compileSource(
  currentFileSource: string,
  allFiles: Record<string, string>
): Promise<{ compileOk: boolean; compileErrors: string[] }> {
  // Use the compiler CLI in --project mode with the multi-file source.
  // Easiest: write all files to a temp dir and invoke compiler/cli.ts.
  const fs = await import('fs')
  const path = await import('path')
  const os = await import('os')

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mirror-eval-'))
  try {
    for (const [name, content] of Object.entries(allFiles)) {
      const finalContent =
        name === Object.keys(allFiles).find(f => f.endsWith('.mir'))
          ? currentFileSource
          : content.replace(PROMPT_MARKER, '')
      fs.writeFileSync(path.join(tmp, name), finalContent)
    }
    // The current file gets the post-AI source written above; ensure it's overwritten
    // for the actual currentFile name (might not be the .mir file used as fallback).
    // Find the real currentFile by extension priority is fragile — caller should pass it.

    return new Promise(resolve => {
      const proc = spawn(
        'npx',
        ['tsx', 'compiler/cli.ts', '--project', tmp, '-o', path.join(tmp, 'out.js')],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
      let stdout = ''
      let stderr = ''
      proc.stdout.on('data', d => (stdout += d.toString()))
      proc.stderr.on('data', d => (stderr += d.toString()))
      proc.on('close', code => {
        try {
          fs.rmSync(tmp, { recursive: true, force: true })
        } catch {
          /* ignore */
        }
        const errors = (stderr + '\n' + stdout)
          .split('\n')
          .filter(l => /error|warn|fail/i.test(l))
          .filter(l => l.trim())
        resolve({ compileOk: code === 0, compileErrors: errors })
      })
    })
  } catch (err) {
    try {
      fs.rmSync(tmp, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
    return { compileOk: false, compileErrors: [String(err)] }
  }
}

// =============================================================================
// REPORT
// =============================================================================

function formatReport(results: ScenarioResult[]): string {
  const ts = new Date().toISOString()
  const lines: string[] = []
  lines.push(`# AI Draft-Mode Eval — ${ts}`)
  lines.push('')
  lines.push(`Scenarios: ${results.length}`)
  lines.push('')

  // Summary table
  lines.push('| # | Scenario | Bridge OK | Compile OK | Bridge ms | Total ms |')
  lines.push('|---|----------|-----------|------------|-----------|----------|')
  for (const r of results) {
    lines.push(
      `| ${r.scenario.id} | ${r.scenario.label} | ${r.bridgeCall && !r.bridgeCall.responseError ? '✓' : '✗'} | ${r.compileOk ? '✓' : '✗'} | ${r.bridgeCall?.elapsedMs ?? '-'} | ${r.totalElapsedMs} |`
    )
  }
  lines.push('')

  // Detailed sections
  for (const r of results) {
    lines.push(`---`)
    lines.push('')
    lines.push(`## ${r.scenario.id}: ${r.scenario.label}`)
    lines.push('')
    lines.push(`**Prompt:** \`${r.scenario.prompt}\``)
    lines.push('')
    lines.push(`**Expectations:** ${r.scenario.expectations}`)
    lines.push('')

    lines.push(`### Initial files`)
    lines.push('')
    for (const [name, content] of Object.entries(r.scenario.files)) {
      lines.push(`#### \`${name}\``)
      lines.push('```mirror')
      lines.push(content.replace(PROMPT_MARKER, '<-- ?? prompt ?? hier -->'))
      lines.push('```')
      lines.push('')
    }

    if (r.bridgeCall) {
      lines.push(`### Prompt sent to Claude (${r.bridgeCall.prompt.length} chars)`)
      lines.push('')
      lines.push('```')
      lines.push(r.bridgeCall.prompt)
      lines.push('```')
      lines.push('')
      lines.push(
        `### Raw Claude response (${r.bridgeCall.responseOutput.length} chars, ${r.bridgeCall.elapsedMs}ms)`
      )
      lines.push('')
      lines.push('```')
      lines.push(r.bridgeCall.responseOutput)
      lines.push('```')
      lines.push('')
      if (r.bridgeCall.responseError) {
        lines.push(`**Bridge error:** \`${r.bridgeCall.responseError}\``)
        lines.push('')
      }
    } else {
      lines.push(`### No bridge call recorded`)
      lines.push('')
    }

    if (r.draftError) {
      lines.push(`### Draft pipeline error`)
      lines.push('')
      lines.push(`\`${r.draftError}\``)
      lines.push('')
    }

    if (r.extractedCode) {
      lines.push(`### Extracted code (post extractCodeBlock)`)
      lines.push('```mirror')
      lines.push(r.extractedCode)
      lines.push('```')
      lines.push('')
    }

    lines.push(`### Final editor source (post replaceDraftBlock)`)
    lines.push('```mirror')
    lines.push(r.finalSource)
    lines.push('```')
    lines.push('')

    lines.push(`### Compile result: ${r.compileOk ? '✓ OK' : '✗ FAIL'}`)
    if (r.compileErrors.length > 0) {
      lines.push('```')
      lines.push(r.compileErrors.join('\n'))
      lines.push('```')
    }
    lines.push('')
  }

  return lines.join('\n')
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  const headed = process.argv.includes('--headed')
  const onlyArg = process.argv.find(a => a.startsWith('--only='))
  const onlyId = onlyArg?.split('=')[1]
  const scenarios = onlyId
    ? SCENARIOS.filter(s => s.id.startsWith(onlyId) || s.id === onlyId)
    : SCENARIOS

  if (scenarios.length === 0) {
    console.error(`No matching scenarios for --only=${onlyId}`)
    process.exit(1)
  }

  await assertServers()

  const reportDir = join(
    'test-results',
    `ai-eval-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)}`
  )
  mkdirSync(reportDir, { recursive: true })
  console.log(`\nReport dir: ${reportDir}`)

  console.log(`\nLaunching Chrome (${headed ? 'headed' : 'headless'})...`)
  const chrome = await launchChrome({ headless: !headed })
  // Extract DevTools port from wsEndpoint to find the page target
  const portMatch = chrome.wsEndpoint.match(/127\.0\.0\.1:(\d+)/)
  if (!portMatch) throw new Error(`Could not parse port from ${chrome.wsEndpoint}`)
  const port = parseInt(portMatch[1], 10)

  const pageTarget = await getPageTarget(port)
  const cdp = await connectCDP(pageTarget)

  await cdp.send('Runtime.enable')
  await cdp.send('Page.enable')
  await cdp.send('Console.enable')

  // Forward browser warnings/errors to terminal for visibility
  cdp.on('Console.messageAdded', (params: any) => {
    const msg = params?.message
    if (!msg) return
    const level = msg.level || 'log'
    if (level !== 'error' && level !== 'warning') return
    const text =
      typeof msg.text === 'string'
        ? msg.text
        : Array.isArray(msg.parameters)
          ? msg.parameters.map((p: any) => p.value ?? p.description ?? '').join(' ')
          : JSON.stringify(msg)
    console.log(`  [browser:${level}] ${text.slice(0, 200)}`)
  })

  const results: ScenarioResult[] = []
  try {
    for (const scenario of scenarios) {
      try {
        const result = await runScenario(cdp, scenario)
        results.push(result)
        // Save partial report after each scenario in case of later failure
        writeFileSync(join(reportDir, 'report.md'), formatReport(results))
      } catch (err) {
        console.error(`  ✗ scenario ${scenario.id} crashed:`, err)
      }
    }
  } finally {
    cdp.close()
    chrome.kill()
  }

  const reportPath = join(reportDir, 'report.md')
  writeFileSync(reportPath, formatReport(results))

  // Brief stats line
  const ok = results.filter(r => r.compileOk && !r.draftError).length
  console.log('')
  console.log(`Done. ${ok}/${results.length} scenarios compiled cleanly.`)
  console.log(`Report: ${reportPath}`)
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
