/**
 * Slice 51 — Custom-Icons-Registry probes.
 *
 * DSL-Versprechen (CLAUDE.md):
 *   $icons:
 *     hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"
 *
 *   Icon "hbox", is 24, ic #888
 *
 * - `$icons:` Block definiert Custom-Icons mit SVG-Pfaden.
 * - Multi-path mit `|` separator.
 * - ViewBox default `0 0 24 24`.
 * - Custom-Icons checken VOR Lucide-CDN — wenn registriert, kein Fetch.
 * - Custom-Icons mischen mit Lucide (`Icon "hbox"` neben `Icon "check"`).
 *
 * Probes:
 *   A. Parse-Pipeline: $icons im AST → IR → backends
 *   B. DOM-Backend: emit `_runtime.registerIcon(name, path, viewBox)`
 *   C. React-Backend: muss Custom-Registry-Pfad haben
 *   D. Framework-Backend: muss Custom-Registry-Pfad haben
 *   E. Mixing: Custom + Lucide
 *   F. Multi-path | separator
 *   G. Custom ViewBox (non-default)
 *   H. Edge-Cases: leerer Pfad, ungültiger Name, doppelte Definitionen
 */

import { parse, generateDOM, generateReact, generateFramework } from '../../compiler'

function header(label: string): void {
  console.log()
  console.log('='.repeat(70))
  console.log(label)
  console.log('='.repeat(70))
}

function compileAll(label: string, src: string): void {
  console.log(`\n--- ${label} ---`)
  console.log('SOURCE:', src.replace(/\n/g, ' ⏎ '))
  try {
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    const fw = generateFramework(parse(src))

    const domRegister = dom.match(/registerIcon\([^)]+\)/g)?.join(' | ') ?? '(no registerIcon)'
    const reactRegister =
      react.match(/registerIcon\([^)]+\)/g)?.join(' | ') ??
      react
        .match(/MIRROR_CUSTOM_ICONS|customIconRegistry|_mirrorIconCache\.set\([^)]+/g)
        ?.join(' | ') ??
      '(no React custom-icon path)'
    const fwRegister =
      fw.match(/registerIcon\([^)]+\)/g)?.join(' | ') ??
      fw.match(/M\.icons|customIcons/g)?.join(' | ') ??
      '(no Framework custom-icon path)'

    console.log('  DOM:       ', domRegister.slice(0, 200))
    console.log('  React:     ', reactRegister.slice(0, 200))
    console.log('  Framework: ', fwRegister.slice(0, 200))
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}

// ============================================
// A. Parse-Pipeline
// ============================================
header('A. Parse-Pipeline: $icons im AST')

const iconsSrc = `$icons:
  hbox: "M3 3h18v18H3z|M9 3v18|M15 3v18"
  vbox: "M3 3h18v18H3z|M21 9H3|M21 15H3"
Icon "hbox", is 24
Icon "vbox", is 24, ic #2271C1`

const ast = parse(iconsSrc)
console.log('AST.icons:', JSON.stringify((ast as { icons?: unknown[] }).icons, null, 2))

// ============================================
// B/C/D. Cross-Backend Custom-Icon
// ============================================
header('B/C/D. Cross-Backend Custom-Icon')

compileAll(
  'B1 single custom icon',
  `$icons:
  hbox: "M3 3h18v18H3z|M9 3v18"
Icon "hbox"`
)

compileAll(
  'B2 custom + lucide gemischt',
  `$icons:
  myicon: "M3 3h18v18H3z"
Icon "myicon"
Icon "check"`
)

compileAll(
  'B3 custom mit alle properties',
  `$icons:
  hbox: "M3 3h18v18H3z|M9 3v18"
Icon "hbox", is 32, ic #ef4444, iw 1, fill`
)

compileAll(
  'B4 multi-path mit |',
  `$icons:
  grid: "M3 3h8v8H3z|M13 3h8v8h-8z|M3 13h8v8H3z|M13 13h8v8h-8z"
Icon "grid", is 24`
)

// ============================================
// E. Mixing
// ============================================
header('E. Mixing Custom + Lucide')

compileAll(
  'E1 viele Custom + viele Lucide',
  `$icons:
  myicon1: "M3 3h18v18H3z"
  myicon2: "M9 3v18"
Icon "myicon1"
Icon "check"
Icon "myicon2"
Icon "heart"`
)

// ============================================
// F. Token-driven Custom-Icon
// ============================================
header('F. Token-driven mit Custom-Icon')

compileAll(
  'F1 Token + custom icon',
  `iconSize.is: 32
$icons:
  hbox: "M3 3h18v18H3z"
Icon "hbox", is $iconSize`
)

// ============================================
// G. Edge-Cases
// ============================================
header('G. Edge-Cases')

compileAll(
  'G1 leerer pfad',
  `$icons:
  empty: ""
Icon "empty"`
)

compileAll(
  'G2 ungültiger name (uppercase)',
  `$icons:
  Bad: "M3 3h18v18H3z"
Icon "Bad"`
)

compileAll(
  'G3 spezielle zeichen',
  `$icons:
  test: "M3 3h18v18H3z"
Icon "test"`
)
