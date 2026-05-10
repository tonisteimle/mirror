import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'

const cases: [string, string][] = [
  [
    'align top hor',
    `Frame hor, align top, gap 8\n  Frame w 50, h 50, bg red\n  Frame w 50, h 100, bg blue`,
  ],
  ['align bottom hor', `Frame hor, align bottom, gap 8\n  Frame w 50, h 50\n  Frame w 50, h 100`],
  ['align center', `Frame hor, align center, gap 8\n  Frame w 50, h 50\n  Frame w 50, h 100`],
  ['align right ver', `Frame ver, align right, gap 8\n  Frame w 50, h 50\n  Frame w 100, h 50`],
  ['x-offset shadow', `Frame shadow lg, x-offset 5, y-offset 10, w 100`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const dom = generateDOM(parse(src))
  const react = generateReact(parse(src))
  // Check what align does
  const domAlign = dom.match(/'(align|justify)-(items|content)':\s*'[^']*'/g) ?? []
  console.log('  DOM align/justify:', domAlign.slice(0, 3))
  const reactLines = react.split('\n').filter(l => l.includes('style='))
  console.log('  React first style:', reactLines[0]?.slice(0, 200))
}
