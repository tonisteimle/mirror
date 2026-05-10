/**
 * Slice 50 — Lucide-Icons probes.
 *
 * DSL-Versprechen (CLAUDE.md):
 *   - `Icon "name"` rendert Lucide-Icon
 *   - `is N` Größe (default 24)
 *   - `ic #color` Farbe (stroke / fill je nach `fill`-Flag)
 *   - `iw N` stroke-width (default 400 in props, 2 in runtime?)
 *   - `fill` Boolean → ausgefülltes Icon (fill statt stroke)
 *   - Token-driven: `Icon "x", is $size, ic $color`
 *
 * Probes:
 *   A. Schema-Defaults vs. Primitive-Defaults vs. Runtime-Defaults (Drift?)
 *   B. Cross-Backend Icon-Emission (DOM/React/Framework)
 *   C. `is`/`ic`/`iw`/`fill` Properties cross-backend
 *   D. Token-driven Icon-Properties
 *   E. State-Pfad (hover/active mit ic-change)
 *   F. Edge-Cases (empty name, unknown, special chars)
 *   G. Sanitizer-Boundary (sanitizeIconName)
 */

import { parse, generateDOM, generateReact, generateFramework } from '../../compiler'
import { sanitizeIconName } from '../../compiler/runtime/icons'

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
    // Extract icon-relevant snippets
    const domIcon = dom.match(/data-icon[^"]*="[^"]*"/g)?.join(' | ') ?? '(no data-icon)'
    const domLoad = dom.match(/_runtime\.loadIcon\([^)]*\)/g)?.join(' | ') ?? '(no loadIcon)'
    const domStyle = dom.match(/Object\.assign\([^,]+\.style,\s*\{[^}]+\}\)/g)
    // Slice 50 V-2 post-fix: React backend emits <MirrorIcon ... />.
    // Pre-fix this regex looked for <span data-component="Icon">{"check"}
    // </span> — that path is dead. Probe iter-2 update: prefer MirrorIcon.
    const reactIcon =
      react.match(/<MirrorIcon[^/]*\/>/g)?.[0] ??
      react.match(/<span[^>]*data-icon[^>]*>/g)?.[0] ??
      react.match(/<span[^>]*>[^<]*<\/span>/g)?.join(' | ') ??
      '(no MirrorIcon)'
    const fwIcon =
      fw.match(/M\('Icon'[^\]]*\]\)/g)?.[0] ?? fw.match(/M\('Icon',[^)]+\)/g)?.[0] ?? '(no Icon)'
    console.log('  DOM data-icon:  ', domIcon)
    console.log('  DOM loadIcon:   ', domLoad)
    if (domStyle) console.log('  DOM styles:     ', domStyle.slice(-2).join(' || '))
    console.log('  React:          ', reactIcon.slice(0, 200))
    console.log('  Framework:      ', fwIcon.slice(0, 200))
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}

// ============================================
// A. Defaults probe
// ============================================
header('A. Schema-Defaults / Primitive-Defaults / Runtime-Defaults')

console.log(`
Erwartung pro DSL-Promise:
  is default = 24 (lt. CLAUDE.md + properties.ts)
  iw default = 400 (lt. properties.ts) — aber Lucide will stroke-width 2!
  ic default = currentColor (transparent/inheritance)
  fill default = false
`)

compileAll('A1 plain Icon "check"', `Icon "check"`)

// ============================================
// B. Cross-Backend Basic Icon
// ============================================
header('B. Cross-Backend Basic Icon')

compileAll('B1 Icon "heart"', `Icon "heart"`)
compileAll('B2 Icon "loader"', `Icon "loader"`)

// ============================================
// C. is/ic/iw/fill cross-backend
// ============================================
header('C. is/ic/iw/fill cross-backend')

compileAll('C1 is 32', `Icon "check", is 32`)
compileAll('C2 ic #ef4444', `Icon "heart", ic #ef4444`)
compileAll('C3 iw 1', `Icon "check", iw 1`)
compileAll('C4 fill (boolean)', `Icon "heart", fill`)
compileAll('C5 alle vier', `Icon "heart", is 32, ic #ef4444, iw 1, fill`)

// ============================================
// D. Token-driven
// ============================================
header('D. Token-driven Icon-Properties')

compileAll(
  'D1 is $iconSize',
  `iconSize.is: 24
Icon "check", is $iconSize`
)
compileAll(
  'D2 ic $primary',
  `primary.col: #2271C1
Icon "check", ic $primary`
)
compileAll(
  'D3 alle Tokens',
  `iconSize.is: 32
primary.col: #2271C1
Icon "heart", is $iconSize, ic $primary, fill`
)

// ============================================
// E. State path
// ============================================
header('E. State-Pfad — hover/active mit ic')

compileAll(
  'E1 hover ic',
  `Icon "heart", ic #888
  hover:
    ic #ef4444`
)
compileAll(
  'E2 inside Button hover',
  `Btn: pad 8 16
  hover:
    bg #f00
Btn
  Icon "check", ic #888`
)

// ============================================
// F. Edge cases
// ============================================
header('F. Edge-Cases')

compileAll('F1 unknown icon name', `Icon "this-does-not-exist-xyz"`)
compileAll('F2 multi-word kebab', `Icon "arrow-up-right"`)
compileAll('F3 single-letter', `Icon "x"`)

// ============================================
// G. Sanitizer-Boundary
// ============================================
header('G. sanitizeIconName boundary')

const sanitizerCases = [
  ['valid', 'check'],
  ['valid kebab', 'arrow-up-right'],
  ['empty', ''],
  ['null-cast', null as unknown as string],
  ['undef-cast', undefined as unknown as string],
  ['too long (51)', 'a'.repeat(51)],
  ['exactly 50', 'a'.repeat(50)],
  ['uppercase', 'Check'],
  ['underscore', 'arrow_up'],
  ['dot', 'arrow.up'],
  ['slash', 'check/x'],
  ['javascript:', 'javascript:alert(1)'],
  ['quote', 'check"'],
  ['unicode', 'café'],
  ['loopVar marker', '__loopVar:icon.name'],
  ['conditional marker', '__conditional:flag'],
]
for (const [label, name] of sanitizerCases) {
  const result = sanitizeIconName(name as string)
  console.log(`  ${(label as string).padEnd(22)} → ${result === null ? 'REJECT' : `'${result}'`}`)
}

// ============================================
// H. Default-Drift confirmation
// ============================================
header('H. Default-Drift confirmation (size/weight)')

console.log(`
Default-Sources zur Vergleichung:
  CLAUDE.md DSL doc:           is default = 24
  compiler/schema/properties.ts:480:
    icon-size default = 24
  compiler/schema/primitives.ts:158-165:
    Icon primitive default w/h = SIZES.iconSize (= 20px?)
  compiler/runtime/icons.ts:166:
    el.dataset.iconSize || '16'  (runtime fallback = 16)
  compiler/runtime/icons.ts:168:
    el.dataset.iconWeight || '2' (runtime fallback = 2, NOT 400!)

  → Drift-Vermutung: 24/20/16 für size; 400/2 für weight.
  Wenn Schema-Default '24' im IR landet → data-icon-size='24',
  dann ist Runtime-Fallback '16' nie aktiv. Aber:
  Wenn Compile-Pfad nicht emittiert → 16 sichtbar.
`)
