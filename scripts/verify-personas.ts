/**
 * Browser-verify the migrated personas example via CDP.
 *
 * Loads `examples/personas-informatik/preview.html` in headless Chrome,
 * runs DOM assertions to confirm the prose-mode migration renders
 * everything (5 personas, prose paragraphs, bullets, numbered lists,
 * headings), captures any console errors, and saves a screenshot.
 *
 * Run: `npx tsx scripts/verify-personas.ts`
 */

import { spawn, ChildProcess } from 'child_process'
import { writeFileSync } from 'fs'
import * as net from 'net'
import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'

const SERVE_PORT = 5179
const PREVIEW_URL = `http://127.0.0.1:${SERVE_PORT}/examples/personas-informatik/preview.html`
const SCREENSHOT_PATH = '/tmp/personas-verify.png'

interface Check {
  name: string
  pass: boolean
  detail?: string
}

async function waitForPort(port: number, timeoutMs = 10000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise<boolean>(resolve => {
      const sock = net.createConnection({ host: '127.0.0.1', port }, () => {
        sock.end()
        resolve(true)
      })
      sock.on('error', () => resolve(false))
    })
    if (ok) return
    await new Promise(r => setTimeout(r, 200))
  }
  throw new Error(`port ${port} did not open within ${timeoutMs}ms`)
}

