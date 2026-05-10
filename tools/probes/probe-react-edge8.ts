import { parse } from '../../compiler/parser'
import { generateReact } from '../../compiler/backends/react'
import { generateDOM } from '../../compiler/backends/dom'

// Documented schema props that might be missing in React
const cases: [string, string][] = [
  ['ver-baseline', `Frame hor, ver-baseline, gap 8\n  Text "A", fs 24\n  Text "B", fs 12`],
  ['min/max/step on input', `Input type number, min 0, max 100, step 5`],
  ['mask on input', `Input mask "###-###-####", w 200`],
  ['x-offset shadow', `Frame shadow md, x-offset 5, y-offset 10, w 100, h 50`],
  ['focusable', `Frame focusable, w 100`],
  ['keyboard-nav', `Frame keyboard-nav, w 100`],
  ['hover-radius', `Button "X", bg #333, hover-radius 12`],
  ['hover-border-color', `Frame bor 1, w 100, hover-border-color #555`],
  ['shrink', `Frame hor\n  Frame shrink, bg red, w 100\n  Frame bg blue, w 100`],
  [
    'align top',
    `Frame hor, align top, gap 8\n  Frame w 50, h 100, bg red\n  Frame w 50, h 50, bg blue`,
  ],
  [
    'stacked',
    `Frame stacked, w 100, h 100\n  Frame bg red\n  Frame bg blue, x 10, y 10, w 50, h 50`,
  ],
  [
    'dense grid',
    `Frame grid 3, dense, gap 4\n  Frame w 1, h 1\n  Frame w 2, h 1\n  Frame w 1, h 2`,
  ],
  ['ver-center', `Frame hor, ver-center, gap 8\n  Text "A", fs 24\n  Text "B", fs 12`],
  ['hor-center', `Frame ver, hor-center, gap 8\n  Text "A"\n  Text "B"`],
]

for (const [label, src] of cases) {
  console.log('===', label, '===')
  try {
    const dom = generateDOM(parse(src))
    const react = generateReact(parse(src))
    // Find first Frame's style
    const reactLines = react.split('\n')
    const idx = reactLines.findIndex(l => l.trim().startsWith('<') && !l.includes('React'))
    const reactLine = reactLines[idx] ?? ''
    // Compare DOM CSS keys
    const domStyles = (dom.match(/style\.(\w+)\s*=/g) ?? []).slice(0, 5)
    console.log('  DOM:', domStyles.length, 'set ops')
    console.log('  React:', reactLine.slice(0, 240))
  } catch (e) {
    console.log('  ERROR:', (e as Error).message)
  }
}
