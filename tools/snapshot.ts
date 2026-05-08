#!/usr/bin/env tsx
/**
 * Mirror Render Snapshot
 *
 *   npx tsx tools/snapshot.ts <project-dir> --out <dir>
 *
 * Compiles a Mirror project to standalone HTML, opens it in headless
 * Chrome at three viewport widths, and captures:
 *   - computed-styles.json (per data-mirror-id, relevant CSS subset)
 *   - dom-tree.json (hierarchical structure with text + rects)
 *   - screenshot-<viewport>.png
 *
 * The output is consumed by the AI-export bundle as ground-truth for
 * what Mirror actually renders. LLMs can then verify their generated
 * code against these snapshots.
 *
 * Usage:
 *   npx tsx tools/snapshot.ts <project-dir> --out <dir> [options]
 *
 * Options:
 *   --out <dir>          Output directory (required)
 *   --viewport mobile|tablet|desktop|all   (default: all)
 *   --keep-html          Don't delete the compiled HTML afterward
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { resolve, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { launchChrome } from './test-runner/chrome'
import { connectCDP, getPageTarget } from './test-runner/cdp'
import type { CDPSession } from './test-runner/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')

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

const RELEVANT_STYLES = [
  // Layout
  'display',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'width',
  'height',
  'min-width',
  'max-width',
  'min-height',
  'max-height',
  // Spacing
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  // Flex / grid
  'flex-direction',
  'flex-wrap',
  'justify-content',
  'align-items',
  'align-self',
  'flex-grow',
  'flex-shrink',
  'gap',
  'grid-template-columns',
  'grid-template-rows',
  'grid-column',
  'grid-row',
  // Color
  'background-color',
  'color',
  'border-color',
  'opacity',
  // Border
  'border-width',
  'border-style',
  'border-radius',
  // Typography
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'text-align',
  'text-decoration-line',
  'text-transform',
  // Effects
  'box-shadow',
  'transform',
  'overflow',
  'filter',
] as const

/**
 * CSS values to drop as "no-op defaults" when capturing computed styles.
 * Keeps the snapshot focused on what Mirror actually changed, not on
 * browser-default values that add noise without information.
 */
const DEFAULT_VALUES: Record<string, string> = {
  position: 'static',
  top: 'auto',
  right: 'auto',
  bottom: 'auto',
  left: 'auto',
  'z-index': 'auto',
  'min-width': '0px',
  'max-width': 'none',
  'min-height': '0px',
  'max-height': 'none',
  'flex-grow': '0',
  'flex-shrink': '1',
  'flex-direction': 'row',
  'flex-wrap': 'nowrap',
  'align-self': 'auto',
  gap: 'normal',
  'grid-template-columns': 'none',
  'grid-template-rows': 'none',
  'grid-column': 'auto',
  'grid-row': 'auto',
  opacity: '1',
  'border-width': '0px',
  'border-style': 'none',
  'border-radius': '0px',
  'border-color': 'rgb(0, 0, 0)',
  'box-shadow': 'none',
  transform: 'none',
  filter: 'none',
  overflow: 'visible',
  'text-decoration-line': 'none',
  'text-transform': 'none',
  'font-style': 'normal',
  'padding-top': '0px',
  'padding-right': '0px',
  'padding-bottom': '0px',
  'padding-left': '0px',
  'margin-top': '0px',
  'margin-right': '0px',
  'margin-bottom': '0px',
  'margin-left': '0px',
}

interface Options {
  projectDir: string
  outDir: string
  viewports: Viewport[]
  keepHtml: boolean
  help: boolean
}

function printHelp() {
  console.log(`
mirror-snapshot — capture computed styles + screenshots from a Mirror project

Usage:
  npx tsx tools/snapshot.ts <project-dir> --out <dir> [options]

Options:
  --out <dir>          Output directory (required)
  --viewport <names>   Comma-separated: mobile,tablet,desktop  (default: all)
  --keep-html          Keep the compiled HTML for inspection
  -h, --help           This help
`)
}

function parseArgs(argv: string[]): Options {
  const opts: Options = {
    projectDir: '',
    outDir: '',
    viewports: VIEWPORTS,
    keepHtml: false,
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
      case '--out':
        opts.outDir = argv[++i]
        break
      case '--viewport': {
        const names = argv[++i].split(',').map(s => s.trim())
        opts.viewports = VIEWPORTS.filter(v => names.includes(v.name))
        break
      }
      case '--keep-html':
        opts.keepHtml = true
        break
      default:
        if (a.startsWith('--')) throw new Error(`unknown flag: ${a}`)
        positionals.push(a)
    }
  }
  if (positionals[0]) opts.projectDir = positionals[0]
  return opts
}

function compileToHtml(projectDir: string): string {
  const tmpFile = join(tmpdir(), `mirror-snapshot-${Date.now()}.html`)
  const buildCli = join(REPO_ROOT, 'compiler', 'build-cli.ts')
  const result = spawnSync('npx', ['tsx', buildCli, projectDir, '--out', tmpFile, '--quiet'], {
    stdio: ['ignore', 'inherit', 'inherit'],
    cwd: REPO_ROOT,
  })
  if (result.status !== 0) {
    throw new Error(`mirror-build failed (exit ${result.status})`)
  }
  if (!existsSync(tmpFile)) {
    throw new Error(`expected ${tmpFile} to be created`)
  }
  return tmpFile
}

interface NodeSnapshot {
  id: string
  tag: string
  text: string | null
  rect: { x: number; y: number; width: number; height: number }
  styles: Record<string, string>
  parentId: string | null
  childIds: string[]
}

