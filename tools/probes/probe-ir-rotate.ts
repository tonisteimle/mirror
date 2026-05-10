import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

for (const src of [
  `Frame rotate 45, w 50`,
  `Frame scale 1.2, w 50`,
  `Frame fixed, x 10, y 20, bg blue`,
  `Frame bor-l 1, w 100, boc red`,
  `Frame bor 0 0 1 0, w 100, boc red`,
]) {
  console.log('---', src, '---')
  const ir = toIR(parse(src)) as any
  const node = (ir.nodes ?? ir.children ?? [])[0]
  if (node) {
    console.log('  styles:', JSON.stringify(node.styles ?? [], null, 2).slice(0, 800))
  }
}
