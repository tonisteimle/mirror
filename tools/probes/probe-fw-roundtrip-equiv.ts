import { parse } from '../../compiler/parser'
import { generateFramework } from '../../compiler/backends/framework'
import { toIR } from '../../compiler/ir'

// Compare IR styles with what Framework reverse-maps. Each IR-style
// property should round-trip back to a Mirror-prop. If not, it's a
// silent drop — fix candidate.

const samples: [string, string][] = [
  ['headline', `Text "Big", fs 32, weight bold, line 1.2, tracking -0.02`],
  [
    'btn primary',
    `PrimaryBtn as Button: pad 12 24, bg #2271C1, col white, rad 6, fs 14, weight 600, cursor pointer`,
  ],
  ['card', `Card: bg #1a1a1a, pad 16, rad 8, gap 8, bor 1, boc #333, w full`],
  [
    'hor toolbar',
    `Frame hor, gap 8, ver-center, pad 12, bg #f5f5f5\n  Text "Title"\n  Spacer\n  Button "X"`,
  ],
  ['grid', `Frame grid 12, gap 16, row-height 60\n  Frame x 1, y 1, w 12, h 1, bg blue`],
  [
    'stacked overlay',
    `Frame stacked, w 200, h 200\n  Image src "x", w full, h full\n  Text "Overlay", bl, pad 8, col white, bg rgba(0,0,0,0.5)`,
  ],
]

for (const [label, src] of samples) {
  console.log('===', label, '===')
  const ir = toIR(parse(src)) as any
  const fw = generateFramework(parse(src))

  // Get all CSS prop names from IR (non-state, non-default-flex)
  const irProps = new Set<string>()
  function walk(n: any) {
    if (!n) return
    if (n.styles && Array.isArray(n.styles)) {
      for (const s of n.styles) {
        if (!s.state) irProps.add(s.property)
      }
    }
    if (Array.isArray(n.children)) for (const c of n.children) walk(c)
  }
  for (const node of ir.nodes ?? []) walk(node)

  // Get all M(...) prop keys from FW
  const fwLines = fw.split('\n').filter(l => l.includes('M('))
  // crude key extraction
  const fwKeys = new Set<string>()
  for (const line of fwLines) {
    const matches = line.match(/[\s,{]([a-z][a-zA-Z0-9-]*|'[a-z][a-zA-Z0-9-]*')\s*:/g) ?? []
    for (const m of matches) {
      const k = m.replace(/[\s,{:]/g, '').replace(/'/g, '')
      fwKeys.add(k)
    }
  }
  console.log('  IR props:', [...irProps].slice(0, 20).join(', '))
  console.log('  FW keys :', [...fwKeys].slice(0, 20).join(', '))
}
