/**
 * Slice 7 — Iter-2-Sweep CDP-Schuld-Lock (Dev 1, 2026-05-10).
 *
 * Iter-1 hat Phase A-D + jsdom-RTs durchgezogen; CDP-Run war als Follow-up
 * deferred. Iter-2 holt die CDP-Schuld nach.
 *
 * Re-Probe-Targets:
 *   A. Cross-Backend-Lock — explizite x/y Position in Grid (3-Backend-Diff)
 *   B. Token-Resolution für x/y/w/h (Slice 7 V-1 fix verifizieren)
 *   C. CDP-Test-Existence-Lock — gridPositionTests + rowHeightTests existieren
 *      in `studio/test-api/suites/layout/extended.test.ts` und laufen grün.
 *      (Run via `npx tsx tools/test.ts --filter="Grid element"`.)
 */

import { parse } from '../../compiler/parser'
import { generateDOM } from '../../compiler/backends/dom'
import { generateReact } from '../../compiler/backends/react'
import { generateFramework } from '../../compiler/backends/framework'

const cases: Array<[string, string]> = [
  // A. Standard dashboard
  [
    'A1 dashboard layout',
    `Frame grid 12, gap 8
  Frame x 1, y 1, w 12, h 2, bg blue
  Frame x 1, y 3, w 3, h 4, bg gray
  Frame x 4, y 3, w 9, h 4, bg white`,
  ],
  // B. Token-resolved x/y
  [
    'B1 Token x/y',
    `header.x: 1
header.y: 1
header.w: 12
header.h: 2

Frame grid 12
  Frame x $header, y $header, w $header, h $header, bg blue`,
  ],
  // C. Property-Set-Token (x+y+w+h gebündelt)
  [
    'C1 Property-Set Token',
    `header: x 1, y 1, w 12, h 2

Frame grid 12
  Frame $header, bg blue`,
  ],
]

for (const [label, src] of cases) {
  console.log(`\n=== ${label} ===`)
  const ast = parse(src)
  const dom = generateDOM(ast, { skipPrelude: true } as any)
  const react = generateReact(ast, { skipPrelude: true } as any)
  const fw = generateFramework(ast, { skipPrelude: true } as any)

  const domNode2 = dom.match(/Object\.assign\(node_2\.style, \{([^}]*)\}\)/s)?.[1] || ''
  const reactStyles = Array.from(react.matchAll(/style=\{\{([^}]*)\}\}/gs))
  const reactChild = reactStyles[1]?.[1] || ''
  const fwArgs = Array.from(fw.matchAll(/M\('Frame', \{([^}]*)\}/gs))
  const fwChild = fwArgs[1]?.[1] || fwArgs[0]?.[1] || ''

  console.log('  DOM child  :', domNode2.replace(/\n\s+/g, ' ').slice(0, 220))
  console.log('  React child:', reactChild.replace(/\n\s+/g, ' ').slice(0, 220))
  console.log('  FW child   :', fwChild.replace(/\n\s+/g, ' ').slice(0, 180))
}

console.log(
  '\nCDP-Tests-Existence-Lock: gridPositionTests + rowHeightTests + minMaxWidthTests + minMaxHeightTests + gapXYTests in `studio/test-api/suites/layout/extended.test.ts` (alle ~17 CDP-Tests).'
)
console.log(
  'Run: npx tsx tools/test.ts --filter="Grid element|row-height|gap-x|gap-y" --headed=false'
)
