#!/usr/bin/env tsx
/**
 * Mirror Verify
 *
 *   npx tsx tools/verify.ts <bundle-dir> [options]
 *
 * Compares the generated framework output against the Mirror render-
 * snapshot baseline. For each viewport in the bundle's render-snapshot:
 *   1. Serves <bundle>/generated/dist on a local port
 *   2. Headless Chrome captures a screenshot at that viewport
 *   3. Pixel-diffs against <bundle>/render-snapshot/screenshot-<vp>.png
 *
 * Output: verify-report.md + diff-<vp>.png images in the bundle root.
 * Exit code 0 if every viewport >= --threshold (default 95%).
 *
 * For static targets (vanilla), serves <bundle>/generated directly.
 */
import { existsSync, statSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { resolve, join, dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import { launchChrome } from './test-runner/chrome'
import { connectCDP, getPageTarget } from './test-runner/cdp'
import type { CDPSession } from './test-runner/types'

const __dirname = dirname(fileURLToPath(import.meta.url))

interface Viewport {
  name: string
  width: number
  height: number
}

const VIEWPORTS: Viewport[] = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
]

interface Options {
  bundleDir: string
  generatedDir: string | null
  threshold: number
  viewports: Viewport[]
  help: boolean
}

function printHelp() {
  console.log(`
mirror-verify — pixel-diff generated output vs Mirror render-snapshot

Usage:
  npx tsx tools/verify.ts <bundle-dir> [options]

Options:
  --generated <dir>     Override generated dist path
                        (default: <bundle>/generated/dist for built targets,
                                  <bundle>/generated for vanilla)
  --threshold <pct>     Minimum match % to pass (default: 95)
  --viewport <names>    Comma-separated: mobile,tablet,desktop (default: all)
  -h, --help            This help

Exit codes:
  0   all viewports above threshold
  1   one or more viewports below threshold
  2   could not run (missing snapshot, server error, etc.)
`)
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    bundleDir: '',
    generatedDir: null,
    threshold: 95,
    viewports: VIEWPORTS,
    help: false,
  }
  const positionals: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    switch (a) {
      case '-h':
      case '--help':
        opts.help = true
        break
      case '--generated':
        opts.generatedDir = argv[++i]
        break
      case '--threshold':
        opts.threshold = Number(argv[++i])
        break
      case '--viewport': {
        const names = argv[++i].split(',').map(s => s.trim())
        opts.viewports = VIEWPORTS.filter(v => names.includes(v.name))
        break
      }
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`)
        positionals.push(a)
    }
  }
  if (positionals[0]) opts.bundleDir = positionals[0]
  return opts
}

function detectGeneratedDir(bundleDir: string): string {
  const candidates = [join(bundleDir, 'generated', 'dist'), join(bundleDir, 'generated')]
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isDirectory()) {
      // Must contain index.html
      if (existsSync(join(c, 'index.html'))) return c
    }
  }
  throw new Error(
    `no generated output found. Looked in ${candidates.join(', ')}. ` +
      `Did the agent run \`npm run build\`?`
  )
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
}

async function startStaticServer(rootDir: string): Promise<{ url: string; close: () => void }> {
  const fs = await import('node:fs')
  const path = await import('node:path')
  return new Promise((res, reject) => {
    const server: Server = createServer((req, response) => {
      try {
        let urlPath = (req.url || '/').split('?')[0]
        if (urlPath.endsWith('/')) urlPath += 'index.html'
        const filePath = path.join(rootDir, decodeURIComponent(urlPath))
        if (!filePath.startsWith(rootDir)) {
          response.writeHead(403)
          response.end('forbidden')
          return
        }
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          response.writeHead(404)
          response.end('not found')
          return
        }
        const ext = path.extname(filePath).toLowerCase()
        const mime = MIME_TYPES[ext] || 'application/octet-stream'
        response.writeHead(200, { 'Content-Type': mime })
        fs.createReadStream(filePath).pipe(response)
      } catch (err) {
        response.writeHead(500)
        response.end(String(err))
      }
    })
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      res({ url: `http://127.0.0.1:${port}/`, close: () => server.close() })
    })
    server.on('error', reject)
  })
}

async function captureScreenshot(
  session: CDPSession,
  url: string,
  viewport: Viewport,
  outPath: string
): Promise<void> {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await session.send('Page.navigate', { url })
  await new Promise(r => setTimeout(r, 1500))
  const screenshot = await session.send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  })
  writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'))
}

export interface DiffResult {
  match: number
  totalPixels: number
  diffPixels: number
}

