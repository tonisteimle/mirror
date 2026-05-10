import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'

// Probe React's state-rule emit for various state combinations
const cases: [string, string][] = [
  [
    'hover + focus + active timing',
    `Btn: bg #333\n  hover 0.15s:\n    bg #555\n  focus 0.2s:\n    bor 2, boc blue\n  active 0.1s:\n    scale 0.98\n\nBtn "X"`,
  ],
  [
    'shorthand hover-* + state block',
    `Btn: bg #333\n  hover:\n    bg #555\n\nButton "X", hover-rad 12`,
  ],
  [
    'hover with multiple props',
    `Btn: bg #333, col white\n  hover:\n    bg #555\n    col #ccc\n    rad 8\n\nBtn "X"`,
  ],
  [
    'disabled state',
    `Btn: bg #333, cursor pointer\n  disabled:\n    opacity 0.5\n    cursor not-allowed\n\nBtn "X", disabled`,
  ],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const out = generateReact(parse(src))
  // Show style block + element
  const styleMatch = out.match(/<style>\{[^}]+\}<\/style>/)
  const elemMatch = out.match(/<button[^>]+>/)
  console.log('  style:', styleMatch?.[0]?.slice(0, 320))
  console.log('  elem:', elemMatch?.[0]?.slice(0, 280))
}
