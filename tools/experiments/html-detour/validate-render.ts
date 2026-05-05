/**
 * Render-Validation für das HTML-Detour-Experiment
 *
 * Lädt jedes Mirror-File via viewer.html im Headless-Chrome und prüft:
 *   - Console-Errors / unhandled exceptions
 *   - DOM-State (.error div vorhanden? #app leer?)
 *   - Screenshot
 *
 * Nutzt bestehende test-runner CDP-Module.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { launchChrome } from '../../test-runner/chrome'
import { connectCDP, getPageTarget } from '../../test-runner/cdp'
import type { CDPSession } from '../../test-runner/types'

const ROOT = path.resolve(
  '/Users/toni.steimle@fhnw.ch/Library/Mobile Documents/com~apple~CloudDocs/Documents/Dev/Mirror'
)
const SERVER = 'http://localhost:5173'
const SHOTS = path.join(ROOT, 'tools/experiments/html-detour/analysis/screenshots')
fs.mkdirSync(SHOTS, { recursive: true })

interface FileTarget {
  brief: string
  label: string
  url: string
  file: string
}

const targets: FileTarget[] = []
for (const brief of ['brief-1', 'brief-2', 'brief-3']) {
  for (const sample of [1, 2]) {
    for (const path of ['path-a', 'path-b'] as const) {
      const filePart =
        path === 'path-a' ? `${path}-sample-${sample}.mir` : `path-b-mirror-sample-${sample}.mir`
      const file = `tools/experiments/html-detour/outputs/${brief}/${filePart}`
      // npx serve strippt .html und droppt dabei query-strings beim 301 — also ohne .html linken
      const viewerUrl = `${SERVER}/tools/experiments/html-detour/render/viewer?file=/${encodeURI(
        file
      )}`
      targets.push({
        brief,
        label: `${brief} ${path} s${sample}`,
        url: viewerUrl,
        file,
      })
    }
  }
}

interface RenderResult {
  label: string
  file: string
  status: 'OK' | 'ERROR' | 'TIMEOUT' | 'EMPTY' | 'COLLAPSED' | 'TINY' | 'BLANK'
  errorText?: string
  consoleErrors: string[]
  exceptions: string[]
  appHtmlSnippet: string
  screenshot: string
  width?: number
  height?: number
  allDescendants?: number
  textLen?: number
  pixelDiversity?: number // 0..1, ratio of unique-ish pixel colors in screenshot
}

// ============================================================================
// Chrome / CDP Setup
// ============================================================================

async function runValidation(): Promise<void> {
  console.log('Launching headless Chrome…')
  const chrome = await launchChrome({ headless: true })
  const port = new URL(chrome.wsEndpoint).port
  const pageWs = await getPageTarget(parseInt(port))
  const cdp = await connectCDP(pageWs)

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Console.enable')
  await cdp.send('Log.enable')

  // Set viewport once
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })

  const results: RenderResult[] = []

  for (const target of targets) {
    process.stdout.write(`[${results.length + 1}/${targets.length}] ${target.label} … `)
    const r = await renderOne(cdp, target)
    results.push(r)
    process.stdout.write(`${r.status}\n`)
    if (r.status !== 'OK') {
      if (r.errorText) console.log(`    err: ${r.errorText.slice(0, 200)}`)
      if (r.exceptions[0]) console.log(`    exc: ${r.exceptions[0].slice(0, 200)}`)
      if (r.consoleErrors[0]) console.log(`    log: ${r.consoleErrors[0].slice(0, 200)}`)
    }
  }

  chrome.kill()

  // Summary
  console.log('\n=== Summary ===')
  const ok = results.filter(r => r.status === 'OK').length
  console.log(`${ok}/${results.length} files rendered successfully\n`)

  // Group failures by error message
  const failures = results.filter(r => r.status !== 'OK')
  if (failures.length > 0) {
    console.log('=== Failures ===')
    for (const f of failures) {
      console.log(`\n• ${f.label}`)
      console.log(`  file: ${f.file}`)
      console.log(`  status: ${f.status}`)
      if (f.errorText) console.log(`  errorText: ${f.errorText}`)
      if (f.exceptions.length > 0) console.log(`  exceptions:\n    ${f.exceptions.join('\n    ')}`)
      if (f.consoleErrors.length > 0)
        console.log(`  consoleErrors:\n    ${f.consoleErrors.slice(0, 3).join('\n    ')}`)
    }
  }

  // Write JSON report
  const reportPath = path.join(
    ROOT,
    'tools/experiments/html-detour/analysis/render-validation.json'
  )
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2))
  console.log(`\nWritten: ${reportPath}`)
  console.log(`Screenshots: ${SHOTS}`)
}

// ============================================================================
// Per-file rendering
// ============================================================================

async function renderOne(cdp: CDPSession, target: FileTarget): Promise<RenderResult> {
  const consoleErrors: string[] = []
  const exceptions: string[] = []

  // Subscribe to console + exceptions for this run
  const consoleHandler = (params: any) => {
    if (params?.type === 'error' || params?.type === 'warning') {
      const text = (params.args || []).map((a: any) => a?.value ?? a?.description ?? '').join(' ')
      consoleErrors.push(`[${params.type}] ${text}`)
    }
  }
  const exceptionHandler = (params: any) => {
    const ed = params?.exceptionDetails
    if (!ed) return
    const text = ed.exception?.description || ed.text || JSON.stringify(ed)
    exceptions.push(text)
  }

  cdp.on('Runtime.consoleAPICalled', consoleHandler)
  cdp.on('Runtime.exceptionThrown', exceptionHandler)

  try {
    // Navigate
    await cdp.send('Page.navigate', { url: target.url })

    // Wait for load
    await waitForPageLoad(cdp, 5000)

    // Wait extra time for fetch+compile+render
    await sleep(1500)

    // Check #app contents AND visual render-state via CDP Runtime.evaluate
    const evalResult: any = await cdp.send('Runtime.evaluate', {
      expression: `(() => {
        const app = document.getElementById('app');
        if (!app) return { state: 'no-app', html: '' };
        const errEl = app.querySelector('.error');
        const loadingEl = app.querySelector('.loading');
        const childCount = app.children.length;
        const html = app.innerHTML.slice(0, 300);
        if (errEl) return { state: 'error', html, errorText: errEl.textContent };
        if (loadingEl) return { state: 'loading', html };
        if (childCount === 0) return { state: 'empty', html };

        // Find Mirror root (data-mirror-root='true')
        const mirrorRoot = app.querySelector('[data-mirror-root]') || app.firstElementChild;
        if (!mirrorRoot) return { state: 'empty', html };

        // Bounding rect — if 0×0, layout collapsed
        const rect = mirrorRoot.getBoundingClientRect();
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);

        // Element count + text-length heuristics for "real content"
        const allDescendants = mirrorRoot.querySelectorAll('*').length;
        const textContent = (mirrorRoot.textContent || '').trim();
        const textLen = textContent.length;

        if (width === 0 || height === 0) {
          return { state: 'collapsed', html, width, height, allDescendants, textLen };
        }
        if (width < 50 || height < 50) {
          return { state: 'tiny', html, width, height, allDescendants, textLen };
        }
        return { state: 'ok', html, width, height, allDescendants, textLen };
      })()`,
      returnByValue: true,
    })

    const data = evalResult.result?.value || {}

    // Take full-page screenshot — captures content beyond viewport.
    // Mirror canvases often span >900px height; viewport-only screenshots
    // would only show the top slice and miss most content.
    const screenshotName = `${target.brief}-${target.label.replace(/[^a-z0-9]+/gi, '-')}.png`
    const screenshotPath = path.join(SHOTS, screenshotName)
    const shot: any = await cdp.send('Page.captureScreenshot', {
      format: 'png',
      captureBeyondViewport: true,
    })
    if (shot?.data) {
      fs.writeFileSync(screenshotPath, Buffer.from(shot.data, 'base64'))
    }

    // Pixel-diversity check: quantize PNG to a coarse palette, count unique buckets.
    // Catches "everything is one solid color" failures.
    let pixelDiversity = 0
    if (shot?.data) {
      pixelDiversity = await coarsePixelDiversity(Buffer.from(shot.data, 'base64'))
    }

    // Status policy:
    //   ERROR/EMPTY/COLLAPSED/TINY = hard fails (Mirror file is broken)
    //   pixel-diversity is reported but no longer a hard fail — full-page
    //   screenshots give a more reliable "rendered" signal via DOM checks.
    let status: RenderResult['status'] = 'OK'
    if (data.state === 'error') status = 'ERROR'
    else if (data.state === 'loading' || data.state === 'empty') status = 'EMPTY'
    else if (data.state === 'no-app') status = 'ERROR'
    else if (data.state === 'collapsed') status = 'COLLAPSED'
    else if (data.state === 'tiny') status = 'TINY'
    // Soft warning: very low descendant count + tiny text suggests minimal render
    else if ((data.allDescendants ?? 0) < 5 && (data.textLen ?? 0) < 20) status = 'BLANK'

    return {
      label: target.label,
      file: target.file,
      status,
      errorText: data.errorText,
      consoleErrors,
      exceptions,
      appHtmlSnippet: data.html || '',
      screenshot: screenshotName,
      width: data.width,
      height: data.height,
      allDescendants: data.allDescendants,
      textLen: data.textLen,
      pixelDiversity,
    }
  } catch (e: any) {
    return {
      label: target.label,
      file: target.file,
      status: 'TIMEOUT',
      errorText: e.message,
      consoleErrors,
      exceptions,
      appHtmlSnippet: '',
      screenshot: '',
    }
  } finally {
    cdp.off('Runtime.consoleAPICalled', consoleHandler)
    cdp.off('Runtime.exceptionThrown', exceptionHandler)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms))
}

/**
 * Coarse pixel-diversity proxy via PNG file size.
 *
 * PNG compresses solid-color regions extremely well — a near-blank screenshot
 * at 1280×900 is typically <8KB while a content-rich one is >30KB. We normalize
 * by viewport pixel count so the metric is in (0..0.1) range.
 *
 * Returns ~0.004 for solid-color, ~0.05 for rich content. Threshold ~0.008.
 */
async function coarsePixelDiversity(pngBuffer: Buffer): Promise<number> {
  const VIEWPORT_PIXELS = 1280 * 900
  return pngBuffer.length / VIEWPORT_PIXELS
}

function waitForPageLoad(cdp: CDPSession, timeoutMs: number): Promise<void> {
  return new Promise(resolve => {
    let done = false
    const handler = () => {
      if (done) return
      done = true
      cdp.off('Page.loadEventFired', handler as any)
      resolve()
    }
    cdp.on('Page.loadEventFired', handler as any)
    setTimeout(() => {
      if (!done) {
        done = true
        cdp.off('Page.loadEventFired', handler as any)
        resolve()
      }
    }, timeoutMs)
  })
}

// Run
runValidation().catch(e => {
  console.error('Fatal:', e)
  process.exit(1)
})
