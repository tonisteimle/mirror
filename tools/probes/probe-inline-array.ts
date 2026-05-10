import { parse } from '../../compiler/parser'

const src = `each x in [1, 2, 3]\n  Text "$x"`
const ast = parse(src) as any
console.log(JSON.stringify(ast, null, 2).slice(0, 800))