async function startServe(): Promise<ChildProcess> {
  const proc = spawn('npx', ['serve', '.', '-p', String(SERVE_PORT), '-L'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  await waitForPort(SERVE_PORT)
  return proc
}

async function evalInPage<T>(
  session: import('../tools/test-runner/types').CDPSession,
  expr: string
): Promise<T> {
  const result = await session.send<{ result: { value: T; type: string } }>('Runtime.evaluate', {
    expression: expr,
    returnByValue: true,
  })
  return result.result.value
}

async function main(): Promise<void> {
  console.log('▶ starting static server on :' + SERVE_PORT + ' …')
  const serveProc = await startServe()

  console.log('▶ launching headless Chrome …')
  const chrome = await launchChrome({ headless: true })

  // Discover the open page via the WebSocket endpoint's HTTP cousin.
  // launchChrome returns ws://…:PORT/devtools/browser/UUID — pull PORT
  // from that and ask /json for the first page target.
  const portMatch = chrome.wsEndpoint.match(/:(\d+)\//)
  if (!portMatch) throw new Error('cannot extract debug port from ' + chrome.wsEndpoint)
  const debugPort = parseInt(portMatch[1], 10)
  const pageWs = await getPageTarget(debugPort)

  console.log('▶ connecting CDP …')
  const session = await connectCDP(pageWs)

  // Collect console messages and runtime exceptions.
  const consoleErrors: string[] = []
  const exceptions: string[] = []
  await session.send('Runtime.enable')
  await session.send('Page.enable')
  session.on('Runtime.consoleAPICalled', (params: unknown) => {
    const p = params as { type: string; args?: Array<{ value?: unknown; description?: string }> }
    if (p.type === 'error' || p.type === 'warning') {
      const msg = (p.args || [])
        .map(a => (a.value !== undefined ? String(a.value) : a.description || ''))
        .join(' ')
      if (msg.trim()) consoleErrors.push(`[${p.type}] ${msg}`)
    }
  })
  session.on('Runtime.exceptionThrown', (params: unknown) => {
    const p = params as { exceptionDetails?: { exception?: { description?: string } } }
    const desc = p.exceptionDetails?.exception?.description
    if (desc) exceptions.push(desc)
  })

  console.log('▶ navigating to ' + PREVIEW_URL + ' …')
  const loadDone = new Promise<void>(resolve => {
    session.on('Page.loadEventFired', () => resolve())
  })
  await session.send('Page.navigate', { url: PREVIEW_URL })
  await Promise.race([
    loadDone,
    new Promise<void>(r => setTimeout(r, 8000)), // safety timeout
  ])

  // Give the runtime a beat to mount the DOM, then assert.
  await new Promise(r => setTimeout(r, 600))

  const checks: Check[] = []

  // 1. App root mounted.
  const appText: string = await evalInPage(
    session,
    `document.getElementById('app')?.innerText || ''`
  )
  checks.push({
    name: 'app root has content',
    pass: appText.length > 1000,
    detail: `${appText.length} chars rendered`,
  })

  // 2. All 5 personas appear.
  for (const name of ['Lukas', 'Sara', 'Marco', 'Nadia', 'Tim']) {
    checks.push({
      name: `persona "${name}" present`,
      pass: appText.includes(name),
    })
  }

  // 3. Section headings.
  for (const heading of [
    'Übergreifende Beobachtungen',
    'Warum diese fünf Personas?',
    'Offene Punkte / nächste Schritte',
  ]) {
    checks.push({
      name: `heading "${heading}" present`,
      pass: appText.includes(heading),
    })
  }

  // 4. Prose-paragraph rendering inside WarumBlock (specific phrasing).
  checks.push({
    name: 'Lukas warum text renders (prose-mode paragraph)',
    pass: appText.includes('hochkompetenten, schon technikaffinen Maturand:innen'),
  })

  // 5. Bullets in Übergreifende Beobachtungen — guillemets must survive.
  checks.push({
    name: 'bullet text «Schaffe ich das?» renders',
    pass: appText.includes('«Schaffe ich das?»'),
  })

  // 6. Numbered list (Offene Punkte) — `01` must render.
  checks.push({
    name: 'numbered list "01" renders',
    pass: appText.includes('01') && appText.includes('Eltern als Co-Persona'),
  })

  // 7. Inline markdown (bold) renders as <strong>.
  const strongCount: number = await evalInPage(
    session,
    `document.querySelectorAll('#app strong').length`
  )
  checks.push({
    name: '<strong> elements present (inline markdown)',
    pass: strongCount > 5,
    detail: `${strongCount} <strong> tags`,
  })

  // 8. dataset.component on prose-synthesized BodyTxt.
  const bodyTxtCount: number = await evalInPage(
    session,
    `document.querySelectorAll('#app [data-component="BodyTxt"]').length`
  )
  checks.push({
    name: 'BodyTxt instances rendered',
    pass: bodyTxtCount > 5,
    detail: `${bodyTxtCount} BodyTxt nodes`,
  })

  // 9. dataset.component on prose-synthesized DashItem.
  const dashItemCount: number = await evalInPage(
    session,
    `document.querySelectorAll('#app [data-component="DashItem"]').length`
  )
  checks.push({
    name: 'DashItem instances rendered (prose bullets)',
    pass: dashItemCount > 3,
    detail: `${dashItemCount} DashItem nodes`,
  })

  // 10. dataset.component on prose-synthesized OffenePunkt.
  const offenePunktCount: number = await evalInPage(
    session,
    `document.querySelectorAll('#app [data-component="OffenePunkt"]').length`
  )
  checks.push({
    name: 'OffenePunkt instances rendered (prose numbered list)',
    pass: offenePunktCount === 6,
    detail: `${offenePunktCount} OffenePunkt nodes (expected 6)`,
  })

  // 11. No console errors.
  checks.push({
    name: 'no console errors',
    pass: consoleErrors.length === 0,
    detail: consoleErrors.length === 0 ? '' : consoleErrors.slice(0, 3).join('; '),
  })

  // 12. No runtime exceptions.
  checks.push({
    name: 'no runtime exceptions',
    pass: exceptions.length === 0,
    detail: exceptions.length === 0 ? '' : exceptions[0].split('\n')[0],
  })

  console.log('▶ capturing screenshot …')
  const shot = await session.send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  })
  writeFileSync(SCREENSHOT_PATH, Buffer.from(shot.data, 'base64'))

  // Print results.
  console.log('')
  let pass = 0
  let fail = 0
  for (const c of checks) {
    const symbol = c.pass ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
    const detail = c.detail ? ` \x1b[2m(${c.detail})\x1b[0m` : ''
    console.log(`  ${symbol} ${c.name}${detail}`)
    if (c.pass) pass++
    else fail++
  }
  console.log('')
  console.log(`  ${pass}/${checks.length} checks passed`)
  console.log(`  screenshot: ${SCREENSHOT_PATH}`)
  console.log('')

  // Cleanup.
  session.close()
  chrome.kill()
  serveProc.kill()

  process.exit(fail === 0 ? 0 : 1)
}

main().catch(err => {
  console.error('verify-personas failed:', err)
  process.exit(2)
})
