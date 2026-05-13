import { parse } from '../../compiler/parser'
import { toIR } from '../../compiler/ir'

const SRC = `Frame abs, x 10, y 20
  compact:
    bg red`

const ir = toIR(parse(SRC))
console.log('=== IR Node 0 ===')
console.log('id:', ir.nodes[0].id)
console.log('needsContainer:', ir.nodes[0].needsContainer)
console.log('styles:', JSON.stringify(ir.nodes[0].styles, null, 2))
