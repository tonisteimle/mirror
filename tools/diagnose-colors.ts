/**
 * Color leak diagnostic harness.
 *
 * Mounts each test .mir file the same way Studio's preview does (real compiler
 * + mirror-defaults.css applied) and dumps the computed color/background of
 * every rendered element. Goal: see exactly which CSS layer wins.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { JSDOM } from 'jsdom'
import { parse } from '../compiler/parser/parser'
import { generateDOM } from '../compiler/backends/dom'

const TESTS = [
  '01-minimal.mir',
  '02-frame-text.mir',
  '03-button.mir',
  '04-custom-component.mir',
  '05-with-tokens.mir',
]

const TEST_DIR = '/tmp/mir-color-tests'
const DEFAULTS_CSS = fs.readFileSync(
  path.resolve(process.cwd(), 'assets/mirror-defaults.css'),
  'utf8'
)

interface Inspection {
  tag: string
  text: string
  inlineStyle: string
  computedColor: string
  computedBg: string
  font: string
}

function diagnose(mirSource: string, label: string): void {
  console.log('\n' + '='.repeat(70))
  console.log(`📂 ${label}`)
  console.log('='.repeat(70))
  console.log('Source:')
  console.log(
    mirSource
      .trim()
      .split('\n')
      .map(l => '  ' + l)
      .join('\n')
  )

  // Compile via real Mirror compiler
  const ast = parse(mirSource)
  const jsCode = generateDOM(ast)

  // Build host page with mirror-defaults applied
  const html = `<!DOCTYPE html><html><head><style>${DEFAULTS_CSS}</style></head><body><div id="host"></div></body></html>`
  const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true })
  const { window } = dom
  const doc = window.document

  // Strip the export keyword so the script can run inline; capture _ui via window.
  const runnable =
    jsCode.replace('export function createUI', 'function createUI') +
    `\nwindow.__root = createUI()\ndocument.getElementById('host').appendChild(window.__root)`

  const script = doc.createElement('script')
  script.textContent = runnable
  doc.body.appendChild(script)

  const root = (window as any).__root as HTMLElement | undefined
  if (!root) {
    console.log('❌ root not produced')
    return
  }

  // Verify what canvas styles emitted
  const rootInline = root.getAttribute('style') || ''
  console.log('\n_root inline style:')
  console.log('  ' + rootInline.replace(/;\s*/g, ';\n  '))

  // Walk every descendant, report computed style
  const inspections: Inspection[] = []
  const walk = (el: Element): void => {
    if (!(el instanceof window.HTMLElement)) return
    const cs = window.getComputedStyle(el)
    inspections.push({
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || '').slice(0, 40).replace(/\s+/g, ' ').trim(),
      inlineStyle: el.getAttribute('style') || '',
      computedColor: cs.color || '(empty)',
      computedBg: cs.backgroundColor || '(empty)',
      font: (cs.fontSize || '') + ' / ' + (cs.fontWeight || ''),
    })
    Array.from(el.children).forEach(walk)
  }
  walk(root)

  console.log('\nComputed styles per element:')
  console.log(
    '  ' + ['#', 'tag', 'text', 'color', 'background', 'font'].join(' | ').padEnd(80, ' ')
  )
  console.log('  ' + '-'.repeat(80))
  inspections.forEach((ins, i) => {
    console.log(
      '  ' +
        [
          String(i).padStart(2),
          ins.tag.padEnd(8),
          (ins.text || '∅').padEnd(28).slice(0, 28),
          ins.computedColor.padEnd(20),
          ins.computedBg.padEnd(20),
          ins.font,
        ].join(' | ')
    )
  })

  dom.window.close()
}

for (const file of TESTS) {
  const full = path.join(TEST_DIR, file)
  if (!fs.existsSync(full)) {
    console.log(`⚠️  missing: ${full}`)
    continue
  }
  const src = fs.readFileSync(full, 'utf8')
  try {
    diagnose(src, file)
  } catch (e: any) {
    console.log(`❌ ${file} threw: ${e.message}`)
  }
}
