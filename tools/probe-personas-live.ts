/**
 * Live probe: launch Chrome on the running Studio dev server, inject the
 * personas-informatik files into `window.files`, trigger a compile, then
 * read computed styles from the preview DOM via CDP. This validates the
 * actual deployed studio — not a jsdom stand-in.
 *
 * Use: requires `npm run studio` (or `npm run tauri:dev`) up on :5173.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { launchChrome } from './test-runner/chrome'
import { connectCDP } from './test-runner/cdp'

const PROJECT = path.resolve(process.cwd(), 'examples/personas-informatik')
const STUDIO_URL = 'http://localhost:5173/studio/'

async function main() {
  const tokens = fs.readFileSync(`${PROJECT}/tokens.tok`, 'utf8')
  const components = fs.readFileSync(`${PROJECT}/components.com`, 'utf8')
  const app = fs.readFileSync(`${PROJECT}/app.mir`, 'utf8')

  console.log('🚀 Launching Chrome...')
  const chrome = await launchChrome({ headless: true })

  try {
    // chrome.wsEndpoint is the browser-level endpoint. We need to find a page
    // target. Easiest: parse the host:port out of it and hit /json/list.
    const m = chrome.wsEndpoint.match(/ws:\/\/([^/]+)\/devtools\/browser/)
    if (!m) throw new Error(`unexpected wsEndpoint: ${chrome.wsEndpoint}`)
    const hostPort = m[1]
    const tabs = await fetch(`http://${hostPort}/json/list`).then(r => r.json())
    const pageTab = tabs.find((t: any) => t.type === 'page')
    if (!pageTab?.webSocketDebuggerUrl) throw new Error('no page target')
    const cdp = await connectCDP(pageTab.webSocketDebuggerUrl)

    await cdp.send('Page.enable', {})
    await cdp.send('Runtime.enable', {})

    console.log('📄 Navigating to Studio...')
    await cdp.send('Page.navigate', { url: STUDIO_URL })
    // Wait for studio to boot — poll for window.__studioReady or test API
    await new Promise(r => setTimeout(r, 3000))

    console.log('💾 Injecting personas files via window.files...')
    const inject = `
      (async function() {
        const filesObj = {
          'tokens.tok': ${JSON.stringify(tokens)},
          'components.com': ${JSON.stringify(components)},
          'app.mir': ${JSON.stringify(app)},
        };
        // Wait for window.files to exist
        let tries = 0
        while (!window.files && tries < 50) { await new Promise(r => setTimeout(r, 100)); tries++ }
        if (!window.files) return { error: 'window.files never appeared' }
        // Replace contents
        for (const k of Object.keys(window.files)) delete window.files[k]
        Object.assign(window.files, filesObj)
        // Trigger recompile (Studio listens for storage events / explicit calls)
        if (window.__compileTestCode) {
          window.__compileTestCode(filesObj['app.mir'], 'app.mir')
        } else if (window.compileFile) {
          window.compileFile('app.mir')
        }
        return { ok: true, fileKeys: Object.keys(window.files) }
      })()
    `
    const injResult = await cdp.send('Runtime.evaluate', {
      expression: inject,
      awaitPromise: true,
      returnByValue: true,
    })
    console.log('   ', injResult.result?.value || injResult)

    // Wait for compile + render
    await new Promise(r => setTimeout(r, 1500))

    console.log('🔍 Reading computed styles from preview DOM...')
    const probe = `
      (function() {
        const preview = document.getElementById('preview')
        const root = preview?.querySelector('.mirror-root')
        if (!root) return { error: 'no .mirror-root in preview' }

        const samples = {}
        const cs = (el) => window.getComputedStyle(el)
        const rootStyle = cs(root)
        samples._root = {
          color: rootStyle.color,
          background: rootStyle.backgroundColor,
          mText: rootStyle.getPropertyValue('--m-text').trim(),
          mBg: rootStyle.getPropertyValue('--m-bg').trim(),
          mSurface: rootStyle.getPropertyValue('--m-surface').trim(),
        }

        // Find specific elements by text
        const all = root.querySelectorAll('span, h1, h2, h3, h4, h5, h6, p')
        for (const el of all) {
          const txt = (el.textContent || '').trim()
          if (txt === 'Personas') {
            samples.personasH1 = { color: cs(el).color, fontSize: cs(el).fontSize, tag: el.tagName, dataComp: el.dataset.component || '' }
          } else if (txt.startsWith('Fünf Personas')) {
            samples.fuenfH2 = { color: cs(el).color, fontSize: cs(el).fontSize, tag: el.tagName, dataComp: el.dataset.component || '' }
          } else if (txt === 'Internes Arbeitsdokument') {
            samples.eyebrow = { color: cs(el).color, tag: el.tagName, dataComp: el.dataset.component || '' }
          } else if (txt === 'Hochschule') {
            samples.metaLabel = { color: cs(el).color, tag: el.tagName, dataComp: el.dataset.component || '' }
          }
        }

        // Count any remaining leak
        let leakCount = 0
        const leaks = []
        for (const el of all) {
          const c = cs(el).color
          if (c.includes('224, 224, 224') || c === 'rgb(26, 26, 26)') {
            leakCount++
            leaks.push({ tag: el.tagName, text: (el.textContent || '').slice(0, 30), color: c })
          }
        }
        samples.totalText = all.length
        samples.leakCount = leakCount
        samples.leaks = leaks.slice(0, 5)

        return samples
      })()
    `
    const probeResult = await cdp.send('Runtime.evaluate', {
      expression: probe,
      returnByValue: true,
    })
    console.log('\n=== LIVE BROWSER PROBE ===')
    console.log(JSON.stringify(probeResult.result?.value, null, 2))

    // Single-viewport screenshot (Hero only)
    const shotResult = await cdp.send('Page.captureScreenshot', { format: 'png' })
    if (shotResult.data) {
      fs.writeFileSync(
        '/tmp/mirror-shots/chrome-personas.png',
        Buffer.from(shotResult.data, 'base64')
      )
      console.log('\n📸 Hero screenshot: /tmp/mirror-shots/chrome-personas.png')
    }

    // Section-aware screenshots: scroll the preview pane, capture one tile per scroll
    console.log('\n📜 Scrolling through preview, capturing tiles...')
    const scrollInfo = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const p = document.getElementById('preview')
        return { scrollHeight: p.scrollHeight, clientHeight: p.clientHeight }
      })()`,
      returnByValue: true,
    })
    const { scrollHeight, clientHeight } = scrollInfo.result?.value || {}
    console.log(`   preview: scrollHeight=${scrollHeight}px, viewport=${clientHeight}px`)

    const tiles = Math.ceil(scrollHeight / clientHeight)
    for (let i = 0; i < tiles; i++) {
      await cdp.send('Runtime.evaluate', {
        expression: `document.getElementById('preview').scrollTop = ${i * clientHeight}`,
      })
      await new Promise(r => setTimeout(r, 200))
      const tile = await cdp.send('Page.captureScreenshot', { format: 'png' })
      if (tile.data) {
        const p = `/tmp/mirror-shots/personas-tile-${String(i + 1).padStart(2, '0')}.png`
        fs.writeFileSync(p, Buffer.from(tile.data, 'base64'))
        console.log(`   → ${p}`)
      }
    }

    // Per-section color audit: list every distinct (component, color, fontSize)
    // combination so the user can confirm each persona page is dark-on-light.
    console.log('\n🔬 Section audit (distinct text styles)...')
    const audit = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const root = document.querySelector('#preview .mirror-root')
        if (!root) return []
        const all = root.querySelectorAll('span, h1, h2, h3, h4, h5, h6, p')
        const groups = new Map()
        for (const el of all) {
          const cs = window.getComputedStyle(el)
          const key = (el.dataset.component || el.tagName) + '|' + cs.color + '|' + cs.fontSize
          if (!groups.has(key)) groups.set(key, { component: el.dataset.component || el.tagName, color: cs.color, fontSize: cs.fontSize, sample: (el.textContent || '').slice(0, 40).trim(), count: 0 })
          groups.get(key).count++
        }
        return Array.from(groups.values()).sort((a, b) => b.count - a.count)
      })()`,
      returnByValue: true,
    })
    const groups = audit.result?.value || []
    console.log(
      `   ${groups.length} distinct (component, color, size) groups across ${groups.reduce((s: number, g: any) => s + g.count, 0)} text elements:`
    )
    for (const g of groups) {
      const colTag =
        g.color === 'rgb(0, 0, 0)'
          ? '✓'
          : g.color === 'rgb(26, 26, 26)'
            ? '·dark'
            : g.color === 'rgb(102, 102, 102)'
              ? '·muted'
              : g.color === 'rgb(255, 255, 255)'
                ? '·white'
                : '?'
      console.log(
        `     ${colTag.padEnd(6)} ${g.component.padEnd(20)} ${g.color.padEnd(20)} ${g.fontSize.padEnd(8)} ×${String(g.count).padEnd(4)} | "${g.sample}"`
      )
    }

    cdp.close()
  } finally {
    chrome.kill()
  }
}

main().catch(e => {
  console.error('Probe failed:', e)
  process.exit(1)
})
