/**
 * Headless verify: H1/H2 in personas render solid black after canvas color
 * inference. Builds the personas standalone HTML, serves it, opens it in
 * headless Chrome, and reads computedStyle.color for every H1/H2 instance.
 */
import { spawn, ChildProcess } from 'child_process'
import * as net from 'net'
import { launchChrome } from '../tools/test-runner/chrome'
import { connectCDP, getPageTarget } from '../tools/test-runner/cdp'

const PORT = 5184
const URL = `http://127.0.0.1:${PORT}/personas-verify.html`

async function waitForPort(port: number, timeoutMs = 8000): Promise<void> {
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
  throw new Error(`port ${port} did not open`)
}

async function main(): Promise<void> {
  // 1) Build personas → /tmp/personas-verify.html
  console.log('▶ building personas …')
  const build = spawn(
    'npx',
    [
      'tsx',
      'compiler/build-cli.ts',
      'examples/personas-informatik/',
      '--out',
      '/tmp/personas-verify.html',
      '--quiet',
    ],
    { stdio: 'inherit' }
  )
  await new Promise<void>((resolve, reject) => {
    build.on('exit', code => (code === 0 ? resolve() : reject(new Error(`build exit ${code}`))))
  })

  // 2) Serve /tmp on PORT
  console.log('▶ serving /tmp on :' + PORT + ' …')
  const serve: ChildProcess = spawn('npx', ['serve', '/tmp', '-p', String(PORT), '-L'], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  await waitForPort(PORT)

  try {
    const chrome = await launchChrome({ headless: true })
    const m = chrome.wsEndpoint.match(/:(\d+)\//)
    if (!m) throw new Error('no debug port')
    const ws = await getPageTarget(parseInt(m[1], 10))
    const session = await connectCDP(ws)
    await session.send('Runtime.enable')
    await session.send('Page.enable')
    const loadDone = new Promise<void>(resolve =>
      session.on('Page.loadEventFired', () => resolve())
    )
    await session.send('Page.navigate', { url: URL })
    await Promise.race([loadDone, new Promise<void>(r => setTimeout(r, 8000))])
    await new Promise(r => setTimeout(r, 800))

    const expr = `
      (() => {
        const out = []
        for (const sel of ['[data-component="H1"]', '[data-component="H2"]']) {
          for (const el of document.querySelectorAll(sel)) {
            const cs = getComputedStyle(el)
            out.push({
              sel, text: (el.textContent || '').slice(0, 60).trim(),
              color: cs.color,
              inline: el.getAttribute('style') || '',
            })
          }
        }
        // Also report inherited root color for context.
        const root = document.querySelector('[data-mirror-root]')
        const rootColor = root ? getComputedStyle(root).color : null
        const rootInline = root ? root.style.color : null
        return { items: out, rootColor, rootInline }
      })()
    `
    const r = await session.send<{
      result: {
        value: {
          items: Array<{ sel: string; text: string; color: string; inline: string }>
          rootColor: string | null
          rootInline: string | null
        }
      }
    }>('Runtime.evaluate', { expression: expr, returnByValue: true })
    const { items, rootColor, rootInline } = r.result.value
    console.log(`\nroot color: ${rootColor} (inline: "${rootInline}")\n`)
    let pass = 0,
      fail = 0
    for (const it of items) {
      const isBlack = it.color === 'rgb(0, 0, 0)'
      console.log(
        `${isBlack ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${it.sel} "${it.text}" → ${it.color}`
      )
      isBlack ? pass++ : fail++
    }
    console.log(`\n${pass}/${items.length} H1/H2 render solid black`)
    session.close()
    chrome.kill()
    process.exitCode = fail === 0 ? 0 : 1
  } finally {
    serve.kill()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
