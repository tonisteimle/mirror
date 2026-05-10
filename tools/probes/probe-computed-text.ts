import { parse } from '../../compiler/parser'

const src = `count: 5\n\nText "Total: " + count`
const ast = parse(src) as any
console.log(JSON.stringify(ast.instances[0], null, 2))