export async function pixelDiff(
  baselinePath: string,
  candidatePath: string,
  diffOutPath: string
): Promise<DiffResult> {
  const { Jimp, diff: jimpDiff } = await import('jimp')
  const baseline = await Jimp.read(baselinePath)
  const candidate = await Jimp.read(candidatePath)

  // Normalize sizes — clip to common rectangle
  const w = Math.min(baseline.width, candidate.width)
  const h = Math.min(baseline.height, candidate.height)
  if (baseline.width !== w || baseline.height !== h) baseline.crop({ x: 0, y: 0, w, h })
  if (candidate.width !== w || candidate.height !== h) candidate.crop({ x: 0, y: 0, w, h })

  const result = jimpDiff(baseline, candidate, 0.1)
  await result.image.write(diffOutPath as `${string}.png`)
  const totalPixels = w * h
  const diffPixels = Math.round(result.percent * totalPixels)
  return {
    match: 1 - result.percent,
    totalPixels,
    diffPixels,
  }
}

async function main() {
  let opts: Options
  try {
    opts = parseArgs(process.argv.slice(2))
  } catch (e) {
    console.error((e as Error).message)
    printHelp()
    process.exit(2)
  }
  if (opts.help || !opts.bundleDir) {
    printHelp()
    process.exit(opts.help ? 0 : 2)
  }

  const bundleAbs = resolve(opts.bundleDir)
  const snapshotDir = join(bundleAbs, 'render-snapshot')
  if (!existsSync(snapshotDir)) {
    console.error(`✗ no render-snapshot/ in bundle: ${bundleAbs}`)
    console.error(`  run \`npm run export\` with --snapshot to capture baseline`)
    process.exit(2)
  }

  const generatedDir = opts.generatedDir
    ? resolve(opts.generatedDir)
    : detectGeneratedDir(bundleAbs)

  console.log(`📋 Bundle: ${bundleAbs}`)
  console.log(`📋 Generated: ${generatedDir}`)
  console.log(`📋 Threshold: ${opts.threshold}%`)

  const server = await startStaticServer(generatedDir)
  console.log(`🌐 Serving ${generatedDir} on ${server.url}`)

  const chrome = await launchChrome({ headless: true })
  let session: CDPSession | null = null
  const results: Array<{ viewport: Viewport; diff: DiffResult }> = []
  try {
    const port = parseInt(new URL(chrome.wsEndpoint).port)
    const pageWs = await getPageTarget(port)
    session = await connectCDP(pageWs)
    await session.send('Page.enable')
    await session.send('Runtime.enable')

    for (const vp of opts.viewports) {
      const baselinePath = join(snapshotDir, `screenshot-${vp.name}.png`)
      if (!existsSync(baselinePath)) {
        console.warn(`⚠ no baseline for ${vp.name}, skipping`)
        continue
      }
      const candidatePath = join(bundleAbs, `verify-screenshot-${vp.name}.png`)
      const diffPath = join(bundleAbs, `verify-diff-${vp.name}.png`)

      console.log(`📸 ${vp.name} (${vp.width}×${vp.height})...`)
      await captureScreenshot(session, server.url, vp, candidatePath)
      const diff = await pixelDiff(baselinePath, candidatePath, diffPath)
      console.log(
        `   match: ${(diff.match * 100).toFixed(2)}% (${diff.diffPixels.toLocaleString()} px differ)`
      )
      results.push({ viewport: vp, diff })
    }
  } finally {
    session?.close()
    chrome.kill()
    server.close()
  }

  // Write report
  const allPassed = results.every(r => r.diff.match * 100 >= opts.threshold)
  const reportLines = [
    `# Verify Report`,
    ``,
    `**Bundle:** \`${relative(process.cwd(), bundleAbs) || bundleAbs}\``,
    `**Generated:** \`${relative(process.cwd(), generatedDir) || generatedDir}\``,
    `**Threshold:** ${opts.threshold}%`,
    `**Verdict:** ${allPassed ? '✅ PASS' : '❌ FAIL'}`,
    ``,
    `| Viewport | Match | Diff Pixels | Diff Image |`,
    `| -------- | -----:| -----------:| ---------- |`,
    ...results.map(r => {
      const pct = (r.diff.match * 100).toFixed(2)
      const status = r.diff.match * 100 >= opts.threshold ? '✓' : '✗'
      return `| ${r.viewport.name} | ${status} ${pct}% | ${r.diff.diffPixels.toLocaleString()} / ${r.diff.totalPixels.toLocaleString()} | \`verify-diff-${r.viewport.name}.png\` |`
    }),
    ``,
    `## Iteration`,
    ``,
    `If any viewport is below threshold:`,
    `1. Open \`verify-diff-<vp>.png\` to see what differs (red = mismatch)`,
    `2. Compare \`render-snapshot/screenshot-<vp>.png\` (baseline) and \`verify-screenshot-<vp>.png\` (your output)`,
    `3. Adjust the generated code, rebuild (\`npm run build\` in ./generated/), rerun \`mirror-verify\``,
    ``,
  ]
  writeFileSync(join(bundleAbs, 'verify-report.md'), reportLines.join('\n'), 'utf8')
  console.log(`✓ Report: ${join(bundleAbs, 'verify-report.md')}`)

  process.exit(allPassed ? 0 : 1)
}

// Only run as CLI when invoked directly, not when imported by tests.
const isCliEntry = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isCliEntry) {
  main().catch(err => {
    console.error(err)
    process.exit(2)
  })
}
