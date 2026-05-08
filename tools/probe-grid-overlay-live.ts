/**
 * Live probe: launch Chrome on the running Studio dev server, inject a
 * minimal grid-test project, simulate a selection on the grid container,
 * and verify the GridOverlay SVG appears at the correct position with
 * the right number of lines.
 *
 * Use: requires `npm run studio` (or `npm run tauri:dev`) up on :5173.
 */

import * as fs from 'node:fs'
import { launchChrome } from './test-runner/chrome'
import { connectCDP } from './test-runner/cdp'

const STUDIO_URL = 'http://localhost:5173/studio/'

const TEST_APP = `// Grid overlay smoke test
canvas desktop, bg #fff

Frame grid 4, gap 8, w 400, h 200, pad 16
  Frame x 1, y 1, w 2, h 1, bg #ef4444
  Frame x 3, y 1, w 2, h 1, bg #10b981
  Frame x 1, y 2, w 4, h 1, bg #2271C1
`

async function main() {
  console.log('🚀 Launching Chrome...')
  const chrome = await launchChrome({ headless: true })
  try {
    const m = chrome.wsEndpoint.match(/ws:\/\/([^/]+)\/devtools\/browser/)
    if (!m) throw new Error(`unexpected wsEndpoint: ${chrome.wsEndpoint}`)
    const tabs = await fetch(`http://${m[1]}/json/list`).then(r => r.json())
    const pageTab = tabs.find((t: any) => t.type === 'page')
    if (!pageTab?.webSocketDebuggerUrl) throw new Error('no page target')
    const cdp = await connectCDP(pageTab.webSocketDebuggerUrl)

    await cdp.send('Page.enable', {})
    await cdp.send('Runtime.enable', {})

    console.log('📄 Navigating to Studio...')
    await cdp.send('Page.navigate', { url: STUDIO_URL })
    await new Promise(r => setTimeout(r, 2500))

    console.log('💾 Injecting test grid project...')
    const inject = `
      (async function() {
        let tries = 0
        while (!window.files && tries < 50) { await new Promise(r => setTimeout(r, 100)); tries++ }
        if (!window.files) return { error: 'window.files never appeared' }
        for (const k of Object.keys(window.files)) delete window.files[k]
        window.files['app.mir'] = ${JSON.stringify(TEST_APP)}
        if (window.__compileTestCode) {
          window.__compileTestCode(${JSON.stringify(TEST_APP)}, 'app.mir')
        }
        return { ok: true }
      })()
    `
    await cdp.send('Runtime.evaluate', {
      expression: inject,
      awaitPromise: true,
      returnByValue: true,
    })

    // Allow compile + render
    await new Promise(r => setTimeout(r, 1000))

    console.log('🎯 Simulating selection on the grid container...')
    const selectAndProbe = `
      (function() {
        const preview = document.getElementById('preview')
        // Find the grid container — first div with display: grid
        const all = preview.querySelectorAll('*')
        let grid = null
        for (const el of all) {
          if (el instanceof HTMLElement) {
            const cs = getComputedStyle(el)
            if (cs.display === 'grid') { grid = el; break }
          }
        }
        if (!grid) return { error: 'no grid container found in preview' }
        const nodeId = grid.dataset.mirrorId
        if (!nodeId) return { error: 'grid has no data-mirror-id' }

        // Trigger selection via the studio API surface — most direct path.
        if (window.studio?.actions?.setSelection) {
          window.studio.actions.setSelection(nodeId, 'test-probe')
        } else {
          // Fallback: dispatch the event the GridOverlay listens to
          const events = window.studio?.events || window.events
          if (events?.emit) events.emit('selection:changed', { nodeId, origin: 'test-probe' })
        }

        // Give RAF a tick to redraw
        return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => {
          const svgs = Array.from(preview.querySelectorAll('svg[data-mirror-overlay="grid"]'))
          const result = {
            gridFound: true,
            nodeId,
            gridRect: { x: grid.getBoundingClientRect().left, y: grid.getBoundingClientRect().top, w: grid.getBoundingClientRect().width, h: grid.getBoundingClientRect().height },
            gridDisplay: getComputedStyle(grid).display,
            gridTemplateColumns: getComputedStyle(grid).gridTemplateColumns,
            gridTemplateRows: getComputedStyle(grid).gridTemplateRows,
            overlayCount: svgs.length,
            firstOverlay: svgs[0] ? {
              left: svgs[0].style.left,
              top: svgs[0].style.top,
              width: svgs[0].getAttribute('width'),
              height: svgs[0].getAttribute('height'),
              lineCount: svgs[0].querySelectorAll('line').length,
              dashedLines: Array.from(svgs[0].querySelectorAll('line')).filter(l => l.getAttribute('stroke-dasharray') === '3 3').length,
            } : null
          }
          resolve(result)
        })))
      })()
    `
    const probeResult = await cdp.send('Runtime.evaluate', {
      expression: selectAndProbe,
      awaitPromise: true,
      returnByValue: true,
    })
    console.log('\n=== LIVE GRID-OVERLAY PROBE ===')
    console.log(JSON.stringify(probeResult.result?.value, null, 2))

    // Full-page screenshot for visual confirmation
    const shotResult = await cdp.send('Page.captureScreenshot', { format: 'png' })
    if (shotResult.data) {
      fs.writeFileSync(
        '/tmp/mirror-shots/grid-overlay-live.png',
        Buffer.from(shotResult.data, 'base64')
      )
      console.log('\n📸 Screenshot: /tmp/mirror-shots/grid-overlay-live.png')
    }

    // Cropped screenshot of just the grid + overlay (using clip)
    const gridRect = (probeResult.result?.value as any).gridRect
    if (gridRect) {
      const pad = 32
      const clipShot = await cdp.send('Page.captureScreenshot', {
        format: 'png',
        clip: {
          x: Math.max(0, gridRect.x - pad),
          y: Math.max(0, gridRect.y - pad),
          width: gridRect.w + pad * 2,
          height: gridRect.h + pad * 2,
          scale: 2,
        },
      })
      if (clipShot.data) {
        fs.writeFileSync(
          '/tmp/mirror-shots/grid-overlay-zoom.png',
          Buffer.from(clipShot.data, 'base64')
        )
        console.log('📸 Zoom (2x): /tmp/mirror-shots/grid-overlay-zoom.png')
      }
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
