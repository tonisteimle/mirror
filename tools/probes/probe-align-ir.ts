import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

const cases = [
  `Frame hor, align top\n  Frame w 50, h 50`,
  `Frame hor, align bottom\n  Frame w 50, h 50`,
  `Frame ver, align right\n  Frame w 50, h 50`,
]

for (const src of cases) {
  console.log('---', src.split('\n')[0], '---')
  const ir = toIR(parse(src)) as any
  const node = ir.nodes?.[0]
  console.log(JSON.stringify(node?.styles ?? [], null, 2))
}
