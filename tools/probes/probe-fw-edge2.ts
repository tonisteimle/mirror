import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'

const cases: [string, string][] = [
  // Position
  ['absolute pos', `Frame x 10, y 20, w 50, h 50, abs`],
  ['fixed pos', `Frame fixed, x 10, y 20, bg blue`],
  ['z-index', `Frame z 99, w 100, bg red`],
  ['rotate', `Frame rotate 45, w 50`],
  ['scale', `Frame scale 1.2, w 50`],
  // Border directionals
  ['bor-x', `Frame bor-l 1, bor-r 2, w 100, h 50, boc red`],
  ['bor 0 0 1 0', `Frame bor 0 0 1 0, w 100, h 50, boc red`],
  // Wrapped Frame text-align right
  ['text-align right', `Text "Right", text-align right, w 100`],
  // Mixed grad
  [
    'grad with token',
    `accent.bg: #2271C1\nblue.bg: #3b82f6\n\nFrame bg grad $accent $blue, w 100, h 50`,
  ],
  // overflow x scroll
  ['scroll-hor', `Frame scroll-hor, w 100, h 50`],
  // Min/max width
  ['minmax', `Frame minw 50, maxw 200, w 100`],
  // Italic + underline
  ['italic underline', `Text "X", italic, underline`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const out = generateFramework(parse(src))
    const lines = out.split('\n').filter(l => l.includes('M('))
    for (const l of lines.slice(0, 3)) {
      console.log(' ', l.trim().slice(0, 280))
    }
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
