import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'

const cases: [string, string][] = [
  ['ver-baseline', `Frame hor, ver-baseline\n  Text "A"\n  Text "B"`],
  ['letter-spacing', `Text "X", tracking 0.05`],
  ['align top hor', `Frame hor, align top\n  Frame w 50, h 50`],
  ['align bottom hor', `Frame hor, align bottom\n  Frame w 50, h 50`],
  ['align right ver', `Frame ver, align right\n  Frame w 50, h 50`],
  ['align center', `Frame hor, align center\n  Frame w 50`],
  ['min/max/step', `Input type number, min 0, max 100, step 5`],
  ['mask', `Input mask "###-###-####"`],
  ['x-offset/y-offset shadow', `Frame shadow lg, x-offset 5, y-offset 10, w 100`],
  ['stacked', `Frame stacked, w 100\n  Text "A"\n  Text "B", x 10, y 10`],
  ['order', `Frame order 2, w 100`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  const out = generateFramework(parse(src))
  const lines = out.split('\n').filter(l => l.includes('M('))
  for (const l of lines.slice(0, 2)) console.log(' ', l.trim().slice(0, 240))
}