async function captureViewport(
  session: CDPSession,
  htmlPath: string,
  viewport: Viewport,
  outDir: string
): Promise<{ nodes: NodeSnapshot[] }> {
  await session.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: false,
  })

  await session.send('Page.navigate', { url: `file://${htmlPath}` })
  // Wait for load + a beat for layout
  await new Promise(r => setTimeout(r, 800))

  const captureScript = `
    (() => {
      const RELEVANT = ${JSON.stringify(RELEVANT_STYLES)};
      const DEFAULTS = ${JSON.stringify(DEFAULT_VALUES)};
      const nodes = Array.from(document.querySelectorAll('[data-mirror-id]'));
      const idOf = el => el.getAttribute('data-mirror-id');
      const result = nodes.map(el => {
        const id = idOf(el);
        const cs = window.getComputedStyle(el);
        const styles = {};
        for (const prop of RELEVANT) {
          const val = cs.getPropertyValue(prop);
          if (val && DEFAULTS[prop] !== val) styles[prop] = val;
        }
        const rect = el.getBoundingClientRect();
        const parent = el.closest('[data-mirror-id]:not([data-mirror-id="' + id + '"])');
        const parentEl = el.parentElement?.closest('[data-mirror-id]');
        const directText = Array.from(el.childNodes)
          .filter(n => n.nodeType === Node.TEXT_NODE)
          .map(n => n.textContent || '')
          .join('').trim();
        const fullText = (el.textContent || '').trim();
        // formatInlineMarkdown turns *italic* / **bold** into <em>/<strong>
        // children, so a heading like "Innere Stimme — *was im Kopf sitzt*"
        // ends up with directText = "Innere Stimme —" and the italic span
        // hidden in a child element. If all element children are inline
        // text-formatting tags, treat the element as a leaf and use fullText.
        const INLINE_TEXT_TAGS = new Set(['EM','STRONG','I','B','MARK','SUB','SUP','CODE','SMALL','U']);
        const onlyInlineFormattingChildren = el.children.length > 0
          && Array.from(el.children).every(c => INLINE_TEXT_TAGS.has(c.tagName));
        const text = onlyInlineFormattingChildren && fullText
          ? fullText.slice(0, 200)
          : (directText || (el.children.length === 0 && fullText ? fullText.slice(0, 200) : null));
        const childIds = Array.from(el.children)
          .map(c => c.querySelector('[data-mirror-id]') ? null : c.getAttribute('data-mirror-id'))
          .filter(Boolean);
        const directChildren = Array.from(el.querySelectorAll('[data-mirror-id]'))
          .filter(c => c.parentElement?.closest('[data-mirror-id]') === el)
          .map(c => c.getAttribute('data-mirror-id'));
        return {
          id,
          tag: el.tagName,
          text,
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
          styles,
          parentId: parentEl ? parentEl.getAttribute('data-mirror-id') : null,
          childIds: directChildren,
        };
      });
      return JSON.stringify(result);
    })()
  `

  const evalResult = await session.send<{
    result: { value?: string; type: string }
    exceptionDetails?: { text: string; exception?: { description?: string } }
  }>('Runtime.evaluate', {
    expression: captureScript,
    returnByValue: true,
    awaitPromise: false,
  })

  if (evalResult.exceptionDetails) {
    throw new Error(
      `page eval failed: ${evalResult.exceptionDetails.exception?.description ?? evalResult.exceptionDetails.text}`
    )
  }
  const nodes: NodeSnapshot[] = JSON.parse(evalResult.result.value || '[]')

  const screenshot = await session.send<{ data: string }>('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  })
  writeFileSync(
    join(outDir, `screenshot-${viewport.name}.png`),
    Buffer.from(screenshot.data, 'base64')
  )

  return { nodes }
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
  if (opts.help || !opts.projectDir || !opts.outDir) {
    printHelp()
    process.exit(opts.help ? 0 : 2)
  }

  const projectAbs = resolve(opts.projectDir)
  const outAbs = resolve(opts.outDir)
  mkdirSync(outAbs, { recursive: true })

  console.log(`📦 Compiling ${projectAbs} → temp HTML...`)
  const htmlPath = compileToHtml(projectAbs)
  console.log(`   ${htmlPath} (${(readFileSync(htmlPath).byteLength / 1024).toFixed(1)} KB)`)

  console.log(`🌐 Launching headless Chrome...`)
  const chrome = await launchChrome({ headless: true })
  let session: CDPSession | null = null
  try {
    const port = parseInt(new URL(chrome.wsEndpoint).port)
    const pageWs = await getPageTarget(port)
    session = await connectCDP(pageWs)
    await session.send('Page.enable')
    await session.send('Runtime.enable')

    const summary: Record<string, { nodeCount: number; viewport: Viewport }> = {}
    for (const vp of opts.viewports) {
      console.log(`📸 Capturing ${vp.name} (${vp.width}×${vp.height})...`)
      const { nodes } = await captureViewport(session, htmlPath, vp, outAbs)
      writeFileSync(join(outAbs, `computed-styles-${vp.name}.json`), JSON.stringify(nodes, null, 2))
      summary[vp.name] = { nodeCount: nodes.length, viewport: vp }
    }

    writeFileSync(
      join(outAbs, 'snapshot-manifest.json'),
      JSON.stringify(
        {
          project: projectAbs,
          generatedAt: new Date().toISOString(),
          viewports: summary,
        },
        null,
        2
      )
    )
    console.log(`✓ Snapshots written to ${outAbs}`)
  } finally {
    session?.close()
    chrome.kill()
    if (!opts.keepHtml && existsSync(htmlPath)) rmSync(htmlPath)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
